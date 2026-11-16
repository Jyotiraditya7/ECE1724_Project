import type { Request, RequestHandler } from "express";
import { HttpError } from "./errors";

/** Finds the signed-in user's id for a request, or null if nobody is signed in. */
export type ResolveUserId = (req: Request) => Promise<string | null>;

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

/** Rejects the request with 401 unless a user is signed in; sets req.userId. */
export function requireUser(resolveUserId: ResolveUserId): RequestHandler {
  return async (req, _res, next) => {
    const userId = await resolveUserId(req);
    if (!userId) throw new HttpError(401, "Not signed in");
    req.userId = userId;
    next();
  };
}
