import { db } from '$db';
import { eq } from 'drizzle-orm';
import type { User } from '../../types/User.type';
import { Users } from './schema/User.schema';

export async function upsertUser({
	name,
	email,
	picture,
	googleId,
	idToken,
	accessToken,
	refreshToken
}: User) {
	await db
		.insert(Users)
		.values({
			name,
			accessToken,
			email,
			googleId,
			idToken,
			picture,
			refreshToken
		})
		.onConflictDoUpdate({
			target: [Users.googleId],
			set: {
				name,
				accessToken,
				email,
				idToken,
				picture,
				refreshToken
			}
		});
}

export async function getUserById(id: string) {
	return (await db.selectDistinct().from(Users).where(eq(Users.googleId, id)).limit(1))[0] || null;
}
