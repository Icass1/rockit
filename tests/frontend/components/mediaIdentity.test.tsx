// @vitest-environment jsdom
import { getTheme } from "@rockit/theme";
import { DesignThemeProvider, MediaIdentity } from "@rockit/ui";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";

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
