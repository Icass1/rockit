// @vitest-environment jsdom
import { OnlinePresence } from "@rockit/ui/primitives/OnlinePresence";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";

afterEach(cleanup);
it.each([undefined, 0, 1, NaN])(
    "hides both the number and icon when no other user is confirmed (%s)",
    (count) => {
        const { container } = render(
            <OnlinePresence count={count} label="Online" locale="en" />
        );
        expect(screen.queryByTestId("header-online-users")).toBeNull();
        expect(container.querySelector("svg")).toBeNull();
    }
);
it("appears for two users and disappears again when the other user leaves", () => {
    const view = render(
        <OnlinePresence count={2} label="En línea" locale="es" />
    );
    expect(
        screen.getByTestId("header-online-users").getAttribute("aria-label")
    ).toBe("2 · En línea");
    view.rerender(<OnlinePresence count={1} label="En línea" locale="es" />);
    expect(screen.queryByTestId("header-online-users")).toBeNull();
    view.rerender(<OnlinePresence count={3} label="En ligne" locale="fr" />);
    expect(
        screen.getByTestId("header-online-users").getAttribute("aria-label")
    ).toBe("3 · En ligne");
});
