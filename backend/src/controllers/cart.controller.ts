import type { Request, Response } from "express";
import * as cartService from "../services/cart.service";
import { getValid } from "../middlewares/validate";
import { sendSuccess } from "../utils/response";
import type { AddCartItemInput, MergeCartInput } from "../validators/cart.validator";

type VariantParam = { variantId: number };

export async function get(req: Request, res: Response) {
  sendSuccess(res, await cartService.getCart(req.user!.id));
}

export async function add(req: Request, res: Response) {
  const { variantId, quantity } = getValid<AddCartItemInput>(req);
  sendSuccess(res, await cartService.addItem(req.user!.id, variantId, quantity), { message: "Đã thêm vào giỏ hàng" });
}

export async function update(req: Request, res: Response) {
  const { variantId } = getValid<VariantParam>(req, "params");
  const { quantity } = getValid<{ quantity: number }>(req);
  sendSuccess(res, await cartService.updateItem(req.user!.id, variantId, quantity));
}

export async function remove(req: Request, res: Response) {
  const { variantId } = getValid<VariantParam>(req, "params");
  sendSuccess(res, await cartService.removeItem(req.user!.id, variantId), { message: "Đã xóa sản phẩm khỏi giỏ hàng" });
}

export async function clear(req: Request, res: Response) {
  sendSuccess(res, await cartService.clear(req.user!.id), { message: "Đã xóa toàn bộ giỏ hàng" });
}

export async function merge(req: Request, res: Response) {
  sendSuccess(res, await cartService.merge(req.user!.id, getValid<MergeCartInput>(req)));
}

export async function preview(req: Request, res: Response) {
  sendSuccess(res, await cartService.previewGuest(getValid<MergeCartInput>(req)));
}
