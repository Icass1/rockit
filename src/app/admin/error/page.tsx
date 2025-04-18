import { getSession } from "@/lib/auth/getSession";
import { db } from "@/lib/db/db";
import { ErrorDB } from "@/lib/db/error";
import { RawUserDB } from "@/lib/db/user";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function AdminErrorPage() {
    const session = await getSession();

    if (!session.user.admin) {
        notFound();
    }

    const headerList = await headers();
    const pathname = headerList.get("x-current-path");

    const url = new URL("http://localhost:1" + pathname);

    const time = url.searchParams.get("time");

    let backTime: number | null = 1000 * 60 * 60 * 24;

    switch (time) {
        case "24H":
            backTime = 1000 * 60 * 60 * 24;
            break;
        case "week":
            backTime = 1000 * 60 * 60 * 24 * 7;
            break;
        case "month":
            backTime = 1000 * 60 * 60 * 24 * 30;
            break;
        case "year":
            backTime = 1000 * 60 * 60 * 24 * 365;
            break;
        case "all-time":
            backTime = null;
            break;
    }

    let errors: ErrorDB[];

    if (backTime) {
        errors = db
            .prepare("SELECT * FROM error WHERE dateAdded > ?")
            .all(new Date().getTime() - backTime) as ErrorDB[];
    } else {
        errors = db.prepare("SELECT * FROM error").all() as ErrorDB[];
    }

    function getDate(date: Date) {
        return (
            date.getDate().toString().padStart(2, "0") +
            "/" +
            (date.getMonth() + 1).toString().padStart(2, "0") +
            "/" +
            date.getFullYear() +
            " " +
            date.getHours().toString().padStart(2, "0") +
            ":" +
            date.getMinutes().toString().padStart(2, "0") +
            ":" +
            date.getSeconds().toString().padStart(2, "0")
        );
    }

    function getUserName(id: string | undefined): string | undefined {
        if (!id) return;
        return (
            db.prepare("SELECT username FROM user WHERE id = ?").get(id) as
                | RawUserDB
                | undefined
        )?.username;
    }

    errors.sort((a, b) => b.dateAdded - a.dateAdded);

    return (
        <div className="flex h-full flex-col gap-y-2 overflow-y-auto p-4 pt-16 pb-16 md:mt-0 md:mb-0 md:pt-24 md:pb-24">
            <label className="text-xl font-semibold">Errors</label>
            <div className="flex flex-row gap-x-1">
                <Link
                    className={
                        "rounded p-1 text-sm" +
                        (backTime == 1000 * 60 * 60 * 24
                            ? " bg-neutral-500"
                            : " bg-neutral-700")
                    }
                    href="?time=24H"
                >
                    Last 24H
                </Link>
                <Link
                    className={
                        "rounded p-1 text-sm" +
                        (backTime == 1000 * 60 * 60 * 24 * 7
                            ? " bg-neutral-500"
                            : " bg-neutral-700")
                    }
                    href="?time=week"
                >
                    Last week
                </Link>
                <Link
                    className={
                        "rounded p-1 text-sm" +
                        (backTime == 1000 * 60 * 60 * 24 * 30
                            ? " bg-neutral-500"
                            : " bg-neutral-700")
                    }
                    href="?time=month"
                >
                    Last month
                </Link>
                <Link
                    className={
                        "rounded p-1 text-sm" +
                        (backTime == 1000 * 60 * 60 * 24 * 365
                            ? " bg-neutral-500"
                            : " bg-neutral-700")
                    }
                    href="?time=year"
                >
                    Last year
                </Link>
                <Link
                    className={
                        "rounded p-1 text-sm" +
                        (backTime == null
                            ? " bg-neutral-500"
                            : " bg-neutral-700")
                    }
                    href="?time=all-time"
                >
                    All time
                </Link>
            </div>
            {errors.length == 0 && (
                <label className="mt-40 w-full text-center text-2xl font-semibold">
                    No errors found.
                </label>
            )}
            {errors.map((error) => (
                <div
                    key={error.id}
                    className="relative flex flex-col gap-y-2 rounded bg-[#4e3534] p-1 outline-[1px] outline-red-400 md:hover:outline"
                >
                    <label className="text-[#fd807b]">{error.msg}</label>

                    <div className="flex flex-col rounded bg-[#523130] p-1">
                        {error.errorStack?.split("\n").map((line, index) => (
                            <div
                                key={error.id + index}
                                className="grid grid-cols-[20px_1px_1fr] gap-x-1"
                            >
                                <label className="text-center">
                                    {index + 1}
                                </label>
                                <div className="bg-red-300" />
                                <label className="block w-full max-w-full min-w-0 break-words whitespace-pre-wrap">
                                    {line}
                                </label>
                            </div>
                        ))}
                        {!error.errorStack && <label>No error stack</label>}
                        {/* <label className="whitespace-pre-wrap w-full block break-words">{error.errorStack}</label> */}
                    </div>
                    <div className="flex flex-row items-center">
                        <label className="mr-auto ml-1 block w-fit">
                            {getDate(new Date(error.dateAdded))}
                        </label>
                        <label className="mr-1 ml-auto block truncate [direction:rtl]">
                            {error.source?.split("/").at(-1)}:{error.lineNo}
                            {!error.source && <label>No error source</label>}
                        </label>
                    </div>
                    <label>
                        User ID:{" "}
                        <label className="md:hover:underline">
                            {error.userId} {getUserName(error.userId) ?? ""}
                        </label>
                    </label>
                </div>
            ))}
            <div className="min-h-10" />
        </div>
    );
}
