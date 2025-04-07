"use client";

import { ChangeEvent, useEffect, useState } from "react";

export default function UsernameInput({
    value,
    onChange,
}: {
    value: string;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
    // const [username, setUsername] = useState("");
    const [error, setError] = useState(false);

    useEffect(() => {
        setError(false);
        if (value == "") return;
        if (
            typeof value !== "string" ||
            value.length < 3 ||
            value.length > 31 ||
            !/^[a-z0-9A-Z_-]+$/.test(value)
        ) {
            setError(true);
            console.log("error");
        }
    }, [value]);

    return (
        <div className="flex flex-col w-4/5 mx-auto">
            {error && (
                <label className="text-xs text-red-500 text-left">
                    Username must be between 4 and 30 characters long and
                    contain only A-Z, a-z and 0-9
                </label>
            )}
            <input
                value={value}
                onChange={onChange}
                autoComplete="username"
                required
                className="mt-1  rounded-full text-1xl px-5 py-1 bg-[#202020] text-white"
                placeholder="Username"
            />
        </div>
    );
}
