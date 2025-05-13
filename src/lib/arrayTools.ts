export function reduce<T>(array: T[], callback: (item: T) => string): T[] {
    const reducedArray: T[] = [];
    const seenIds = new Set();

    for (const item of array) {
        if (!seenIds.has(callback(item))) {
            seenIds.add(callback(item));
            reducedArray.push(item);
        }
    }

    return reducedArray;
}

export function shuffle<T>(array: T[]): T[] {
    const newArray = [...array];

    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1)); // random index from 0 to i

        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}
