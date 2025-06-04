
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tripsTable, participantsTable, expensesTable } from '../db/schema';
import { type CreateTripInput, type CreateParticipantInput, type CreateExpenseInput } from '../schema';
import { getTripExpenses } from '../handlers/get_trip_expenses';

describe('getTripExpenses', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array for trip with no expenses', async () => {
    // Create a trip first
    const tripResult = await db.insert(tripsTable)
      .values({
        name: 'Test Trip',
        description: 'A test trip',
        currency: 'USD'
      })
      .returning()
      .execute();

    const trip = tripResult[0];
    const result = await getTripExpenses(trip.id);

    expect(result).toEqual([]);
  });

  it('should return expenses for a trip', async () => {
    // Create a trip
    const tripResult = await db.insert(tripsTable)
      .values({
        name: 'Test Trip',
        description: 'A test trip',
        currency: 'USD'
      })
      .returning()
      .execute();

    const trip = tripResult[0];

    // Create a participant
    const participantResult = await db.insert(participantsTable)
      .values({
        trip_id: trip.id,
        name: 'Test Participant',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    const participant = participantResult[0];

    // Create expenses
    const expense1Result = await db.insert(expensesTable)
      .values({
        trip_id: trip.id,
        paid_by_participant_id: participant.id,
        description: 'Dinner',
        amount: '50.00',
        split_type: 'EQUAL'
      })
      .returning()
      .execute();

    const expense2Result = await db.insert(expensesTable)
      .values({
        trip_id: trip.id,
        paid_by_participant_id: participant.id,
        description: 'Gas',
        amount: '25.50',
        split_type: 'PERCENTAGE'
      })
      .returning()
      .execute();

    const result = await getTripExpenses(trip.id);

    expect(result).toHaveLength(2);
    
    // Check first expense
    const dinner = result.find(e => e.description === 'Dinner');
    expect(dinner).toBeDefined();
    expect(dinner!.trip_id).toEqual(trip.id);
    expect(dinner!.paid_by_participant_id).toEqual(participant.id);
    expect(dinner!.amount).toEqual(50.00);
    expect(typeof dinner!.amount).toBe('number');
    expect(dinner!.split_type).toEqual('EQUAL');
    expect(dinner!.created_at).toBeInstanceOf(Date);
    expect(dinner!.updated_at).toBeInstanceOf(Date);

    // Check second expense
    const gas = result.find(e => e.description === 'Gas');
    expect(gas).toBeDefined();
    expect(gas!.trip_id).toEqual(trip.id);
    expect(gas!.paid_by_participant_id).toEqual(participant.id);
    expect(gas!.amount).toEqual(25.50);
    expect(typeof gas!.amount).toBe('number');
    expect(gas!.split_type).toEqual('PERCENTAGE');
    expect(gas!.created_at).toBeInstanceOf(Date);
    expect(gas!.updated_at).toBeInstanceOf(Date);
  });

  it('should only return expenses for the specified trip', async () => {
    // Create two trips
    const trip1Result = await db.insert(tripsTable)
      .values({
        name: 'Trip 1',
        description: 'First trip',
        currency: 'USD'
      })
      .returning()
      .execute();

    const trip2Result = await db.insert(tripsTable)
      .values({
        name: 'Trip 2',
        description: 'Second trip',
        currency: 'EUR'
      })
      .returning()
      .execute();

    const trip1 = trip1Result[0];
    const trip2 = trip2Result[0];

    // Create participants for both trips
    const participant1Result = await db.insert(participantsTable)
      .values({
        trip_id: trip1.id,
        name: 'Participant 1',
        email: 'p1@example.com'
      })
      .returning()
      .execute();

    const participant2Result = await db.insert(participantsTable)
      .values({
        trip_id: trip2.id,
        name: 'Participant 2',
        email: 'p2@example.com'
      })
      .returning()
      .execute();

    const participant1 = participant1Result[0];
    const participant2 = participant2Result[0];

    // Create expenses for both trips
    await db.insert(expensesTable)
      .values({
        trip_id: trip1.id,
        paid_by_participant_id: participant1.id,
        description: 'Trip 1 Expense',
        amount: '100.00',
        split_type: 'EQUAL'
      })
      .execute();

    await db.insert(expensesTable)
      .values({
        trip_id: trip2.id,
        paid_by_participant_id: participant2.id,
        description: 'Trip 2 Expense',
        amount: '200.00',
        split_type: 'CUSTOM'
      })
      .execute();

    // Get expenses for trip 1
    const trip1Expenses = await getTripExpenses(trip1.id);
    expect(trip1Expenses).toHaveLength(1);
    expect(trip1Expenses[0].description).toEqual('Trip 1 Expense');
    expect(trip1Expenses[0].trip_id).toEqual(trip1.id);

    // Get expenses for trip 2
    const trip2Expenses = await getTripExpenses(trip2.id);
    expect(trip2Expenses).toHaveLength(1);
    expect(trip2Expenses[0].description).toEqual('Trip 2 Expense');
    expect(trip2Expenses[0].trip_id).toEqual(trip2.id);
  });

  it('should handle non-existent trip id', async () => {
    const result = await getTripExpenses(999);
    expect(result).toEqual([]);
  });

  it('should correctly convert numeric amounts to numbers', async () => {
    // Create trip and participant
    const tripResult = await db.insert(tripsTable)
      .values({
        name: 'Test Trip',
        description: 'A test trip',
        currency: 'USD'
      })
      .returning()
      .execute();

    const participantResult = await db.insert(participantsTable)
      .values({
        trip_id: tripResult[0].id,
        name: 'Test Participant',
        email: 'test@example.com'
      })
      .returning()
      .execute();

    // Create expense with decimal amount
    await db.insert(expensesTable)
      .values({
        trip_id: tripResult[0].id,
        paid_by_participant_id: participantResult[0].id,
        description: 'Test Expense',
        amount: '123.45',
        split_type: 'EQUAL'
      })
      .execute();

    const result = await getTripExpenses(tripResult[0].id);

    expect(result).toHaveLength(1);
    expect(result[0].amount).toEqual(123.45);
    expect(typeof result[0].amount).toBe('number');
  });
});
