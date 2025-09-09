import Masonry from "@/components/Masonry/Masonry";
import { getSession } from "@/lib/auth/getSession";
import { DatabaseBackup, Link as LinkIcon } from "lucide-react";
import Link from "next/link";
import { promises as fs } from "fs";
import { notFound } from "next/navigation";
import NewBackupButton from "@/components/Admin/NewBackup";
import { ENV } from "@/rockitEnv";

export default async function AdminPage() {
    const session = await getSession();

    if (!session?.user?.admin) {
        notFound();
    }

    const users = db.prepare("SELECT id FROM user").all();
    const albums = db.prepare("SELECT id FROM album").all();
    const playlists = db.prepare("SELECT id FROM playlist").all();
    const songs = db.prepare("SELECT id FROM song").all();
    const songsWithoutLyrics = db
        .prepare("SELECT id FROM song WHERE lyrics IS NULL")
        .all();
    const errors = db
        .prepare("SELECT id, dateAdded FROM error")
        .all() as ErrorDB[];

    const tables = db
        .prepare("SELECT name FROM sqlite_schema WHERE type='table'")
        .all() as { name: string }[];

    const databaseBackups = (
        await fs.readdir("database", { withFileTypes: true })
    )
        .map((entry) => entry.name)
        .filter((name) => name != "database.db");

    databaseBackups.sort();

    let downloaderStatus:
        | {
              queueLength: number;
              maxDownloadThreads: number;
          }
        | undefined = undefined;

    try {
        const response = await fetch(ENV.BACKEND_URL + "/status", {
            signal: AbortSignal.timeout(5000),
        });
        downloaderStatus = await response.json();
    } catch {}

    const gradientTextClass =
        "bg-clip-text text-xl mr-2 font-bold [-webkit-text-fill-color:transparent] [background-image:-webkit-linear-gradient(0deg,#fb6467,#ee1086)]";

    return (
        <div className="mt-0 mb-0 flex h-full flex-col gap-y-1 overflow-y-auto p-2 md:pt-24 md:pb-24">
            <div className="min-h-20 md:hidden"></div>
            <Masonry gap={5} minColumnWidth={400}>
                <div className="flex flex-col items-center rounded bg-neutral-700 p-2">
                    <label className="w-full text-lg font-semibold">
                        Users
                    </label>
                    <div>
                        <label className={gradientTextClass}>
                            {users.length}
                        </label>
                        <label>Users</label>
                    </div>

                    <Link href="/admin/user" className="relative w-full">
                        <LinkIcon className="relative right-0 ml-auto" />
                    </Link>
                </div>
                <div className="flex flex-col items-center rounded bg-neutral-700 p-2">
                    <label className="w-full text-lg font-semibold">
                        Songs
                    </label>

                    <div>
                        <label className={gradientTextClass}>
                            {songs.length}
                        </label>
                        <label>Songs</label>
                    </div>
                    <div>
                        <label className={gradientTextClass}>
                            {songs.length - songsWithoutLyrics.length}
                        </label>
                        <label>Songs with lyrics</label>
                    </div>

                    <Link href="/admin/songs" className="relative w-full">
                        <LinkIcon className="relative right-0 ml-auto" />
                    </Link>
                </div>

                <div className="flex flex-col items-center rounded bg-neutral-700 p-2">
                    <label className="w-full text-lg font-semibold">
                        Lists
                    </label>

                    <div>
                        <label className={gradientTextClass}>
                            {albums.length + playlists.length}
                        </label>
                        <label>Lists</label>
                    </div>
                    <div>
                        <label className={gradientTextClass}>
                            {albums.length}
                        </label>
                        <label>Albums</label>
                    </div>
                    <div>
                        <label className={gradientTextClass}>
                            {playlists.length}
                        </label>
                        <label>Playlists</label>
                    </div>

                    <Link href="/admin/lists" className="relative w-full">
                        <LinkIcon className="relative right-0 ml-auto" />
                    </Link>
                </div>

                <div className="flex flex-col items-center rounded bg-neutral-700 p-2">
                    <label className="w-full text-lg font-semibold">
                        Error log
                    </label>

                    <div>
                        <label className={gradientTextClass}>
                            {errors.length}
                        </label>
                        <label>Errors</label>
                    </div>
                    <div>
                        <label className={gradientTextClass}>
                            {
                                errors.filter(
                                    (error) =>
                                        error.dateAdded >
                                        new Date().getTime() -
                                            1000 * 60 * 60 * 24 * 7
                                ).length
                            }
                        </label>
                        <label>Erros since last week</label>
                    </div>

                    <Link href="/admin/error" className="relative w-full">
                        <LinkIcon className="relative right-0 ml-auto" />
                    </Link>
                </div>
                <div className="flex flex-col items-center rounded bg-neutral-700 p-2">
                    <label className="w-full text-lg font-semibold">DB</label>

                    <div>
                        <label className={gradientTextClass}>
                            {tables.length}
                        </label>
                        <label>Tables</label>
                    </div>
                    <div className="grid grid-cols-3 gap-x-3">
                        {tables.map((table) => {
                            const count = db
                                .prepare(`SELECT id FROM ${table.name}`)
                                .all().length;

                            return (
                                <Link
                                    key={table.name}
                                    href={`/admin/db/current/${table.name}`}
                                    className="flex flex-row items-baseline justify-between gap-x-1 text-sm"
                                >
                                    <label className="md:hover:underline">
                                        {table.name}
                                    </label>
                                    <label className={gradientTextClass}>
                                        {count}
                                    </label>
                                </Link>
                            );
                        })}
                    </div>

                    <Link href="/admin/db/current" className="relative w-full">
                        <LinkIcon className="relative right-0 ml-auto" />
                    </Link>
                </div>
                <div className="flex flex-col items-center rounded bg-neutral-700 p-2">
                    <label className="w-full text-lg font-semibold">
                        DB Backups
                    </label>

                    <div className="flex flex-col">
                        {databaseBackups.map((fileName) => (
                            <Link
                                key={fileName}
                                className="flex flex-row gap-1"
                                href={`/admin/db/${fileName}`}
                            >
                                <DatabaseBackup></DatabaseBackup>
                                <label>{fileName}</label>
                            </Link>
                        ))}
                    </div>

                    <div className="w-full">
                        <NewBackupButton />
                    </div>
                </div>
                {downloaderStatus && (
                    <div className="flex flex-col items-center rounded bg-neutral-700 p-2">
                        <label className="w-full text-lg font-semibold">
                            Downloader
                        </label>
                        <label>
                            Songs in queue: {downloaderStatus.queueLength}
                        </label>
                        <label>
                            Threads: {downloaderStatus.maxDownloadThreads}
                        </label>
                        <Link
                            href="/admin/downloads"
                            className="relative w-full"
                        >
                            <LinkIcon className="relative right-0 ml-auto" />
                        </Link>
                    </div>
                )}
            </Masonry>
            <div className="min-h-24 md:hidden"></div>
        </div>
    );
}
