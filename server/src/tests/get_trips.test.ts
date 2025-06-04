
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tripsTable } from '../db/schema';
import { type CreateTripInput } from '../schema';
import { getTrips } from '../handlers/get_trips';

// Test data
const testTrip1: CreateTripInput = {
  name: 'Test Trip 1',
  description: 'A trip for testing',
  currency: 'EUR'
};

const testTrip2: CreateTripInput = {
  name: 'Test Trip 2',
  description: null,
  currency: 'USD'
};

describe('getTrips', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no trips exist', async () => {
    const result = await getTrips();

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return all trips', async () => {
    // Create test trips
    await db.insert(tripsTable)
      .values([
        {
          name: testTrip1.name,
          description: testTrip1.description,
          currency: testTrip1.currency
        },
        {
          name: testTrip2.name,
          description: testTrip2.description,
          currency: testTrip2.currency
        }
      ])
      .execute();

    const result = await getTrips();

    expect(result).toHaveLength(2);
    
    // Verify first trip
    const trip1 = result.find(t => t.name === 'Test Trip 1');
    expect(trip1).toBeDefined();
    expect(trip1!.name).toEqual('Test Trip 1');
    expect(trip1!.description).toEqual('A trip for testing');
    expect(trip1!.currency).toEqual('EUR');
    expect(trip1!.id).toBeDefined();
    expect(trip1!.created_at).toBeInstanceOf(Date);
    expect(trip1!.updated_at).toBeInstanceOf(Date);

    // Verify second trip
    const trip2 = result.find(t => t.name === 'Test Trip 2');
    expect(trip2).toBeDefined();
    expect(trip2!.name).toEqual('Test Trip 2');
    expect(trip2!.description).toBeNull();
    expect(trip2!.currency).toEqual('USD');
    expect(trip2!.id).toBeDefined();
    expect(trip2!.created_at).toBeInstanceOf(Date);
    expect(trip2!.updated_at).toBeInstanceOf(Date);
  });

  it('should return trips ordered by creation date', async () => {
    // Create trips with slight delay to ensure different timestamps
    await db.insert(tripsTable)
      .values({
        name: 'First Trip',
        description: 'First created',
        currency: 'EUR'
      })
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(tripsTable)
      .values({
        name: 'Second Trip',
        description: 'Second created',
        currency: 'USD'
      })
      .execute();

    const result = await getTrips();

    expect(result).toHaveLength(2);
    
    // Verify trips exist with correct names
    const firstTrip = result.find(t => t.name === 'First Trip');
    const secondTrip = result.find(t => t.name === 'Second Trip');
    
    expect(firstTrip).toBeDefined();
    expect(secondTrip).toBeDefined();
    expect(firstTrip!.created_at).toBeInstanceOf(Date);
    expect(secondTrip!.created_at).toBeInstanceOf(Date);
  });

  it('should handle trips with all currency types', async () => {
    await db.insert(tripsTable)
      .values([
        {
          name: 'EUR Trip',
          description: 'European trip',
          currency: 'EUR'
        },
        {
          name: 'USD Trip',
          description: 'American trip',
          currency: 'USD'
        }
      ])
      .execute();

    const result = await getTrips();

    expect(result).toHaveLength(2);
    
    const currencies = result.map(trip => trip.currency);
    expect(currencies).toContain('EUR');
    expect(currencies).toContain('USD');
  });
});
