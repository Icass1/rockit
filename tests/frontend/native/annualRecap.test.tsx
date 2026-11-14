import { buildAnnualRecap, vocabularyText } from "@rockit/shared";
import { AnnualRecap, DesignThemeProvider } from "@rockit/ui";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";
import { recapStats } from "../fixtures/annualRecap";

jest.mock("@rockit/ui/icons", () => new Proxy({}, { get: () => () => null }));
it("presents the same recap with native controls and reduced-motion navigation", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(
        true
    );
    const v = vocabularyText({ currentLang: "en", vocabulary: {} });
    await render(
        <DesignThemeProvider mode="dark">
            <AnnualRecap
                loadRecap={async () =>
                    buildAnnualRecap(
                        recapStats,
                        2026,
                        new Date("2026-11-13T12:00:00Z")
                    )
                }
                resourceKey="native:2026"
                vocabulary={v}
                locale="en"
                onClose={jest.fn()}
            />
        </DesignThemeProvider>
    );
    await screen.findByText(v.RECAP_INTRO_TITLE);
    await fireEvent.press(screen.getByRole("button", { name: v.RECAP_START }));
    expect(screen.getByText(v.RECAP_TIME_TITLE)).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: v.RECAP_NEXT }));
    expect(screen.getByText("Everything In Its Right Place")).toBeTruthy();
});
