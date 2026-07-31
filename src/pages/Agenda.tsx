import { useState, useEffect } from 'react';
import { Plus, X, Check, MessageCircle, ChevronLeft, ChevronRight, Calendar as CalIcon, Bell, Briefcase } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Person, Appointment } from '@/types';

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const WEEKDAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

function formatDate(d: string) {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function formatTime(t: string | null) {
  if (!t) return '';
  return t.slice(0, 5);
}

function relativeDayLabel(date: string) {
  const t = getToday();
  const tm = getTomorrow();
  if (date === t) return 'hoje';
  if (date === tm) return `amanhã (${formatDate(date)})`;
  return `no dia ${formatDate(date)}`;
}

function buildWALink(phone: string, name: string, title: string, date: string, time: string | null) {
  const clean = phone.replace(/\D/g, '');
  const number = clean.startsWith('55') ? clean : `55${clean}`;
  const timeStr = time ? ` às ${formatTime(time)}` : '';
  const text = encodeURIComponent(
    `Olá ${name}, lembrando que ${relativeDayLabel(date)}${timeStr} temos: "${title}". Até lá!`
  );
  return `https://wa.me/${number}?text=${text}`;
}

function buildManagerWALink(phone: string, managerName: string, clientName: string | null, title: string, date: string, time: string | null) {
  const clean = phone.replace(/\D/g, '');
  const number = clean.startsWith('55') ? clean : `55${clean}`;
  const timeStr = time ? ` às ${formatTime(time)}` : '';
  const withClient = clientName ? ` com ${clientName}` : '';
  const text = encodeURIComponent(
    `Olá ${managerName}, você foi designado(a) para conduzir a reunião "${title}"${withClient}, ${relativeDayLabel(date)}${timeStr}. Por favor confirme sua disponibilidade.`
  );
  return `https://wa.me/${number}?text=${text}`;
}

function getTomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function getWeekDays(base: string) {
  const [y, m, d] = base.split('-').map(Number);
  const baseDate = new Date(Date.UTC(y, m - 1, d));
  const weekday = baseDate.getUTCDay(); // 0 = domingo
  const sunday = new Date(baseDate);
  sunday.setUTCDate(baseDate.getUTCDate() - weekday);

  return Array.from({ length: 7 }).map((_, i) => {
    const day = new Date(sunday);
    day.setUTCDate(sunday.getUTCDate() + i);
    return day.toISOString().split('T')[0];
  });
}

function workloadInfo(count: number) {
  if (count === 0) return { label: 'Livre', color: 'text-stone-500', bar: 'bg-stone-700' };
  if (count <= 2) return { label: 'Tranquilo', color: 'text-green-400', bar: 'bg-green-600' };
  if (count <= 4) return { label: 'Moderado', color: 'text-amber-400', bar: 'bg-amber-600' };
  return { label: 'Cheio', color: 'text-red-400', bar: 'bg-red-600' };
}

export default function Agenda() {
  const [people, setPeople] = useState<Person[]>([]);
  const [appointments, setAppointments] = useState<(Appointment & { people: Person | null; manager: Person | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [form, setForm] = useState({
    person_id: '',
    manager_id: '',
    title: '',
    description: '',
    appointment_date: new Date().toISOString().split('T')[0],
    appointment_time: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const tomorrow = getTomorrow();
  const today = getToday();
  const clients = people.filter(p => p.role !== 'gerente');
  const managers = people.filter(p => p.role === 'gerente');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [{ data: ppl }, { data: appts }] = await Promise.all([
      supabase.from('people').select('*').order('name'),
      supabase.from('appointments')
        .select('*, people(*), manager(*)')
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true }),
    ]);
    if (ppl) setPeople(ppl);
    if (appts) setAppointments(appts as (Appointment & { people: Person | null; manager: Person | null })[]);
    setLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError('O título é obrigatório.'); return; }
    if (!form.appointment_date) { setError('A data é obrigatória.'); return; }
    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('appointments').insert({
      person_id: form.person_id || null,
      manager_id: form.manager_id || null,
      title: form.title.trim(),
      description: form.description.trim() || null,
      appointment_date: form.appointment_date,
      appointment_time: form.appointment_time || null,
    });
    setSaving(false);
    if (err) { setError('Erro ao salvar.'); return; }
    setShowForm(false);
    setForm({ person_id: '', manager_id: '', title: '', description: '', appointment_date: new Date().toISOString().split('T')[0], appointment_time: '' });
    loadData();
  }

  async function handleDelete(id: string) {
    await supabase.from('appointments').delete().eq('id', id);
    loadData();
  }

  // Calendar helpers
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  const appointmentDates = new Set(
    appointments.map(a => a.appointment_date)
  );

  function prevMonth() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  }

  function dateKey(day: number) {
    return `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  const tomorrowAppts = appointments.filter(a => a.appointment_date === tomorrow);
  const selectedAppts = selectedDate ? appointments.filter(a => a.appointment_date === selectedDate) : [];
  const upcomingAppts = appointments.filter(a => a.appointment_date >= today);

  const weekDays = getWeekDays(today);
  const weekAppointments = weekDays.map(date => ({
    date,
    items: appointments.filter(a => a.appointment_date === date),
  }));
  const weekTotal = weekAppointments.reduce((sum, d) => sum + d.items.length, 0);
  const busiestDay = weekAppointments.reduce(
    (max, d) => (d.items.length > max.items.length ? d : max),
    weekAppointments[0]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-amber-100">Agenda</h1>
          <p className="text-stone-400 text-sm mt-0.5">Compromissos e reuniões</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-amber-700 hover:bg-amber-600 text-amber-50 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Compromisso
        </button>
      </div>

      {/* Tomorrow's reminders */}
      {tomorrowAppts.length > 0 && (
        <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-amber-400" />
            <span className="text-amber-300 font-semibold text-sm">
              {tomorrowAppts.length} compromisso{tomorrowAppts.length !== 1 ? 's' : ''} amanhã
            </span>
          </div>
          <div className="space-y-2">
            {tomorrowAppts.map(appt => (
              <div key={appt.id} className="flex items-center justify-between bg-amber-900/20 rounded-lg px-3 py-2.5 gap-2">
                <div className="min-w-0">
                  <p className="text-amber-100 text-sm font-medium truncate">{appt.title}</p>
                  <p className="text-amber-600/70 text-xs">
                    {appt.people?.name ?? 'Sem pessoa'}
                    {appt.appointment_time ? ` · ${formatTime(appt.appointment_time)}` : ''}
                  </p>
                  {appt.manager && (
                    <p className="text-blue-400/70 text-xs flex items-center gap-1 mt-0.5">
                      <Briefcase className="w-3 h-3" />
                      Gerente: {appt.manager.name}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {appt.people?.phone && (
                    <a
                      href={buildWALink(appt.people.phone, appt.people.name, appt.title, appt.appointment_date, appt.appointment_time)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Avisar cliente"
                      className="flex items-center gap-1.5 bg-green-700/30 hover:bg-green-700/50 border border-green-700/40 text-green-400 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Cliente
                    </a>
                  )}
                  {appt.manager?.phone && (
                    <a
                      href={buildManagerWALink(appt.manager.phone, appt.manager.name, appt.people?.name ?? null, appt.title, appt.appointment_date, appt.appointment_time)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Avisar gerente"
                      className="flex items-center gap-1.5 bg-blue-700/30 hover:bg-blue-700/50 border border-blue-700/40 text-blue-300 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    >
                      <Briefcase className="w-3.5 h-3.5" />
                      Gerente
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resumo da semana */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-amber-100 font-semibold flex items-center gap-2">
            <CalIcon className="w-4 h-4 text-amber-500" />
            Resumo da Semana
          </h3>
          <span className="text-stone-400 text-sm">
            {weekTotal === 0
              ? 'Nenhum compromisso esta semana'
              : `${weekTotal} compromisso${weekTotal !== 1 ? 's' : ''} esta semana`}
          </span>
        </div>

        {weekTotal > 0 && busiestDay.items.length >= 3 && (
          <div className="mb-4 bg-amber-900/20 border border-amber-700/30 rounded-lg px-3 py-2 text-sm text-amber-300">
            Atenção: {WEEKDAYS[new Date(busiestDay.date + 'T00:00:00').getDay()]} está com {busiestDay.items.length} compromissos marcados — o dia mais cheio da semana.
          </div>
        )}

        <div className="grid grid-cols-7 gap-2">
          {weekAppointments.map(({ date, items }) => {
            const info = workloadInfo(items.length);
            const isToday = date === today;
            const weekdayIdx = new Date(date + 'T00:00:00').getDay();
            const [, , dayNum] = date.split('-');
            return (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={`flex flex-col items-center gap-1 rounded-lg py-3 border transition-colors ${
                  isToday ? 'border-amber-600/60 bg-amber-900/10' : 'border-stone-800 hover:border-stone-700'
                }`}
              >
                <span className="text-stone-500 text-[11px]">{WEEKDAYS[weekdayIdx]}</span>
                <span className={`text-sm font-semibold ${isToday ? 'text-amber-300' : 'text-stone-300'}`}>{dayNum}</span>
                <span className={`text-xs font-medium ${info.color}`}>{items.length}</span>
                <span className={`w-8 h-1 rounded-full ${info.bar}`} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-3 bg-stone-900 border border-stone-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <button onClick={prevMonth} className="p-1.5 rounded-lg text-stone-400 hover:text-amber-300 hover:bg-stone-800 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="text-amber-100 font-semibold">
              {MONTHS[calMonth]} {calYear}
            </h3>
            <button onClick={nextMonth} className="p-1.5 rounded-lg text-stone-400 hover:text-amber-300 hover:bg-stone-800 transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-2">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-stone-500 text-xs font-medium py-1">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const key = dateKey(day);
              const isToday = key === today;
              const haAppt = appointmentDates.has(key);
              const isSelected = selectedDate === key;
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(isSelected ? null : key)}
                  className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-sm font-medium transition-all ${
                    isSelected
                      ? 'bg-amber-700 text-amber-50'
                      : isToday
                      ? 'bg-amber-900/40 text-amber-300 border border-amber-700/50'
                      : 'text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  {day}
                  {haAppt && (
                    <div className={`absolute bottom-1 w-1 h-1 rounded-full ${isSelected ? 'bg-amber-200' : 'bg-amber-500'}`} />
                  )}
                </button>
              );
            })}
          </div>

          {selectedDate && (
            <div className="mt-4 border-t border-stone-800 pt-4">
              <p className="text-stone-400 text-sm mb-2">
                <span className="text-amber-300 font-medium">{formatDate(selectedDate)}</span>
                {selectedAppts.length === 0 ? ' — sem compromissos' : ` — ${selectedAppts.length} compromisso${selectedAppts.length !== 1 ? 's' : ''}`}
              </p>
              {selectedAppts.map(appt => (
                <div key={appt.id} className="bg-stone-800/50 rounded-lg px-3 py-2 mb-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-stone-200 text-sm font-medium truncate">{appt.title}</p>
                    <p className="text-stone-500 text-xs">
                      {appt.people?.name ?? 'Sem pessoa'}
                      {appt.appointment_time ? ` · ${formatTime(appt.appointment_time)}` : ''}
                    </p>
                    {appt.manager && (
                      <p className="text-blue-400/80 text-xs flex items-center gap-1 mt-0.5">
                        <Briefcase className="w-3 h-3" />
                        {appt.manager.name}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {appt.people?.phone && (
                      <a
                        href={buildWALink(appt.people.phone, appt.people.name, appt.title, appt.appointment_date, appt.appointment_time)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded text-stone-500 hover:text-green-400 hover:bg-stone-800 transition-colors"
                        title="Avisar cliente"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {appt.manager?.phone && (
                      <a
                        href={buildManagerWALink(appt.manager.phone, appt.manager.name, appt.people?.name ?? null, appt.title, appt.appointment_date, appt.appointment_time)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded text-stone-500 hover:text-blue-400 hover:bg-stone-800 transition-colors"
                        title="Avisar gerente"
                      >
                        <Briefcase className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button onClick={() => handleDelete(appt.id)} className="p-1.5 rounded text-stone-500 hover:text-red-400 hover:bg-stone-800 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={() => {
                  setForm(f => ({ ...f, appointment_date: selectedDate }));
                  setShowForm(true);
                }}
                className="text-amber-600 hover:text-amber-400 text-sm flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar nesta data
              </button>
            </div>
          )}
        </div>

        {/* Upcoming list */}
        <div className="lg:col-span-2 bg-stone-900 border border-stone-800 rounded-xl p-5">
          <h3 className="text-amber-100 font-semibold mb-4 flex items-center gap-2">
            <CalIcon className="w-4 h-4 text-amber-500" />
            Próximos compromissos
          </h3>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : upcomingAppts.length === 0 ? (
            <p className="text-stone-500 text-sm">Nenhum compromisso agendado.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {upcomingAppts.map(appt => {
                const isTomorrow = appt.appointment_date === tomorrow;
                const isApptToday = appt.appointment_date === today;
                return (
                  <div key={appt.id} className={`rounded-lg px-3 py-2.5 border transition-colors group ${
                    isApptToday ? 'bg-amber-900/20 border-amber-700/30' :
                    isTomorrow ? 'bg-blue-900/20 border-blue-700/30' :
                    'bg-stone-800/50 border-stone-700/30'
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-stone-200 text-sm font-medium leading-tight truncate">{appt.title}</p>
                        <p className="text-stone-500 text-xs mt-0.5">
                          {isApptToday ? 'Hoje' : isTomorrow ? 'Amanhã' : formatDate(appt.appointment_date)}
                          {appt.appointment_time ? ` · ${formatTime(appt.appointment_time)}` : ''}
                        </p>
                        {appt.people && (
                          <p className="text-stone-600 text-xs mt-0.5 truncate">{appt.people.name}</p>
                        )}
                        {appt.manager && (
                          <p className="text-blue-400/80 text-xs mt-0.5 truncate flex items-center gap-1">
                            <Briefcase className="w-3 h-3" />
                            {appt.manager.name}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {appt.people?.phone && (
                          <a
                            href={buildWALink(appt.people.phone, appt.people.name, appt.title, appt.appointment_date, appt.appointment_time)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded text-stone-600 hover:text-green-400 transition-colors"
                            title="Avisar cliente"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {appt.manager?.phone && (
                          <a
                            href={buildManagerWALink(appt.manager.phone, appt.manager.name, appt.people?.name ?? null, appt.title, appt.appointment_date, appt.appointment_time)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded text-stone-600 hover:text-blue-400 transition-colors"
                            title="Avisar gerente"
                          >
                            <Briefcase className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button onClick={() => handleDelete(appt.id)} className="p-1 rounded text-stone-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-stone-900 border border-amber-900/30 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-stone-800">
              <h2 className="text-amber-100 font-semibold text-lg">Novo Compromisso</h2>
              <button onClick={() => setShowForm(false)} className="text-stone-500 hover:text-amber-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="text-stone-400 text-sm mb-1.5 block">Título *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full bg-stone-800 border border-stone-700 focus:border-amber-600 rounded-lg px-4 py-2.5 text-stone-200 outline-none transition-colors text-sm"
                  placeholder="Ex: Reunião com cliente, Audiência..."
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-400 text-sm mb-1.5 block">Data *</label>
                  <input
                    type="date"
                    value={form.appointment_date}
                    onChange={e => setForm(f => ({ ...f, appointment_date: e.target.value }))}
                    className="w-full bg-stone-800 border border-stone-700 focus:border-amber-600 rounded-lg px-4 py-2.5 text-stone-200 outline-none transition-colors text-sm"
                  />
                </div>
                <div>
                  <label className="text-stone-400 text-sm mb-1.5 block">Hora</label>
                  <input
                    type="time"
                    value={form.appointment_time}
                    onChange={e => setForm(f => ({ ...f, appointment_time: e.target.value }))}
                    className="w-full bg-stone-800 border border-stone-700 focus:border-amber-600 rounded-lg px-4 py-2.5 text-stone-200 outline-none transition-colors text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-stone-400 text-sm mb-1.5 block">Cliente (opcional)</label>
                <select
                  value={form.person_id}
                  onChange={e => setForm(f => ({ ...f, person_id: e.target.value }))}
                  className="w-full bg-stone-800 border border-stone-700 focus:border-amber-600 rounded-lg px-4 py-2.5 text-stone-200 outline-none transition-colors text-sm"
                >
                  <option value="">Sem cliente vinculado</option>
                  {clients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-stone-400 text-sm mb-1.5 block">Gerente responsável (opcional)</label>
                <select
                  value={form.manager_id}
                  onChange={e => setForm(f => ({ ...f, manager_id: e.target.value }))}
                  className="w-full bg-stone-800 border border-stone-700 focus:border-amber-600 rounded-lg px-4 py-2.5 text-stone-200 outline-none transition-colors text-sm"
                >
                  <option value="">Sem gerente vinculado</option>
                  {managers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                {managers.length === 0 && (
                  <p className="text-stone-500 text-xs mt-1.5">
                    Nenhum gerente cadastrado ainda. Cadastre um em "Pessoas" marcando o tipo "Gerente".
                  </p>
                )}
              </div>
              <div>
                <label className="text-stone-400 text-sm mb-1.5 block">Descrição</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full bg-stone-800 border border-stone-700 focus:border-amber-600 rounded-lg px-4 py-2.5 text-stone-200 outline-none transition-colors text-sm resize-none"
                  placeholder="Detalhes adicionais..."
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-lg border border-stone-700 text-stone-400 text-sm transition-colors hover:border-stone-600">Cancelar</button>
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
