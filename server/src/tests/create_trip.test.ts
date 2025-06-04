
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tripsTable } from '../db/schema';
import { type CreateTripInput } from '../schema';
import { createTrip } from '../handlers/create_trip';
import { eq } from 'drizzle-orm';

// Test inputs
const testInput: CreateTripInput = {
  name: 'Test Trip',
  description: 'A trip for testing',
  currency: 'EUR'
};

const minimalInput: CreateTripInput = {
  name: 'Minimal Trip',
  description: null,
  currency: 'USD'
};

describe('createTrip', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a trip with full details', async () => {
    const result = await createTrip(testInput);

    // Basic field validation
    expect(result.name).toEqual('Test Trip');
    expect(result.description).toEqual('A trip for testing');
    expect(result.currency).toEqual('EUR');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a trip with minimal details', async () => {
    const result = await createTrip(minimalInput);

    expect(result.name).toEqual('Minimal Trip');
    expect(result.description).toBeNull();
    expect(result.currency).toEqual('USD');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save trip to database', async () => {
    const result = await createTrip(testInput);

    // Query database to verify trip was created
    const trips = await db.select()
      .from(tripsTable)
      .where(eq(tripsTable.id, result.id))
      .execute();

    expect(trips).toHaveLength(1);
    expect(trips[0].name).toEqual('Test Trip');
    expect(trips[0].description).toEqual('A trip for testing');
    expect(trips[0].currency).toEqual('EUR');
    expect(trips[0].created_at).toBeInstanceOf(Date);
    expect(trips[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create multiple trips with different currencies', async () => {
    const eurTrip = await createTrip({
      name: 'Europe Trip',
      description: 'European vacation',
      currency: 'EUR'
    });

    const usdTrip = await createTrip({
      name: 'US Trip', 
      description: 'American vacation',
      currency: 'USD'
    });

    expect(eurTrip.currency).toEqual('EUR');
    expect(usdTrip.currency).toEqual('USD');
    expect(eurTrip.id).not.toEqual(usdTrip.id);

    // Verify both trips exist in database
    const allTrips = await db.select()
      .from(tripsTable)
      .execute();

    expect(allTrips).toHaveLength(2);
    expect(allTrips.some(t => t.currency === 'EUR')).toBe(true);
    expect(allTrips.some(t => t.currency === 'USD')).toBe(true);
  });

  it('should set timestamps correctly', async () => {
    const beforeCreate = new Date();
    const result = await createTrip(testInput);
    const afterCreate = new Date();

    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
  });
});
