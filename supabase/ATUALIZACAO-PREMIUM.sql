-- Execute UMA VEZ no SQL Editor do projeto já configurado.
-- Esta migração remove a obrigatoriedade de serviço e separa dono/barbeiro.

alter table public.appointments alter column service_id drop not null;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare shop_id uuid;
begin
  insert into public.profiles(id, full_name)
  values(new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  -- Colaboradores convidados são vinculados pela função segura e não recebem outra barbearia.
  if new.raw_user_meta_data ->> 'invited_to_shop' is null then
    insert into public.barbershops(name, created_by)
    values(coalesce(nullif(new.raw_user_meta_data ->> 'barbershop_name',''), 'Minha Barbearia'), new.id)
    returning id into shop_id;
    insert into public.members(barbershop_id, user_id, role) values(shop_id, new.id, 'owner');
    insert into public.barbers(barbershop_id, user_id, name)
    values(shop_id, new.id, coalesce(new.raw_user_meta_data ->> 'full_name', 'Proprietário'));
  end if;
  return new;
end; $$;

drop policy if exists "members_select_member" on public.members;
create policy "members_select_own_or_admin" on public.members for select to authenticated
using (user_id = (select auth.uid()) or public.is_shop_admin(barbershop_id));

drop policy if exists "profile_select_team_admin" on public.profiles;
create policy "profile_select_team_admin" on public.profiles for select to authenticated
using (
  exists(
    select 1 from public.members target
    where target.user_id = profiles.id
      and public.is_shop_admin(target.barbershop_id)
  )
);

drop policy if exists "appointments_select_member" on public.appointments;
drop policy if exists "appointments_insert_member" on public.appointments;
drop policy if exists "appointments_update_member" on public.appointments;

create policy "appointments_select_scoped" on public.appointments for select to authenticated
using (
  public.is_shop_admin(barbershop_id)
  or exists(select 1 from public.barbers b where b.id = barber_id and b.user_id = (select auth.uid()) and b.active)
);

create policy "appointments_insert_scoped" on public.appointments for insert to authenticated
with check (
  created_by = (select auth.uid()) and (
    public.is_shop_admin(barbershop_id)
    or exists(select 1 from public.barbers b where b.id = barber_id and b.user_id = (select auth.uid()) and b.active)
  )
);

create policy "appointments_update_scoped" on public.appointments for update to authenticated
using (
  public.is_shop_admin(barbershop_id)
  or exists(select 1 from public.barbers b where b.id = barber_id and b.user_id = (select auth.uid()) and b.active)
)
with check (
  public.is_shop_admin(barbershop_id)
  or exists(select 1 from public.barbers b where b.id = barber_id and b.user_id = (select auth.uid()) and b.active)
);
