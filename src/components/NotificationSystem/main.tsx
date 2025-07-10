"use client";

import React, {
    createContext,
    useContext,
    useState,
    ReactNode,
    useEffect,
    useRef,
} from "react";
import { NotificationController } from "./notificationController";

type Notification = {
    message: string;
    type: "success" | "error" | "info";
    duration?: number;
    id: number;
};
type NotificationContextType = {
    notifications: Notification[];
    addNotification: (message: string, type?: Notification["type"]) => void;
    removeNotification: (id: number) => void;
};

const NotificationContext = createContext<NotificationContextType | undefined>(
    undefined
);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const addNotification = (
        message: string,
        type: Notification["type"] = "info"
    ) => {
        setNotifications((prev) => [
            ...prev,
            { message, type, id: Date.now(), duration: 5 },
        ]);
    };

    NotificationController.add = addNotification;

    const removeNotification = (id: number) => {
        setNotifications((prev) =>
            prev.filter((notification) => notification.id !== id)
        );
    };

    return (
        <NotificationContext.Provider
            value={{ notifications, addNotification, removeNotification }}
        >
            {children}
            <NotificationSystem />
        </NotificationContext.Provider>
    );
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error(
            "useNotification must be used within a NotificationProvider"
        );
    }
    return context;
};

function Notification({
    notification,
    level,
}: {
    notification: Notification;
    level: number;
}) {
    const [right, setRight] = useState("-100%");
    const { removeNotification } = useNotification();

    const firstCall = useRef(true);

    console.log(notification.message, notification.id, level);

    useEffect(() => {
        if (!firstCall.current) {
            return;
        }
        firstCall.current = false;

        console.log("Notification effect", notification.id);
        setTimeout(() => {
            setRight("10px");
        }, 50);
        setTimeout(
            () => {
                setRight("-100%");
            },
            1000 * (notification.duration ?? 3)
        );
        setTimeout(
            () => {
                removeNotification(notification.id);
            },
            1000 * (notification.duration ?? 3) + 1000
        );
    }, [notification.duration, notification.id, removeNotification, firstCall]);

    return (
        <div
            className="fixed min-h-10 max-w-[450px] bg-red-400 transition-all duration-[0.4s]"
            style={{
                zIndex: 2000,
                bottom: `${level * 50 + 80}px`,
                right: right,
                width: "calc(100% - 20px)",
            }}
        >
            {notification.message}
            <div
                className="absolute right-0 bottom-0 left-0 h-1 animate-[progressBar] bg-blue-400"
                style={{
                    animationDuration: notification.duration
                        ? `${notification.duration}s`
                        : "3s",
                    animationTimingFunction: "linear",
                }}
            ></div>
        </div>
    );
}

export default function NotificationSystem() {
    const { notifications } = useNotification();

    return (
        <>
            {notifications.map((notification, index) => {
                return (
                    <Notification
                        key={notification.id}
                        notification={notification}
                        level={notifications.length - index}
                    />
                );
            })}
        </>
    );
}
