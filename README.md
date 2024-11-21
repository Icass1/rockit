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


## Para Nico xd
```bash
./backend/start-flask.sh
pnpm run dev