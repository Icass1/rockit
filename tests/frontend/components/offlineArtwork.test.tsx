// @vitest-environment jsdom
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useOfflineArtwork } from "../../../apps/mobile/hooks/useOfflineArtwork";

const { getImageUri } = vi.hoisted(() => ({
    getImageUri: vi.fn(async (_id: string): Promise<string | null> => null),
}));
vi.mock("@/lib/storage/mediaStorage", () => ({
    mediaStorage: { getImageUri },
}));
afterEach(() => {
    cleanup();
    getImageUri.mockReset();
});
it("renders safely before playback selects a song", () => {
    const { result } = renderHook(() => useOfflineArtwork());
    expect(result.current).toBeUndefined();
    expect(getImageUri).not.toHaveBeenCalled();
});
it("uses the persisted artwork and rejects a late cover from the previous song", async () => {
    let release!: (uri: string | null) => void;
    getImageUri.mockImplementationOnce(
        () =>
            new Promise((resolve) => {
                release = resolve;
            })
    );
    getImageUri.mockResolvedValueOnce("blob:new-cover");
    const { result, rerender } = renderHook(
        ({ id, remote }) => useOfflineArtwork(id, remote),
        { initialProps: { id: "a", remote: "/a.png" } }
    );
    expect(result.current).toBe("/a.png");
    rerender({ id: "b", remote: "/b.png" });
    await waitFor(() => expect(result.current).toBe("blob:new-cover"));
    release("blob:obsolete");
    await Promise.resolve();
    expect(result.current).toBe("blob:new-cover");
});
