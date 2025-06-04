
import { db } from '../db';
import { tripsTable } from '../db/schema';
import { type UpdateTripInput, type Trip } from '../schema';
import { eq } from 'drizzle-orm';

export const updateTrip = async (input: UpdateTripInput): Promise<Trip> => {
  try {
    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }

    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    if (input.currency !== undefined) {
      updateData.currency = input.currency;
    }

    // Update trip record
    const result = await db.update(tripsTable)
      .set(updateData)
      .where(eq(tripsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Trip with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Trip update failed:', error);
    throw error;
  }
};
