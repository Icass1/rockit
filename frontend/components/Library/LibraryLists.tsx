"use client";

import Image from "next/image";
import Link from "next/link";
import { rockIt } from "@/lib/rockit/rockIt";
import { RockItAlbumWithoutSongs } from "@/lib/rockit/rockItAlbumWithoutSongs";
import { RockItPlaylist } from "@/lib/rockit/rockItPlaylist";
import NewPlaylistButton from "@/components/Library/NewPlaylistButton";
import { useLanguage } from "@/contexts/LanguageContext";
import { LibraryListsResponse } from "@/dto/libraryListsResponse";
import useFetch from "@/hooks/useFetch";
import useWindowSize from "@/hooks/useWindowSize";
import { useStore } from "@nanostores/react";
import {
    HardDriveDownload,
    Library,
    ListEnd,
    ListStart,
    PinIcon,
    PinOff,
    PlayCircle,
    Shuffle,
} from "lucide-react";
import ContextMenuContent from "../ContextMenu/Content";
import ContextMenu from "../ContextMenu/ContextMenu";
import ContextMenuOption from "../ContextMenu/Option";
import ContextMenuSplitter from "../ContextMenu/Splitter";
import ContextMenuTrigger from "../ContextMenu/Trigger";
import PlayLibraryButton from "./PlayLibraryButton";

function AddListContextMenu({
    children,
    list,
}: {
    children: React.ReactNode;
    list: RockItPlaylist | RockItAlbumWithoutSongs;
}) {
    const $pinnedLists = useStore(rockIt.listManager.pinnedListsAtom);

    return (
        <ContextMenu>
            <ContextMenuTrigger>{children}</ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuOption
                    onClick={() =>
                        rockIt.listManager.playAsync(list.type, list.publicId)
                    }
                >
                    <PlayCircle className="h-5 w-5" />
                    Play {list.type}
                </ContextMenuOption>
                <ContextMenuSplitter />
                <ContextMenuOption
                    onClick={() =>
                        rockIt.queueManager.addListToTopAsync(
                            list.type,
                            list.publicId
                        )
                    }
                >
                    <ListStart className="h-5 w-5" />
                    Add list to top of queue
                </ContextMenuOption>
                <ContextMenuOption
                    onClick={() =>
                        rockIt.queueManager.addListRandomAsync(
                            list.type,
                            list.publicId
                        )
                    }
                >
                    <Shuffle className="h-5 w-5" />
                    Add list to queue randomly
                </ContextMenuOption>
                <ContextMenuOption
                    onClick={() =>
                        rockIt.queueManager.addListToBottomAsync(
                            list.type,
                            list.publicId
                        )
                    }
                >
                    <ListEnd className="h-5 w-5" />
                    Add list to bottom of queue
                </ContextMenuOption>

                <ContextMenuSplitter />

                <ContextMenuOption
                    onClick={() =>
                        rockIt.listManager.removeListFromLibraryAsync(
                            list.type,
                            list.publicId
                        )
                    }
                >
                    <Library className="h-5 w-5" />
                    Remove from library
                </ContextMenuOption>
                {$pinnedLists.find(
                    (_list) => _list.publicId == list.publicId
                ) ? (
                    <ContextMenuOption
                        onClick={() => {
                            rockIt.listManager.unPinListAsync(
                                list.type,
                                list.publicId
                            );
                        }}
                    >
                        <PinOff className="h-5 w-5" />
                        Unpin
                    </ContextMenuOption>
                ) : (
                    <ContextMenuOption
                        onClick={() => {
                            rockIt.listManager.pinListAsync(
                                list.type,
                                list.publicId
                            );
                        }}
                    >
                        <PinIcon className="h-5 w-5" />
                        Pin
                    </ContextMenuOption>
                )}

                <ContextMenuSplitter />

                <ContextMenuOption
                    onClick={() =>
                        rockIt.listManager.downloadListToDeviceAsync(
                            list.type,
                            list.publicId
                        )
                    }
                >
                    <HardDriveDownload className="h-5 w-5" />
                    Download list to device
                </ContextMenuOption>
                {list.type == "album" && (
                    <ContextMenuOption
                        onClick={() =>
                            rockIt.listManager.downloadListZipAsync(
                                list.type,
                                list.publicId
                            )
                        }
                    >
                        <HardDriveDownload className="h-5 w-5" />
                        Download ZIP
                    </ContextMenuOption>
                )}
            </ContextMenuContent>
        </ContextMenu>
    );
}

export function LibraryLists({
    filterMode,
    searchQuery,
}: {
    filterMode: "default" | "asc" | "desc";
    searchQuery: string;
}) {
    console.log("LibraryLists", { filterMode, searchQuery });

    const { width } = useWindowSize();
    const { langFile: lang } = useLanguage();

    const [listsResponse] = useFetch(
        "/user/library/lists",
        LibraryListsResponse
    );
    if (!listsResponse) return <div>LibraryLists.listsResponse Loading...</div>;

    const lists = {
        albums: listsResponse.albums.map((album) =>
            RockItAlbumWithoutSongs.fromResponse(album)
        ),
        playlists: listsResponse.playlists.map((playlist) =>
            RockItPlaylist.fromResponse(playlist)
        ),
    };

    const filteredLists = lists;

    if (!width || !lang || !filteredLists)
        return <div>LibraryLists.(width, lang, filteredLists) Loading...</div>;

    return (
        <section>
            <div className="flex flex-row items-center justify-between px-5 py-4 md:px-0">
                <h2 className="text-2xl font-bold">
                    {lang.your_albums_playlists}
                </h2>
                <PlayLibraryButton />
            </div>
            <div
                className="grid gap-x-5 gap-y-3 px-5"
                style={{
                    gridTemplateColumns:
                        width < 768
                            ? "repeat(auto-fill, minmax(40%, 1fr))"
                            : "repeat(auto-fill, minmax(200px, 1fr))",
                }}
            >
                <NewPlaylistButton />

                {filteredLists.playlists.map((playlist, index) => (
                    <AddListContextMenu
                        key={"playlist" + index}
                        list={playlist}
                    >
                        <Link
                            href={`/playlist/${playlist.publicId}`}
                            className="library-item flex h-auto w-full max-w-full min-w-0 flex-col transition-transform md:hover:scale-110"
                        >
                            <Image
                                alt={playlist.name}
                                className="cover aspect-square h-auto w-full rounded-md"
                                src={
                                    playlist.internalImageUrl ??
                                    rockIt.PLAYLIST_PLACEHOLDER_IMAGE_URL
                                }
                                width={600}
                                height={600}
                            />
                            <label className="min-h-6 truncate text-center font-semibold">
                                {playlist.name}
                            </label>
                            <label className="min-h-5 truncate text-center text-sm text-gray-400">
                                {playlist.owner}
                            </label>
                        </Link>
                    </AddListContextMenu>
                ))}

                {filteredLists.albums.map((album, index) => (
                    <AddListContextMenu key={"album" + index} list={album}>
                        <Link
                            key={"album" + index}
                            href={`/album/${album.publicId}`}
                            className="library-item flex h-auto w-full max-w-full min-w-0 flex-col transition-transform md:hover:scale-110"
                        >
                            <Image
                                alt={album.name}
                                className="cover aspect-square h-auto w-full rounded-md"
                                src={
                                    album.internalImageUrl ??
                                    rockIt.ALBUM_PLACEHOLDER_IMAGE_URL
                                }
                                width={600}
                                height={600}
                            />
                            <label className="mt-1 truncate text-center font-semibold">
                                {album.name}
                            </label>
                            <div className="mx-auto flex max-w-full flex-row truncate text-center text-sm text-gray-400">
                                {album.artists.map((artist, i) => (
                                    <label
                                        key={album.publicId + artist.publicId}
                                        className="truncate md:hover:underline"
                                    >
                                        {artist.name}
                                        {i < album.artists.length - 1
                                            ? ", "
                                            : ""}
                                    </label>
                                ))}
                            </div>
                        </Link>
                    </AddListContextMenu>
                ))}
            </div>
            <div className="min-h-10" />
        </section>
    );
}
