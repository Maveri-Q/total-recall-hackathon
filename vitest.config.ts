import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Lets tests use the app's "@/..." imports (tsconfig paths), so components can be tested too.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
});
