import { useState, useEffect } from "react";

export default function useWindowSize() {
    const [width, setWidth] = useState<number>(
        typeof window === "undefined" ? 0 : window.innerWidth
    );
    const [height, setHeight] = useState<number>(
        typeof window === "undefined" ? 0 : window.innerHeight
    );

    useEffect(() => {
        if (typeof window === "undefined") return;
        const handleResize = () => {
            setWidth(window.innerWidth);
            setHeight(window.innerHeight);
        };

        setWidth(window.innerWidth);
        setHeight(window.innerHeight);

        window.addEventListener("resize", handleResize);

        // Clean up event listener on unmount
        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    return { width, height };
}
