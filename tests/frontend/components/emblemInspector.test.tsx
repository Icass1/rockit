// @vitest-environment jsdom
import { vocabularyText } from "@rockit/shared";
import { DesignThemeProvider } from "@rockit/ui";
import { EmblemInspector } from "@rockit/ui/primitives/EmblemInspector";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { listeningProfile } from "../fixtures/listeningProfile";

const viewer = vi.hoisted(() => ({
    dispose: vi.fn(),
    front: vi.fn(),
    back: vi.fn(),
    rotate: vi.fn(),
}));
const load = vi.hoisted(() => vi.fn());
vi.mock("@rockit/ui/browser/medalViewer.web", () => ({
    createMedalViewer: load,
}));
const vocabulary = vocabularyText({ currentLang: "en", vocabulary: {} });
const show = () =>
    render(
        <DesignThemeProvider mode="dark">
            <EmblemInspector
                badge={listeningProfile.listeningBadges[0]}
                ownerName="Fixture"
                vocabulary={vocabulary}
            />
        </DesignThemeProvider>
    );
afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});
it("releases the renderer on close and unmount, while forwarding explicit orientation controls", async () => {
    vi.stubGlobal("WebGL2RenderingContext", class {});
    load.mockReturnValue(viewer);
    const view = show();
    fireEvent.click(await screen.findByRole("button", { name: "Reverse" }));
    expect(viewer.back).toHaveBeenCalledOnce();
    expect(
        screen.getByTestId("medal-controls").querySelectorAll("[role=button]")
    ).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Front" }).textContent).toBe("");
    fireEvent.click(screen.getByRole("button", { name: "Front" }));
    expect(viewer.front).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Reset view" }));
    expect(viewer.front).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(screen.getByTestId("medal-stage"), { key: "ArrowLeft" });
    expect(viewer.rotate).toHaveBeenCalledWith(-0.15, 0);
    fireEvent.click(screen.getByRole("button", { name: "Close 3D view" }));
    expect(viewer.dispose).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Inspect in 3D" }));
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    view.unmount();
    expect(viewer.dispose).toHaveBeenCalledTimes(2);
});
it("keeps a static medal and metadata when WebGL cannot start", async () => {
    vi.stubGlobal("WebGL2RenderingContext", undefined);
    show();
    expect((await screen.findByRole("status")).textContent).toContain(
        vocabulary.MEDAL_3D_UNAVAILABLE
    );
    expect(load).not.toHaveBeenCalled();
});
