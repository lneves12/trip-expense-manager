
import { db } from '../db';
import { tripsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteTrip = async (id: number): Promise<{ success: boolean }> => {
  try {
    const result = await db.delete(tripsTable)
      .where(eq(tripsTable.id, id))
      .execute();

    // Check if any rows were affected (trip existed and was deleted)
    return { success: (result.rowCount ?? 0) > 0 };
  } catch (error) {
    console.error('Trip deletion failed:', error);
    throw error;
  }
};
