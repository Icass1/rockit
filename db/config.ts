import { defineDb, } from 'astro:db';
import { Song, User, Session, List } from "@/db/tables"

// https://astro.build/db/config
export default defineDb({
  tables: { Song, User, Session, List }
});
