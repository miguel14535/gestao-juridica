import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, Pencil, Plus, Receipt, Search, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { PaymentMethod, VariableExpense, VariableExpenseCategory } from '@/types';
import {
  PAYMENT_METHOD_LABELS,
  VARIABLE_EXPENSE_CATEGORIES,
  VARIABLE_EXPENSE_CATEGORY_LABELS,
} from '@/types';

const PAYMENT_METHODS: PaymentMethod[] = [
  'dinheiro', 'pix', 'cartao_debito', 'cartao_credito', 'transferencia', 'boleto', 'outro',
];

const emptyForm = {
  description: '',
  category: 'outro' as VariableExpenseCategory,
  amount: '',
  date: new Date().toISOString().split('T')[0],
  payment_method: '' as PaymentMethod | '',
  notes: '',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(value: string) {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function monthLabel(month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  const value = new Date(Date.UTC(year, monthNumber - 1, 1));
  const label = value.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function shiftMonth(month: string, amount: number) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber - 1 + amount, 1)).toISOString().slice(0, 7);
}

export default function VariableExpenses() {
  const [expenses, setExpenses] = useState<VariableExpense[]>([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<VariableExpenseCategory | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<VariableExpense | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadExpenses();
  }, []);

  async function loadExpenses() {
    setLoading(true);
    const { data, error: loadError } = await supabase
      .from('variable_expenses')
      .select('*')
      .order('date', { ascending: false });
    if (loadError) {
      setError('Não foi possível carregar os gastos variáveis.');
    } else {
      setExpenses((data ?? []) as VariableExpense[]);
    }
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setShowForm(true);
  }

  function openEdit(expense: VariableExpense) {
    setEditing(expense);
    setForm({
      description: expense.description,
      category: expense.category,
      amount: String(expense.amount),
      date: expense.date,
      payment_method: expense.payment_method ?? '',
      notes: expense.notes ?? '',
    });
    setError('');
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm);
    setError('');
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!form.description.trim()) {
      setError('Informe o que foi gasto.');
      return;
    }
    if (!form.amount || !Number.isFinite(amount) || amount <= 0) {
      setError('Informe um valor válido.');
      return;
    }
    if (!form.date) {
      setError('Informe a data do gasto.');
      return;
    }

    setSaving(true);
    setError('');
    const payload = {
      description: form.description.trim(),
      category: form.category,
      amount,
      date: form.date,
      payment_method: form.payment_method || null,
      notes: form.notes.trim() || null,
    };
    const result = editing
      ? await supabase.from('variable_expenses').update(payload).eq('id', editing.id)
      : await supabase.from('variable_expenses').insert(payload);

    if (result.error) {
      setError('Não foi possível salvar o gasto. Tente novamente.');
      setSaving(false);
      return;
    }
    setSaving(false);
    closeForm();
    await loadExpenses();
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const { error: deleteError } = await supabase.from('variable_expenses').delete().eq('id', id);
    if (deleteError) setError('Não foi possível excluir o gasto.');
    setDeletingId(null);
    await loadExpenses();
  }

  const filteredExpenses = useMemo(() => expenses.filter(expense => {
    const matchesMonth = expense.date.startsWith(month);
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || expense.description.toLowerCase().includes(query) || (expense.notes ?? '').toLowerCase().includes(query);
    const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
    return matchesMonth && matchesSearch && matchesCategory;
  }), [expenses, month, search, categoryFilter]);

  const total = filteredExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const monthTotal = expenses.filter(expense => expense.date.startsWith(month)).reduce((sum, expense) => sum + Number(expense.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-amber-100">Gastos Variáveis</h1>
          <p className="text-stone-400 text-sm mt-0.5">Registre despesas avulsas que não se repetem todo mês</p>
        </div>
        <button onClick={openNew} className="flex items-center justify-center gap-2 bg-amber-700 hover:bg-amber-600 text-amber-50 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors">
          <Plus className="w-4 h-4" /> Novo Gasto
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-4">
          <p className="text-stone-500 text-xs mb-2">Total do mês</p>
          <p className="text-amber-200 font-bold text-xl">{formatCurrency(monthTotal)}</p>
        </div>
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-4">
          <p className="text-stone-500 text-xs mb-2">Lançamentos</p>
          <p className="text-stone-200 font-bold text-xl">{expenses.filter(expense => expense.date.startsWith(month)).length}</p>
        </div>
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-4">
          <p className="text-stone-500 text-xs mb-2">Valor exibido</p>
          <p className="text-green-400 font-bold text-xl">{formatCurrency(total)}</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-3">
        <div className="flex items-center justify-between gap-3 bg-stone-900 border border-stone-800 rounded-xl px-3 py-2">
          <button onClick={() => setMonth(value => shiftMonth(value, -1))} className="p-2 rounded-lg text-stone-400 hover:text-amber-300 hover:bg-stone-800 transition-colors" aria-label="Mês anterior">‹</button>
          <span className="text-amber-100 font-semibold text-sm min-w-[150px] text-center">{monthLabel(month)}</span>
          <button onClick={() => setMonth(value => shiftMonth(value, 1))} className="p-2 rounded-lg text-stone-400 hover:text-amber-300 hover:bg-stone-800 transition-colors" aria-label="Próximo mês">›</button>
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar gasto..." className="w-full bg-stone-900 border border-stone-800 focus:border-amber-600 rounded-xl pl-10 pr-4 py-3 text-stone-200 placeholder-stone-500 outline-none text-sm" />
        </div>
        <select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value as VariableExpenseCategory | 'all')} className="bg-stone-900 border border-stone-800 focus:border-amber-600 rounded-xl px-4 py-3 text-stone-300 outline-none text-sm">
          <option value="all">Todas as categorias</option>
          {VARIABLE_EXPENSE_CATEGORIES.map(category => <option key={category} value={category}>{VARIABLE_EXPENSE_CATEGORY_LABELS[category]}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : filteredExpenses.length === 0 ? (
        <div className="text-center py-16 bg-stone-900 border border-stone-800 rounded-xl">
          <Receipt className="w-10 h-10 text-stone-700 mx-auto mb-3" />
          <p className="text-stone-400">Nenhum gasto variável neste período.</p>
          <button onClick={openNew} className="mt-4 text-amber-400 hover:text-amber-300 text-sm font-medium">Registrar o primeiro gasto</button>
        </div>
      ) : (
        <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
          <div className="divide-y divide-stone-800/60">
            {filteredExpenses.map(expense => (
              <div key={expense.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 hover:bg-stone-800/30 transition-colors group">
                <div className="w-10 h-10 rounded-full bg-amber-900/30 border border-amber-800/40 flex items-center justify-center shrink-0">
                  <Receipt className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-stone-200 font-medium text-sm truncate">{expense.description}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-stone-800 text-stone-400">{VARIABLE_EXPENSE_CATEGORY_LABELS[expense.category]}</span>
                    <span className="flex items-center gap-1 text-stone-500 text-xs"><CalendarDays className="w-3 h-3" />{formatDate(expense.date)}</span>
                    {expense.payment_method && <span className="text-stone-500 text-xs">{PAYMENT_METHOD_LABELS[expense.payment_method]}</span>}
                  </div>
                  {expense.notes && <p className="text-stone-500 text-xs mt-1 truncate">{expense.notes}</p>}
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <span className="text-red-400 font-semibold text-sm">-{formatCurrency(Number(expense.amount))}</span>
                  <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(expense)} className="p-1.5 rounded-lg text-stone-500 hover:text-amber-300 hover:bg-stone-800" title="Editar"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(expense.id)} disabled={deletingId === expense.id} className="p-1.5 rounded-lg text-stone-500 hover:text-red-400 hover:bg-stone-800 disabled:opacity-50" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
          <div className="bg-stone-900 border border-amber-900/30 rounded-2xl shadow-2xl w-full max-w-md my-auto">
            <div className="flex items-center justify-between p-6 border-b border-stone-800">
              <h2 className="text-amber-100 font-semibold text-lg">{editing ? 'Editar Gasto Variável' : 'Novo Gasto Variável'}</h2>
              <button onClick={closeForm} className="text-stone-500 hover:text-amber-400"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="text-stone-400 text-sm mb-1.5 block">O que foi gasto? *</label>
                <input autoFocus value={form.description} onChange={event => setForm(value => ({ ...value, description: event.target.value }))} placeholder="Ex: Combustível, material de escritório..." className="w-full bg-stone-800 border border-stone-700 focus:border-amber-600 rounded-lg px-4 py-2.5 text-stone-200 outline-none text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-400 text-sm mb-1.5 block">Valor *</label>
                  <input type="number" min="0" step="0.01" value={form.amount} onChange={event => setForm(value => ({ ...value, amount: event.target.value }))} placeholder="0,00" className="w-full bg-stone-800 border border-stone-700 focus:border-amber-600 rounded-lg px-4 py-2.5 text-stone-200 outline-none text-sm" />
                </div>
                <div>
                  <label className="text-stone-400 text-sm mb-1.5 block">Data *</label>
                  <input type="date" value={form.date} onChange={event => setForm(value => ({ ...value, date: event.target.value }))} className="w-full bg-stone-800 border border-stone-700 focus:border-amber-600 rounded-lg px-4 py-2.5 text-stone-200 outline-none text-sm" />
                </div>
              </div>
              <div>
                <label className="text-stone-400 text-sm mb-1.5 block">Categoria</label>
                <select value={form.category} onChange={event => setForm(value => ({ ...value, category: event.target.value as VariableExpenseCategory }))} className="w-full bg-stone-800 border border-stone-700 focus:border-amber-600 rounded-lg px-4 py-2.5 text-stone-200 outline-none text-sm">
                  {VARIABLE_EXPENSE_CATEGORIES.map(category => <option key={category} value={category}>{VARIABLE_EXPENSE_CATEGORY_LABELS[category]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-stone-400 text-sm mb-1.5 block">Forma de pagamento</label>
                <select value={form.payment_method} onChange={event => setForm(value => ({ ...value, payment_method: event.target.value as PaymentMethod | '' }))} className="w-full bg-stone-800 border border-stone-700 focus:border-amber-600 rounded-lg px-4 py-2.5 text-stone-200 outline-none text-sm">
                  <option value="">Não informado</option>
                  {PAYMENT_METHODS.map(method => <option key={method} value={method}>{PAYMENT_METHOD_LABELS[method]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-stone-400 text-sm mb-1.5 block">Observações</label>
                <textarea rows={3} value={form.notes} onChange={event => setForm(value => ({ ...value, notes: event.target.value }))} placeholder="Detalhes adicionais..." className="w-full bg-stone-800 border border-stone-700 focus:border-amber-600 rounded-lg px-4 py-2.5 text-stone-200 outline-none resize-none text-sm" />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeForm} className="flex-1 py-2.5 rounded-lg border border-stone-700 text-stone-400 hover:text-stone-200 text-sm">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-amber-700 hover:bg-amber-600 text-amber-50 font-medium text-sm disabled:opacity-60">
                  {saving ? <div className="w-4 h-4 border-2 border-amber-200 border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
