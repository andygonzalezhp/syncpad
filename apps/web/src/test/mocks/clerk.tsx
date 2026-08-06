import type { ReactNode } from "react";
import { vi } from "vitest";

type ClerkUser = {
  fullName: string | null;
  primaryEmailAddress: { emailAddress: string } | null;
  emailAddresses: Array<{ emailAddress: string }>;
};

export const clerkMocks = {
  getToken: vi.fn(async () => "test-token"),
  useAuth: vi.fn(),
  useUser: vi.fn(),
};

export function setMockClerkUser({
  isLoaded = true,
  isSignedIn = true,
  email = "owner@syncpad.test",
  fullName = "Test Owner",
}: {
  isLoaded?: boolean;
  isSignedIn?: boolean;
  email?: string | null;
  fullName?: string | null;
} = {}) {
  const user: ClerkUser | null =
    isSignedIn && email
      ? {
          fullName,
          primaryEmailAddress: { emailAddress: email },
          emailAddresses: [{ emailAddress: email }],
        }
      : null;

  clerkMocks.useAuth.mockReturnValue({
    getToken: clerkMocks.getToken,
    isLoaded,
    isSignedIn,
  });
  clerkMocks.useUser.mockReturnValue({ user, isLoaded, isSignedIn });
}

export function createClerkModuleMock() {
  return {
    SignInButton: ({ children }: { children: ReactNode }) => (
      <span data-testid="clerk-sign-in">{children}</span>
    ),
    SignUpButton: ({ children }: { children: ReactNode }) => (
      <span data-testid="clerk-sign-up">{children}</span>
    ),
    UserButton: () => <button aria-label="Account menu" type="button" />,
    useAuth: clerkMocks.useAuth,
    useUser: clerkMocks.useUser,
  };
}
