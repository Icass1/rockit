import { useEffect, useState, type ReactNode } from "react";
import { useStore } from "@nanostores/react";
import { getRockitListName, isFeaturedCollectionId } from "@rockit/shared";
import { useAsyncResource } from "@rockit/ui/headless/useAsyncResource";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { toasterManager } from "@/lib/toasterManager";
import { useVocabulary } from "@/lib/vocabulary";
import MediaPressableWrapper from "@/components/Media/MediaPressableWrapper";

/** Resolve full metadata only when a shelf card's menu is requested. */
export default function CollectionMenuTrigger({
    publicId,
    children,
}: {
    publicId: string;
    children: (open: () => void) => ReactNode;
}) {
    const { vocabulary, lang } = useVocabulary();
    const session = useStore(rockIt.userManager.sessionAtom);
    const [requested, setRequested] = useState(false);
    const resource = useAsyncResource(
        async () => {
            const response = await Http.getCollectionItems(publicId, 0, 1);
            if (rockIt.userManager.sessionAtom.get() !== session)
                throw new Error("Obsolete collection menu");
            if (!response.isOk()) throw new Error(response.message);
            return isFeaturedCollectionId(publicId)
                ? {
                      ...response.result.collection,
                      name: getRockitListName(publicId, vocabulary),
                  }
                : response.result.collection;
        },
        `${session?.username}:${publicId}:${lang}`,
        requested
    );
    useEffect(() => {
        if (resource.error) toasterManager.notifyError(vocabulary.ERROR);
    }, [resource.error, vocabulary.ERROR]);
    return resource.data ? (
        <MediaPressableWrapper
            media={resource.data}
            allMedia={[]}
            openInitially={requested}
            renderTrigger={children}
        >
            {null}
        </MediaPressableWrapper>
    ) : (
        <>
            {children(() => {
                setRequested(true);
                if (resource.error) void resource.refresh();
            })}
        </>
    );
}
