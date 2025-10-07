import { createAtom } from "@/lib/store";
import { getSession, signOut } from "next-auth/react";
import apiFetch from "@/lib/utils/apiFetch";
import { RockItUserResponse } from "@/responses/rockItUserResponse";
import { RockItUser } from "../rockit/rockItUser";

export class UserManager {
    // #region: Atoms

    private _randomQueueAtom = createAtom<boolean>(false);
    private _repeatSongAtom = createAtom<"all" | "one" | "off">("off");

    private _userAtom = createAtom<RockItUser | undefined>();

    // #endregion

    // #region: Constructor

    constructor() {
        if (typeof window === "undefined") return;
        this.init();
    }

    private async init() {
        const session = await getSession();
        if (!session) {
            console.warn("No session found in UserManager");
        }

        const response = await apiFetch("/auth/me");
        if (!response?.ok) {
            console.log(window.location.pathname);
            if (
                window.location.pathname == "/login" ||
                window.location.pathname == "/signup"
            ) {
                return;
            } else {
                console.warn("No response from /auth/me");
                console.warn("UserManager.init -> /login");
                signOut();
                window.location.pathname = "/login";
                return;
            }
        }

        const responseJson = await response.json();
        const user = RockItUserResponse.parse(responseJson);

        this._userAtom.set(user);
    }

    // #endregion

    // #region: Methods
    toggleRandomQueue() {
        this._randomQueueAtom.set(!this._randomQueueAtom.get());
    }

    cyclerepeatSong() {
        this._repeatSongAtom.set(
            this._repeatSongAtom.get() === "off"
                ? "all"
                : this._repeatSongAtom.get() === "all"
                  ? "one"
                  : "off"
        );
    }

    async setLangAsync(lang: string) {
        console.log(lang);
        throw "(setLangAsync) Method not implemented.";
    }

    async setCrossFadeAsync(crossFade: number) {
        console.log(crossFade);
        throw "(setCrossFadeAsync) Method not implemented.";
    }

    // #endregion

    // #region: Getters

    get randomQueueAtom() {
        return this._randomQueueAtom;
    }
    get repeatSongAtom() {
        return this._repeatSongAtom;
    }

    get userAtom() {
        return this._userAtom;
    }

    // #endregion
}
