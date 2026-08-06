import "dotenv/config";

import { verifyToken } from "@clerk/backend";
import {
  Server,
  type Connection,
  type onAuthenticatePayload,
} from "@hocuspocus/server";
import { Database } from "@hocuspocus/extension-database";
import pg, { type PoolClient } from "pg";
import {
  canBroadcastCommentEvent,
  parseCommentSyncEvent,
} from "./commentEvents.js";

const { Pool } = pg;

type DocumentRole = "OWNER" | "EDITOR" | "VIEWER";

type CollabUserContext = {
  user: {
    id: string;
    email: string;
    name: string;
    role: DocumentRole;
  };
  permissionRevalidated: boolean;
  permissionRevalidation: Promise<void> | null;
};

type PermissionChangeEvent = {
  documentId: string;
  userId: string;
};

type ClerkClaims = {
  sub?: string;
  email?: string;
  name?: string | null;
};

type RuntimeAuthenticatePayload = onAuthenticatePayload<CollabUserContext>;

const port = Number(process.env.PORT ?? 1234);

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://syncpad:syncpad@localhost:5432/syncpad";

const clerkSecretKey = process.env.CLERK_SECRET_KEY;
const permissionChangeChannel = "syncpad_permission_changes";
const accessChangedReason = "Document access changed. Refresh to continue.";
const accessVerificationReason =
  "Document access could not be verified. Refresh to continue.";

if (!clerkSecretKey) {
  throw new Error("Missing CLERK_SECRET_KEY for collab server.");
}

const pool = new Pool({
  connectionString: databaseUrl,
  max: 10,
});

let permissionListener: PoolClient | null = null;
let isShuttingDown = false;

pool.on("error", (error) => {
  console.error("[database:pool:error]", error);
  void shutdown(1);
});

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isDocumentRole(value: unknown): value is DocumentRole {
  return value === "OWNER" || value === "EDITOR" || value === "VIEWER";
}

function hasPostgresErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

function parsePermissionChange(payload: string | undefined): PermissionChangeEvent | null {
  if (!payload || payload.length > 512) {
    return null;
  }

  try {
    const value = JSON.parse(payload) as Record<string, unknown>;

    if (
      typeof value.documentId !== "string" ||
      !isUuid(value.documentId) ||
      typeof value.userId !== "string" ||
      !isUuid(value.userId)
    ) {
      return null;
    }

    return {
      documentId: value.documentId,
      userId: value.userId,
    };
  } catch {
    return null;
  }
}

function displayDebugKeys(value: unknown): string[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  return Object.keys(value as Record<string, unknown>);
}

function getDocumentName(data: RuntimeAuthenticatePayload): string {
  if (typeof data.documentName === "string" && data.documentName) {
    return data.documentName;
  }

  throw new Error(
    `Missing document name. Auth payload keys: ${displayDebugKeys(data).join(", ")}`,
  );
}

function getRawToken(data: RuntimeAuthenticatePayload): string {
  if (typeof data.token === "string" && data.token.trim()) {
    return data.token.trim();
  }

  const params = data.requestParameters;

  const requestToken = params.get("token");

  if (requestToken) {
    return requestToken;
  }

  throw new Error("Missing collaboration auth token.");
}

async function verifyClerkJwt(rawToken: string): Promise<ClerkClaims> {
  const claims = await verifyToken(rawToken, {
    secretKey: clerkSecretKey,
  });

  return claims as ClerkClaims;
}

async function findCurrentPermissionRole(
  documentId: string,
  userId: string,
): Promise<DocumentRole | null> {
  const result = await pool.query(
    `
    SELECT role
    FROM document_permissions
    WHERE document_id = $1::uuid
    AND user_id = $2::uuid
    `,
    [documentId, userId],
  );
  const role = result.rows[0]?.role;

  return isDocumentRole(role) ? role : null;
}

function accessGuardError(reason: string) {
  return Object.assign(new Error(reason), {
    code: 4403,
    reason,
  });
}

function closeForAccessChange(
  connection: Connection<CollabUserContext>,
  reason: string,
) {
  connection.readOnly = true;
  connection.webSocket.close(4403, reason);
}

async function revalidateRegisteredConnection(
  documentName: string,
  context: CollabUserContext,
  connection: Connection<CollabUserContext>,
) {
  // Hocuspocus authenticates before it registers the Connection. Rechecking
  // once after registration closes the notification gap: earlier commits are
  // visible to this query, while later commits are caught by PostgreSQL NOTIFY.
  if (context.permissionRevalidated) {
    return;
  }

  if (!context.permissionRevalidation) {
    context.permissionRevalidation = (async () => {
      let currentRole: DocumentRole | null;

      try {
        currentRole = await findCurrentPermissionRole(
          documentName,
          context.user.id,
        );
      } catch (error) {
        console.error("[permission:revalidation:error]", {
          documentName,
          userId: context.user.id,
          error,
        });
        closeForAccessChange(connection, accessVerificationReason);
        throw accessGuardError(accessVerificationReason);
      }

      const expectedReadOnly = currentRole === "VIEWER";

      if (
        currentRole !== context.user.role ||
        connection.readOnly !== expectedReadOnly
      ) {
        console.warn("[permission:revalidation:rejected]", {
          documentName,
          userId: context.user.id,
          authenticatedRole: context.user.role,
          currentRole,
          connectionReadOnly: connection.readOnly,
        });
        closeForAccessChange(connection, accessChangedReason);
        throw accessGuardError(accessChangedReason);
      }

      context.permissionRevalidated = true;
      console.log("[permission:revalidation:success]", {
        documentName,
        userId: context.user.id,
        role: currentRole,
      });
    })();
  }

  await context.permissionRevalidation;
}

function getEmailFromClaims(claims: ClerkClaims): string {
  if (!claims.email) {
    throw new Error(
      "Verified Clerk token is missing email claim. Check the syncpad JWT template.",
    );
  }

  return normalizeEmail(claims.email);
}

const server = new Server<CollabUserContext>({
  name: "syncpad-collab",
  port,
  stopOnSignals: false,

  debounce: 2000,
  maxDebounce: 10000,

  async onAuthenticate(authData): Promise<CollabUserContext> {
    try {
      const documentName = getDocumentName(authData);

      if (!isUuid(documentName) || documentName !== documentName.toLowerCase()) {
        throw new Error(`Invalid document room: ${documentName}`);
      }

      const rawToken = getRawToken(authData);
      const claims = await verifyClerkJwt(rawToken);
      const email = getEmailFromClaims(claims);

      console.log("[auth:start]", {
        documentName,
        email,
        subject: claims.sub,
        hasConnectionConfig: Boolean(authData.connectionConfig),
        payloadKeys: displayDebugKeys(authData),
      });

      const result = await pool.query(
        `
        SELECT
          app_users.id,
          app_users.email,
          app_users.display_name,
          document_permissions.role
        FROM document_permissions
        JOIN app_users ON app_users.id = document_permissions.user_id
        WHERE document_permissions.document_id = $1::uuid
        AND LOWER(app_users.email) = $2
        `,
        [documentName, email],
      );

      console.log("[auth:db-result]", {
        documentName,
        email,
        rowCount: result.rowCount,
      });

      const user = result.rows[0];

      if (!user) {
        throw new Error(`No permission row for ${email} on ${documentName}`);
      }

      const role = user.role;

      if (!isDocumentRole(role)) {
        throw new Error(`Invalid permission role for ${email} on ${documentName}`);
      }

      if (role === "VIEWER") {
        authData.connectionConfig.readOnly = true;
      }

      console.log(
        `[auth:success] document=${documentName} user=${user.email} role=${role} readOnly=${authData.connectionConfig.readOnly}`,
      );

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.display_name,
          role,
        },
        permissionRevalidated: false,
        permissionRevalidation: null,
      };
    } catch (error) {
      console.error("[auth:error]", error);
      throw error;
    }
  },

  async beforeHandleMessage({ connection, context, documentName }) {
    await revalidateRegisteredConnection(documentName, context, connection);
  },

  async connected({ connection, context, documentName }) {
    await revalidateRegisteredConnection(documentName, context, connection);
  },

  extensions: [
    new Database({
      async fetch({ documentName }) {
        const result = await pool.query(
          `
          SELECT state
          FROM document_states
          WHERE document_id = $1::uuid
          `,
          [documentName],
        );

        const row = result.rows[0];

        if (!row) {
          console.log(`[load] document=${documentName} state=empty`);
          return null;
        }

        console.log(`[load] document=${documentName} bytes=${row.state.length}`);

        return row.state;
      },

      async store({ documentName, state }) {
        if (!isUuid(documentName)) {
          console.warn("[store:ignored]", {
            documentName,
            reason: "invalid document id",
          });
          return;
        }

        const buffer = Buffer.from(state);
        let result;

        try {
          result = await pool.query(
            `
            WITH stored_state AS (
              INSERT INTO document_states (
                document_name,
                document_id,
                state,
                created_at,
                updated_at
              )
              SELECT $1, $1::uuid, $2, NOW(), NOW()
              FROM documents
              WHERE id = $1::uuid
              ON CONFLICT (document_id)
              DO UPDATE SET
                state = EXCLUDED.state,
                updated_at = NOW()
              RETURNING document_name
            )
            UPDATE documents
            SET updated_at = NOW()
            WHERE id = $1::uuid
            AND EXISTS (SELECT 1 FROM stored_state)
            RETURNING id
            `,
            [documentName, buffer],
          );
        } catch (error) {
          if (hasPostgresErrorCode(error, "23503")) {
            console.warn("[store:ignored]", {
              documentName,
              reason: "document was deleted during persistence",
            });
            return;
          }

          throw error;
        }

        if (result.rowCount === 0) {
          console.warn("[store:ignored]", {
            documentName,
            reason: "document no longer exists",
          });
          return;
        }

        console.log(`[store] document=${documentName} bytes=${buffer.length}`);
      },
    }),
  ],

  async onStateless({ connection, document, documentName, payload }) {
    const event = parseCommentSyncEvent(payload);

    if (!event) {
      console.warn("[comment:event:ignored]", {
        documentName,
        reason: "invalid payload",
        payloadLength: payload.length,
      });
      return;
    }

    const context = connection.context as CollabUserContext | undefined;

    if (!context?.user.id || !isUuid(documentName)) {
      console.warn("[comment:event:ignored]", {
        documentName,
        threadId: event.threadId,
        type: event.type,
        reason: "missing authenticated context",
      });
      return;
    }

    const authorization = await pool.query(
      `
      SELECT document_permissions.role
      FROM document_permissions
      JOIN comment_threads
        ON comment_threads.document_id = document_permissions.document_id
      WHERE document_permissions.document_id = $1::uuid
      AND document_permissions.user_id = $2::uuid
      AND comment_threads.id = $3::uuid
      `,
      [documentName, context.user.id, event.threadId],
    );

    const role = authorization.rows[0]?.role as DocumentRole | undefined;

    if (!canBroadcastCommentEvent(role)) {
      console.warn("[comment:event:ignored]", {
        documentName,
        threadId: event.threadId,
        type: event.type,
        reason: "sender cannot mutate comments or thread is outside this room",
      });
      return;
    }

    context.user.role = role;

    const canonicalPayload = JSON.stringify(event);
    let recipientCount = 0;

    document.broadcastStateless(canonicalPayload, (candidate) => {
      const shouldReceive = candidate !== connection;

      if (shouldReceive) {
        recipientCount += 1;
      }

      return shouldReceive;
    });

    console.log("[comment:event:broadcast]", {
      documentName,
      threadId: event.threadId,
      type: event.type,
      sender: context?.user.email ?? "unknown",
      recipientCount,
    });
  },

  async onConnect(data) {
    console.log(`[connect] document=${data.documentName}`);
  },

  async onDisconnect(data) {
    const context = data.context as CollabUserContext | undefined;
    const email = context?.user.email ?? "unknown";

    console.log(`[disconnect] document=${data.documentName} user=${email}`);
  },
});

async function listenForPermissionChanges() {
  const listener = await pool.connect();
  permissionListener = listener;

  listener.on("notification", (notification) => {
    if (notification.channel !== permissionChangeChannel) {
      return;
    }

    const event = parsePermissionChange(notification.payload);

    if (!event) {
      console.warn("[permission:change:ignored]", {
        reason: "invalid payload",
      });
      return;
    }

    const document = server.hocuspocus.documents.get(event.documentId);

    if (!document) {
      return;
    }

    let closedConnections = 0;

    document.getConnections().forEach((connection) => {
      const context = connection.context as CollabUserContext | undefined;

      if (context?.user.id !== event.userId) {
        return;
      }

      closedConnections += 1;
      connection.readOnly = true;
      connection.webSocket.close(4403, accessChangedReason);
    });

    if (closedConnections > 0) {
      console.log("[permission:change:connections-closed]", {
        documentName: event.documentId,
        userId: event.userId,
        closedConnections,
      });
    }
  });

  listener.on("error", (error) => {
    console.error("[permission:listener:error]", error);

    if (permissionListener === listener) {
      permissionListener = null;
      listener.release(error);
    }

    void shutdown(1);
  });

  await listener.query(`LISTEN ${permissionChangeChannel}`);
  console.log(`[permission:listener] channel=${permissionChangeChannel}`);
}

async function start() {
  await listenForPermissionChanges();
  await server.listen();
  console.log(`SyncPad collaboration server running on ws://localhost:${port}`);
}

async function shutdown(exitCode = 0) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log("Shutting down SyncPad collaboration server...");

  try {
    await server.destroy();

    if (permissionListener) {
      await permissionListener.query(`UNLISTEN ${permissionChangeChannel}`);
      permissionListener.release();
      permissionListener = null;
    }

    await pool.end();
  } finally {
    process.exit(exitCode);
  }
}

void start().catch(async (error) => {
  console.error("Failed to start SyncPad collaboration server.", error);

  try {
    if (permissionListener) {
      permissionListener.release();
      permissionListener = null;
    }

    await pool.end();
  } finally {
    process.exit(1);
  }
});

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
