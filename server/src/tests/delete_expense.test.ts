
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tripsTable, participantsTable, expensesTable, expenseSplitsTable } from '../db/schema';
import { deleteExpense } from '../handlers/delete_expense';
import { eq } from 'drizzle-orm';

describe('deleteExpense', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an expense and its splits', async () => {
    // Create prerequisite data
    const trip = await db.insert(tripsTable)
      .values({
        name: 'Test Trip',
        description: 'A trip for testing',
        currency: 'USD'
      })
      .returning()
      .execute();

    const participant1 = await db.insert(participantsTable)
      .values({
        trip_id: trip[0].id,
        name: 'Alice',
        email: 'alice@example.com'
      })
      .returning()
      .execute();

    const participant2 = await db.insert(participantsTable)
      .values({
        trip_id: trip[0].id,
        name: 'Bob',
        email: 'bob@example.com'
      })
      .returning()
      .execute();

    // Create expense
    const expense = await db.insert(expensesTable)
      .values({
        trip_id: trip[0].id,
        paid_by_participant_id: participant1[0].id,
        description: 'Test Expense',
        amount: '100.00',
        split_type: 'EQUAL'
      })
      .returning()
      .execute();

    // Create expense splits
    await db.insert(expenseSplitsTable)
      .values([
        {
          expense_id: expense[0].id,
          participant_id: participant1[0].id,
          amount: '50.00',
          percentage: null
        },
        {
          expense_id: expense[0].id,
          participant_id: participant2[0].id,
          amount: '50.00',
          percentage: null
        }
      ])
      .execute();

    // Delete the expense
    const result = await deleteExpense(expense[0].id);

    // Verify deletion was successful
    expect(result.success).toBe(true);

    // Verify expense is deleted
    const expenses = await db.select()
      .from(expensesTable)
      .where(eq(expensesTable.id, expense[0].id))
      .execute();
    expect(expenses).toHaveLength(0);

    // Verify expense splits are deleted
    const splits = await db.select()
      .from(expenseSplitsTable)
      .where(eq(expenseSplitsTable.expense_id, expense[0].id))
      .execute();
    expect(splits).toHaveLength(0);
  });

  it('should return false when expense does not exist', async () => {
    const result = await deleteExpense(999);
    expect(result.success).toBe(false);
  });

  it('should handle expense without splits', async () => {
    // Create prerequisite data
    const trip = await db.insert(tripsTable)
      .values({
        name: 'Test Trip',
        description: null,
        currency: 'EUR'
      })
      .returning()
      .execute();

    const participant = await db.insert(participantsTable)
      .values({
        trip_id: trip[0].id,
        name: 'Charlie',
        email: null
      })
      .returning()
      .execute();

    // Create expense without splits
    const expense = await db.insert(expensesTable)
      .values({
        trip_id: trip[0].id,
        paid_by_participant_id: participant[0].id,
        description: 'Solo Expense',
        amount: '25.50',
        split_type: 'CUSTOM'
      })
      .returning()
      .execute();

    // Delete the expense
    const result = await deleteExpense(expense[0].id);

    // Verify deletion was successful
    expect(result.success).toBe(true);

    // Verify expense is deleted
    const expenses = await db.select()
      .from(expensesTable)
      .where(eq(expensesTable.id, expense[0].id))
      .execute();
    expect(expenses).toHaveLength(0);
  });

  it('should delete only the specified expense', async () => {
    // Create prerequisite data
    const trip = await db.insert(tripsTable)
      .values({
        name: 'Multi Expense Trip',
        description: 'Testing multiple expenses',
        currency: 'USD'
      })
      .returning()
      .execute();

    const participant = await db.insert(participantsTable)
      .values({
        trip_id: trip[0].id,
        name: 'Dave',
        email: 'dave@example.com'
      })
      .returning()
      .execute();

    // Create multiple expenses
    const expense1 = await db.insert(expensesTable)
      .values({
        trip_id: trip[0].id,
        paid_by_participant_id: participant[0].id,
        description: 'First Expense',
        amount: '50.00',
        split_type: 'EQUAL'
      })
      .returning()
      .execute();

    const expense2 = await db.insert(expensesTable)
      .values({
        trip_id: trip[0].id,
        paid_by_participant_id: participant[0].id,
        description: 'Second Expense',
        amount: '75.00',
        split_type: 'EQUAL'
      })
      .returning()
      .execute();

    // Delete only the first expense
    const result = await deleteExpense(expense1[0].id);

    // Verify deletion was successful
    expect(result.success).toBe(true);

    // Verify first expense is deleted
    const deletedExpense = await db.select()
      .from(expensesTable)
      .where(eq(expensesTable.id, expense1[0].id))
      .execute();
    expect(deletedExpense).toHaveLength(0);

    // Verify second expense still exists
    const remainingExpense = await db.select()
      .from(expensesTable)
      .where(eq(expensesTable.id, expense2[0].id))
      .execute();
    expect(remainingExpense).toHaveLength(1);
    expect(remainingExpense[0].description).toBe('Second Expense');
  });
});
