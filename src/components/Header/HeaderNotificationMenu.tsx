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
        <div className="absolute right-0 mt-2 w-64 rounded-md bg-neutral-800 shadow-lg z-50">
            <div className="p-3 text-white text-lg font-bold items-center text-center">
                Notificaciones
            </div>
            <ul className="max-h-60 overflow-auto">
                {notifications.length === 0 ? (
                    <li className="px-4 py-2 text-white text-sm">
                        No hay notificaciones
                    </li>
                ) : (
                    notifications.map((notif) => (
                        <li
                            key={notif.id}
                            className="flex items-center justify-between px-4 py-2 hover:bg-neutral-700 text-sm"
                        >
                            <span>{notif.message}</span>
                            <Trash2
                                onClick={() => removeNotification(notif.id)}
                                className="text-red-500 text-xs"
                            />
                        </li>
                    ))
                )}
            </ul>
        </div>
    );
}
