// @vitest-environment jsdom
import { vocabularyText } from "@rockit/shared";
import { DesignThemeProvider, ListeningProfile } from "@rockit/ui";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { listeningProfile } from "../fixtures/listeningProfile";

afterEach(cleanup);
const v = vocabularyText({ currentLang: "en", vocabulary: {} });
const panel = (
    loadProfile: () => Promise<typeof listeningProfile | null>,
    key = "sam"
) => (
    <DesignThemeProvider mode="dark">
        <ListeningProfile
            loadProfile={loadProfile}
            resourceKey={key}
            vocabulary={v}
        />
    </DesignThemeProvider>
);

it("shows real hours and earned emblems, then bounds and explains the complete catalog", async () => {
    render(panel(async () => listeningProfile));
    expect(await screen.findByText("50.6")).toBeTruthy();
    expect(screen.getByText("4 of 12 earned")).toBeTruthy();
    expect(
        screen
            .getByTestId("profile-emblems")
            .querySelectorAll('[role="button"]')
    ).toHaveLength(3);
    fireEvent.click(
        screen.getByRole("button", { name: "Explore all 12 emblems" })
    );
    expect(
        screen
            .getByTestId("profile-emblems")
            .querySelectorAll('[role="button"]')
    ).toHaveLength(9);
    fireEvent.click(screen.getAllByRole("button", { name: /^Inspect / })[4]);
    expect(screen.getByTestId("profile-emblem-detail").textContent).toContain(
        "42"
    );
    fireEvent.click(screen.getByRole("button", { name: "Next emblems" }));
    expect(
        screen
            .getByTestId("profile-emblems")
            .querySelectorAll('[role="button"]')
    ).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "Unlocked" }));
    expect(
        screen
            .getByTestId("profile-emblems")
            .querySelectorAll('[role="button"]')
    ).toHaveLength(4);
});
it("ignores a previous target's late profile and never reuses their statistics", async () => {
    let settle!: (profile: typeof listeningProfile) => void;
    const view = render(
        panel(
            () =>
                new Promise((resolve) => {
                    settle = resolve;
                })
        )
    );
    view.rerender(
        panel(
            async () => ({
                ...listeningProfile,
                username: "Alex",
                totalListeningSeconds: 3600,
            }),
            "alex"
        )
    );
    expect(await screen.findByText("Alex")).toBeTruthy();
    settle(listeningProfile);
    await waitFor(() => expect(screen.queryByText("Sam")).toBeNull());
    expect(screen.queryByText("50.6")).toBeNull();
});
it("shows retry on failure instead of zero-filled profile data", async () => {
    const load = vi
        .fn()
        .mockRejectedValueOnce(new Error("denied"))
        .mockResolvedValue(listeningProfile);
    render(panel(load));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.queryByTestId("listening-profile")).toBeNull();
    fireEvent.click(screen.getByText(v.SOCIAL_RETRY));
    expect(await screen.findByText("Sam")).toBeTruthy();
    expect(load).toHaveBeenCalledTimes(2);
});

it("filters a large collection by family and league without rendering hundreds of emblems", async () => {
    const { emblemCollectionProfile } =
        await import("../fixtures/emblemCollection");
    const profile = {
        ...emblemCollectionProfile,
        listeningBadges: Array.from({ length: 615 }, (_, index) => ({
            ...emblemCollectionProfile.listeningBadges[
                index % emblemCollectionProfile.listeningBadges.length
            ],
            key: `sample-${index}`,
        })),
    };
    render(panel(async () => profile));
    fireEvent.click(
        await screen.findByRole("button", { name: "Explore all 615 emblems" })
    );
    expect(
        screen
            .getByTestId("profile-emblems")
            .querySelectorAll('[role="button"]')
    ).toHaveLength(9);
    fireEvent.click(screen.getByRole("button", { name: "Diamond" }));
    expect(
        screen
            .getByTestId("profile-emblems")
            .querySelectorAll('[role="button"]')
    ).toHaveLength(9);
    fireEvent.click(screen.getByRole("button", { name: "Hidden tracks" }));
    const detail = screen.getByTestId("profile-emblem-detail");
    expect(detail.textContent).toContain("This secret reveals itself");
    expect(detail.textContent).not.toContain("0 / 0");
});
