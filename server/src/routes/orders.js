import { Router } from "express";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { Order } from "../models/Order.js";

export const ordersRouter = Router();

ordersRouter.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    next(error);
  }
});

ordersRouter.get("/", requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    next(error);
  }
});

ordersRouter.patch("/:id/status", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const allowedStatuses = ["pending", "paid", "shipping", "delivered", "cancelled"];

    if (!allowedStatuses.includes(req.body.status)) {
      res.status(400).json({ message: "Status de pedido inválido." });
      return;
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true, runValidators: true }
    );

    if (!order) {
      res.status(404).json({ message: "Pedido não encontrado." });
      return;
    }

    res.json(order);
  } catch (error) {
    next(error);
  }
});
