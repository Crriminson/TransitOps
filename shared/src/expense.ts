import { z } from "zod";
import { ExpenseTypeEnum } from "./enums";

// ---------------------------------------------------------------------------
// Expense mutation schema — Step 6 (Fuel & Expense), Technical Requirements
// §3.7. type is one of TOLL | MAINTENANCE | OTHER; description is optional.
// ---------------------------------------------------------------------------

export const expenseCreateSchema = z.object({
  vehicleId: z.string().min(1, "Vehicle is required"),
  type: ExpenseTypeEnum,
  amount: z.coerce
    .number({ invalid_type_error: "Amount must be a number" })
    .nonnegative("Amount must be zero or greater"),
  date: z.coerce.date({ invalid_type_error: "Date must be valid" }),
  description: z.string().optional(),
});
export type ExpenseCreateInput = z.infer<typeof expenseCreateSchema>;
