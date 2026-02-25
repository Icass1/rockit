import { useEffect, useState } from "react";

export default function useDev() {
    const [dev, setDev] = useState(false);

    useEffect(() => {
        setDev(
            window.location.hostname == "localhost" ||
                window.location.hostname == ""
        );
    }, []);
    return dev;
}
