
import { db } from '../db';
import { tripsTable } from '../db/schema';
import { type Trip } from '../schema';
import { eq } from 'drizzle-orm';

export const getTrip = async (id: number): Promise<Trip> => {
  try {
    const result = await db.select()
      .from(tripsTable)
      .where(eq(tripsTable.id, id))
      .execute();

    if (result.length === 0) {
      throw new Error(`Trip with id ${id} not found`);
    }

    const trip = result[0];
    return {
      ...trip,
      // No numeric conversions needed - no numeric columns in trips table
    };
  } catch (error) {
    console.error('Trip retrieval failed:', error);
    throw error;
  }
};
