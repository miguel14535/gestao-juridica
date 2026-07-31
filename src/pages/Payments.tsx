import { useState, useEffect } from 'react';
import { Plus, Search, Trash2, X, Check, ChevronDown, ChevronUp, CreditCard, Undo2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Person, FinancialRecord, Installment, AccessMode, PaymentMethod } from '@/types';
import { PAYMENT_METHOD_LABELS } from '@/types';

interface PaymentsProps {
  mode: AccessMode;
}

type RecordWithRelations = FinancialRecord & { people: Person; installments: Installment[] };

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function addMonths(dateStr: string, months: number) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1 + months, d));
  return date.toISOString().split('T')[0];
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

const PAYMENT_METHODS: PaymentMethod[] = ['dinheiro', 'pix', 'cartao_debito', 'cartao_credito', 'transferencia', 'boleto', 'outro'];

const emptyForm = {
  person_id: '',
  type: 'payment' as 'credit' | 'payment',
  amount: '',
  description: '',
  date: todayStr(),
  payment_method: '' as PaymentMethod | '',
  isInstallment: false,
  installmentsCount: '2',
  firstDueDate: todayStr(),
};

export default function Payments({ mode }: PaymentsProps) {
  const [people, setPeople] = useState<Person[]>([]);
  const [records, setRecords] = useState<RecordWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null);
  const [expandedInstallments, setExpandedInstallments] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [{ data: ppl }, { data: rec }] = await Promise.all([
      supabase.from('people').select('*').order('name'),
      supabase
        .from('financial_records')
        .select('*, people(*), installments!installments_financial_record_id_fkey(*)')
        .order('date', { ascending: false })
        .order('number', { foreignTable: 'installments', ascending: true }),
    ]);
    if (ppl) setPeople(ppl);
    if (rec) setRecords(rec as RecordWithRelations[]);
    setLoading(false);
  }

  function resetForm() {
    setForm(emptyForm);
    setError('');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.person_id) { setError('Selecione uma pessoa.'); return; }
    const totalAmount = Number(form.amount);
    if (!form.amount || isNaN(totalAmount) || totalAmount <= 0) { setError('Informe um valor válido.'); return; }

    const isInstallmentPurchase = form.type === 'credit' && form.isInstallment;
    const installmentsCount = parseInt(form.installmentsCount, 10);
    if (isInstallmentPurchase && (isNaN(installmentsCount) || installmentsCount < 2)) {
      setError('Informe pelo menos 2 parcelas.');
      return;
    }

    setSaving(true);
    setError('');

    const { data: inserted, error: err } = await supabase
      .from('financial_records')
      .insert({
        person_id: form.person_id,
        type: form.type,
        amount: totalAmount,
        description: form.description.trim() || null,
        date: form.date,
        payment_method: form.payment_method || null,
        installments_total: isInstallmentPurchase ? installmentsCount : null,
      })
      .select()
      .single();

    if (err || !inserted) {
      setSaving(false);
      setError('Erro ao salvar.');
      return;
    }

    if (isInstallmentPurchase) {
      const cents = Math.round(totalAmount * 100);
      const baseCents = Math.floor(cents / installmentsCount);
      const remainder = cents - baseCents * installmentsCount;

      const installmentsPayload = Array.from({ length: installmentsCount }).map((_, i) => {
        const amountCents = baseCents + (i === installmentsCount - 1 ? remainder : 0);
        return {
          financial_record_id: inserted.id,
          number: i + 1,
          amount: amountCents / 100,
          due_date: addMonths(form.firstDueDate, i),
        };
      });

      const { error: instErr } = await supabase.from('installments').insert(installmentsPayload);
      if (instErr) {
        setSaving(false);
        setError('Registro criado, mas houve erro ao gerar as parcelas.');
        return;
      }
    }

    setSaving(false);
    setShowForm(false);
    resetForm();
    loadData();
  }

  async function handleDelete(record: RecordWithRelations) {
    setBusyId(record.id);
    if (record.installments_total && record.installments.length > 0) {
      const paidPaymentIds = record.installments.filter(i => i.payment_record_id).map(i => i.payment_record_id as string);
      if (paidPaymentIds.length > 0) {
        await supabase.from('financial_records').delete().in('id', paidPaymentIds);
      }
    }
    await supabase.from('financial_records').delete().eq('id', record.id);
    setBusyId(null);
    loadData();
  }

  async function quitarParcela(record: RecordWithRelations, installment: Installment) {
    setBusyId(installment.id);
    const { data: paymentRecord, error: payErr } = await supabase
      .from('financial_records')
      .insert({
        person_id: record.person_id,
        type: 'payment',
        amount: installment.amount,
        description: `Parcela ${installment.number}/${record.installments_total} - ${record.description || 'Compra parcelada'}`,
        date: todayStr(),
        payment_method: record.payment_method,
      })
      .select()
      .single();

    if (!payErr && paymentRecord) {
      await supabase
        .from('installments')
        .update({ paid: true, paid_date: todayStr(), payment_record_id: paymentRecord.id })
        .eq('id', installment.id);
    }
    setBusyId(null);
    loadData();
  }

  async function desfazerQuitacao(installment: Installment) {
    setBusyId(installment.id);
    if (installment.payment_record_id) {
      // The delete trigger already resets the installment, but we also handle it
      // explicitly in case the payment record was already removed elsewhere.
      await supabase.from('financial_records').delete().eq('id', installment.payment_record_id);
    }
    await supabase
      .from('installments')
      .update({ paid: false, paid_date: null, payment_record_id: null })
      .eq('id', installment.id);
    setBusyId(null);
    loadData();
  }

  // Group records by person
  const peopleWithRecords = people
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    .map(p => {
      const personRecords = records.filter(r => r.person_id === p.id);
      const totalPayment = personRecords.filter(r => r.type === 'payment').reduce((s, r) => s + Number(r.amount), 0);
      const totalCredit = personRecords.filter(r => r.type === 'credit').reduce((s, r) => s + Number(r.amount), 0);
      return { person: p, records: personRecords, totalPayment, totalCredit, balance: totalCredit - totalPayment };
    })
    .filter(p => p.records.length > 0 || !search);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-amber-100">Pagamentos</h1>
          <p className="text-stone-400 text-sm mt-0.5">Registros financeiros por pessoa</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-amber-700 hover:bg-amber-600 text-amber-50 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Registro
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
        <input
          type="text"
          placeholder="Buscar por nome..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-stone-900 border border-stone-700 focus:border-amber-600 rounded-lg pl-10 pr-4 py-2.5 text-stone-200 placeholder-stone-500 outline-none transition-colors text-sm"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : peopleWithRecords.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-stone-400">Nenhum registro encontrado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {peopleWithRecords.map(({ person, records: pRecords, totalPayment, totalCredit, balance }) => (
            <div key={person.id} className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedPerson(expandedPerson === person.id ? null : person.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-stone-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-800/30 border border-amber-700/30 flex items-center justify-center">
                    <span className="text-amber-400 font-bold text-sm">{person.name.charAt(0)}</span>
                  </div>
                  <div className="text-left">
                    <p className="text-amber-100 font-medium">{person.name}</p>
                    <p className="text-stone-500 text-xs">{pRecords.length} registro{pRecords.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-stone-500 mb-0.5">Total Pago</p>
                    <p className="text-green-400 font-semibold text-sm">{formatCurrency(totalPayment)}</p>
                  </div>
                  {mode === 'complex' && (
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-stone-500 mb-0.5">Saldo</p>
                      <p className={`font-semibold text-sm ${balance > 0 ? 'text-red-400' : balance < 0 ? 'text-green-400' : 'text-stone-400'}`}>
                        {formatCurrency(Math.abs(balance))}
                        {balance > 0 ? ' deve' : balance < 0 ? ' crédito' : ''}
                      </p>
                    </div>
                  )}
                  {expandedPerson === person.id ? <ChevronUp className="w-4 h-4 text-stone-500" /> : <ChevronDown className="w-4 h-4 text-stone-500" />}
                </div>
              </button>

              {expandedPerson === person.id && (
                <div className="border-t border-stone-800 divide-y divide-stone-800/50">
                  {pRecords.length === 0 ? (
                    <p className="text-stone-500 text-sm p-4">Nenhum registro para esta pessoa.</p>
                  ) : (
                    pRecords.map(record => {
                      const hasInstallments = !!record.installments_total && record.installments.length > 0;
                      const paidCount = hasInstallments ? record.installments.filter(i => i.paid).length : 0;
                      const isOpen = expandedInstallments === record.id;
                      return (
                        <div key={record.id}>
                          <div className="flex items-center justify-between px-4 py-3 hover:bg-stone-800/30 group">
                            <button
                              type="button"
                              disabled={!hasInstallments}
                              onClick={() => hasInstallments && setExpandedInstallments(isOpen ? null : record.id)}
                              className="flex items-center gap-3 text-left flex-1 min-w-0"
                            >
                              <div className={`w-2 h-2 rounded-full shrink-0 ${record.type === 'payment' ? 'bg-green-500' : 'bg-red-400'}`} />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-stone-200 text-sm truncate">
                                    {record.description || (record.type === 'payment' ? 'Pagamento recebido' : 'Cobrança registrada')}
                                  </p>
                                  {hasInstallments && (
                                    <span className="flex items-center gap-1 text-[11px] bg-amber-900/30 border border-amber-700/30 text-amber-300 px-1.5 py-0.5 rounded">
                                      <CreditCard className="w-3 h-3" />
                                      {paidCount}/{record.installments_total} parcelas pagas
                                    </span>
                                  )}
                                </div>
                                <p className="text-stone-500 text-xs">
                                  {formatDate(record.date)}
                                  {record.payment_method && ` · ${PAYMENT_METHOD_LABELS[record.payment_method]}`}
                                </p>
                              </div>
                              {hasInstallments && (isOpen ? <ChevronUp className="w-3.5 h-3.5 text-stone-500 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-stone-500 shrink-0" />)}
                            </button>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className={`font-semibold text-sm ${record.type === 'payment' ? 'text-green-400' : 'text-red-400'}`}>
                                {record.type === 'payment' ? '+' : '-'}{formatCurrency(Number(record.amount))}
                              </span>
                              <button
                                onClick={() => handleDelete(record)}
                                disabled={busyId === record.id}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded text-stone-600 hover:text-red-400 transition-all disabled:opacity-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {hasInstallments && isOpen && (
                            <div className="bg-stone-950/50 px-4 py-2 space-y-1.5">
                              {record.installments.map(installment => (
                                <div
                                  key={installment.id}
                                  className="flex items-center justify-between gap-3 py-1.5 px-2 rounded-lg bg-stone-900/60"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${installment.paid ? 'bg-green-500' : 'bg-stone-600'}`} />
                                    <span className="text-stone-300 text-xs">Parcela {installment.number}/{record.installments_total}</span>
                                    <span className="text-stone-500 text-xs">venc. {formatDate(installment.due_date)}</span>
                                    {installment.paid && installment.paid_date && (
                                      <span className="text-green-500/80 text-xs hidden sm:inline">pago em {formatDate(installment.paid_date)}</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 shrink-0">
                                    <span className="text-stone-200 text-xs font-medium">{formatCurrency(Number(installment.amount))}</span>
                                    {installment.paid ? (
                                      <button
                                        onClick={() => desfazerQuitacao(installment)}
                                        disabled={busyId === installment.id}
                                        className="flex items-center gap-1 text-[11px] text-stone-400 hover:text-amber-300 border border-stone-700 hover:border-amber-700 px-2 py-1 rounded transition-colors disabled:opacity-50"
                                      >
                                        <Undo2 className="w-3 h-3" />
                                        Desfazer
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => quitarParcela(record, installment)}
                                        disabled={busyId === installment.id}
                                        className="flex items-center gap-1 text-[11px] bg-green-700/30 hover:bg-green-700/50 border border-green-700/40 text-green-400 px-2 py-1 rounded transition-colors disabled:opacity-50"
                                      >
                                        <Check className="w-3 h-3" />
                                        Quitar
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                  {mode === 'complex' && (
                    <div className="px-4 py-3 bg-stone-800/20 flex flex-wrap gap-4 text-sm">
                      <span className="text-stone-400">Cobranças: <span className="text-red-400 font-medium">{formatCurrency(totalCredit)}</span></span>
                      <span className="text-stone-400">Recebido: <span className="text-green-400 font-medium">{formatCurrency(totalPayment)}</span></span>
                      <span className="text-stone-400">Saldo: <span className={`font-semibold ${balance > 0 ? 'text-red-400' : balance < 0 ? 'text-green-400' : 'text-stone-400'}`}>{formatCurrency(Math.abs(balance))}{balance > 0 ? ' a receber' : balance < 0 ? ' em crédito' : ''}</span></span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
          <div className="bg-stone-900 border border-amber-900/30 rounded-2xl shadow-2xl w-full max-w-md my-auto">
            <div className="flex items-center justify-between p-6 border-b border-stone-800">
              <h2 className="text-amber-100 font-semibold text-lg">Novo Registro</h2>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="text-stone-500 hover:text-amber-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="text-stone-400 text-sm mb-1.5 block">Pessoa *</label>
                <select
                  value={form.person_id}
                  onChange={e => setForm(f => ({ ...f, person_id: e.target.value }))}
                  className="w-full bg-stone-800 border border-stone-700 focus:border-amber-600 rounded-lg px-4 py-2.5 text-stone-200 outline-none transition-colors text-sm"
                >
                  <option value="">Selecione...</option>
                  {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-stone-400 text-sm mb-1.5 block">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, type: 'payment', isInstallment: false }))}
                    className={`py-2.5 rounded-lg text-sm font-medium border transition-all ${form.type === 'payment' ? 'bg-green-700/30 border-green-600/50 text-green-400' : 'border-stone-700 text-stone-400 hover:border-stone-600'}`}
                  >
                    Pagamento Recebido
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, type: 'credit' }))}
                    className={`py-2.5 rounded-lg text-sm font-medium border transition-all ${form.type === 'credit' ? 'bg-red-700/30 border-red-600/50 text-red-400' : 'border-stone-700 text-stone-400 hover:border-stone-600'}`}
                  >
                    Cobrança / Dívida
                  </button>
                </div>
              </div>

              {form.type === 'credit' && (
                <div className="flex items-center justify-between bg-stone-800/60 border border-stone-700 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-amber-400" />
                    <span className="text-stone-300 text-sm">Parcelar no cartão de crédito</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({
                      ...f,
                      isInstallment: !f.isInstallment,
                      payment_method: !f.isInstallment ? 'cartao_credito' : f.payment_method,
                    }))}
                    className={`w-11 h-6 rounded-full transition-colors relative ${form.isInstallment ? 'bg-amber-600' : 'bg-stone-700'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${form.isInstallment ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              )}

              <div>
                <label className="text-stone-400 text-sm mb-1.5 block">
                  Valor {form.isInstallment ? 'Total' : ''} *
                </label>
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

              {form.isInstallment && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-stone-400 text-sm mb-1.5 block">Nº de Parcelas</label>
                    <input
                      type="number"
                      min="2"
                      max="60"
                      value={form.installmentsCount}
                      onChange={e => setForm(f => ({ ...f, installmentsCount: e.target.value }))}
                      className="w-full bg-stone-800 border border-stone-700 focus:border-amber-600 rounded-lg px-4 py-2.5 text-stone-200 outline-none transition-colors text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-stone-400 text-sm mb-1.5 block">1ª Parcela vence em</label>
                    <input
                      type="date"
                      value={form.firstDueDate}
                      onChange={e => setForm(f => ({ ...f, firstDueDate: e.target.value }))}
                      className="w-full bg-stone-800 border border-stone-700 focus:border-amber-600 rounded-lg px-4 py-2.5 text-stone-200 outline-none transition-colors text-sm"
                    />
                  </div>
                  {Number(form.amount) > 0 && parseInt(form.installmentsCount, 10) >= 2 && !isNaN(parseInt(form.installmentsCount, 10)) && (
                    <p className="col-span-2 text-stone-500 text-xs">
                      {parseInt(form.installmentsCount, 10)}x de {formatCurrency(Number(form.amount) / parseInt(form.installmentsCount, 10))}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="text-stone-400 text-sm mb-1.5 block">Forma de Pagamento</label>
                <select
                  value={form.payment_method}
                  disabled={form.isInstallment}
                  onChange={e => setForm(f => ({ ...f, payment_method: e.target.value as PaymentMethod }))}
                  className="w-full bg-stone-800 border border-stone-700 focus:border-amber-600 rounded-lg px-4 py-2.5 text-stone-200 outline-none transition-colors text-sm disabled:opacity-60"
                >
                  <option value="">Não informado</option>
                  {PAYMENT_METHODS.map(pm => <option key={pm} value={pm}>{PAYMENT_METHOD_LABELS[pm]}</option>)}
                </select>
              </div>

              <div>
                <label className="text-stone-400 text-sm mb-1.5 block">Data {form.isInstallment ? 'da Compra' : ''}</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full bg-stone-800 border border-stone-700 focus:border-amber-600 rounded-lg px-4 py-2.5 text-stone-200 outline-none transition-colors text-sm"
                />
              </div>
              <div>
                <label className="text-stone-400 text-sm mb-1.5 block">Descrição</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full bg-stone-800 border border-stone-700 focus:border-amber-600 rounded-lg px-4 py-2.5 text-stone-200 outline-none transition-colors text-sm"
                  placeholder="Ex: Honorários março..."
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
    </div>
  );
}
