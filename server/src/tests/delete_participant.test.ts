
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tripsTable, participantsTable, expensesTable, expenseSplitsTable } from '../db/schema';
import { deleteParticipant } from '../handlers/delete_participant';
import { eq } from 'drizzle-orm';

describe('deleteParticipant', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a participant with no expenses', async () => {
    // Create trip
    const tripResult = await db.insert(tripsTable)
      .values({
        name: 'Test Trip',
        description: 'A trip for testing',
        currency: 'USD'
      })
      .returning()
      .execute();
    const trip = tripResult[0];

    // Create participant
    const participantResult = await db.insert(participantsTable)
      .values({
        trip_id: trip.id,
        name: 'John Doe',
        email: 'john@example.com'
      })
      .returning()
      .execute();
    const participant = participantResult[0];

    // Delete participant
    const result = await deleteParticipant(participant.id);

    expect(result.success).toBe(true);

    // Verify participant is deleted
    const participants = await db.select()
      .from(participantsTable)
      .where(eq(participantsTable.id, participant.id))
      .execute();

    expect(participants).toHaveLength(0);
  });

  it('should delete participant and their paid expenses with splits', async () => {
    // Create trip
    const tripResult = await db.insert(tripsTable)
      .values({
        name: 'Test Trip',
        description: 'A trip for testing',
        currency: 'USD'
      })
      .returning()
      .execute();
    const trip = tripResult[0];

    // Create participants
    const participantResults = await db.insert(participantsTable)
      .values([
        {
          trip_id: trip.id,
          name: 'John Doe',
          email: 'john@example.com'
        },
        {
          trip_id: trip.id,
          name: 'Jane Smith',
          email: 'jane@example.com'
        }
      ])
      .returning()
      .execute();
    const [john, jane] = participantResults;

    // Create expense paid by John
    const expenseResult = await db.insert(expensesTable)
      .values({
        trip_id: trip.id,
        paid_by_participant_id: john.id,
        description: 'Dinner',
        amount: '50.00',
        split_type: 'EQUAL'
      })
      .returning()
      .execute();
    const expense = expenseResult[0];

    // Create expense splits
    await db.insert(expenseSplitsTable)
      .values([
        {
          expense_id: expense.id,
          participant_id: john.id,
          amount: '25.00',
          percentage: null
        },
        {
          expense_id: expense.id,
          participant_id: jane.id,
          amount: '25.00',
          percentage: null
        }
      ])
      .execute();

    // Delete John
    const result = await deleteParticipant(john.id);

    expect(result.success).toBe(true);

    // Verify John is deleted
    const participants = await db.select()
      .from(participantsTable)
      .where(eq(participantsTable.id, john.id))
      .execute();
    expect(participants).toHaveLength(0);

    // Verify expense paid by John is deleted
    const expenses = await db.select()
      .from(expensesTable)
      .where(eq(expensesTable.id, expense.id))
      .execute();
    expect(expenses).toHaveLength(0);

    // Verify all splits for that expense are deleted
    const splits = await db.select()
      .from(expenseSplitsTable)
      .where(eq(expenseSplitsTable.expense_id, expense.id))
      .execute();
    expect(splits).toHaveLength(0);

    // Verify Jane still exists
    const janeCheck = await db.select()
      .from(participantsTable)
      .where(eq(participantsTable.id, jane.id))
      .execute();
    expect(janeCheck).toHaveLength(1);
  });

  it('should delete participant and their splits in expenses paid by others', async () => {
    // Create trip
    const tripResult = await db.insert(tripsTable)
      .values({
        name: 'Test Trip',
        description: 'A trip for testing',
        currency: 'USD'
      })
      .returning()
      .execute();
    const trip = tripResult[0];

    // Create participants
    const participantResults = await db.insert(participantsTable)
      .values([
        {
          trip_id: trip.id,
          name: 'John Doe',
          email: 'john@example.com'
        },
        {
          trip_id: trip.id,
          name: 'Jane Smith',
          email: 'jane@example.com'
        }
      ])
      .returning()
      .execute();
    const [john, jane] = participantResults;

    // Create expense paid by Jane
    const expenseResult = await db.insert(expensesTable)
      .values({
        trip_id: trip.id,
        paid_by_participant_id: jane.id,
        description: 'Lunch',
        amount: '30.00',
        split_type: 'EQUAL'
      })
      .returning()
      .execute();
    const expense = expenseResult[0];

    // Create expense splits
    await db.insert(expenseSplitsTable)
      .values([
        {
          expense_id: expense.id,
          participant_id: john.id,
          amount: '15.00',
          percentage: null
        },
        {
          expense_id: expense.id,
          participant_id: jane.id,
          amount: '15.00',
          percentage: null
        }
      ])
      .execute();

    // Delete John
    const result = await deleteParticipant(john.id);

    expect(result.success).toBe(true);

    // Verify John is deleted
    const participants = await db.select()
      .from(participantsTable)
      .where(eq(participantsTable.id, john.id))
      .execute();
    expect(participants).toHaveLength(0);

    // Verify expense paid by Jane still exists
    const expenses = await db.select()
      .from(expensesTable)
      .where(eq(expensesTable.id, expense.id))
      .execute();
    expect(expenses).toHaveLength(1);

    // Verify John's split is deleted but Jane's remains
    const splits = await db.select()
      .from(expenseSplitsTable)
      .where(eq(expenseSplitsTable.expense_id, expense.id))
      .execute();
    expect(splits).toHaveLength(1);
    expect(splits[0].participant_id).toBe(jane.id);

    // Verify Jane still exists
    const janeCheck = await db.select()
      .from(participantsTable)
      .where(eq(participantsTable.id, jane.id))
      .execute();
    expect(janeCheck).toHaveLength(1);
  });

  it('should handle complex scenario with multiple expenses and splits', async () => {
    // Create trip
    const tripResult = await db.insert(tripsTable)
      .values({
        name: 'Test Trip',
        description: 'A trip for testing',
        currency: 'USD'
      })
      .returning()
      .execute();
    const trip = tripResult[0];

    // Create participants
    const participantResults = await db.insert(participantsTable)
      .values([
        {
          trip_id: trip.id,
          name: 'John Doe',
          email: 'john@example.com'
        },
        {
          trip_id: trip.id,
          name: 'Jane Smith',
          email: 'jane@example.com'
        },
        {
          trip_id: trip.id,
          name: 'Bob Wilson',
          email: 'bob@example.com'
        }
      ])
      .returning()
      .execute();
    const [john, jane, bob] = participantResults;

    // Create expenses
    const expenseResults = await db.insert(expensesTable)
      .values([
        {
          trip_id: trip.id,
          paid_by_participant_id: john.id,
          description: 'Hotel',
          amount: '150.00',
          split_type: 'EQUAL'
        },
        {
          trip_id: trip.id,
          paid_by_participant_id: jane.id,
          description: 'Gas',
          amount: '60.00',
          split_type: 'CUSTOM'
        },
        {
          trip_id: trip.id,
          paid_by_participant_id: bob.id,
          description: 'Food',
          amount: '90.00',
          split_type: 'PERCENTAGE'
        }
      ])
      .returning()
      .execute();
    const [hotelExpense, gasExpense, foodExpense] = expenseResults;

    // Create splits for all expenses
    await db.insert(expenseSplitsTable)
      .values([
        // Hotel splits (paid by John)
        { expense_id: hotelExpense.id, participant_id: john.id, amount: '50.00', percentage: null },
        { expense_id: hotelExpense.id, participant_id: jane.id, amount: '50.00', percentage: null },
        { expense_id: hotelExpense.id, participant_id: bob.id, amount: '50.00', percentage: null },
        // Gas splits (paid by Jane)
        { expense_id: gasExpense.id, participant_id: john.id, amount: '20.00', percentage: null },
        { expense_id: gasExpense.id, participant_id: jane.id, amount: '20.00', percentage: null },
        { expense_id: gasExpense.id, participant_id: bob.id, amount: '20.00', percentage: null },
        // Food splits (paid by Bob)
        { expense_id: foodExpense.id, participant_id: john.id, amount: '30.00', percentage: '33.33' },
        { expense_id: foodExpense.id, participant_id: jane.id, amount: '30.00', percentage: '33.33' },
        { expense_id: foodExpense.id, participant_id: bob.id, amount: '30.00', percentage: '33.34' }
      ])
      .execute();

    // Delete John
    const result = await deleteParticipant(john.id);

    expect(result.success).toBe(true);

    // Verify John is deleted
    const participants = await db.select()
      .from(participantsTable)
      .where(eq(participantsTable.id, john.id))
      .execute();
    expect(participants).toHaveLength(0);

    // Verify hotel expense (paid by John) is deleted
    const hotelCheck = await db.select()
      .from(expensesTable)
      .where(eq(expensesTable.id, hotelExpense.id))
      .execute();
    expect(hotelCheck).toHaveLength(0);

    // Verify gas and food expenses (paid by others) still exist
    const gasCheck = await db.select()
      .from(expensesTable)
      .where(eq(expensesTable.id, gasExpense.id))
      .execute();
    expect(gasCheck).toHaveLength(1);

    const foodCheck = await db.select()
      .from(expensesTable)
      .where(eq(expensesTable.id, foodExpense.id))
      .execute();
    expect(foodCheck).toHaveLength(1);

    // Verify all splits for hotel expense are deleted
    const hotelSplits = await db.select()
      .from(expenseSplitsTable)
      .where(eq(expenseSplitsTable.expense_id, hotelExpense.id))
      .execute();
    expect(hotelSplits).toHaveLength(0);

    // Verify John's splits in gas and food expenses are deleted
    const gasSplits = await db.select()
      .from(expenseSplitsTable)
      .where(eq(expenseSplitsTable.expense_id, gasExpense.id))
      .execute();
    expect(gasSplits).toHaveLength(2); // Jane and Bob only
    expect(gasSplits.some(split => split.participant_id === john.id)).toBe(false);

    const foodSplits = await db.select()
      .from(expenseSplitsTable)
      .where(eq(expenseSplitsTable.expense_id, foodExpense.id))
      .execute();
    expect(foodSplits).toHaveLength(2); // Jane and Bob only
    expect(foodSplits.some(split => split.participant_id === john.id)).toBe(false);

    // Verify Jane and Bob still exist
    const remainingParticipants = await db.select()
      .from(participantsTable)
      .where(eq(participantsTable.trip_id, trip.id))
      .execute();
    expect(remainingParticipants).toHaveLength(2);
    expect(remainingParticipants.map(p => p.name).sort()).toEqual(['Bob Wilson', 'Jane Smith']);
  });

  it('should handle deletion of non-existent participant gracefully', async () => {
    const result = await deleteParticipant(999);
    expect(result.success).toBe(true);
  });
});
