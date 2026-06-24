create table if not exists import_history (
  id uuid primary key default gen_random_uuid(),
  file_name text,
  imported_by text,
  total_count integer default 0,
  success_count integer default 0,
  updated_count integer default 0,
  status text default 'Success',
  created_at timestamptz default now()
);

alter table import_history enable row level security;

create policy "Admins can manage import_history"
  on import_history for all
  using (true)
  with check (true);
