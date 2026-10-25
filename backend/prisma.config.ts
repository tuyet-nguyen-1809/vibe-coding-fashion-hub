import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Không dùng env() để `prisma generate` (postinstall) vẫn chạy khi chưa có file .env.
    url: process.env.DATABASE_URL ?? "",
  },
});
