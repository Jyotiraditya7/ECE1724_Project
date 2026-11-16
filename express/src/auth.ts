import type { ResolveUserId } from "./app";

/**
 * TEMPORARY stand-in for Better Auth: every request acts as DEV_USER_ID from
 * .env (created by `npm run db:seed`).
 *
 * TODO(Better Auth): replace with a resolver that reads the session, roughly:
 *   const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
 *   return session?.user.id ?? null;
 */
export const resolveDevUserId: ResolveUserId = async () =>
  process.env["DEV_USER_ID"] ?? null;
