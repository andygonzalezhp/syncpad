"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import {
  HocuspocusProviderWebsocketComponent,
  HocuspocusRoom,
} from "@hocuspocus/provider-react";
import CollaborativeEditor from "./CollaborativeEditor";
import { displayNameFromEmail, DocumentRole } from "@/lib/api";

type CollaborativeRoomProps = {
  docId: string;
  currentUserRole: DocumentRole;
};

const COLLAB_URL =
  process.env.NEXT_PUBLIC_COLLAB_URL ?? "ws://127.0.0.1:1234";

export default function CollaborativeRoom({
  docId,
  currentUserRole,
}: CollaborativeRoomProps) {
  const { getToken } = useAuth();
  const { user, isLoaded } = useUser();

  const [authError, setAuthError] = useState<string | null>(null);

  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    null;

  const name =
    user?.fullName?.trim() || (email ? displayNameFromEmail(email) : "User");

  const tokenResolver = useCallback(async () => {
    const token = await getToken({
      template: "syncpad",
    });

    if (!token) {
      throw new Error("Could not create SyncPad collaboration token.");
    }

    return token;
  }, [getToken]);

  const currentUser = useMemo(
    () => ({
      email: email ?? "unknown@syncpad.dev",
      name,
      color: colorFromEmail(email ?? "unknown@syncpad.dev"),
      role: currentUserRole,
    }),
    [email, name, currentUserRole],
  );

  useEffect(() => {
    setAuthError(null);
  }, [docId, email, currentUserRole]);

  if (!isLoaded) {
    return (
      <section className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-6 text-neutral-300 shadow-2xl">
        Loading collaboration session...
      </section>
    );
  }

  if (!email) {
    return (
      <section className="rounded-3xl border border-red-900/70 bg-red-950/30 p-6 text-red-100">
        <h2 className="text-lg font-semibold">Collaboration unavailable</h2>

        <p className="mt-2 text-sm text-red-200">
          Signed-in user is missing an email address.
        </p>
      </section>
    );
  }

  if (authError) {
    return (
      <section className="rounded-3xl border border-red-900/70 bg-red-950/30 p-6 text-red-100">
        <h2 className="text-lg font-semibold">Collaboration unavailable</h2>

        <p className="mt-2 text-sm text-red-200">{authError}</p>
      </section>
    );
  }

  return (
    <HocuspocusProviderWebsocketComponent url={COLLAB_URL}>
      <HocuspocusRoom
        key={`${docId}-${email}-${currentUserRole}`}
        name={docId}
        token={tokenResolver}
        onAuthenticated={() => {
          setAuthError(null);
        }}
        onAuthenticationFailed={({ reason }) => {
          setAuthError(reason || "You do not have access to this document.");
        }}
      >
        <CollaborativeEditor
          currentUser={currentUser}
          currentUserRole={currentUserRole}
        />
      </HocuspocusRoom>
    </HocuspocusProviderWebsocketComponent>
  );
}

function colorFromEmail(email: string): string {
  const colors = [
    "#f97316",
    "#22c55e",
    "#3b82f6",
    "#e879f9",
    "#facc15",
    "#14b8a6",
    "#a855f7",
    "#ef4444",
  ];

  let hash = 0;

  for (let i = 0; i < email.length; i += 1) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}