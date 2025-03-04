import { useEffect, useState } from "react";

export default function UsernameInput() {
    const [username, setUsername] = useState("");
    const [error, setError] = useState(false);

    useEffect(() => {
        console.log(username);
        setError(false);
        if (username == "") return;
        if (
            typeof username !== "string" ||
            username.length < 3 ||
            username.length > 31 ||
            !/^[a-z0-9A-Z_-]+$/.test(username)
        ) {
            setError(true);
            console.log("error");
        }
    }, [username]);

    return (
        <div className="flex flex-col w-4/5 mx-auto">
            {error && (
                <label className="text-xs text-red-500 text-left">
                    Username must be between 4 and 30 characters long and
                    contain only A-Z, a-z and 0-9
                </label>
            )}
            <input
                value={username}
                onChange={(e) => {
                    setUsername(e.target.value);
                }}
                id="username"
                name="username"
                autoComplete="username"
                required
                className="mt-1  rounded-full text-1xl px-5 py-1 bg-[#202020] text-white"
                placeholder="Username"
            />
        </div>
    );
}
