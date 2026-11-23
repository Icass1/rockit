import { JSX } from "react";
import { getUserInServer } from "@/lib/getUserInServer";
import { getInitialLibrary } from "@/lib/server/library";
import LibraryClient from "@/components/Library/LibraryClient";

export default async function LibraryPage(): Promise<JSX.Element> {
    if (!(await getUserInServer())) return <></>;
    return <LibraryClient initialData={await getInitialLibrary()} />;
}
