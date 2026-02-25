export class User {
    public readonly username: string;
    public readonly admin: boolean;
    public readonly image: string;

    constructor({ username, admin, image }: {
        username: string;
        admin: boolean;
        image: string;
    }) {
        this.username = username;
        this.admin = admin;
        this.image = image;
    }
}
