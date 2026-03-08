"use server";

import Image from "next/image";
import {
    BaseArtistResponse,
    BaseSongWithAlbumResponse,
    BaseVideoResponse,
} from "@/dto";
import Artists from "@/components/Artists/Artists";

export async function Song({ index }: { index: number }) {
    return (
        <div className="m-1 bg-red-300 p-1 hover:bg-gray-800">Song {index}</div>
    );
}

export default async function RenderList({
    title,
    artists,
    info,
    image,
    media,
}: {
    title: string;
    artists: BaseArtistResponse[];
    info: string;
    image: string;
    media: (BaseSongWithAlbumResponse | BaseVideoResponse)[];
}) {
    // const mockArtists: BaseArtistResponse[] = [
    //     {
    //         provider: "Mock",
    //         name: "tst 2",
    //         publicId: "1",
    //         url: "as",
    //         internalImageUrl: "AS",
    //     },
    // ];

    const mockArtists: BaseArtistResponse[] = Array(10)
        .fill(1)
        .map((a, index) => {
            return {
                provider: "Mock",
                name: "tst " + index,
                publicId: `Public id ${index}`,
                url: "as",
                internalImageUrl: "AS",
            };
            1;
        });

    return (
        <div className="grid h-full w-full grid-cols-[1fr_4fr] bg-red-400">
            <div className="h-full w-full min-w-0 max-w-full pb-24 pt-24">
                <div className="relative h-full w-full bg-blue-500">
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
                        <Artists artists={mockArtists}></Artists>
                    </div>
                </div>
            </div>
            <div className="flex h-full w-full min-w-0 max-w-full flex-col gap-2 overflow-y-auto bg-green-400 pb-96 pt-24">
                {Array(100)
                    .fill(1)
                    .map((_, i) => (
                        <Song key={i} index={i}></Song>
                    ))}
            </div>
        </div>
    );
}
