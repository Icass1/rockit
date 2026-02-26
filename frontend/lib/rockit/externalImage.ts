import { ExternalImageResponseSchema } from "@/dto/externalImageResponse";

export class ExternalImage {
    public readonly url: string;
    public readonly width: number | null;
    public readonly height: number | null;

    constructor({
        url,
        width,
        height,
    }: {
        url: string;
        width: number | null;
        height: number | null;
    }) {
        this.url = url;
        this.width = width;
        this.height = height;
    }

    static fromResponse(response: ExternalImageResponseSchema) {
        return new ExternalImage({
            width: response.width,
            url: response.url,
            height: response.height,
        });
    }
}
