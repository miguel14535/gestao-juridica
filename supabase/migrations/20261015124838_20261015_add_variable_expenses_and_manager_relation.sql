/*
# Add variable expense tracking and manager relation

1. New table: `variable_expenses`
   - Stores one-time or irregular business expenses.
   - `description`: what was purchased or paid.
   - `category`: expense category such as supplies, transport, or other.
   - `amount`: expense value in Brazilian reais.
   - `date`: date the expense occurred.
   - `payment_method`: optional method used to pay.
   - `notes`: optional extra details.
   - `created_at`: creation timestamp.

2. Modified table: `appointments`
   - Add `manager_id`, an optional reference to a person assigned as manager.
   - This restores the relationship already used by the agenda screen.

3. Security
   - Enable RLS on `variable_expenses`.
   - Allow anon and authenticated CRUD because this application has no sign-in and is intentionally single-tenant.
*/

CREATE TABLE IF NOT EXISTS variable_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  category text NOT NULL DEFAULT 'outro',
  amount numeric NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE variable_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_variable_expenses" ON variable_expenses;
CREATE POLICY "anon_select_variable_expenses" ON variable_expenses FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_variable_expenses" ON variable_expenses;
CREATE POLICY "anon_insert_variable_expenses" ON variable_expenses FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_variable_expenses" ON variable_expenses;
CREATE POLICY "anon_update_variable_expenses" ON variable_expenses FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_variable_expenses" ON variable_expenses;
CREATE POLICY "anon_delete_variable_expenses" ON variable_expenses FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_variable_expenses_date ON variable_expenses(date);
CREATE INDEX IF NOT EXISTS idx_variable_expenses_category ON variable_expenses(category);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'manager_id'
  ) THEN
    ALTER TABLE appointments ADD COLUMN manager_id uuid REFERENCES people(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_appointments_manager_id ON appointments(manager_id);
