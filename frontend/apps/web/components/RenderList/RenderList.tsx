import Image from "next/image";
import {
    BaseArtistResponse,
    BaseSongWithAlbumResponse,
    BaseVideoResponse,
} from "@/packages/dto";
import { getTime } from "@/packages/lib/utils/getTime";
import { getMediaDuration } from "@/types/media";
import Artists from "@/components/Artists/Artists";
import LikeButton from "@/components/LikeButton";

export function Media({
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
    const artists = (media.artists ?? []).filter(
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
                    src={media.imageUrl}
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
            <LikeButton mediaPublicId={media.publicId}></LikeButton>
            <div>{getTime(getMediaDuration(media) ?? 0)}</div>
        </div>
    );
}

export default function RenderList({
    title,
    artists,
    image,
    imageBlur,
    media,
    showMediaIndex,
    showMediaImage,
}: {
    title: string;
    artists: BaseArtistResponse[];
    image: string;
    imageBlur?: string;
    media: (BaseSongWithAlbumResponse | BaseVideoResponse)[];
    showMediaIndex: boolean;
    showMediaImage: boolean;
}) {
    return (
        <div className="grid h-full w-full grid-cols-[1fr_3fr] gap-4">
            <div className="z-1 h-full w-full max-w-full min-w-0">
                <div className="relative h-full w-full">
                    <div className="relative top-1/2 left-1/2 flex h-fit w-fit -translate-x-1/2 -translate-y-1/2 flex-col p-1">
                        {/* Blurred glow layer */}
                        <div className="relative">
                            <Image
                                src={image}
                                alt=""
                                aria-hidden="true"
                                width={600}
                                height={600}
                                className="absolute inset-0 -z-10 scale-105 rounded-lg opacity-70 blur-3xl saturate-150"
                            />
                            {/* Main image */}
                            <Image
                                src={image}
                                alt={title}
                                width={600}
                                height={600}
                                className="relative rounded-lg"
                                // placeholder={imageBlur ? "blur" : "empty"}
                                // blurDataURL={imageBlur}
                            />
                        </div>
                        <span className="px-2 text-center text-2xl font-bold">
                            {title}
                        </span>
                        <Artists artists={artists}></Artists>
                    </div>
                </div>
            </div>
            <div className="z-1 flex h-full w-full max-w-full min-w-0 flex-col gap-4 overflow-y-auto pb-96">
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
