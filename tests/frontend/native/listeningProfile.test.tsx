import { vocabularyText } from "@rockit/shared";
import { DesignThemeProvider, ListeningProfile } from "@rockit/ui";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { listeningProfile } from "../fixtures/listeningProfile";

jest.mock("@rockit/ui/icons", () => new Proxy({}, { get: () => () => null }));
it("exposes listening hours and the emblem catalog with native controls", async () => {
    await render(
        <DesignThemeProvider mode="dark">
            <ListeningProfile
                resourceKey="sam"
                loadProfile={async () => listeningProfile}
                vocabulary={vocabularyText({
                    currentLang: "en",
                    vocabulary: {},
                })}
                renderEmblem={(badge) => <Text>{badge.visualVariant}</Text>}
            />
        </DesignThemeProvider>
    );
    expect(await screen.findByText("50.6")).toBeTruthy();
    await fireEvent.press(
        screen.getByRole("button", { name: "Explore all 12 emblems" })
    );
    expect(screen.getByRole("button", { name: "Next emblems" })).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Next emblems" }));
    expect(screen.getByText("2 / 2")).toBeTruthy();
});
