import { useEffect, useState } from "react";

export default function useMedia<T>(media: T) {
    const [_media, setMedia] = useState<T>(media);

    useEffect(() => {}, []);

    return _media;
}
