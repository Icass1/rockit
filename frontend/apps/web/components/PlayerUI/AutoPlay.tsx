export default function AutoPlay() {
    return (
        <div>
            <div className="mt-5 h-px w-full bg-neutral-400" />
            <h2 className="text-md my-2 px-4 font-semibold text-neutral-400">
                Reproducciones automáticas a continuación
            </h2>

            <p>AutoPlay TODO</p>

            {/* {AUTO_PLAY_MOCKS.map((mock, i) => {
                const autoMedia: QueueResponseItem = {
                    queueMediaId: -i - 1, // Negative IDs for mock medias
                    listPublicId: "",
                    media: {
                        type: "song",
                        downloaded: false,
                        imageUrl: rockIt.MEDIA_PLACEHOLDER_IMAGE_URL,
                        duration_ms: 123,
                        discNumber: 1,
                        trackNumber: 1,
                        providerUrl: "",
                        provider: "mock",
                        audioSrc: null,
                        publicId: `auto-${mock.id}`,
                        name: mock.title,
                        album: {
                            providerUrl: "",
                            type: "album",
                            name: "Single",
                            releaseDate: "2024-01-01",
                            imageUrl: rockIt.MEDIA_PLACEHOLDER_IMAGE_URL,
                            provider: "mock",
                            publicId: `auto-album-${mock.id}`,
                            url: "",
                            artists: [
                                {
                                    provider: "mock",
                                    publicId: "publicId",
                                    providerUrl: "",
                                    imageUrl:
                                        rockIt.MEDIA_PLACEHOLDER_IMAGE_URL,
                                    name: mock.artist,
                                    url: "",
                                },
                            ],
                        },
                        artists: [
                            {
                                provider: "mock",
                                publicId: "publicId",
                                providerUrl: "",
                                imageUrl: rockIt.MEDIA_PLACEHOLDER_IMAGE_URL,
                                name: mock.artist,
                                url: "",
                            },
                        ],
                    },
                };

                return (
                    <div
                        key={`auto-${mock.id}`}
                        className="relative w-full transition-[top] duration-200"
                        style={{
                            transitionTimingFunction:
                                "cubic-bezier(0.4, 0, 0.2, 1)",
                        }}
                    >
                        <ContextMenu>
                            <ContextMenuTrigger>
                                <div className="grid grid-cols-[1fr_45px] items-center">
                                    <div className="w-full max-w-full min-w-0">
                                        <QueueMedia media={autoMedia} />
                                    </div>
                                    <ListPlus className="h-full w-full p-1 pr-4" />
                                </div>
                            </ContextMenuTrigger>
                            <ContextMenuContent
                                cover={
                                    autoMedia.media.imageUrl ??
                                    rockIt.SONG_PLACEHOLDER_IMAGE_URL
                                }
                                title={autoMedia.media.name}
                                // description={`${autoMedia.media.album.name} • ${autoMedia.media.artists.map((a) => a.name).join(", ")}`}
                            >
                                <ContextMenuOption
                                    onClick={() => handlePlayMedia(autoMedia)}
                                >
                                    <PlayCircle className="h-5 w-5" />
                                    {$vocabulary.PLAY_MEDIA}
                                </ContextMenuOption>
                                <ContextMenuOption
                                    onClick={() => handleRemoveMedia(autoMedia)}
                                    disable={
                                        $currentQueueMediaId ===
                                        autoMedia.queueMediaId
                                    }
                                >
                                    <ListX className="h-5 w-5" />
                                    {$vocabulary.REMOVE_FROM_QUEUE}
                                </ContextMenuOption>
                                <ContextMenuOption
                                    onClick={() =>
                                        rockIt.indexedDBManager.saveMediaToIndexedDB(
                                            autoMedia.media
                                        )
                                    }
                                >
                                    <HardDriveDownload className="h-5 w-5" />
                                    {$vocabulary.DOWNLOAD_MEDIA_TO_DEVICE}
                                </ContextMenuOption>
                            </ContextMenuContent>
                        </ContextMenu>
                    </div>
                );
            })} */}
        </div>
    );
}
