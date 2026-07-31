export type AccessMode = 'simple' | 'complex';

export type PersonRole = 'cliente' | 'gerente';

export const PERSON_ROLE_LABELS: Record<PersonRole, string> = {
  cliente: 'Cliente',
  gerente: 'Gerente',
};

export interface Person {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  role: PersonRole;
  created_at: string;
}

export type PaymentMethod =
  | 'dinheiro'
  | 'pix'
  | 'cartao_debito'
  | 'cartao_credito'
  | 'transferencia'
  | 'boleto'
  | 'outro';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  cartao_debito: 'Cartão de Débito',
  cartao_credito: 'Cartão de Crédito',
  transferencia: 'Transferência',
  boleto: 'Boleto',
  outro: 'Outro',
};

export interface Installment {
  id: string;
  financial_record_id: string;
  number: number;
  amount: number;
  due_date: string;
  paid: boolean;
  paid_date: string | null;
  payment_record_id: string | null;
  created_at: string;
}

export interface FinancialRecord {
  id: string;
  person_id: string;
  type: 'credit' | 'payment';
  amount: number;
  description: string | null;
  date: string;
  payment_method: PaymentMethod | null;
  installments_total: number | null;
  created_at: string;
  people?: Person;
  installments?: Installment[];
}

export interface Appointment {
  id: string;
  person_id: string | null;
  manager_id: string | null;
  title: string;
  description: string | null;
  appointment_date: string;
  appointment_time: string | null;
  notified: boolean;
  created_at: string;
  people?: Person | null;
  manager?: Person | null;
}

export interface PersonBalance {
  person: Person;
  totalCredit: number;
  totalPayment: number;
  balance: number;
}

export type ExpenseCategory =
  | 'agua'
  | 'luz'
  | 'aluguel'
  | 'internet'
  | 'telefone'
  | 'gas'
  | 'condominio'
  | 'seguro'
  | 'assinatura'
  | 'outro';

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  agua: 'Água',
  luz: 'Luz',
  aluguel: 'Aluguel',
  internet: 'Internet',
  telefone: 'Telefone',
  gas: 'Gás',
  condominio: 'Condomínio',
  seguro: 'Seguro',
  assinatura: 'Assinatura',
  outro: 'Outro',
};

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'agua', 'luz', 'aluguel', 'internet', 'telefone', 'gas', 'condominio', 'seguro', 'assinatura', 'outro',
];

export interface FixedExpense {
  id: string;
  name: string;
  category: ExpenseCategory;
  amount: number;
  due_day: number;
  notes: string | null;
  active: boolean;
  created_at: string;
}

export interface FixedExpensePayment {
  id: string;
  fixed_expense_id: string;
  month: string;
  amount: number;
  paid: boolean;
  paid_date: string | null;
  created_at: string;
  fixed_expense?: FixedExpense;
}
