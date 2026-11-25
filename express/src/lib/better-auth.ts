import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "../db";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  baseURL: process.env["BETTER_AUTH_URL"] ?? "http://localhost:3000",
  secret: process.env["BETTER_AUTH_SECRET"],

  emailAndPassword: {
    enabled: true,
  },

  trustedOrigins: ["http://localhost:5173"],
});
