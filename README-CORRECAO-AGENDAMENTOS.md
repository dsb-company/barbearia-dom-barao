# Correção dos nomes nos agendamentos

Esta versão mantém a estrutura e as tabelas existentes. Para impedir que o nome de um cliente seja alterado em horários antigos quando o mesmo telefone é reutilizado, foi adicionada uma migração **aditiva**.

1. Abra `supabase/CORRECAO-NOMES-AGENDAMENTOS.sql`.
2. Copie o conteúdo.
3. No Supabase, abra **SQL Editor > New query**.
4. Execute uma única vez.

A migração apenas adiciona `client_name_snapshot` e `client_phone_snapshot` à tabela `appointments` e preenche os registros antigos. Ela não remove dados, não altera RLS e não modifica as tabelas `members`, `barbers` ou autenticação.

Também foi adicionada uma trava contra envio duplo do formulário e uma deduplicação visual por `id` na leitura da agenda.
