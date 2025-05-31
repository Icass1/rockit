// **********************************************
// **** File managed by sqlWrapper by RockIt ****
// ***********^**********************************

import { DB, BaseTable } from "@/lib/sqlWrapper";

export const db = new DB("database/test-database2.db");
interface Spotify_imagesType {
    id: string;
    url: string;
    width: number;
    height: number;
}
class Spotify_imagesRow {
    private columnName: string;
    private value: string | number | null;
    private db: DB;
    constructor(columnName: string, value: string | number | null, db: DB) {
        this.columnName = columnName;
        this.value = value;
        this.db = db;
    }
    get id(): string {
        return (
            this.db.db
                .prepare(
                    `SELECT id FROM spotify_images WHERE ${this.columnName} = ?`
                )
                .get(this.value) as Spotify_imagesType
        ).id as string;
    }
    set id(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get url(): string {
        return (
            this.db.db
                .prepare(
                    `SELECT url FROM spotify_images WHERE ${this.columnName} = ?`
                )
                .get(this.value) as Spotify_imagesType
        ).url as string;
    }
    set url(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get width(): number {
        return (
            this.db.db
                .prepare(
                    `SELECT width FROM spotify_images WHERE ${this.columnName} = ?`
                )
                .get(this.value) as Spotify_imagesType
        ).width as number;
    }
    set width(newValue: number) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get height(): number {
        return (
            this.db.db
                .prepare(
                    `SELECT height FROM spotify_images WHERE ${this.columnName} = ?`
                )
                .get(this.value) as Spotify_imagesType
        ).height as number;
    }
    set height(newValue: number) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    // *********************
    // *********************
    get album_images() {
        const a = this.db.db
            .prepare(`SELECT album_id FROM album_images WHERE image_id = ?`)
            .all(this.id) as { album_id: string }[];
        return a.map(
            (b) => new Album_imagesRow("album_id", b.album_id, this.db)
        );
    }
    get artist_images() {
        const a = this.db.db
            .prepare(`SELECT artist_id FROM artist_images WHERE image_id = ?`)
            .all(this.id) as { artist_id: string }[];
        return a.map(
            (b) => new Artist_imagesRow("artist_id", b.artist_id, this.db)
        );
    }
}
class Spotify_images extends BaseTable<Spotify_imagesType> {
    db: DB;
    constructor(db: DB) {
        super("spotify_images", db, []);
        this.db = db;
    }
    get(columnName: string, value: string | number | null): Spotify_imagesRow {
        return new Spotify_imagesRow(columnName, value, this.db);
    }
}
export const spotify_images = new Spotify_images(db);

interface AlbumsType {
    id: string;
    image: string;
    name: string;
    release_date: string;
    popularity?: number;
    disc_count: number;
    date_added?: string;
}
class AlbumsRow {
    private columnName: string;
    private value: string | number | null;
    private db: DB;
    constructor(columnName: string, value: string | number | null, db: DB) {
        this.columnName = columnName;
        this.value = value;
        this.db = db;
    }
    get id(): string {
        return (
            this.db.db
                .prepare(`SELECT id FROM albums WHERE ${this.columnName} = ?`)
                .get(this.value) as AlbumsType
        ).id as string;
    }
    set id(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get image(): string {
        return (
            this.db.db
                .prepare(
                    `SELECT image FROM albums WHERE ${this.columnName} = ?`
                )
                .get(this.value) as AlbumsType
        ).image as string;
    }
    set image(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get name(): string {
        return (
            this.db.db
                .prepare(`SELECT name FROM albums WHERE ${this.columnName} = ?`)
                .get(this.value) as AlbumsType
        ).name as string;
    }
    set name(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get release_date(): string {
        return (
            this.db.db
                .prepare(
                    `SELECT release_date FROM albums WHERE ${this.columnName} = ?`
                )
                .get(this.value) as AlbumsType
        ).release_date as string;
    }
    set release_date(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get popularity(): number | undefined {
        return (
            this.db.db
                .prepare(
                    `SELECT popularity FROM albums WHERE ${this.columnName} = ?`
                )
                .get(this.value) as AlbumsType
        ).popularity as number | undefined;
    }
    set popularity(newValue: number | undefined) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get disc_count(): number {
        return (
            this.db.db
                .prepare(
                    `SELECT disc_count FROM albums WHERE ${this.columnName} = ?`
                )
                .get(this.value) as AlbumsType
        ).disc_count as number;
    }
    set disc_count(newValue: number) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get date_added(): string {
        return (
            this.db.db
                .prepare(
                    `SELECT date_added FROM albums WHERE ${this.columnName} = ?`
                )
                .get(this.value) as AlbumsType
        ).date_added as string;
    }
    set date_added(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    // *********************
    // *********************
    get album_images() {
        const a = this.db.db
            .prepare(`SELECT album_id FROM album_images WHERE album_id = ?`)
            .all(this.id) as { album_id: string }[];
        return a.map(
            (b) => new Album_imagesRow("album_id", b.album_id, this.db)
        );
    }
    get album_artists() {
        const a = this.db.db
            .prepare(`SELECT album_id FROM album_artists WHERE album_id = ?`)
            .all(this.id) as { album_id: string }[];
        return a.map(
            (b) => new Album_artistsRow("album_id", b.album_id, this.db)
        );
    }
    get songs() {
        const a = this.db.db
            .prepare(`SELECT id FROM songs WHERE album_id = ?`)
            .all(this.id) as { id: string }[];
        return a.map((b) => new SongsRow("id", b.id, this.db));
    }
}
class Albums extends BaseTable<AlbumsType> {
    db: DB;
    constructor(db: DB) {
        super("albums", db, [
            {
                columnName: "date_added",
                type: "sqlWrapper-now-func",
            },
        ]);
        this.db = db;
    }
    get(columnName: string, value: string | number | null): AlbumsRow {
        return new AlbumsRow(columnName, value, this.db);
    }
}
export const albums = new Albums(db);

interface Album_imagesType {
    album_id: string;
    image_id: string;
}
class Album_imagesRow {
    private columnName: string;
    private value: string | number | null;
    private db: DB;
    constructor(columnName: string, value: string | number | null, db: DB) {
        this.columnName = columnName;
        this.value = value;
        this.db = db;
    }
    get album_id(): string {
        return (
            this.db.db
                .prepare(
                    `SELECT album_id FROM album_images WHERE ${this.columnName} = ?`
                )
                .get(this.value) as Album_imagesType
        ).album_id as string;
    }
    set album_id(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get image_id(): string {
        return (
            this.db.db
                .prepare(
                    `SELECT image_id FROM album_images WHERE ${this.columnName} = ?`
                )
                .get(this.value) as Album_imagesType
        ).image_id as string;
    }
    set image_id(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    // *********************
    get album(): AlbumsRow {
        return new AlbumsRow("id", this.album_id, this.db);
    }
    get image(): Spotify_imagesRow {
        return new Spotify_imagesRow("id", this.image_id, this.db);
    }
    // *********************
}
class Album_images extends BaseTable<Album_imagesType> {
    db: DB;
    constructor(db: DB) {
        super("album_images", db, []);
        this.db = db;
    }
    get(columnName: string, value: string | number | null): Album_imagesRow {
        return new Album_imagesRow(columnName, value, this.db);
    }
}
export const album_images = new Album_images(db);

interface ArtistsType {
    id: string;
    name: string;
    genres?: string;
    followers?: number;
    popularity?: number;
    date_added?: string;
    image?: string;
}
class ArtistsRow {
    private columnName: string;
    private value: string | number | null;
    private db: DB;
    constructor(columnName: string, value: string | number | null, db: DB) {
        this.columnName = columnName;
        this.value = value;
        this.db = db;
    }
    get id(): string {
        return (
            this.db.db
                .prepare(`SELECT id FROM artists WHERE ${this.columnName} = ?`)
                .get(this.value) as ArtistsType
        ).id as string;
    }
    set id(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get name(): string {
        return (
            this.db.db
                .prepare(
                    `SELECT name FROM artists WHERE ${this.columnName} = ?`
                )
                .get(this.value) as ArtistsType
        ).name as string;
    }
    set name(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get genres(): string | undefined {
        return (
            this.db.db
                .prepare(
                    `SELECT genres FROM artists WHERE ${this.columnName} = ?`
                )
                .get(this.value) as ArtistsType
        ).genres as string | undefined;
    }
    set genres(newValue: string | undefined) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get followers(): number | undefined {
        return (
            this.db.db
                .prepare(
                    `SELECT followers FROM artists WHERE ${this.columnName} = ?`
                )
                .get(this.value) as ArtistsType
        ).followers as number | undefined;
    }
    set followers(newValue: number | undefined) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get popularity(): number | undefined {
        return (
            this.db.db
                .prepare(
                    `SELECT popularity FROM artists WHERE ${this.columnName} = ?`
                )
                .get(this.value) as ArtistsType
        ).popularity as number | undefined;
    }
    set popularity(newValue: number | undefined) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get date_added(): string {
        return (
            this.db.db
                .prepare(
                    `SELECT date_added FROM artists WHERE ${this.columnName} = ?`
                )
                .get(this.value) as ArtistsType
        ).date_added as string;
    }
    set date_added(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get image(): string | undefined {
        return (
            this.db.db
                .prepare(
                    `SELECT image FROM artists WHERE ${this.columnName} = ?`
                )
                .get(this.value) as ArtistsType
        ).image as string | undefined;
    }
    set image(newValue: string | undefined) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    // *********************
    // *********************
    get album_artists() {
        const a = this.db.db
            .prepare(`SELECT album_id FROM album_artists WHERE artist_id = ?`)
            .all(this.id) as { album_id: string }[];
        return a.map(
            (b) => new Album_artistsRow("album_id", b.album_id, this.db)
        );
    }
    get artist_images() {
        const a = this.db.db
            .prepare(`SELECT artist_id FROM artist_images WHERE artist_id = ?`)
            .all(this.id) as { artist_id: string }[];
        return a.map(
            (b) => new Artist_imagesRow("artist_id", b.artist_id, this.db)
        );
    }
    get song_artists() {
        const a = this.db.db
            .prepare(`SELECT song_id FROM song_artists WHERE artist_id = ?`)
            .all(this.id) as { song_id: string }[];
        return a.map((b) => new Song_artistsRow("song_id", b.song_id, this.db));
    }
}
class Artists extends BaseTable<ArtistsType> {
    db: DB;
    constructor(db: DB) {
        super("artists", db, [
            {
                columnName: "date_added",
                type: "sqlWrapper-now-func",
            },
        ]);
        this.db = db;
    }
    get(columnName: string, value: string | number | null): ArtistsRow {
        return new ArtistsRow(columnName, value, this.db);
    }
}
export const artists = new Artists(db);

interface Album_artistsType {
    album_id: string;
    artist_id: string;
}
class Album_artistsRow {
    private columnName: string;
    private value: string | number | null;
    private db: DB;
    constructor(columnName: string, value: string | number | null, db: DB) {
        this.columnName = columnName;
        this.value = value;
        this.db = db;
    }
    get album_id(): string {
        return (
            this.db.db
                .prepare(
                    `SELECT album_id FROM album_artists WHERE ${this.columnName} = ?`
                )
                .get(this.value) as Album_artistsType
        ).album_id as string;
    }
    set album_id(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get artist_id(): string {
        return (
            this.db.db
                .prepare(
                    `SELECT artist_id FROM album_artists WHERE ${this.columnName} = ?`
                )
                .get(this.value) as Album_artistsType
        ).artist_id as string;
    }
    set artist_id(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    // *********************
    get album(): AlbumsRow {
        return new AlbumsRow("id", this.album_id, this.db);
    }
    get image(): ArtistsRow {
        return new ArtistsRow("id", this.artist_id, this.db);
    }
    // *********************
}
class Album_artists extends BaseTable<Album_artistsType> {
    db: DB;
    constructor(db: DB) {
        super("album_artists", db, []);
        this.db = db;
    }
    get(columnName: string, value: string | number | null): Album_artistsRow {
        return new Album_artistsRow(columnName, value, this.db);
    }
}
export const album_artists = new Album_artists(db);

interface Artist_imagesType {
    artist_id: string;
    image_id: string;
}
class Artist_imagesRow {
    private columnName: string;
    private value: string | number | null;
    private db: DB;
    constructor(columnName: string, value: string | number | null, db: DB) {
        this.columnName = columnName;
        this.value = value;
        this.db = db;
    }
    get artist_id(): string {
        return (
            this.db.db
                .prepare(
                    `SELECT artist_id FROM artist_images WHERE ${this.columnName} = ?`
                )
                .get(this.value) as Artist_imagesType
        ).artist_id as string;
    }
    set artist_id(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get image_id(): string {
        return (
            this.db.db
                .prepare(
                    `SELECT image_id FROM artist_images WHERE ${this.columnName} = ?`
                )
                .get(this.value) as Artist_imagesType
        ).image_id as string;
    }
    set image_id(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    // *********************
    get album(): ArtistsRow {
        return new ArtistsRow("id", this.artist_id, this.db);
    }
    get image(): Spotify_imagesRow {
        return new Spotify_imagesRow("id", this.image_id, this.db);
    }
    // *********************
}
class Artist_images extends BaseTable<Artist_imagesType> {
    db: DB;
    constructor(db: DB) {
        super("artist_images", db, []);
        this.db = db;
    }
    get(columnName: string, value: string | number | null): Artist_imagesRow {
        return new Artist_imagesRow(columnName, value, this.db);
    }
}
export const artist_images = new Artist_images(db);

interface SongsType {
    id: string;
    name: string;
    duration: number;
    track_number: number;
    disc_number: number;
    popularity?: number;
    image?: string;
    path?: string;
    album_id: string;
    date_added?: string;
    isrc: string;
    download_url?: string;
    lyrics?: string;
    dynamic_lyrics?: string;
}
class SongsRow {
    private columnName: string;
    private value: string | number | null;
    private db: DB;
    constructor(columnName: string, value: string | number | null, db: DB) {
        this.columnName = columnName;
        this.value = value;
        this.db = db;
    }
    get id(): string {
        return (
            this.db.db
                .prepare(`SELECT id FROM songs WHERE ${this.columnName} = ?`)
                .get(this.value) as SongsType
        ).id as string;
    }
    set id(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get name(): string {
        return (
            this.db.db
                .prepare(`SELECT name FROM songs WHERE ${this.columnName} = ?`)
                .get(this.value) as SongsType
        ).name as string;
    }
    set name(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get duration(): number {
        return (
            this.db.db
                .prepare(
                    `SELECT duration FROM songs WHERE ${this.columnName} = ?`
                )
                .get(this.value) as SongsType
        ).duration as number;
    }
    set duration(newValue: number) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get track_number(): number {
        return (
            this.db.db
                .prepare(
                    `SELECT track_number FROM songs WHERE ${this.columnName} = ?`
                )
                .get(this.value) as SongsType
        ).track_number as number;
    }
    set track_number(newValue: number) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get disc_number(): number {
        return (
            this.db.db
                .prepare(
                    `SELECT disc_number FROM songs WHERE ${this.columnName} = ?`
                )
                .get(this.value) as SongsType
        ).disc_number as number;
    }
    set disc_number(newValue: number) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get popularity(): number | undefined {
        return (
            this.db.db
                .prepare(
                    `SELECT popularity FROM songs WHERE ${this.columnName} = ?`
                )
                .get(this.value) as SongsType
        ).popularity as number | undefined;
    }
    set popularity(newValue: number | undefined) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get image(): string | undefined {
        return (
            this.db.db
                .prepare(`SELECT image FROM songs WHERE ${this.columnName} = ?`)
                .get(this.value) as SongsType
        ).image as string | undefined;
    }
    set image(newValue: string | undefined) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get path(): string | undefined {
        return (
            this.db.db
                .prepare(`SELECT path FROM songs WHERE ${this.columnName} = ?`)
                .get(this.value) as SongsType
        ).path as string | undefined;
    }
    set path(newValue: string | undefined) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get album_id(): string {
        return (
            this.db.db
                .prepare(
                    `SELECT album_id FROM songs WHERE ${this.columnName} = ?`
                )
                .get(this.value) as SongsType
        ).album_id as string;
    }
    set album_id(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get date_added(): string {
        return (
            this.db.db
                .prepare(
                    `SELECT date_added FROM songs WHERE ${this.columnName} = ?`
                )
                .get(this.value) as SongsType
        ).date_added as string;
    }
    set date_added(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get isrc(): string {
        return (
            this.db.db
                .prepare(`SELECT isrc FROM songs WHERE ${this.columnName} = ?`)
                .get(this.value) as SongsType
        ).isrc as string;
    }
    set isrc(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get download_url(): string | undefined {
        return (
            this.db.db
                .prepare(
                    `SELECT download_url FROM songs WHERE ${this.columnName} = ?`
                )
                .get(this.value) as SongsType
        ).download_url as string | undefined;
    }
    set download_url(newValue: string | undefined) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get lyrics(): string | undefined {
        return (
            this.db.db
                .prepare(
                    `SELECT lyrics FROM songs WHERE ${this.columnName} = ?`
                )
                .get(this.value) as SongsType
        ).lyrics as string | undefined;
    }
    set lyrics(newValue: string | undefined) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get dynamic_lyrics(): string | undefined {
        return (
            this.db.db
                .prepare(
                    `SELECT dynamic_lyrics FROM songs WHERE ${this.columnName} = ?`
                )
                .get(this.value) as SongsType
        ).dynamic_lyrics as string | undefined;
    }
    set dynamic_lyrics(newValue: string | undefined) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    // *********************
    get album(): AlbumsRow {
        return new AlbumsRow("id", this.album_id, this.db);
    }
    // *********************
    get song_artists() {
        const a = this.db.db
            .prepare(`SELECT song_id FROM song_artists WHERE song_id = ?`)
            .all(this.id) as { song_id: string }[];
        return a.map((b) => new Song_artistsRow("song_id", b.song_id, this.db));
    }
    get users() {
        const a = this.db.db
            .prepare(`SELECT id FROM users WHERE current_song_id = ?`)
            .all(this.id) as { id: string }[];
        return a.map((b) => new UsersRow("id", b.id, this.db));
    }
    get user_queue() {
        const a = this.db.db
            .prepare(`SELECT user_id FROM user_queue WHERE song_id = ?`)
            .all(this.id) as { user_id: string }[];
        return a.map((b) => new User_queueRow("user_id", b.user_id, this.db));
    }
    get user_liked_songs() {
        const a = this.db.db
            .prepare(`SELECT user_id FROM user_liked_songs WHERE song_id = ?`)
            .all(this.id) as { user_id: string }[];
        return a.map(
            (b) => new User_liked_songsRow("user_id", b.user_id, this.db)
        );
    }
    get user_song_history() {
        const a = this.db.db
            .prepare(`SELECT user_id FROM user_song_history WHERE song_id = ?`)
            .all(this.id) as { user_id: string }[];
        return a.map(
            (b) => new User_song_historyRow("user_id", b.user_id, this.db)
        );
    }
}
class Songs extends BaseTable<SongsType> {
    db: DB;
    constructor(db: DB) {
        super("songs", db, [
            {
                columnName: "date_added",
                type: "sqlWrapper-now-func",
            },
        ]);
        this.db = db;
    }
    get(columnName: string, value: string | number | null): SongsRow {
        return new SongsRow(columnName, value, this.db);
    }
}
export const songs = new Songs(db);

interface Song_artistsType {
    song_id: string;
    artist_id: string;
}
class Song_artistsRow {
    private columnName: string;
    private value: string | number | null;
    private db: DB;
    constructor(columnName: string, value: string | number | null, db: DB) {
        this.columnName = columnName;
        this.value = value;
        this.db = db;
    }
    get song_id(): string {
        return (
            this.db.db
                .prepare(
                    `SELECT song_id FROM song_artists WHERE ${this.columnName} = ?`
                )
                .get(this.value) as Song_artistsType
        ).song_id as string;
    }
    set song_id(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get artist_id(): string {
        return (
            this.db.db
                .prepare(
                    `SELECT artist_id FROM song_artists WHERE ${this.columnName} = ?`
                )
                .get(this.value) as Song_artistsType
        ).artist_id as string;
    }
    set artist_id(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    // *********************
    get album(): SongsRow {
        return new SongsRow("id", this.song_id, this.db);
    }
    get image(): ArtistsRow {
        return new ArtistsRow("id", this.artist_id, this.db);
    }
    // *********************
}
class Song_artists extends BaseTable<Song_artistsType> {
    db: DB;
    constructor(db: DB) {
        super("song_artists", db, []);
        this.db = db;
    }
    get(columnName: string, value: string | number | null): Song_artistsRow {
        return new Song_artistsRow(columnName, value, this.db);
    }
}
export const song_artists = new Song_artists(db);

interface UsersType {
    id: string;
    username: string;
    password_hash: string;
    current_song_id?: string;
    current_station?: string;
    current_time?: number;
    queue_index?: number;
    random_queue: boolean;
    repeat_song: string;
    volume: number;
    cross_fade: number;
    lang: string;
    admin: boolean;
    super_admin: boolean;
    impersonate_id?: string;
    dev_user: boolean;
    date_added?: string;
}
class UsersRow {
    private columnName: string;
    private value: string | number | null;
    private db: DB;
    constructor(columnName: string, value: string | number | null, db: DB) {
        this.columnName = columnName;
        this.value = value;
        this.db = db;
    }
    get id(): string {
        return (
            this.db.db
                .prepare(`SELECT id FROM users WHERE ${this.columnName} = ?`)
                .get(this.value) as UsersType
        ).id as string;
    }
    set id(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get username(): string {
        return (
            this.db.db
                .prepare(
                    `SELECT username FROM users WHERE ${this.columnName} = ?`
                )
                .get(this.value) as UsersType
        ).username as string;
    }
    set username(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get password_hash(): string {
        return (
            this.db.db
                .prepare(
                    `SELECT password_hash FROM users WHERE ${this.columnName} = ?`
                )
                .get(this.value) as UsersType
        ).password_hash as string;
    }
    set password_hash(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get current_song_id(): string | undefined {
        return (
            this.db.db
                .prepare(
                    `SELECT current_song_id FROM users WHERE ${this.columnName} = ?`
                )
                .get(this.value) as UsersType
        ).current_song_id as string | undefined;
    }
    set current_song_id(newValue: string | undefined) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get current_station(): string | undefined {
        return (
            this.db.db
                .prepare(
                    `SELECT current_station FROM users WHERE ${this.columnName} = ?`
                )
                .get(this.value) as UsersType
        ).current_station as string | undefined;
    }
    set current_station(newValue: string | undefined) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get current_time(): number | undefined {
        return (
            this.db.db
                .prepare(
                    `SELECT current_time FROM users WHERE ${this.columnName} = ?`
                )
                .get(this.value) as UsersType
        ).current_time as number | undefined;
    }
    set current_time(newValue: number | undefined) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get queue_index(): number | undefined {
        return (
            this.db.db
                .prepare(
                    `SELECT queue_index FROM users WHERE ${this.columnName} = ?`
                )
                .get(this.value) as UsersType
        ).queue_index as number | undefined;
    }
    set queue_index(newValue: number | undefined) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get random_queue(): boolean {
        return (
            this.db.db
                .prepare(
                    `SELECT random_queue FROM users WHERE ${this.columnName} = ?`
                )
                .get(this.value) as UsersType
        ).random_queue as boolean;
    }
    set random_queue(newValue: boolean) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get repeat_song(): string {
        return (
            this.db.db
                .prepare(
                    `SELECT repeat_song FROM users WHERE ${this.columnName} = ?`
                )
                .get(this.value) as UsersType
        ).repeat_song as string;
    }
    set repeat_song(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get volume(): number {
        return (
            this.db.db
                .prepare(
                    `SELECT volume FROM users WHERE ${this.columnName} = ?`
                )
                .get(this.value) as UsersType
        ).volume as number;
    }
    set volume(newValue: number) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get cross_fade(): number {
        return (
            this.db.db
                .prepare(
                    `SELECT cross_fade FROM users WHERE ${this.columnName} = ?`
                )
                .get(this.value) as UsersType
        ).cross_fade as number;
    }
    set cross_fade(newValue: number) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get lang(): string {
        return (
            this.db.db
                .prepare(`SELECT lang FROM users WHERE ${this.columnName} = ?`)
                .get(this.value) as UsersType
        ).lang as string;
    }
    set lang(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get admin(): boolean {
        return (
            this.db.db
                .prepare(`SELECT admin FROM users WHERE ${this.columnName} = ?`)
                .get(this.value) as UsersType
        ).admin as boolean;
    }
    set admin(newValue: boolean) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get super_admin(): boolean {
        return (
            this.db.db
                .prepare(
                    `SELECT super_admin FROM users WHERE ${this.columnName} = ?`
                )
                .get(this.value) as UsersType
        ).super_admin as boolean;
    }
    set super_admin(newValue: boolean) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get impersonate_id(): string | undefined {
        return (
            this.db.db
                .prepare(
                    `SELECT impersonate_id FROM users WHERE ${this.columnName} = ?`
                )
                .get(this.value) as UsersType
        ).impersonate_id as string | undefined;
    }
    set impersonate_id(newValue: string | undefined) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get dev_user(): boolean {
        return (
            this.db.db
                .prepare(
                    `SELECT dev_user FROM users WHERE ${this.columnName} = ?`
                )
                .get(this.value) as UsersType
        ).dev_user as boolean;
    }
    set dev_user(newValue: boolean) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get date_added(): string {
        return (
            this.db.db
                .prepare(
                    `SELECT date_added FROM users WHERE ${this.columnName} = ?`
                )
                .get(this.value) as UsersType
        ).date_added as string;
    }
    set date_added(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    // *********************
    get current_song(): SongsRow | undefined {
        if (this.current_song_id)
            return new SongsRow("id", this.current_song_id, this.db);
    }
    get impersonated_user(): UsersRow | undefined {
        if (this.impersonate_id)
            return new UsersRow("id", this.impersonate_id, this.db);
    }
    // *********************
    get users() {
        const a = this.db.db
            .prepare(`SELECT id FROM users WHERE impersonate_id = ?`)
            .all(this.id) as { id: string }[];
        return a.map((b) => new UsersRow("id", b.id, this.db));
    }
    get user_lists() {
        const a = this.db.db
            .prepare(`SELECT user_id FROM user_lists WHERE user_id = ?`)
            .all(this.id) as { user_id: string }[];
        return a.map((b) => new User_listsRow("user_id", b.user_id, this.db));
    }
    get user_queue() {
        const a = this.db.db
            .prepare(`SELECT user_id FROM user_queue WHERE user_id = ?`)
            .all(this.id) as { user_id: string }[];
        return a.map((b) => new User_queueRow("user_id", b.user_id, this.db));
    }
    get user_liked_songs() {
        const a = this.db.db
            .prepare(`SELECT user_id FROM user_liked_songs WHERE user_id = ?`)
            .all(this.id) as { user_id: string }[];
        return a.map(
            (b) => new User_liked_songsRow("user_id", b.user_id, this.db)
        );
    }
    get user_song_history() {
        const a = this.db.db
            .prepare(`SELECT user_id FROM user_song_history WHERE user_id = ?`)
            .all(this.id) as { user_id: string }[];
        return a.map(
            (b) => new User_song_historyRow("user_id", b.user_id, this.db)
        );
    }
    get downloads() {
        const a = this.db.db
            .prepare(`SELECT id FROM downloads WHERE user_id = ?`)
            .all(this.id) as { id: string }[];
        return a.map((b) => new DownloadsRow("id", b.id, this.db));
    }
    get errors() {
        const a = this.db.db
            .prepare(`SELECT id FROM errors WHERE user_id = ?`)
            .all(this.id) as { id: string }[];
        return a.map((b) => new ErrorsRow("id", b.id, this.db));
    }
}
class Users extends BaseTable<UsersType> {
    db: DB;
    constructor(db: DB) {
        super("users", db, [
            {
                columnName: "date_added",
                type: "sqlWrapper-now-func",
            },
        ]);
        this.db = db;
    }
    get(columnName: string, value: string | number | null): UsersRow {
        return new UsersRow(columnName, value, this.db);
    }
}
export const users = new Users(db);

interface User_listsType {
    user_id: string;
    item_type: string;
    item_id: string;
    date_added?: string;
}
class User_listsRow {
    private columnName: string;
    private value: string | number | null;
    private db: DB;
    constructor(columnName: string, value: string | number | null, db: DB) {
        this.columnName = columnName;
        this.value = value;
        this.db = db;
    }
    get user_id(): string {
        return (
            this.db.db
                .prepare(
                    `SELECT user_id FROM user_lists WHERE ${this.columnName} = ?`
                )
                .get(this.value) as User_listsType
        ).user_id as string;
    }
    set user_id(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get item_type(): string {
        return (
            this.db.db
                .prepare(
                    `SELECT item_type FROM user_lists WHERE ${this.columnName} = ?`
                )
                .get(this.value) as User_listsType
        ).item_type as string;
    }
    set item_type(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get item_id(): string {
        return (
            this.db.db
                .prepare(
                    `SELECT item_id FROM user_lists WHERE ${this.columnName} = ?`
                )
                .get(this.value) as User_listsType
        ).item_id as string;
    }
    set item_id(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get date_added(): string {
        return (
            this.db.db
                .prepare(
                    `SELECT date_added FROM user_lists WHERE ${this.columnName} = ?`
                )
                .get(this.value) as User_listsType
        ).date_added as string;
    }
    set date_added(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    // *********************
    get user(): UsersRow {
        return new UsersRow("id", this.user_id, this.db);
    }
    // *********************
}
class User_lists extends BaseTable<User_listsType> {
    db: DB;
    constructor(db: DB) {
        super("user_lists", db, [
            {
                columnName: "date_added",
                type: "sqlWrapper-now-func",
            },
        ]);
        this.db = db;
    }
    get(columnName: string, value: string | number | null): User_listsRow {
        return new User_listsRow(columnName, value, this.db);
    }
}
export const user_lists = new User_lists(db);

interface User_queueType {
    user_id: string;
    position: number;
    song_id: string;
    list_type: string;
    list_id: string;
}
class User_queueRow {
    private columnName: string;
    private value: string | number | null;
    private db: DB;
    constructor(columnName: string, value: string | number | null, db: DB) {
        this.columnName = columnName;
        this.value = value;
        this.db = db;
    }
    get user_id(): string {
        return (
            this.db.db
                .prepare(
                    `SELECT user_id FROM user_queue WHERE ${this.columnName} = ?`
                )
                .get(this.value) as User_queueType
        ).user_id as string;
    }
    set user_id(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get position(): number {
        return (
            this.db.db
                .prepare(
                    `SELECT position FROM user_queue WHERE ${this.columnName} = ?`
                )
                .get(this.value) as User_queueType
        ).position as number;
    }
    set position(newValue: number) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get song_id(): string {
        return (
            this.db.db
                .prepare(
                    `SELECT song_id FROM user_queue WHERE ${this.columnName} = ?`
                )
                .get(this.value) as User_queueType
        ).song_id as string;
    }
    set song_id(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get list_type(): string {
        return (
            this.db.db
                .prepare(
                    `SELECT list_type FROM user_queue WHERE ${this.columnName} = ?`
                )
                .get(this.value) as User_queueType
        ).list_type as string;
    }
    set list_type(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get list_id(): string {
        return (
            this.db.db
                .prepare(
                    `SELECT list_id FROM user_queue WHERE ${this.columnName} = ?`
                )
                .get(this.value) as User_queueType
        ).list_id as string;
    }
    set list_id(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    // *********************
    get user(): UsersRow {
        return new UsersRow("id", this.user_id, this.db);
    }
    get song(): SongsRow {
        return new SongsRow("id", this.song_id, this.db);
    }
    // *********************
}
class User_queue extends BaseTable<User_queueType> {
    db: DB;
    constructor(db: DB) {
        super("user_queue", db, []);
        this.db = db;
    }
    get(columnName: string, value: string | number | null): User_queueRow {
        return new User_queueRow(columnName, value, this.db);
    }
}
export const user_queue = new User_queue(db);

interface User_pinned_listsType {
    user_id: string;
    item_type: string;
    item_id: string;
    date_added?: string;
}
class User_pinned_listsRow {
    private columnName: string;
    private value: string | number | null;
    private db: DB;
    constructor(columnName: string, value: string | number | null, db: DB) {
        this.columnName = columnName;
        this.value = value;
        this.db = db;
    }
    get user_id(): string {
        return (
            this.db.db
                .prepare(
                    `SELECT user_id FROM user_pinned_lists WHERE ${this.columnName} = ?`
                )
                .get(this.value) as User_pinned_listsType
        ).user_id as string;
    }
    set user_id(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get item_type(): string {
        return (
            this.db.db
                .prepare(
                    `SELECT item_type FROM user_pinned_lists WHERE ${this.columnName} = ?`
                )
                .get(this.value) as User_pinned_listsType
        ).item_type as string;
    }
    set item_type(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get item_id(): string {
        return (
            this.db.db
                .prepare(
                    `SELECT item_id FROM user_pinned_lists WHERE ${this.columnName} = ?`
                )
                .get(this.value) as User_pinned_listsType
        ).item_id as string;
    }
    set item_id(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get date_added(): string {
        return (
            this.db.db
                .prepare(
                    `SELECT date_added FROM user_pinned_lists WHERE ${this.columnName} = ?`
                )
                .get(this.value) as User_pinned_listsType
        ).date_added as string;
    }
    set date_added(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    // *********************
    // *********************
}
class User_pinned_lists extends BaseTable<User_pinned_listsType> {
    db: DB;
    constructor(db: DB) {
        super("user_pinned_lists", db, [
            {
                columnName: "date_added",
                type: "sqlWrapper-now-func",
            },
        ]);
        this.db = db;
    }
    get(
        columnName: string,
        value: string | number | null
    ): User_pinned_listsRow {
        return new User_pinned_listsRow(columnName, value, this.db);
    }
}
export const user_pinned_lists = new User_pinned_lists(db);

interface User_liked_songsType {
    user_id: string;
    song_id: string;
    date_added?: string;
}
class User_liked_songsRow {
    private columnName: string;
    private value: string | number | null;
    private db: DB;
    constructor(columnName: string, value: string | number | null, db: DB) {
        this.columnName = columnName;
        this.value = value;
        this.db = db;
    }
    get user_id(): string {
        return (
            this.db.db
                .prepare(
                    `SELECT user_id FROM user_liked_songs WHERE ${this.columnName} = ?`
                )
                .get(this.value) as User_liked_songsType
        ).user_id as string;
    }
    set user_id(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get song_id(): string {
        return (
            this.db.db
                .prepare(
                    `SELECT song_id FROM user_liked_songs WHERE ${this.columnName} = ?`
                )
                .get(this.value) as User_liked_songsType
        ).song_id as string;
    }
    set song_id(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get date_added(): string {
        return (
            this.db.db
                .prepare(
                    `SELECT date_added FROM user_liked_songs WHERE ${this.columnName} = ?`
                )
                .get(this.value) as User_liked_songsType
        ).date_added as string;
    }
    set date_added(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    // *********************
    get user(): UsersRow {
        return new UsersRow("id", this.user_id, this.db);
    }
    get song(): SongsRow {
        return new SongsRow("id", this.song_id, this.db);
    }
    // *********************
}
class User_liked_songs extends BaseTable<User_liked_songsType> {
    db: DB;
    constructor(db: DB) {
        super("user_liked_songs", db, [
            {
                columnName: "date_added",
                type: "sqlWrapper-now-func",
            },
        ]);
        this.db = db;
    }
    get(
        columnName: string,
        value: string | number | null
    ): User_liked_songsRow {
        return new User_liked_songsRow(columnName, value, this.db);
    }
}
export const user_liked_songs = new User_liked_songs(db);

interface User_song_historyType {
    user_id: string;
    song_id: string;
    played_at: string;
}
class User_song_historyRow {
    private columnName: string;
    private value: string | number | null;
    private db: DB;
    constructor(columnName: string, value: string | number | null, db: DB) {
        this.columnName = columnName;
        this.value = value;
        this.db = db;
    }
    get user_id(): string {
        return (
            this.db.db
                .prepare(
                    `SELECT user_id FROM user_song_history WHERE ${this.columnName} = ?`
                )
                .get(this.value) as User_song_historyType
        ).user_id as string;
    }
    set user_id(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get song_id(): string {
        return (
            this.db.db
                .prepare(
                    `SELECT song_id FROM user_song_history WHERE ${this.columnName} = ?`
                )
                .get(this.value) as User_song_historyType
        ).song_id as string;
    }
    set song_id(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get played_at(): string {
        return (
            this.db.db
                .prepare(
                    `SELECT played_at FROM user_song_history WHERE ${this.columnName} = ?`
                )
                .get(this.value) as User_song_historyType
        ).played_at as string;
    }
    set played_at(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    // *********************
    get user(): UsersRow {
        return new UsersRow("id", this.user_id, this.db);
    }
    get song(): SongsRow {
        return new SongsRow("id", this.song_id, this.db);
    }
    // *********************
}
class User_song_history extends BaseTable<User_song_historyType> {
    db: DB;
    constructor(db: DB) {
        super("user_song_history", db, []);
        this.db = db;
    }
    get(
        columnName: string,
        value: string | number | null
    ): User_song_historyRow {
        return new User_song_historyRow(columnName, value, this.db);
    }
}
export const user_song_history = new User_song_history(db);

interface DownloadsType {
    id: string;
    user_id: string;
    date_started: string;
    date_ended?: string;
    download_url: string;
    status: string;
    seen: boolean;
    success?: number;
    fail?: number;
}
class DownloadsRow {
    private columnName: string;
    private value: string | number | null;
    private db: DB;
    constructor(columnName: string, value: string | number | null, db: DB) {
        this.columnName = columnName;
        this.value = value;
        this.db = db;
    }
    get id(): string {
        return (
            this.db.db
                .prepare(
                    `SELECT id FROM downloads WHERE ${this.columnName} = ?`
                )
                .get(this.value) as DownloadsType
        ).id as string;
    }
    set id(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get user_id(): string {
        return (
            this.db.db
                .prepare(
                    `SELECT user_id FROM downloads WHERE ${this.columnName} = ?`
                )
                .get(this.value) as DownloadsType
        ).user_id as string;
    }
    set user_id(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get date_started(): string {
        return (
            this.db.db
                .prepare(
                    `SELECT date_started FROM downloads WHERE ${this.columnName} = ?`
                )
                .get(this.value) as DownloadsType
        ).date_started as string;
    }
    set date_started(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get date_ended(): string | undefined {
        return (
            this.db.db
                .prepare(
                    `SELECT date_ended FROM downloads WHERE ${this.columnName} = ?`
                )
                .get(this.value) as DownloadsType
        ).date_ended as string | undefined;
    }
    set date_ended(newValue: string | undefined) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get download_url(): string {
        return (
            this.db.db
                .prepare(
                    `SELECT download_url FROM downloads WHERE ${this.columnName} = ?`
                )
                .get(this.value) as DownloadsType
        ).download_url as string;
    }
    set download_url(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get status(): string {
        return (
            this.db.db
                .prepare(
                    `SELECT status FROM downloads WHERE ${this.columnName} = ?`
                )
                .get(this.value) as DownloadsType
        ).status as string;
    }
    set status(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get seen(): boolean {
        return (
            this.db.db
                .prepare(
                    `SELECT seen FROM downloads WHERE ${this.columnName} = ?`
                )
                .get(this.value) as DownloadsType
        ).seen as boolean;
    }
    set seen(newValue: boolean) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get success(): number | undefined {
        return (
            this.db.db
                .prepare(
                    `SELECT success FROM downloads WHERE ${this.columnName} = ?`
                )
                .get(this.value) as DownloadsType
        ).success as number | undefined;
    }
    set success(newValue: number | undefined) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get fail(): number | undefined {
        return (
            this.db.db
                .prepare(
                    `SELECT fail FROM downloads WHERE ${this.columnName} = ?`
                )
                .get(this.value) as DownloadsType
        ).fail as number | undefined;
    }
    set fail(newValue: number | undefined) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    // *********************
    get user(): UsersRow {
        return new UsersRow("id", this.user_id, this.db);
    }
    // *********************
}
class Downloads extends BaseTable<DownloadsType> {
    db: DB;
    constructor(db: DB) {
        super("downloads", db, []);
        this.db = db;
    }
    get(columnName: string, value: string | number | null): DownloadsRow {
        return new DownloadsRow(columnName, value, this.db);
    }
}
export const downloads = new Downloads(db);

interface ErrorsType {
    id: string;
    msg?: string;
    source?: string;
    line_no?: number;
    column_no?: number;
    error_message?: string;
    error_cause?: string;
    error_name?: string;
    error_stack?: string;
    user_id?: string;
    date_added?: string;
}
class ErrorsRow {
    private columnName: string;
    private value: string | number | null;
    private db: DB;
    constructor(columnName: string, value: string | number | null, db: DB) {
        this.columnName = columnName;
        this.value = value;
        this.db = db;
    }
    get id(): string {
        return (
            this.db.db
                .prepare(`SELECT id FROM errors WHERE ${this.columnName} = ?`)
                .get(this.value) as ErrorsType
        ).id as string;
    }
    set id(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get msg(): string | undefined {
        return (
            this.db.db
                .prepare(`SELECT msg FROM errors WHERE ${this.columnName} = ?`)
                .get(this.value) as ErrorsType
        ).msg as string | undefined;
    }
    set msg(newValue: string | undefined) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get source(): string | undefined {
        return (
            this.db.db
                .prepare(
                    `SELECT source FROM errors WHERE ${this.columnName} = ?`
                )
                .get(this.value) as ErrorsType
        ).source as string | undefined;
    }
    set source(newValue: string | undefined) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get line_no(): number | undefined {
        return (
            this.db.db
                .prepare(
                    `SELECT line_no FROM errors WHERE ${this.columnName} = ?`
                )
                .get(this.value) as ErrorsType
        ).line_no as number | undefined;
    }
    set line_no(newValue: number | undefined) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get column_no(): number | undefined {
        return (
            this.db.db
                .prepare(
                    `SELECT column_no FROM errors WHERE ${this.columnName} = ?`
                )
                .get(this.value) as ErrorsType
        ).column_no as number | undefined;
    }
    set column_no(newValue: number | undefined) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get error_message(): string | undefined {
        return (
            this.db.db
                .prepare(
                    `SELECT error_message FROM errors WHERE ${this.columnName} = ?`
                )
                .get(this.value) as ErrorsType
        ).error_message as string | undefined;
    }
    set error_message(newValue: string | undefined) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get error_cause(): string | undefined {
        return (
            this.db.db
                .prepare(
                    `SELECT error_cause FROM errors WHERE ${this.columnName} = ?`
                )
                .get(this.value) as ErrorsType
        ).error_cause as string | undefined;
    }
    set error_cause(newValue: string | undefined) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get error_name(): string | undefined {
        return (
            this.db.db
                .prepare(
                    `SELECT error_name FROM errors WHERE ${this.columnName} = ?`
                )
                .get(this.value) as ErrorsType
        ).error_name as string | undefined;
    }
    set error_name(newValue: string | undefined) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get error_stack(): string | undefined {
        return (
            this.db.db
                .prepare(
                    `SELECT error_stack FROM errors WHERE ${this.columnName} = ?`
                )
                .get(this.value) as ErrorsType
        ).error_stack as string | undefined;
    }
    set error_stack(newValue: string | undefined) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get user_id(): string | undefined {
        return (
            this.db.db
                .prepare(
                    `SELECT user_id FROM errors WHERE ${this.columnName} = ?`
                )
                .get(this.value) as ErrorsType
        ).user_id as string | undefined;
    }
    set user_id(newValue: string | undefined) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    get date_added(): string {
        return (
            this.db.db
                .prepare(
                    `SELECT date_added FROM errors WHERE ${this.columnName} = ?`
                )
                .get(this.value) as ErrorsType
        ).date_added as string;
    }
    set date_added(newValue: string) {
        console.warn("TODO", newValue, this.columnName, this.value);
    }
    // *********************
    get user(): UsersRow | undefined {
        if (this.user_id) return new UsersRow("id", this.user_id, this.db);
    }
    // *********************
}
class Errors extends BaseTable<ErrorsType> {
    db: DB;
    constructor(db: DB) {
        super("errors", db, [
            {
                columnName: "date_added",
                type: "sqlWrapper-now-func",
            },
        ]);
        this.db = db;
    }
    get(columnName: string, value: string | number | null): ErrorsRow {
        return new ErrorsRow(columnName, value, this.db);
    }
}
export const errors = new Errors(db);
