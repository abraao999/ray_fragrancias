import { Router } from "express";
import { requireAuth, signUser } from "../middleware/auth.js";
import { User } from "../models/User.js";

export const authRouter = Router();

authRouter.post("/register", async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ message: "Nome, e-mail e senha são obrigatórios." });
      return;
    }

    const existing = await User.findOne({ email });

    if (existing) {
      res.status(409).json({ message: "Já existe uma conta com esse e-mail." });
      return;
    }

    const usersCount = await User.countDocuments();
    const user = await User.create({
      name,
      email,
      phone,
      role: usersCount === 0 ? "admin" : "customer",
      passwordHash: await User.hashPassword(password)
    });

    res.status(201).json({
      user,
      token: signUser(user)
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await user.checkPassword(password))) {
      res.status(401).json({ message: "E-mail ou senha inválidos." });
      return;
    }

    res.json({
      user,
      token: signUser(user)
    });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});
