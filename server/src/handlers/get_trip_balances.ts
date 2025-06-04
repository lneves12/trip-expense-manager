
import { db } from '../db';
import { expensesTable, expenseSplitsTable, participantsTable } from '../db/schema';
import { type TripBalances } from '../schema';
import { eq, sum } from 'drizzle-orm';

export const getTripBalances = async (tripId: number): Promise<TripBalances> => {
  try {
    // Get all participants for the trip
    const participants = await db.select()
      .from(participantsTable)
      .where(eq(participantsTable.trip_id, tripId))
      .execute();

    // Get total amounts paid by each participant
    const paidAmounts = await db.select({
      participant_id: expensesTable.paid_by_participant_id,
      total_paid: sum(expensesTable.amount)
    })
      .from(expensesTable)
      .where(eq(expensesTable.trip_id, tripId))
      .groupBy(expensesTable.paid_by_participant_id)
      .execute();

    // Get total amounts owed by each participant (from expense splits)
    const owedAmounts = await db.select({
      participant_id: expenseSplitsTable.participant_id,
      total_owed: sum(expenseSplitsTable.amount)
    })
      .from(expenseSplitsTable)
      .innerJoin(expensesTable, eq(expenseSplitsTable.expense_id, expensesTable.id))
      .where(eq(expensesTable.trip_id, tripId))
      .groupBy(expenseSplitsTable.participant_id)
      .execute();

    // Calculate balances for each participant
    const balances = participants.map(participant => {
      const paid = paidAmounts.find(p => p.participant_id === participant.id);
      const owed = owedAmounts.find(o => o.participant_id === participant.id);

      const totalPaid = paid ? parseFloat(paid.total_paid || '0') : 0;
      const totalOwed = owed ? parseFloat(owed.total_owed || '0') : 0;

      return {
        participant_id: participant.id,
        participant_name: participant.name,
        balance: totalPaid - totalOwed // positive = owed money, negative = owes money
      };
    });

    // Calculate settlements to minimize transactions
    const settlements = calculateSettlements(balances);

    return {
      trip_id: tripId,
      balances,
      settlements
    };
  } catch (error) {
    console.error('Failed to get trip balances:', error);
    throw error;
  }
};

// Helper function to calculate optimal settlements
function calculateSettlements(balances: Array<{ participant_id: number; participant_name: string; balance: number }>) {
  // Separate creditors (positive balance) and debtors (negative balance)
  const creditors = balances.filter(b => b.balance > 0).map(b => ({ ...b }));
  const debtors = balances.filter(b => b.balance < 0).map(b => ({ ...b, balance: Math.abs(b.balance) }));

  const settlements = [];

  // Sort by amount to optimize settlements
  creditors.sort((a, b) => b.balance - a.balance);
  debtors.sort((a, b) => b.balance - a.balance);

  let i = 0, j = 0;

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];

    const settleAmount = Math.min(creditor.balance, debtor.balance);

    if (settleAmount > 0.01) { // Only create settlement if amount is significant
      settlements.push({
        from_participant: debtor.participant_name,
        to_participant: creditor.participant_name,
        amount: Math.round(settleAmount * 100) / 100 // Round to 2 decimal places
      });

      creditor.balance -= settleAmount;
      debtor.balance -= settleAmount;
    }

    // Move to next participant if current one is settled
    if (creditor.balance < 0.01) i++;
    if (debtor.balance < 0.01) j++;
  }

  return settlements;
}
