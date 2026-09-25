# Alterações desta versão

- Visual do dashboard refinado com aparência premium, mantendo a estrutura e funcionalidades existentes.
- Melhorias de responsividade para tablet e celular.
- Cards, navegação, calendário, formulários e tela de equipe receberam novo acabamento visual.
- Adicionado botão **Remover** para colaboradores (não aparece no proprietário).
- Ao remover um colaborador, o sistema desativa o acesso dele em `members` e desativa o barbeiro em `barbers`, preservando os agendamentos históricos.
- Não é necessário criar tabela nova nem executar SQL adicional, desde que as políticas de `UPDATE` de `members` e `barbers` do projeto já estejam aplicadas conforme `database.sql` / `ATUALIZACAO-PREMIUM.sql`.
