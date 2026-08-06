"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const { getToken } = useAuth();
  const { user, isLoaded } = useUser();

  const [authFailure, setAuthFailure] = useState<{
    roomKey: string;
    message: string;
  } | null>(null);
  const [accessFailure, setAccessFailure] = useState<{
    roomKey: string;
    message: string;
  } | null>(null);

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
  const roomKey = `${docId}-${email}-${currentUserRole}`;
  const authError =
    authFailure?.roomKey === roomKey ? authFailure.message : null;
  const accessError =
    accessFailure?.roomKey === roomKey ? accessFailure.message : null;

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

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setAuthFailure(null)}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-red-950 transition hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Try again
          </button>

          <Link
            href="/"
            className="rounded-full border border-red-700 px-4 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-900/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Back to documents
          </Link>
        </div>
      </section>
    );
  }

  if (accessError) {
    return (
      <section className="rounded-3xl border border-amber-300 bg-amber-50 p-6 text-amber-950 shadow-sm">
        <h2 className="text-lg font-semibold">Document access changed</h2>
        <p className="mt-2 text-sm text-amber-900">{accessError}</p>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              setAccessFailure(null);
              router.refresh();
            }}
            className="rounded-full bg-amber-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-950"
          >
            Refresh access
          </button>

          <Link
            href="/"
            className="rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-950 transition hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-950"
          >
            Back to documents
          </Link>
        </div>
      </section>
    );
  }

  return (
    <HocuspocusProviderWebsocketComponent url={COLLAB_URL}>
      <HocuspocusRoom
        key={roomKey}
        name={docId}
        token={tokenResolver}
        onAuthenticated={() => {
          setAuthFailure(null);
          setAccessFailure(null);
        }}
        onAuthenticationFailed={() => {
          setAuthFailure({
            roomKey,
            message:
              "The collaboration server could not verify this session. Check your access and try again.",
          });
        }}
        onDisconnect={({ event }) => {
          if (event.code !== 4403) {
            return;
          }

          setAuthFailure(null);
          setAccessFailure({
            roomKey,
            message:
              "Your document access changed or could not be reverified. Refresh to load your current access.",
          });
        }}
      >
        <CollaborativeEditor
          documentId={docId}
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
