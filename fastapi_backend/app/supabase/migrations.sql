create table public.profiles (
  id uuid not null,
  email text null,
  full_name text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint profiles_pkey primary key (id),
  constraint profiles_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.hired_agents (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  hired_at timestamp with time zone null default now(),
  template_id uuid null,
  name text null,
  personality text null default 'helpful'::text,
  tone text null default 'professional'::text,
  response_length text null default 'medium'::text,
  expertise text null default 'general'::text,
  updated_at timestamp with time zone null default now(),
  constraint hired_agents_pkey primary key (id),
  constraint hired_agents_user_id_template_id_key unique (user_id, template_id),
  constraint hired_agents_template_id_fkey foreign KEY (template_id) references agent_templates (id) on delete CASCADE,
  constraint hired_agents_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create trigger on_agent_hired
after INSERT on hired_agents for EACH row
execute FUNCTION handle_agent_hired ();

create table public.agent_templates (
  id uuid not null default gen_random_uuid (),
  name text not null,
  category text not null,
  description text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint agent_templates_pkey primary key (id)
) TABLESPACE pg_default;