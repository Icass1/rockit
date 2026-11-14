// @vitest-environment jsdom
import { getTheme } from "@rockit/theme";
import { DesignThemeProvider, RockitLikeButton } from "@rockit/ui";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

afterEach(cleanup);
it("shares a controlled like action, accessible toggle state and disabled behavior", () => {
    const press = vi.fn();
    const view = render(
        <RockitLikeButton liked={false} label="Like fixture" onPress={press} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Like fixture" }));
    expect(press).toHaveBeenCalledOnce();
    view.rerender(
        <RockitLikeButton
            liked
            label="Unlike fixture"
            onPress={press}
            disabled
        />
    );
    const button = screen.getByRole("button", { name: "Unlike fixture" });
    expect(button.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(button);
    expect(press).toHaveBeenCalledOnce();
});

it("fills the entire liked hand white in both themes without a second contour cutting the palm", () => {
    const view = render(
        <DesignThemeProvider mode="dark">
            <RockitLikeButton liked label="Unlike fixture" onPress={() => {}} />
        </DesignThemeProvider>
    );
    const check = () => {
        const icon = screen
            .getByTestId("rockit-like-hand")
            .querySelector("svg")!;
        expect(icon.getAttribute("fill")).toBe(getTheme("dark")["on-media"]);
        const paths = icon.querySelectorAll("path");
        expect(paths).toHaveLength(1);
        expect(paths[0].getAttribute("d")?.match(/M/g)).toHaveLength(1);
        expect(paths[0].getAttribute("d")?.endsWith("Z")).toBe(true);
    };
    check();
    view.rerender(
        <DesignThemeProvider mode="light">
            <RockitLikeButton liked label="Unlike fixture" onPress={() => {}} />
        </DesignThemeProvider>
    );
    check();
});
