// @vitest-environment jsdom
import { RockitLikeButton } from "@rockit/ui";
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
