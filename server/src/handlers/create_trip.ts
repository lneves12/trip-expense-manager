
import { db } from '../db';
import { tripsTable } from '../db/schema';
import { type CreateTripInput, type Trip } from '../schema';

export const createTrip = async (input: CreateTripInput): Promise<Trip> => {
  try {
    // Insert trip record
    const result = await db.insert(tripsTable)
      .values({
        name: input.name,
        description: input.description,
        currency: input.currency
      })
      .returning()
      .execute();

    // Return the created trip
    const trip = result[0];
    return trip;
  } catch (error) {
    console.error('Trip creation failed:', error);
    throw error;
  }
};
