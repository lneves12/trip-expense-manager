
import { db } from '../db';
import { expensesTable } from '../db/schema';
import { type Expense } from '../schema';
import { eq } from 'drizzle-orm';

export const getTripExpenses = async (tripId: number): Promise<Expense[]> => {
  try {
    const results = await db.select()
      .from(expensesTable)
      .where(eq(expensesTable.trip_id, tripId))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(expense => ({
      ...expense,
      amount: parseFloat(expense.amount) // Convert string back to number
    }));
  } catch (error) {
    console.error('Failed to get trip expenses:', error);
    throw error;
  }
};
