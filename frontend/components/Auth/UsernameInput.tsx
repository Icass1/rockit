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
        <div className="mx-auto flex w-4/5 flex-col">
            {error && (
                <label className="text-left text-xs text-red-500">
                    Username must be between 4 and 30 characters long and
                    contain only A-Z, a-z and 0-9
                </label>
            )}
            <input
                value={value}
                onChange={onChange}
                autoComplete="username"
                required
                className="text-1xl mt-1 rounded-full bg-[#202020] px-5 py-1 text-white"
                placeholder="Username"
            />
        </div>
    );
}
