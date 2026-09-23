import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

export async function optionalAuth(req, _res, next) {
  try {
    const token = getBearerToken(req);

    if (token) {
      req.user = await readUserFromToken(token);
    }

    next();
  } catch (_error) {
    next();
  }
}

export async function requireAuth(req, res, next) {
  try {
    const token = getBearerToken(req);

    if (!token) {
      res.status(401).json({ message: "Faça login para continuar." });
      return;
    }

    req.user = await readUserFromToken(token);
    next();
  } catch (_error) {
    res.status(401).json({ message: "Sessão inválida ou expirada." });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    res.status(403).json({ message: "Acesso permitido apenas ao dono." });
    return;
  }

  next();
}

export function signUser(user) {
  return jwt.sign(
    {
      sub: String(user._id),
      role: user.role
    },
    getJwtSecret(),
    { expiresIn: "7d" }
  );
}

function getBearerToken(req) {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return "";
  }

  return header.slice("Bearer ".length);
}

async function readUserFromToken(token) {
  const payload = jwt.verify(token, getJwtSecret());
  const user = await User.findById(payload.sub);

  if (!user) {
    throw new Error("Usuário não encontrado.");
  }

  return user;
}

function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET não foi configurado no .env");
  }

  return process.env.JWT_SECRET;
}
