import { HttpResult, RecommendationArtworkManager } from "@rockit/shared";
import { expect, it, vi } from "vitest";

it("coalesces repeated cover requests and never starts more than two lookups", async () => {
    let active = 0,
        max = 0;
    const releases: Array<() => void> = [];
    const lookup = vi.fn(async () => {
        max = Math.max(max, ++active);
        await new Promise<void>((resolve) => releases.push(resolve));
        active--;
        return new HttpResult({
            ok: true,
            result: { imageUrl: "/art.svg" },
            code: 200,
            message: "",
        });
    });
    const manager = new RecommendationArtworkManager({
        getRecommendationArtwork: lookup,
    });
    const first = manager.resolveAsync("Fixture", "Artist", "Song");
    const same = manager.resolveAsync("Fixture", "Artist", "Song");
    const other = manager.resolveAsync("Fixture", "Artist", "Other");
    const third = manager.resolveAsync("Fixture", "Artist", "Third");
    expect(first).toBe(same);
    expect(lookup).toHaveBeenCalledTimes(2);
    releases.shift()!();
    await first;
    await Promise.resolve();
    expect(lookup).toHaveBeenCalledTimes(3);
    releases.splice(0).forEach((release) => release());
    expect(await Promise.all([same, other, third])).toEqual([
        "/art.svg",
        "/art.svg",
        "/art.svg",
    ]);
    expect(max).toBe(2);
    expect(await manager.resolveAsync("Fixture", "Artist", "Song")).toBe(
        "/art.svg"
    );
    expect(lookup).toHaveBeenCalledTimes(3);
});
it("negative cover results expire so temporary provider failures can recover", async () => {
    const clock = vi.spyOn(Date, "now").mockReturnValue(1000);
    const lookup = vi
        .fn()
        .mockRejectedValueOnce(new Error("offline"))
        .mockResolvedValue(
            new HttpResult({
                ok: true,
                result: { imageUrl: "/recovered.svg" },
                code: 200,
                message: "",
            })
        );
    const manager = new RecommendationArtworkManager({
        getRecommendationArtwork: lookup,
    });
    expect(await manager.resolveAsync("Fixture", "Artist", "Song")).toBeNull();
    expect(await manager.resolveAsync("Fixture", "Artist", "Song")).toBeNull();
    expect(lookup).toHaveBeenCalledTimes(1);
    clock.mockReturnValue(62000);
    expect(await manager.resolveAsync("Fixture", "Artist", "Song")).toBe(
        "/recovered.svg"
    );
});
