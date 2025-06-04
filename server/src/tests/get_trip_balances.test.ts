
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tripsTable, participantsTable, expensesTable, expenseSplitsTable } from '../db/schema';
import { getTripBalances } from '../handlers/get_trip_balances';

describe('getTripBalances', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty balances and settlements for trip with no expenses', async () => {
    // Create a trip
    const [trip] = await db.insert(tripsTable)
      .values({
        name: 'Test Trip',
        description: 'A test trip',
        currency: 'USD'
      })
      .returning()
      .execute();

    // Create participants
    const participants = await db.insert(participantsTable)
      .values([
        { trip_id: trip.id, name: 'John', email: 'john@example.com' },
        { trip_id: trip.id, name: 'Jane', email: 'jane@example.com' }
      ])
      .returning()
      .execute();

    const result = await getTripBalances(trip.id);

    expect(result.trip_id).toEqual(trip.id);
    expect(result.balances).toHaveLength(2);
    expect(result.balances[0].balance).toEqual(0);
    expect(result.balances[1].balance).toEqual(0);
    expect(result.settlements).toHaveLength(0);
  });

  it('should calculate correct balances for simple equal split', async () => {
    // Create a trip
    const [trip] = await db.insert(tripsTable)
      .values({
        name: 'Test Trip',
        description: 'A test trip',
        currency: 'USD'
      })
      .returning()
      .execute();

    // Create participants
    const participants = await db.insert(participantsTable)
      .values([
        { trip_id: trip.id, name: 'John', email: 'john@example.com' },
        { trip_id: trip.id, name: 'Jane', email: 'jane@example.com' }
      ])
      .returning()
      .execute();

    // Create an expense paid by John
    const [expense] = await db.insert(expensesTable)
      .values({
        trip_id: trip.id,
        paid_by_participant_id: participants[0].id,
        description: 'Dinner',
        amount: '100.00',
        split_type: 'EQUAL'
      })
      .returning()
      .execute();

    // Create equal splits
    await db.insert(expenseSplitsTable)
      .values([
        {
          expense_id: expense.id,
          participant_id: participants[0].id,
          amount: '50.00',
          percentage: null
        },
        {
          expense_id: expense.id,
          participant_id: participants[1].id,
          amount: '50.00',
          percentage: null
        }
      ])
      .execute();

    const result = await getTripBalances(trip.id);

    expect(result.trip_id).toEqual(trip.id);
    expect(result.balances).toHaveLength(2);

    // John paid 100, owes 50, so balance = 100 - 50 = 50
    const johnBalance = result.balances.find(b => b.participant_name === 'John');
    expect(johnBalance?.balance).toEqual(50);

    // Jane paid 0, owes 50, so balance = 0 - 50 = -50
    const janeBalance = result.balances.find(b => b.participant_name === 'Jane');
    expect(janeBalance?.balance).toEqual(-50);

    // Should have one settlement: Jane pays John 50
    expect(result.settlements).toHaveLength(1);
    expect(result.settlements[0].from_participant).toEqual('Jane');
    expect(result.settlements[0].to_participant).toEqual('John');
    expect(result.settlements[0].amount).toEqual(50);
  });

  it('should calculate correct balances for multiple expenses', async () => {
    // Create a trip
    const [trip] = await db.insert(tripsTable)
      .values({
        name: 'Test Trip',
        description: 'A test trip',
        currency: 'USD'
      })
      .returning()
      .execute();

    // Create participants
    const participants = await db.insert(participantsTable)
      .values([
        { trip_id: trip.id, name: 'John', email: 'john@example.com' },
        { trip_id: trip.id, name: 'Jane', email: 'jane@example.com' },
        { trip_id: trip.id, name: 'Bob', email: 'bob@example.com' }
      ])
      .returning()
      .execute();

    // John pays 120 for dinner, split equally among all 3
    const [expense1] = await db.insert(expensesTable)
      .values({
        trip_id: trip.id,
        paid_by_participant_id: participants[0].id,
        description: 'Dinner',
        amount: '120.00',
        split_type: 'EQUAL'
      })
      .returning()
      .execute();

    await db.insert(expenseSplitsTable)
      .values([
        { expense_id: expense1.id, participant_id: participants[0].id, amount: '40.00', percentage: null },
        { expense_id: expense1.id, participant_id: participants[1].id, amount: '40.00', percentage: null },
        { expense_id: expense1.id, participant_id: participants[2].id, amount: '40.00', percentage: null }
      ])
      .execute();

    // Jane pays 60 for lunch, split equally between John and Jane
    const [expense2] = await db.insert(expensesTable)
      .values({
        trip_id: trip.id,
        paid_by_participant_id: participants[1].id,
        description: 'Lunch',
        amount: '60.00',
        split_type: 'EQUAL'
      })
      .returning()
      .execute();

    await db.insert(expenseSplitsTable)
      .values([
        { expense_id: expense2.id, participant_id: participants[0].id, amount: '30.00', percentage: null },
        { expense_id: expense2.id, participant_id: participants[1].id, amount: '30.00', percentage: null }
      ])
      .execute();

    const result = await getTripBalances(trip.id);

    expect(result.trip_id).toEqual(trip.id);
    expect(result.balances).toHaveLength(3);

    // John: paid 120, owes (40 + 30) = 70, balance = 120 - 70 = 50
    const johnBalance = result.balances.find(b => b.participant_name === 'John');
    expect(johnBalance?.balance).toEqual(50);

    // Jane: paid 60, owes (40 + 30) = 70, balance = 60 - 70 = -10
    const janeBalance = result.balances.find(b => b.participant_name === 'Jane');
    expect(janeBalance?.balance).toEqual(-10);

    // Bob: paid 0, owes 40, balance = 0 - 40 = -40
    const bobBalance = result.balances.find(b => b.participant_name === 'Bob');
    expect(bobBalance?.balance).toEqual(-40);

    // Settlements should minimize transactions
    expect(result.settlements.length).toBeGreaterThan(0);
    
    // Verify total settlement amounts balance out
    const totalFromSettlements = result.settlements.reduce((sum, s) => sum + s.amount, 0);
    const totalPositiveBalance = result.balances
      .filter(b => b.balance > 0)
      .reduce((sum, b) => sum + b.balance, 0);
    
    expect(Math.abs(totalFromSettlements - totalPositiveBalance)).toBeLessThan(0.01);
  });

  it('should handle custom split amounts correctly', async () => {
    // Create a trip
    const [trip] = await db.insert(tripsTable)
      .values({
        name: 'Test Trip',
        description: 'A test trip',
        currency: 'USD'
      })
      .returning()
      .execute();

    // Create participants
    const participants = await db.insert(participantsTable)
      .values([
        { trip_id: trip.id, name: 'John', email: 'john@example.com' },
        { trip_id: trip.id, name: 'Jane', email: 'jane@example.com' }
      ])
      .returning()
      .execute();

    // Create expense with custom split (John owes 70, Jane owes 30)
    const [expense] = await db.insert(expensesTable)
      .values({
        trip_id: trip.id,
        paid_by_participant_id: participants[0].id,
        description: 'Custom Split Expense',
        amount: '100.00',
        split_type: 'CUSTOM'
      })
      .returning()
      .execute();

    await db.insert(expenseSplitsTable)
      .values([
        { expense_id: expense.id, participant_id: participants[0].id, amount: '70.00', percentage: null },
        { expense_id: expense.id, participant_id: participants[1].id, amount: '30.00', percentage: null }
      ])
      .execute();

    const result = await getTripBalances(trip.id);

    // John: paid 100, owes 70, balance = 100 - 70 = 30
    const johnBalance = result.balances.find(b => b.participant_name === 'John');
    expect(johnBalance?.balance).toEqual(30);

    // Jane: paid 0, owes 30, balance = 0 - 30 = -30
    const janeBalance = result.balances.find(b => b.participant_name === 'Jane');
    expect(janeBalance?.balance).toEqual(-30);

    // Should have one settlement: Jane pays John 30
    expect(result.settlements).toHaveLength(1);
    expect(result.settlements[0].from_participant).toEqual('Jane');
    expect(result.settlements[0].to_participant).toEqual('John');
    expect(result.settlements[0].amount).toEqual(30);
  });

  it('should handle percentage splits correctly', async () => {
    // Create a trip
    const [trip] = await db.insert(tripsTable)
      .values({
        name: 'Test Trip',
        description: 'A test trip',
        currency: 'USD'
      })
      .returning()
      .execute();

    // Create participants
    const participants = await db.insert(participantsTable)
      .values([
        { trip_id: trip.id, name: 'John', email: 'john@example.com' },
        { trip_id: trip.id, name: 'Jane', email: 'jane@example.com' }
      ])
      .returning()
      .execute();

    // Create expense with percentage split (John 60%, Jane 40%)
    const [expense] = await db.insert(expensesTable)
      .values({
        trip_id: trip.id,
        paid_by_participant_id: participants[1].id, // Jane pays
        description: 'Percentage Split Expense',
        amount: '100.00',
        split_type: 'PERCENTAGE'
      })
      .returning()
      .execute();

    await db.insert(expenseSplitsTable)
      .values([
        { expense_id: expense.id, participant_id: participants[0].id, amount: '60.00', percentage: '60.00' },
        { expense_id: expense.id, participant_id: participants[1].id, amount: '40.00', percentage: '40.00' }
      ])
      .execute();

    const result = await getTripBalances(trip.id);

    // John: paid 0, owes 60, balance = 0 - 60 = -60
    const johnBalance = result.balances.find(b => b.participant_name === 'John');
    expect(johnBalance?.balance).toEqual(-60);

    // Jane: paid 100, owes 40, balance = 100 - 40 = 60
    const janeBalance = result.balances.find(b => b.participant_name === 'Jane');
    expect(janeBalance?.balance).toEqual(60);

    // Should have one settlement: John pays Jane 60
    expect(result.settlements).toHaveLength(1);
    expect(result.settlements[0].from_participant).toEqual('John');
    expect(result.settlements[0].to_participant).toEqual('Jane');
    expect(result.settlements[0].amount).toEqual(60);
  });

  it('should return empty arrays for non-existent trip', async () => {
    const result = await getTripBalances(999);

    expect(result.trip_id).toEqual(999);
    expect(result.balances).toHaveLength(0);
    expect(result.settlements).toHaveLength(0);
  });

  it('should optimize settlements to minimize transactions', async () => {
    // Create a trip
    const [trip] = await db.insert(tripsTable)
      .values({
        name: 'Test Trip',
        description: 'A test trip',
        currency: 'USD'
      })
      .returning()
      .execute();

    // Create participants
    const participants = await db.insert(participantsTable)
      .values([
        { trip_id: trip.id, name: 'Alice', email: 'alice@example.com' },
        { trip_id: trip.id, name: 'Bob', email: 'bob@example.com' },
        { trip_id: trip.id, name: 'Charlie', email: 'charlie@example.com' },
        { trip_id: trip.id, name: 'Dave', email: 'dave@example.com' }
      ])
      .returning()
      .execute();

    // Create expenses to create complex settlement scenario
    // Alice pays 120, split equally among all 4 (each owes 30)
    const [expense1] = await db.insert(expensesTable)
      .values({
        trip_id: trip.id,
        paid_by_participant_id: participants[0].id, // Alice
        description: 'Expense 1',
        amount: '120.00',
        split_type: 'EQUAL'
      })
      .returning()
      .execute();

    await db.insert(expenseSplitsTable)
      .values([
        { expense_id: expense1.id, participant_id: participants[0].id, amount: '30.00', percentage: null },
        { expense_id: expense1.id, participant_id: participants[1].id, amount: '30.00', percentage: null },
        { expense_id: expense1.id, participant_id: participants[2].id, amount: '30.00', percentage: null },
        { expense_id: expense1.id, participant_id: participants[3].id, amount: '30.00', percentage: null }
      ])
      .execute();

    // Bob pays 80, split equally among all 4 (each owes 20)
    const [expense2] = await db.insert(expensesTable)
      .values({
        trip_id: trip.id,
        paid_by_participant_id: participants[1].id, // Bob
        description: 'Expense 2',
        amount: '80.00',
        split_type: 'EQUAL'
      })
      .returning()
      .execute();

    await db.insert(expenseSplitsTable)
      .values([
        { expense_id: expense2.id, participant_id: participants[0].id, amount: '20.00', percentage: null },
        { expense_id: expense2.id, participant_id: participants[1].id, amount: '20.00', percentage: null },
        { expense_id: expense2.id, participant_id: participants[2].id, amount: '20.00', percentage: null },
        { expense_id: expense2.id, participant_id: participants[3].id, amount: '20.00', percentage: null }
      ])
      .execute();

    const result = await getTripBalances(trip.id);

    // Alice: paid 120, owes (30 + 20) = 50, balance = 120 - 50 = 70
    const aliceBalance = result.balances.find(b => b.participant_name === 'Alice');
    expect(aliceBalance?.balance).toEqual(70);

    // Bob: paid 80, owes (30 + 20) = 50, balance = 80 - 50 = 30
    const bobBalance = result.balances.find(b => b.participant_name === 'Bob');
    expect(bobBalance?.balance).toEqual(30);

    // Charlie: paid 0, owes (30 + 20) = 50, balance = 0 - 50 = -50
    const charlieBalance = result.balances.find(b => b.participant_name === 'Charlie');
    expect(charlieBalance?.balance).toEqual(-50);

    // Dave: paid 0, owes (30 + 20) = 50, balance = 0 - 50 = -50
    const daveBalance = result.balances.find(b => b.participant_name === 'Dave');
    expect(daveBalance?.balance).toEqual(-50);

    // Settlements should be optimized (minimum number of transactions)
    expect(result.settlements.length).toBeLessThanOrEqual(3); // Maximum n-1 transactions for n participants

    // Verify settlement amounts add up correctly
    const totalSettlements = result.settlements.reduce((sum, s) => sum + s.amount, 0);
    expect(totalSettlements).toEqual(100); // Total positive balance (70 + 30)
  });
});
