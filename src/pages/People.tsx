import { useState, useEffect } from 'react';
import { UserPlus, Search, Pencil, Trash2, Phone, Mail, FileText, X, Check, Briefcase } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Person, PersonRole } from '@/types';
import { PERSON_ROLE_LABELS } from '@/types';

export default function People() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Person | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '', role: 'cliente' as PersonRole });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPeople();
  }, []);

  async function loadPeople() {
    setLoading(true);
    const { data, error } = await supabase
      .from('people')
      .select('*')
      .order('name', { ascending: true });
    if (!error && data) setPeople(data);
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    setForm({ name: '', phone: '', email: '', notes: '', role: 'cliente' });
    setError('');
    setShowForm(true);
  }

  function openEdit(p: Person) {
    setEditing(p);
    setForm({ name: p.name, phone: p.phone ?? '', email: p.email ?? '', notes: p.notes ?? '', role: p.role ?? 'cliente' });
    setError('');
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('O nome é obrigatório.'); return; }
    setSaving(true);
    setError('');
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      notes: form.notes.trim() || null,
      role: form.role,
    };
    let err;
    if (editing) {
      ({ error: err } = await supabase.from('people').update(payload).eq('id', editing.id));
    } else {
      ({ error: err } = await supabase.from('people').insert(payload));
    }
    setSaving(false);
    if (err) { setError('Erro ao salvar. Tente novamente.'); return; }
    setShowForm(false);
    loadPeople();
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    await supabase.from('people').delete().eq('id', id);
    setDeleting(null);
    loadPeople();
  }

  const filtered = people
    .filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.phone ?? '').includes(search) ||
      (p.email ?? '').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-amber-100">Pessoas</h1>
          <p className="text-stone-400 text-sm mt-0.5">{people.length} pessoa{people.length !== 1 ? 's' : ''} cadastrada{people.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-amber-700 hover:bg-amber-600 text-amber-50 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Nova Pessoa
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
        <input
          type="text"
          placeholder="Buscar por nome, telefone ou e-mail..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-stone-900 border border-stone-700 focus:border-amber-600 rounded-lg pl-10 pr-4 py-2.5 text-stone-200 placeholder-stone-500 outline-none transition-colors text-sm"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-stone-800 flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-8 h-8 text-stone-600" />
          </div>
          <p className="text-stone-400">{search ? 'Nenhuma pessoa encontrada.' : 'Nenhuma pessoa cadastrada ainda.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(person => (
            <div key={person.id} className="bg-stone-900 border border-stone-800 hover:border-amber-800/50 rounded-xl p-5 transition-all duration-200 group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-800/30 border border-amber-700/30 flex items-center justify-center shrink-0">
                    <span className="text-amber-400 font-bold text-sm">{person.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <h3 className="text-amber-100 font-semibold leading-tight">{person.name}</h3>
                    {person.role === 'gerente' && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[11px] bg-blue-900/30 border border-blue-700/40 text-blue-300 px-1.5 py-0.5 rounded">
                        <Briefcase className="w-3 h-3" />
                        Gerente
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(person)} className="p-1.5 rounded-lg text-stone-500 hover:text-amber-400 hover:bg-stone-800 transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(person.id)}
                    disabled={deleting === person.id}
                    className="p-1.5 rounded-lg text-stone-500 hover:text-red-400 hover:bg-stone-800 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                {person.phone && (
                  <div className="flex items-center gap-2 text-stone-400 text-sm">
                    <Phone className="w-3.5 h-3.5 shrink-0 text-stone-500" />
                    <span>{person.phone}</span>
                  </div>
                )}
                {person.email && (
                  <div className="flex items-center gap-2 text-stone-400 text-sm">
                    <Mail className="w-3.5 h-3.5 shrink-0 text-stone-500" />
                    <span className="truncate">{person.email}</span>
                  </div>
                )}
                {person.notes && (
                  <div className="flex items-start gap-2 text-stone-500 text-xs mt-2">
                    <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5 text-stone-600" />
                    <span className="line-clamp-2">{person.notes}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-stone-900 border border-amber-900/30 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-stone-800">
              <h2 className="text-amber-100 font-semibold text-lg">
                {editing ? 'Editar Pessoa' : 'Nova Pessoa'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-stone-500 hover:text-amber-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="text-stone-400 text-sm mb-1.5 block">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, role: 'cliente' }))}
                    className={`py-2.5 rounded-lg text-sm font-medium border transition-all ${form.role === 'cliente' ? 'bg-amber-700/30 border-amber-600/50 text-amber-300' : 'border-stone-700 text-stone-400 hover:border-stone-600'}`}
                  >
                    {PERSON_ROLE_LABELS.cliente}
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, role: 'gerente' }))}
                    className={`py-2.5 rounded-lg text-sm font-medium border transition-all ${form.role === 'gerente' ? 'bg-blue-700/30 border-blue-600/50 text-blue-300' : 'border-stone-700 text-stone-400 hover:border-stone-600'}`}
                  >
                    {PERSON_ROLE_LABELS.gerente}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-stone-400 text-sm mb-1.5 block">Nome *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-stone-800 border border-stone-700 focus:border-amber-600 rounded-lg px-4 py-2.5 text-stone-200 outline-none transition-colors text-sm"
                  placeholder="Nome completo"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-stone-400 text-sm mb-1.5 block">WhatsApp / Telefone</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full bg-stone-800 border border-stone-700 focus:border-amber-600 rounded-lg px-4 py-2.5 text-stone-200 outline-none transition-colors text-sm"
                  placeholder="(00) 90000-0000"
                />
              </div>
              <div>
                <label className="text-stone-400 text-sm mb-1.5 block">E-mail</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full bg-stone-800 border border-stone-700 focus:border-amber-600 rounded-lg px-4 py-2.5 text-stone-200 outline-none transition-colors text-sm"
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <label className="text-stone-400 text-sm mb-1.5 block">Observações</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="w-full bg-stone-800 border border-stone-700 focus:border-amber-600 rounded-lg px-4 py-2.5 text-stone-200 outline-none transition-colors text-sm resize-none"
                  placeholder="Anotações sobre a pessoa..."
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-lg border border-stone-700 text-stone-400 hover:text-stone-200 text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-amber-700 hover:bg-amber-600 text-amber-50 font-medium text-sm transition-colors disabled:opacity-60"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-amber-200 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
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
