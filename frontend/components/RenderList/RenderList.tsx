"use server";

import Image from "next/image";
import {
    BaseArtistResponse,
    BaseSongWithAlbumResponse,
    BaseVideoResponse,
} from "@/dto";
import { getTime } from "@/lib/utils/getTime";
import Artists from "@/components/Artists/Artists";

export async function Media({
    index,
    media,
    substractArtists = [],
    showMediaIndex,
    showMediaImage,
}: {
    index: number;
    media: BaseSongWithAlbumResponse | BaseVideoResponse;
    substractArtists?: string[];
    showMediaIndex: boolean;
    showMediaImage: boolean;
}) {
    const artists = media.artists.filter(
        (artist) => !substractArtists.includes(artist.name)
    );

    return (
        <div className="flex flex-row items-center gap-4 pr-3">
            {showMediaIndex && (
                <p className="h-fit w-4 text-right text-gray-400">
                    {index + 1}
                </p>
            )}
            {showMediaImage && (
                <Image
                    className="rounded"
                    src={media.internalImageUrl}
                    alt={media.name}
                    width={40}
                    height={40}
                />
            )}
            <div className="flex w-full flex-col">
                <p className="text-md font-semibold">{media.name}</p>
                {artists.length > 0 && (
                    <div className="w-fit">
                        <Artists artists={artists}></Artists>
                    </div>
                )}
            </div>
            <div>{getTime(media.duration)}</div>
        </div>
    );
}

export default async function RenderList({
    title,
    artists,
    image,
    media,
    showMediaIndex,
    showMediaImage,
}: {
    title: string;
    artists: BaseArtistResponse[];
    image: string;
    media: (BaseSongWithAlbumResponse | BaseVideoResponse)[];
    showMediaIndex: boolean;
    showMediaImage: boolean;
}) {
    return (
        <div className="grid h-full w-full grid-cols-[1fr_3fr] gap-4">
            <div className="h-full w-full min-w-0 max-w-full pb-24 pt-24">
                <div className="relative h-full w-full">
                    <div className="relative left-1/2 top-1/2 flex h-fit w-fit -translate-x-1/2 -translate-y-1/2 flex-col p-1">
                        <Image
                            src={image}
                            alt={title}
                            width={600}
                            height={600}
                            className="rounded-lg"
                        />
                        <span className="px-2 text-center text-2xl font-bold">
                            {title}
                        </span>
                        <Artists artists={artists}></Artists>
                    </div>
                </div>
            </div>
            <div className="flex h-full w-full min-w-0 max-w-full flex-col gap-4 overflow-y-auto pb-96 pt-24">
                {media.map((media, index) => (
                    <Media
                        key={media.publicId}
                        index={index}
                        media={media}
                        substractArtists={artists.map((artist) => artist.name)}
                        showMediaImage={showMediaImage}
                        showMediaIndex={showMediaIndex}
                    />
                ))}
            </div>
        </div>
    );
}
