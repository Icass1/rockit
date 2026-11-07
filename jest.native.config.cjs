const preset = require("@react-native/jest-preset");

module.exports = {
    ...preset,
    rootDir: __dirname,
    testMatch: ["<rootDir>/tests/frontend/native/**/*.test.tsx"],
    maxWorkers: 2,
    moduleNameMapper: {
        ...preset.moduleNameMapper,
        "^@mobile/(.*)$": "<rootDir>/apps/mobile/$1",
        "^@/lib/api$": "<rootDir>/apps/mobile/lib/api.native.ts",
        "^@rockit/ui/runtime$": "<rootDir>/packages/ui/src/runtime.native.ts",
        "^@rockit/ui$": "<rootDir>/packages/ui/src/index.ts",
        "^@rockit/ui/(.*)$": "<rootDir>/packages/ui/src/$1",
        "^@rockit/theme/tokens$": "<rootDir>/packages/theme/src/tokens.json",
        "^@rockit/theme$": "<rootDir>/packages/theme/src/index.ts",
    },
    transform: Object.fromEntries(
        Object.entries(preset.transform).map(([pattern, transformer]) => [
            pattern,
            transformer === "babel-jest"
                ? [
                      "babel-jest",
                      {
                          presets: [
                              require.resolve("@react-native/babel-preset"),
                          ],
                          babelrc: false,
                          configFile: false,
                      },
                  ]
                : transformer,
        ])
    ),
    transformIgnorePatterns: [
        "node_modules/(?!((jest-)?react-native|@react-native(-community)?|[.]pnpm|test-renderer)/)",
    ],
};
