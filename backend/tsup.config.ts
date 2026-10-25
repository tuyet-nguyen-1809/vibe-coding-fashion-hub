import { defineConfig } from "tsup";

// Đóng gói backend thành dist/server.js để chạy bằng `npm start`.
export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  target: "node20",
  platform: "node",
  outDir: "dist",
  clean: true,
  sourcemap: true,
});
