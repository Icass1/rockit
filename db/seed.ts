import { db, User } from 'astro:db';
import { hash } from "@node-rs/argon2";


async function getHash(password: string) {
	return await hash(password, {
		// recommended minimum parameters
		memoryCost: 19456,
		timeCost: 2,
		outputLen: 32,
		parallelism: 1
	});

}
// https://astro.build/db/seed
export default async function seed() {





	await db.insert(User).values([
		{ id: "nulzh3jbu0me0m61", username: "testuser", passwordHash: await getHash("testpassword"), createdAt: new Date("2024-11-11 16:18:42") },
	]);

}
