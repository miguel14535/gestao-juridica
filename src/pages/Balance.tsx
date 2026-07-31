import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Users, RefreshCw, DollarSign, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Person, FinancialRecord } from '@/types';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

interface PersonBalance {
  person: Person;
  totalCredit: number;
  totalPayment: number;
  balance: number;
}

export default function Balance() {
  const [data, setData] = useState<PersonBalance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [{ data: people }, { data: records }] = await Promise.all([
      supabase.from('people').select('*').order('name'),
      supabase.from('financial_records').select('*'),
    ]);
    if (!people || !records) { setLoading(false); return; }

    const balances: PersonBalance[] = people.map(person => {
      const personRecords = (records as FinancialRecord[]).filter(r => r.person_id === person.id);
      const totalCredit = personRecords.filter(r => r.type === 'credit').reduce((s, r) => s + Number(r.amount), 0);
      const totalPayment = personRecords.filter(r => r.type === 'payment').reduce((s, r) => s + Number(r.amount), 0);
      return { person, totalCredit, totalPayment, balance: totalCredit - totalPayment };
    }).filter(b => b.totalCredit > 0 || b.totalPayment > 0);

    setData(balances.sort((a, b) => b.balance - a.balance));
    setLoading(false);
  }

  const totalCharged = data.reduce((s, d) => s + d.totalCredit, 0);
  const totalReceived = data.reduce((s, d) => s + d.totalPayment, 0);
  const totalPending = data.reduce((s, d) => s + Math.max(0, d.balance), 0);
  const totalOverpaid = data.reduce((s, d) => s + Math.max(0, -d.balance), 0);

  const debtors = data.filter(d => d.balance > 0.01);
  const creditors = data.filter(d => d.balance < -0.01);
  const settled = data.filter(d => Math.abs(d.balance) <= 0.01);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-amber-100">Balanço Geral</h1>
          <p className="text-stone-400 text-sm mt-0.5">Visão completa de créditos e débitos</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 border border-stone-700 text-stone-400 hover:text-amber-300 hover:border-amber-700 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
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
                <DollarSign className="w-4 h-4 text-stone-500" />
                <span className="text-stone-400 text-xs">Total Cobrado</span>
              </div>
              <p className="text-amber-200 font-bold text-xl">{formatCurrency(totalCharged)}</p>
            </div>
            <div className="bg-stone-900 border border-stone-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-stone-400 text-xs">Total Recebido</span>
              </div>
              <p className="text-green-400 font-bold text-xl">{formatCurrency(totalReceived)}</p>
            </div>
            <div className="bg-stone-900 border border-red-900/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-red-400" />
                <span className="text-stone-400 text-xs">A Receber</span>
              </div>
              <p className="text-red-400 font-bold text-xl">{formatCurrency(totalPending)}</p>
            </div>
            <div className="bg-stone-900 border border-stone-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-stone-500" />
                <span className="text-stone-400 text-xs">Com Saldo Devedor</span>
              </div>
              <p className="text-amber-200 font-bold text-xl">{debtors.length} pessoa{debtors.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {/* Progress bar */}
          {totalCharged > 0 && (
            <div className="bg-stone-900 border border-stone-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-stone-400 text-sm">Taxa de recebimento</span>
                <span className="text-amber-300 font-semibold text-sm">
                  {((totalReceived / totalCharged) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-2.5 bg-stone-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-700 to-amber-500 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, (totalReceived / totalCharged) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-stone-500 text-xs">R$ 0</span>
                <span className="text-stone-500 text-xs">{formatCurrency(totalCharged)}</span>
              </div>
            </div>
          )}

          {/* Debtors table */}
          {debtors.length > 0 && (
            <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-stone-800">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <h2 className="text-amber-100 font-semibold">Devedores</h2>
                <span className="ml-auto text-stone-500 text-sm">{debtors.length} pessoa{debtors.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="divide-y divide-stone-800/50">
                {debtors.map(({ person, totalCredit, totalPayment, balance }) => (
                  <div key={person.id} className="flex flex-col sm:flex-row sm:items-center px-5 py-3 gap-3 hover:bg-stone-800/30 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-red-900/30 flex items-center justify-center shrink-0">
                        <span className="text-red-300 font-bold text-xs">{person.name.charAt(0)}</span>
                      </div>
                      <span className="text-stone-200 text-sm truncate">{person.name}</span>
                    </div>
                    <div className="flex items-center gap-4 sm:gap-6 text-sm">
                      <div className="text-right">
                        <p className="text-stone-500 text-xs">Cobrado</p>
                        <p className="text-stone-300">{formatCurrency(totalCredit)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-stone-500 text-xs">Pago</p>
                        <p className="text-green-400">{formatCurrency(totalPayment)}</p>
                      </div>
                      <div className="text-right min-w-[80px]">
                        <p className="text-stone-500 text-xs">Saldo</p>
                        <p className="text-red-400 font-semibold">{formatCurrency(balance)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Creditors (overpaid) */}
          {creditors.length > 0 && (
            <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-stone-800">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <h2 className="text-amber-100 font-semibold">Em Crédito</h2>
                <span className="ml-auto text-stone-500 text-sm">{formatCurrency(totalOverpaid)} a devolver</span>
              </div>
              <div className="divide-y divide-stone-800/50">
                {creditors.map(({ person, totalCredit, totalPayment, balance }) => (
                  <div key={person.id} className="flex flex-col sm:flex-row sm:items-center px-5 py-3 gap-3 hover:bg-stone-800/30 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-green-900/30 flex items-center justify-center shrink-0">
                        <span className="text-green-300 font-bold text-xs">{person.name.charAt(0)}</span>
                      </div>
                      <span className="text-stone-200 text-sm truncate">{person.name}</span>
                    </div>
                    <div className="flex items-center gap-4 sm:gap-6 text-sm">
                      <div className="text-right">
                        <p className="text-stone-500 text-xs">Cobrado</p>
                        <p className="text-stone-300">{formatCurrency(totalCredit)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-stone-500 text-xs">Pago</p>
                        <p className="text-green-400">{formatCurrency(totalPayment)}</p>
                      </div>
                      <div className="text-right min-w-[80px]">
                        <p className="text-stone-500 text-xs">Crédito</p>
                        <p className="text-green-400 font-semibold">{formatCurrency(Math.abs(balance))}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settled */}
          {settled.length > 0 && (
            <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-stone-800">
                <span className="w-2 h-2 rounded-full bg-stone-500" />
                <h2 className="text-amber-100 font-semibold">Quitados</h2>
                <span className="ml-auto text-stone-500 text-sm">{settled.length} pessoa{settled.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="divide-y divide-stone-800/50">
                {settled.map(({ person, totalCredit, totalPayment }) => (
                  <div key={person.id} className="flex flex-col sm:flex-row sm:items-center px-5 py-3 gap-3 hover:bg-stone-800/30 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center shrink-0">
                        <span className="text-stone-400 font-bold text-xs">{person.name.charAt(0)}</span>
                      </div>
                      <span className="text-stone-400 text-sm truncate">{person.name}</span>
                    </div>
                    <div className="flex items-center gap-4 sm:gap-6 text-sm">
                      <div className="text-right">
                        <p className="text-stone-600 text-xs">Cobrado</p>
                        <p className="text-stone-400">{formatCurrency(totalCredit)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-stone-600 text-xs">Pago</p>
                        <p className="text-stone-400">{formatCurrency(totalPayment)}</p>
                      </div>
                      <div className="text-right min-w-[80px]">
                        <p className="text-stone-600 text-xs">Saldo</p>
                        <p className="text-stone-500 font-semibold">Quitado</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.length === 0 && (
            <div className="text-center py-16">
              <p className="text-stone-400">Nenhum registro financeiro ainda.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
