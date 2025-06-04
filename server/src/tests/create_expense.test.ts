
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tripsTable, participantsTable, expensesTable, expenseSplitsTable } from '../db/schema';
import { type CreateExpenseInput } from '../schema';
import { createExpense } from '../handlers/create_expense';
import { eq } from 'drizzle-orm';

describe('createExpense', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let tripId: number;
  let participant1Id: number;
  let participant2Id: number;
  let participant3Id: number;

  beforeEach(async () => {
    // Create test trip
    const tripResult = await db.insert(tripsTable)
      .values({
        name: 'Test Trip',
        description: 'A test trip',
        currency: 'USD'
      })
      .returning()
      .execute();
    tripId = tripResult[0].id;

    // Create test participants
    const participantResults = await db.insert(participantsTable)
      .values([
        { trip_id: tripId, name: 'Alice', email: 'alice@test.com' },
        { trip_id: tripId, name: 'Bob', email: 'bob@test.com' },
        { trip_id: tripId, name: 'Charlie', email: 'charlie@test.com' }
      ])
      .returning()
      .execute();
    
    participant1Id = participantResults[0].id;
    participant2Id = participantResults[1].id;
    participant3Id = participantResults[2].id;
  });

  it('should create expense with equal split', async () => {
    const input: CreateExpenseInput = {
      trip_id: tripId,
      paid_by_participant_id: participant1Id,
      description: 'Dinner',
      amount: 120.00,
      split_type: 'EQUAL',
      splits: [
        { participant_id: participant1Id },
        { participant_id: participant2Id },
        { participant_id: participant3Id }
      ]
    };

    const result = await createExpense(input);

    // Verify expense record
    expect(result.id).toBeDefined();
    expect(result.trip_id).toEqual(tripId);
    expect(result.paid_by_participant_id).toEqual(participant1Id);
    expect(result.description).toEqual('Dinner');
    expect(result.amount).toEqual(120.00);
    expect(result.split_type).toEqual('EQUAL');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify expense splits
    const splits = await db.select()
      .from(expenseSplitsTable)
      .where(eq(expenseSplitsTable.expense_id, result.id))
      .execute();

    expect(splits).toHaveLength(3);
    splits.forEach(split => {
      expect(parseFloat(split.amount)).toEqual(40.00); // 120 / 3
      expect(split.percentage).toBeNull();
    });
  });

  it('should create expense with percentage split', async () => {
    const input: CreateExpenseInput = {
      trip_id: tripId,
      paid_by_participant_id: participant1Id,
      description: 'Groceries',
      amount: 100.00,
      split_type: 'PERCENTAGE',
      splits: [
        { participant_id: participant1Id, percentage: 50 },
        { participant_id: participant2Id, percentage: 30 },
        { participant_id: participant3Id, percentage: 20 }
      ]
    };

    const result = await createExpense(input);

    expect(result.split_type).toEqual('PERCENTAGE');

    const splits = await db.select()
      .from(expenseSplitsTable)
      .where(eq(expenseSplitsTable.expense_id, result.id))
      .execute();

    expect(splits).toHaveLength(3);
    
    const split1 = splits.find(s => s.participant_id === participant1Id);
    const split2 = splits.find(s => s.participant_id === participant2Id);
    const split3 = splits.find(s => s.participant_id === participant3Id);

    expect(parseFloat(split1!.amount)).toEqual(50.00);
    expect(parseFloat(split1!.percentage!)).toEqual(50);
    expect(parseFloat(split2!.amount)).toEqual(30.00);
    expect(parseFloat(split2!.percentage!)).toEqual(30);
    expect(parseFloat(split3!.amount)).toEqual(20.00);
    expect(parseFloat(split3!.percentage!)).toEqual(20);
  });

  it('should create expense with custom split', async () => {
    const input: CreateExpenseInput = {
      trip_id: tripId,
      paid_by_participant_id: participant1Id,
      description: 'Hotel',
      amount: 150.00,
      split_type: 'CUSTOM',
      splits: [
        { participant_id: participant1Id, amount: 75.00 },
        { participant_id: participant2Id, amount: 50.00 },
        { participant_id: participant3Id, amount: 25.00 }
      ]
    };

    const result = await createExpense(input);

    expect(result.split_type).toEqual('CUSTOM');

    const splits = await db.select()
      .from(expenseSplitsTable)
      .where(eq(expenseSplitsTable.expense_id, result.id))
      .execute();

    expect(splits).toHaveLength(3);
    
    const split1 = splits.find(s => s.participant_id === participant1Id);
    const split2 = splits.find(s => s.participant_id === participant2Id);
    const split3 = splits.find(s => s.participant_id === participant3Id);

    expect(parseFloat(split1!.amount)).toEqual(75.00);
    expect(split1!.percentage).toBeNull();
    expect(parseFloat(split2!.amount)).toEqual(50.00);
    expect(parseFloat(split3!.amount)).toEqual(25.00);
  });

  it('should save expense to database', async () => {
    const input: CreateExpenseInput = {
      trip_id: tripId,
      paid_by_participant_id: participant1Id,
      description: 'Test Expense',
      amount: 50.00,
      split_type: 'EQUAL',
      splits: [
        { participant_id: participant1Id }
      ]
    };

    const result = await createExpense(input);

    const expenses = await db.select()
      .from(expensesTable)
      .where(eq(expensesTable.id, result.id))
      .execute();

    expect(expenses).toHaveLength(1);
    expect(expenses[0].description).toEqual('Test Expense');
    expect(parseFloat(expenses[0].amount)).toEqual(50.00);
    expect(expenses[0].split_type).toEqual('EQUAL');
  });

  it('should throw error for non-existent trip', async () => {
    const input: CreateExpenseInput = {
      trip_id: 999,
      paid_by_participant_id: participant1Id,
      description: 'Test',
      amount: 50.00,
      split_type: 'EQUAL',
      splits: [{ participant_id: participant1Id }]
    };

    expect(createExpense(input)).rejects.toThrow(/trip with id 999 not found/i);
  });

  it('should throw error for non-existent paid_by participant', async () => {
    const input: CreateExpenseInput = {
      trip_id: tripId,
      paid_by_participant_id: 999,
      description: 'Test',
      amount: 50.00,
      split_type: 'EQUAL',
      splits: [{ participant_id: participant1Id }]
    };

    expect(createExpense(input)).rejects.toThrow(/participant with id 999 not found/i);
  });

  it('should throw error when paid_by participant does not belong to trip', async () => {
    // Create another trip and participant
    const otherTripResult = await db.insert(tripsTable)
      .values({
        name: 'Other Trip',
        description: 'Another trip',
        currency: 'EUR'
      })
      .returning()
      .execute();

    const otherParticipantResult = await db.insert(participantsTable)
      .values({
        trip_id: otherTripResult[0].id,
        name: 'Other Participant',
        email: 'other@test.com'
      })
      .returning()
      .execute();

    const input: CreateExpenseInput = {
      trip_id: tripId,
      paid_by_participant_id: otherParticipantResult[0].id,
      description: 'Test',
      amount: 50.00,
      split_type: 'EQUAL',
      splits: [{ participant_id: participant1Id }]
    };

    expect(createExpense(input)).rejects.toThrow(/does not belong to trip/i);
  });

  it('should throw error for non-existent split participant', async () => {
    const input: CreateExpenseInput = {
      trip_id: tripId,
      paid_by_participant_id: participant1Id,
      description: 'Test',
      amount: 50.00,
      split_type: 'EQUAL',
      splits: [{ participant_id: 999 }]
    };

    expect(createExpense(input)).rejects.toThrow(/one or more split participants not found/i);
  });

  it('should throw error when split participant does not belong to trip', async () => {
    // Create another trip and participant
    const otherTripResult = await db.insert(tripsTable)
      .values({
        name: 'Other Trip',
        description: 'Another trip',
        currency: 'EUR'
      })
      .returning()
      .execute();

    const otherParticipantResult = await db.insert(participantsTable)
      .values({
        trip_id: otherTripResult[0].id,
        name: 'Other Participant',
        email: 'other@test.com'
      })
      .returning()
      .execute();

    const input: CreateExpenseInput = {
      trip_id: tripId,
      paid_by_participant_id: participant1Id,
      description: 'Test',
      amount: 50.00,
      split_type: 'EQUAL',
      splits: [{ participant_id: otherParticipantResult[0].id }]
    };

    expect(createExpense(input)).rejects.toThrow(/do not belong to this trip/i);
  });

  it('should throw error when percentage splits do not total 100%', async () => {
    const input: CreateExpenseInput = {
      trip_id: tripId,
      paid_by_participant_id: participant1Id,
      description: 'Test',
      amount: 100.00,
      split_type: 'PERCENTAGE',
      splits: [
        { participant_id: participant1Id, percentage: 50 },
        { participant_id: participant2Id, percentage: 30 }
        // Missing 20% - only totals 80%
      ]
    };

    expect(createExpense(input)).rejects.toThrow(/percentage splits must total 100%/i);
  });

  it('should throw error when custom split amounts do not total expense amount', async () => {
    const input: CreateExpenseInput = {
      trip_id: tripId,
      paid_by_participant_id: participant1Id,
      description: 'Test',
      amount: 100.00,
      split_type: 'CUSTOM',
      splits: [
        { participant_id: participant1Id, amount: 50.00 },
        { participant_id: participant2Id, amount: 30.00 }
        // Missing 20.00 - only totals 80.00
      ]
    };

    expect(createExpense(input)).rejects.toThrow(/custom split amounts must total the expense amount/i);
  });

  it('should handle decimal amounts correctly', async () => {
    const input: CreateExpenseInput = {
      trip_id: tripId,
      paid_by_participant_id: participant1Id,
      description: 'Coffee',
      amount: 12.48, // Changed to a more predictable amount
      split_type: 'EQUAL',
      splits: [
        { participant_id: participant1Id },
        { participant_id: participant2Id }
      ]
    };

    const result = await createExpense(input);

    expect(typeof result.amount).toBe('number');
    expect(result.amount).toEqual(12.48);

    const splits = await db.select()
      .from(expenseSplitsTable)
      .where(eq(expenseSplitsTable.expense_id, result.id))
      .execute();

    expect(splits).toHaveLength(2);
    splits.forEach(split => {
      expect(parseFloat(split.amount)).toEqual(6.24); // 12.48 / 2 = 6.24 exactly
    });
  });
});
