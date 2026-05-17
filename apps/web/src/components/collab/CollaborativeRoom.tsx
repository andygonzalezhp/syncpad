"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
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
  const { user, isLoaded } = useUser();
  const [authError, setAuthError] = useState<string | null>(null);

  const email = user?.primaryEmailAddress?.emailAddress;

  const authToken = useMemo(() => {
    if (!email) {
      return "";
    }

    return JSON.stringify({ email });
  }, [email]);

  const collabUrlWithToken = useMemo(() => {
    const url = new URL(COLLAB_URL);

    if (authToken) {
      url.searchParams.set("token", authToken);
    }

    return url.toString();
  }, [authToken]);

  const currentUser = useMemo(() => {
    const normalizedEmail = email ?? "unknown@syncpad.dev";

    return {
      email: normalizedEmail,
      name: user?.fullName || displayNameFromEmail(normalizedEmail),
      color: colorFromEmail(normalizedEmail),
      role: currentUserRole,
    };
  }, [email, user?.fullName, currentUserRole]);

  useEffect(() => {
    setAuthError(null);
  }, [docId, currentUserRole, email]);

  if (!isLoaded || !email || !authToken) {
    return (
      <section className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-6 text-neutral-300">
        Loading collaboration session...
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
    <HocuspocusProviderWebsocketComponent url={collabUrlWithToken}>
      <HocuspocusRoom
        key={`${docId}-${email}-${currentUserRole}`}
        name={docId}
        token={authToken}
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