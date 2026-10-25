import type { NextFunction, Request, Response } from "express";
import { Prisma } from "../generated/prisma/client";
import { env } from "../config/env";
import { ApiError } from "../utils/ApiError";

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(new ApiError(404, `Không tìm thấy đường dẫn ${req.method} ${req.originalUrl}`, "ROUTE_NOT_FOUND"));
}

// Xử lý lỗi tập trung: không bao giờ trả stack trace hoặc thông tin nội bộ cho người dùng.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.code ? { code: err.code } : {}),
      ...(err.details ? { errors: err.details } : {}),
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({ success: false, code: "DUPLICATE", message: "Dữ liệu đã tồn tại (trùng giá trị duy nhất)" });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ success: false, code: "NOT_FOUND", message: "Không tìm thấy dữ liệu" });
    }
    if (err.code === "P2003") {
      return res.status(409).json({ success: false, code: "CONSTRAINT", message: "Không thể thực hiện vì dữ liệu đang được tham chiếu" });
    }
  }

  // Body JSON sai cú pháp
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ success: false, code: "INVALID_JSON", message: "Dữ liệu gửi lên không đúng định dạng JSON" });
  }

  if (env.NODE_ENV !== "test") console.error("[Lỗi máy chủ]", err);
  return res.status(500).json({ success: false, code: "INTERNAL_ERROR", message: "Đã có lỗi xảy ra ở máy chủ, vui lòng thử lại sau" });
}
