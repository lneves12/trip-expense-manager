
import { db } from '../db';
import { participantsTable } from '../db/schema';
import { type Participant } from '../schema';
import { eq } from 'drizzle-orm';

export const getTripParticipants = async (tripId: number): Promise<Participant[]> => {
  try {
    const results = await db.select()
      .from(participantsTable)
      .where(eq(participantsTable.trip_id, tripId))
      .execute();

    return results;
  } catch (error) {
    console.error('Get trip participants failed:', error);
    throw error;
  }
};
