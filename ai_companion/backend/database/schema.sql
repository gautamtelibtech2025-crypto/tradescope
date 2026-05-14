create table if not exists memory_items (
    id bigserial primary key,
    user_id text not null,
    key text not null,
    value text not null,
    category text not null default 'preference',
    created_at timestamptz not null default now()
);

create index if not exists idx_memory_items_user_time on memory_items(user_id, created_at desc);

create table if not exists reminders (
    id bigserial primary key,
    user_id text not null,
    title text not null,
    note text not null default '',
    trigger_at timestamptz not null,
    status text not null default 'scheduled',
    created_at timestamptz not null default now()
);

create table if not exists user_preferences (
    user_id text not null,
    preference_key text not null,
    preference_value text not null,
    updated_at timestamptz not null default now(),
    primary key (user_id, preference_key)
);

