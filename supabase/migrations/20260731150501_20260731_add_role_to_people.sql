/*
# Add role column to people table

1. Modified Tables
   - `people`: add `role` column (text, default 'cliente')
     Allows distinguishing between clients and managers without breaking existing rows.
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'people' AND column_name = 'role'
  ) THEN
    ALTER TABLE people ADD COLUMN role text NOT NULL DEFAULT 'cliente';
  END IF;
END $$;
