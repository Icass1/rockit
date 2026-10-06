import assert from "node:assert/strict";
import test from "node:test";
import type {
    CurrentMediaMessage,
    CurrentMediaMessageRequest,
    CurrentTimeMessage,
} from "@/dto";
import { BaseMediaPlayerManager } from "@/managers/baseMediaPlayerManager";
import { setRockIt, type IRockItContainer } from "@/rockit/rockitRef";
import type { TPlayableMedia } from "@/models/types/media";
import { EWebSocketMessage } from "@/models/types/webSocketMessages";

class FakePlayer extends BaseMediaPlayerManager {
    position = 0;
    sources: string[] = [];
    protected override loadNativeSource(_kind: string, uri: string): void {
        this.sources.push(uri);
    }
    protected override clearNativeSource(): void {}
    protected override pauseNative(): void {
        this.onNativePaused();
    }
    protected override playNative(): void {
        this.onNativePlaying();
    }
    protected override seekNative(_kind: string, sec: number): void {
        this.position = sec;
    }
    protected override getNativePosition(): number {
        return this.position;
    }
    protected override setNativeVolume(): void {}
    protected override isNativePaused(): boolean {
        return !this._playingAtom.get();
    }
    tick(sec: number): void {
        this.onNativeTimeUpdate(sec);
    }
    started(): void {
        this.onNativePlaying();
    }
    get token(): string {
        return this._playbackId;
    }
}

function setup(connected = false) {
    const player = new FakePlayer();
    const messages: object[] = [];
    const handlers = new Map<
        string,
        (data: CurrentTimeMessage | CurrentMediaMessage) => void | Promise<void>
    >();
    const song = (publicId: string, duration_ms = 120000) =>
        ({
            type: "song",
            publicId,
            duration_ms,
            audioUrl: `https://test/${publicId}`,
        }) as TPlayableMedia;
    const queue = {
        currentMedia: song("long", 1800000),
        currentQueueMediaId: 1,
    };
    const ws = {
        isConnected: connected,
        onMessage: (
            type: string,
            handler: (
                data: CurrentTimeMessage | CurrentMediaMessage
            ) => void | Promise<void>
        ) => handlers.set(type, handler),
        sendCurrentMedia: (data: object) => messages.push(data),
        sendCurrentTime: (data: object) => messages.push(data),
        sendSeek: (data: object) => messages.push(data),
    };
    setRockIt({
        queueManager: queue,
        mediaPlayerManager: player,
        webSocketManager: ws,
        userManager: {
            currentTimeMsAtom: { get: () => 1800000 },
            queueTypeAtom: { get: () => "SORTED" },
            repeatModeAtom: { get: () => "OFF" },
        },
        bookmarkManager: { currentMediaBookmarksAtom: { get: () => [] } },
    } as unknown as IRockItContainer);
    player.init();
    const receive = (
        mediaPublicId: string,
        queueMediaId: number,
        playbackId: string,
        currentTimeMs: number,
        isSeek = false
    ) => {
        handlers.get(EWebSocketMessage.CurrentTime)!({
            type: "current_time",
            mediaPublicId,
            queueMediaId,
            playbackId,
            currentTimeMs,
            isSeek,
        });
    };
    const receiveMedia = async (
        data: CurrentMediaMessageRequest,
        owner: boolean,
        inQueue = true
    ) => {
        const result = handlers.get(EWebSocketMessage.CurrentMedia)!({
            ...data,
            type: "current_media",
            isPlaybackOwner: owner,
        });
        if (inQueue) {
            if (queue.currentMedia.publicId !== data.mediaPublicId)
                queue.currentMedia = song(data.mediaPublicId);
            queue.currentQueueMediaId = data.queueMediaId;
            await player.setMedia(
                false,
                data.playbackId,
                data.currentTimeMs,
                owner
            );
        }
        await result;
    };
    const lastSelection = () =>
        [...messages]
            .reverse()
            .find(
                (message) => "queueType" in message
            ) as CurrentMediaMessageRequest;
    return {
        player,
        messages,
        queue,
        song,
        receive,
        receiveMedia,
        lastSelection,
    };
}

test("skip rejects old media, old occurrence and out-of-range positions", async () => {
    const { player, queue, song, receive } = setup();
    await player.setMedia();
    const old = player.token;
    player.started();
    player.tick(1700);
    queue.currentMedia = song("short");
    queue.currentQueueMediaId = 2;
    await player.setMedia();
    assert.equal(player.currentTime, 0);
    receive("long", 1, old, 1700000);
    receive("short", 2, old, 1700000);
    receive("short", 2, player.token, 1700000);
    assert.equal(player.currentTime, 0);
    assert.equal(player.position, 0);
});

test("remote selection starts at its own position and produces no echo", async () => {
    const { player, messages, queue, song, receive } = setup();
    queue.currentMedia = song("short");
    queue.currentQueueMediaId = 2;
    await player.setMedia(false, "remote", 0);
    assert.equal(player.position, 0);
    receive("short", 2, "remote", 10000);
    player.tick(0);
    assert.equal(player.currentTime, 10);
    assert.equal(messages.length, 0);
    receive("short", 2, "remote", 20000, true);
    assert.equal(player.position, 20);
    assert.equal(messages.length, 0);
});

test("loading saved state is passive; local playback claims ownership", async () => {
    const { player, messages, receive } = setup();
    await player.setMedia(true);
    assert.equal(messages.length, 0);
    receive("long", 1, "existing-session", 5000);
    assert.equal(player.currentTime, 5);
    player.play();
    await player.setMedia();
    assert.equal(player.position, 5);
    assert.equal(messages.length, 1);
    assert.notEqual(player.token, "existing-session");
});

test("rapid skips cancel an outgoing asynchronous source resolution", async () => {
    const { player, queue, song } = setup();
    const first = player.setMedia();
    queue.currentMedia = song("short");
    queue.currentQueueMediaId = 2;
    const second = player.setMedia();
    await Promise.all([first, second]);
    assert.deepEqual(player.sources, ["https://test/short"]);
    assert.equal(player.position, 0);
});

test("connected playback waits for the server ownership grant", async () => {
    const { player, receiveMedia, lastSelection } = setup(true);
    await player.setMedia(true);
    player.play();
    await player.setMedia();
    assert.equal(player.playingAtom.get(), false);
    await receiveMedia(lastSelection(), true);
    assert.equal(player.playingAtom.get(), true);
});

test("takeover pauses immediately even when the new media is missing from the queue", async () => {
    const { player, receiveMedia, lastSelection, messages } = setup(true);
    player.play();
    await player.setMedia();
    await receiveMedia(lastSelection(), true);
    assert.equal(player.playingAtom.get(), true);
    const count = messages.length;
    await receiveMedia(
        {
            mediaPublicId: "missing",
            queueMediaId: 99,
            playbackId: "another-device",
            queueType: "SORTED",
            currentTimeMs: 0,
        },
        false,
        false
    );
    assert.equal(player.playingAtom.get(), false);
    player.started();
    assert.equal(player.playingAtom.get(), false);
    player.tick(30);
    assert.equal(messages.length, count);
});

test("a later accepted claim restores playback after a simultaneous takeover", async () => {
    const { player, receiveMedia, lastSelection } = setup(true);
    player.play();
    await player.setMedia();
    const localClaim = lastSelection();
    await receiveMedia(
        { ...localClaim, playbackId: "earlier-other-device" },
        false
    );
    assert.equal(player.playingAtom.get(), false);
    await receiveMedia(localClaim, true);
    assert.equal(player.playingAtom.get(), true);
    assert.equal(player.token, localClaim.playbackId);
    player.pause();
    await receiveMedia(localClaim, true);
    assert.equal(player.playingAtom.get(), false);
});
