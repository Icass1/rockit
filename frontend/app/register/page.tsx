"use client";

import { useState } from "react";

export default function RegisterPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [repeatPassword, setRepeatPassword] = useState("");
    const [error, setError] = useState("");

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");

        const res = await fetch("http://localhost:8000/auth/register", {
            method: "POST",
            credentials: "include", // receives session cookie
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password, repeatPassword }),
        });

        console.log("TEST 1");

        if (!res.ok) {
            console.log("TEST 2");
            const data = await res.text();
            setError(data || "Error");
            return;
        }
        console.log("TEST 3");

        // Success → user is now logged in automatically
        window.location.href = "/user";
    }

    return (
        <div style={{ maxWidth: 300, margin: "auto", marginTop: 50 }}>
            <h2>Register</h2>

            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                <br />

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <br />

                <input
                    type="password"
                    placeholder="Repeat Password"
                    value={repeatPassword}
                    onChange={(e) => setRepeatPassword(e.target.value)}
                />
                <br />

                <button type="submit">Register</button>
            </form>

            {error && <p style={{ color: "red" }}>{error}</p>}
        </div>
    );
}
