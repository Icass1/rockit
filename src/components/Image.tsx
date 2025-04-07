import { DetailedHTMLProps, ImgHTMLAttributes } from "react";

export default function Image(
    props: DetailedHTMLProps<
        ImgHTMLAttributes<HTMLImageElement>,
        HTMLImageElement
    >
) {
    return (
        // <picture {...props}>
        <img {...props} alt={props.alt} src={props.src} />
        // </picture>
    );
}
