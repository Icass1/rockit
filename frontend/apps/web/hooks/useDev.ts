import { useState } from "react";

export default function useDev() {
    const [dev] = useState(() => {
        if (typeof window === "undefined") return false;
        return (
            window.location.hostname == "localhost" ||
            window.location.hostname == ""
        );
    });
    return dev;
}
