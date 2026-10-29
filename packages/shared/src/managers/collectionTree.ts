import { CollectionPager } from "@/managers/collectionPager";
import { getRockIt } from "@/rockit/rockitRef";
import type {
    CollectionTreeBranch,
    CollectionTreeOptions,
    CollectionTreeRow,
    CollectionTreeTask,
} from "@/models/interfaces/collectionTree";
import { isAlbum, isList } from "@/models/types/media";
import { createAtom } from "@/lib/store";

/** A single flattened viewport with occurrence-specific, persistent expansion state. */
export class CollectionTree {
    readonly rows = createAtom<CollectionTreeRow[]>([]);
    private branches = new Map<string, CollectionTreeBranch>();
    private expanded = new Map<string, boolean>();
    private started = false;

    constructor(
        readonly root: CollectionPager,
        private options: CollectionTreeOptions
    ) {
        this.branches.set("root", { pager: root });
        this.rebuild();
    }

    start(): void {
        this.started = true;
        for (const [key, branch] of this.branches) this.subscribe(key, branch);
        this.rebuild();
    }

    stop(): void {
        this.started = false;
        for (const [key, branch] of this.branches) {
            branch.unsubscribe?.();
            branch.unsubscribe = undefined;
            if (key !== "root") branch.pager.dispose();
        }
        this.branches.clear();
        this.branches.set("root", { pager: this.root });
    }

    private subscribe(key: string, branch: CollectionTreeBranch): void {
        if (!branch.unsubscribe)
            branch.unsubscribe = branch.pager.state.listen(
                (state, previous) => {
                    if (
                        state.query !== previous.query ||
                        (state.media !== previous.media &&
                            (state.media.length < previous.media.length ||
                                previous.media.some(
                                    (media, index) =>
                                        media.publicId !==
                                        state.media[index]?.publicId
                                )))
                    ) {
                        for (const [childKey, child] of this.branches)
                            if (
                                childKey !== key &&
                                childKey.startsWith(`${key}/`)
                            ) {
                                child.unsubscribe?.();
                                child.pager.dispose();
                                this.branches.delete(childKey);
                            }
                        for (const expandedKey of this.expanded.keys())
                            if (expandedKey.startsWith(`${key}/`))
                                this.expanded.delete(expandedKey);
                    }
                    this.rebuild();
                }
            );
    }

    toggle(key: string): boolean {
        const row = this.rows.get().find((row) => row.key === key);
        if (!row || row.kind !== "media" || row.cycle || !isList(row.media))
            return false;
        const expanded = !row.expanded;
        this.expanded.set(key, expanded);
        this.rebuild();
        if (expanded) this.ensureLoaded(key);
        return expanded;
    }

    async refreshMediaAsync(publicId: string): Promise<void> {
        if (
            !this.started ||
            ![...this.branches.values()].some((branch) =>
                branch.pager.state
                    .get()
                    .media.some((media) => media.publicId === publicId)
            )
        )
            return;
        const response = await getRockIt().http.getMediaAsync(publicId);
        if (!response.isOk() || !this.started) return;
        const updated = response.result.media;
        for (const branch of this.branches.values()) {
            const state = branch.pager.state.get();
            if (
                !state.media.some(
                    (media) =>
                        media.publicId === publicId &&
                        media.type === updated.type
                )
            )
                continue;
            branch.pager.state.set({
                ...state,
                media: state.media.map((media) =>
                    media.publicId === publicId && media.type === updated.type
                        ? updated
                        : media
                ),
            });
        }
    }

    refreshNested(publicId: string): void {
        for (const [key, branch] of [...this.branches]) {
            if (key === "root" || branch.pager.publicId !== publicId) continue;
            branch.pager.dispose();
            const state = branch.pager.state.get();
            branch.pager.state.set({
                ...state,
                media: [],
                collection: undefined,
                offset: 0,
                total: 0,
                hasMore: false,
                loading: false,
                error: undefined,
            });
        }
    }

    ensureLoaded(key: string): void {
        if (key === "root") return;
        const branch = this.branches.get(key);
        if (
            branch &&
            !branch.pager.state.get().collection &&
            !branch.pager.state.get().loading &&
            !branch.pager.state.get().error
        )
            void branch.pager.load();
    }

    private rebuild(): void {
        const rows: CollectionTreeRow[] = [];
        const tasks: CollectionTreeTask[] = [
            {
                kind: "collection",
                key: "root",
                depth: 0,
                ancestors: new Set([this.root.publicId]),
                options: this.options,
            },
        ];
        while (tasks.length) {
            const task = tasks.pop()!;
            if (task.kind === "footer") {
                rows.push(task.row);
                continue;
            }
            if (task.kind === "entry") {
                rows.push(task.row);
                if (
                    isList(task.row.media) &&
                    task.row.expanded &&
                    !task.row.cycle
                ) {
                    let branch = this.branches.get(task.row.key);
                    if (!branch) {
                        branch = {
                            pager: new CollectionPager(task.row.media.publicId),
                        };
                        this.branches.set(task.row.key, branch);
                        if (this.started) this.subscribe(task.row.key, branch);
                    }
                    tasks.push({
                        kind: "collection",
                        key: task.row.key,
                        depth: task.row.depth + 1,
                        ancestors: new Set([
                            ...task.ancestors,
                            task.row.media.publicId,
                        ]),
                        options: {
                            showMediaIndex: isAlbum(task.row.media),
                            showMediaImage: !isAlbum(task.row.media),
                        },
                    });
                }
                continue;
            }
            const pager = this.branches.get(task.key)!.pager;
            const state = pager.state.get();
            rows.push({
                kind: "controls",
                key: `${task.key}/controls`,
                depth: task.depth,
                collectionKey: task.key,
                pager,
            });
            tasks.push({
                kind: "footer",
                row: {
                    kind: "footer",
                    key: `${task.key}/footer`,
                    depth: task.depth,
                    collectionKey: task.key,
                    pager,
                },
            });
            for (let index = state.media.length - 1; index >= 0; index--) {
                const media = state.media[index]!;
                const key = `${task.key}/${state.offset + index}:${media.publicId}`;
                const cycle =
                    isList(media) && task.ancestors.has(media.publicId);
                tasks.push({
                    kind: "entry",
                    ancestors: task.ancestors,
                    row: {
                        kind: "media",
                        key,
                        depth: task.depth,
                        media,
                        index: state.offset + index,
                        parentPublicId: pager.publicId,
                        expanded:
                            !cycle &&
                            (this.expanded.get(key) ??
                                state.expandedByMediaId[media.publicId] ??
                                false),
                        cycle,
                        ...task.options,
                    },
                });
            }
        }
        this.rows.set(rows);
    }
}
