"use client";

import {
    DetailedHTMLProps,
    ImgHTMLAttributes,
    useEffect,
    useState,
} from "react";

export default function Image(
    props: DetailedHTMLProps<
        ImgHTMLAttributes<HTMLImageElement>,
        HTMLImageElement
    >
) {
    const { className = "", src, alt, ...rest } = props;
    const [loaded, setLoaded] = useState(false);
    const [objectUrl, setObjectUrl] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        let objectUrlRef: string;

        if (src) {
            setLoaded(false);

            fetch(src)
                .then((res) => res.blob())
                .then((blob) => {
                    if (!isMounted) return;
                    objectUrlRef = URL.createObjectURL(blob);
                    setObjectUrl(objectUrlRef);
                    setLoaded(true);
                });
        }

        return () => {
            isMounted = false;
            if (objectUrlRef) URL.revokeObjectURL(objectUrlRef);
        };
    }, [src]);

    const combinedClassName = `${className} overflow-hidden`;

    return (
        <div className={combinedClassName} {...rest}>
            {!loaded && <div className="skeleton relative h-full w-full" />}
            {objectUrl && (
                <img
                    src={objectUrl}
                    alt={alt}
                    className="relative h-full w-full"
                />
            )}
        </div>
    );
}
