import type { Response } from "express";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Định dạng phản hồi thống nhất: { success, message?, data, meta? }
export function sendSuccess<T>(
  res: Response,
  data: T,
  options: { status?: number; message?: string; meta?: PaginationMeta } = {},
) {
  return res.status(options.status ?? 200).json({
    success: true,
    ...(options.message ? { message: options.message } : {}),
    data,
    ...(options.meta ? { meta: options.meta } : {}),
  });
}

export function buildMeta(page: number, limit: number, total: number): PaginationMeta {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}
