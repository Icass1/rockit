import ClearDownloads from "@/components/Downloader/ClearDownloads";
import DownloadElement from "@/components/Downloader/DownloadElement";
import InputBar from "@/components/Downloader/InputBar";
import Image from "@/components/Image";
import { getSession } from "@/lib/auth/getSession";
import { db } from "@/lib/db/db";
import { parseDownload, RawDownloadDB } from "@/lib/db/download";
import { getLang } from "@/lib/getLang";
import { RotateCw } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function Downloads() {
    const session = await getSession();

    if (!session?.user) {
        redirect("/login");
    }

    const lang = await getLang(session?.user?.lang || "en");

    const downloads = db
        .prepare("SELECT * FROM download WHERE userId = ? AND seen = 0")
        .all(session.user.id)
        .map((entry) => parseDownload(entry as RawDownloadDB));

    return (
        <div className="relative mx-auto h-full w-[500px] overflow-y-auto bg-neutral-900 md:pt-24 md:pb-24">
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
                            key={download.id}
                            download={download}
                        />
                    );
                })}
            </div>
            <div className="min-h-10" />
        </div>
    );
}
