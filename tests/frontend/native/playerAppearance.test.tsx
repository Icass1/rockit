import { getTheme } from "@rockit/theme";
import { RockitLikeButton } from "@rockit/ui";
import { OnlinePresence } from "@rockit/ui/primitives/OnlinePresence";
import { fireEvent, render, screen } from "@testing-library/react-native";

it("renders the liked hand as a solid white native vector and preserves its action", async () => {
    const press = jest.fn();
    await render(
        <RockitLikeButton liked label="Unlike fixture" onPress={press} />
    );
    const hand = screen.getByTestId("rockit-like-hand");
    expect(hand.props.children.props.fill).toBe(getTheme("dark")["on-media"]);
    await fireEvent.press(
        screen.getByRole("button", { name: "Unlike fixture" })
    );
    expect(press).toHaveBeenCalledTimes(1);
});
it("hides a lone listener, shows two users and reacts when the other leaves", async () => {
    await render(<OnlinePresence count={1} label="En línea" locale="es" />);
    expect(screen.queryByTestId("header-online-users")).toBeNull();
    await screen.rerender(
        <OnlinePresence count={2} label="En línea" locale="es" />
    );
    expect(screen.getByTestId("header-online-users")).toHaveProp(
        "accessibilityLabel",
        "2 · En línea"
    );
    await screen.rerender(
        <OnlinePresence count={1} label="En línea" locale="es" />
    );
    expect(screen.queryByTestId("header-online-users")).toBeNull();
});
