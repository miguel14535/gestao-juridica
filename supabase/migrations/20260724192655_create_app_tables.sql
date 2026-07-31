/*
# Criar tabelas principais do sistema de gestão

## Descrição
Cria as três tabelas principais do sistema: pessoas, registros financeiros e agendamentos.
Este sistema é single-tenant (sem autenticação), permitindo acesso pelo cliente anon.

## Tabelas criadas

### people
- id: identificador único
- name: nome da pessoa (obrigatório)
- phone: telefone/WhatsApp
- email: e-mail
- notes: observações
- created_at: data de criação

### financial_records
- id: identificador único
- person_id: referência à pessoa
- type: tipo do registro ('credit' = a receber, 'payment' = pagamento recebido)
- amount: valor
- description: descrição
- date: data do registro
- created_at: data de criação

### appointments
- id: identificador único
- person_id: referência à pessoa (opcional)
- title: título do compromisso
- description: descrição
- appointment_date: data do compromisso
- appointment_time: hora do compromisso
- notified: se o lembrete foi enviado
- created_at: data de criação

## Segurança
- RLS habilitado em todas as tabelas
- Políticas permitem acesso anon + authenticated (sistema sem login)
*/

CREATE TABLE IF NOT EXISTS people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE people ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_people" ON people;
CREATE POLICY "anon_select_people" ON people FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_people" ON people;
CREATE POLICY "anon_insert_people" ON people FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_people" ON people;
CREATE POLICY "anon_update_people" ON people FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_people" ON people;
CREATE POLICY "anon_delete_people" ON people FOR DELETE TO anon, authenticated USING (true);


CREATE TABLE IF NOT EXISTS financial_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid REFERENCES people(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('credit', 'payment')),
  amount decimal(10,2) NOT NULL,
  description text,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_financial" ON financial_records;
CREATE POLICY "anon_select_financial" ON financial_records FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_financial" ON financial_records;
CREATE POLICY "anon_insert_financial" ON financial_records FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_financial" ON financial_records;
CREATE POLICY "anon_update_financial" ON financial_records FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_financial" ON financial_records;
CREATE POLICY "anon_delete_financial" ON financial_records FOR DELETE TO anon, authenticated USING (true);


CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid REFERENCES people(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  appointment_date date NOT NULL,
  appointment_time time,
  notified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_appointments" ON appointments;
CREATE POLICY "anon_select_appointments" ON appointments FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_appointments" ON appointments;
CREATE POLICY "anon_insert_appointments" ON appointments FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_appointments" ON appointments;
CREATE POLICY "anon_update_appointments" ON appointments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_appointments" ON appointments;
CREATE POLICY "anon_delete_appointments" ON appointments FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_financial_records_person_id ON financial_records(person_id);
CREATE INDEX IF NOT EXISTS idx_appointments_person_id ON appointments(person_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_people_name ON people(name);
