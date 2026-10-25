import "dotenv/config";
import { z } from "zod";

// Đọc và kiểm tra biến môi trường ngay khi khởi động, thiếu biến bắt buộc thì dừng sớm.
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_URL: z.string().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1, "Thiếu DATABASE_URL trong file .env"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET phải có ít nhất 32 ký tự"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  AI_PROVIDER: z.enum(["gemini", "openai"]).default("gemini"),
  GEMINI_API_KEY: z.string().optional().default(""),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  OPENAI_API_KEY: z.string().optional().default(""),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Cấu hình .env không hợp lệ:");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;

export const allowedOrigins = env.CLIENT_URL.split(",")
  .map((s) => s.trim())
  .filter(Boolean);
