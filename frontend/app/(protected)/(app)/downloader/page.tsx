import ClearDownloads from "@/components/Downloader/ClearDownloads";
import DownloadElement from "@/components/Downloader/DownloadElement";
import InputBar from "@/components/Downloader/InputBar";
import SongsStatus from "@/components/Downloader/SongsStatus";
import { rockIt } from "@/lib/rockit/rockIt";
import { getUserInServer } from "@/lib/getUserInServer";
import { Lang } from "@/types/lang";
import { RotateCw } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

async function getLanguage(): Promise<{ lang: string; langFile: Lang }> {
    const res = await fetch("http://localhost:3000/api/lang", {
        cache: "no-store",
    });
    return res.json();
}

export default async function Downloads() {
    const user = await getUserInServer();

    if (!user) {
        console.warn("Downloads -> /login");
        redirect("/login");
    }

    const language = await getLanguage();
    const lang = language.langFile;

    const downloads = await rockIt.downloaderManager.getDownloadsAsync();

    return (
        <div className="grid h-full grid-cols-2 gap-x-10 overflow-y-auto px-10 md:pb-24 md:pt-24">
            <div className="sticky top-0 h-fit w-full min-w-0 max-w-full rounded bg-neutral-900 p-2">
                <div className="mt-5 flex justify-center gap-6">
                    <Image
                        width={30}
                        height={30}
                        src="/youtube-music-logo.svg"
                        alt="YouTube Music Logo"
                        className="h-6 object-contain"
                    />
                    <Image
                        width={30}
                        height={30}
                        src="/spotify-logo.png"
                        alt="Spotify Logo"
                        className="h-7 object-contain"
                    />
                </div>
                <label className="ml-3 block w-fit py-3 text-3xl font-bold">
                    Music Downloader
                </label>

                <InputBar></InputBar>
                <div className="mx-2 mb-4 flex items-center justify-between">
                    <div className="flex flex-row items-center gap-2">
                        <label className="text-lg font-bold text-white">
                            {lang.latest_downloads}
                        </label>
                        <Link href={"#"}>
                            <RotateCw className="h-4 w-4"></RotateCw>
                        </Link>
                    </div>

                    <ClearDownloads></ClearDownloads>
                </div>
                <div className="flex flex-col gap-2">
                    {downloads.map((download) => {
                        if (!download) return false;

                        return (
                            <DownloadElement
                                key={download.publicId}
                                download={download}
                            />
                        );
                    })}
                </div>
                {downloads.length == 0 && (
                    <label className="mx-auto block w-fit text-xl font-semibold text-neutral-300">
                        There is nothing to show here
                    </label>
                )}
                <div className="min-h-10" />
            </div>
            <div className="sticky top-0 h-fit w-full min-w-0 max-w-full rounded bg-neutral-900 p-2">
                <SongsStatus />
            </div>
        </div>
    );
}
