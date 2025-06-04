
import { db } from '../db';
import { participantsTable, tripsTable } from '../db/schema';
import { type CreateParticipantInput, type Participant } from '../schema';
import { eq } from 'drizzle-orm';

export const createParticipant = async (input: CreateParticipantInput): Promise<Participant> => {
  try {
    // Verify that the trip exists before creating participant
    const trip = await db.select()
      .from(tripsTable)
      .where(eq(tripsTable.id, input.trip_id))
      .execute();

    if (trip.length === 0) {
      throw new Error(`Trip with id ${input.trip_id} not found`);
    }

    // Insert participant record
    const result = await db.insert(participantsTable)
      .values({
        trip_id: input.trip_id,
        name: input.name,
        email: input.email
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Participant creation failed:', error);
    throw error;
  }
};
