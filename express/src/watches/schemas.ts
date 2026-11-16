import { z } from "zod";

/** Upper-cased ticker symbol such as AAPL, BRK.B or RY.TO. */
export const tickerSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9.-]{1,12}$/, "Ticker must be 1-12 letters, digits, '.' or '-'");

// Validation rules from the proposal: purchase price is a positive number,
// the gain threshold is positive, and the loss threshold is 0 or less.
export const createWatchSchema = z.object({
  ticker: tickerSchema,
  purchasePrice: z.number().positive(),
  gainPct: z.number().positive(),
  lossPct: z.number().max(0),
});

export type CreateWatchInput = z.infer<typeof createWatchSchema>;
