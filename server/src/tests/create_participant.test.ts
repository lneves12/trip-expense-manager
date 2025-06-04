
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { participantsTable, tripsTable } from '../db/schema';
import { type CreateParticipantInput } from '../schema';
import { createParticipant } from '../handlers/create_participant';
import { eq } from 'drizzle-orm';

// Test data
const testTrip = {
  name: 'Test Trip',
  description: 'A trip for testing',
  currency: 'USD' as const
};

const testParticipantInput: CreateParticipantInput = {
  trip_id: 1,
  name: 'John Doe',
  email: 'john@example.com'
};

const testParticipantInputWithoutEmail: CreateParticipantInput = {
  trip_id: 1,
  name: 'Jane Smith',
  email: null
};

describe('createParticipant', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a participant with email', async () => {
    // Create a trip first
    const tripResult = await db.insert(tripsTable)
      .values(testTrip)
      .returning()
      .execute();

    const trip = tripResult[0];
    const input = { ...testParticipantInput, trip_id: trip.id };

    const result = await createParticipant(input);

    // Basic field validation
    expect(result.name).toEqual('John Doe');
    expect(result.email).toEqual('john@example.com');
    expect(result.trip_id).toEqual(trip.id);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a participant without email', async () => {
    // Create a trip first
    const tripResult = await db.insert(tripsTable)
      .values(testTrip)
      .returning()
      .execute();

    const trip = tripResult[0];
    const input = { ...testParticipantInputWithoutEmail, trip_id: trip.id };

    const result = await createParticipant(input);

    // Basic field validation
    expect(result.name).toEqual('Jane Smith');
    expect(result.email).toBeNull();
    expect(result.trip_id).toEqual(trip.id);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save participant to database', async () => {
    // Create a trip first
    const tripResult = await db.insert(tripsTable)
      .values(testTrip)
      .returning()
      .execute();

    const trip = tripResult[0];
    const input = { ...testParticipantInput, trip_id: trip.id };

    const result = await createParticipant(input);

    // Query using proper drizzle syntax
    const participants = await db.select()
      .from(participantsTable)
      .where(eq(participantsTable.id, result.id))
      .execute();

    expect(participants).toHaveLength(1);
    expect(participants[0].name).toEqual('John Doe');
    expect(participants[0].email).toEqual('john@example.com');
    expect(participants[0].trip_id).toEqual(trip.id);
    expect(participants[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error when trip does not exist', async () => {
    const input = { ...testParticipantInput, trip_id: 999 };

    await expect(createParticipant(input)).rejects.toThrow(/Trip with id 999 not found/i);
  });

  it('should validate foreign key constraint', async () => {
    // Create a trip first
    const tripResult = await db.insert(tripsTable)
      .values(testTrip)
      .returning()
      .execute();

    const trip = tripResult[0];
    const input = { ...testParticipantInput, trip_id: trip.id };

    const result = await createParticipant(input);

    // Verify the participant is associated with the correct trip
    const participants = await db.select()
      .from(participantsTable)
      .where(eq(participantsTable.trip_id, trip.id))
      .execute();

    expect(participants).toHaveLength(1);
    expect(participants[0].id).toEqual(result.id);
    expect(participants[0].trip_id).toEqual(trip.id);
  });
});
