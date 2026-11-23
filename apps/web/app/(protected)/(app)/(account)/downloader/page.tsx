import type { JSX } from "react";
import { getUserInServer } from "@/lib/getUserInServer";
import DownloaderClient from "@/components/Downloader/DownloaderClient";

export default async function DownloaderPage(): Promise<JSX.Element> {
    if (!(await getUserInServer())) return <></>;
    return <DownloaderClient />;
}
