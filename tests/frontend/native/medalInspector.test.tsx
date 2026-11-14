import { forwardRef, useImperativeHandle } from "react";
import { NativeMedalInspector } from "@mobile/components/Friends/NativeMedalInspector.native";
import { vocabularyText } from "@rockit/shared";
import { DesignThemeProvider } from "@rockit/ui";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";
import { listeningProfile } from "../fixtures/listeningProfile";

const mockPost = jest.fn();
const mockDownload = jest.fn(async () => ({ localUri: "file:///medal.html" }));
jest.mock(
    "expo-asset",
    () => ({ Asset: { fromModule: () => ({ downloadAsync: mockDownload }) } }),
    { virtual: true }
);
jest.mock(
    "expo-file-system",
    () => ({
        File: class {
            text() {
                return Promise.resolve("<html>local renderer</html>");
            }
        },
    }),
    { virtual: true }
);
jest.mock("@/assets/medals/viewer.html", () => 1, { virtual: true });
jest.mock("react-native-svg", () => ({ SvgXml: () => null }), {
    virtual: true,
});
jest.mock("@rockit/ui/icons", () => new Proxy({}, { get: () => () => null }));
jest.mock(
    "react-native-webview",
    () => {
        const React = require("react");
        const { View } = require("react-native");
        return {
            WebView: React.forwardRef((props: object, ref: unknown) => {
                React.useImperativeHandle(ref, () => ({
                    postMessage: mockPost,
                }));
                return <View testID="local-webgl" {...props} />;
            }),
        };
    },
    { virtual: true }
);
const v = vocabularyText({ currentLang: "en", vocabulary: {} });
const protocol = "rockit-medal-v1";
const message = async (data: object) =>
    fireEvent(screen.getByTestId("local-webgl"), "message", {
        nativeEvent: { data: JSON.stringify({ protocol, ...data }) },
    });

afterEach(() => {
    jest.clearAllMocks();
});
it("boots a local isolated viewer, rejects stale replies, pauses in background and retries lost renderers", async () => {
    let change: ((state: AppStateStatus) => void) | undefined;
    const remove = jest.fn();
    jest.spyOn(AppState, "addEventListener").mockImplementation(
        (_name, listener) => {
            change = listener;
            return { remove };
        }
    );
    const view = await render(
        <DesignThemeProvider mode="dark">
            <NativeMedalInspector
                badge={listeningProfile.listeningBadges[0]}
                ownerName={"</script><script>alert(1)</script>"}
                vocabulary={v}
            />
        </DesignThemeProvider>
    );
    const web = await screen.findByTestId("local-webgl");
    expect(web.props.source.html).toBe("<html>local renderer</html>");
    expect(web.props.scrollEnabled).toBe(false);
    expect(web.props.allowFileAccess).toBe(false);
    expect(
        web.props.onShouldStartLoadWithRequest({ url: "https://example.com" })
    ).toBe(false);
    await message({ type: "boot" });
    const init = JSON.parse(mockPost.mock.calls[0][0]);
    expect(init.ownerName).toBe("</script><script>alert(1)</script>");
    expect(init.type).toBe("init");
    const count = mockPost.mock.calls.length;
    await message({ type: "boot" });
    expect(mockPost).toHaveBeenCalledTimes(count);
    await message({ type: "ready", instance: "old-profile" });
    expect(screen.queryByRole("button", { name: "Reverse" })).toBeNull();
    await message({ type: "ready", instance: init.instance });
    await fireEvent.press(screen.getByRole("button", { name: "Reverse" }));
    expect(JSON.parse(mockPost.mock.calls.at(-1)![0]).type).toBe("back");
    await act(() => change?.("background"));
    expect(JSON.parse(mockPost.mock.calls.at(-1)![0])).toMatchObject({
        type: "visibility",
        active: false,
    });
    await act(() => change?.("active"));
    await fireEvent(web, "contentProcessDidTerminate");
    expect(screen.queryByTestId("local-webgl")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Retry 3D" }));
    await screen.findByTestId("local-webgl");
    await message({ type: "boot" });
    const newInit = mockPost.mock.calls
        .map(([raw]) => JSON.parse(raw))
        .filter((c) => c.type === "init")
        .at(-1);
    expect(newInit.instance).not.toBe(init.instance);
    await message({ type: "ready", instance: init.instance });
    expect(screen.queryByRole("button", { name: "Reverse" })).toBeNull();
    await view.unmount();
    expect(remove).toHaveBeenCalledTimes(1);
});
