import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";
import type { Role } from "../generated/prisma/enums";

export interface AuthUser {
  id: number;
  role: Role;
}

interface TokenPayload {
  sub: number;
  role: Role;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}

export function signToken(user: AuthUser): string {
  const payload: TokenPayload = { sub: user.id, role: user.role };
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

function readToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7).trim() || null;
}

async function resolveUser(token: string): Promise<AuthUser> {
  let payload: TokenPayload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET) as unknown as TokenPayload;
  } catch {
    throw ApiError.unauthorized("Phiên đăng nhập đã hết hạn hoặc không hợp lệ");
  }
  // Lấy quyền mới nhất từ DB, không tin hoàn toàn vào token (phòng khi quyền đã thay đổi / user bị xóa).
  const user = await prisma.user.findUnique({
    where: { id: Number(payload.sub) },
    select: { id: true, role: true },
  });
  if (!user) throw ApiError.unauthorized("Tài khoản không còn tồn tại");
  return user;
}

/** Bắt buộc đăng nhập. */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = readToken(req);
  if (!token) throw ApiError.unauthorized();
  req.user = await resolveUser(token);
  next();
}

/** Bắt buộc là quản trị viên (dùng sau requireAuth). */
export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN") throw ApiError.forbidden("Chỉ quản trị viên được truy cập chức năng này");
  next();
}
