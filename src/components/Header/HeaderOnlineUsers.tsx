"use client";

import { User } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function OnlineUserIndicator() {
    const [onlineCount, setOnlineCount] = useState(0);
    const currentCount = useRef(5);

    // Simulación de la actualización del número de usuarios en línea
    useEffect(() => {
        setOnlineCount(currentCount.current);
        const interval = setInterval(() => {
            const change = Math.random() < 0.51 ? -1 : 1;
            let newCount = currentCount.current + change;
            newCount = Math.max(0, Math.min(10, newCount));
            currentCount.current = newCount;
            setOnlineCount(newCount);
        }, 300*1000);

        return () => clearInterval(interval);
    }, []);

    return (
        <>
            {onlineCount > 0 && (
                <div className="flex items-center gap-1 text-green-500">
                    <span className="text-md font-semibold">{onlineCount}</span>
                    <User className="h-6 w-6" />
                </div>
            )}
        </>
    );
}
