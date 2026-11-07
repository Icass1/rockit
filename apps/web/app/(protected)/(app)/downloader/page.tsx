import type { JSX } from "react";
import { redirect } from "next/navigation";
import { getUserInServer } from "@/lib/getUserInServer";
import DownloaderClient from "@/components/Downloader/DownloaderClient";

export default async function DownloaderPage(): Promise<JSX.Element> {
    if (!(await getUserInServer())) redirect("/login");
    return <DownloaderClient />;
}
