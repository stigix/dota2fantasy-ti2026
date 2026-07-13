# TI 2026 Fantasy UI

React + Vite interface for the TI 2026 fantasy calculator.

```bash
npm ci
npm run dev
```

Checks and production build:

```bash
npm run lint
npm run build
```

The interface imports `../players_stat.json`, `../leagues.json`, and `../dataset_meta.json` at build time. Run the root Python parser before rebuilding when you need fresh tournament data. Full instructions are in the root `README.md`.
