import { Router } from "express";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { Product } from "../models/Product.js";
import { Order } from "../models/Order.js";
import { optionalAuth } from "../middleware/auth.js";

export const paymentsRouter = Router();

paymentsRouter.post("/checkout", optionalAuth, async (req, res, next) => {
  try {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

    if (!accessToken) {
      res.status(500).json({ message: "Token do Mercado Pago não configurado." });
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

    const order = await Order.create({
      userId: req.user?._id || null,
      customer: req.body.customer,
      items: items.map((item) => ({
        productId: item.product._id,
        name: item.product.name,
        quantity: item.quantity,
        unitPrice: item.product.price
      })),
      subtotal,
      shipping,
      total
    });

    const client = new MercadoPagoConfig({ accessToken });
    const preference = new Preference(client);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    const response = await preference.create({
      body: {
        external_reference: String(order._id),
        items: [
          ...items.map((item) => ({
            id: String(item.product._id),
            title: item.product.name,
            quantity: item.quantity,
            unit_price: item.product.price,
            currency_id: "BRL"
          })),
          {
            id: "shipping",
            title: "Frete",
            quantity: 1,
            unit_price: shipping,
            currency_id: "BRL"
          }
        ],
        payer: {
          name: req.body.customer.name,
          email: req.body.customer.email
        },
        back_urls: {
          success: `${frontendUrl}/?payment=success`,
          failure: `${frontendUrl}/?payment=failure`,
          pending: `${frontendUrl}/?payment=pending`
        },
        auto_return: "approved"
      }
    });

    order.paymentPreferenceId = response.id;
    order.paymentUrl = response.init_point || response.sandbox_init_point;
    await order.save();

    res.status(201).json({
      orderId: order._id,
      preferenceId: response.id,
      paymentUrl: order.paymentUrl
    });
  } catch (error) {
    next(error);
  }
});
