import { SessionResponse } from "@/dto";

export class User {
    public readonly username: string | null;
    public readonly admin: boolean;
    public readonly image: string;

    constructor({
        username,
        admin,
        image,
    }: {
        username: string;
        admin: boolean;
        image: string;
    }) {
        this.username = username;
        this.admin = admin;
        this.image = image;
    }

    static fromResponse(response: SessionResponse) {
        return new User({
            username: response.username,
            admin: response.admin,
            image: response.image,
        });
    }
}
