-- PROPOSTA DE SEGURANÇA / REVISÃO. NUNCA EXECUTAR AUTOMATICAMENTE.
-- NÃO APLICADA. O sistema atual NÃO oferece login Supabase Auth.
-- Antes: criar usuários reais, testar papéis, salvar dump e validar implantação da UI de login.
-- Executar só após aprovação expressa de implantação de segurança e janela de manutenção.
BEGIN;
CREATE TABLE IF NOT EXISTS public.gestao_staff (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_mode text NOT NULL CHECK (access_mode IN ('simple','complex')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gestao_staff ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gestao_staff FROM anon;
GRANT SELECT ON public.gestao_staff TO authenticated;
DROP POLICY IF EXISTS staff_select_self ON public.gestao_staff;
CREATE POLICY staff_select_self ON public.gestao_staff FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Somente usuários autenticados explicitamente cadastrados em gestao_staff.
-- DROP das permissões de conexões anon para todas as tabelas do app.
DO $$
DECLARE tbl text;
DECLARE pol record;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['people','financial_records','appointments','installments','fixed_expenses','fixed_expense_payments','variable_expenses'] LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=tbl LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',pol.policyname,tbl);
    END LOOP;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',tbl);
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM anon',tbl);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated',tbl);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.gestao_staff s WHERE s.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.gestao_staff s WHERE s.user_id = auth.uid()))', 'gestao_staff_only_'||tbl,tbl);
  END LOOP;
END $$;
COMMIT;
-- NOTA: simple/complex ainda não impõem restrições granulares sobre registros financeiros.
-- Antes de produção, definir matriz de permissões por área/ação e ajustar RLS/RPC.
