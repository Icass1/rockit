// @vitest-environment jsdom
import { vocabularyText } from "@rockit/shared";
import { DesignThemeProvider, ListeningCircle } from "@rockit/ui";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { circleFriends } from "../fixtures/socialCircle";

afterEach(cleanup);
const vocabulary = vocabularyText({ currentLang: "en", vocabulary: {} });
const wrapper = (
    friends = circleFriends,
    onInvite = vi.fn(),
    onFindFriends = vi.fn()
) => (
    <DesignThemeProvider mode="dark">
        <ListeningCircle
            friends={friends}
            vocabulary={vocabulary}
            onInvite={onInvite}
            onFindFriends={onFindFriends}
        />
    </DesignThemeProvider>
);
describe("shared listening circle", () => {
    it("selects a real friend without inviting, then invites only the chosen person", () => {
        const invite = vi.fn();
        render(wrapper(circleFriends, invite));
        fireEvent.click(
            screen.getByRole("button", {
                name: "View Sam in your listening circle",
            })
        );
        expect(
            screen.getByTestId("listening-circle-detail").textContent
        ).toContain("Everything In Its Right Place");
        expect(invite).not.toHaveBeenCalled();
        fireEvent.click(
            screen.getByRole("button", {
                name: "Invite Sam to listen together",
            })
        );
        expect(invite).toHaveBeenCalledExactlyOnceWith("circle-sam");
    });
    it("never presents an offline friend's stale song as a live listen and removes departed identities", () => {
        const view = render(wrapper());
        fireEvent.click(
            screen.getByRole("button", {
                name: "View Luca in your listening circle",
            })
        );
        const detail = screen.getByTestId("listening-circle-detail");
        expect(detail.textContent).toContain("Offline");
        expect(detail.textContent).not.toContain("Stale private track");
        view.rerender(
            wrapper(
                circleFriends.filter(
                    (friend) => friend.publicId !== "circle-luca"
                )
            )
        );
        expect(detail.textContent).not.toContain("Luca");
    });
    it("offers friend discovery when empty without invented people or invites", () => {
        const invite = vi.fn(),
            find = vi.fn();
        render(wrapper([], invite, find));
        expect(
            screen.queryAllByTestId(/^listening-circle-person/)
        ).toHaveLength(0);
        fireEvent.click(
            screen.getByRole("button", { name: "Find and manage friends" })
        );
        expect(find).toHaveBeenCalledOnce();
        expect(invite).not.toHaveBeenCalled();
    });
});
