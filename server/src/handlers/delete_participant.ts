
import { db } from '../db';
import { participantsTable, expensesTable, expenseSplitsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteParticipant = async (id: number): Promise<{ success: boolean }> => {
  try {
    // First, get all expenses paid by this participant
    const expensesPaidByParticipant = await db.select()
      .from(expensesTable)
      .where(eq(expensesTable.paid_by_participant_id, id))
      .execute();

    // Delete all expense splits for expenses paid by this participant
    for (const expense of expensesPaidByParticipant) {
      await db.delete(expenseSplitsTable)
        .where(eq(expenseSplitsTable.expense_id, expense.id))
        .execute();
    }

    // Delete all expense splits where this participant is involved (not as payer)
    await db.delete(expenseSplitsTable)
      .where(eq(expenseSplitsTable.participant_id, id))
      .execute();

    // Then, delete all expenses paid by this participant
    await db.delete(expensesTable)
      .where(eq(expensesTable.paid_by_participant_id, id))
      .execute();

    // Finally, delete the participant
    await db.delete(participantsTable)
      .where(eq(participantsTable.id, id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Participant deletion failed:', error);
    throw error;
  }
};
