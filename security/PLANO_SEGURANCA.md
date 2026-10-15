# Implantação de segurança — PENDENTE, sem alteração em produção

## Constatações
- A versão original usa PIN fixo no navegador. Isso não equivale a autenticação.
- RLS do banco atual permite SELECT, INSERT, UPDATE e DELETE ao papel `anon`, inclusive dados jurídicos e financeiros.
- O ambiente de homologação usa somente dados fictícios no `localStorage`, sem Supabase nem qualquer operação de rede sobre o banco real. O login livre é deliberado, para testar somente a interface.

## Migração para uma versão segura (não realizada)
1. Preparar backup completo independente e restaurá-lo em ambiente de teste. O CSV de sete tabelas não captura roles, triggers, políticas nem garante restauração.
2. Definir administradores e operadores reais e respectivos e-mails para Supabase Auth (não registrar senhas no GitHub ou chat).
3. Criar o controle de permissões em `gestao_staff`; provisionar as contas antes de bloquear acesso anônimo.
4. Substituir a tela PIN por login com e-mail e senha via Supabase Auth, com sessão renovável e logout real. Ler `access_mode` do banco autenticado; não aceitar escolha arbitrária no navegador.
5. Aplicar uma migração de RLS em ambiente isolado, validar bloqueio `anon` e acesso correto de cada papel. O SQL proposto é um **rascunho para auditoria** e não foi executado.
6. Definir permissões restritas além das básicas; perfil simples/complexo apenas em UI não impede leitura de dados pela API.
7. Somente após testes, backup recuperável e consentimento, planejar cutover em produção.

**O ambiente de testes não é autenticação segura e jamais deve substituir produção.**
