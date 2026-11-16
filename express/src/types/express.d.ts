declare global {
  namespace Express {
    interface Request {
      /** Set by the requireUser middleware on every route mounted behind it. */
      userId: string;
    }
  }
}

export {};
