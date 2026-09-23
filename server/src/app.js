import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { connectDb } from "./config/db.js";
import { authRouter } from "./routes/auth.js";
import { ordersRouter } from "./routes/orders.js";
import { paymentsRouter } from "./routes/payments.js";
import { productsRouter } from "./routes/products.js";
import { shippingRouter } from "./routes/shipping.js";
import { usersRouter } from "./routes/users.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbConnectionPromise;

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.FRONTEND_URL || true
    })
  );
  app.use(express.json());
  app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

  app.use(async (_req, _res, next) => {
    try {
      dbConnectionPromise ??= connectDb();
      await dbConnectionPromise;
      next();
    } catch (error) {
      next(error);
    }
  });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", app: "ray-fragrancias-api" });
  });

  mountRoutes(app, "");
  mountRoutes(app, "/api");

  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(400).json({ message: error.message || "Erro inesperado." });
  });

  return app;
}

function mountRoutes(app, prefix) {
  app.use(`${prefix}/auth`, authRouter);
  app.use(`${prefix}/products`, productsRouter);
  app.use(`${prefix}/shipping`, shippingRouter);
  app.use(`${prefix}/payments`, paymentsRouter);
  app.use(`${prefix}/orders`, ordersRouter);
  app.use(`${prefix}/users`, usersRouter);
}
