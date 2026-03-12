do $$
begin
  create type workflow_outbox_status as enum ('pending', 'processing', 'sent', 'failed');
exception
  when duplicate_object then null;
end
$$;

create table if not exists workflow_outbox (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references workflows(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  job_type workflow_type not null,
  job_data jsonb not null default '{}'::jsonb,
  status workflow_outbox_status not null default 'pending',
  attempts integer not null default 0,
  last_error text,
  next_attempt_at timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists workflow_outbox_workflow_idx
  on workflow_outbox (workflow_id);

create index if not exists workflow_outbox_status_next_idx
  on workflow_outbox (status, next_attempt_at);

create index if not exists workflow_outbox_user_created_idx
  on workflow_outbox (user_id, created_at);

create table if not exists rate_limit_counters (
  key varchar(191) primary key,
  count integer not null default 0,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists rate_limit_counters_expires_idx
  on rate_limit_counters (expires_at);
