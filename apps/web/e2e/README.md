# Playwright prerequisites

Milestone 1 includes only the deterministic signed-out landing-page smoke test.
Authenticated Clerk workflows are intentionally deferred.

To run the smoke test locally:

1. Configure a Clerk **test instance** in `apps/web/.env.local` with:

   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`

2. Install Chromium once with `npx playwright install chromium`.
3. Run `npm run build` so the smoke test exercises a production bundle.
4. Run `npm run test:e2e` from `apps/web`.

Future authenticated tests will additionally require dedicated test-user
credentials stored as CI secrets, for example `E2E_CLERK_USER_EMAIL` and
`E2E_CLERK_USER_PASSWORD`. They must never use a production Clerk instance or
be committed to the repository.

The Playwright suite is not part of the core CI workflow until those dedicated
test credentials are provisioned. Unit, integration, build, and Flyway checks
remain mandatory on every push and pull request.
