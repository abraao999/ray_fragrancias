import { Router } from "express";

export const shippingRouter = Router();

shippingRouter.post("/quote", (req, res) => {
  const cep = String(req.body.cep || "").replace(/\D/g, "");
  const subtotal = Number(req.body.subtotal || 0);

  if (cep.length !== 8) {
    res.status(400).json({ message: "CEP inválido." });
    return;
  }

  const firstDigit = Number(cep[0]);
  const shipping = subtotal >= 250 ? 0 : 16.9 + firstDigit * 1.75;
  const deliveryDays = firstDigit <= 3 ? 3 : 6;

  res.json({
    cep,
    service: "Entrega padrão",
    price: Number(shipping.toFixed(2)),
    deliveryDays
  });
});
