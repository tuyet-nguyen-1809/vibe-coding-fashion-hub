import express from "express";
import cors from "cors";
import helmet from "helmet";
import { allowedOrigins } from "./config/env";
import routes from "./routes";
import { errorHandler, notFoundHandler } from "./middlewares/error";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin(origin, cb) {
        // Cho phép công cụ không có Origin (Postman, curl) và các địa chỉ trong CLIENT_URL.
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        return cb(null, false);
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "200kb" }));

  app.use("/api", routes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
