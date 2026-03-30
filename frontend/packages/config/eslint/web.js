/** @type {import("eslint").Linter.Config} */
export default [
    {
        files: ["**/*.ts", "**/*.tsx"],
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: process.cwd(),
            },
        },
        plugins: {
            "@typescript-eslint":
                await import("@typescript-eslint/eslint-plugin"),
        },
        rules: {
            "@typescript-eslint/no-unused-vars": "warn",
            "@typescript-eslint/no-explicit-any": "warn",
        },
    },
];
