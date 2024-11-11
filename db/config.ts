import { defineDb, defineTable, column, NOW } from 'astro:db';
import { Song, User, Session } from "@/db/tables"

// https://astro.build/db/config
export default defineDb({
  tables: { Song, User, Session }
});
