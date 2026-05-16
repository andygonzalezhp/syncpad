import { Server } from "@hocuspocus/server";
import { Database } from "@hocuspocus/extension-database";
import pg from "pg";

const { Pool } = pg;

type DocumentRole = "OWNER" | "EDITOR" | "VIEWER";

type AuthToken = {
  email?: string;
};

type CollabUserContext = {
  user: {
    id: string;
    email: string;
    name: string;
    role: DocumentRole;
  };
};

type RuntimeAuthenticatePayload = {
  documentName?: string;
  token?: unknown;
  connection?: {
    readOnly?: boolean;
  };
  requestParameters?: URLSearchParams | Map<string, string> | Record<string, string>;
};

const port = Number(process.env.PORT ?? 1234);

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://syncpad:syncpad@localhost:5432/syncpad";

const pool = new Pool({
  connectionString: databaseUrl,
  max: 10,
});

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function displayDebugKeys(value: unknown): string[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  return Object.keys(value as Record<string, unknown>);
}

function getDocumentName(data: RuntimeAuthenticatePayload): string {
  if (typeof data.documentName === "string") {
    return data.documentName;
  }

  throw new Error(
    `Missing document name. Auth payload keys: ${displayDebugKeys(data).join(", ")}`,
  );
}

function getToken(data: RuntimeAuthenticatePayload): unknown {
  if (data.token !== undefined && data.token !== null) {
    return data.token;
  }

  const params = data.requestParameters;

  if (params instanceof URLSearchParams) {
    return params.get("token");
  }

  if (params instanceof Map) {
    return params.get("token");
  }

  if (params && typeof params === "object" && "token" in params) {
    return params.token;
  }

  return undefined;
}

function parseAuthToken(rawToken: unknown): AuthToken {
  if (!rawToken) {
    throw new Error("Missing collaboration auth token.");
  }

  if (typeof rawToken === "object") {
    const token = rawToken as AuthToken;

    if (token.email) {
      return token;
    }
  }

  if (typeof rawToken !== "string") {
    throw new Error("Invalid collaboration auth token type.");
  }

  const trimmedToken = rawToken.trim();

  if (!trimmedToken) {
    throw new Error("Empty collaboration auth token.");
  }

  // Preferred format from the frontend:
  // JSON.stringify({ email: "andy@syncpad.dev" })
  try {
    const parsed = JSON.parse(trimmedToken) as AuthToken;

    if (parsed.email) {
      return parsed;
    }
  } catch {
    // Fall through to plain email support below.
  }

  // Fallback support:
  // token="andy@syncpad.dev"
  if (trimmedToken.includes("@")) {
    return {
      email: trimmedToken,
    };
  }

  throw new Error("Invalid collaboration auth token.");
}

const server = new Server({
  name: "syncpad-collab",
  port,

  // Debounce persistence writes so we do not hit Postgres on every keystroke.
  debounce: 2000,
  maxDebounce: 10000,

  async onAuthenticate(data: unknown): Promise<CollabUserContext> {
    const authData = data as RuntimeAuthenticatePayload;

    try {
      const documentName = getDocumentName(authData);

      if (!isUuid(documentName)) {
        throw new Error(`Invalid document room: ${documentName}`);
      }

      const rawToken = getToken(authData);
      const parsedToken = parseAuthToken(rawToken);

      if (!parsedToken.email) {
        throw new Error("Missing user email.");
      }

      const email = normalizeEmail(parsedToken.email);

      console.log("[auth:start]", {
        documentName,
        email,
        hasConnection: Boolean(authData.connection),
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

      const role = user.role as DocumentRole;

      if (role === "VIEWER") {
        if (!authData.connection) {
          authData.connection = {};
        }

        authData.connection.readOnly = true;
      }

      console.log(
        `[auth:success] document=${documentName} user=${user.email} role=${role} readOnly=${authData.connection?.readOnly ?? false}`,
      );

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.display_name,
          role,
        },
      };
    } catch (error) {
      console.error("[auth:error]", error);
      throw error;
    }
  },

  extensions: [
    new Database({
      async fetch({ documentName }) {
        const result = await pool.query(
          `
          SELECT state
          FROM document_states
          WHERE document_name = $1
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
        const buffer = Buffer.from(state);

        await pool.query(
          `
          INSERT INTO document_states (document_name, state, created_at, updated_at)
          VALUES ($1, $2, NOW(), NOW())
          ON CONFLICT (document_name)
          DO UPDATE SET
            state = EXCLUDED.state,
            updated_at = NOW()
          `,
          [documentName, buffer],
        );

        if (isUuid(documentName)) {
          await pool.query(
            `
            UPDATE documents
            SET updated_at = NOW()
            WHERE id = $1::uuid
            `,
            [documentName],
          );
        }

        console.log(`[store] document=${documentName} bytes=${buffer.length}`);
      },
    }),
  ],

  async onConnect(data) {
    console.log(`[connect] document=${data.documentName}`);
  },

  async onDisconnect(data) {
    const context = data.context as CollabUserContext | undefined;
    const email = context?.user.email ?? "unknown";

    console.log(`[disconnect] document=${data.documentName} user=${email}`);
  },
});

server.listen();

console.log(`SyncPad collaboration server running on ws://localhost:${port}`);

async function shutdown() {
  console.log("Shutting down SyncPad collaboration server...");

  try {
    await server.destroy();
    await pool.end();
  } finally {
    process.exit(0);
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);  