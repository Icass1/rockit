export class RockItUser {
    public readonly username: string;
    public readonly admin: boolean;

    constructor({ username, admin }: { username: string; admin: boolean }) {
        this.username = username;
        this.admin = admin;
    }
}
