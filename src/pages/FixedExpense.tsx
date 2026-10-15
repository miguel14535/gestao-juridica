import { useState, useEffect, useMemo } from 'react';
import {
  Plus, X, Check, Trash2, Pencil, ChevronLeft, ChevronRight,
  Droplet, Zap, Home, Wifi, Phone, Flame, Building2, ShieldCheck, Repeat, Receipt,
  CheckCircle2, Circle, AlertTriangle, Wallet, TrendingUp, TrendingDown, Calendar,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { FixedExpense, FixedExpensePayment, ExpenseCategory, ExpenseFrequency } from '@/types';
import {
  EXPENSE_CATEGORY_LABELS, EXPENSE_CATEGORIES,
  EXPENSE_FREQUENCY_LABELS, WEEKDAY_LABELS,
} from '@/types';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function currentMonthStr() {
  return new Date().toISOString().slice(0, 7);
}

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

function monthLabel(month: string) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function currentWeekStr() {
  const now = new Date();
  const monday = new Date(now);
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split('T')[0];
}

function shiftWeek(weekStart: string, delta: number) {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + delta * 7);
  return d.toISOString().split('T')[0];
}

function weekLabel(weekStart: string) {
  const start = new Date(weekStart);
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  return `${fmt(start)} – ${fmt(end)}`;
}

function weekdaysInWeek(weekStart: string) {
  const days: string[] = [];
  const d = new Date(weekStart);
  for (let i = 0; i < 7; i++) {
    days.push(d.toISOString().split('T')[0]);
    d.setDate(d.getDate() + 1);
  }
  return days;
}

const CATEGORY_ICONS: Record<ExpenseCategory, typeof Droplet> = {
  agua: Droplet,
  luz: Zap,
  aluguel: Home,
  internet: Wifi,
  telefone: Phone,
  gas: Flame,
  condominio: Building2,
  seguro: ShieldCheck,
  assinatura: Repeat,
  outro: Receipt,
};

const CATEGORY_COLORS: Record<ExpenseCategory, { bg: string; text: string; border: string }> = {
  agua: { bg: 'bg-sky-900/30', text: 'text-sky-400', border: 'border-sky-800/40' },
  luz: { bg: 'bg-yellow-900/30', text: 'text-yellow-400', border: 'border-yellow-800/40' },
  aluguel: { bg: 'bg-orange-900/30', text: 'text-orange-400', border: 'border-orange-800/40' },
  internet: { bg: 'bg-indigo-900/30', text: 'text-indigo-400', border: 'border-indigo-800/40' },
  telefone: { bg: 'bg-teal-900/30', text: 'text-teal-400', border: 'border-teal-800/40' },
  gas: { bg: 'bg-red-900/30', text: 'text-red-400', border: 'border-red-800/40' },
  condominio: { bg: 'bg-purple-900/30', text: 'text-purple-400', border: 'border-purple-800/40' },
  seguro: { bg: 'bg-emerald-900/30', text: 'text-emerald-400', border: 'border-emerald-800/40' },
  assinatura: { bg: 'bg-pink-900/30', text: 'text-pink-400', border: 'border-pink-800/40' },
  outro: { bg: 'bg-stone-800/60', text: 'text-stone-400', border: 'border-stone-700' },
};

const emptyForm = {
  name: '',
  category: 'outro' as ExpenseCategory,
  amount: '',
  frequency: 'monthly' as ExpenseFrequency,
  due_day: '10',
  notes: '',
};

export default function FixedExpenses() {
  const [expenses, setExpenses] = useState<FixedExpense[]>([]);
  const [payments, setPayments] = useState<FixedExpensePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(currentMonthStr());
  const [weekStart, setWeekStart] = useState(currentWeekStr());

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FixedExpense | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [payTarget, setPayTarget] = useState<FixedExpense | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(todayStr());

  const [confirmDelete, setConfirmDelete] = useState<FixedExpense | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [{ data: exp }, { data: pay }] = await Promise.all([
      supabase.from('fixed_expenses').select('*').order('due_day'),
      supabase.from('fixed_expense_payments').select('*'),
    ]);
    if (exp) setExpenses((exp as FixedExpense[]).map(e => ({ ...e, frequency: e.frequency ?? 'monthly' })));
    if (pay) setPayments(pay as FixedExpensePayment[]);
    setLoading(false);
  }

  function paymentFor(expenseId: string, periodKey: string) {
    return payments.find(p => p.fixed_expense_id === expenseId && p.month === periodKey) || null;
  }

  const isCurrentMonth = month === currentMonthStr();
  const isCurrentWeek = weekStart === currentWeekStr();
  const todayDay = new Date().getUTCDate();

  // Monthly rows
  const monthlyRows = useMemo(() => {
    return expenses
      .filter(e => e.active && e.frequency === 'monthly')
      .map(e => {
        const payment = paymentFor(e.id, month);
        const isPaid = payment?.paid ?? false;
        const dueAmount = payment?.amount ?? e.amount;
        const overdue = !isPaid && isCurrentMonth && todayDay > e.due_day;
        return { expense: e, payment, isPaid, dueAmount, overdue, periodKey: month };
      })
      .sort((a, b) => a.expense.due_day - b.expense.due_day);
  }, [expenses, payments, month]);

  // Weekly rows — group by weekday
  const weeklyRows = useMemo(() => {
    const weekDays = weekdaysInWeek(weekStart);
    return expenses
      .filter(e => e.active && e.frequency === 'weekly')
      .map(e => {
        const dueDate = weekDays[(e.due_day + 6) % 7];
        const payment = paymentFor(e.id, dueDate);
        const isPaid = payment?.paid ?? false;
        const dueAmount = payment?.amount ?? e.amount;
        const overdue = !isPaid && isCurrentWeek && todayStr() > dueDate;
        return { expense: e, payment, isPaid, dueAmount, overdue, periodKey: dueDate, dueDate };
      })
      .sort((a, b) => a.expense.due_day - b.expense.due_day);
  }, [expenses, payments, weekStart]);

  const allRows = [...monthlyRows, ...weeklyRows];
  const totalFixed = allRows.reduce((s, r) => s + r.dueAmount, 0);
  const totalPaid = allRows.filter(r => r.isPaid).reduce((s, r) => s + r.dueAmount, 0);
  const totalPending = totalFixed - totalPaid;
  const paidCount = allRows.filter(r => r.isPaid).length;
  const pctPaid = allRows.length > 0 ? (paidCount / allRows.length) * 100 : 0;

  function resetForm() {
    setForm(emptyForm);
    setEditing(null);
    setError('');
  }

  function openNew() {
    resetForm();
    setShowForm(true);
  }

  function openEdit(expense: FixedExpense) {
    setEditing(expense);
    setForm({
      name: expense.name,
      category: expense.category,
      amount: String(expense.amount),
      frequency: expense.frequency,
      due_day: String(expense.due_day),
      notes: expense.notes || '',
    });
    setError('');
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Informe um nome para a conta.'); return; }
    const amount = Number(form.amount);
    if (!form.amount || isNaN(amount) || amount <= 0) { setError('Informe um valor válido.'); return; }
    const dueDay = parseInt(form.due_day, 10);
    if (form.frequency === 'monthly' && (isNaN(dueDay) || dueDay < 1 || dueDay > 31)) {
      setError('Dia do vencimento deve ser entre 1 e 31.'); return;
    }
    if (form.frequency === 'weekly' && (isNaN(dueDay) || dueDay < 0 || dueDay > 6)) {
      setError('Selecione um dia da semana.'); return;
    }

    setSaving(true);
    setError('');

    const payload = {
      name: form.name.trim(),
      category: form.category,
      amount,
      frequency: form.frequency,
      due_day: dueDay,
      notes: form.notes.trim() || null,
      active: true,
    };

    const result = editing
      ? await supabase.from('fixed_expenses').update(payload).eq('id', editing.id)
      : await supabase.from('fixed_expenses').insert(payload);

    setSaving(false);
    if (result.error) {
      setError('Não foi possível salvar. Verifique se o banco de dados foi atualizado.');
      return;
    }
    setShowForm(false);
    resetForm();
    loadData();
  }

  async function handleDelete(expense: FixedExpense) {
    await supabase.from('fixed_expenses').delete().eq('id', expense.id);
    setConfirmDelete(null);
    loadData();
  }

  function openPay(expense: FixedExpense, periodKey: string) {
    const payment = paymentFor(expense.id, periodKey);
    setPayTarget(expense);
    setPayAmount(String(payment?.amount ?? expense.amount));
    setPayDate(payment?.paid_date || (expense.frequency === 'weekly' ? periodKey : todayStr()));
  }

  async function confirmPay(periodKey: string) {
    if (!payTarget) return;
    const amount = Number(payAmount);
    if (!payAmount || isNaN(amount) || amount <= 0) return;

    const existing = paymentFor(payTarget.id, periodKey);
    if (existing) {
      await supabase.from('fixed_expense_payments').update({
        paid: true, paid_date: payDate, amount,
      }).eq('id', existing.id);
    } else {
      await supabase.from('fixed_expense_payments').insert({
        fixed_expense_id: payTarget.id, month: periodKey, amount, paid: true, paid_date: payDate,
      });
    }
    setPayTarget(null);
    loadData();
  }

  async function unmarkPaid(expense: FixedExpense, periodKey: string) {
    const existing = paymentFor(expense.id, periodKey);
    if (!existing) return;
    await supabase.from('fixed_expense_payments').update({ paid: false, paid_date: null }).eq('id', existing.id);
    loadData();
  }

  function dueDayLabel(expense: FixedExpense) {
    if (expense.frequency === 'weekly') return WEEKDAY_LABELS[expense.due_day];
    return `Dia ${expense.due_day}`;
  }

  function periodLabel(expense: FixedExpense) {
    if (expense.frequency === 'weekly') return weekLabel(weekStart);
    return monthLabel(month);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-amber-100">Gastos Fixos</h1>
          <p className="text-stone-400 text-sm mt-0.5">Contas recorrentes mensais e semanais</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center justify-center gap-2 bg-amber-700 hover:bg-amber-600 text-amber-50 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Conta Fixa
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-stone-900 border border-stone-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-4 h-4 text-stone-500" />
                <span className="text-stone-400 text-xs">Total do Período</span>
              </div>
              <p className="text-amber-200 font-bold text-xl">{formatCurrency(totalFixed)}</p>
            </div>
            <div className="bg-stone-900 border border-stone-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-stone-400 text-xs">Pago</span>
              </div>
              <p className="text-green-400 font-bold text-xl">{formatCurrency(totalPaid)}</p>
            </div>
            <div className="bg-stone-900 border border-red-900/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-red-400" />
                <span className="text-stone-400 text-xs">Pendente</span>
              </div>
              <p className="text-red-400 font-bold text-xl">{formatCurrency(totalPending)}</p>
            </div>
            <div className="bg-stone-900 border border-stone-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-stone-500" />
                <span className="text-stone-400 text-xs">Contas Quitadas</span>
              </div>
              <p className="text-amber-200 font-bold text-xl">{paidCount}/{allRows.length}</p>
            </div>
          </div>

          {/* Progress bar */}
          {allRows.length > 0 && (
            <div className="bg-stone-900 border border-stone-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-stone-400 text-sm">Progresso do período</span>
                <span className="text-amber-300 font-semibold text-sm">{pctPaid.toFixed(0)}%</span>
              </div>
              <div className="h-2.5 bg-stone-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-700 to-amber-500 rounded-full transition-all duration-700"
                  style={{ width: `${pctPaid}%` }}
                />
              </div>
            </div>
          )}

          {/* Monthly section */}
          {monthlyRows.length > 0 && (
            <>
              <div className="flex items-center justify-center gap-4 bg-stone-900 border border-stone-800 rounded-xl px-4 py-3">
                <button
                  onClick={() => setMonth(m => shiftMonth(m, -1))}
                  className="p-2 rounded-lg text-stone-400 hover:text-amber-300 hover:bg-stone-800 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-amber-100 font-semibold text-sm sm:text-base min-w-[160px] text-center capitalize">
                  {monthLabel(month)}
                </span>
                <button
                  onClick={() => setMonth(m => shiftMonth(m, 1))}
                  className="p-2 rounded-lg text-stone-400 hover:text-amber-300 hover:bg-stone-800 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                {month !== currentMonthStr() && (
                  <button
                    onClick={() => setMonth(currentMonthStr())}
                    className="ml-2 text-xs text-stone-500 hover:text-amber-400 underline transition-colors"
                  >
                    Hoje
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 px-1">
                <Calendar className="w-4 h-4 text-amber-600" />
                <h2 className="text-amber-200 font-semibold text-sm">Contas Mensais</h2>
              </div>

              <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
                <div className="divide-y divide-stone-800/50">
                  {monthlyRows.map(({ expense, isPaid, dueAmount, overdue, periodKey }) => {
                    const Icon = CATEGORY_ICONS[expense.category];
                    const colors = CATEGORY_COLORS[expense.category];
                    return (
                      <div
                        key={expense.id}
                        className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 hover:bg-stone-800/30 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-10 h-10 rounded-full ${colors.bg} border ${colors.border} flex items-center justify-center shrink-0`}>
                            <Icon className={`w-5 h-5 ${colors.text}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-stone-200 text-sm font-medium truncate">{expense.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-xs px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}>
                                {EXPENSE_CATEGORY_LABELS[expense.category]}
                              </span>
                              <span className="text-stone-500 text-xs">{dueDayLabel(expense)}</span>
                              {overdue && (
                                <span className="flex items-center gap-1 text-red-400 text-xs">
                                  <AlertTriangle className="w-3 h-3" /> Atrasado
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 sm:gap-4 justify-between sm:justify-end">
                          <div className="text-right">
                            <p className={`font-semibold text-sm ${isPaid ? 'text-green-400' : overdue ? 'text-red-400' : 'text-stone-200'}`}>
                              {formatCurrency(dueAmount)}
                            </p>
                          </div>

                          <button
                            onClick={() => (isPaid ? unmarkPaid(expense, periodKey) : openPay(expense, periodKey))}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                              isPaid
                                ? 'bg-green-700/20 border-green-700/40 text-green-400 hover:bg-green-700/30'
                                : 'border-stone-700 text-stone-400 hover:border-amber-600 hover:text-amber-300'
                            }`}
                          >
                            {isPaid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                            {isPaid ? 'Pago' : 'Marcar pago'}
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEdit(expense)}
                              className="p-1.5 rounded-lg text-stone-500 hover:text-amber-300 hover:bg-stone-800 transition-colors"
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setConfirmDelete(expense)}
                              className="p-1.5 rounded-lg text-stone-500 hover:text-red-400 hover:bg-stone-800 transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Weekly section */}
          {weeklyRows.length > 0 && (
            <>
              <div className="flex items-center justify-center gap-4 bg-stone-900 border border-stone-800 rounded-xl px-4 py-3">
                <button
                  onClick={() => setWeekStart(w => shiftWeek(w, -1))}
                  className="p-2 rounded-lg text-stone-400 hover:text-amber-300 hover:bg-stone-800 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-amber-100 font-semibold text-sm sm:text-base min-w-[180px] text-center">
                  {weekLabel(weekStart)}
                </span>
                <button
                  onClick={() => setWeekStart(w => shiftWeek(w, 1))}
                  className="p-2 rounded-lg text-stone-400 hover:text-amber-300 hover:bg-stone-800 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                {weekStart !== currentWeekStr() && (
                  <button
                    onClick={() => setWeekStart(currentWeekStr())}
                    className="ml-2 text-xs text-stone-500 hover:text-amber-400 underline transition-colors"
                  >
                    Hoje
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 px-1">
                <Repeat className="w-4 h-4 text-amber-600" />
                <h2 className="text-amber-200 font-semibold text-sm">Contas Semanais</h2>
              </div>

              <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
                <div className="divide-y divide-stone-800/50">
                  {weeklyRows.map(({ expense, isPaid, dueAmount, overdue, periodKey, dueDate }) => {
                    const Icon = CATEGORY_ICONS[expense.category];
                    const colors = CATEGORY_COLORS[expense.category];
                    return (
                      <div
                        key={expense.id}
                        className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 hover:bg-stone-800/30 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-10 h-10 rounded-full ${colors.bg} border ${colors.border} flex items-center justify-center shrink-0`}>
                            <Icon className={`w-5 h-5 ${colors.text}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-stone-200 text-sm font-medium truncate">{expense.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-xs px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}>
                                {EXPENSE_CATEGORY_LABELS[expense.category]}
                              </span>
                              <span className="text-stone-500 text-xs">
                                {WEEKDAY_LABELS[expense.due_day]}
                              </span>
                              {overdue && (
                                <span className="flex items-center gap-1 text-red-400 text-xs">
                                  <AlertTriangle className="w-3 h-3" /> Atrasado
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 sm:gap-4 justify-between sm:justify-end">
                          <div className="text-right">
                            <p className={`font-semibold text-sm ${isPaid ? 'text-green-400' : overdue ? 'text-red-400' : 'text-stone-200'}`}>
                              {formatCurrency(dueAmount)}
                            </p>
                          </div>

                          <button
                            onClick={() => (isPaid ? unmarkPaid(expense, periodKey) : openPay(expense, periodKey))}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                              isPaid
                                ? 'bg-green-700/20 border-green-700/40 text-green-400 hover:bg-green-700/30'
                                : 'border-stone-700 text-stone-400 hover:border-amber-600 hover:text-amber-300'
                            }`}
                          >
                            {isPaid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                            {isPaid ? 'Pago' : 'Marcar pago'}
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEdit(expense)}
                              className="p-1.5 rounded-lg text-stone-500 hover:text-amber-300 hover:bg-stone-800 transition-colors"
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setConfirmDelete(expense)}
                              className="p-1.5 rounded-lg text-stone-500 hover:text-red-400 hover:bg-stone-800 transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {allRows.length === 0 && (
            <div className="text-center py-16">
              <Receipt className="w-10 h-10 text-stone-700 mx-auto mb-3" />
              <p className="text-stone-400">Nenhuma conta fixa cadastrada ainda.</p>
              <button onClick={openNew} className="mt-4 text-amber-400 hover:text-amber-300 text-sm font-medium transition-colors">
                Cadastrar a primeira conta
              </button>
            </div>
          )}
        </>
      )}

      {/* Form modal (create/edit) */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
          <div className="bg-stone-900 border border-amber-900/30 rounded-2xl shadow-2xl w-full max-w-md my-auto">
            <div className="flex items-center justify-between p-6 border-b border-stone-800">
              <h2 className="text-amber-100 font-semibold text-lg">{editing ? 'Editar Conta Fixa' : 'Nova Conta Fixa'}</h2>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="text-stone-500 hover:text-amber-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="text-stone-400 text-sm mb-1.5 block">Nome *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-stone-800 border border-stone-700 focus:border-amber-600 rounded-lg px-4 py-2.5 text-stone-200 outline-none transition-colors text-sm"
                  placeholder="Ex: Água, Luz, Aluguel..."
                  autoFocus
                />
              </div>

              <div>
                <label className="text-stone-400 text-sm mb-1.5 block">Categoria</label>
                <div className="grid grid-cols-5 gap-2">
                  {EXPENSE_CATEGORIES.map(cat => {
                    const Icon = CATEGORY_ICONS[cat];
                    const colors = CATEGORY_COLORS[cat];
                    const active = form.category === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, category: cat }))}
                        title={EXPENSE_CATEGORY_LABELS[cat]}
                        className={`flex flex-col items-center gap-1 py-2 rounded-lg border transition-all ${
                          active ? `${colors.bg} ${colors.border}` : 'border-stone-700 hover:border-stone-600'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${active ? colors.text : 'text-stone-500'}`} />
                        <span className={`text-[10px] ${active ? colors.text : 'text-stone-500'}`}>{EXPENSE_CATEGORY_LABELS[cat]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Frequency selector */}
              <div>
                <label className="text-stone-400 text-sm mb-1.5 block">Frequência</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(EXPENSE_FREQUENCY_LABELS) as ExpenseFrequency[]).map(freq => {
                    const active = form.frequency === freq;
                    return (
                      <button
                        key={freq}
                        type="button"
                        onClick={() => setForm(f => ({
                          ...f,
                          frequency: freq,
                          due_day: freq === 'weekly' ? '1' : '10',
                        }))}
                        className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                          active
                            ? 'bg-amber-700/30 border-amber-700/40 text-amber-300'
                            : 'border-stone-700 text-stone-400 hover:border-stone-600'
                        }`}
                      >
                        {freq === 'monthly' ? <Calendar className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
                        {EXPENSE_FREQUENCY_LABELS[freq]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-400 text-sm mb-1.5 block">Valor *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full bg-stone-800 border border-stone-700 focus:border-amber-600 rounded-lg px-4 py-2.5 text-stone-200 outline-none transition-colors text-sm"
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <label className="text-stone-400 text-sm mb-1.5 block">
                    {form.frequency === 'weekly' ? 'Dia da Semana' : 'Dia do Vencimento'}
                  </label>
                  {form.frequency === 'weekly' ? (
                    <select
                      value={form.due_day}
                      onChange={e => setForm(f => ({ ...f, due_day: e.target.value }))}
                      className="w-full bg-stone-800 border border-stone-700 focus:border-amber-600 rounded-lg px-4 py-2.5 text-stone-200 outline-none transition-colors text-sm"
                    >
                      {WEEKDAY_LABELS.map((label, idx) => (
                        <option key={idx} value={idx}>{label}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={form.due_day}
                      onChange={e => setForm(f => ({ ...f, due_day: e.target.value }))}
                      className="w-full bg-stone-800 border border-stone-700 focus:border-amber-600 rounded-lg px-4 py-2.5 text-stone-200 outline-none transition-colors text-sm"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="text-stone-400 text-sm mb-1.5 block">Observações</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full bg-stone-800 border border-stone-700 focus:border-amber-600 rounded-lg px-4 py-2.5 text-stone-200 outline-none transition-colors text-sm"
                  placeholder="Ex: Nº da unidade, código do cliente..."
                />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="flex-1 py-2.5 rounded-lg border border-stone-700 text-stone-400 text-sm transition-colors hover:border-stone-600">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-amber-700 hover:bg-amber-600 text-amber-50 font-medium text-sm transition-colors disabled:opacity-60">
                  {saving ? <div className="w-4 h-4 border-2 border-amber-200 border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay modal */}
      {payTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
          <div className="bg-stone-900 border border-amber-900/30 rounded-2xl shadow-2xl w-full max-w-sm my-auto">
            <div className="flex items-center justify-between p-6 border-b border-stone-800">
              <h2 className="text-amber-100 font-semibold text-lg">Marcar como Paga</h2>
              <button onClick={() => setPayTarget(null)} className="text-stone-500 hover:text-amber-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-stone-300 text-sm">
                <span className="font-medium">{payTarget.name}</span> — {periodLabel(payTarget)}
              </p>
              <div>
                <label className="text-stone-400 text-sm mb-1.5 block">Valor Pago</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  className="w-full bg-stone-800 border border-stone-700 focus:border-amber-600 rounded-lg px-4 py-2.5 text-stone-200 outline-none transition-colors text-sm"
                />
                <p className="text-stone-500 text-xs mt-1">Pode variar em relação ao valor base (ex: água, luz).</p>
              </div>
              <div>
                <label className="text-stone-400 text-sm mb-1.5 block">Data do Pagamento</label>
                <input
                  type="date"
                  value={payDate}
                  onChange={e => setPayDate(e.target.value)}
                  className="w-full bg-stone-800 border border-stone-700 focus:border-amber-600 rounded-lg px-4 py-2.5 text-stone-200 outline-none transition-colors text-sm"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setPayTarget(null)} className="flex-1 py-2.5 rounded-lg border border-stone-700 text-stone-400 text-sm transition-colors hover:border-stone-600">Cancelar</button>
                <button
                  onClick={() => confirmPay(payTarget.frequency === 'weekly'
                    ? weekdaysInWeek(weekStart)[(payTarget.due_day + 6) % 7]
                    : month)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-green-700 hover:bg-green-600 text-green-50 font-medium text-sm transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
          <div className="bg-stone-900 border border-red-900/30 rounded-2xl shadow-2xl w-full max-w-sm my-auto p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-900/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <h2 className="text-amber-100 font-semibold text-lg">Excluir conta fixa?</h2>
            </div>
            <p className="text-stone-400 text-sm mb-6">
              Isso vai remover <span className="text-stone-200 font-medium">{confirmDelete.name}</span> e todo o histórico de pagamentos dela. Essa ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-lg border border-stone-700 text-stone-400 text-sm transition-colors hover:border-stone-600">Cancelar</button>
              <button onClick={() => handleDelete(confirmDelete)} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-700 hover:bg-red-600 text-red-50 font-medium text-sm transition-colors">
                <Trash2 className="w-4 h-4" />
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
