import { atom } from "nanostores";

export const networkStatus = atom<"online" | "offline">(
    typeof window == "undefined"
        ? "offline"
        : navigator.onLine
          ? "online"
          : "offline"
);

if (typeof window !== "undefined") {
    window.addEventListener("online", () => {
        networkStatus.set("online");
    });
    window.addEventListener("offline", () => {
        networkStatus.set("offline");
    });
}
