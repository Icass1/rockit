"use client";

import { useState } from "react";

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");

        const res = await fetch("http://localhost:8000/auth/login", {
            method: "POST",
            credentials: "include", // IMPORTANT
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, password }),
        });

        if (!res.ok) {
            const data = await res.json();
            setError(data.detail || "Error");
            return;
        }

        window.location.href = "/";
    }

    return (
        <div style={{ maxWidth: 300, margin: "auto", marginTop: 50 }} className="flex flex-col">
            <h2>Login</h2>

            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                <br />

                <input
                    type="password"
                    placeholder="contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <br />

                <button type="submit">Entrar</button>
            </form>

            {error && <p style={{ color: "red" }}>{error}</p>}

            <a href="http://localhost:8000/auth/google">Login con Google</a>
            <a href="/register">Create an account</a>
        </div>
    );
}
