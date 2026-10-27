/** Measured, occurrence-keyed geometry; binary search keeps scrolling independent of row count. */
export class VirtualRowLayout {
    readonly offsets: number[] = [0];
    readonly total: number;
    readonly indices: ReadonlyMap<string, number>;
    constructor(
        readonly keys: string[],
        heights: ReadonlyMap<string, number>,
        estimate = 68
    ) {
        this.indices = new Map(keys.map((key, index) => [key, index]));
        for (const key of keys)
            this.offsets.push(
                this.offsets[this.offsets.length - 1]! +
                    (heights.get(key) ?? estimate)
            );
        this.total = this.offsets[this.offsets.length - 1]!;
    }
    anchorDelta(previous: VirtualRowLayout, offset: number): number {
        const previousIndex = previous.indexAt(offset);
        const key = previous.keys[previousIndex];
        const index = key ? this.indices.get(key) : undefined;
        return index === undefined
            ? 0
            : this.offsets[index]! - previous.offsets[previousIndex]!;
    }
    indexAt(offset: number): number {
        let low = 0,
            high = this.keys.length;
        while (low < high) {
            const middle = (low + high) >>> 1;
            if (this.offsets[middle + 1]! <= offset) low = middle + 1;
            else high = middle;
        }
        return Math.min(low, Math.max(0, this.keys.length - 1));
    }
    range(
        offset: number,
        height: number,
        overscan = 400
    ): { start: number; end: number } {
        return {
            start: this.indexAt(Math.max(0, offset - overscan)),
            end: Math.min(
                this.keys.length,
                this.indexAt(offset + height + overscan) + 1
            ),
        };
    }
}
