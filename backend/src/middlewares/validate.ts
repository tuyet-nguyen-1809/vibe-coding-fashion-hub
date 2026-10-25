import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { ApiError } from "../utils/ApiError";

type Source = "body" | "query" | "params";

/**
 * Kiểm tra dữ liệu đầu vào bằng Zod. Dữ liệu đã kiểm tra được lưu vào req.valid[source]
 * (req.query là getter chỉ đọc trong Express 5 nên không ghi đè trực tiếp).
 */
export function validate(schema: ZodType, source: Source = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const errors = result.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      }));
      throw ApiError.badRequest(errors[0]?.message ?? "Dữ liệu không hợp lệ", errors);
    }
    req.valid = { ...(req.valid ?? {}), [source]: result.data };
    next();
  };
}

declare module "express-serve-static-core" {
  interface Request {
    valid?: Partial<Record<Source, unknown>>;
  }
}

/** Lấy dữ liệu đã được validate với kiểu mong muốn. */
export function getValid<T>(req: Request, source: Source = "body"): T {
  return req.valid?.[source] as T;
}
