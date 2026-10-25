import { createApp } from "./app";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";

async function main() {
  await prisma.$connect();
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`✅ Fashion Hub API đang chạy tại http://localhost:${env.PORT}/api`);
  });

  const shutdown = async () => {
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch(async (err) => {
  console.error("❌ Không khởi động được máy chủ. Kiểm tra MySQL và DATABASE_URL trong .env.", err);
  await prisma.$disconnect();
  process.exit(1);
});
