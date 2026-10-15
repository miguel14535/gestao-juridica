import { useState } from 'react';
import { Scale, Lock, Eye, EyeOff } from 'lucide-react';
import type { AccessMode } from '@/types';

interface LoginProps {
  onLogin: (mode: AccessMode) => void;
}

const SIMPLE_PIN = '1234';
const COMPLEX_PIN = '4321';

export default function Login({ onLogin }: LoginProps) {
  const [selected, setSelected] = useState<AccessMode | null>(null);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    const correct = selected === 'simple' ? SIMPLE_PIN : COMPLEX_PIN;
    if (pin === correct) {
      onLogin(selected);
    } else {
      setError('Senha incorreta. Tente novamente.');
      setPin('');
    }
  }

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center px-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23C9A84C' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }} />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-700/20 border-2 border-amber-600/40 mb-4">
            <Scale className="w-10 h-10 text-amber-500" />
          </div>
          <h1 className="text-3xl font-bold text-amber-100 tracking-wide">
            GESTÃO JURÍDICA
          </h1>
          <p className="text-amber-600/70 text-sm mt-1 tracking-widest uppercase">
            Sistema de Controle
          </p>
        </div>

        {/* Card */}
        <div className="bg-stone-900 border border-amber-900/30 rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-8">
            {!selected ? (
              <>
                <h2 className="text-amber-200 text-lg font-semibold text-center mb-6">
                  Selecione o tipo de acesso
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setSelected('simple')}
                    className="group flex flex-col items-center p-6 rounded-xl border-2 border-amber-800/40 hover:border-amber-600 bg-stone-800/50 hover:bg-stone-800 transition-all duration-200"
                  >
                    <div className="w-12 h-12 rounded-full bg-amber-900/40 group-hover:bg-amber-800/60 flex items-center justify-center mb-3 transition-colors">
                      <Lock className="w-6 h-6 text-amber-500" />
                    </div>
                    <span className="text-amber-200 font-semibold">Simples</span>
                    <span className="text-stone-400 text-xs mt-1 text-center">Pagamentos e agenda</span>
                  </button>
                  <button
                    onClick={() => setSelected('complex')}
                    className="group flex flex-col items-center p-6 rounded-xl border-2 border-amber-800/40 hover:border-amber-600 bg-stone-800/50 hover:bg-stone-800 transition-all duration-200"
                  >
                    <div className="w-12 h-12 rounded-full bg-amber-900/40 group-hover:bg-amber-800/60 flex items-center justify-center mb-3 transition-colors">
                      <Scale className="w-6 h-6 text-amber-500" />
                    </div>
                    <span className="text-amber-200 font-semibold">Complexo</span>
                    <span className="text-stone-400 text-xs mt-1 text-center">Balanço completo</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => { setSelected(null); setPin(''); setError(''); }}
                  className="text-stone-400 hover:text-amber-400 text-sm mb-4 flex items-center gap-1 transition-colors"
                >
                  ← Voltar
                </button>
                <h2 className="text-amber-200 text-lg font-semibold mb-1">
                  Acesso {selected === 'simple' ? 'Simples' : 'Complexo'}
                </h2>
                <p className="text-stone-400 text-sm mb-6">Digite a senha de acesso</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative">
                    <input
                      type={showPin ? 'text' : 'password'}
                      value={pin}
                      onChange={e => { setPin(e.target.value); setError(''); }}
                      placeholder="••••"
                      className="w-full bg-stone-800 border border-stone-700 focus:border-amber-600 rounded-lg px-4 py-3 text-amber-100 placeholder-stone-500 outline-none transition-colors pr-10 text-center text-xl tracking-widest"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-amber-400 transition-colors"
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {error && (
                    <p className="text-red-400 text-sm text-center">{error}</p>
                  )}
                  <button
                    type="submit"
                    className="w-full bg-amber-700 hover:bg-amber-600 text-amber-50 font-semibold py-3 rounded-lg transition-colors duration-200"
                  >
                    Entrar
                  </button>
                </form>
                <p className="text-stone-600 text-xs text-center mt-4">
                  {selected === 'simple' ? 'Senha padrão: 1234' : 'Senha padrão: 4321'}
                </p>
              </>
            )}
          </div>
          <div className="bg-amber-900/10 border-t border-amber-900/20 px-8 py-3 text-center">
            <p className="text-stone-500 text-xs">Acesso simultâneo em múltiplos dispositivos</p>
          </div>
        </div>
      </div>
    </div>
  );
}
