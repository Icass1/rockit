import RenderAlbum from "@/components/Album/RenderAlbum";
import getAlbum from "@/lib/getAlbum";
import { getImageUrl } from "@/lib/getImageUrl";
import { notFound } from "next/navigation";
import { NextResponse } from "next/server";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params; // No need for await here
    const _album = await getAlbum(id);

    if (_album == "error connecting to backend") {
        return;
    } else if (_album == "not found") {
        return;
    }

    const { album } = _album;

    return {
        title: `${album.name} by ${album.artists[0].name}`,
        description: `Listen to ${album.name} by ${album.artists[0].name}`,
        openGraph: {
            title: `${album.name} by ${album.artists[0].name}`,
            description: `Listen to ${album.name} by ${album.artists[0].name}`,
            type: "music.album",
            url: `https://rockit.rockhosting.org/album/${id}`,
            images: [
                {
                    url:
                        "https://rockit.rockhosting.org" +
                        getImageUrl({ imageId: album.image }),
                    width: 600,
                    height: 600,
                    alt: album.name,
                },
            ],
        },
        twitter: {
            card: "",
            title: `${album.name} by ${album.artists[0].name}`,
            description: `Listen to ${album.name} by ${album.artists[0].name}`,
            images: [
                {
                    url:
                        "https://rockit.rockhosting.org" +
                        getImageUrl({ imageId: album.image }),
                    width: 600,
                    height: 600,
                    alt: album.name,
                },
            ],
        },
    };
}

export default async function AlbumPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params; // No need for await here

    const _album = await getAlbum(id);

    if (_album == "error connecting to backend") {
        return new NextResponse("Error connecting to backend", { status: 500 });
    } else if (_album == "not found") {
        notFound();
    }

    return <RenderAlbum _album={_album}></RenderAlbum>;
}
