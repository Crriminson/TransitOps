import { Router } from "express";
import bcrypt from "bcrypt";
import { loginSchema, registerSchema } from "@transitops/shared";
import { prisma } from "../lib/prisma";
import { signAuthToken } from "../lib/jwt";
import { AppError } from "../lib/errors";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

const BCRYPT_COST_FACTOR = 10;

function toSafeUser(user: {
  id: string;
  name: string;
  email: string;
  role: string;
}) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

// POST /api/auth/login — public
router.post("/login", async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email } });

  // Same generic 401 whether the email is unknown or the password is wrong
  // — don't leak which emails are registered (§6).
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError(401, "Invalid email or password");
  }

  const token = signAuthToken({ userId: user.id, role: user.role });
  res.json({ token, user: toSafeUser(user) });
});

// POST /api/auth/register — Fleet Manager only (creating other users)
router.post(
  "/register",
  requireAuth,
  requireRole(["FLEET_MANAGER"]),
  async (req, res) => {
    const { name, email, password, role } = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError(409, "A user with this email already exists");
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST_FACTOR);
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role },
    });

    res.status(201).json(toSafeUser(user));
  }
);

// GET /api/auth/me — any authenticated role
router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) {
    throw new AppError(401, "User no longer exists");
  }
  res.json(toSafeUser(user));
});

export default router;
