# RockIt!

```bash
source venv/bin/activate
pip install -r requirements.txt
```

## Build Astro JS Node adapter
```bash
cd adapters--astrojs-node-8.3.4/packages/node
pnpm install
pnpm run build
pnpm pack
```

If better-sqlite returns an error run>
```bash
sudo apt install build-essential
```

## Para Nico xd

```bash
pnpm astro check
./backend/start-flask.sh
pnpm run dev
pnpm prettier -w src/*
```

## Paleta oficial:
from-[#ee1086] to-[#fb6467]