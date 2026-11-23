import type { JSX, ReactNode } from "react";
import Link from "next/link";
import { getUserInServer } from "@/lib/getUserInServer";
import { getRequestVocabulary } from "@/lib/server/vocabulary";

export default async function AccountLayout({
    children,
}: {
    children: ReactNode;
}): Promise<JSX.Element> {
    const session = await getUserInServer();
    if (session) return <>{children}</>;
    const { vocabulary } = await getRequestVocabulary();
    return (
        <div className="mx-auto flex max-w-lg flex-col items-center gap-4 p-8 text-center">
            <p>{vocabulary.SHARING_ACCOUNT_REQUIRED}</p>
            <Link className="overlay-action overlay-primary" href="/login">
                {vocabulary.LOG_IN}
            </Link>
        </div>
    );
}
