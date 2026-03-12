import { notFound } from "next/navigation";
import { getUserInServer } from "@/lib/getUserInServer";
import DownloaderClient from "@/components/Downloader/DownloaderClient";

export const metadata = {
    title: "Downloader — RockIt",
};

export default async function DownloaderPage() {
    const user = await getUserInServer();
    if (!user) notFound();

    return <DownloaderClient />;
}