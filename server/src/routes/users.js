import { Router } from "express";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { User } from "../models/User.js";

export const usersRouter = Router();

usersRouter.get("/", requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    next(error);
  }
});

usersRouter.patch("/:id/role", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: req.body.role },
      { new: true, runValidators: true }
    );

    if (!user) {
      res.status(404).json({ message: "Usuário não encontrado." });
      return;
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});
