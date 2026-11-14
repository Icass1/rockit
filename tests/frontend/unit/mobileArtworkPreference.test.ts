import { expect, it, vi } from "vitest";
import { PlayerUIManager } from "../../../apps/mobile/lib/managers/playerUIManager";

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
it("restores the appearance once and preserves it while the player is hidden", async () => {
    const read = vi.fn().mockResolvedValue(true),
        write = vi.fn().mockResolvedValue(undefined);
    const manager = new PlayerUIManager({ read, write });
    manager.initializeArtworkMode();
    manager.initializeArtworkMode();
    await flush();
    expect(read).toHaveBeenCalledTimes(1);
    expect(manager.vinylModeAtom.get()).toBe(true);
    manager.show();
    manager.hide();
    manager.show();
    expect(manager.vinylModeAtom.get()).toBe(true);
    expect(write).not.toHaveBeenCalled();
});
it("ignores a slow restore after a user choice and serializes writes", async () => {
    let restore!: (value: boolean) => void, finish!: () => void;
    const stored: boolean[] = [];
    const write = vi.fn((value: boolean) => {
        stored.push(value);
        return stored.length === 1
            ? new Promise<void>((resolve) => {
                  finish = resolve;
              })
            : Promise.resolve();
    });
    const manager = new PlayerUIManager({
        read: () =>
            new Promise((resolve) => {
                restore = resolve;
            }),
        write,
    });
    manager.initializeArtworkMode();
    manager.toggleVinylMode();
    manager.toggleVinylMode();
    restore(true);
    await flush();
    expect(manager.vinylModeAtom.get()).toBe(false);
    expect(stored).toEqual([true]);
    finish();
    await flush();
    expect(stored).toEqual([true, false]);
});
it("keeps the player usable when preference storage fails", async () => {
    const manager = new PlayerUIManager({
        read: vi.fn().mockRejectedValue(new Error("unavailable")),
        write: vi.fn().mockRejectedValue(new Error("unavailable")),
    });
    manager.initializeArtworkMode();
    await flush();
    manager.toggleVinylMode();
    await flush();
    expect(manager.vinylModeAtom.get()).toBe(true);
    manager.toggleVinylMode();
    await flush();
    expect(manager.vinylModeAtom.get()).toBe(false);
});
