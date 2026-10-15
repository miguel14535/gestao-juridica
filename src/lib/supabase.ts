/**
 * HOMOLOGAÇÃO ISOLADA: armazenamento fictício apenas no navegador.
 * NÃO importa @supabase/supabase-js, não faz fetch nem acessa o banco real.
 * Este arquivo é exclusivo da branch de demonstração e NÃO pode ser
 * mesclado para a produção.
 */

type Row = Record<string, any>;
type TableName = 'people' | 'financial_records' | 'appointments' | 'installments' | 'fixed_expenses' | 'fixed_expense_payments' | 'variable_expenses';
type Db = Record<TableName, Row[]>;
type Result = { data: Row[] | null; error: { message: string } | null };
const STORAGE_KEY = 'gestao-juridica-demonstracao-ficticia-v1';
const TODAY = new Date().toISOString().slice(0, 10);
const dayOffset = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};
const currentMonth = TODAY.slice(0, 7);
const p1 = 'demo-pessoa-1';
const p2 = 'demo-pessoa-2';
const p3 = 'demo-pessoa-3';
const p4 = 'demo-pessoa-4';
const p5 = 'demo-pessoa-5';
function initial(): Db {
  const dates = (offset: number) => dayOffset(offset);
  return {
    people: [
      { id: p1, name: 'Cliente Exemplo Alfa', phone: null, email: 'alfa@example.invalid', notes: 'Cadastro inteiramente fictício', role: 'cliente', created_at: TODAY },
      { id: p2, name: 'Cliente Exemplo Beta', phone: null, email: 'beta@example.invalid', notes: null, role: 'cliente', created_at: TODAY },
      { id: p3, name: 'Cliente Exemplo Gama', phone: null, email: null, notes: 'Somente para testar o sistema', role: 'cliente', created_at: TODAY },
      { id: p4, name: 'Gerente Exemplo A', phone: null, email: null, notes: null, role: 'gerente', created_at: TODAY },
      { id: p5, name: 'Gerente Exemplo B', phone: null, email: null, notes: null, role: 'gerente', created_at: TODAY },
    ],
    financial_records: [
      { id: 'demo-rec-1', person_id: p1, type: 'credit', amount: 2400, description: 'Serviço demonstrativo', date: dates(-11), payment_method: 'pix', installments_total: null, created_at: TODAY },
      { id: 'demo-rec-2', person_id: p1, type: 'payment', amount: 800, description: 'Pagamento parcial fictício', date: dates(-6), payment_method: 'pix', installments_total: null, created_at: TODAY },
      { id: 'demo-rec-3', person_id: p2, type: 'credit', amount: 1600, description: 'Atendimento fictício', date: dates(-9), payment_method: null, installments_total: null, created_at: TODAY },
      { id: 'demo-rec-4', person_id: p2, type: 'payment', amount: 1600, description: 'Pagamento demonstrativo', date: dates(-3), payment_method: 'transferencia', installments_total: null, created_at: TODAY },
      { id: 'demo-rec-5', person_id: p3, type: 'credit', amount: 980, description: 'Parcelamento de teste', date: dates(-2), payment_method: 'cartao_credito', installments_total: 2, created_at: TODAY },
    ],
    appointments: [
      { id: 'demo-agenda-1', person_id: p1, manager_id: p4, title: 'Reunião demonstrativa', description: 'Compromisso fictício', appointment_date: dates(1), appointment_time: '10:00:00', notified: false, created_at: TODAY },
      { id: 'demo-agenda-2', person_id: p2, manager_id: p5, title: 'Análise de documentos (teste)', description: null, appointment_date: dates(4), appointment_time: '15:00:00', notified: false, created_at: TODAY },
    ],
    installments: [
      { id: 'demo-parcela-1', financial_record_id: 'demo-rec-5', number: 1, amount: 490, due_date: dates(15), paid: false, paid_date: null, payment_record_id: null, created_at: TODAY },
      { id: 'demo-parcela-2', financial_record_id: 'demo-rec-5', number: 2, amount: 490, due_date: dates(45), paid: false, paid_date: null, payment_record_id: null, created_at: TODAY },
    ],
    fixed_expenses: [
      { id: 'demo-fixo-1', name: 'Aluguel fictício', category: 'aluguel', amount: 2000, due_day: 10, frequency: 'monthly', notes: null, active: true, created_at: TODAY },
      { id: 'demo-fixo-2', name: 'Internet demonstração', category: 'internet', amount: 180, due_day: 20, frequency: 'monthly', notes: null, active: true, created_at: TODAY },
      { id: 'demo-fixo-3', name: 'Serviço semanal exemplo', category: 'outro', amount: 120, due_day: 5, frequency: 'weekly', notes: null, active: true, created_at: TODAY },
    ],
    fixed_expense_payments: [
      { id: 'demo-fixo-pago-1', fixed_expense_id: 'demo-fixo-2', month: currentMonth, amount: 180, paid: true, paid_date: dates(-2), created_at: TODAY },
    ],
    variable_expenses: [
      { id: 'demo-var-1', description: 'Material de escritório demonstrativo', amount: 145.90, date: dates(-2), category: 'material', payment_method: 'pix', notes: null, created_at: TODAY },
      { id: 'demo-var-2', description: 'Transporte fictício', amount: 68.50, date: dates(-1), category: 'transporte', payment_method: 'dinheiro', notes: 'Somente demonstração', created_at: TODAY },
      { id: 'demo-var-3', description: 'Serviço de teste', amount: 299, date: dates(-4), category: 'outro', payment_method: 'cartao_debito', notes: null, created_at: TODAY },
    ],
  };
}
function getDb(): Db {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && Array.isArray(data.people) && Array.isArray(data.variable_expenses)) return data;
    }
  } catch { /* Recria apenas o armazenamento de demonstração. */ }
  const db = initial();
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); } catch { /* Navegador privado sem espaço. */ }
  return db;
}
function write(db: Db) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); } catch { /* Sessão temporária. */ } }
export function resetDemoData() { localStorage.removeItem(STORAGE_KEY); window.location.reload(); }

class DemoQuery implements PromiseLike<Result> {
  private action: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private filters: ((row: Row) => boolean)[] = [];
  private sorts: Array<{ key: string; asc: boolean; foreign?: string }> = [];
  private payload: Row | Row[] | undefined;
  private relations = '';
  private wantsRows = false;
  constructor(private table: TableName) {}
  select(fields = '*') { this.relations = fields; this.wantsRows = true; return this; }
  insert(data: Row | Row[]) { this.action = 'insert'; this.payload = data; return this; }
  update(data: Row) { this.action = 'update'; this.payload = data; return this; }
  delete() { this.action = 'delete'; return this; }
  eq(key: string, value: unknown) { this.filters.push(row => String(row[key]) === String(value)); return this; }
  in(key: string, values: unknown[]) { this.filters.push(row => values.map(String).includes(String(row[key]))); return this; }
  order(key: string, config?: { ascending?: boolean; foreignTable?: string }) { this.sorts.push({ key, asc: config?.ascending !== false, foreign: config?.foreignTable }); return this; }
  private matches(row: Row) { return this.filters.every(fn => fn(row)); }
  private execute(): Result {
    const db = getDb();
    const tableRows = db[this.table];
    if (!tableRows) return { data: null, error: { message: 'Tabela inexistente no modo demonstração' } };
    let result: Row[];
    if (this.action === 'insert') {
      const incoming = (Array.isArray(this.payload) ? this.payload : [this.payload ?? {}]);
      result = incoming.map(item => ({ ...item, id: item.id || crypto.randomUUID(), created_at: item.created_at || new Date().toISOString(), ...(this.table === 'fixed_expenses' ? { active: true } : {}) }));
      tableRows.push(...result);
    } else if (this.action === 'update') {
      result = tableRows.filter(row => this.matches(row));
      result.forEach(row => Object.assign(row, this.payload));
    } else if (this.action === 'delete') {
      result = tableRows.filter(row => this.matches(row));
      db[this.table] = tableRows.filter(row => !this.matches(row));
      if (this.table === 'financial_records') {
        const ids = new Set(result.map(row => row.id));
        db.installments = db.installments.filter(row => !ids.has(row.financial_record_id));
        db.installments.forEach(row => { if (ids.has(row.payment_record_id)) { row.paid = false; row.paid_date = null; row.payment_record_id = null; } });
      }
    } else {
      result = tableRows.filter(row => this.matches(row)).map(row => ({ ...row }));
      this.sorts.filter(s => !s.foreign).forEach(({ key, asc }) => result.sort((a, b) => {
        const first = a[key] ?? ''; const second = b[key] ?? '';
        return (typeof first === 'number' && typeof second === 'number' ? first - second : String(first).localeCompare(String(second), 'pt-BR')) * (asc ? 1 : -1);
      }));
      if (this.table === 'financial_records' && this.relations.includes('people(')) {
        result = result.map(row => ({ ...row, people: db.people.find(person => person.id === row.person_id) ?? null,
          installments: db.installments.filter(inst => inst.financial_record_id === row.id).sort((a,b) => a.number - b.number) }));
      }
      if (this.table === 'appointments' && this.relations.includes('people:people!')) {
        result = result.map(row => ({ ...row, people: db.people.find(person => person.id === row.person_id) ?? null,
          manager: db.people.find(person => person.id === row.manager_id) ?? null }));
      }
    }
    if (this.action !== 'select') write(db);
    return { data: this.action === 'select' || this.wantsRows ? result : null, error: null };
  }
  single(): Promise<{ data: Row | null; error: {message:string} | null }> {
    const result = this.execute();
    return Promise.resolve({ data: result.data?.[0] ?? null, error: result.error });
  }
  then<TResult1 = Result, TResult2 = never>(
    onfulfilled?: ((value: Result) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    try { return Promise.resolve(this.execute()).then(onfulfilled, onrejected); }
    catch (error) { return Promise.reject(error).then(onfulfilled, onrejected); }
  }
}
export const supabase = {
  from: (name: string): DemoQuery => new DemoQuery(name as TableName),
};
