// @vitest-environment jsdom
import { getTheme } from "@rockit/theme";
import { ActionButton, DesignThemeProvider, MediaIdentity } from "@rockit/ui";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

afterEach(cleanup);

it("renders the same accessible media identity with dynamic theme values on the web renderer", () => {
    const props = {
        title: "The Contract",
        subtitle: "twenty one pilots",
        imageUrl: "/fixture-cover.png",
    };
    const view = render(
        <DesignThemeProvider mode="dark">
            <MediaIdentity {...props} />
        </DesignThemeProvider>
    );
    expect(screen.getByText(props.title)).toBeTruthy();
    expect(screen.getByText(props.subtitle)).toBeTruthy();
    expect(screen.getByLabelText(props.title)).toBeTruthy();
    const dark = getComputedStyle(screen.getByText(props.title)).color;
    view.rerender(
        <DesignThemeProvider mode="light">
            <MediaIdentity {...props} />
        </DesignThemeProvider>
    );
    expect(getComputedStyle(screen.getByText(props.title)).color).not.toBe(
        dark
    );
    expect(getTheme("light")["foreground-strong"]).not.toBe(
        getTheme("dark")["foreground-strong"]
    );
});

it("exposes toggle state in the web accessibility tree and ignores disabled presses", () => {
    const press = vi.fn();
    const view = render(
        <ActionButton
            label="Fixture action"
            onPress={press}
            selected
            disabled
        />
    );
    const button = screen.getByRole("button", { name: "Fixture action" });
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(button.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(button);
    expect(press).not.toHaveBeenCalled();
    view.rerender(<ActionButton label="Fixture action" onPress={press} />);
    expect(button.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(button);
    expect(press).toHaveBeenCalledOnce();
});
