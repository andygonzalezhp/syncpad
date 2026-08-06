"use client";

import { UserButton, useUser } from "@clerk/nextjs";

export default function AuthBar() {
  const { user, isLoaded } = useUser();

  return (
    <div className="mb-8 flex items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-900/70 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-neutral-100">
          {isLoaded && user
            ? user.fullName || user.primaryEmailAddress?.emailAddress
            : "Loading user..."}
        </p>

        <p className="text-xs text-neutral-500">
          {isLoaded && user
            ? user.primaryEmailAddress?.emailAddress
            : "Authenticated session"}
        </p>
      </div>

      <UserButton />
    </div>
  );
}
