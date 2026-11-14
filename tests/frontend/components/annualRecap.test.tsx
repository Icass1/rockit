// @vitest-environment jsdom
import { buildAnnualRecap, vocabularyText } from "@rockit/shared";
import { AnnualRecap, DesignThemeProvider } from "@rockit/ui";
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { recapStats } from "../fixtures/annualRecap";

const adapters = vi.hoisted(() => ({
    motion: false,
    state: undefined as undefined | ((state: string) => void),
    remove: vi.fn(),
}));
vi.mock("@rockit/ui/runtime", async (original) => ({
    ...(await original<object>()),
    AccessibilityInfo: {
        isReduceMotionEnabled: async () => adapters.motion,
        addEventListener: () => ({ remove: adapters.remove }),
    },
    AppState: {
        currentState: "active",
        addEventListener: (_: string, listener: (state: string) => void) => {
            adapters.state = listener;
            return { remove: adapters.remove };
        },
    },
}));
const v = vocabularyText({ currentLang: "en", vocabulary: {} });
const data = buildAnnualRecap(
    recapStats,
    2026,
    new Date("2026-11-13T12:00:00Z")
);
const start = async (motion = false) => {
    adapters.motion = motion;
    await act(async () => {
        render(
            <DesignThemeProvider mode="dark">
                <AnnualRecap
                    loadRecap={async () => data}
                    resourceKey="account:2026"
                    vocabulary={v}
                    locale="en"
                    onClose={vi.fn()}
                />
            </DesignThemeProvider>
        );
    });
};
afterEach(() => {
    cleanup();
    vi.useRealTimers();
});
it("pauses the progress clock explicitly and while the app is backgrounded", async () => {
    vi.useFakeTimers();
    await start();
    fireEvent.click(screen.getByRole("button", { name: "Start my recap" }));
    expect(screen.getByText(v.RECAP_TIME_TITLE)).toBeTruthy();
    act(() => vi.advanceTimersByTime(3000));
    fireEvent.click(screen.getByRole("button", { name: "Pause stories" }));
    act(() => vi.advanceTimersByTime(20000));
    expect(screen.getByText(v.RECAP_TIME_TITLE)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Resume stories" }));
    act(() => adapters.state?.("background"));
    act(() => vi.advanceTimersByTime(20000));
    expect(screen.getByText(v.RECAP_TIME_TITLE)).toBeTruthy();
    act(() => adapters.state?.("active"));
    act(() => vi.advanceTimersByTime(4000));
    expect(screen.getByText(v.RECAP_SONG_TITLE)).toBeTruthy();
});
it("honors reduced motion with manual navigation and a bounded artist countdown", async () => {
    vi.useFakeTimers();
    await start(true);
    fireEvent.click(screen.getByRole("button", { name: "Start my recap" }));
    act(() => vi.advanceTimersByTime(60000));
    expect(screen.getByText(v.RECAP_TIME_TITLE)).toBeTruthy();
    for (let index = 0; index < 3; index++)
        fireEvent.click(screen.getByRole("button", { name: "Next story" }));
    expect(screen.getByTestId("recap-artist-rank").textContent).toBe("#5");
    for (let index = 0; index < 4; index++)
        fireEvent.click(screen.getByRole("button", { name: "Next story" }));
    expect(screen.getByTestId("recap-artist-rank").textContent).toBe("#1");
    expect(screen.getByText(v.RECAP_MANUAL)).toBeTruthy();
});
it("offers a real empty state without invented rankings", async () => {
    const empty = buildAnnualRecap(
        {
            ...recapStats,
            summary: { ...recapStats.summary, totalPlayTimeMs: 0 },
        },
        2026,
        new Date("2026-11-13T12:00:00Z")
    );
    render(
        <DesignThemeProvider mode="dark">
            <AnnualRecap
                loadRecap={async () => empty}
                resourceKey="empty"
                vocabulary={v}
                locale="en"
                onClose={vi.fn()}
            />
        </DesignThemeProvider>
    );
    expect(await screen.findByText(v.RECAP_EMPTY_TITLE)).toBeTruthy();
    expect(screen.queryByTestId("recap-story")).toBeNull();
});
it("selects calendar years without applying numeric grouping to their labels", async () => {
    const selectYear = vi.fn();
    render(
        <DesignThemeProvider mode="dark">
            <AnnualRecap
                loadRecap={async () => data}
                resourceKey="years"
                vocabulary={v}
                locale="en"
                onClose={vi.fn()}
                availableYears={[2026, 2025]}
                onSelectYear={selectYear}
            />
        </DesignThemeProvider>
    );
    fireEvent.click(await screen.findByRole("button", { name: "Recap 2025" }));
    expect(selectYear).toHaveBeenCalledExactlyOnceWith(2025);
});
