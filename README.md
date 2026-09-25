# Agenda Art da Navalha

Painel funcional em HTML, CSS e JavaScript puro, conectado ao Supabase para autenticação, agenda e controle de acesso.

## Abrir no VS Code

1. Extraia o arquivo ZIP.
2. No VS Code, clique em **Arquivo > Abrir Pasta** e selecione `agenda-barbearia`.
3. Abra `index.html`.
4. Use a extensão **Live Server** e clique em **Go Live**.

Também é possível abrir `index.html` diretamente no navegador.

Antes do primeiro login, abra `config.js` e informe a **Project URL** e a **publishable/anon key** encontradas no Supabase. Não use uma secret key nem `service_role`.

## Recursos atuais

- Agenda semanal conectada ao Supabase.
- Criação, edição e exclusão de agendamentos sem serviço ou valores.
- Bloqueio de conflito de horário por profissional.
- Busca, filtros e resumo da semana.
- Login obrigatório e botão para sair.
- Proprietário com agenda completa e gestão de colaboradores.
- Barbeiro com conta individual e acesso somente à própria agenda.
- Layout premium responsivo para computador, tablet e celular.

## Atualização obrigatória do Supabase

Antes de usar esta versão, siga `supabase/COMO-ATUALIZAR.md`. A atualização ajusta as permissões e publica o cadastro seguro de colaboradores.
