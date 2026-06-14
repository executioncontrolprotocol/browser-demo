# Supabase (browser-demo prompt logging)

Remote-only setup for the `ecp_browser_demo_prompts` table.

## One-time setup

```sh
npx supabase login
npx supabase link --project-ref <your-project-ref>
npm run supabase:push
```

Link state is stored under `supabase/.temp/` (gitignored). Each developer runs `link` once.

## Scripts

| Script | Description |
| ------ | ----------- |
| `npm run supabase:push` | Apply pending migrations to the linked remote project |
| `npm run supabase:status` | List applied vs pending migrations |

## App env

Copy `.env.example` to `.env` and set:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
