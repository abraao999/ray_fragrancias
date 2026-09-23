import { Router } from "express";

export const shippingRouter = Router();

shippingRouter.post("/quote", async (req, res, next) => {
  try {
  const cep = String(req.body.cep || "").replace(/\D/g, "");
  const subtotal = Number(req.body.subtotal || 0);

  if (cep.length !== 8) {
    res.status(400).json({ message: "CEP inválido." });
    return;
  }

    if (!process.env.MELHOR_ENVIO_TOKEN || !process.env.SHIP_FROM_CEP) {
      res.json({
        cep,
        options: [fallbackQuote(cep, subtotal)],
        provider: "fallback"
      });
      return;
    }

    let options = [];
    let provider = "melhor_envio";
    let warning = "";

    try {
      options = await quoteMelhorEnvio({
        cep,
        subtotal,
        items: req.body.items || []
      });
    } catch (error) {
      provider = "fallback";
      warning = error.message || "Melhor Envio indisponível no momento.";
      options = [fallbackQuote(cep, subtotal)];
    }

    if (!options.length) {
      provider = "fallback";
      warning = "Nenhuma opção válida retornada pelo Melhor Envio.";
      options = [fallbackQuote(cep, subtotal)];
    }

    res.json({
      cep,
      options,
      provider,
      warning
    });
  } catch (error) {
    next(error);
  }
});

function fallbackQuote(cep, subtotal) {
  const firstDigit = Number(cep[0]);
  const shipping = subtotal >= 250 ? 0 : 16.9 + firstDigit * 1.75;
  const deliveryDays = firstDigit <= 3 ? 3 : 6;

  return {
    id: "fallback-standard",
    cep,
    service: "Entrega padrão",
    company: "Ray Fragrâncias",
    price: Number(shipping.toFixed(2)),
    deliveryDays
  };
}

async function quoteMelhorEnvio({ cep, subtotal, items }) {
  const baseUrl = process.env.MELHOR_ENVIO_BASE_URL || "https://www.melhorenvio.com.br";
  const response = await fetch(`${baseUrl}/api/v2/me/shipment/calculate`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${process.env.MELHOR_ENVIO_TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": process.env.MELHOR_ENVIO_USER_AGENT || "Ray Fragrancias (contato@rayfragrancias.com.br)"
    },
    body: JSON.stringify({
      from: { postal_code: onlyDigits(process.env.SHIP_FROM_CEP) },
      to: { postal_code: cep },
      products: buildProducts(items, subtotal),
      options: {
        receipt: false,
        own_hand: false,
        insurance_value: subtotal,
        use_insurance_value: subtotal > 0
      }
    })
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || data?.error || "Não foi possível consultar o Melhor Envio.");
  }

  if (!Array.isArray(data)) {
    throw new Error(data?.message || "Resposta inesperada do Melhor Envio.");
  }

  return data
    .filter((option) => !option.error && option.price)
    .map((option) => ({
      id: String(option.id),
      service: option.name,
      company: option.company?.name || "Transportadora",
      price: Number(option.price),
      deliveryDays: Number(option.delivery_time || 0),
      currency: option.currency || "R$",
      packages: option.packages || []
    }));
}

function buildProducts(items, subtotal) {
  if (Array.isArray(items) && items.length > 0) {
    return items.map((item) => ({
      id: String(item.productId || item.id || "produto"),
      width: Number(item.width || process.env.DEFAULT_PACKAGE_WIDTH || 12),
      height: Number(item.height || process.env.DEFAULT_PACKAGE_HEIGHT || 18),
      length: Number(item.length || process.env.DEFAULT_PACKAGE_LENGTH || 8),
      weight: Number(item.weight || process.env.DEFAULT_PACKAGE_WEIGHT || 0.35),
      insurance_value: Number(item.price || subtotal || 1),
      quantity: Number(item.quantity || 1)
    }));
  }

  return [
    {
      id: "ray-perfume",
      width: Number(process.env.DEFAULT_PACKAGE_WIDTH || 12),
      height: Number(process.env.DEFAULT_PACKAGE_HEIGHT || 18),
      length: Number(process.env.DEFAULT_PACKAGE_LENGTH || 8),
      weight: Number(process.env.DEFAULT_PACKAGE_WEIGHT || 0.35),
      insurance_value: Number(subtotal || 1),
      quantity: 1
    }
  ];
}

function onlyDigits(value = "") {
  return String(value).replace(/\D/g, "");
}
