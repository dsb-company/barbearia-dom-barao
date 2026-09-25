# Correção de sessão — invite-collaborator

Esta versão não altera tabelas, RLS ou dados do banco.

## O que foi alterado
- O front-end obtém a sessão atual antes de chamar a Edge Function e envia explicitamente o `access_token` no header `Authorization`.
- A Edge Function valida esse JWT diretamente com `admin.auth.getUser(token)`.
- A checagem de owner/manager continua sendo feita no servidor.
- Os logs agora mostram o erro real de autenticação ou consulta, sem expor detalhes sensíveis na interface.

## Publicação obrigatória
No Supabase, substitua o código de `Edge Functions > invite-collaborator > index.ts` pelo arquivo:

`supabase/functions/invite-collaborator/index.ts`

Depois faça **Deploy** da função.

Em seguida, faça logout e login novamente no dashboard antes de testar.
