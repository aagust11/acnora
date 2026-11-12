import React, { useState } from 'react';
import { LocalDatabase, TimeEntry, Project, Client, Task } from '../types';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Eye, Clock } from 'lucide-react';
import { formatDuration, getWeeksInMonth, formatDate, parseDate } from '../utils/timeUtils';

interface CalendarViewProps {
  db: LocalDatabase;
  onAddEntry: (entry: TimeEntry) => void;
  onUpdateEntry: (entry: TimeEntry) => void;
  onDeleteEntry: (id: string) => void;
}

const CATALAN_MONTHS = [
  'Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny',
  'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre'
];

const CATALAN_WEEKDAYS = ['Dll', 'Dmt', 'Dmc', 'Djs', 'Dvv', 'Dss', 'Dmg'];

export default function CalendarView({ db, onAddEntry, onUpdateEntry, onDeleteEntry }: CalendarViewProps) {
  const { timeEntries, projects, clients, tasks } = db;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  // Quick edit modal state
  const [selectedEntry, setSelectedEntry] = useState<TimeEntry | null>(null);
  const [quickAddDate, setQuickAddDate] = useState<string | null>(null);

  // Form states for adding/editing popups
  const [formClientId, setFormClientId] = useState('');
  const [formProjectId, setFormProjectId] = useState('');
  const [formTaskId, setFormTaskId] = useState('');
  const [formHoraInici, setFormHoraInici] = useState('09:00');
  const [formHoraFi, setFormHoraFi] = useState('12:00');
  const [formDesc, setFormDesc] = useState('');
  const [formFacturable, setFormFacturable] = useState(true);
  const [formTarifa, setFormTarifa] = useState(db.settings.defaultHourlyRate || 45);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Navigation handlers
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() - 1);
    } else {
      next.setDate(next.getDate() - 7);
    }
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() + 1);
    } else {
      next.setDate(next.getDate() + 7);
    }
    setCurrentDate(next);
  };

  const startNewAdd = (dateStr: string) => {
    setQuickAddDate(dateStr);
    setSelectedEntry(null);
    setFormClientId('');
    setFormProjectId('');
    setFormTaskId('');
    setFormHoraInici('09:00');
    setFormHoraFi('12:00');
    setFormDesc('');
    setFormFacturable(true);
    setFormTarifa(db.settings.defaultHourlyRate || 45);
  };

  const startExistingEdit = (entry: TimeEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEntry(entry);
    setQuickAddDate(null);
    setFormClientId(entry.clientId);
    setFormProjectId(entry.projecteId);
    setFormTaskId(entry.tascaId || '');
    setFormHoraInici(entry.horaInici);
    setFormHoraFi(entry.horaFi || '');
    setFormDesc(entry.descripcio);
    setFormFacturable(entry.facturable);
    setFormTarifa(entry.tarifaHorariaAplicada || 0);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClientId || !formProjectId) {
      alert('Tria un client i projecte vàlid.');
      return;
    }

    const [sh, sm] = formHoraInici.split(':').map(Number);
    const [eh, em] = (formHoraFi || '00:00').split(':').map(Number);
    const calculatedMinutes = (eh * 60 + em) - (sh * 60 + sm);

    if (calculatedMinutes < 0) {
      alert('L’hora de fi és anterior a la d’inici.');
      return;
    }

    const commitedImport = formFacturable ? (calculatedMinutes / 60) * formTarifa : 0;

    if (selectedEntry) {
      // Edit
      const updated: TimeEntry = {
        ...selectedEntry,
        clientId: formClientId,
        projecteId: formProjectId,
        tascaId: formTaskId ? formTaskId : undefined,
        horaInici: formHoraInici,
        horaFi: formHoraFi,
        duradaMinuts: calculatedMinutes,
        facturable: formFacturable,
        tarifaHorariaAplicada: formFacturable ? Number(formTarifa) : 0,
        importCalculat: Number(commitedImport.toFixed(2)),
        descripcio: formDesc,
        dataModificacio: new Date().toISOString()
      };
      
      onUpdateEntry(updated);
    } else if (quickAddDate) {
      // Add
      const added: TimeEntry = {
        id: `e-${Date.now()}`,
        clientId: formClientId,
        projecteId: formProjectId,
        tascaId: formTaskId ? formTaskId : undefined,
        data: quickAddDate,
        horaInici: formHoraInici,
        horaFi: formHoraFi,
        duradaMinuts: calculatedMinutes,
        facturable: formFacturable,
        tarifaHorariaAplicada: formFacturable ? Number(formTarifa) : 0,
        importCalculat: Number(commitedImport.toFixed(2)),
        descripcio: formDesc || 'Sessió manual del calendari',
        notes: '',
        origen: 'manual',
        estat: 'correcte',
        dataCreacio: new Date().toISOString(),
        dataModificacio: new Date().toISOString()
      };
      onAddEntry(added);
    }

    setSelectedEntry(null);
    setQuickAddDate(null);
  };

  const handleDeleteModal = () => {
    if (selectedEntry && window.confirm('Estàs segur que vols eliminar aquest registre de temps?')) {
      onDeleteEntry(selectedEntry.id);
      setSelectedEntry(null);
    }
  };

  // ---------------------------------------------------------------------------
  // MONTH CALCULATOR (Standard 35-42 days grid)
  // ---------------------------------------------------------------------------
  const getMonthDaysGrid = () => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // Sunday=0, Monday=1
    // Adjust first index so Monday is 0, Sunday is 6
    const adjustedFirstIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();

    const grid = [];

    // Prior Month Fill
    for (let i = adjustedFirstIndex - 1; i >= 0; i--) {
      const prevDate = new Date(year, month - 1, daysInPrevMonth - i);
      grid.push({ date: prevDate, isCurrentMonth: false });
    }

    // Current Month Fill
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      const currDate = new Date(year, month, i);
      grid.push({ date: currDate, isCurrentMonth: true });
    }

    // Next Month Fill
    const remainingCells = 42 - grid.length;
    for (let i = 1; i <= remainingCells; i++) {
      const nextDate = new Date(year, month + 1, i);
      grid.push({ date: nextDate, isCurrentMonth: false });
    }

    return grid;
  };

  // ---------------------------------------------------------------------------
  // WEEK CALCULATOR (7 days starting from Monday)
  // ---------------------------------------------------------------------------
  const getWeekDaysGrid = () => {
    const weekGrid = [];
    const tempDate = new Date(currentDate);
    const day = tempDate.getDay();
    // Monday offset adjustment
    const diff = tempDate.getDate() - (day === 0 ? 6 : day - 1);
    const monday = new Date(tempDate.setDate(diff));

    for (let i = 0; i < 7; i++) {
      const singleDay = new Date(monday);
      singleDay.setDate(monday.getDate() + i);
      weekGrid.push(singleDay);
    }

    return weekGrid;
  };

  // Helper date matching
  const filterEntriesByDate = (date: Date) => {
    const targetString = date.toISOString().split('T')[0];
    return timeEntries.filter(e => e.data === targetString);
  };

  // Visual header elements based on navigation mode
  const titleDisplay = viewMode === 'month'
    ? `${CATALAN_MONTHS[month]} - ${year}`
    : `Setmana del ${getWeekDaysGrid()[0].getDate()} al ${getWeekDaysGrid()[6].getDate()} de ${CATALAN_MONTHS[getWeekDaysGrid()[6].getMonth()]}, ${getWeekDaysGrid()[6].getFullYear()}`;

  // Global Time Aggregations on Selected View frame
  const daysInViewScope = viewMode === 'month' ? getMonthDaysGrid() : getWeekDaysGrid().map(d => ({ date: d, isCurrentMonth: true }));
  let viewScopeMins = 0;
  daysInViewScope.forEach(cell => {
    const cellEntries = filterEntriesByDate(cell.date);
    viewScopeMins += cellEntries.reduce((p, n) => p + n.duradaMinuts, 0);
  });

  return (
    <div className="space-y-6" id="view-calendar">
      
      {/* Top Controls Box */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-100 p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        
        {/* Toggle Mode */}
        <div className="flex bg-slate-100 p-1.5 rounded-lg border border-slate-200 w-full sm:w-auto">
          <button
            onClick={() => setViewMode('month')}
            className={`flex-1 sm:flex-none text-xs font-semibold px-4 py-1.5 rounded-md transition cursor-pointer ${
              viewMode === 'month' ? 'bg-white text-[#234e70] shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Vista Mensual
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`flex-1 sm:flex-none text-xs font-semibold px-4 py-1.5 rounded-md transition cursor-pointer ${
              viewMode === 'week' ? 'bg-white text-[#234e70] shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Vista Setmanal
          </button>
        </div>

        {/* Date Headers Slider */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrev}
            className="p-2 border border-slate-100 hover:bg-slate-50 rounded-lg cursor-pointer transition"
          >
            <ChevronLeft className="w-4 h-4 text-slate-500" />
          </button>
          <h2 className="text-sm font-sans font-bold text-slate-800 text-center min-w-[200px]" id="calendar-header-title">
            {titleDisplay}
          </h2>
          <button
            onClick={handleNext}
            className="p-2 border border-slate-100 hover:bg-slate-50 rounded-lg cursor-pointer transition"
          >
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Global summary badge */}
        <div className="bg-[#edf3f8] border border-slate-200/50 rounded-lg px-4 py-2 text-right shrink-0">
          <div className="text-xs uppercase font-bold text-[#234e70] tracking-wider">Hores a la vista</div>
          <div className="text-sm font-mono font-bold text-[#193c58]">
            {formatDuration(viewScopeMins, 'decimal')}
          </div>
        </div>
      </div>

      {/* WeekDays Table Labels */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-100 p-4">
        
        {/* MONTH VIEW CALENDAR GRID */}
        {viewMode === 'month' && (
          <div className="grid grid-cols-7 gap-1">
            {CATALAN_WEEKDAYS.map(dayLabel => (
              <div key={dayLabel} className="text-center text-xs uppercase font-bold text-slate-400 py-2 border-b border-slate-100">
                {dayLabel}
              </div>
            ))}

            {getMonthDaysGrid().map(({ date, isCurrentMonth }, idx) => {
              const dayStr = date.toISOString().split('T')[0];
              const dateEntries = filterEntriesByDate(date);
              const dayTotalMins = dateEntries.reduce((sum, e) => sum + e.duradaMinuts, 0);

              return (
                <div
                  key={idx}
                  onClick={() => startNewAdd(dayStr)}
                  className={`min-h-[105px] border border-slate-50 rounded-lg p-2 flex flex-col justify-between hover:bg-[#edf3f8]/20 cursor-pointer transition ${
                    isCurrentMonth ? 'bg-white' : 'bg-slate-50/50 opacity-40'
                  }`}
                  id={`cell-date-${dayStr}`}
                >
                  {/* Top Day meta info */}
                  <div className="flex justify-between items-start">
                    <span className={`text-[11px] font-mono font-bold ${
                      isCurrentMonth ? 'text-slate-700' : 'text-slate-400'
                    }`}>
                      {date.getDate()}
                    </span>
                    {dayTotalMins > 0 && (
                      <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-600 px-1 py-0.5 rounded">
                        {formatDuration(dayTotalMins, 'decimal')}
                      </span>
                    )}
                  </div>

                  {/* Intersecting Entries lists */}
                  <div className="space-y-1 my-2 overflow-y-auto max-h-[70px] pr-0.5">
                    {dateEntries.slice(0, 3).map(entry => {
                      const proj = projects.find(p => p.id === entry.projecteId);
                      const projColor = proj?.color || '#3b82f6';
                      return (
                        <div
                          key={entry.id}
                          onClick={(e) => startExistingEdit(entry, e)}
                          style={{ borderLeftColor: projColor }}
                          className="text-[11px] leading-tight p-1 bg-slate-50 hover:bg-slate-100 border-l-2 rounded truncate max-w-full font-sans text-slate-700"
                          title={`${proj?.nom || 'Desconegut'}: ${entry.descripcio}`}
                        >
                          <span className="font-semibold text-slate-400 mr-0.5">{entry.horaInici}</span>{' '}
                          {entry.descripcio || proj?.nom}
                        </div>
                      );
                    })}
                    {dateEntries.length > 3 && (
                      <div className="text-[8px] text-center font-bold text-[#234e70]">
                        + {dateEntries.length - 3} més
                      </div>
                    )}
                  </div>

                  {/* Hidden Hover Add badge */}
                  <div className="text-[11px] text-slate-300 font-semibold group flex items-center gap-0.5 invisible hover:text-[#234e70] sm:visible">
                    <Plus className="w-3 h-3 text-slate-300" /> Afegir
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* WEEK VIEW CALENDAR GRID */}
        {viewMode === 'week' && (
          <div className="grid grid-cols-7 gap-2">
            {getWeekDaysGrid().map((dayDate, idx) => {
              const dayStr = dayDate.toISOString().split('T')[0];
              const dateEntries = filterEntriesByDate(dayDate);
              const dayTotalMins = dateEntries.reduce((sum, e) => sum + e.duradaMinuts, 0);

              return (
                <div
                  key={idx}
                  onClick={() => startNewAdd(dayStr)}
                  className="bg-slate-50/50 hover:bg-[#edf3f8]/20 border border-slate-100 rounded-lg p-3 min-h-[350px] flex flex-col cursor-pointer transition overflow-hidden"
                >
                  {/* Column day label */}
                  <div className="border-b border-slate-200/50 pb-2 mb-3 text-center">
                    <span className="text-xs uppercase font-bold text-slate-400 block tracking-tight">
                      {CATALAN_WEEKDAYS[idx]}
                    </span>
                    <span className="text-base font-bold text-slate-800 font-mono mt-0.5 block">
                      {dayDate.getDate()}
                    </span>
                    {dayTotalMins > 0 ? (
                      <span className="inline-block mt-1 text-[11px] font-mono font-bold bg-[#deebf3] text-[#234e70] px-1.5 py-0.5 rounded-full">
                        {formatDuration(dayTotalMins, 'decimal')}
                      </span>
                    ) : (
                      <span className="inline-block mt-1 text-[11px] font-mono text-slate-300">0 h</span>
                    )}
                  </div>

                  {/* Events timeline cards */}
                  <div className="space-y-2 flex-1 overflow-y-auto pr-0.5">
                    {dateEntries.map(entry => {
                      const proj = projects.find(p => p.id === entry.projecteId);
                      const tsk = entry.tascaId ? tasks.find(t => t.id === entry.tascaId) : null;
                      const projColor = proj?.color || '#cbd5e1';

                      return (
                        <div
                          key={entry.id}
                          onClick={(e) => startExistingEdit(entry, e)}
                          style={{ borderLeftColor: projColor }}
                          className="bg-white border hover:border-slate-300 border-l-3 rounded-lg p-2 space-y-1 transition text-left cursor-pointer text-xs"
                        >
                          <div className="flex justify-between items-center text-[11px] font-mono text-slate-400">
                            <span>{entry.horaInici} - {entry.horaFi || '?'}</span>
                            <span className="font-semibold">{entry.duradaMinuts}m</span>
                          </div>
                          <div className="font-bold text-slate-700 leading-tight line-clamp-1">
                            {proj?.nom || 'Desconegut'}
                          </div>
                          {tsk && (
                            <div className="text-[11px] text-slate-400 italic line-clamp-1">
                              &gt; {tsk.nom}
                            </div>
                          )}
                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed italic">
                            {entry.descripcio || 'Sense nota descriptiva'}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); startNewAdd(dayStr); }}
                    className="mt-3 w-full bg-slate-900 border border-slate-900/10 text-white rounded-lg py-1.5 flex items-center justify-center text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
                  >
                    <Plus className="w-3 h-3 mr-0.5" /> Afegir
                  </button>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* QUICK POPUP ADD/EDIT OVERLAY MODAL */}
      {(selectedEntry || quickAddDate) && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <form
            onSubmit={handleSaveModal}
            className="bg-white rounded-lg shadow-xl border border-slate-100 w-full max-w-md overflow-hidden "
          >
            {/* Modal Header */}
            <div className="bg-slate-900 text-white py-4 px-6 flex justify-between items-center">
              <div>
                <h3 className="font-sans font-bold text-sm">
                  {selectedEntry ? 'Modificar Registre de Temps' : 'Nou Registre el Calendari'}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Data de realització: {formatDate(selectedEntry ? selectedEntry.data : (quickAddDate || ''), db.settings.dateFormat)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setSelectedEntry(null); setQuickAddDate(null); }}
                className="text-slate-400 hover:text-white transition text-xs font-semibold cursor-pointer"
              >
                Tancar
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Selectors grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Client *</label>
                  <select
                    required
                    value={formClientId}
                    onChange={e => {
                      setFormClientId(e.target.value);
                      setFormProjectId('');
                      setFormTaskId('');
                    }}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50"
                  >
                    <option value="">-- Client --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.nom}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Projecte *</label>
                  <select
                    required
                    disabled={!formClientId}
                    value={formProjectId}
                    onChange={e => {
                      const pId = e.target.value;
                      const p = projects.find(x => x.id === pId);
                      setFormProjectId(pId);
                      setFormTaskId('');
                      setFormTarifa(p?.tarifaHoraria || db.settings.defaultHourlyRate || 45);
                    }}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 disabled:opacity-40"
                  >
                    <option value="">-- Projecte --</option>
                    {projects.filter(p => p.clientId === formClientId).map(p => (
                      <option key={p.id} value={p.id}>{p.nom}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Task optional */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Tasca (Opcional)</label>
                <select
                  disabled={!formProjectId}
                  value={formTaskId}
                  onChange={e => setFormTaskId(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 disabled:opacity-40"
                >
                  <option value="">-- Cap tasca --</option>
                  {tasks.filter(t => t.projecteId === formProjectId).map(t => (
                    <option key={t.id} value={t.id}>{t.nom}</option>
                  ))}
                </select>
              </div>

              {/* Hours timeline */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Hora d'Inici</label>
                  <input
                    type="text"
                    placeholder="HH:MM"
                    required
                    value={formHoraInici}
                    onChange={e => setFormHoraInici(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Hora de Finalització</label>
                  <input
                    type="text"
                    placeholder="HH:MM"
                    required
                    value={formHoraFi}
                    onChange={e => setFormHoraFi(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 font-mono"
                  />
                </div>
              </div>

              {/* Billable and Rate parameter */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Facturable?</label>
                  <div className="flex gap-2 items-center">
                    <button
                      type="button"
                      onClick={() => setFormFacturable(true)}
                      className={`flex-1 text-xs py-1.5 rounded-lg font-semibold border transition ${
                        formFacturable
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Sí
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormFacturable(false)}
                      className={`flex-1 text-xs py-1.5 rounded-lg font-semibold border transition ${
                        !formFacturable
                          ? 'bg-slate-100 text-slate-700 border-slate-200'
                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Tarifa aplicada</label>
                  <input
                    type="number"
                    min="0"
                    disabled={!formFacturable}
                    value={formFacturable ? formTarifa : 0}
                    onChange={e => setFormTarifa(Number(e.target.value))}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 text-right font-mono disabled:opacity-40"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Treball realitzat (Descripció)</label>
                <textarea
                  placeholder="Notes, incidències o serveis prestats..."
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 outline-none resize-none"
                  rows={2}
                />
              </div>
            </div>

            {/* Modal actions */}
            <div className="bg-slate-50 py-3 px-6 border-t border-slate-100 flex justify-between items-center">
              <div>
                {selectedEntry && (
                  <button
                    type="button"
                    onClick={handleDeleteModal}
                    className="text-red-600 hover:text-red-700 font-semibold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    Eliminar Fila
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setSelectedEntry(null); setQuickAddDate(null); }}
                  className="text-slate-500 hover:bg-slate-200/50 text-xs font-semibold px-4 py-1.5 rounded-lg cursor-pointer"
                >
                  Tancar
                </button>
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-1.5 rounded-lg shadow cursor-pointer "
                >
                  Desar Canvis
                </button>
              </div>
            </div>

          </form>
        </div>
      )}

    </div>
  );
}
