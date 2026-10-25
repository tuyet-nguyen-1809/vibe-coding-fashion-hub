import type { Request, Response } from "express";
import * as chatService from "../services/chat.service";
import { getValid } from "../middlewares/validate";
import { sendSuccess } from "../utils/response";
import type { ChatInput } from "../validators/chat.validator";

export async function status(_req: Request, res: Response) {
  sendSuccess(res, chatService.chatStatus());
}

export async function chat(req: Request, res: Response) {
  sendSuccess(res, await chatService.chat(getValid<ChatInput>(req)));
}
