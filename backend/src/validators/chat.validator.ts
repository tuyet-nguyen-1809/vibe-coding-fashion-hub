import { z } from "zod";

export const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1, "Tin nhắn không được để trống").max(1000, "Tin nhắn tối đa 1000 ký tự"),
      }),
    )
    .min(1, "Vui lòng nhập câu hỏi")
    .max(20)
    .refine((m) => m[m.length - 1]?.role === "user", "Tin nhắn cuối phải là của người dùng"),
});

export type ChatInput = z.infer<typeof chatSchema>;
