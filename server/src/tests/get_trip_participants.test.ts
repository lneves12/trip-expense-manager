
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tripsTable, participantsTable } from '../db/schema';
import { getTripParticipants } from '../handlers/get_trip_participants';

describe('getTripParticipants', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return participants for a trip', async () => {
    // Create a trip first
    const tripResult = await db.insert(tripsTable)
      .values({
        name: 'Test Trip',
        description: 'A trip for testing',
        currency: 'EUR'
      })
      .returning()
      .execute();
    
    const trip = tripResult[0];

    // Create participants for the trip
    await db.insert(participantsTable)
      .values([
        {
          trip_id: trip.id,
          name: 'Alice',
          email: 'alice@example.com'
        },
        {
          trip_id: trip.id,
          name: 'Bob',
          email: null
        }
      ])
      .execute();

    const participants = await getTripParticipants(trip.id);

    expect(participants).toHaveLength(2);
    
    // Check first participant
    const alice = participants.find(p => p.name === 'Alice');
    expect(alice).toBeDefined();
    expect(alice?.trip_id).toEqual(trip.id);
    expect(alice?.email).toEqual('alice@example.com');
    expect(alice?.created_at).toBeInstanceOf(Date);
    expect(alice?.id).toBeDefined();

    // Check second participant
    const bob = participants.find(p => p.name === 'Bob');
    expect(bob).toBeDefined();
    expect(bob?.trip_id).toEqual(trip.id);
    expect(bob?.email).toBeNull();
    expect(bob?.created_at).toBeInstanceOf(Date);
    expect(bob?.id).toBeDefined();
  });

  it('should return empty array for trip with no participants', async () => {
    // Create a trip without participants
    const tripResult = await db.insert(tripsTable)
      .values({
        name: 'Empty Trip',
        description: 'A trip with no participants',
        currency: 'USD'
      })
      .returning()
      .execute();
    
    const trip = tripResult[0];

    const participants = await getTripParticipants(trip.id);

    expect(participants).toHaveLength(0);
    expect(participants).toEqual([]);
  });

  it('should return empty array for non-existent trip', async () => {
    const participants = await getTripParticipants(999);

    expect(participants).toHaveLength(0);
    expect(participants).toEqual([]);
  });

  it('should only return participants for the specified trip', async () => {
    // Create two trips
    const trip1Result = await db.insert(tripsTable)
      .values({
        name: 'Trip 1',
        description: 'First trip',
        currency: 'EUR'
      })
      .returning()
      .execute();
    
    const trip2Result = await db.insert(tripsTable)
      .values({
        name: 'Trip 2',
        description: 'Second trip',
        currency: 'USD'
      })
      .returning()
      .execute();

    const trip1 = trip1Result[0];
    const trip2 = trip2Result[0];

    // Create participants for both trips
    await db.insert(participantsTable)
      .values([
        {
          trip_id: trip1.id,
          name: 'Alice',
          email: 'alice@example.com'
        },
        {
          trip_id: trip1.id,
          name: 'Bob',
          email: 'bob@example.com'
        },
        {
          trip_id: trip2.id,
          name: 'Charlie',
          email: 'charlie@example.com'
        }
      ])
      .execute();

    // Get participants for trip 1
    const trip1Participants = await getTripParticipants(trip1.id);
    expect(trip1Participants).toHaveLength(2);
    expect(trip1Participants.every(p => p.trip_id === trip1.id)).toBe(true);
    
    const trip1Names = trip1Participants.map(p => p.name).sort();
    expect(trip1Names).toEqual(['Alice', 'Bob']);

    // Get participants for trip 2
    const trip2Participants = await getTripParticipants(trip2.id);
    expect(trip2Participants).toHaveLength(1);
    expect(trip2Participants[0].trip_id).toEqual(trip2.id);
    expect(trip2Participants[0].name).toEqual('Charlie');
  });

  it('should handle participants with various email formats', async () => {
    // Create a trip
    const tripResult = await db.insert(tripsTable)
      .values({
        name: 'Email Test Trip',
        description: 'Testing different email formats',
        currency: 'EUR'
      })
      .returning()
      .execute();
    
    const trip = tripResult[0];

    // Create participants with different email scenarios
    await db.insert(participantsTable)
      .values([
        {
          trip_id: trip.id,
          name: 'With Email',
          email: 'test@example.com'
        },
        {
          trip_id: trip.id,
          name: 'No Email',
          email: null
        }
      ])
      .execute();

    const participants = await getTripParticipants(trip.id);

    expect(participants).toHaveLength(2);
    
    const withEmail = participants.find(p => p.name === 'With Email');
    expect(withEmail?.email).toEqual('test@example.com');
    
    const noEmail = participants.find(p => p.name === 'No Email');
    expect(noEmail?.email).toBeNull();
  });
});
