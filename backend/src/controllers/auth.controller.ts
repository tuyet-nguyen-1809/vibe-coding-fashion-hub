import type { Request, Response } from "express";
import * as authService from "../services/auth.service";
import { getValid } from "../middlewares/validate";
import { sendSuccess } from "../utils/response";
import type { ChangePasswordInput, LoginInput, RegisterInput, UpdateProfileInput } from "../validators/auth.validator";

export async function register(req: Request, res: Response) {
  const result = await authService.register(getValid<RegisterInput>(req));
  sendSuccess(res, result, { status: 201, message: "Đăng ký tài khoản thành công" });
}

export async function login(req: Request, res: Response) {
  const result = await authService.login(getValid<LoginInput>(req));
  sendSuccess(res, result, { message: "Đăng nhập thành công" });
}

export async function me(req: Request, res: Response) {
  sendSuccess(res, await authService.getMe(req.user!.id));
}

export async function updateProfile(req: Request, res: Response) {
  const user = await authService.updateProfile(req.user!.id, getValid<UpdateProfileInput>(req));
  sendSuccess(res, user, { message: "Cập nhật thông tin thành công" });
}

export async function changePassword(req: Request, res: Response) {
  await authService.changePassword(req.user!.id, getValid<ChangePasswordInput>(req));
  sendSuccess(res, null, { message: "Đổi mật khẩu thành công" });
}
