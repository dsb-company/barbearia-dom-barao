# Ativação da versão premium

## 1. Atualizar o banco

No Supabase, abra **SQL Editor > New query**, cole todo o conteúdo de `ATUALIZACAO-PREMIUM.sql` e clique em **Run**. Execute apenas uma vez.

## 2. Publicar o cadastro seguro de colaboradores

O cadastro de contas não pode usar a chave administrativa no navegador. Por isso, o projeto inclui a Edge Function `invite-collaborator`.

Com a Supabase CLI instalada e autenticada, abra um terminal na raiz deste projeto e execute:

```bash
supabase functions deploy invite-collaborator
```

As variáveis `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são fornecidas automaticamente à função pelo Supabase. A chave administrativa nunca deve ser copiada para `config.js`.

## 3. Resultado

- Proprietário: agenda completa e área de colaboradores.
- Barbeiro: somente a própria agenda.
- Cada colaborador entra com e-mail e senha individuais.
- Serviço e valores não aparecem e não são obrigatórios.

