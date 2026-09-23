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

const app = express();
const port = process.env.PORT || 4000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000"
  })
);
app.use(express.json());
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", app: "ray-fragrancias-api" });
});

app.use("/auth", authRouter);
app.use("/products", productsRouter);
app.use("/shipping", shippingRouter);
app.use("/payments", paymentsRouter);
app.use("/orders", ordersRouter);
app.use("/users", usersRouter);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(400).json({ message: error.message || "Erro inesperado." });
});

await connectDb();

app.listen(port, () => {
  console.log(`API Ray Fragrâncias em http://localhost:${port}`);
});
