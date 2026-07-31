import { useState, useEffect } from 'react';
import { AlertTriangle, MessageCircle, RefreshCw, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Person, FinancialRecord } from '@/types';

interface PersonBalance {
  person: Person;
  balance: number;
  lastRecord: string | null;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function buildWhatsAppLink(phone: string, name: string, amount: number) {
  const clean = phone.replace(/\D/g, '');
  const number = clean.startsWith('55') ? clean : `55${clean}`;
  const text = encodeURIComponent(
    `Olá ${name}, passando para informar que há um saldo pendente de ${formatCurrency(amount)} em aberto. Por favor, entre em contato para regularizar. Obrigado!`
  );
  return `https://wa.me/${number}?text=${text}`;
}

export default function Alerts() {
  const [debtors, setDebtors] = useState<PersonBalance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
  }, []);

  async function loadAlerts() {
    setLoading(true);
    const [{ data: people }, { data: records }] = await Promise.all([
      supabase.from('people').select('*').order('name'),
      supabase.from('financial_records').select('*'),
    ]);

    if (!people || !records) { setLoading(false); return; }

    const balances: PersonBalance[] = people
      .map(person => {
        const personRecords = (records as FinancialRecord[]).filter(r => r.person_id === person.id);
        const totalCredit = personRecords.filter(r => r.type === 'credit').reduce((s, r) => s + Number(r.amount), 0);
        const totalPayment = personRecords.filter(r => r.type === 'payment').reduce((s, r) => s + Number(r.amount), 0);
        const balance = totalCredit - totalPayment;
        const sorted = [...personRecords].sort((a, b) => b.date.localeCompare(a.date));
        return { person, balance, lastRecord: sorted[0]?.date ?? null };
      })
      .filter(b => b.balance > 0.01)
      .sort((a, b) => b.balance - a.balance);

    setDebtors(balances);
    setLoading(false);
  }

  const totalDebt = debtors.reduce((s, d) => s + d.balance, 0);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-amber-100">Alertas</h1>
          <p className="text-stone-400 text-sm mt-0.5">Pessoas com valores em aberto</p>
        </div>
        <button
          onClick={loadAlerts}
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
      ) : debtors.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-green-900/20 border border-green-700/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <p className="text-stone-300 font-medium">Tudo em dia!</p>
          <p className="text-stone-500 text-sm mt-1">Nenhuma pessoa com saldo devedor.</p>
        </div>
      ) : (
        <>
          {/* Summary banner */}
          <div className="bg-red-900/20 border border-red-800/30 rounded-xl p-4 mb-6 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-red-800/30 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-red-300 font-semibold">
                {debtors.length} pessoa{debtors.length !== 1 ? 's' : ''} com saldo em aberto
              </p>
              <p className="text-red-400/70 text-sm">
                Total a receber: <span className="font-bold text-red-300">{formatCurrency(totalDebt)}</span>
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {debtors.map(({ person, balance, lastRecord }) => (
              <div key={person.id} className="bg-stone-900 border border-stone-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-red-900/30 border border-red-700/30 flex items-center justify-center">
                      <span className="text-red-300 font-bold text-sm">{person.name.charAt(0)}</span>
                    </div>
                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-stone-900" />
                  </div>
                  <div>
                    <p className="text-amber-100 font-medium">{person.name}</p>
                    {lastRecord && (
                      <p className="text-stone-500 text-xs">
                        Último registro: {lastRecord.split('-').reverse().join('/')}
                      </p>
                    )}
                    {person.phone && (
                      <p className="text-stone-500 text-xs">{person.phone}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-stone-500 text-xs mb-0.5">Valor em aberto</p>
                    <p className="text-red-400 font-bold text-lg">{formatCurrency(balance)}</p>
                  </div>
                  {person.phone ? (
                    <a
                      href={buildWhatsAppLink(person.phone, person.name, balance)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-green-700/30 hover:bg-green-700/50 border border-green-700/40 text-green-400 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </a>
                  ) : (
                    <div className="text-stone-600 text-xs italic">Sem telefone</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
