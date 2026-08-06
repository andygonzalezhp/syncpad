"use client";

import { UserButton, useUser } from "@clerk/nextjs";

export default function AuthBar() {
  const { user, isLoaded } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const profileName = user?.fullName?.trim();
  const displayName = profileName || email || "Signed in";

  return (
    <header
      aria-label="Account"
      aria-busy={!isLoaded}
      className="mb-10 flex min-w-0 items-center justify-between gap-4 border-b border-slate-200 py-5"
    >
      <div className="flex shrink-0 items-center gap-2.5">
        <span
          aria-hidden="true"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white shadow-sm"
        >
          S
        </span>
        <span className="text-lg font-semibold tracking-[-0.03em] text-slate-950">
          SyncPad
        </span>
      </div>

      <div className="flex min-w-0 items-center gap-3">
        <div className="hidden min-w-0 text-right sm:block">
          <p
            className="truncate text-sm font-semibold text-slate-800"
            title={isLoaded ? displayName : undefined}
          >
            {isLoaded ? displayName : "Loading account…"}
          </p>
          <p
            className="truncate text-xs text-slate-500"
            title={isLoaded ? email : undefined}
          >
            {isLoaded
              ? profileName
                ? email || "Account email unavailable"
                : "SyncPad account"
              : "Preparing your workspace…"}
          </p>
        </div>
        <UserButton />
      </div>
    </header>
  );
}
