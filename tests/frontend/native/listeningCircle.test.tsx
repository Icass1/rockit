import { vocabularyText } from "@rockit/shared";
import { DesignThemeProvider, ListeningCircle } from "@rockit/ui";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { circleFriends } from "../fixtures/socialCircle";

jest.mock("@rockit/ui/icons", () => ({
    AudioLines: () => null,
    Headphones: () => null,
    UserPlus: () => null,
}));
it("opens the native profile directly and only sends an invitation explicitly", async () => {
    const invite = jest.fn();
    const openProfile = jest.fn();
    await render(
        <DesignThemeProvider mode="dark">
            <ListeningCircle
                friends={circleFriends}
                vocabulary={vocabularyText({
                    currentLang: "en",
                    vocabulary: {},
                })}
                onInvite={invite}
                onViewProfile={openProfile}
                onFindFriends={jest.fn()}
            />
        </DesignThemeProvider>
    );
    await fireEvent.press(
        screen.getByRole("button", {
            name: "View Sam's profile",
        })
    );
    expect(
        screen.getByText("Everything In Its Right Place · Radiohead")
    ).toBeTruthy();
    expect(invite).not.toHaveBeenCalled();
    expect(openProfile).toHaveBeenCalledTimes(1);
    expect(openProfile).toHaveBeenCalledWith("circle-sam");
    await fireEvent.press(
        screen.getByRole("button", { name: "Invite Sam to listen together" })
    );
    expect(invite).toHaveBeenCalledWith("circle-sam");
    expect(invite).toHaveBeenCalledTimes(1);
});
