import { useEffect, useRef, useState, type Dispatch } from "react"
import pkg from 'lodash';
import type { AlbumsEntity, PlaylistsEntity, SearchResults, SongsEntity } from "@/types";
const { debounce } = pkg;


function RenderSearchResults({ searchResults, downloadSong }: { searchResults: AlbumsEntity[] | SongsEntity[] | PlaylistsEntity[], downloadSong: (song: SongsEntity) => void }) {

    const handleClick = (element: AlbumsEntity | SongsEntity | PlaylistsEntity) => {

        downloadSong(element as SongsEntity)
    }

    return (
        <div className="grid grid-cols-2 gap-2 mt-2 mb-5">
            {searchResults.map((element, index) =>
                <div
                    key={'element' + element.spotify_url + index}
                    onClick={() => { handleClick(element) }}
                    className="flex flex-row h-12 rounded overflow-hidden gap-x-2 bg-zinc-700 hover:bg-zinc-500/60 transition-colors cursor-pointer"
                >
                    <img className="aspect-square w-auto h-full" src={element.image_url}></img>
                    <div className="flex flex-col text-white min-w-0 max-w-full">
                        <label className="text-base font-semibold truncate">{element.name}</label>
                        <label className="text-sm truncate">{element.artists && element.artists.map(artist => artist.name).join(", ")}</label>
                    </div>
                </div>
            )}
        </div>
    )
}



export default function SearchBar({ }) {

    const [value, setValue] = useState("")
    const [searchResults, setSearchResults] = useState<SearchResults | undefined>(undefined)

    const searchDebounce = useRef<pkg.DebouncedFunc<(query: string) => void>>()

    const [status, setStatus] = useState<any>({})

    useEffect(() => {
        searchDebounce.current = debounce((query: string) => {
            search(query)
        }, 1000);
    }, [])

    const search = (query: string) => {
        if (query == "") { return }
        setSearchResults(undefined)

        fetch(`http://localhost:8000/search?q=${query}`).then(data => data.json()).then(json => {
            // console.log(json)
            setSearchResults(json)
        })
    }

    useEffect(() => {
        if (!searchDebounce.current) { return }
        searchDebounce.current(value)
    }, [value])

    useEffect(() => {
        console.log("fetch downloads")
        fetch(`http://localhost:8000/downloads`).then(response => {
            console.log(response.ok)
            if (response.ok) {
                response.json().then(json => {
                    for (let downloadId of json) {
                        console.log("EventSource", `http://localhost:8000/download-status/${downloadId}`)
                        const eventSource = new EventSource(`http://localhost:8000/download-status/${downloadId}`)
                        eventSource.onmessage = (event) => {
                            const message = JSON.parse(event.data);
                            setStatus((value: any) => {
                                let newValue = { ...value }
                                if (message.id == undefined) {
                                }
                                else {
                                    newValue[message.id] = { completed: message.completed, message: message.message, song: message.song }

                                }
                                return newValue
                            })
                            if (message.completed == 100) {
                                eventSource.close()
                            }
                        }
                        eventSource.onerror = (error) => {
                            // setStatus((value: any) => {
                            //     let newValue = { ...value }
                            //     newValue[song.id] = { completed: 0, message: "Error"}
                            //     return newValue
                            // })
                            console.error('EventSource failed:', error);
                            eventSource.close();
                        };
                    }
                })
            }
        })
    }, [])

    const downloadSong = (song: SongsEntity) => {

        fetch(`http://localhost:8000/start-download?url=${song.spotify_url}`).then(data => data.json()).then(json => {
            const eventSource = new EventSource(`http://localhost:8000/download-status/${json.download_id}`)
            eventSource.onmessage = (event) => {
                const message = JSON.parse(event.data);
                setStatus((value: any) => {
                    let newValue = { ...value }
                    newValue[song.id] = { completed: message.completed, message: message.message, song: song }
                    return newValue
                })
                if (message.completed == 100) {
                    eventSource.close()
                }
            }
            eventSource.onerror = (error) => {
                setStatus((value: any) => {
                    let newValue = { ...value }
                    newValue[song.id] = { completed: 0, message: "Error", song: song }
                    return newValue
                })
                console.error('EventSource failed:', error);
                eventSource.close();
            };
        })
    }


    return (
        <div className="flex flex-col gap-y-5">
            <input 
            value={value} 
            onChange={(e) => { setValue(e.target.value) }} 
            className="font-semibold mx-auto rounded-full block text-1xl px-10 w-1/3 py-1.5 focus:outline-0" 
            style={{
                backgroundImage: 'url(/search-icon.png)', // Cambia esta ruta a la de tu icono
                backgroundPosition: '15px center',  // Ajusta la posición del ícono dentro del input
                backgroundSize: '14px', // Ajusta el tamaño del ícono
                backgroundRepeat: 'no-repeat',
            }} 
            placeholder="Search a song or artist..." 
            />
            <div className="grid grid-cols-[4fr_3fr] w-full gap-x-3">
                {searchResults ?
                    <div className="w-full min-w-0 max-w-full">
                        <label className="font-bold text-xl text-white ">Songs</label>
                        {searchResults.songs && <RenderSearchResults searchResults={searchResults.songs} downloadSong={downloadSong} />}
                        <label className="font-bold text-xl text-white ">Albums</label>
                        {searchResults.albums && <RenderSearchResults searchResults={searchResults.albums} downloadSong={downloadSong} />}
                        <label className="font-bold text-xl text-white ">Playlists</label>
                        {searchResults.playlists && <RenderSearchResults searchResults={searchResults.playlists} downloadSong={downloadSong} />}
                    </div>
                    :
                    <div className="w-1/2 mx-auto text-white">
                        {value == "" ?
                            <label></label> :
                            <label>Searching...</label>
                        }
                    </div>
                }

                <div className="text-white flex flex-col gap-2 min-w-0 max-w-full">
                    {Object.entries(status).length != 0 && <label className="font-bold text-xl text-white ">Downloads</label>}

                    {/* {messages.map((message, index) => <div key={index}>{message.completed}/{message.total} - {message.message}</div>)} */}
                    {Object.entries(status).map(songStatus => (
                        <div key={songStatus[0]} className="bg-zinc-400/10 rounded h-14 flex flex-row gap-x-2 overflow-hidden">
                            <img src={songStatus[1]?.song?.image_url || songStatus[1]?.song?.cover_url} className="h-full w-auto" />
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
                    ))}
                </div>
            </div>
        </div>
    )
}