import "dotenv/config";
import { createApp } from "./app";
import { resolveDevUserId } from "./auth";

const port = Number(process.env["PORT"] ?? 3000);

createApp({ resolveUserId: resolveDevUserId }).listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
