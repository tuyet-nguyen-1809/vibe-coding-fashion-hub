import type { Request, Response } from "express";
import * as dashboardService from "../services/dashboard.service";
import * as userService from "../services/user.service";
import { getValid } from "../middlewares/validate";
import { sendSuccess } from "../utils/response";
import type { UserListQuery } from "../validators/admin.validator";

export async function dashboard(req: Request, res: Response) {
  const { days } = getValid<{ days: number }>(req, "query");
  sendSuccess(res, await dashboardService.getOverview(days));
}

export async function listUsers(req: Request, res: Response) {
  const { items, meta } = await userService.listCustomers(getValid<UserListQuery>(req, "query"));
  sendSuccess(res, items, { meta });
}

export async function getUser(req: Request, res: Response) {
  sendSuccess(res, await userService.getCustomer(getValid<{ id: number }>(req, "params").id));
}
