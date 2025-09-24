import ToggleButtons from "@/components/Admin/ToggleButtons";
import Image from "@/components/Image";
import { getSession } from "@/lib/utils/auth/getSession";
import { db } from "@/lib/db/db";
import { parseUser, RawUserDB, UserDB } from "@/lib/db/user";
import { notFound } from "next/navigation";

export default async function AdminUserPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const session = await getSession();

    if (!session?.user?.admin) {
        notFound();
    }

    const user = parseUser(
        db
            .prepare(
                "SELECT id, username, admin, queue, randomQueue FROM user WHERE id = ?"
            )
            .get(id) as RawUserDB
    ) as UserDB<"id" | "username" | "admin" | "randomQueue" | "queue">;

    return (
        <div className="h-full overflow-y-auto p-2 pt-16 pb-16 md:mt-0 md:mb-0 md:pt-24 md:pb-24">
            <div className="mx-auto flex max-w-[700px] flex-col gap-y-2 rounded p-2">
                <div className="flex flex-row gap-x-3">
                    <Image
                        alt="User image"
                        src="/user-placeholder.png"
                        className="h-20 rounded-full"
                    />
                    <label className="text-4xl font-bold">
                        {user.username}
                    </label>
                </div>
                <div className="flex w-full flex-col rounded bg-white/10 p-2">
                    <label className="text-xl font-semibold">Queue</label>
                    {user.queue.length > 0 ? (
                        <>
                            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                {user.queue.slice(0, 10).map((song) => (
                                    <div
                                        key={song.song}
                                        className="rounded p-2 md:hover:bg-neutral-700"
                                    >
                                        {song.song}
                                    </div>
                                ))}
                            </div>
                            <label className="mr-2 ml-auto text-blue-400">
                                See all queue
                            </label>
                        </>
                    ) : (
                        <label className="text-sm">
                            User has no songs in queue
                        </label>
                    )}
                </div>
                <ToggleButtons />
                <div className="flex flex-row justify-between">
                    <button
                        disabled={user.id == session.user.id}
                        className="w-fit rounded bg-blue-500 p-2 disabled:opacity-50"
                    >
                        Impersonate
                    </button>
                    <button className="w-fit rounded bg-blue-500 p-2 disabled:opacity-50">
                        See stats
                    </button>
                    <button className="w-fit rounded bg-blue-500 p-2 disabled:opacity-50">
                        See more info
                    </button>
                </div>
            </div>
        </div>
    );
}
