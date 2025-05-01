"use client";

import { User } from "lucide-react";
import { useEffect, useState } from "react";

export default function OnlineUserIndicator() {
    const [onlineCount, setOnlineCount] = useState(0);

    useEffect(() => {
        // Simulación random de usuarios online
        setOnlineCount(Math.floor(Math.random() * 15));
    }, []);

    return (
        <div className="flex items-center gap-1 text-green-500">
            {onlineCount > 0 && (
                <span className="text-md font-semibold">{onlineCount}</span>
            )}
            <User className="h-6 w-6" />
        </div>
    );
}
