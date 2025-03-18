import { atom } from "nanostores";

export const networkStatus = atom<"online" | "offline">(
    navigator.onLine ? "online" : "offline"
);

window.addEventListener("online", () => {
    networkStatus.set("online");
});
window.addEventListener("offline", () => {
    networkStatus.set("offline");
});
