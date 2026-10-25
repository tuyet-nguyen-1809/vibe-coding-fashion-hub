import { Router } from "express";
import * as c from "../controllers/category.controller";

const router = Router();
router.get("/", c.listPublic);
export default router;
