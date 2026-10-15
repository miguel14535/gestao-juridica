import { useState } from 'react';
import { Scale, Users, CreditCard, Bell, Calendar, BarChart3, LogOut, Menu, X, Wallet, ReceiptText } from 'lucide-react';
import type { AccessMode } from '@/types';

interface LayoutProps {
  mode: AccessMode;
  onLogout: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
}

const simpleTabs = [
  { id: 'people', label: 'Pessoas', icon: Users },
  { id: 'payments', label: 'Pagamentos', icon: CreditCard },
  { id: 'alerts', label: 'Alertas', icon: Bell },
  { id: 'agenda', label: 'Agenda', icon: Calendar },
  { id: 'expenses', label: 'Gastos Fixos', icon: Wallet },
  { id: 'variable-expenses', label: 'Gastos Variáveis', icon: ReceiptText },
];

const complexTabs = [
  ...simpleTabs,
  { id: 'balance', label: 'Balanço', icon: BarChart3 },
];

export default function Layout({ mode, onLogout, activeTab, onTabChange, children }: LayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const tabs = mode === 'complex' ? complexTabs : simpleTabs;

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col">
      {/* Top bar */}
      <header className="bg-stone-900 border-b border-amber-900/30 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-700/30 border border-amber-600/40 flex items-center justify-center">
              <Scale className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <span className="text-amber-100 font-bold text-lg tracking-wide">GESTÃO JURÍDICA</span>
              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full border ${
                mode === 'complex'
                  ? 'bg-amber-700/20 border-amber-600/40 text-amber-400'
                  : 'bg-stone-700/40 border-stone-600/40 text-stone-400'
              }`}>
                {mode === 'complex' ? 'Complexo' : 'Simples'}
              </span>
            </div>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                    activeTab === tab.id
                      ? 'bg-amber-700/30 text-amber-300 border border-amber-700/40'
                      : 'text-stone-400 hover:text-amber-300 hover:bg-stone-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={onLogout}
              className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg text-stone-400 hover:text-amber-300 hover:bg-stone-800 text-sm transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg text-stone-400 hover:text-amber-300 hover:bg-stone-800 transition-colors"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-amber-900/20 bg-stone-900 px-4 py-3 space-y-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => { onTabChange(tab.id); setMobileOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 ${
                    activeTab === tab.id
                      ? 'bg-amber-700/30 text-amber-300 border border-amber-700/40'
                      : 'text-stone-400 hover:text-amber-300 hover:bg-stone-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-stone-400 hover:text-amber-300 text-sm transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        )}
      </header>

      {/* Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
