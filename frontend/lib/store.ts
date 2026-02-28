import { atom } from "nanostores";

// ─────────────────────────────────────────────
// Tipos auxiliares
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// Tipos públicos — contratos de los átomos
// ─────────────────────────────────────────────

type BaseAtomShape<T> = {
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
    get lc(): number;
    get value(): T;
};

export type ReadonlyAtom<T> = BaseAtomShape<T>;

export type Atom<T> = BaseAtomShape<T> & {
    set(value: T): void;
    getReadonlyAtom(): ReadonlyAtom<T>;
};

// ReadonlyArrayAtom expone todos los métodos no-mutantes de Array<T>
// a través de un Proxy — no necesitamos listarlos manualmente.
export type ReadonlyArrayAtom<T> = BaseAtomShape<T[]> & readonly T[];

export type ArrayAtom<T> = {
    get(): T[];
    subscribe(callback: (value: T[]) => void): () => void;
    listen(
        listener: (
            value: ReadonlyIfObject<T[]>,
            oldValue: ReadonlyIfObject<T[]>
        ) => void
    ): () => void;
    notify(oldValue?: ReadonlyIfObject<T[]>): void;
    off(): void;
    get lc(): number;
    get value(): T[];
    set(value: T[]): void;
    push(...items: T[]): number;
    pop(): T | undefined;
    shift(): T | undefined;
    unshift(...items: T[]): number;
    splice(start: number, deleteCount?: number, ...items: T[]): T[];
    sort(compareFn?: (a: T, b: T) => number): T[];
    reverse(): T[];
    clear(): void;
    getReadonlyAtom(): ReadonlyArrayAtom<T>;
};

// ─────────────────────────────────────────────
// createAtom
// ─────────────────────────────────────────────

export function createAtom<T>(
    ...args: undefined extends T ? [] | [T] : [T]
): Atom<T> {
    const baseAtom = atom<T>(...args);
    let _readonly: ReadonlyAtom<T> | undefined;

    const self: Atom<T> = {
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
        get lc() {
            return baseAtom.lc;
        },
        get value() {
            return baseAtom.value;
        },
        getReadonlyAtom(): ReadonlyAtom<T> {
            return (
                _readonly ??= {
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
                    get lc() {
                        return baseAtom.lc;
                    },
                    get value() {
                        return baseAtom.value;
                    },
                }
            );
        },
    };

    return self;
}

// ─────────────────────────────────────────────
// createArrayAtom
// ─────────────────────────────────────────────

export function createArrayAtom<T>(
    ...args: undefined extends T[] ? [] | [T[]] : [T[]]
): ArrayAtom<T> {
    const tuple = (args.length ? args : [[]]) as [T[]];
    const baseAtom = atom<T[]>(...tuple);
    let _readonly: ReadonlyArrayAtom<T> | undefined;

    /**
     * Helper that applies a mutable operation on a copy of the current array
     * and pushes the result back into the atom — triggering subscribers once.
     */
    const setArray = (updater: (arr: T[]) => void): void => {
        const next = [...baseAtom.get()];
        updater(next);
        baseAtom.set(next);
    };

    const self: ArrayAtom<T> = {
        get() {
            return baseAtom.get();
        },
        set(value: T[]) {
            baseAtom.set(value);
        },
        subscribe(callback) {
            return baseAtom.subscribe(
                callback as (value: readonly T[]) => void
            );
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
        get lc() {
            return baseAtom.lc;
        },
        get value() {
            return baseAtom.value;
        },

        // ── Mutating array methods ──────────────────────────────────────

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

        // ── getReadonlyAtom ─────────────────────────────────────────────
        /**
         * Returns a memoized read-only view of the atom.
         *
         * The non-mutating array methods (map, filter, find, includes, ...)
         * are exposed via a Proxy that delegates to baseAtom.get() at call
         * time — no need to enumerate them manually. This replaces ~150 lines
         * of boilerplate from the previous implementation.
         *
         * The Proxy intercepts property access:
         *   - Known atom keys (get, subscribe, listen, lc, value…) → atom shape
         *   - Everything else → delegate to the live array from baseAtom.get()
         */
        getReadonlyAtom(): ReadonlyArrayAtom<T> {
            if (_readonly) return _readonly;

            const atomShape: BaseAtomShape<T[]> = {
                get() {
                    return baseAtom.get();
                },
                subscribe(listener) {
                    return baseAtom.subscribe(
                        listener as (value: readonly T[]) => void
                    );
                },
                listen(listener) {
                    return baseAtom.listen(listener);
                },
                notify(oldValue?: readonly T[]) {
                    return baseAtom.notify(oldValue);
                },
                off() {
                    return baseAtom.off();
                },
                get lc() {
                    return baseAtom.lc;
                },
                get value() {
                    return baseAtom.value;
                },
            };

            // Keys that belong to the atom shape — served from atomShape directly
            const ATOM_KEYS = new Set<string | symbol>([
                "get",
                "set",
                "subscribe",
                "listen",
                "notify",
                "off",
                "lc",
                "value",
            ]);

            _readonly = new Proxy(atomShape, {
                get(target, prop, receiver) {
                    // Serve atom shape properties from the target
                    if (ATOM_KEYS.has(prop)) {
                        return Reflect.get(target, prop, receiver);
                    }
                    // Delegate everything else to the live array
                    const arr = baseAtom.get();
                    const val = Reflect.get(arr, prop, arr);
                    // Bind functions so `this` inside them refers to the array
                    return typeof val === "function" ? val.bind(arr) : val;
                },
                has(_, prop) {
                    return prop in baseAtom.get();
                },
            }) as ReadonlyArrayAtom<T>;

            return _readonly;
        },
    };

    return self;
}
