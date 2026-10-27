"use server";

import { JSX } from "react";
import LibraryClient from "@/components/Library/LibraryClient";

export default async function LibraryPage(): Promise<JSX.Element> {
    return <LibraryClient />;
}
