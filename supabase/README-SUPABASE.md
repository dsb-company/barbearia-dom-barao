# Configuração do banco no Supabase

## 1. Criar as tabelas e a segurança

1. Abra seu projeto no Supabase.
2. Entre em **SQL Editor**.
3. Clique em **New query**.
4. Copie todo o conteúdo de `database.sql`.
5. Clique em **Run** uma única vez.

O script cria as tabelas `barbershops`, `profiles`, `members`, `barbers`, `services`, `clients` e `appointments`, além dos relacionamentos, índices, bloqueio de conflito de horário e políticas RLS.

## 2. Criar o primeiro usuário

No Supabase, abra **Authentication > Users > Add user**. Informe o e-mail e uma senha forte. O gatilho do banco criará automaticamente a barbearia, o proprietário, o primeiro profissional e quatro serviços.

## 3. Dados para conectar o site

Abra **Project Settings > API Keys** e copie:

- Project URL
- Publishable key (ou `anon` key em projetos antigos)

Nunca use `service_role` ou uma secret key no HTML/JavaScript do navegador. A publishable/anon key é pública e deve trabalhar junto com as políticas RLS.

## Estrutura de acesso

- `owner`: controla a barbearia e os colaboradores.
- `manager`: administra equipe, serviços e agenda.
- `barber`: acessa e atualiza a agenda e os clientes.
- Cada registro possui `barbershop_id`; as políticas impedem acesso aos dados de outra empresa.

