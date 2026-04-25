import { getDb } from "../db";
import { type Vocabulary } from "../schema";

export async function getVocabularyByLang(
    langId: number
): Promise<Record<string, string>> {
    const db = getDb();
    const results = db.getAllSync<Vocabulary>(
        "SELECT * FROM vocabulary WHERE lang_id = ?",
        langId
    );
    const vocab: Record<string, string> = {};
    for (const row of results) {
        vocab[row.key] = row.value;
    }
    return vocab;
}

export async function setVocabulary(
    langId: number,
    key: string,
    value: string
): Promise<void> {
    const db = getDb();
    db.runSync(
        `INSERT OR REPLACE INTO vocabulary (lang_id, key, value) VALUES (?, ?, ?)`,
        langId,
        key,
        value
    );
}

export async function setVocabularyBatch(
    langId: number,
    vocab: Record<string, string>
): Promise<void> {
    const db = getDb();
    db.execSync("BEGIN IMMEDIATE");
    try {
        for (const [key, value] of Object.entries(vocab)) {
            db.runSync(
                `INSERT OR REPLACE INTO vocabulary (lang_id, key, value) VALUES (?, ?, ?)`,
                langId,
                key,
                value
            );
        }
    } finally {
        db.execSync("COMMIT");
    }
}

export async function clearVocabulary(langId: number): Promise<void> {
    const db = getDb();
    db.runSync("DELETE FROM vocabulary WHERE lang_id = ?", langId);
}
