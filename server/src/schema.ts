
import { z } from 'zod';

// Enums
export const currencySchema = z.enum(['EUR', 'USD']);
export type Currency = z.infer<typeof currencySchema>;

export const splitTypeSchema = z.enum(['EQUAL', 'PERCENTAGE', 'CUSTOM']);
export type SplitType = z.infer<typeof splitTypeSchema>;

// Trip schemas
export const tripSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  currency: currencySchema,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Trip = z.infer<typeof tripSchema>;

export const createTripInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable(),
  currency: currencySchema
});

export type CreateTripInput = z.infer<typeof createTripInputSchema>;

export const updateTripInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  currency: currencySchema.optional()
});

export type UpdateTripInput = z.infer<typeof updateTripInputSchema>;

// Participant schemas
export const participantSchema = z.object({
  id: z.number(),
  trip_id: z.number(),
  name: z.string(),
  email: z.string().nullable(),
  created_at: z.coerce.date()
});

export type Participant = z.infer<typeof participantSchema>;

export const createParticipantInputSchema = z.object({
  trip_id: z.number(),
  name: z.string().min(1),
  email: z.string().email().nullable()
});

export type CreateParticipantInput = z.infer<typeof createParticipantInputSchema>;

// Expense schemas
export const expenseSchema = z.object({
  id: z.number(),
  trip_id: z.number(),
  paid_by_participant_id: z.number(),
  description: z.string(),
  amount: z.number(),
  split_type: splitTypeSchema,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Expense = z.infer<typeof expenseSchema>;

export const createExpenseInputSchema = z.object({
  trip_id: z.number(),
  paid_by_participant_id: z.number(),
  description: z.string().min(1),
  amount: z.number().positive(),
  split_type: splitTypeSchema,
  splits: z.array(z.object({
    participant_id: z.number(),
    amount: z.number().optional(), // For custom splits
    percentage: z.number().min(0).max(100).optional() // For percentage splits
  }))
});

export type CreateExpenseInput = z.infer<typeof createExpenseInputSchema>;

// Expense split schemas
export const expenseSplitSchema = z.object({
  id: z.number(),
  expense_id: z.number(),
  participant_id: z.number(),
  amount: z.number(),
  percentage: z.number().nullable(),
  created_at: z.coerce.date()
});

export type ExpenseSplit = z.infer<typeof expenseSplitSchema>;

// Balance schemas
export const balanceSchema = z.object({
  participant_id: z.number(),
  participant_name: z.string(),
  balance: z.number() // positive = owed money, negative = owes money
});

export type Balance = z.infer<typeof balanceSchema>;

// Settlement schemas
export const settlementSchema = z.object({
  from_participant: z.string(),
  to_participant: z.string(),
  amount: z.number()
});

export type Settlement = z.infer<typeof settlementSchema>;

export const tripBalancesSchema = z.object({
  trip_id: z.number(),
  balances: z.array(balanceSchema),
  settlements: z.array(settlementSchema)
});

export type TripBalances = z.infer<typeof tripBalancesSchema>;
