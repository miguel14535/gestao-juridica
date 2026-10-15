import { useState } from 'react';
import { Scale, Lock, ShieldAlert } from 'lucide-react';
import type { AccessMode } from '@/types';

interface LoginProps { onLogin: (mode: AccessMode) => void; }

// HOMOLOGAÇÃO: não é login nem autorização real. Nenhum segredo é utilizado.
export default function Login({ onLogin }: LoginProps) {
  const [selected, setSelected] = useState<AccessMode | null>(null);
  return (
    <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center px-4">
      <div className="absolute inset-0 opacity-5" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 24v12M24 30h12' stroke='%23C9A84C' stroke-width='1'/%3E%3C/svg%3E")` }} />
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-700/20 border-2 border-amber-600/40 mb-4"><Scale className="w-10 h-10 text-amber-500" /></div>
          <h1 className="text-3xl font-bold text-amber-100">GESTÃO JURÍDICA</h1>
          <p className="text-amber-600 text-sm mt-1 tracking-widest uppercase">Sistema de Controle</p>
        </div>
        <div className="bg-amber-950/30 border border-amber-600/50 rounded-xl p-4 mb-5 flex items-start gap-3">
          <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0" />
          <p className="text-amber-100 text-sm"><strong>AMBIENTE DE DEMONSTRAÇÃO</strong><span className="block mt-1 text-stone-300">Todos os nomes e valores são fictícios. Nenhum acesso ao banco do cliente. Os dados de teste ficam neste navegador.</span></p>
        </div>
        <div className="bg-stone-900 border border-amber-900/40 rounded-2xl shadow-xl p-8">
          <h2 className="text-amber-200 text-lg font-semibold text-center mb-2">Escolha o modo para testar</h2>
          <p className="text-stone-400 text-xs text-center mb-6">O acesso abaixo é livre apenas nesta demonstração. A versão real exigirá login autenticado.</p>
          <div className="grid grid-cols-2 gap-4">
            <button type="button" onClick={() => setSelected('simple')} className={`group flex flex-col items-center p-6 rounded-xl border-2 ${selected === 'simple' ? 'border-amber-400 bg-amber-900/20' : 'border-amber-800/40 bg-stone-800/50'} hover:border-amber-500 transition-colors`}><Lock className="w-6 h-6 text-amber-500 mb-3" /><span className="text-amber-200 font-semibold">Simples</span><span className="text-stone-400 text-xs mt-1">Pagamentos e agenda</span></button>
            <button type="button" onClick={() => setSelected('complex')} className={`group flex flex-col items-center p-6 rounded-xl border-2 ${selected === 'complex' ? 'border-amber-400 bg-amber-900/20' : 'border-amber-800/40 bg-stone-800/50'} hover:border-amber-500 transition-colors`}><Scale className="w-6 h-6 text-amber-500 mb-3" /><span className="text-amber-200 font-semibold">Complexo</span><span className="text-stone-400 text-xs mt-1">Balanço completo</span></button>
          </div>
          <button type="button" disabled={!selected} onClick={() => selected && onLogin(selected)} className="mt-6 w-full bg-amber-700 hover:bg-amber-600 disabled:bg-stone-700 disabled:text-stone-400 text-amber-50 font-semibold py-3 rounded-lg transition-colors">Entrar na demonstração</button>
        </div>
      </div>
    </div>
  );
}
