
import { db } from '../db';
import { expensesTable, expenseSplitsTable, participantsTable, tripsTable } from '../db/schema';
import { type CreateExpenseInput, type Expense } from '../schema';
import { eq, inArray } from 'drizzle-orm';

export const createExpense = async (input: CreateExpenseInput): Promise<Expense> => {
  try {
    // Verify trip exists
    const trips = await db.select()
      .from(tripsTable)
      .where(eq(tripsTable.id, input.trip_id))
      .execute();
    
    if (trips.length === 0) {
      throw new Error(`Trip with id ${input.trip_id} not found`);
    }

    // Verify paid_by participant exists and belongs to trip
    const paidByParticipants = await db.select()
      .from(participantsTable)
      .where(eq(participantsTable.id, input.paid_by_participant_id))
      .execute();
    
    if (paidByParticipants.length === 0) {
      throw new Error(`Participant with id ${input.paid_by_participant_id} not found`);
    }
    
    if (paidByParticipants[0].trip_id !== input.trip_id) {
      throw new Error(`Participant ${input.paid_by_participant_id} does not belong to trip ${input.trip_id}`);
    }

    // Verify all split participants exist and belong to trip
    const splitParticipantIds = input.splits.map(split => split.participant_id);
    const splitParticipants = await db.select()
      .from(participantsTable)
      .where(inArray(participantsTable.id, splitParticipantIds))
      .execute();
    
    if (splitParticipants.length !== splitParticipantIds.length) {
      throw new Error('One or more split participants not found');
    }
    
    const invalidParticipants = splitParticipants.filter(p => p.trip_id !== input.trip_id);
    if (invalidParticipants.length > 0) {
      throw new Error('One or more split participants do not belong to this trip');
    }

    // Calculate split amounts based on split type
    let calculatedSplits: Array<{ participant_id: number; amount: number; percentage: number | null }> = [];

    if (input.split_type === 'EQUAL') {
      const splitAmount = input.amount / input.splits.length;
      calculatedSplits = input.splits.map(split => ({
        participant_id: split.participant_id,
        amount: splitAmount,
        percentage: null
      }));
    } else if (input.split_type === 'PERCENTAGE') {
      const totalPercentage = input.splits.reduce((sum, split) => sum + (split.percentage || 0), 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        throw new Error('Percentage splits must total 100%');
      }
      
      calculatedSplits = input.splits.map(split => {
        const percentage = split.percentage || 0;
        return {
          participant_id: split.participant_id,
          amount: (input.amount * percentage) / 100,
          percentage
        };
      });
    } else if (input.split_type === 'CUSTOM') {
      const totalCustomAmount = input.splits.reduce((sum, split) => sum + (split.amount || 0), 0);
      if (Math.abs(totalCustomAmount - input.amount) > 0.01) {
        throw new Error('Custom split amounts must total the expense amount');
      }
      
      calculatedSplits = input.splits.map(split => ({
        participant_id: split.participant_id,
        amount: split.amount || 0,
        percentage: null
      }));
    }

    // Insert expense record
    const expenseResult = await db.insert(expensesTable)
      .values({
        trip_id: input.trip_id,
        paid_by_participant_id: input.paid_by_participant_id,
        description: input.description,
        amount: input.amount.toString(),
        split_type: input.split_type
      })
      .returning()
      .execute();

    const expense = expenseResult[0];

    // Insert expense splits
    await db.insert(expenseSplitsTable)
      .values(calculatedSplits.map(split => ({
        expense_id: expense.id,
        participant_id: split.participant_id,
        amount: split.amount.toString(),
        percentage: split.percentage?.toString() || null
      })))
      .execute();

    // Return expense with numeric conversion
    return {
      ...expense,
      amount: parseFloat(expense.amount)
    };
  } catch (error) {
    console.error('Expense creation failed:', error);
    throw error;
  }
};
