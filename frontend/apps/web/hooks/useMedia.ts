import { useEffect, useState } from "react";
import { MediaType } from "@/types/media";

export default function useMedia<T>(media: T) {
    const [_media, setMedia] = useState<T>(media);

    useEffect(() => {}, []);

    return _media;
}
