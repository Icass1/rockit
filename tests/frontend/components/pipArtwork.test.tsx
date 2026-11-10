// @vitest-environment jsdom
import type { BaseSongWithAlbumResponse, TPlayableMedia } from "@rockit/shared";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PiPArtworkTransition } from "../../../apps/web/components/PiP/PiPArtworkTransition";

// Match browser event support before React chooses its animation event name.
vi.hoisted(() => {
    Object.defineProperty(window, "AnimationEvent", {
        configurable: true,
        value: class extends window.Event {},
    });
});

function song(id: string, album = id): BaseSongWithAlbumResponse {
    return {
        type: "song",
        publicId: id,
        provider: "Fixture",
        providerUrl: "",
        name: id,
        explicit: null,
        explicitSource: null,
        artists: [],
        audioUrl: null,
        downloaded: true,
        imageUrl: `/cover-${album}.png`,
        dominantColor: "",
        duration_ms: 200000,
        discNumber: 1,
        trackNumber: 1,
        album: {
            type: "album",
            publicId: album,
            provider: "Fixture",
            providerUrl: "",
            url: "",
            name: album,
            artists: [],
            releaseDate: "",
            imageUrl: "",
            dominantColor: "",
            undownloadedCount: 0,
        },
    };
}
function artwork(media: TPlayableMedia, cover: string) {
    return <img src={cover} alt={media.name} />;
}
function Probe({
    media,
    reduced = false,
}: {
    media: TPlayableMedia;
    reduced?: boolean;
}) {
    return (
        <PiPArtworkTransition
            media={media}
            cover={media.imageUrl}
            direction={1}
            reducedMotion={reduced}
        >
            {artwork}
        </PiPArtworkTransition>
    );
}
afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

it("updates auxiliary-document artwork while the opener's animation frames never run", () => {
    const frozenFrames = vi.fn(() => 0);
    vi.stubGlobal("requestAnimationFrame", frozenFrames);
    const frame = document.createElement("iframe");
    document.body.appendChild(frame);
    const pip = frame.contentDocument!.body;
    const view = render(<Probe media={song("first")} />, { container: pip });
    view.rerender(<Probe media={song("second")} />);
    expect(
        pip
            .querySelector('[data-pip-artwork="current"] img')
            ?.getAttribute("src")
    ).toBe("/cover-second.png");
    expect(pip.querySelectorAll("[data-pip-artwork]").length).toBe(2);
    fireEvent.animationEnd(pip.querySelector('[data-pip-artwork="current"]')!);
    expect(pip.querySelectorAll("[data-pip-artwork]").length).toBe(1);
    expect(pip.querySelector('[data-pip-artwork="outgoing"]')).toBeNull();
    expect(frozenFrames).not.toHaveBeenCalled();
    view.unmount();
    frame.remove();
});

it("preserves the disc within an album and bounds rapid album changes to two layers", () => {
    const view = render(<Probe media={song("one", "album")} />);
    const disc = view.container.querySelector('[data-pip-artwork="current"]');
    view.rerender(<Probe media={song("two", "album")} />);
    expect(view.container.querySelector('[data-pip-artwork="current"]')).toBe(
        disc
    );
    expect(
        view.container.querySelector('[data-pip-artwork="outgoing"]')
    ).toBeNull();
    for (const id of ["other", "third", "latest"]) {
        view.rerender(<Probe media={song(id)} />);
        expect(
            view.container.querySelectorAll("[data-pip-artwork]").length
        ).toBe(2);
    }
    const image = view.container.querySelector(
        '[data-pip-artwork="current"] img'
    )!;
    fireEvent.animationEnd(image);
    expect(view.container.querySelectorAll("[data-pip-artwork]").length).toBe(
        2
    );
    fireEvent.animationEnd(image.parentElement!);
    expect(view.container.querySelectorAll("[data-pip-artwork]").length).toBe(
        1
    );
    expect(image.getAttribute("src")).toBe("/cover-latest.png");
});

it("shows reduced-motion changes immediately and never resurrects an old cover", () => {
    const view = render(<Probe media={song("one")} />);
    view.rerender(<Probe media={song("two")} />);
    view.rerender(<Probe media={song("two")} reduced />);
    expect(view.container.querySelectorAll("[data-pip-artwork]").length).toBe(
        1
    );
    view.rerender(<Probe media={song("two")} />);
    expect(view.container.querySelectorAll("[data-pip-artwork]").length).toBe(
        1
    );
    view.rerender(<Probe media={song("three")} reduced />);
    expect(
        view.container
            .querySelector('[data-pip-artwork="current"] img')
            ?.getAttribute("src")
    ).toBe("/cover-three.png");
    expect(view.container.querySelectorAll("[data-pip-artwork]").length).toBe(
        1
    );
});
