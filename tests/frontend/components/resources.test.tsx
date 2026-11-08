// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useAsyncResource } from "../../../packages/ui/src/headless/useAsyncResource";
import { usePagedSearch } from "../../../packages/ui/src/headless/usePagedSearch";

afterEach(() => vi.useRealTimers());
function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((done) => {
        resolve = done;
    });
    return { resolve, promise };
}
it("ignores earlier refreshes and results after the resource is disposed", async () => {
    const first = deferred<string>(),
        second = deferred<string>();
    const loader = vi
        .fn()
        .mockReturnValueOnce(first.promise)
        .mockReturnValueOnce(second.promise);
    const { result, unmount } = renderHook(() =>
        useAsyncResource<string>(loader)
    );
    let refresh!: Promise<void>;
    act(() => {
        refresh = result.current.refresh();
    });
    await act(async () => {
        second.resolve("latest");
        await refresh;
    });
    expect(result.current.data).toBe("latest");
    await act(async () => {
        first.resolve("obsolete");
        await first.promise;
    });
    expect(result.current.data).toBe("latest");
    unmount();
});
it("debounces searches, isolates account changes and deduplicates bounded pages", async () => {
    vi.useFakeTimers();
    const slow = deferred<{
        items: { publicId: string }[];
        total: number;
        nextOffset: number;
        hasMore: boolean;
    }>();
    const fetchPage = vi
        .fn()
        .mockReturnValueOnce(slow.promise)
        .mockResolvedValueOnce({
            items: [{ publicId: "b" }],
            total: 2,
            nextOffset: 1,
            hasMore: true,
        })
        .mockResolvedValueOnce({
            items: [{ publicId: "b" }, { publicId: "c" }],
            total: 2,
            nextOffset: 2,
            hasMore: false,
        });
    const { result, rerender } = renderHook(
        ({ scope, query }) =>
            usePagedSearch(
                { scope, query, sort: "relevance", enabled: true },
                fetchPage
            ),
        { initialProps: { scope: "alice", query: "old" } }
    );
    await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
    });
    rerender({ scope: "bob", query: "new" });
    expect(result.current.items).toEqual([]);
    await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
    });
    await act(async () => {
        slow.resolve({
            items: [{ publicId: "a" }],
            total: 1,
            nextOffset: 1,
            hasMore: false,
        });
        await slow.promise;
    });
    expect(result.current.items).toEqual([{ publicId: "b" }]);
    act(() => result.current.loadMore());
    await act(async () => {
        await vi.runAllTimersAsync();
    });
    expect(result.current.items).toEqual([
        { publicId: "b" },
        { publicId: "c" },
    ]);
    expect(fetchPage.mock.calls.map((call) => call[1])).toEqual([0, 0, 1]);
    expect(result.current.hasMore).toBe(false);
});
it("exposes an error and allows an explicit retry without an endless empty page", async () => {
    const fetchPage = vi
        .fn()
        .mockRejectedValueOnce(new Error("outage"))
        .mockResolvedValueOnce({
            items: [],
            total: 1,
            nextOffset: 0,
            hasMore: true,
        });
    const { result } = renderHook(() =>
        usePagedSearch(
            { scope: "alice", query: "x", sort: "relevance", enabled: true },
            fetchPage
        )
    );
    await waitFor(() => expect(result.current.error).toBe(true));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(false);
    expect(result.current.hasMore).toBe(false);
});
it("does not issue hidden optional requests and hides the previous resource immediately when its key changes", async () => {
    const loader = vi.fn().mockResolvedValue("first");
    const { result, rerender } = renderHook(
        ({ key, enabled }) => useAsyncResource(loader, key, enabled),
        { initialProps: { key: "first", enabled: false } }
    );
    expect(loader).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    rerender({ key: "first", enabled: true });
    await waitFor(() => expect(result.current.data).toBe("first"));
    loader.mockImplementation(() => new Promise(() => {}));
    rerender({ key: "second", enabled: true });
    expect(result.current.data).toBeUndefined();
    expect(result.current.loading).toBe(true);
});
