
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tripsTable } from '../db/schema';
import { getTrip } from '../handlers/get_trip';

// Test trip data
const testTripData = {
  name: 'Summer Vacation',
  description: 'Trip to the beach',
  currency: 'EUR' as const
};

const testTripDataMinimal = {
  name: 'Weekend Trip',
  description: null,
  currency: 'USD' as const
};

describe('getTrip', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should retrieve a trip by id', async () => {
    // Create test trip
    const [createdTrip] = await db.insert(tripsTable)
      .values(testTripData)
      .returning()
      .execute();

    const result = await getTrip(createdTrip.id);

    // Verify all fields
    expect(result.id).toEqual(createdTrip.id);
    expect(result.name).toEqual('Summer Vacation');
    expect(result.description).toEqual('Trip to the beach');
    expect(result.currency).toEqual('EUR');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should retrieve a trip with null description', async () => {
    // Create minimal test trip
    const [createdTrip] = await db.insert(tripsTable)
      .values(testTripDataMinimal)
      .returning()
      .execute();

    const result = await getTrip(createdTrip.id);

    expect(result.id).toEqual(createdTrip.id);
    expect(result.name).toEqual('Weekend Trip');
    expect(result.description).toBeNull();
    expect(result.currency).toEqual('USD');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when trip not found', async () => {
    const nonExistentId = 999;

    await expect(getTrip(nonExistentId)).rejects.toThrow(/Trip with id 999 not found/i);
  });

  it('should handle negative id gracefully', async () => {
    await expect(getTrip(-1)).rejects.toThrow(/Trip with id -1 not found/i);
  });

  it('should handle zero id gracefully', async () => {
    await expect(getTrip(0)).rejects.toThrow(/Trip with id 0 not found/i);
  });

  it('should return correct currency enum values', async () => {
    // Test EUR currency
    const [eurTrip] = await db.insert(tripsTable)
      .values({ ...testTripData, currency: 'EUR' })
      .returning()
      .execute();

    const eurResult = await getTrip(eurTrip.id);
    expect(eurResult.currency).toEqual('EUR');

    // Test USD currency
    const [usdTrip] = await db.insert(tripsTable)
      .values({ ...testTripData, currency: 'USD' })
      .returning()
      .execute();

    const usdResult = await getTrip(usdTrip.id);
    expect(usdResult.currency).toEqual('USD');
  });

  it('should return dates as Date objects', async () => {
    const [createdTrip] = await db.insert(tripsTable)
      .values(testTripData)
      .returning()
      .execute();

    const result = await getTrip(createdTrip.id);

    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(typeof result.created_at.getTime()).toBe('number');
    expect(typeof result.updated_at.getTime()).toBe('number');
  });
});
