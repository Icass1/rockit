"use client";

import "@/styles/Skeleton.css";

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
    > & { fallback?: string; imageClassName?: string; showSkeleton?: boolean }
) {
    const { className = "", src, alt, ...rest } = props;
    const [loaded, setLoaded] = useState(false);
    const [objectUrl, setObjectUrl] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        let objectUrlRef: string;

        if (src) {
            setLoaded(false);

            fetch(src, { priority: "low" }).then((res) => {
                if (res.ok) {
                    res.blob().then((blob) => {
                        if (!isMounted) return;
                        objectUrlRef = URL.createObjectURL(blob);
                        setObjectUrl(objectUrlRef);
                        setLoaded(true);
                    });
                } else {
                    console.warn("Image couldn't be loaded");
                    if (props.fallback) {
                        fetch(props.fallback, { priority: "low" }).then(
                            (res) => {
                                if (res.ok) {
                                    res.blob().then((blob) => {
                                        if (!isMounted) return;
                                        objectUrlRef =
                                            URL.createObjectURL(blob);
                                        setObjectUrl(objectUrlRef);
                                        setLoaded(true);
                                    });
                                } else {
                                }
                            }
                        );
                    }
                }
            });
        }

        return () => {
            isMounted = false;
            if (objectUrlRef) URL.revokeObjectURL(objectUrlRef);
        };
    }, [src, props.fallback]);

    const combinedClassName = `${className} overflow-hidden`;

    return (
        <div className={combinedClassName} {...rest}>
            {!loaded && (
                <div
                    className={
                        "relative h-full w-full " +
                        ((props.showSkeleton ?? true) ? "skeleton" : "")
                    }
                />
            )}
            {objectUrl && (
                <img
                    src={objectUrl}
                    alt={alt}
                    className={"relative h-full w-full " + props.imageClassName}
                />
            )}
        </div>
    );
}
