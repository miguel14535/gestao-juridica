# Gestão Jurídica — DEMONSTRAÇÃO ISOLADA

Esta branch não é para produção. Replica as telas atualizadas e usa banco falso implementado em `src/lib/supabase.ts`, persistido apenas no `localStorage` do navegador.

- Nenhum `createClient()`, nenhuma conexão Supabase e nenhum dado real.
- Apenas pessoas, compromissos, gastos e pagamentos inventados.
- Botão **Reiniciar teste** apaga apenas o `localStorage` desta demonstração.
- Acesso Simples/Complexo sem senha, para navegação exploratória: **não representa autenticação real**.
- Arquivos `security/*` descrevem uma futura migração. Nada foi aplicado ao banco.
- Jamais mesclar `src/lib/supabase.ts` da demonstração para `main`.

Para build no ambiente adequado: `npm ci && npm run typecheck && npm run build`.
Para produção: usar o patch incremental de aplicação com Supabase verdadeiro após hardening de segurança e testes.
