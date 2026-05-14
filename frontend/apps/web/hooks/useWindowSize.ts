import { useEffect, useState } from "react";

export default function useWindowSize(): {
    width: number | undefined;
    height: number | undefined;
} {
    const [size, setSize] = useState<{
        width: number | undefined;
        height: number | undefined;
    }>({
        width: undefined,
        height: undefined,
    });

    useEffect((): (() => void) => {
        const handleResize = (): void => {
            setSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };

        handleResize(); // Set initial size
        window.addEventListener("resize", handleResize);
        return (): void => window.removeEventListener("resize", handleResize);
    }, []);

    return size;
}
