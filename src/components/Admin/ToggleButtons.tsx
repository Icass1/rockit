"use client";

import { useState } from "react";

export default function ToggleButtons() {
    const [randomQueue, setRandomQueue] = useState<boolean>(false);
    const [repeatSong, setRepeatSong] = useState<string>("off");
    const [admin, setAdmin] = useState<boolean>(false);
    const [devUser, setDevUser] = useState<boolean>(false);

    // useEffect(() => {}, [randomQueue]);
    // useEffect(() => {}, [repeatSong]);
    // useEffect(() => {}, [admin]);
    // useEffect(() => {}, [devUser]);

    return (
        <div className="w-full rounded bg-white/10 p-2">
            <label className="text-xl font-semibold">Toggles</label>
            <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                <div className="flex flex-row justify-between pr-5">
                    <label>Random Queue</label>
                    <input
                        checked={randomQueue}
                        type="checkbox"
                        onChange={(e) => {
                            setRandomQueue(e.currentTarget.checked);
                        }}
                    />
                </div>
                <div className="flex flex-row justify-between pr-5">
                    <label>Repeat Song</label>
                    <input checked={repeatSong !== "off"} type="checkbox" />
                </div>
                <div className="flex flex-row justify-between pr-5">
                    <label className="">Admin</label>
                    <input
                        checked={admin}
                        type="checkbox"
                        onChange={(e) => {
                            setAdmin(e.currentTarget.checked);
                        }}
                    />
                </div>
                <div className="flex flex-row justify-between pr-5">
                    <label className="">Dev User</label>
                    <input
                        checked={devUser}
                        type="checkbox"
                        onChange={(e) => {
                            setDevUser(e.currentTarget.checked);
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
