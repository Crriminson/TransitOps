import { Router } from "express";
import type { Expense, Vehicle } from "@prisma/client";
import { expenseCreateSchema } from "@transitops/shared";
import { prisma } from "../lib/prisma";
import { AppError } from "../lib/errors";
import { requireAuth, requireRole } from "../middleware/auth";
import { emitOpsEvent } from "../lib/socket";
import { serializeVehicle } from "./vehicles";

const router = Router();

type ExpenseWithVehicle = Expense & { vehicle: Vehicle };

function serializeExpense(expense: ExpenseWithVehicle) {
  return {
    ...expense,
    amount: Number(expense.amount),
    vehicle: serializeVehicle(expense.vehicle),
  };
}

// GET /api/expenses — any authenticated role (§5 "all read")
router.get("/", requireAuth, async (_req, res) => {
  const expenses = await prisma.expense.findMany({
    include: { vehicle: true },
    orderBy: { date: "desc" },
  });
  res.json(expenses.map(serializeExpense));
});

// POST /api/expenses — Fleet Manager only. Same as fuel logs: a plain create
// that emits cost:logged so live cost views re-derive (Process Flow §4.6).
router.post("/", requireAuth, requireRole(["FLEET_MANAGER"]), async (req, res) => {
  const data = expenseCreateSchema.parse(req.body);

  const vehicle = await prisma.vehicle.findUnique({ where: { id: data.vehicleId } });
  if (!vehicle) {
    throw new AppError(404, "Vehicle not found");
  }

  const expense = await prisma.expense.create({
    data,
    include: { vehicle: true },
  });

  emitOpsEvent("cost:logged", { vehicleId: data.vehicleId });
  res.status(201).json(serializeExpense(expense));
});

export default router;
