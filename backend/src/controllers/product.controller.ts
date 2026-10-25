import type { Request, Response } from "express";
import * as productService from "../services/product.service";
import { getValid } from "../middlewares/validate";
import { sendSuccess } from "../utils/response";
import type { AdminProductListQuery, ProductInput, ProductListQuery } from "../validators/product.validator";

type IdParam = { id: number };

export async function listPublic(req: Request, res: Response) {
  const { items, meta } = await productService.listPublic(getValid<ProductListQuery>(req, "query"));
  sendSuccess(res, items, { meta });
}

export async function getPublic(req: Request, res: Response) {
  sendSuccess(res, await productService.getPublicBySlug(String(req.params.slug)));
}

export async function listAdmin(req: Request, res: Response) {
  const { items, meta } = await productService.listAdmin(getValid<AdminProductListQuery>(req, "query"));
  sendSuccess(res, items, { meta });
}

export async function getAdmin(req: Request, res: Response) {
  sendSuccess(res, await productService.getAdminById(getValid<IdParam>(req, "params").id));
}

export async function create(req: Request, res: Response) {
  const product = await productService.create(getValid<ProductInput>(req));
  sendSuccess(res, product, { status: 201, message: "Thêm sản phẩm thành công" });
}

export async function update(req: Request, res: Response) {
  const product = await productService.update(getValid<IdParam>(req, "params").id, getValid<ProductInput>(req));
  sendSuccess(res, product, { message: "Cập nhật sản phẩm thành công" });
}

export async function updateStatus(req: Request, res: Response) {
  const { status } = getValid<{ status: "ACTIVE" | "INACTIVE" }>(req);
  const product = await productService.updateStatus(getValid<IdParam>(req, "params").id, status);
  sendSuccess(res, product, { message: status === "ACTIVE" ? "Đã mở bán sản phẩm" : "Đã ngừng bán sản phẩm" });
}

export async function markOutOfStock(req: Request, res: Response) {
  const product = await productService.markOutOfStock(getValid<IdParam>(req, "params").id);
  sendSuccess(res, product, { message: "Đã đánh dấu sản phẩm hết hàng" });
}

export async function remove(req: Request, res: Response) {
  await productService.remove(getValid<IdParam>(req, "params").id);
  sendSuccess(res, null, { message: "Đã xóa sản phẩm" });
}
