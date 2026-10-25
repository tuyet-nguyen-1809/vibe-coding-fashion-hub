import type { Request, Response } from "express";
import * as categoryService from "../services/category.service";
import { getValid } from "../middlewares/validate";
import { sendSuccess } from "../utils/response";
import type { CategoryInput } from "../validators/category.validator";

type IdParam = { id: number };

export async function listPublic(_req: Request, res: Response) {
  sendSuccess(res, await categoryService.list(true));
}

export async function listAdmin(_req: Request, res: Response) {
  sendSuccess(res, await categoryService.list(false));
}

export async function create(req: Request, res: Response) {
  const category = await categoryService.create(getValid<CategoryInput>(req));
  sendSuccess(res, category, { status: 201, message: "Thêm danh mục thành công" });
}

export async function update(req: Request, res: Response) {
  const category = await categoryService.update(getValid<IdParam>(req, "params").id, getValid<CategoryInput>(req));
  sendSuccess(res, category, { message: "Cập nhật danh mục thành công" });
}

export async function remove(req: Request, res: Response) {
  await categoryService.remove(getValid<IdParam>(req, "params").id);
  sendSuccess(res, null, { message: "Đã xóa danh mục" });
}
