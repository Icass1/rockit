import { db, User, List } from 'astro:db';
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

	await db.insert(List).values([
		{
			id: "3kv1eLaL0W9Uci9mZGryzS",
			type: "album",
			images: JSON.stringify([
				{ url: "https://i.scdn.co/image/ab67616d0000b273f82d2bd1097e3e60a6a049a3", height: 640, width: 640 },
				{ url: "https://i.scdn.co/image/ab67616d00001e02f82d2bd1097e3e60a6a049a3", height: 300, width: 300 },
				{ url: "https://i.scdn.co/image/ab67616d00004851f82d2bd1097e3e60a6a049a3", height: 64, width: 64 }
			]),
			name: "The Very Best Of Supertramp",
			releaseDate: "1990-01-01",
			artists: JSON.stringify([{ name: "Supertramp", id: "3JsMj0DEzyWc0VDlHuy9Bx" }]),
			copyrights: JSON.stringify([
				{ text: "© 1990 A&M Records", type: "C" },
				{ text: "This Compilation ℗ 1990 A&M Records", type: "P" }
			]),
			popularity: 58,
			genres: JSON.stringify([]),
			songs: JSON.stringify([
				"2dHqn394dziubxaN5vuhy8", "22DIMXO4kIA7HnDEsWiXkV", "5Z4EgTCCoObfO1WfrvrQ9v",
				"33VoXdxgzoPAzICtvD6PuW", "72hA6rKUIc8sI2Bb0eB7AY", "6VArkfPhN9N7Ai4AfHBnYe",
				"46TLlKsmMNRQc53ukyFCtM", "2Qztnbb2MgFhhuDLIxdvog", "5u0WtsaVvYGy15tcKw7BnN",
				"3QPdukeLcTzHGnBA4bbUZ6", "6GC28sdbPr9duHLnF5xe4X", "1EOpK2ij87zagvLaR4VX0K",
				"3ubTVr9oZFJ4KfuVJA7kGn", "6GeE8OTgj0EsxN2yXBaBiu", "0TCRkfARkGKrfALiix7vYD"
			]),
			discCount: 1,
			dateAdded: new Date("2024-11-14 14:05:40")
		}
	]);
}
