// @vitest-environment jsdom
import { vocabularyText } from "@rockit/shared";
import { DesignThemeProvider, MedalDetail } from "@rockit/ui";
import {
    medalRarity,
    medalStory,
    medalTitle,
} from "@rockit/ui/headless/medalCopy";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { listeningProfile } from "../fixtures/listeningProfile";

const v = vocabularyText({ currentLang: "en", vocabulary: {} });
afterEach(cleanup);
it("shows a concise story, rank and real rarity without repeating the family or instructions", () => {
    render(
        <DesignThemeProvider mode="dark">
            <MedalDetail
                badge={{
                    ...listeningProfile.listeningBadges[0],
                    holderPercentage: 0,
                }}
                ownerName="Sam"
                vocabulary={v}
                onBack={() => {}}
                locale="es"
            >
                <div />
            </MedalDetail>
        </DesignThemeProvider>
    );
    expect(screen.getByTestId("medal-rarity").textContent).toBe("0,00 %");
    expect(
        screen.getByTestId("medal-rarity").getAttribute("aria-label")
    ).toContain("0,00");
    expect(screen.getByTestId("medal-details-copy").textContent).toContain(
        "In the flow I"
    );
    expect(screen.queryByText(/Drag to rotate/)).toBeNull();
});
it("formats exactly two decimals without inventing rarity for missing data", () => {
    expect(medalRarity(100 / 3, "en")).toBe("33.33%");
    expect(medalRarity(100, "en")).toBe("100.00%");
    expect(medalRarity(null, "es")).toBeNull();
    expect(medalRarity(NaN, "en")).toBeNull();
});
it("keeps hidden objectives and their original reveal copy private", () => {
    const badge = {
        ...listeningProfile.listeningBadges[0],
        secret: true,
        titleKey: "FRIENDS_BADGE_SECRET_HIDDEN",
        descriptionKey: "FRIENDS_BADGE_SECRET_HINT",
        target: 0,
        current: 0,
    };
    expect(medalTitle(badge, v)).toBe(v.FRIENDS_BADGE_SECRET_HIDDEN);
    expect(medalStory(badge, v)).toBe(v.FRIENDS_BADGE_SECRET_HINT);
});

it("uses reviewed singular stories without changing achievement identity or plural copy", () => {
    const badge = {
        ...listeningProfile.listeningBadges[0],
        scope: "anniversary" as const,
        target: 1,
    };
    expect(medalStory(badge, v, "en")).toBe(
        "1 year since your RockIt story began."
    );
    expect(medalStory({ ...badge, target: 2 }, v, "en")).toBe(
        "2 years since your RockIt story began."
    );
    expect(medalStory({ ...badge, scope: "friends" }, v, "en")).toContain(
        "1 friendship that makes"
    );
    expect(medalStory({ ...badge, scope: "album_shares" }, v, "en")).toContain(
        "1 album recommendation."
    );
    expect(badge.titleKey).toBe(listeningProfile.listeningBadges[0].titleKey);
});
