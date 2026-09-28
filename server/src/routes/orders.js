import { Router } from "express";
import { optionalAuth, requireAdmin, requireAuth } from "../middleware/auth.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";

export const ordersRouter = Router();

ordersRouter.post("/", optionalAuth, async (req, res, next) => {
  try {
    if (!Array.isArray(req.body.items) || req.body.items.length === 0) {
      res.status(400).json({ message: "Adicione pelo menos um produto ao pedido." });
      return;
    }

    const productIds = req.body.items.map((item) => item.productId);
    const products = await Product.find({ _id: { $in: productIds } });

    const items = req.body.items.map((item) => {
      const product = products.find((entry) => String(entry._id) === item.productId);

      if (!product) {
        throw new Error("Produto não encontrado no carrinho.");
      }

      return {
        product,
        quantity: Math.max(1, Number(item.quantity || 1))
      };
    });

    const subtotal = items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );
    const shipping = Number(req.body.shipping || 0);
    const total = subtotal + shipping;
    const customer = req.body.customer || {};
    const address = req.body.address || {};

    if (!customer.name || !customer.email) {
      res.status(400).json({ message: "Nome e e-mail são obrigatórios para finalizar o pedido." });
      return;
    }

    if (!address.street || !address.number || !address.neighborhood || !address.city || !address.state || !address.cep) {
      res.status(400).json({ message: "Endereço completo é obrigatório para finalizar o pedido." });
      return;
    }

    const order = await Order.create({
      userId: req.user?._id || null,
      customer: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone || "",
        cep: address.cep || customer.cep
      },
      address,
      items: items.map((item) => ({
        productId: item.product._id,
        name: item.product.name,
        quantity: item.quantity,
        unitPrice: item.product.price
      })),
      subtotal,
      shipping,
      shippingOption: req.body.shippingOption || {},
      total,
      paymentProvider: "manual",
      paymentStatus: "not_started",
      customerNote: req.body.customerNote || "",
      statusHistory: [{ status: "pending", note: "Pedido criado sem pagamento online" }]
    });

    res.status(201).json({
      order,
      message: "Pedido recebido. Entraremos em contato para combinar o pagamento."
    });
  } catch (error) {
    next(error);
  }
});

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
      {
        status: req.body.status,
        $push: {
          statusHistory: {
            status: req.body.status,
            note: req.body.note || "Status atualizado pelo admin"
          }
        }
      },
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

ordersRouter.patch("/:id/fulfillment", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        trackingCode: req.body.trackingCode || "",
        internalNote: req.body.internalNote || ""
      },
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
