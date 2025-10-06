import { atom } from "nanostores";
type Primitive = boolean | number | string;

export type ReadonlyIfObject<Value> = Value extends undefined
    ? Value
    : Value extends (...args: unknown[]) => unknown
      ? Value
      : Value extends Primitive
        ? Value
        : // eslint-disable-next-line @typescript-eslint/no-explicit-any
          Value extends any[]
          ? Readonly<Value>
          : Value extends object
            ? Readonly<Value>
            : Value;

type ReadonlyAtom<T> = {
    get(): T;
    subscribe(callback: (value: T) => void): () => void;
    listen(
        listener: (
            value: ReadonlyIfObject<T>,
            oldValue: ReadonlyIfObject<T>
        ) => void
    ): () => void;
    notify(oldValue?: ReadonlyIfObject<T>): void;
    off(): void;
    lc: number;
    value: T;
};

type Atom<T> = {
    get(): T;
    set(value: T, sendToSocket?: boolean): void;
    subscribe(callback: (value: T) => void): () => void;
    listen(
        listener: (
            value: ReadonlyIfObject<T>,
            oldValue: ReadonlyIfObject<T>
        ) => void
    ): () => void;
    notify(oldValue?: ReadonlyIfObject<T>): void;
    off(): void;
    getReadonlyAtom(): ReadonlyAtom<T>;
    lc: number;
    value: T;
};

type ReadonlyArrayAtom<T> = {
    get(): T[];
    subscribe(
        listener: (
            value: readonly T[],
            oldValue?: readonly T[] | undefined
        ) => void
    ): () => void;
    listen(
        listener: (
            value: ReadonlyIfObject<T[]>,
            oldValue: ReadonlyIfObject<T[]>
        ) => void
    ): () => void;
    notify(oldValue?: ReadonlyIfObject<T[]>): void;
    off(): void;
    concat(...items: ConcatArray<T>[]): T[];
    slice(start?: number, end?: number): T[];
    includes(searchElement: T, fromIndex?: number): boolean;
    indexOf(searchElement: T, fromIndex?: number): number;
    lastIndexOf(searchElement: T, fromIndex?: number): number;
    join(separator?: string): string;
    toString(): string;
    toLocaleString(): string;
    find(
        predicate: (value: T, index: number, obj: readonly T[]) => boolean,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        thisArg?: any
    ): T | undefined;
    findIndex(
        predicate: (value: T, index: number, obj: readonly T[]) => boolean,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        thisArg?: any
    ): number;
    findLast(
        predicate: (value: T, index: number, obj: readonly T[]) => boolean,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        thisArg?: any
    ): T | undefined;
    findLastIndex(
        predicate: (value: T, index: number, obj: readonly T[]) => boolean,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        thisArg?: any
    ): number;
    every(
        predicate: (value: T, index: number, obj: readonly T[]) => boolean,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        thisArg?: any
    ): boolean;
    some(
        predicate: (value: T, index: number, obj: readonly T[]) => boolean,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        thisArg?: any
    ): boolean;
    filter(
        predicate: (value: T, index: number, obj: readonly T[]) => boolean,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        thisArg?: any
    ): T[];
    map<U>(
        callbackfn: (value: T, index: number, obj: readonly T[]) => U,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        thisArg?: any
    ): U[];
    flat<U>(this: U[][], depth?: number): U[];
    flatMap<U>(
        callback: (
            value: T,
            index: number,
            array: readonly T[]
        ) => U | readonly U[],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        thisArg?: any
    ): U[];
    forEach(
        callbackfn: (value: T, index: number, obj: readonly T[]) => void,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        thisArg?: any
    ): void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reduceRight(callbackfn: any, initialValue?: any): any;
    keys(): IterableIterator<number>;
    values(): IterableIterator<T>;
    entries(): IterableIterator<[number, T]>;
    at(index: number): T | undefined;
    lc: number;
    value: T[];
};

type ArrayAtom<T> = {
    get(): T[];
    set(value: T[], sendToSocket?: boolean): void;
    subscribe(callback: (value: T[]) => void): () => void;
    listen(
        listener: (
            value: ReadonlyIfObject<T[]>,
            oldValue: ReadonlyIfObject<T[]>
        ) => void
    ): () => void;
    notify(oldValue?: ReadonlyIfObject<T[]>): void;
    off(): void;
    lc: number;
    value: T[];
    push(...items: T[]): number;
    pop(): T | undefined;
    shift(): T | undefined;
    unshift(...items: T[]): number;
    splice(start: number, deleteCount?: number, ...items: T[]): T[];
    sort(compareFn?: (a: T, b: T) => number): T[];
    getReadonlyAtom(): ReadonlyArrayAtom<T>;
    reverse(): T[];
    clear(): void;
};

export function createAtom<T>(
    ...args: undefined extends T ? [] | [T] : [T]
): Atom<T> {
    const baseAtom = atom<T>(...args);

    return {
        get() {
            return baseAtom.get();
        },
        set(value: T) {
            baseAtom.set(value);
        },
        subscribe(callback) {
            return baseAtom.subscribe(callback);
        },
        listen(listener) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return baseAtom.listen(listener as any);
        },
        notify(oldValue) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return baseAtom.notify(oldValue as any);
        },
        off() {
            return baseAtom.off();
        },
        getReadonlyAtom() {
            return {
                get() {
                    return baseAtom.get();
                },
                subscribe(callback) {
                    return baseAtom.subscribe(callback);
                },
                listen(listener) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    return baseAtom.listen(listener as any);
                },
                notify(oldValue) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    return baseAtom.notify(oldValue as any);
                },
                off() {
                    return baseAtom.off();
                },
                lc: baseAtom.lc,
                value: baseAtom.value,
            };
        },
        lc: baseAtom.lc,
        value: baseAtom.value,
    };
}

export function createArrayAtom<T>(
    ...args: undefined extends T[] ? [] | [T[]] : [T[]]
): ArrayAtom<T> {
    const tuple = (args.length ? args : [[]]) as [T[]];
    const baseAtom = atom<T[]>(...tuple);

    const setArray = (updater: (arr: T[]) => void): void => {
        const current = baseAtom.get();
        const next = [...current];
        updater(next);
        baseAtom.set(next);
    };

    // Helper to convert readonly array to mutable for internal use
    const toMutable = (arr: readonly T[]): T[] => [...arr];

    return {
        get() {
            return baseAtom.get();
        },
        set(value: T[]) {
            baseAtom.set([...value]);
        },
        subscribe(callback) {
            return baseAtom.subscribe((value) => callback(toMutable(value)));
        },
        listen(listener: (value: T[], oldValue: T[]) => void) {
            return baseAtom.listen((value, oldValue) =>
                listener(toMutable(value), toMutable(oldValue))
            );
        },
        notify(oldValue?: T[]) {
            return baseAtom.notify(oldValue);
        },
        off() {
            return baseAtom.off();
        },
        getReadonlyAtom(): ReadonlyArrayAtom<T> {
            const currentArray = () => baseAtom.get();

            return {
                get: () => currentArray(),
                subscribe: (
                    listener: (
                        value: readonly T[],
                        oldValue?: readonly T[] | undefined
                    ) => void
                ) => baseAtom.subscribe(listener),
                listen: (
                    listener: (
                        value: readonly T[],
                        oldValue: readonly T[]
                    ) => void
                ) => baseAtom.listen(listener),
                notify: (oldValue?: readonly T[]) => baseAtom.notify(oldValue),
                off: () => baseAtom.off(),
                lc: baseAtom.lc,
                value: baseAtom.value,

                // --- Non-Mutating Array Methods ---
                concat(...items: ConcatArray<T>[]): T[] {
                    return currentArray().concat(...items);
                },
                slice(start?: number, end?: number): T[] {
                    return currentArray().slice(start, end);
                },
                includes(searchElement: T, fromIndex?: number): boolean {
                    return currentArray().includes(searchElement, fromIndex);
                },
                indexOf(searchElement: T, fromIndex?: number): number {
                    return currentArray().indexOf(searchElement, fromIndex);
                },
                lastIndexOf(searchElement: T, fromIndex?: number): number {
                    return currentArray().lastIndexOf(searchElement, fromIndex);
                },
                join(separator?: string): string {
                    return currentArray().join(separator);
                },
                toString(): string {
                    return currentArray().toString();
                },
                toLocaleString(): string {
                    return currentArray().toLocaleString();
                },
                find(
                    predicate: (
                        value: T,
                        index: number,
                        obj: readonly T[]
                    ) => boolean,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    thisArg?: any
                ): T | undefined {
                    return currentArray().find(predicate, thisArg);
                },
                findIndex(
                    predicate: (
                        value: T,
                        index: number,
                        obj: readonly T[]
                    ) => boolean,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    thisArg?: any
                ): number {
                    return currentArray().findIndex(predicate, thisArg);
                },
                findLast(
                    predicate: (
                        value: T,
                        index: number,
                        obj: readonly T[]
                    ) => boolean,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    thisArg?: any
                ): T | undefined {
                    return currentArray().findLast(predicate, thisArg);
                },
                findLastIndex(
                    predicate: (
                        value: T,
                        index: number,
                        obj: readonly T[]
                    ) => boolean,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    thisArg?: any
                ): number {
                    return currentArray().findLastIndex(predicate, thisArg);
                },
                every(
                    predicate: (
                        value: T,
                        index: number,
                        obj: readonly T[]
                    ) => boolean,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    thisArg?: any
                ): boolean {
                    return currentArray().every(predicate, thisArg);
                },
                some(
                    predicate: (
                        value: T,
                        index: number,
                        obj: readonly T[]
                    ) => boolean,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    thisArg?: any
                ): boolean {
                    return currentArray().some(predicate, thisArg);
                },
                filter(
                    predicate: (
                        value: T,
                        index: number,
                        obj: readonly T[]
                    ) => boolean,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    thisArg?: any
                ): T[] {
                    return currentArray().filter(predicate, thisArg);
                },
                map<U>(
                    callbackfn: (
                        value: T,
                        index: number,
                        obj: readonly T[]
                    ) => U,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    thisArg?: any
                ): U[] {
                    return currentArray().map(callbackfn, thisArg);
                },
                flat<U>(this: U[][], depth?: number): U[] {
                    return currentArray().flat(depth) as U[];
                },
                flatMap<U>(
                    callback: (
                        value: T,
                        index: number,
                        array: readonly T[]
                    ) => U | readonly U[],
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    thisArg?: any
                ): U[] {
                    return currentArray().flatMap(callback, thisArg);
                },
                forEach(
                    callbackfn: (
                        value: T,
                        index: number,
                        obj: readonly T[]
                    ) => void,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    thisArg?: any
                ): void {
                    currentArray().forEach(callbackfn, thisArg);
                },

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                reduceRight(callbackfn: any, initialValue?: any): any {
                    return initialValue !== undefined
                        ? currentArray().reduceRight(callbackfn, initialValue)
                        : currentArray().reduceRight(callbackfn);
                },
                keys(): IterableIterator<number> {
                    return currentArray().keys();
                },
                values(): IterableIterator<T> {
                    return currentArray().values();
                },
                entries(): IterableIterator<[number, T]> {
                    return currentArray().entries();
                },
                at(index: number): T | undefined {
                    return currentArray().at(index);
                },
            };
        },

        // --- Array mutating methods ---
        push(...items: T[]): number {
            let newLength = 0;
            setArray((arr) => {
                newLength = arr.push(...items);
            });
            return newLength;
        },
        pop(): T | undefined {
            let removed: T | undefined;
            setArray((arr) => {
                removed = arr.pop();
            });
            return removed;
        },
        shift(): T | undefined {
            let removed: T | undefined;
            setArray((arr) => {
                removed = arr.shift();
            });
            return removed;
        },
        unshift(...items: T[]): number {
            let newLength = 0;
            setArray((arr) => {
                newLength = arr.unshift(...items);
            });
            return newLength;
        },
        splice(start: number, deleteCount?: number, ...items: T[]): T[] {
            let removed: T[] = [];
            setArray((arr) => {
                removed = arr.splice(
                    start,
                    deleteCount ?? arr.length,
                    ...items
                );
            });
            return removed;
        },
        sort(compareFn?: (a: T, b: T) => number): T[] {
            let sorted: T[] = [];
            setArray((arr) => {
                sorted = [...arr].sort(compareFn);
                arr.splice(0, arr.length, ...sorted);
            });
            return sorted;
        },
        reverse(): T[] {
            let reversed: T[] = [];
            setArray((arr) => {
                reversed = arr.reverse();
            });
            return reversed;
        },
        clear(): void {
            baseAtom.set([]);
        },

        lc: baseAtom.lc,
        value: baseAtom.value,
    };
}
