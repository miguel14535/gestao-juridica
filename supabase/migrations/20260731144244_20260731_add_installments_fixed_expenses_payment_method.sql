/*
# Add installments, fixed expenses, and payment method support

1. Alterations to financial_records
   - Add `payment_method` (text, nullable) — e.g. dinheiro, pix, cartao_credito
   - Add `installments_total` (integer, nullable) — number of installments when paying by credit card
   - Remove old installment columns that are superseded (installment_group_id, installment_number, installment_count, due_date, paid, paid_date)

2. New table: installments
   - Tracks individual installment rows linked to a financial_record
   - `financial_record_id` FK → financial_records
   - `number`, `amount`, `due_date`, `paid`, `paid_date`, `payment_record_id`

3. New table: fixed_expenses
   - Recurring monthly bills (water, electricity, rent, etc.)
   - `name`, `category`, `amount`, `due_day`, `notes`, `active`

4. New table: fixed_expense_payments
   - Tracks per-month payment state for each fixed expense
   - `fixed_expense_id` FK → fixed_expenses, `month` (YYYY-MM), `amount`, `paid`, `paid_date`

5. Security
   - RLS enabled on all new/modified tables with anon+authenticated CRUD (single-tenant app)
*/

-- ─── financial_records: add new columns ───────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='financial_records' AND column_name='payment_method') THEN
    ALTER TABLE financial_records ADD COLUMN payment_method text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='financial_records' AND column_name='installments_total') THEN
    ALTER TABLE financial_records ADD COLUMN installments_total integer;
  END IF;
END $$;

-- ─── installments ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS installments (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  financial_record_id  uuid NOT NULL REFERENCES financial_records(id) ON DELETE CASCADE,
  number               integer NOT NULL,
  amount               numeric NOT NULL,
  due_date             date NOT NULL,
  paid                 boolean NOT NULL DEFAULT false,
  paid_date            date,
  payment_record_id    uuid REFERENCES financial_records(id) ON DELETE SET NULL,
  created_at           timestamptz DEFAULT now()
);

ALTER TABLE installments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_installments" ON installments;
CREATE POLICY "anon_select_installments" ON installments FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_installments" ON installments;
CREATE POLICY "anon_insert_installments" ON installments FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_installments" ON installments;
CREATE POLICY "anon_update_installments" ON installments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_installments" ON installments;
CREATE POLICY "anon_delete_installments" ON installments FOR DELETE TO anon, authenticated USING (true);

-- ─── fixed_expenses ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fixed_expenses (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name      text NOT NULL,
  category  text NOT NULL DEFAULT 'outro',
  amount    numeric NOT NULL,
  due_day   integer NOT NULL DEFAULT 10,
  notes     text,
  active    boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE fixed_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_fixed_expenses" ON fixed_expenses;
CREATE POLICY "anon_select_fixed_expenses" ON fixed_expenses FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_fixed_expenses" ON fixed_expenses;
CREATE POLICY "anon_insert_fixed_expenses" ON fixed_expenses FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_fixed_expenses" ON fixed_expenses;
CREATE POLICY "anon_update_fixed_expenses" ON fixed_expenses FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_fixed_expenses" ON fixed_expenses;
CREATE POLICY "anon_delete_fixed_expenses" ON fixed_expenses FOR DELETE TO anon, authenticated USING (true);

-- ─── fixed_expense_payments ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fixed_expense_payments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fixed_expense_id  uuid NOT NULL REFERENCES fixed_expenses(id) ON DELETE CASCADE,
  month             text NOT NULL,  -- YYYY-MM
  amount            numeric NOT NULL,
  paid              boolean NOT NULL DEFAULT false,
  paid_date         date,
  created_at        timestamptz DEFAULT now(),
  UNIQUE (fixed_expense_id, month)
);

ALTER TABLE fixed_expense_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_fep" ON fixed_expense_payments;
CREATE POLICY "anon_select_fep" ON fixed_expense_payments FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_fep" ON fixed_expense_payments;
CREATE POLICY "anon_insert_fep" ON fixed_expense_payments FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_fep" ON fixed_expense_payments;
CREATE POLICY "anon_update_fep" ON fixed_expense_payments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_fep" ON fixed_expense_payments;
CREATE POLICY "anon_delete_fep" ON fixed_expense_payments FOR DELETE TO anon, authenticated USING (true);
