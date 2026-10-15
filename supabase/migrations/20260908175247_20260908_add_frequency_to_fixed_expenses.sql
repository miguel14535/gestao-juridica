/*
# Add frequency column to fixed_expenses

1. Modified Tables
   - `fixed_expenses`: add `frequency` column (text, default 'monthly')
     - 'monthly' = recurs once per month (due_day = 1-31)
     - 'weekly'  = recurs once per week (due_day = 0-6, day of week, 0=Sunday)
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fixed_expenses' AND column_name = 'frequency'
  ) THEN
    ALTER TABLE fixed_expenses ADD COLUMN frequency text NOT NULL DEFAULT 'monthly';
  END IF;
END $$;
