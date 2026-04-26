import { getDb } from "../db";
import { type NewUser, type User } from "../schema";

const now = () => Math.floor(Date.now() / 1000);

export async function getUserById(userId: number): Promise<User | null> {
    const db = getDb();
    const result = db.getFirstSync<User | any>(
        "SELECT * FROM users WHERE id = ?",
        userId
    );
    return result ?? null;
}

export async function getUserByPublicId(
    publicId: string
): Promise<User | null> {
    const db = getDb();
    const result = db.getFirstSync<User | any>(
        "SELECT * FROM users WHERE public_id = ?",
        publicId
    );
    return result ?? null;
}

export async function getUserByUsername(
    username: string
): Promise<User | null> {
    const db = getDb();
    const result = db.getFirstSync<User | any>(
        "SELECT * FROM users WHERE username = ?",
        username
    );
    return result ?? null;
}

export async function createUser(
    user: Omit<NewUser, "id" | "dateUpdated" | "dateAdded">
): Promise<User> {
    const db = getDb();
    const timestamp = now();
    const result = db.runSync(
        `INSERT INTO users (public_id, username, password_hash, provider, provider_account_id, current_station, current_time_ms, current_queue_media_id, queue_type_key, repeat_mode_key, volume, cross_fade_ms, lang_id, admin, super_admin, image_id, date_updated, date_added)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        user.publicId ?? null,
        user.username ?? null,
        user.passwordHash ?? null,
        user.provider ?? null,
        user.providerAccountId ?? null,
        user.currentStation ?? null,
        user.currentTimeMs ?? null,
        user.currentQueueMediaId ?? null,
        user.queueTypeKey ?? 2,
        user.repeatModeKey ?? 1,
        user.volume ?? 1,
        user.crossFadeMs ?? 0,
        user.langId ?? 1,
        user.admin ? 1 : 0,
        user.superAdmin ? 1 : 0,
        user.imageId ?? null,
        timestamp,
        timestamp
    );
    return {
        ...user,
        id: result.lastInsertRowId,
        dateUpdated: timestamp,
        dateAdded: timestamp,
    } as User;
}

export async function updateUser(userId: number, updates: any): Promise<void> {
    const db = getDb();
    const timestamp = now();

    const fields: string[] = ["date_updated = ?"];
    const values: (string | number | null)[] = [timestamp];

    if (updates.username !== undefined) {
        fields.push("username = ?");
        values.push(updates.username);
    }
    if (updates.passwordHash !== undefined) {
        fields.push("password_hash = ?");
        values.push(updates.passwordHash);
    }
    if (updates.provider !== undefined) {
        fields.push("provider = ?");
        values.push(updates.provider);
    }
    if (updates.providerAccountId !== undefined) {
        fields.push("provider_account_id = ?");
        values.push(updates.providerAccountId);
    }
    if (updates.currentStation !== undefined) {
        fields.push("current_station = ?");
        values.push(updates.currentStation);
    }
    if (updates.currentTimeMs !== undefined) {
        fields.push("current_time_ms = ?");
        values.push(updates.currentTimeMs);
    }
    if (updates.currentQueueMediaId !== undefined) {
        fields.push("current_queue_media_id = ?");
        values.push(updates.currentQueueMediaId);
    }
    if (updates.queueTypeKey !== undefined) {
        fields.push("queue_type_key = ?");
        values.push(updates.queueTypeKey);
    }
    if (updates.repeatModeKey !== undefined) {
        fields.push("repeat_mode_key = ?");
        values.push(updates.repeatModeKey);
    }
    if (updates.volume !== undefined) {
        fields.push("volume = ?");
        values.push(updates.volume);
    }
    if (updates.crossFadeMs !== undefined) {
        fields.push("cross_fade_ms = ?");
        values.push(updates.crossFadeMs);
    }
    if (updates.langId !== undefined) {
        fields.push("lang_id = ?");
        values.push(updates.langId);
    }
    if (updates.admin !== undefined) {
        fields.push("admin = ?");
        values.push(updates.admin ? 1 : 0);
    }
    if (updates.superAdmin !== undefined) {
        fields.push("super_admin = ?");
        values.push(updates.superAdmin ? 1 : 0);
    }
    if (updates.imageId !== undefined) {
        fields.push("image_id = ?");
        values.push(updates.imageId);
    }

    values.push(userId);
    db.runSync(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values);
}

export async function updateUserQueueType(
    userId: number,
    queueTypeKey: number
): Promise<void> {
    const db = getDb();
    db.runSync(
        "UPDATE users SET queue_type_key = ?, date_updated = ? WHERE id = ?",
        queueTypeKey,
        now(),
        userId
    );
}

export async function updateUserRepeatMode(
    userId: number,
    repeatModeKey: number
): Promise<void> {
    const db = getDb();
    db.runSync(
        "UPDATE users SET repeat_mode_key = ?, date_updated = ? WHERE id = ?",
        repeatModeKey,
        now(),
        userId
    );
}

export async function updateUserVolume(
    userId: number,
    volume: number
): Promise<void> {
    const db = getDb();
    db.runSync(
        "UPDATE users SET volume = ?, date_updated = ? WHERE id = ?",
        volume,
        now(),
        userId
    );
}

export async function updateUserCrossFade(
    userId: number,
    crossFadeMs: number
): Promise<void> {
    const db = getDb();
    db.runSync(
        "UPDATE users SET cross_fade_ms = ?, date_updated = ? WHERE id = ?",
        crossFadeMs,
        now(),
        userId
    );
}

export async function updateUserLang(
    userId: number,
    langId: number
): Promise<void> {
    const db = getDb();
    db.runSync(
        "UPDATE users SET lang_id = ?, date_updated = ? WHERE id = ?",
        langId,
        now(),
        userId
    );
}

export async function deleteUser(userId: number): Promise<void> {
    const db = getDb();
    db.runSync("DELETE FROM users WHERE id = ?", userId);
}

export async function getFirstUser(): Promise<User | null> {
    const db = getDb();
    return db.getFirstSync<User | any>("SELECT * FROM users LIMIT 1") ?? null;
}

export async function deleteAllUsers(): Promise<void> {
    const db = getDb();
    db.runSync("DELETE FROM users");
}
