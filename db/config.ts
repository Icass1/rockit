import { defineDb, } from 'astro:db';
import { Song, User, Session, Album, Playlist } from "@/db/tables"

// https://astro.build/db/config
export default defineDb({
  tables: { Song, User, Session, Album, Playlist }
});
