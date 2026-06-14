create table public.ecp_browser_demo_prompts (
  id bigint generated always as identity primary key,
  prompt text not null,
  assistant_mode text not null,
  provider_mode text not null,
  created_at timestamptz not null default now()
);

alter table public.ecp_browser_demo_prompts enable row level security;

create policy "Allow anonymous insert"
  on public.ecp_browser_demo_prompts
  for insert
  to anon
  with check (true);
