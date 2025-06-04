
import { serial, text, pgTable, timestamp, numeric, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const currencyEnum = pgEnum('currency', ['EUR', 'USD']);
export const splitTypeEnum = pgEnum('split_type', ['EQUAL', 'PERCENTAGE', 'CUSTOM']);

// Tables
export const tripsTable = pgTable('trips', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  currency: currencyEnum('currency').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const participantsTable = pgTable('participants', {
  id: serial('id').primaryKey(),
  trip_id: integer('trip_id').notNull(),
  name: text('name').notNull(),
  email: text('email'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const expensesTable = pgTable('expenses', {
  id: serial('id').primaryKey(),
  trip_id: integer('trip_id').notNull(),
  paid_by_participant_id: integer('paid_by_participant_id').notNull(),
  description: text('description').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  split_type: splitTypeEnum('split_type').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const expenseSplitsTable = pgTable('expense_splits', {
  id: serial('id').primaryKey(),
  expense_id: integer('expense_id').notNull(),
  participant_id: integer('participant_id').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  percentage: numeric('percentage', { precision: 5, scale: 2 }),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const tripsRelations = relations(tripsTable, ({ many }) => ({
  participants: many(participantsTable),
  expenses: many(expensesTable),
}));

export const participantsRelations = relations(participantsTable, ({ one, many }) => ({
  trip: one(tripsTable, {
    fields: [participantsTable.trip_id],
    references: [tripsTable.id],
  }),
  paidExpenses: many(expensesTable),
  expenseSplits: many(expenseSplitsTable),
}));

export const expensesRelations = relations(expensesTable, ({ one, many }) => ({
  trip: one(tripsTable, {
    fields: [expensesTable.trip_id],
    references: [tripsTable.id],
  }),
  paidBy: one(participantsTable, {
    fields: [expensesTable.paid_by_participant_id],
    references: [participantsTable.id],
  }),
  splits: many(expenseSplitsTable),
}));

export const expenseSplitsRelations = relations(expenseSplitsTable, ({ one }) => ({
  expense: one(expensesTable, {
    fields: [expenseSplitsTable.expense_id],
    references: [expensesTable.id],
  }),
  participant: one(participantsTable, {
    fields: [expenseSplitsTable.participant_id],
    references: [participantsTable.id],
  }),
}));

// Export all tables
export const tables = {
  trips: tripsTable,
  participants: participantsTable,
  expenses: expensesTable,
  expenseSplits: expenseSplitsTable,
};
