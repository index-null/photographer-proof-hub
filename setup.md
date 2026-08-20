◇ Dependencies installed
│
│ ╭─Next steps───────────────────────────────────────────────────────────────────────────────────────────────────────────╮
│ │ 1. cd photographer-proof-hub │
│ │ 2. bun run dev │
│ │ │
│ │ Local development │
│ │ Frontend http://localhost:3001 │
│ │ API http://localhost:3000 │
│ │ API reference http://localhost:3000/api-reference │
│ │ │
│ │ Database │
│ │ Apply schema bun run db:push │
│ │ Open studio bun run db:studio │
│ │ │
│ │ Git hooks with Lefthook: │
│ │ • Install hooks: bun lefthook install │
│ │ │
│ │ Linting and formatting: │
│ │ • Run checks: bun run check │
│ │ │
│ │ Deploy with Alchemy (web on Cloudflare + server on Cloudflare): │
│ │ • Configure provider login: cd packages/infra && bunx alchemy login --configure │
│ │ • Dev: bun run dev │
│ │ • Deploy: bun run deploy │
│ │ • Required after the first deploy: set CORS_ORIGIN in apps/server/.env to the deployed web origin, then deploy │
│ │ again │
│ │ • Destroy: bun run destroy │
