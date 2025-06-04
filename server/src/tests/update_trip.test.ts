
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tripsTable } from '../db/schema';
import { type CreateTripInput, type UpdateTripInput } from '../schema';
import { updateTrip } from '../handlers/update_trip';
import { eq } from 'drizzle-orm';

// Test data
const testTripInput: CreateTripInput = {
  name: 'Original Trip',
  description: 'Original description',
  currency: 'EUR'
};

describe('updateTrip', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update trip name', async () => {
    // Create initial trip
    const initialTrip = await db.insert(tripsTable)
      .values(testTripInput)
      .returning()
      .execute();

    const tripId = initialTrip[0].id;

    const updateInput: UpdateTripInput = {
      id: tripId,
      name: 'Updated Trip Name'
    };

    const result = await updateTrip(updateInput);

    expect(result.id).toEqual(tripId);
    expect(result.name).toEqual('Updated Trip Name');
    expect(result.description).toEqual('Original description');
    expect(result.currency).toEqual('EUR');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(result.created_at.getTime());
  });

  it('should update trip description', async () => {
    // Create initial trip
    const initialTrip = await db.insert(tripsTable)
      .values(testTripInput)
      .returning()
      .execute();

    const tripId = initialTrip[0].id;

    const updateInput: UpdateTripInput = {
      id: tripId,
      description: 'Updated description'
    };

    const result = await updateTrip(updateInput);

    expect(result.id).toEqual(tripId);
    expect(result.name).toEqual('Original Trip');
    expect(result.description).toEqual('Updated description');
    expect(result.currency).toEqual('EUR');
  });

  it('should update trip currency', async () => {
    // Create initial trip
    const initialTrip = await db.insert(tripsTable)
      .values(testTripInput)
      .returning()
      .execute();

    const tripId = initialTrip[0].id;

    const updateInput: UpdateTripInput = {
      id: tripId,
      currency: 'USD'
    };

    const result = await updateTrip(updateInput);

    expect(result.id).toEqual(tripId);
    expect(result.name).toEqual('Original Trip');
    expect(result.description).toEqual('Original description');
    expect(result.currency).toEqual('USD');
  });

  it('should update multiple fields at once', async () => {
    // Create initial trip
    const initialTrip = await db.insert(tripsTable)
      .values(testTripInput)
      .returning()
      .execute();

    const tripId = initialTrip[0].id;

    const updateInput: UpdateTripInput = {
      id: tripId,
      name: 'Completely New Name',
      description: 'Completely new description',
      currency: 'USD'
    };

    const result = await updateTrip(updateInput);

    expect(result.id).toEqual(tripId);
    expect(result.name).toEqual('Completely New Name');
    expect(result.description).toEqual('Completely new description');
    expect(result.currency).toEqual('USD');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should set description to null', async () => {
    // Create initial trip
    const initialTrip = await db.insert(tripsTable)
      .values(testTripInput)
      .returning()
      .execute();

    const tripId = initialTrip[0].id;

    const updateInput: UpdateTripInput = {
      id: tripId,
      description: null
    };

    const result = await updateTrip(updateInput);

    expect(result.id).toEqual(tripId);
    expect(result.name).toEqual('Original Trip');
    expect(result.description).toBeNull();
    expect(result.currency).toEqual('EUR');
  });

  it('should save changes to database', async () => {
    // Create initial trip
    const initialTrip = await db.insert(tripsTable)
      .values(testTripInput)
      .returning()
      .execute();

    const tripId = initialTrip[0].id;

    const updateInput: UpdateTripInput = {
      id: tripId,
      name: 'Database Test Trip'
    };

    await updateTrip(updateInput);

    // Verify changes were persisted
    const trips = await db.select()
      .from(tripsTable)
      .where(eq(tripsTable.id, tripId))
      .execute();

    expect(trips).toHaveLength(1);
    expect(trips[0].name).toEqual('Database Test Trip');
    expect(trips[0].description).toEqual('Original description');
    expect(trips[0].currency).toEqual('EUR');
  });

  it('should update updated_at timestamp', async () => {
    // Create initial trip
    const initialTrip = await db.insert(tripsTable)
      .values(testTripInput)
      .returning()
      .execute();

    const tripId = initialTrip[0].id;
    const originalUpdatedAt = initialTrip[0].updated_at;

    // Small delay to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateTripInput = {
      id: tripId,
      name: 'Timestamp Test'
    };

    const result = await updateTrip(updateInput);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should throw error for non-existent trip', async () => {
    const updateInput: UpdateTripInput = {
      id: 99999,
      name: 'Non-existent Trip'
    };

    await expect(updateTrip(updateInput)).rejects.toThrow(/trip with id 99999 not found/i);
  });

  it('should handle partial updates correctly', async () => {
    // Create initial trip
    const initialTrip = await db.insert(tripsTable)
      .values(testTripInput)
      .returning()
      .execute();

    const tripId = initialTrip[0].id;

    // Update only name (other fields should remain unchanged)
    const updateInput: UpdateTripInput = {
      id: tripId,
      name: 'Only Name Changed'
    };

    const result = await updateTrip(updateInput);

    expect(result.name).toEqual('Only Name Changed');
    expect(result.description).toEqual('Original description');
    expect(result.currency).toEqual('EUR');
    expect(result.created_at).toEqual(initialTrip[0].created_at);
    expect(result.updated_at.getTime()).toBeGreaterThan(initialTrip[0].updated_at.getTime());
  });
});
