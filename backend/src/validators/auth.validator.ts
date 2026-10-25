import { z } from "zod";
import { vnPhone } from "./common";

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Họ tên phải có ít nhất 2 ký tự").max(100, "Họ tên quá dài"),
    email: z.email("Email không hợp lệ").trim().toLowerCase().max(191),
    phone: vnPhone.optional().or(z.literal("").transform(() => undefined)),
    password: z
      .string()
      .min(6, "Mật khẩu phải có ít nhất 6 ký tự")
      .max(72, "Mật khẩu tối đa 72 ký tự")
      .regex(/[A-Za-z]/, "Mật khẩu phải có ít nhất 1 chữ cái")
      .regex(/\d/, "Mật khẩu phải có ít nhất 1 chữ số"),
    confirmPassword: z.string(),
  })
  // Các trường lạ (ví dụ role) bị loại bỏ tự động, không thể tự đăng ký Admin.
  .refine((d) => d.password === d.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.email("Email không hợp lệ").trim().toLowerCase(),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Họ tên phải có ít nhất 2 ký tự").max(100),
  phone: vnPhone.optional().or(z.literal("").transform(() => undefined)),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
    newPassword: z
      .string()
      .min(6, "Mật khẩu mới phải có ít nhất 6 ký tự")
      .max(72)
      .regex(/[A-Za-z]/, "Mật khẩu phải có ít nhất 1 chữ cái")
      .regex(/\d/, "Mật khẩu phải có ít nhất 1 chữ số"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
