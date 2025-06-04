
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tripsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { deleteTrip } from '../handlers/delete_trip';

describe('deleteTrip', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing trip', async () => {
    // Create a test trip first
    const insertResult = await db.insert(tripsTable)
      .values({
        name: 'Test Trip',
        description: 'A trip for testing deletion',
        currency: 'EUR'
      })
      .returning()
      .execute();

    const tripId = insertResult[0].id;

    // Delete the trip
    const result = await deleteTrip(tripId);

    // Verify deletion was successful
    expect(result.success).toBe(true);

    // Verify trip no longer exists in database
    const trips = await db.select()
      .from(tripsTable)
      .where(eq(tripsTable.id, tripId))
      .execute();

    expect(trips).toHaveLength(0);
  });

  it('should return false for non-existent trip', async () => {
    // Try to delete a trip that doesn't exist
    const result = await deleteTrip(999);

    // Verify deletion was not successful
    expect(result.success).toBe(false);
  });

  it('should handle multiple trips correctly', async () => {
    // Create multiple test trips
    const insertResult = await db.insert(tripsTable)
      .values([
        {
          name: 'Trip 1',
          description: 'First trip',
          currency: 'EUR'
        },
        {
          name: 'Trip 2',
          description: 'Second trip',
          currency: 'USD'
        }
      ])
      .returning()
      .execute();

    const trip1Id = insertResult[0].id;
    const trip2Id = insertResult[1].id;

    // Delete only the first trip
    const result = await deleteTrip(trip1Id);

    // Verify deletion was successful
    expect(result.success).toBe(true);

    // Verify only the first trip was deleted
    const remainingTrips = await db.select()
      .from(tripsTable)
      .execute();

    expect(remainingTrips).toHaveLength(1);
    expect(remainingTrips[0].id).toBe(trip2Id);
    expect(remainingTrips[0].name).toBe('Trip 2');
  });
});
