
import { useStore } from '@nanostores/react';
import { searchResults } from '@/stores/searchResults';

import type { SpotifyAlbum, SpotifyTrack } from "@/types/spotify";

function RenderTrackSearchResults({ tracksInfo, handleDownload }: { tracksInfo: SpotifyTrack[], handleDownload: (url: string) => void }) {
    const handleClick = (element: SpotifyTrack) => {
        handleDownload(element.external_urls.spotify)
    }

    return (
        <div
            className="grid xl:grid-cols-3 lg:grid-cols-2 md:grid-cols-1 gap-2 mt-2 mb-5 h-fit"
        >
            {tracksInfo.map((element, index) =>
                <div
                    key={'element' + element.uri + index}
                    onClick={() => { handleClick(element) }}
                    className="flex flex-row h-12 rounded overflow-hidden gap-x-2 bg-zinc-700 hover:bg-zinc-500/60 transition-colors cursor-pointer"
                >
                    <img className="aspect-square w-auto h-full" src={element.album.images[0].url}></img>
                    <div className="flex flex-col text-white min-w-0 max-w-full">
                        <label className="text-base font-semibold truncate">{element.name}</label>
                        <label className="text-sm truncate">{element.artists && element.artists.map(artist => artist.name).join(", ")}</label>
                    </div>
                </div>
            )}
        </div>

    )
}
function RenderAlbumSearchResults({ tracksInfo, handleDownload }: { tracksInfo: SpotifyAlbum[], handleDownload: (url: string) => void }) {
    const handleClick = (element: SpotifyAlbum) => {
        handleDownload(element.external_urls.spotify)
    }

    return (
        <div
            className="grid xl:grid-cols-3 lg:grid-cols-2 md:grid-cols-1 gap-2 mt-2 mb-5 h-fit"
        >
            {tracksInfo.map((element, index) =>
                <div
                    key={'element' + element.uri + index}
                    onClick={() => { handleClick(element) }}
                    className="flex flex-row h-12 rounded overflow-hidden gap-x-2 bg-zinc-700 hover:bg-zinc-500/60 transition-colors cursor-pointer"
                >
                    <img className="aspect-square w-auto h-full" src={element.images[0].url}></img>
                    <div className="flex flex-col text-white min-w-0 max-w-full">
                        <label className="text-base font-semibold truncate">{element.name}</label>
                        <label className="text-sm truncate">{element.artists && element.artists.map(artist => artist.name).join(", ")}</label>
                    </div>
                </div>
            )}
        </div>

    )
}

export default function RenderSearchResults() {

    const $searchResults = useStore(searchResults);

    const handleDownload = (url: string) => {

    }

    return (
        ($searchResults.songs == undefined && $searchResults.albums == undefined) ?
            <div>
            </div>
            :
            <div
                className="h-fit bg-neutral-800 absolute w-4/5 left-1/2 -translate-x-1/2 top-1/2 rounded-b-xl flex flex-col pt-7 pb-2 px-2 gap-2 z-50"
            >
                {
                    $searchResults.songs &&
                    <>
                        <label className="font-bold text-xl text-white ">Songs</label>
                        <RenderTrackSearchResults tracksInfo={$searchResults.songs.slice(0, 2)} handleDownload={handleDownload} />
                    </>
                }
                {
                    $searchResults.songs &&
                    <>
                        <label className="font-bold text-xl text-white ">Albums</label>
                        <RenderAlbumSearchResults tracksInfo={$searchResults.albums.slice(0, 2)} handleDownload={handleDownload} />
                    </>
                }
            </div >
    )
}