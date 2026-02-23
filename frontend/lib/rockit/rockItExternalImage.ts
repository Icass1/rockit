import { RockItExternalImageResponse } from "@/dto/rockItExternalImageResponse";

export class RockItExternalImage {
    // #region: Read-only properties

    public readonly url: string;
    public readonly width: number | null;
    public readonly height: number | null;

    // #endregion

    // #region: Constructor

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

    // #endregion

    // #region: Factories

    static fromResponse(response: RockItExternalImageResponse) {
        return new RockItExternalImage({
            width: response.width,
            url: response.url,
            height: response.height,
        });
    }

    // #endregion
}
