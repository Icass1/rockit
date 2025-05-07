"use client";

import { DownloadDB } from "@/lib/db/download";
import { useEffect, useState } from "react";
import Image from "../Image";
import { getImageUrl } from "@/lib/getImageUrl";
import Link from "next/link";

export default function DownloadElement({
    download,
}: {
    download: DownloadDB;
}) {
    const [name, setName] = useState("");
    const [cover, setCover] = useState("");
    const [artistOwner, setArtistOwner] = useState("");
    const [type, setType] = useState("");

    useEffect(() => {
        if (download.downloadURL.includes("open.spotify.com/album")) {
            const albumId = download.downloadURL.replace(
                "https://open.spotify.com/album/",
                ""
            );

            setType("Spotify Album");

            fetch(`/api/album/${albumId}`)
                .then((response) => response.json())
                .then((data) => {
                    setName(data.name);
                    setCover(data.image);
                    setArtistOwner(
                        data.artists.map(
                            (artist: { name: string }) => artist.name
                        )
                    );
                });

            console.log("Album", download.downloadURL);
        } else if (download.downloadURL.includes("open.spotify.com/track")) {
            const songId = download.downloadURL.replace(
                "https://open.spotify.com/track/",
                ""
            );
            setType("Spotify Song");

            fetch(`/api/song/${songId}?q=name,image,artists`)
                .then((response) => response.json())
                .then((data) => {
                    setName(data.name);
                    setCover(data.image);
                    setArtistOwner(
                        data.artists.map(
                            (artist: { name: string }) => artist.name
                        )
                    );
                });
        }
    }, [download.downloadURL]);

    return (
        <Link
            href={`/downloader/${download.id}`}
            className="grid cursor-pointer grid-cols-[2.5rem_1fr] grid-rows-[min-content_1.5rem_1rem_1fr] items-center rounded bg-neutral-700 p-2 transition-colors hover:bg-neutral-800"
            style={{
                gridTemplateAreas: `
                    "download-element-type download-element-type"
                    "download-element-cover download-element-name"
                    "download-element-cover download-element-artist-owner"
                    "download-element-download-url download-element-download-url"
                    `,
            }}
        >
            <div
                style={{ gridArea: "download-element-cover" }}
                className={
                    "h-full max-h-full min-h-0 w-full max-w-full min-w-0" +
                    (cover ? "" : " skeleton")
                }
            >
                {cover && (
                    <Image
                        src={getImageUrl({
                            imageId: cover,
                            width: 40,
                            height: 40,
                        })}
                        alt="cover"
                        className="relative h-full w-full rounded"
                    />
                )}
            </div>
            <label
                style={{ gridArea: "download-element-type" }}
                className={
                    "px-1 pb-1 text-xs" +
                    (type ? "" : " skeleton mx-1 mb-1 min-h-4 w-1/3")
                }
            >
                {type}
            </label>
            <label
                style={{
                    gridArea: "download-element-name",
                }}
                className={
                    "w-1/2 px-1" +
                    (name ? "" : " skeleton mx-1 h-4/5 max-h-full min-h-0")
                }
            >
                {name}
            </label>
            <label
                style={{ gridArea: "download-element-artist-owner" }}
                className={
                    "px-1 text-sm " +
                    (artistOwner
                        ? ""
                        : " skeleton mx-1 h-4/5 max-h-full min-h-0 w-1/3")
                }
            >
                {artistOwner}
            </label>
            <label
                style={{ gridArea: "download-element-download-url" }}
                className="text-xs"
            >
                {download.downloadURL}
            </label>
        </Link>
    );
}
