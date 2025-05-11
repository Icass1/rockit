"use client";

import { Trash, Trash2 } from "lucide-react";
import { useState } from "react";

export default function NotificationMenu() {
    const [notifications, setNotifications] = useState([
        { id: 1, message: "Nueva canción añadida a tu playlist" },
        { id: 2, message: "Tienes una nueva solicitud de amistad" },
        { id: 3, message: "Actualización del sistema completada" },
    ]);

    const removeNotification = (id: number) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    };

    return (
        <div className="absolute right-0 z-50 mt-2 w-64 rounded-md bg-neutral-800 shadow-lg">
            <div className="items-center p-3 text-center text-lg font-bold text-white">
                Notificaciones
            </div>
            <ul className="max-h-60 overflow-auto">
                {notifications.length === 0 ? (
                    <li className="px-4 py-2 text-sm text-white">
                        No hay notificaciones
                    </li>
                ) : (
                    notifications.map((notif) => (
                        <li
                            key={notif.id}
                            className="flex items-center justify-between px-4 py-2 text-sm hover:bg-neutral-700"
                        >
                            <span>{notif.message}</span>
                            <Trash2
                                onClick={() => removeNotification(notif.id)}
                                className="text-xs text-red-500"
                            />
                        </li>
                    ))
                )}
            </ul>
        </div>
    );
}
