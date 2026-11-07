import { getTheme } from "@rockit/theme";
import { DesignThemeProvider, MediaArtwork, MediaIdentity } from "@rockit/ui";
import { fireEvent, render, screen } from "@testing-library/react-native";

it("uses the native renderer and updates semantic colors without changing media content", async () => {
    await render(
        <DesignThemeProvider mode="dark">
            <MediaIdentity title="Fever" subtitle="Dua Lipa · Angèle" />
        </DesignThemeProvider>
    );
    expect(screen.getByText("Fever")).toHaveStyle({
        color: getTheme("dark")["foreground-strong"],
    });
    await screen.rerender(
        <DesignThemeProvider mode="light">
            <MediaIdentity title="Fever" subtitle="Dua Lipa · Angèle" />
        </DesignThemeProvider>
    );
    expect(screen.getByText("Fever")).toHaveStyle({
        color: getTheme("light")["foreground-strong"],
    });
    expect(screen.getByText("Dua Lipa · Angèle")).toBeTruthy();
});

it("falls back once for broken artwork and recovers when a different song is displayed", async () => {
    await render(
        <MediaArtwork
            uri="https://fixture.invalid/broken.png"
            fallbackUri="https://fixture.invalid/fallback.png"
            label="Fever"
        />
    );
    await fireEvent(screen.getByLabelText("Fever"), "error");
    expect(screen.getByLabelText("Fever")).toHaveProp("source", {
        uri: "https://fixture.invalid/fallback.png",
    });
    await fireEvent(screen.getByLabelText("Fever"), "error");
    expect(screen.queryByLabelText("Fever")).toBeTruthy();
    await screen.rerender(
        <MediaArtwork
            uri="https://fixture.invalid/next.png"
            label="The Contract"
        />
    );
    expect(screen.getByLabelText("The Contract")).toHaveProp("source", {
        uri: "https://fixture.invalid/next.png",
    });
});
it("exposes selected and disabled actions through the native accessibility tree", async () => {
    const { ActionButton } = require("@rockit/ui");
    const press = jest.fn();
    await render(
        <DesignThemeProvider mode="light">
            <ActionButton
                label="Fixture action"
                onPress={press}
                selected
                disabled
            />
        </DesignThemeProvider>
    );
    const button = screen.getByRole("button", { name: "Fixture action" });
    expect(button.props.accessibilityState).toEqual({
        disabled: true,
        selected: true,
    });
    await fireEvent.press(button);
    expect(press).not.toHaveBeenCalled();
});
