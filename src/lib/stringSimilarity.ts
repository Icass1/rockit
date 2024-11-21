export default function stringSimilarity(s1: string, s2: string): number {
    // Helper function to calculate the Levenshtein distance
    function levenshteinDistance(a: string, b: string): number {
        const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
            Array(b.length + 1).fill(0)
        );

        for (let i = 0; i <= a.length; i++) dp[i][0] = i;
        for (let j = 0; j <= b.length; j++) dp[0][j] = j;

        for (let i = 1; i <= a.length; i++) {
            for (let j = 1; j <= b.length; j++) {
                if (a[i - 1] === b[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] =
                        Math.min(
                            dp[i - 1][j], // Deletion
                            dp[i][j - 1], // Insertion
                            dp[i - 1][j - 1] // Substitution
                        ) + 1;
                }
            }
        }

        return dp[a.length][b.length];
    }

    const distance = levenshteinDistance(s1, s2);
    const maxLength = Math.max(s1.length, s2.length);

    // If both strings are empty, they are 100% similar
    if (maxLength === 0) return 100;

    // Calculate similarity percentage
    const similarity = ((maxLength - distance) / maxLength) * 100;

    return parseFloat(similarity.toFixed(2)); // Round to 2 decimal places
}
