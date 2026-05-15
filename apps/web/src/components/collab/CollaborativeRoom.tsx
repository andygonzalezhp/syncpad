"use client";

import {
  HocuspocusProviderWebsocketComponent,
  HocuspocusRoom,
} from "@hocuspocus/provider-react";
import CollaborativeEditor from "./CollaborativeEditor";

type CollaborativeRoomProps = {
  docId: string;
};

const COLLAB_URL =
  process.env.NEXT_PUBLIC_COLLAB_URL ?? "ws://127.0.0.1:1234";

export default function CollaborativeRoom({ docId }: CollaborativeRoomProps) {
  return (
    <HocuspocusProviderWebsocketComponent url={COLLAB_URL}>
      <HocuspocusRoom name={docId}>
        <CollaborativeEditor />
      </HocuspocusRoom>
    </HocuspocusProviderWebsocketComponent>
  );
}