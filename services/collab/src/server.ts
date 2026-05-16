import { Server } from "@hocuspocus/server";
import { Database } from "@hocuspocus/extension-database";
import pg from "pg";

const { Pool } = pg;

const port = Number(process.env.PORT ?? 1234);

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://syncpad:syncpad@localhost:5432/syncpad";

const pool = new Pool({
  connectionString: databaseUrl,
  max: 10,
});

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(
    value,
  );
}

const server = new Server({
  name: "syncpad-collab",
  port,

  // Debounce persistence writes so we do not hit Postgres on every keystroke.
  debounce: 2000,
  maxDebounce: 10000,

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
    console.log(`[disconnect] document=${data.documentName}`);
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