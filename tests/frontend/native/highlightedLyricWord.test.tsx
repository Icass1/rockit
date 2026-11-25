import HighlightedLyricWord from "@mobile/components/Player/HighlightedLyricWord";
import { getTheme } from "@rockit/theme";
import { render, screen } from "@testing-library/react-native";

jest.mock("react-native-reanimated", () => ({}), { virtual: true });

it("keeps a sung word at full contrast while an upcoming word uses muted text", async () => {
    const colors = getTheme("dark");
    await render(<HighlightedLyricWord text="Hola" fill="future" />);
    expect(screen.getByText("Hola")).toHaveStyle({
        color: colors["muted-foreground"],
    });

    await screen.rerender(<HighlightedLyricWord text="Hola" fill="past" />);
    expect(screen.getByText("Hola")).toHaveStyle({
        color: colors["foreground-strong"],
    });
});
