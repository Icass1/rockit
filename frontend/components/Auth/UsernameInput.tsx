"use client";

import { ChangeEvent, useEffect, useState } from "react";

function validateUsername(value: string): string | null {
    if (value === "") return null;
    if (value.length < 3 || value.length > 30) 
        return "Username must be between 3 and 30 characters";
    if (!/^[a-zA-Z0-9_-]+$/.test(value)) 
        return "Only letters, numbers, _ and - are allowed";
    return null;
}

export default function UsernameInput({
    value,
    onChange,
}: {
    value: string;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setError(validateUsername(value));
    }, [value]);

    return (
        <div className="mx-auto flex w-4/5 flex-col">
            {error && (
                <label className="text-left text-xs text-red-500">
                    {error}
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
