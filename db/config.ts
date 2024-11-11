import { defineDb, defineTable, column } from 'astro:db';


const Song = defineTable({
  columns: {
    name: column.text(),
    artists: column.text(),
    artist: column.text(),
    genres: column.text(),
    disc_number: column.text({optional: true}),
    disc_count: column.text({optional: true}),
    album_name: column.text(),
    album_artist: column.text(),
    album_type: column.text(),
    duration: column.number(),
    year: column.number(),
    date: column.text(),
    track_number: column.number({optional: true}),
    tracks_count: column.number({optional: true}),
    song_id: column.text({unique: true}),
    explicit: column.boolean({optional: true}),
    publisher: column.text({optional: true}),
    url: column.text({unique: true}),
    path: column.text({unique: true}),
    isrc: column.text({optional: true}),
    cover_url: column.text(),
    copyright_text: column.text({optional: true}),
    download_url: column.text({optional: true}),
    lyrics: column.text({optional: true}),
    popularity: column.number({optional: true}),
    album_id: column.text(),
    artist_id: column.text({optional: true}),
  }
})

// https://astro.build/db/config
export default defineDb({
  tables: {Song}
});
