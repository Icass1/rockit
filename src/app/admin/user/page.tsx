import { getSession } from "@/lib/utils/auth/getSession";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function AdminUsersPage() {
    const session = await getSession();

    if (!session?.user?.admin) {
        notFound();
    }

    const users = db
        .prepare("SELECT username,admin,id FROM user")
        .all() as UserDB<"username" | "admin" | "id">[];

    return (
        <div className="h-full overflow-y-auto p-2 pt-16 pb-16 md:mt-0 md:mb-0 md:pt-24 md:pb-24">
            <div className="mx-auto flex max-w-[700px] flex-col gap-y-2 rounded p-2">
                <label className="text-xl font-semibold">Users</label>

                {users.map((user) => (
                    <Link
                        key={user.id}
                        className="grid grid-cols-[30px_1fr_20px] items-center gap-x-2 rounded px-3 py-2 md:bg-white/5 md:hover:bg-white/10"
                        href={`/admin/user/${user.id}`}
                    >
                        <Image
                            alt=""
                            src="/user-placeholder.png"
                            className="rounded-full"
                        />
                        <div className="flex flex-col gap-y-0">
                            <label>{user.username}</label>
                            {user.admin ? (
                                <label className="w-fit rounded bg-neutral-500 px-[4px] py-[1px] text-xs">
                                    Admin
                                </label>
                            ) : (
                                ""
                            )}
                        </div>
                        <ArrowRight />
                    </Link>
                ))}
            </div>
        </div>
    );
}
