create table if not exists admin_queue_metrics (
  id uuid primary key default gen_random_uuid(),
  queue_depth integer not null default 0,
  waiting integer not null default 0,
  active integer not null default 0,
  delayed integer not null default 0,
  failed integer not null default 0,
  completed integer not null default 0,
  worker_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists admin_queue_metrics_created_idx
  on admin_queue_metrics (created_at);
