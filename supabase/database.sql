-- Agenda Art da Navalha — Supabase/PostgreSQL
-- Execute este arquivo completo em: Supabase > SQL Editor > New query

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create type public.member_role as enum ('owner', 'manager', 'barber');
create type public.appointment_status as enum ('pending', 'confirmed', 'completed', 'cancelled');

create table public.barbershops (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  timezone text not null default 'America/Sao_Paulo',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'barber',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (barbershop_id, user_id)
);

create table public.barbers (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null check (char_length(name) between 2 and 100),
  phone text,
  color text not null default '#C49955' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (barbershop_id, user_id)
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 100),
  duration_minutes integer not null default 30 check (duration_minutes between 5 and 480),
  price numeric(10,2) not null default 0 check (price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (barbershop_id, name)
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  phone text not null check (char_length(phone) between 8 and 25),
  email text,
  notes text check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (barbershop_id, phone)
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete restrict,
  barber_id uuid not null references public.barbers(id) on delete restrict,
  service_id uuid not null references public.services(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.appointment_status not null default 'pending',
  notes text check (char_length(notes) <= 1000),
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index appointments_shop_start_idx on public.appointments(barbershop_id, starts_at);
create index appointments_barber_start_idx on public.appointments(barber_id, starts_at);
create index clients_shop_name_idx on public.clients(barbershop_id, name);
create index members_user_idx on public.members(user_id, barbershop_id);

-- Impede horários sobrepostos para o mesmo barbeiro, exceto cancelados.
alter table public.appointments add constraint appointments_no_overlap
exclude using gist (
  barber_id with =,
  tstzrange(starts_at, ends_at, '[)') with &&
) where (status <> 'cancelled');

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;

create trigger barbershops_updated before update on public.barbershops for each row execute function public.set_updated_at();
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger barbers_updated before update on public.barbers for each row execute function public.set_updated_at();
create trigger services_updated before update on public.services for each row execute function public.set_updated_at();
create trigger clients_updated before update on public.clients for each row execute function public.set_updated_at();
create trigger appointments_updated before update on public.appointments for each row execute function public.set_updated_at();

-- Funções auxiliares de autorização. SECURITY DEFINER evita recursão nas políticas.
create or replace function public.is_shop_member(shop_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.members m where m.barbershop_id = shop_id and m.user_id = (select auth.uid()) and m.active);
$$;

create or replace function public.is_shop_admin(shop_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.members m where m.barbershop_id = shop_id and m.user_id = (select auth.uid()) and m.active and m.role in ('owner','manager'));
$$;

revoke all on function public.is_shop_member(uuid) from public;
revoke all on function public.is_shop_admin(uuid) from public;
grant execute on function public.is_shop_member(uuid) to authenticated;
grant execute on function public.is_shop_admin(uuid) to authenticated;

alter table public.barbershops enable row level security;
alter table public.profiles enable row level security;
alter table public.members enable row level security;
alter table public.barbers enable row level security;
alter table public.services enable row level security;
alter table public.clients enable row level security;
alter table public.appointments enable row level security;

create policy "profile_select_self" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profile_update_self" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "shop_select_member" on public.barbershops for select to authenticated using (public.is_shop_member(id));
create policy "shop_update_admin" on public.barbershops for update to authenticated using (public.is_shop_admin(id)) with check (public.is_shop_admin(id));

create policy "members_select_member" on public.members for select to authenticated using (public.is_shop_member(barbershop_id));
create policy "members_insert_admin" on public.members for insert to authenticated with check (public.is_shop_admin(barbershop_id));
create policy "members_update_admin" on public.members for update to authenticated using (public.is_shop_admin(barbershop_id)) with check (public.is_shop_admin(barbershop_id));
create policy "members_delete_admin" on public.members for delete to authenticated using (public.is_shop_admin(barbershop_id) and role <> 'owner');

create policy "barbers_select_member" on public.barbers for select to authenticated using (public.is_shop_member(barbershop_id));
create policy "barbers_insert_admin" on public.barbers for insert to authenticated with check (public.is_shop_admin(barbershop_id));
create policy "barbers_update_admin" on public.barbers for update to authenticated using (public.is_shop_admin(barbershop_id)) with check (public.is_shop_admin(barbershop_id));
create policy "barbers_delete_admin" on public.barbers for delete to authenticated using (public.is_shop_admin(barbershop_id));

create policy "services_select_member" on public.services for select to authenticated using (public.is_shop_member(barbershop_id));
create policy "services_insert_admin" on public.services for insert to authenticated with check (public.is_shop_admin(barbershop_id));
create policy "services_update_admin" on public.services for update to authenticated using (public.is_shop_admin(barbershop_id)) with check (public.is_shop_admin(barbershop_id));
create policy "services_delete_admin" on public.services for delete to authenticated using (public.is_shop_admin(barbershop_id));

create policy "clients_select_member" on public.clients for select to authenticated using (public.is_shop_member(barbershop_id));
create policy "clients_insert_member" on public.clients for insert to authenticated with check (public.is_shop_member(barbershop_id));
create policy "clients_update_member" on public.clients for update to authenticated using (public.is_shop_member(barbershop_id)) with check (public.is_shop_member(barbershop_id));
create policy "clients_delete_admin" on public.clients for delete to authenticated using (public.is_shop_admin(barbershop_id));

create policy "appointments_select_member" on public.appointments for select to authenticated using (public.is_shop_member(barbershop_id));
create policy "appointments_insert_member" on public.appointments for insert to authenticated with check (public.is_shop_member(barbershop_id) and created_by = (select auth.uid()));
create policy "appointments_update_member" on public.appointments for update to authenticated using (public.is_shop_member(barbershop_id)) with check (public.is_shop_member(barbershop_id));
create policy "appointments_delete_admin" on public.appointments for delete to authenticated using (public.is_shop_admin(barbershop_id));

-- Cria automaticamente perfil, barbearia inicial, vínculo de proprietário e dados básicos.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare shop_id uuid;
begin
  insert into public.profiles(id, full_name) values(new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)));
  insert into public.barbershops(name, created_by) values(coalesce(nullif(new.raw_user_meta_data ->> 'barbershop_name',''), 'Minha Barbearia'), new.id) returning id into shop_id;
  insert into public.members(barbershop_id, user_id, role) values(shop_id, new.id, 'owner');
  insert into public.barbers(barbershop_id, user_id, name) values(shop_id, new.id, coalesce(new.raw_user_meta_data ->> 'full_name', 'Proprietário'));
  insert into public.services(barbershop_id, name, duration_minutes, price) values
    (shop_id, 'Corte masculino', 30, 50), (shop_id, 'Barba', 30, 35),
    (shop_id, 'Corte + barba', 60, 75), (shop_id, 'Acabamento', 15, 20);
  return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles, public.members, public.barbers, public.services, public.clients, public.appointments to authenticated;
grant select, update on public.barbershops to authenticated;
