"use client";

import { useState } from "react";

export default function Register() {
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");

    const handleSend = () => {
        console.log(password, username);
        fetch("/api/auth/register", {
            method: "POST",
            body: JSON.stringify({ username, password }),
        });
    };

    return (
        <div className="bg-black flex flex-col">
            <form>
                <input
                    name="username"
                    className="text-white"
                    value={username}
                    onChange={(e) => {
                        setUsername(e.currentTarget.value);
                    }}
                    placeholder="enter username"
                ></input>
                <input
                    name="password"
                    type="password"
                    value={password}
                    onChange={(e) => {
                        setPassword(e.currentTarget.value);
                    }}
                    className="text-white"
                    placeholder="enter password"
                ></input>
                <button onClick={handleSend}>Submit</button>
            </form>
        </div>
    );
}
