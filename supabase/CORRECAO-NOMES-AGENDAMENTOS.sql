-- CORREÇÃO SEGURA: preserva o nome/telefone utilizado em cada agendamento.
-- Execute UMA ÚNICA VEZ em Supabase > SQL Editor.
-- Esta migração é aditiva: NÃO remove colunas, NÃO apaga dados, NÃO altera RLS,
-- NÃO mexe em usuários, colaboradores ou constraints existentes.

begin;

alter table public.appointments
  add column if not exists client_name_snapshot text;

alter table public.appointments
  add column if not exists client_phone_snapshot text;

-- Preenche os horários antigos com os dados atuais do cliente somente quando o
-- snapshot ainda estiver vazio. Registros já preenchidos nunca são sobrescritos.
update public.appointments a
set
  client_name_snapshot = coalesce(nullif(a.client_name_snapshot, ''), c.name),
  client_phone_snapshot = coalesce(nullif(a.client_phone_snapshot, ''), c.phone)
from public.clients c
where c.id = a.client_id
  and (
    a.client_name_snapshot is null or a.client_name_snapshot = '' or
    a.client_phone_snapshot is null or a.client_phone_snapshot = ''
  );

commit;
