# Prettier Setup

To run Prettier globally in this project, install it as a global pnpm package:

```bash
pnpm install -g prettier
```

## Usage

Format all files:

```bash
prettier --write .
```

Format specific files:

```bash
prettier --write app/components/**/*.tsx
```

## Plugins

If using Tailwind CSS, install the plugin:

```bash
pnpm install -g @tailwindcss/postcss prettier-plugin-tailwindcss
```

For sorting imports:

```bash
pnpm install -g @ianvs/prettier-plugin-sort-imports
```

Then add to your Prettier config (e.g., `.prettierrc`):

```json
{
    "plugins": [
        "prettier-plugin-tailwindcss",
        "@ianvs/prettier-plugin-sort-imports"
    ]
}
```
