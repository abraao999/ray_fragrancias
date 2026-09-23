import { Router } from "express";
import { Product } from "../models/Product.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { fileToDataUrl, upload } from "../middleware/upload.js";

export const productsRouter = Router();

productsRouter.get("/", async (req, res, next) => {
  try {
    const filter = req.query.includeInactive === "true" ? {} : { isActive: true };
    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    next(error);
  }
});

productsRouter.post("/", requireAuth, requireAdmin, upload.single("image"), async (req, res, next) => {
  try {
    const price = Number(req.body.price);
    const stock = Number(req.body.stock);

    const product = await Product.create({
      name: req.body.name,
      family: req.body.family,
      size: req.body.size || "100 ml",
      price,
      notes: req.body.notes,
      stock,
      tag: req.body.tag || "Novo",
      imageUrl: fileToDataUrl(req.file),
      isActive: req.body.isActive !== "false"
    });

    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
});

productsRouter.put("/:id", requireAuth, requireAdmin, upload.single("image"), async (req, res, next) => {
  try {
    const updates = {
      name: req.body.name,
      family: req.body.family,
      size: req.body.size,
      price: Number(req.body.price),
      notes: req.body.notes,
      stock: Number(req.body.stock),
      tag: req.body.tag,
      isActive: req.body.isActive !== "false"
    };

    if (req.file) {
      updates.imageUrl = fileToDataUrl(req.file);
    }

    const product = await Product.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    });

    if (!product) {
      res.status(404).json({ message: "Produto não encontrado." });
      return;
    }

    res.json(product);
  } catch (error) {
    next(error);
  }
});

productsRouter.delete("/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

productsRouter.patch("/:id/status", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: Boolean(req.body.isActive) },
      { new: true, runValidators: true }
    );

    if (!product) {
      res.status(404).json({ message: "Produto não encontrado." });
      return;
    }

    res.json(product);
  } catch (error) {
    next(error);
  }
});
