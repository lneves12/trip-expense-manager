
import { db } from '../db';
import { expensesTable, expenseSplitsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteExpense = async (id: number): Promise<{ success: boolean }> => {
  try {
    // Delete expense splits first (due to foreign key constraint)
    // This is necessary until cascade deletes are properly configured in the schema
    await db.delete(expenseSplitsTable)
      .where(eq(expenseSplitsTable.expense_id, id))
      .execute();

    // Delete the expense
    const result = await db.delete(expensesTable)
      .where(eq(expensesTable.id, id))
      .returning()
      .execute();

    return { success: result.length > 0 };
  } catch (error) {
    console.error('Expense deletion failed:', error);
    throw error;
  }
};
