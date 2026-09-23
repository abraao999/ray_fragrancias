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
  app.use(`${prefix}/shipping`, shippingRouter);
  app.use(`${prefix}/auth`, requireDb, authRouter);
  app.use(`${prefix}/products`, optionalDb, productsRouter);
  app.use(`${prefix}/payments`, requireDb, paymentsRouter);
  app.use(`${prefix}/orders`, requireDb, ordersRouter);
  app.use(`${prefix}/users`, requireDb, usersRouter);
}

async function optionalDb(req, res, next) {
  if (!process.env.MONGO_URI) {
    req.dbUnavailable = true;
    next();
    return;
  }

  await requireDb(req, res, next);
}

async function requireDb(_req, _res, next) {
  try {
    dbConnectionPromise ??= connectDb();
    await dbConnectionPromise;
    next();
  } catch (error) {
    next(error);
  }
}
