import { JSX } from "react";
import { getInitialLibrary } from "@/lib/server/library";
import LibraryClient from "@/components/Library/LibraryClient";

export default async function LibraryPage(): Promise<JSX.Element> {
    return <LibraryClient initialData={await getInitialLibrary()} />;
}
