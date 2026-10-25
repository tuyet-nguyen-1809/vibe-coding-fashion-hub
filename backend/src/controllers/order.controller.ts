import type { Request, Response } from "express";
import * as orderService from "../services/order.service";
import { getValid } from "../middlewares/validate";
import { sendSuccess } from "../utils/response";
import type {
  AdminOrderListQuery,
  CreateOrderInput,
  MyOrdersQuery,
  UpdateOrderStatusInput,
} from "../validators/order.validator";

type IdParam = { id: number };

export async function create(req: Request, res: Response) {
  const { order, duplicated } = await orderService.createOrder(req.user!.id, getValid<CreateOrderInput>(req));
  // 201: tạo mới; 200: yêu cầu lặp lại, trả về đơn đã tạo trước đó.
  sendSuccess(res, order, {
    status: duplicated ? 200 : 201,
    message: duplicated ? "Đơn hàng này đã được tạo trước đó" : "Đặt hàng thành công",
  });
}

export async function listMine(req: Request, res: Response) {
  const { items, meta } = await orderService.listMine(req.user!.id, getValid<MyOrdersQuery>(req, "query"));
  sendSuccess(res, items, { meta });
}

export async function getMine(req: Request, res: Response) {
  sendSuccess(res, await orderService.getMine(req.user!.id, getValid<IdParam>(req, "params").id));
}

export async function cancelMine(req: Request, res: Response) {
  const { reason } = getValid<{ reason?: string }>(req);
  const order = await orderService.cancelMine(req.user!.id, getValid<IdParam>(req, "params").id, reason);
  sendSuccess(res, order, { message: "Đã hủy đơn hàng" });
}

export async function listAdmin(req: Request, res: Response) {
  const { items, meta } = await orderService.listAdmin(getValid<AdminOrderListQuery>(req, "query"));
  sendSuccess(res, items, { meta });
}

export async function getAdmin(req: Request, res: Response) {
  sendSuccess(res, await orderService.getAdmin(getValid<IdParam>(req, "params").id));
}

export async function updateStatus(req: Request, res: Response) {
  const { status, reason } = getValid<UpdateOrderStatusInput>(req);
  const order = await orderService.updateStatusAdmin(getValid<IdParam>(req, "params").id, status, reason);
  sendSuccess(res, order, { message: "Cập nhật trạng thái đơn hàng thành công" });
}
