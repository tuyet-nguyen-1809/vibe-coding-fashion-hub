import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      // Chuyển tiếp /api sang Backend khi chạy dev -> không cần cấu hình CORS phức tạp.
      proxy: { "/api": { target: env.VITE_PROXY_TARGET || "http://localhost:4000", changeOrigin: true } },
    },
    test: { environment: "node", include: ["src/**/*.test.ts"] },
  };
});
