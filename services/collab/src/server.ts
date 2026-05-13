import { Server } from "@hocuspocus/server";

const port = Number(process.env.PORT ?? 1234);

const server = new Server({
  name: "syncpad-collab",
  port,

  async onConnect(data) {
    console.log(`[connect] document=${data.documentName}`);
  },

  async onDisconnect(data) {
    console.log(`[disconnect] document=${data.documentName}`);
  },
});

server.listen();

console.log(`SyncPad collaboration server running on ws://localhost:${port}`);