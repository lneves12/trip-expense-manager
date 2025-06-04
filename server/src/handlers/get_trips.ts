
import { db } from '../db';
import { tripsTable } from '../db/schema';
import { type Trip } from '../schema';

export const getTrips = async (): Promise<Trip[]> => {
  try {
    const results = await db.select()
      .from(tripsTable)
      .execute();

    return results.map(trip => ({
      ...trip,
      // No numeric conversions needed - all fields are already proper types
    }));
  } catch (error) {
    console.error('Failed to get trips:', error);
    throw error;
  }
};
