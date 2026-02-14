"use client"

import { getUserInClient } from "@/lib/getUserInClient";

export default  function UserPage() {
    const user = getUserInClient();

    return (
        <div style={{ padding: 20 }}>
            <h1>User Information</h1>

            <pre>{JSON.stringify(user, null, 2)}</pre>
        </div>
    );
}
