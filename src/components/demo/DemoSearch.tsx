import { useContext, useEffect, useRef, useState, type Dispatch } from "react"
import pkg from 'lodash';
import type { SearchResults, SpotifyAlbum, SpotifyPlaylist, SpotifyTrack } from "@/types";
const { debounce } = pkg;

interface EventSourceStatus {
    message: string
    completed: number
    song: SpotifyTrack
}

function RenderTrackSearchResults({ tracksInfo, handleDownload }: { tracksInfo: SpotifyTrack[], handleDownload: (url: string) => void }) {
    const handleClick = (element: SpotifyTrack) => {
        handleDownload(element.external_urls.spotify)
    }

    return (
        <div
            className="grid grid-cols-2 gap-2 mt-2 mb-5 h-fit"
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
            className="grid grid-cols-2 gap-2 mt-2 mb-5 h-fit"
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

function RenderPlaylistSearchResults({ tracksInfo, handleDownload }: { tracksInfo: SpotifyPlaylist[], handleDownload: (url: string) => void }) {
    const handleClick = (element: SpotifyPlaylist) => {
        handleDownload(element.external_urls.spotify)
    }
    return (
        <div
            className="grid grid-cols-2 gap-2 mt-2 mb-5 h-fit"
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
                        <label className="text-sm truncate">{element.owner.display_name}</label>
                    </div>
                </div>
            )}
        </div>
    )
}

function RenderSongDownload({ songStatus }: { songStatus: [string, EventSourceStatus] }) {

    return (
        <div className="bg-zinc-400/10 rounded h-14 flex flex-row gap-x-2 overflow-hidden">
            <img src={songStatus[1].song?.album?.images[0]?.url} className="h-full w-auto" />
            <div className="flex flex-col w-full p-1 pr-2 min-w-0 max-w-full">
                <label className="truncate min-w-0 max-w-full">{songStatus[1].song?.name} - {songStatus[1].song?.artists.map(artist => artist.name || artist).join(", ")}</label>
                <div className="w-full grid grid-cols-[1fr_max-content] items-center gap-x-2 ">
                    <div className={"bg-gray-500 h-2 w-full rounded-full relative " + (songStatus[1].message == "Error" && "bg-red-400")}>
                        <div className="bg-green-500 absolute h-full rounded-full transition-all" style={{ width: `${songStatus[1].completed}%` }}></div>
                    </div>
                    <label className="w-auto flex-nowrap text-sm"> {songStatus[1].message}</label>
                </div>
            </div>
        </div>
    )
}

function RenderListDownload({ list }: {
    list: [string, {
        listInfo: SpotifyAlbum;
        listError: number;
        totalCompleted: number;
        songs: {
            [key: string]: EventSourceStatus;
        };
    }]
}) {

    const [showAllSongs, setShowAllSongs] = useState(false)

    return (
        <div className="bg-zinc-400/10 min-w-0 max-w-full flex flex-col rounded">
            <div className="flex flex-row h-14 min-w-0 max-w-full gap-2">
                <img src={list[1].listInfo.images[0].url} className="h-full w-auto rounded" />
                <div className="flex flex-col min-w-0 max-w-full w-full pr-1">
                    <label className="text-base font-semibold">{list[1].listInfo.name} </label>
                    <label className="text-sm">{list[1].listInfo.artists.map(artist => artist.name || artist).join(", ")}</label>
                    <div className={"bg-gray-500 h-2 w-full rounded-full relative overflow-hidden"}>
                        <div className="bg-red-400 absolute h-full rounded-full transition-all" style={{ width: `calc(${list[1].listError}% + 20px)`, left: `calc(${list[1].totalCompleted}% - 20px)` }}></div>
                        <div className={"bg-green-500 absolute h-full rounded-full transition-all"} style={{ width: `${list[1].totalCompleted}%` }}></div>
                    </div>
                </div>
            </div>
            <label className="hover:underline text-sm text-blue-500 p-1 select-none" onClick={() => { setShowAllSongs(value => !value) }}>Show {showAllSongs ? "less" : "more"}</label>
            <div className="overflow-auto transition-all " style={{ maxHeight: `${showAllSongs ? 400 : 0}px` }}>
                <div className="flex flex-col gap-2 p-1">
                    {Object.entries(list[1].songs).map(songStatus => (
                        <div key={songStatus[0]} className="bg-zinc-400/10 rounded h-14 flex flex-row gap-x-2 overflow-hidden">
                            <div className="flex flex-col w-full p-1 px-2 min-w-0 max-w-full">
                                <label className="truncate min-w-0 max-w-full">{songStatus[1].song?.name}</label>
                                <div className="w-full grid grid-cols-[1fr_max-content] items-center gap-x-2 ">
                                    <div className={"bg-gray-500 h-2 w-full rounded-full relative " + (songStatus[1].message == "Error" && "bg-red-400")}>
                                        <div className="bg-green-500 absolute h-full rounded-full transition-all" style={{ width: `${songStatus[1].completed}%` }}></div>
                                    </div>
                                    <label className="w-auto flex-nowrap text-sm"> {songStatus[1].message}</label>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

type statusType = { songs: { [key: string]: EventSourceStatus }, lists: { [key: string]: { listInfo: SpotifyAlbum, totalCompleted: number, listError: number, songs: { [key: string]: EventSourceStatus } } } }

export default function DemoSearch({ }) {

    const [value, setValue] = useState("supertamp")
    const [searchResults, setSearchResults] = useState<SearchResults | undefined>(undefined)

    const searchDebounce = useRef<pkg.DebouncedFunc<(query: string) => void>>()

    const [status, setStatus] = useState<statusType>({ songs: {}, lists: {} })

    useEffect(() => {
        searchDebounce.current = debounce((query: string) => {
            search(query)
        }, 1000);
    }, [])

    const search = (query: string) => {
        if (query == "") { return }
        setSearchResults(undefined)

        fetch(`http://localhost:8000/search?q=${query}`).then(data => data.json()).then(json => {
            setSearchResults(json)
        })
    }

    useEffect(() => {
        if (!searchDebounce.current) { return }
        searchDebounce.current(value)
    }, [value])

    const onMessage = (event: MessageEvent<any>, eventSource: EventSource) => {
        const message = JSON.parse(event.data);
        if (message.list == undefined) {
            setStatus((value: statusType) => {
                let newValue = { ...value }
                if (message.id == undefined) {
                }
                else {
                    newValue.songs[message.id] = { completed: message.completed, message: message.message, song: message.song }
                }
                return newValue
            })
            if (message.completed == 100) {
                eventSource.close()
            }
        }
        else {
            setStatus((value: statusType) => {
                let newValue = { ...value }
                if (newValue.lists[message.list.id] == undefined) {
                    newValue.lists[message.list.id] = { listInfo: message.list, totalCompleted: message.list_completed, songs: {}, listError: message.list_error }
                } else {
                    newValue.lists[message.list.id].listInfo = message.list
                    newValue.lists[message.list.id].totalCompleted = message.list_completed
                    newValue.lists[message.list.id].listError = message.list_error
                }
                newValue.lists[message.list.id].songs[message.id] = { completed: message.completed, message: message.message, song: message.song }
                return newValue
            })
            if (Math.round(message.list_completed + message.list_error) == 100) {
                eventSource.close()
            }
        }

    }

    useEffect(() => {
        console.log("fetch downloads")
        fetch(`http://localhost:8000/downloads`).then(response => {
            if (response.ok) {
                response.json().then(json => {
                    for (let downloadId of json) {
                        console.log("EventSource", `http://localhost:8000/download-status/${downloadId}`)
                        const eventSource = new EventSource(`http://localhost:8000/download-status/${downloadId}`)
                        eventSource.onmessage = (event) => {
                            onMessage(event, eventSource)
                        }
                        eventSource.onerror = (error) => {
                            console.error('EventSource failed:', error);
                            eventSource.close();
                        };
                    }
                })
            }
        })
    }, [])

    const handleDownload = (url: string) => {

        fetch(`http://localhost:8000/start-download?url=${url}`).then(data => data.json()).then(json => {
            const eventSource = new EventSource(`http://localhost:8000/download-status/${json.download_id}`)
            eventSource.onmessage = (event) => {

                onMessage(event, eventSource)

            }
            eventSource.onerror = (error) => {
                console.error('EventSource failed:', error);
                eventSource.close();
            };
        })
    }


    return (
        <div className="flex flex-col gap-y-5 p-4">
            <input
                value={value}
                onChange={(e) => { setValue(e.target.value) }}
                className="font-semibold mx-auto rounded-full block text-1xl px-10 w-1/3 py-1.5 focus:outline-0"
                style={{
                    backgroundImage: 'url(/search-icon.png)',
                    backgroundPosition: '15px center',
                    backgroundSize: '14px',
                    backgroundRepeat: 'no-repeat',
                }}
                placeholder="Search a song or artist..."
            />
            <div className="grid grid-cols-[4fr_3fr] w-full gap-x-3">
                {searchResults ?
                    <div className="w-full min-w-0 max-w-full">
                        <label className="font-bold text-xl text-white ">Songs</label>
                        <RenderTrackSearchResults tracksInfo={searchResults.songs} handleDownload={handleDownload} />
                        <label className="font-bold text-xl text-white ">Albums</label>
                        <RenderAlbumSearchResults tracksInfo={searchResults.albums} handleDownload={handleDownload} />
                        <label className="font-bold text-xl text-white ">Playlists</label>
                        <RenderPlaylistSearchResults tracksInfo={searchResults.playlists} handleDownload={handleDownload} />
                    </div>
                    :
                    <div className="w-1/2 mx-auto text-white">
                        {value == "" ?
                            <label></label> :
                            <label>Searching...</label>
                        }
                    </div>
                }

                <div className="text-white flex flex-col gap-2 min-w-0 w-[400px]">
                    {Object.entries(status).length != 0 && <label className="font-bold text-xl text-white ">Downloads</label>}

                    {Object.entries(status.songs).map(songStatus => (
                        <RenderSongDownload key={songStatus[0]} songStatus={songStatus} />
                    ))}

                    {Object.entries(status.lists).map(list => (
                        <RenderListDownload key={list[0]} list={list} />
                    ))}
                </div>
            </div>
        </div>
    )
}