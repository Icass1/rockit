import { DetailedHTMLProps, ImgHTMLAttributes } from "react";

export default function Image(
    props: DetailedHTMLProps<
        ImgHTMLAttributes<HTMLImageElement>,
        HTMLImageElement
    >
) {
    return (
        <picture>
            <img {...props} alt={props.alt} />
        </picture>
    );
}
