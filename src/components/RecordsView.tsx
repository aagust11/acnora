import { localToday } from '../utils/timeUtils';
import React, { useState } from 'react';
import { LocalDatabase, TimeEntry, Client, Project, Task, EntryStatus, EntryOrigin } from '../types';
import {
  Search,
  SlidersHorizontal,
  Plus,
  Trash2,
  Copy,
  ArrowUpDown,
  Check,
  X,
  Edit2,
  AlertTriangle,
  Info,
  ChevronLeft,
  ChevronRight,
  CheckCheck
} from 'lucide-react';
import { calculateMinutes, validateEntry, formatDate, parseDate } from '../utils/timeUtils';

interface RecordsViewProps {
  db: LocalDatabase;
  onAddEntry: (entry: TimeEntry) => void;
  onUpdateEntry: (entry: TimeEntry) => void;
  onDeleteEntry: (id: string) => void;
}

export default function RecordsView({ db, onAddEntry, onUpdateEntry, onDeleteEntry }: RecordsViewProps) {
  const { timeEntries, clients, projects, tasks } = db;

  // Sorting State
  const [sortField, setSortField] = useState<'data' | 'duradaMinuts' | 'importCalculat'>('data');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filtering State
  const [filterClient, setFilterClient] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterTask, setFilterTask] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('all'); // 'today', 'thisWeek', 'thisMonth', 'custom', 'all'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchText, setSearchText] = useState('');

  // Row Editing State
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<TimeEntry>>({});

  // Quick Inline creation State
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickForm, setQuickForm] = useState({
    data: localToday(),
    horaInici: '09:00',
    horaFi: '13:00',
    clientId: '',
    projecteId: '',
    tascaId: '',
    facturable: true,
    tarifa: db.settings.defaultHourlyRate || 45,
    descripcio: '',
    notes: ''
  });

  // Handle pagination if needed
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Toggle Sorting
  const requestSort = (field: 'data' | 'duradaMinuts' | 'importCalculat') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Check matching dates for periods
  const matchesPeriod = (entryDate: string): boolean => {
    if (filterPeriod === 'all') return true;
    
    const date = new Date(entryDate);
    const today = new Date();
    today.setHours(0,0,0,0);

    if (filterPeriod === 'today') {
      const todayStr = today.toISOString().split('T')[0];
      return entryDate === todayStr;
    }

    if (filterPeriod === 'thisWeek') {
      const currentDay = today.getDay();
      let diff = today.getDate() - currentDay;
      if (db.settings.weekStartsOn === 'monday') {
        diff = today.getDate() - (currentDay === 0 ? 6 : currentDay - 1);
      }
      const startOfWeek = new Date(today.setDate(diff));
      startOfWeek.setHours(0,0,0,0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      endOfWeek.setHours(23,59,59,999);
      return date >= startOfWeek && date <= endOfWeek;
    }

    if (filterPeriod === 'thisMonth') {
      return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
    }

    if (filterPeriod === 'custom') {
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      if (start && end) {
        return date >= start && date <= end;
      } else if (start) {
        return date >= start;
      } else if (end) {
        return date <= end;
      }
    }

    return true;
  };

  // Combined Filters Logic
  const filteredEntries = timeEntries.filter(entry => {
    if (filterClient && entry.clientId !== filterClient) return false;
    if (filterProject && entry.projecteId !== filterProject) return false;
    if (filterTask && entry.tascaId !== filterTask) return false;
    if (filterStatus && entry.estat !== filterStatus) return false;
    if (!matchesPeriod(entry.data)) return false;

    if (searchText) {
      const query = searchText.toLowerCase();
      const descMatch = entry.descripcio?.toLowerCase().includes(query) || false;
      const notesMatch = entry.notes?.toLowerCase().includes(query) || false;
      const pName = projects.find(p => p.id === entry.projecteId)?.nom?.toLowerCase().includes(query) || false;
      const cName = clients.find(c => c.id === entry.clientId)?.nom?.toLowerCase().includes(query) || false;
      return descMatch || notesMatch || pName || cName;
    }

    return true;
  });

  // Sort Logic
  const sortedEntries = [...filteredEntries].sort((a, b) => {
    let fieldA: any = a[sortField];
    let fieldB: any = b[sortField];

    if (sortField === 'data') {
      fieldA = new Date(a.data).getTime();
      fieldB = new Date(b.data).getTime();
    }

    if (fieldA < fieldB) return sortOrder === 'asc' ? -1 : 1;
    if (fieldA > fieldB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination bounds
  const totalItems = sortedEntries.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEntries = sortedEntries.slice(startIndex, startIndex + itemsPerPage);

  // Add Inline Row Click trigger
  const handleStartEdit = (entry: TimeEntry) => {
    setEditingRowId(entry.id);
    setEditFormData({ ...entry });
  };

  const handleEditChange = (field: keyof TimeEntry, value: any) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveEdit = (rowId: string) => {
    const original = timeEntries.find(e => e.id === rowId);
    if (!original || !editFormData.clientId || !editFormData.projecteId) return;

    // Recalculations
    const data = editFormData.data || original.data;
    const horaInici = editFormData.horaInici || original.horaInici;
    const horaFi = editFormData.horaFi || original.horaFi;
    
    let mins = original.duradaMinuts;
    const editedTimes = data !== original.data || horaInici !== original.horaInici || horaFi !== original.horaFi;
    if (editedTimes && horaInici && horaFi) {
      // Preserve paused time for timer-generated entries; notes/rate edits must not erase it.
      let wallMinutes = calculateMinutes(horaInici, horaFi);
      if (original.dataFi && original.dataFi > data) {
        const days = Math.round((new Date(original.dataFi + 'T00:00:00').getTime() - new Date(data + 'T00:00:00').getTime()) / 86400000);
        wallMinutes += days * 1440;
      }
      mins = Math.max(0, wallMinutes - (original.pausaSegons ?? 0) / 60);
      mins = Math.floor(mins);
    }

    const isFacturable = editFormData.facturable !== undefined ? editFormData.facturable : original.facturable;
    const rate = editFormData.tarifaHorariaAplicada !== undefined ? editFormData.tarifaHorariaAplicada : original.tarifaHorariaAplicada;
    const computedImport = isFacturable ? (mins / 60) * (rate || 0) : 0;

    const partialUpdated: TimeEntry = {
      ...original,
      ...editFormData,
      duradaMinuts: mins,
      importCalculat: Number(computedImport.toFixed(2)),
      dataModificacio: new Date().toISOString()
    } as TimeEntry;

    // Re-validate row status
    const allExcludingCurrent = timeEntries.filter(e => e.id !== rowId);
    const validation = validateEntry(partialUpdated, projects, tasks, allExcludingCurrent);
    partialUpdated.estat = validation.status;

    onUpdateEntry(partialUpdated);
    setEditingRowId(null);
  };

  const handleCancelEdit = () => {
    setEditingRowId(null);
  };

  // Quick entry creator submit
  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickForm.clientId || !quickForm.projecteId) {
      alert('Tria obligatòriament client i projecte.');
      return;
    }

    const mins = calculateMinutes(quickForm.horaInici, quickForm.horaFi);
    const computedImport = quickForm.facturable ? (mins / 60) * quickForm.tarifa : 0;

    const newEntry: TimeEntry = {
      id: `e-${Date.now()}`,
      clientId: quickForm.clientId,
      projecteId: quickForm.projecteId,
      tascaId: quickForm.tascaId || undefined,
      data: quickForm.data,
      horaInici: quickForm.horaInici,
      horaFi: quickForm.horaFi,
      duradaMinuts: mins,
      facturable: quickForm.facturable,
      tarifaHorariaAplicada: quickForm.facturable ? Number(quickForm.tarifa) : 0,
      importCalculat: Number(computedImport.toFixed(2)),
      descripcio: quickForm.descripcio || 'Registre manual de temps',
      notes: quickForm.notes,
      origen: 'manual',
      estat: 'correcte', // evaluated by add logic
      dataCreacio: new Date().toISOString(),
      dataModificacio: new Date().toISOString()
    };

    onAddEntry(newEntry);
    setShowQuickAdd(false);

    // Reset default
    setQuickForm({
      data: localToday(),
      horaInici: '09:00',
      horaFi: '13:00',
      clientId: '',
      projecteId: '',
      tascaId: '',
      facturable: true,
      tarifa: db.settings.defaultHourlyRate || 45,
      descripcio: '',
      notes: ''
    });
  };

  return (
    <div className="space-y-6" id="view-records">
      
      {/* Filters Pane */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-100 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-50 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-slate-500" />
            <h3 className="font-sans font-semibold text-slate-800 text-sm">Filtres i Cerca Avançada</h3>
          </div>
          <button
            onClick={() => setShowQuickAdd(!showQuickAdd)}
            id="btn-toggle-quick-add"
            className="bg-[#234e70] hover:bg-[#193c58] text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nous Registres (Manual o Ràpid)
          </button>
        </div>

        {/* Quick Add Form Section */}
        {showQuickAdd && (
          <form onSubmit={handleQuickAddSubmit} className="bg-slate-50 border border-slate-200/60 rounded-lg p-5 mb-5 space-y-4 ">
            <h4 className="font-semibold text-slate-800 text-xs uppercase tracking-wide">Creació Ràpida de Registre</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs uppercase font-bold text-slate-500 mb-1">Data</label>
                <input
                  type="date"
                  required
                  value={quickForm.data}
                  onChange={e => setQuickForm(p => ({ ...p, data: e.target.value }))}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs uppercase font-bold text-slate-500 mb-1">Hora d'Inici</label>
                <input
                  type="text"
                  placeholder="HH:MM"
                  required
                  value={quickForm.horaInici}
                  onChange={e => setQuickForm(p => ({ ...p, horaInici: e.target.value }))}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs uppercase font-bold text-slate-500 mb-1">Hora finalització</label>
                <input
                  type="text"
                  placeholder="HH:MM"
                  required
                  value={quickForm.horaFi}
                  onChange={e => setQuickForm(p => ({ ...p, horaFi: e.target.value }))}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs uppercase font-bold text-slate-500 mb-1">Client *</label>
                <select
                  required
                  value={quickForm.clientId}
                  onChange={e => setQuickForm(p => ({ ...p, clientId: e.target.value, projecteId: '', tascaId: '' }))}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white"
                >
                  <option value="">-- Client --</option>
                  {clients.filter(c => c.estat === 'actiu').map(c => (
                    <option key={c.id} value={c.id}>{c.nom}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs uppercase font-bold text-slate-500 mb-1">Projecte *</label>
                <select
                  required
                  disabled={!quickForm.clientId}
                  value={quickForm.projecteId}
                  onChange={e => {
                    const pId = e.target.value;
                    const p = projects.find(x => x.id === pId);
                    setQuickForm(prev => ({
                      ...prev,
                      projecteId: pId,
                      tascaId: '',
                      tarifa: p?.tarifaHoraria || db.settings.defaultHourlyRate || 45
                    }));
                  }}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white disabled:bg-slate-100"
                >
                  <option value="">-- Projecte --</option>
                  {projects.filter(p => p.clientId === quickForm.clientId && p.estat !== 'arxivat').map(p => (
                    <option key={p.id} value={p.id}>{p.nom}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase font-bold text-slate-500 mb-1">Tasca (Opcional)</label>
                <select
                  disabled={!quickForm.projecteId}
                  value={quickForm.tascaId}
                  onChange={e => setQuickForm(p => ({ ...p, tascaId: e.target.value }))}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white disabled:bg-slate-100"
                >
                  <option value="">-- Cap tasca --</option>
                  {tasks.filter(t => t.projecteId === quickForm.projecteId && t.estat !== 'arxivada').map(t => (
                    <option key={t.id} value={t.id}>{t.nom}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase font-bold text-slate-500 mb-1">Tarifa ({db.settings.currency}/h)</label>
                <input
                  type="number"
                  min="0"
                  disabled={!quickForm.facturable}
                  value={quickForm.tarifa}
                  onChange={e => setQuickForm(p => ({ ...p, tarifa: Number(e.target.value) }))}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white font-mono text-right"
                />
              </div>
              <div>
                <label className="block text-xs uppercase font-bold text-slate-500 mb-1">Descripció</label>
                <input
                  type="text"
                  placeholder="Treball realitzat..."
                  value={quickForm.descripcio}
                  onChange={e => setQuickForm(p => ({ ...p, descripcio: e.target.value }))}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1 border-t border-slate-200/50">
              <button
                type="button"
                onClick={() => setShowQuickAdd(false)}
                className="text-slate-500 text-xs px-3 py-1.5 hover:bg-slate-200/50 rounded-lg cursor-pointer"
              >
                Cancel·lar
              </button>
              <button
                type="submit"
                id="btn-confirm-quick-add"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-1.5 rounded-lg cursor-pointer"
              >
                Afegir i Validar
              </button>
            </div>
          </form>
        )}

        {/* Search & Selector filters grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* Keyword Query */}
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Cerca per text, notes, projectes..."
              value={searchText}
              onChange={e => { setSearchText(e.target.value); setCurrentPage(1); }}
              className="w-full text-xs border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 outline-none focus:ring-1 focus:ring-[#234e70] bg-slate-50 hover:bg-slate-100/50 transition"
            />
          </div>

          {/* Client filter */}
          <div>
            <select
              value={filterClient}
              onChange={e => { setFilterClient(e.target.value); setFilterProject(''); setFilterTask(''); setCurrentPage(1); }}
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 outline-none bg-slate-50 hover:bg-slate-100/50 transition cursor-pointer"
            >
              <option value="">Filtre: Tots els clients</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </div>

          {/* Project filter */}
          <div>
            <select
              disabled={!filterClient}
              value={filterProject}
              onChange={e => { setFilterProject(e.target.value); setFilterTask(''); setCurrentPage(1); }}
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 outline-none bg-slate-50 hover:bg-slate-100/50 transition cursor-pointer disabled:opacity-50"
            >
              <option value="">Filtre: Tots els projectes</option>
              {projects.filter(p => !filterClient || p.clientId === filterClient).map(p => (
                <option key={p.id} value={p.id}>{p.nom}</option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div>
            <select
              value={filterStatus}
              onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 outline-none bg-slate-50 hover:bg-slate-100/50 transition cursor-pointer"
            >
              <option value="">Filtre: Tots els estats</option>
              <option value="correcte">Correcte</option>
              <option value="pendent de revisar">Pendent de revisar</option>
              <option value="incoherent">Incoherent</option>
            </select>
          </div>

          {/* Timers Period Filter */}
          <div>
            <select
              value={filterPeriod}
              onChange={e => { setFilterPeriod(e.target.value); setCurrentPage(1); }}
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 outline-none bg-slate-50 hover:bg-slate-100/50 transition cursor-pointer"
            >
              <option value="all">Període: Tot l'històric</option>
              <option value="today">Avui</option>
              <option value="thisWeek">Aquesta Setmana</option>
              <option value="thisMonth">Aquest Mes</option>
              <option value="custom">Rang de dates personalitzat</option>
            </select>
          </div>
        </div>

        {/* Custom date range display */}
        {filterPeriod === 'custom' && (
          <div className="grid grid-cols-2 gap-4 mt-3 max-w-md ">
            <div>
              <label className="block text-xs text-slate-400 font-bold mb-1">Des de (Inici)</label>
              <input
                type="date"
                value={startDate}
                onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }}
                className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 font-bold mb-1">Fins a (Final)</label>
              <input
                type="date"
                value={endDate}
                onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }}
                className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50"
              />
            </div>
          </div>
        )}
      </div>

      {/* Excel Sheet Editable Table Card */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden">
        
        {/* Table header indicators */}
        <div className="bg-slate-50 py-3 px-5 border-b border-slate-100 flex justify-between items-center text-xs text-slate-500 font-medium">
          <span>Mostrant {totalItems === 0 ? 0 : startIndex + 1} - {Math.min(totalItems, startIndex + itemsPerPage)} de {totalItems} registres trobats</span>
          <div className="flex gap-4">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Correcte</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Revisar</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 " /> Incoherent</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-slate-700 min-w-[1200px]">
            <thead>
              <tr className="bg-slate-50/70 text-slate-500 font-bold border-b border-slate-100">
                <th className="p-3 text-left w-24">
                  <button onClick={() => requestSort('data')} className="flex items-center gap-1 hover:text-slate-800 cursor-pointer">
                    Data <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>
                </th>
                <th className="p-3 text-left w-36">Client</th>
                <th className="p-3 text-left w-40">Projecte / Tasca</th>
                <th className="p-3 text-left w-16">Inici</th>
                <th className="p-3 text-left w-16">Fi</th>
                <th className="p-3 text-right w-24">
                  <button onClick={() => requestSort('duradaMinuts')} className="flex items-center gap-1 ml-auto hover:text-slate-800 cursor-pointer">
                    Durada <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>
                </th>
                <th className="p-3 text-center w-16">Fact.</th>
                <th className="p-3 text-right w-24">Tarifa</th>
                <th className="p-3 text-right w-28">
                  <button onClick={() => requestSort('importCalculat')} className="flex items-center gap-1 ml-auto hover:text-slate-800 cursor-pointer">
                    Import <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>
                </th>
                <th className="p-3 text-left">Descripció del treball</th>
                <th className="p-3 text-center w-28">Auditoria</th>
                <th className="p-3 text-center w-28">Accions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedEntries.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-slate-400">
                    No s’ha trobat cap registre amb els filtres actius.
                  </td>
                </tr>
              ) : (
                paginatedEntries.map(entry => {
                  const isEditing = editingRowId === entry.id;
                  const client = clients.find(c => c.id === (isEditing ? editFormData.clientId : entry.clientId));
                  const project = projects.find(p => p.id === (isEditing ? editFormData.projecteId : entry.projecteId));
                  const task = entry.tascaId ? tasks.find(t => t.id === entry.tascaId) : null;
                  const projectColor = project?.color || '#cbd5e1';

                  // Quick individual check for row audit warnings
                  const auditCheck = validateEntry(entry, projects, tasks, timeEntries);

                  return (
                    <tr
                      key={entry.id}
                      className={`hover:bg-slate-50 border-b border-slate-100 transition duration-150 ${
                        isEditing ? 'bg-[#edf3f8]/30' : ''
                      }`}
                    >
                      {/* DATE */}
                      <td className="p-3 font-mono">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editFormData.data}
                            onChange={e => handleEditChange('data', e.target.value)}
                            className="bg-white border border-slate-200 rounded p-1 w-full text-xs"
                          />
                        ) : (
                          formatDate(entry.data, db.settings.dateFormat)
                        )}
                      </td>

                      {/* CLIENT */}
                      <td className="p-3">
                        {isEditing ? (
                          <select
                            value={editFormData.clientId}
                            onChange={e => {
                              handleEditChange('clientId', e.target.value);
                              handleEditChange('projecteId', '');
                              handleEditChange('tascaId', '');
                            }}
                            className="bg-white border border-slate-200 rounded p-1 w-full text-xs"
                          >
                            <option value="">-- Client --</option>
                            {clients.map(c => (
                              <option key={c.id} value={c.id}>{c.nom}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="font-semibold text-slate-800">{client?.nom || 'Desconegut'}</span>
                        )}
                      </td>

                      {/* PROJECT & TASK */}
                      <td className="p-3">
                        {isEditing ? (
                          <div className="space-y-1.5">
                            <select
                              value={editFormData.projecteId}
                              onChange={e => {
                                const pId = e.target.value;
                                const pObj = projects.find(x => x.id === pId);
                                handleEditChange('projecteId', pId);
                                handleEditChange('tascaId', '');
                                if (pObj?.tarifaHoraria) {
                                  handleEditChange('tarifaHorariaAplicada', pObj.tarifaHoraria);
                                }
                              }}
                              className="bg-white border border-slate-200 rounded p-1 w-full text-xs"
                            >
                              <option value="">-- Projecte --</option>
                              {projects
                                .filter(p => p.clientId === editFormData.clientId)
                                .map(p => (
                                  <option key={p.id} value={p.id}>{p.nom}</option>
                                ))}
                            </select>

                            <select
                              value={editFormData.tascaId || ''}
                              onChange={e => handleEditChange('tascaId', e.target.value || undefined)}
                              className="bg-white border border-slate-200 rounded p-1 w-full text-xs"
                            >
                              <option value="">-- Cap tasca --</option>
                              {tasks
                                .filter(t => t.projecteId === editFormData.projecteId)
                                .map(t => (
                                  <option key={t.id} value={t.id}>{t.nom}</option>
                                ))}
                            </select>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1.5 font-medium">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: projectColor }} />
                              {project?.nom || 'Desconegut'}
                            </span>
                            {task && (
                              <div className="text-xs text-slate-400 italic block pl-3">
                                &gt; {task.nom}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* START HOUR */}
                      <td className="p-3 font-mono">
                        {isEditing ? (
                          <input
                            type="text"
                            placeholder="HH:MM"
                            value={editFormData.horaInici}
                            onChange={e => handleEditChange('horaInici', e.target.value)}
                            className="bg-white border border-slate-200 rounded p-1 w-full text-xs text-center"
                          />
                        ) : (
                          entry.horaInici
                        )}
                      </td>

                      {/* END HOUR */}
                      <td className="p-3 font-mono">
                        {isEditing ? (
                          <input
                            type="text"
                            placeholder="HH:MM"
                            value={editFormData.horaFi || ''}
                            onChange={e => handleEditChange('horaFi', e.target.value)}
                            className="bg-white border border-slate-200 rounded p-1 w-full text-xs text-center"
                          />
                        ) : (
                          entry.horaFi || '-'
                        )}
                      </td>

                      {/* DURATION */}
                      <td className="p-3 text-right font-mono font-medium">
                        {isEditing ? (
                          <span className="text-slate-400 font-normal">Auto-calc</span>
                        ) : (
                          <div>
                            <div>{(entry.duradaMinuts / 60).toFixed(2)} h</div>
                            <div className="text-xs text-slate-500">{entry.duradaMinuts} min de treball</div>
                            {!!entry.pausaSegons && <div className="text-xs text-amber-700">Pausa: {Math.round(entry.pausaSegons / 60)} min</div>}
                          </div>
                        )}
                      </td>

                      {/* FACTURABLE */}
                      <td className="p-3 text-center">
                        {isEditing ? (
                          <input
                            type="checkbox"
                            checked={editFormData.facturable}
                            onChange={e => handleEditChange('facturable', e.target.checked)}
                            className="w-4 h-4 text-[#234e70] border-slate-300 rounded focus:ring-[#234e70] cursor-pointer"
                          />
                        ) : (
                          <span className={`px-2 py-0.5 rounded font-semibold text-xs ${
                            entry.facturable ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {entry.facturable ? 'Sí' : 'No'}
                          </span>
                        )}
                      </td>

                      {/* HOURLY RATE */}
                      <td className="p-4 text-right font-mono text-slate-600">
                        {isEditing ? (
                          <input
                            type="number"
                            disabled={!editFormData.facturable}
                            value={editFormData.tarifaHorariaAplicada || 0}
                            onChange={e => handleEditChange('tarifaHorariaAplicada', Number(e.target.value))}
                            className="bg-white border border-slate-200 rounded p-1 w-16 text-right font-mono text-xs"
                          />
                        ) : (
                          entry.facturable ? `${entry.tarifaHorariaAplicada} ${db.settings.currency === 'EUR' ? '€': db.settings.currency}/h` : '0 €/h'
                        )}
                      </td>

                      {/* CALCULATED AMOUNT */}
                      <td className="p-3 text-right font-mono font-semibold text-slate-800">
                        {isEditing ? (
                          <span className="text-slate-400 font-normal">Auto-calc</span>
                        ) : (
                          db.settings.showAmountsByDefault ? `${(entry.importCalculat || 0).toFixed(2).replace('.', ',')} €` : '***'
                        )}
                      </td>

                      {/* DESCRIPTION */}
                      <td className="p-3 max-w-[200px] truncate-hover">
                        {isEditing ? (
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={editFormData.descripcio || ''}
                              onChange={e => handleEditChange('descripcio', e.target.value)}
                              className="bg-white border border-slate-200 rounded p-1 w-full text-xs"
                              placeholder="Fets fets..."
                            />
                            <textarea
                              value={editFormData.notes || ''}
                              onChange={e => handleEditChange('notes', e.target.value)}
                              className="bg-white border border-slate-200 rounded p-1 w-full text-xs resize-none"
                              placeholder="Notes internes..."
                              rows={1}
                            />
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="text-slate-700 block line-clamp-2" title={entry.descripcio}>
                              {entry.descripcio || '-'}
                            </span>
                            {entry.notes && (
                              <span className="text-xs text-slate-400 line-clamp-1 italic block" title={`Notes internes: ${entry.notes}`}>
                                * {entry.notes}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* STATUS AUDITING CARD */}
                      <td className="p-3 text-center">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] uppercase tracking-wider ${
                            entry.estat === 'correcte'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : entry.estat === 'pendent de revisar'
                              ? 'bg-amber-50 text-amber-700 border border-amber-100'
                              : 'bg-red-50 text-red-700 border border-red-100'
                          }`}>
                            {entry.estat === 'correcte' && entry.warningsDescartades ? 'Validat manual' : entry.estat}
                          </span>
                          
                          {auditCheck.warnings.length > 0 && (
                            <div className="flex flex-col items-center gap-1">
                              <div className="group relative inline-block cursor-help">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 hover:text-red-500" />
                                <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-48 -translate-x-1/2 rounded bg-slate-900 p-2 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
                                  <ul className="list-disc pl-3 text-left space-y-1">
                                    {auditCheck.warnings.map((w, i) => (
                                      <li key={i}>{w}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                              
                              {/* Validation dismiss actions */}
                              {entry.warningsDescartades ? (
                                <div className="flex items-center gap-1 text-[11px] text-emerald-600 bg-emerald-50/70 border border-emerald-100 px-1.5 py-0.5 rounded font-medium">
                                  <CheckCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                                  <span>Avís omès</span>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onUpdateEntry({ ...entry, warningsDescartades: true, estat: 'correcte' });
                                  }}
                                  className="flex items-center gap-1 text-[11px] text-[#234e70] hover:text-[#234e70] bg-[#edf3f8] hover:bg-[#deebf3]/80 border border-slate-200 px-1.5 py-0.5 rounded cursor-pointer transition font-semibold"
                                  title="Marcar el registre com a correcte ignorant els avisos d’incoherència"
                                >
                                  <Check className="w-3 h-3" />
                                  Validar avís
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* ACTIONS */}
                      <td className="p-3 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleSaveEdit(entry.id)}
                              className="p-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded cursor-pointer"
                              title="Desar fila"
                              id={`btn-save-inline-${entry.id}`}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-1 bg-slate-400 hover:bg-slate-500 text-white rounded cursor-pointer"
                              title="Cancel·lar edició"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Edit Button */}
                            <button
                              onClick={() => handleStartEdit(entry)}
                              className="p-1 text-slate-500 hover:text-[#234e70] hover:bg-slate-100 rounded cursor-pointer transition"
                              title="Editar registre de temps"
                              id={`btn-edit-inline-${entry.id}`}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => {
                                if (window.confirm('Segur que vols eliminar aquest registre d’hores?')) {
                                  onDeleteEntry(entry.id);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer transition"
                              title="Eliminar registre"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Actions */}
        {totalPages > 1 && (
          <div className="bg-slate-50 px-5 py-4 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer flex items-center gap-1 font-semibold"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Enrere
            </button>
            <span className="text-xs text-slate-500 font-medium">Pàgina {currentPage} de {totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer flex items-center gap-1 font-semibold"
            >
              Següent <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
