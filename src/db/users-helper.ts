import { db } from './index.ts';
import { users } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, email: string) {
  try {
    // Check if any users exist in the database yet
    const existingUsers = await db.select().from(users).limit(1);
    const assignRole = existingUsers.length === 0 ? 'admin' : 'staff';

    const result = await db.insert(users)
      .values({
        uid,
        email,
        role: assignRole,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error("Error in getOrCreateUser:", error);
    // Fallback search to guarantee retrieval
    try {
      const fallback = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
      if (fallback.length > 0) {
        return fallback[0];
      }
    } catch (innerErr) {
      console.error("Fallback query in getOrCreateUser failed:", innerErr);
    }
    throw new Error("Unable to register or fetch user profile.", { cause: error });
  }
}
