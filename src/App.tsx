import { useState } from 'react';
import Login from '@/components/Login';
import Layout from '@/components/Layout';
import People from '@/pages/People';
import Payments from '@/pages/Payments';
import Alerts from '@/pages/Alerts';
import Agenda from '@/pages/Agenda';
import Balance from '@/pages/Balance';
import FixedExpenses from '@/pages/FixedExpense';
import type { AccessMode } from '@/types';

export default function App() {
  const [mode, setMode] = useState<AccessMode | null>(null);
  const [activeTab, setActiveTab] = useState('people');

  if (!mode) {
    return <Login onLogin={(m) => { setMode(m); setActiveTab('people'); }} />;
  }

  function renderPage() {
    switch (activeTab) {
      case 'people': return <People />;
      case 'payments': return <Payments mode={mode!} />;
      case 'alerts': return <Alerts />;
      case 'agenda': return <Agenda />;
      case 'expenses': return <FixedExpenses />;
      case 'balance': return mode === 'complex' ? <Balance /> : null;
      default: return <People />;
    }
  }

  return (
    <Layout mode={mode} onLogout={() => setMode(null)} activeTab={activeTab} onTabChange={setActiveTab}>
      {renderPage()}
    </Layout>
  );
}
