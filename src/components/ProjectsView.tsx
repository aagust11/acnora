import { localToday } from '../utils/timeUtils';
import React, { useState } from 'react';
import { LocalDatabase, Project, ProjectStatus, Client } from '../types';
import { Plus, Edit3, Trash2, Calendar, Target, Euro, AlertTriangle, Eye, CheckCircle, Archive } from 'lucide-react';
import { formatDuration, formatCurrency } from '../utils/timeUtils';

interface ProjectsViewProps {
  db: LocalDatabase;
  onAddProject: (project: Project) => void;
  onUpdateProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
}

const COLOR_PRESETS = [
  '#234E70', // Navy
  '#287C70', // Teal
  '#A17836', // Ochre
  '#A65757', // Red
  '#6B648A', // Muted purple
  '#9C6D80', // Rose
  '#488B9B', // Cyan
  '#64748B'  // Slate
];

export default function ProjectsView({ db, onAddProject, onUpdateProject, onDeleteProject }: ProjectsViewProps) {
  const { projects, clients, timeEntries, tasks } = db;

  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [tab, setTab] = useState<'actius' | 'arxivats'>('actius');

  // Form states
  const [clientId, setClientId] = useState('');
  const [nom, setNom] = useState('');
  const [descripcio, setDescripcio] = useState('');
  const [estat, setEstat] = useState<ProjectStatus>('actiu');
  const [tarifaHoraria, setTarifaHoraria] = useState<string>('');
  const [pressupostHores, setPressupostHores] = useState<string>('');
  const [color, setColor] = useState('#234E70');
  const [dataInici, setDataInici] = useState(localToday());
  const [dataFinalitzacioPrevista, setDataFinalitzacioPrevista] = useState('');
  const [notes, setNotes] = useState('');

  const [formError, setFormError] = useState<string | null>(null);

  const startCreate = () => {
    setEditingProject(null);
    setClientId(clients[0]?.id || '');
    setNom('');
    setDescripcio('');
    setEstat('actiu');
    setTarifaHoraria('');
    setPressupostHores('');
    setColor('#234E70');
    setDataInici(localToday());
    setDataFinalitzacioPrevista('');
    setNotes('');
    setFormError(null);
    setShowForm(true);
  };

  const startEdit = (proj: Project) => {
    setEditingProject(proj);
    setClientId(proj.clientId);
    setNom(proj.nom);
    setDescripcio(proj.descripcio);
    setEstat(proj.estat);
    setTarifaHoraria(proj.tarifaHoraria ? String(proj.tarifaHoraria) : '');
    setPressupostHores(proj.pressupostHores ? String(proj.pressupostHores) : '');
    setColor(proj.color || '#234E70');
    setDataInici(proj.dataInici);
    setDataFinalitzacioPrevista(proj.dataFinalitzacioPrevista || '');
    setNotes(proj.notes);
    setFormError(null);
    setShowForm(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) {
      setFormError('El nom del projecte és obligatori.');
      return;
    }
    if (!clientId) {
      setFormError('Has de triar obligatòriament un Client associat.');
      return;
    }

    const payload: Project = {
      id: editingProject ? editingProject.id : `p-${Date.now()}`,
      clientId,
      nom,
      descripcio,
      estat,
      tarifaHoraria: tarifaHoraria ? Number(tarifaHoraria) : undefined,
      pressupostHores: pressupostHores ? Number(pressupostHores) : undefined,
      color,
      dataInici,
      dataFinalitzacioPrevista: dataFinalitzacioPrevista || undefined,
      notes,
      dataCreacio: editingProject ? editingProject.dataCreacio : new Date().toISOString(),
      dataModificacio: new Date().toISOString()
    };

    if (editingProject) {
      onUpdateProject(payload);
    } else {
      onAddProject(payload);
    }

    setShowForm(false);
  };

  const handleDeleteProject = (proj: Project) => {
    // Cannot delete if there are associated time logs or associated tasks
    const hasEntries = timeEntries.some(e => e.projecteId === proj.id);
    const hasTasks = tasks.some(t => t.projecteId === proj.id);

    if (hasEntries || hasTasks) {
      alert(`No es pot eliminar el projecte "${proj.nom}" perquè conté tasques o registres de temps associats. Per seguretat de facturació, canvia el seu estat a "arxivat" o "pausat".`);
      return;
    }

    if (window.confirm(`Segur que vols eliminar definitivament el projecte: "${proj.nom}"?`)) {
      onDeleteProject(proj.id);
    }
  };

  return (
    <div className="space-y-6" id="view-projects">
      
      {/* Action panel */}
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-slate-100">
        <div>
          <h2 className="text-base font-sans font-semibold text-slate-900">Gestió de Projectes</h2>
          <p className="text-xs text-slate-400 mt-0.5">Defineix els pressupostos en hores, colors d'etiquetes i tarifes horàries.</p>
        </div>
        <button
          onClick={startCreate}
          id="btn-add-project"
          className="bg-[#234e70] hover:bg-[#193c58] text-white font-semibold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Crear Projecte
        </button>
      </div>

      {/* CREATE/EDIT FORM OVERLAY */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <form
            onSubmit={handleFormSubmit}
            className="bg-white rounded-lg shadow-xl w-full max-w-xl overflow-hidden "
          >
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
              <h3 className="font-sans font-bold text-sm">
                {editingProject ? `Editar Projecte: ${editingProject.nom}` : 'Crear Nou Projecte'}
              </h3>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                Tancar
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Empresa / Client Associat *</label>
                  <select
                    required
                    value={clientId}
                    onChange={e => setClientId(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 cursor-pointer"
                  >
                    <option value="">-- Tria un client --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.nom} {c.estat === 'arxivat' ? '(Arxivat)' : ''}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nom del Projecte *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Portal de Reserves V2..."
                    value={nom}
                    onChange={e => setNom(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Descripció del Projecte</label>
                <input
                  type="text"
                  placeholder="Maquetació completa d’estils generats i persistència..."
                  value={descripcio}
                  onChange={e => setDescripcio(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tarifa Horària ({db.settings.currency}/h)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ex: 50"
                    value={tarifaHoraria}
                    onChange={e => setTarifaHoraria(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 font-mono text-right"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Pressupost total (Hores)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ex: 80"
                    value={pressupostHores}
                    onChange={e => setPressupostHores(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 font-mono text-right"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Estat de Sincro</label>
                  <select
                    value={estat}
                    onChange={e => setEstat(e.target.value as ProjectStatus)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 cursor-pointer"
                  >
                    <option value="actiu">Actiu</option>
                    <option value="pausat">Pausat</option>
                    <option value="finalitzat">Finalitzat</option>
                    <option value="arxivat">Arxivat</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Data d'inici comercial</label>
                  <input
                    type="date"
                    value={dataInici}
                    onChange={e => setDataInici(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Data de finalització prevista</label>
                  <input
                    type="date"
                    value={dataFinalitzacioPrevista}
                    onChange={e => setDataFinalitzacioPrevista(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50"
                  />
                </div>
              </div>

              {/* Color Preset selectors */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Color identificador al calendari / HEX personalitzat</label>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex gap-2.5 flex-wrap">
                    {COLOR_PRESETS.map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setColor(preset)}
                        style={{ backgroundColor: preset }}
                        className={`w-7 h-7 rounded-full cursor-pointer transition flex items-center justify-center border-2 ${
                          color.toLowerCase() === preset.toLowerCase() ? 'border-amber-400 scale-110' : 'border-transparent hover:scale-105'
                        }`}
                      >
                        {color.toLowerCase() === preset.toLowerCase() && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                      </button>
                    ))}
                  </div>

                  {/* Picker for custom HEX colors */}
                  <div className="flex items-center gap-2 border border-slate-200 rounded-lg p-1.5 bg-slate-50">
                    <input
                      type="color"
                      value={color.startsWith('#') && color.length === 7 ? color : '#234E70'}
                      onChange={e => setColor(e.target.value.toUpperCase())}
                      className="w-6 h-6 border-0 rounded cursor-pointer p-0 bg-transparent"
                    />
                    <input
                      type="text"
                      placeholder="#3B82F6"
                      value={color}
                      onChange={e => setColor(e.target.value.toUpperCase())}
                      className="text-xs font-mono w-20 bg-transparent focus:outline-none focus:ring-0 border-0 p-1 text-slate-700 font-bold uppercase"
                      maxLength={7}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes Internes i Requisits</label>
                <textarea
                  placeholder="Notes privades sobre l'estructura tecnològica del projecte..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 resize-none font-sans"
                  rows={3}
                />
              </div>

              {formError && (
                <div className="bg-amber-50 text-amber-700 p-3 rounded-lg text-xs">
                  {formError}
                </div>
              )}
            </div>

            <div className="bg-slate-50 py-3 px-6 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-slate-500 hover:bg-slate-200/50 text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer"
              >
                Cancel·lar
              </button>
              <button
                type="submit"
                id="btn-confirm-save-project"
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow cursor-pointer"
              >
                Desar Projecte
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab bar to switch between Active and Archived */}
      <div className="flex border-b border-slate-200 mt-4">
        <button
          onClick={() => setTab('actius')}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition -mb-px flex items-center gap-1.5 cursor-pointer ${
            tab === 'actius'
              ? 'border-[#234e70] text-[#234e70] font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Projectes Actius
          <span className="bg-slate-100 text-slate-600 font-bold text-xs px-2 py-0.5 rounded-full">
            {projects.filter(p => p.estat !== 'arxivat').length}
          </span>
        </button>
        <button
          onClick={() => setTab('arxivats')}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition -mb-px flex items-center gap-1.5 cursor-pointer ${
            tab === 'arxivats'
              ? 'border-[#234e70] text-[#234e70] font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Archive className="w-3.5 h-3.5" />
          Projectes Arxivats
          <span className="bg-slate-100 text-slate-600 font-bold text-xs px-2 py-0.5 rounded-full">
            {projects.filter(p => p.estat === 'arxivat').length}
          </span>
        </button>
      </div>

      {/* Grid of Projects Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects
          .filter(p => {
            if (tab === 'arxivats') return p.estat === 'arxivat';
            return p.estat !== 'arxivat';
          })
          .map(proj => {
            const client = clients.find(c => c.id === proj.clientId);
            const projEntries = timeEntries.filter(e => e.projecteId === proj.id);
            const projTasks = tasks.filter(t => t.projecteId === proj.id);

            // Calculations
            const totalMins = projEntries.reduce((p, n) => p + n.duradaMinuts, 0);
            const totalHours = totalMins / 60;
            const totalEarnings = projEntries.reduce((sum, e) => sum + (e.facturable ? (e.importCalculat || 0) : 0), 0);

            // Weekly details (last 7 days calculated)
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const totalWeeklyMins = projEntries
              .filter(e => new Date(e.data) >= weekAgo)
              .reduce((sum, e) => sum + e.duradaMinuts, 0);

            // Budget Deviation percentages
            const percentExceeded = proj.pressupostHores ? Math.round((totalHours / proj.pressupostHores) * 100) : 0;
            const budgetWarn = proj.pressupostHores ? totalHours > proj.pressupostHores : false;

            return (
              <div
                key={proj.id}
                className={`bg-white rounded-lg shadow-sm border border-slate-100 p-5 flex flex-col justify-between hover:border-slate-200 transition duration-150 ${
                  proj.estat === 'arxivat' ? 'bg-slate-50/50 opacity-80 shadow-xs' : ''
                }`}
              >
                <div>
                  {/* Visual state headers */}
                  <div className="flex justify-between items-start border-b border-slate-50 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: proj.color || '#CBD5E1' }} />
                      <div>
                        <span className="text-xs text-slate-400 font-mono font-semibold block uppercase">Client: {client?.nom || 'Desconegut'}</span>
                        <h3 className="font-sans font-bold text-slate-800 text-sm mt-0.5">{proj.nom}</h3>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                      proj.estat === 'actiu'
                        ? 'bg-[#edf3f8] text-[#193c58] border border-slate-200'
                        : proj.estat === 'pausat'
                        ? 'bg-amber-50 text-amber-700 border border-amber-100'
                        : proj.estat === 'finalitzat'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-slate-250 text-slate-600 border border-slate-300/40 bg-slate-100'
                    }`}>
                      {proj.estat}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2 min-h-[32px] italic">{proj.descripcio || 'Sense descripció genèrica'}</p>

                  {/* Hours & Billings widget blocks */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 border border-slate-100/50 rounded-lg p-3 my-4">
                    <div>
                      <span className="text-[11px] text-slate-400 uppercase font-bold tracking-tight block">Treballat</span>
                      <span className="text-[11px] font-mono font-bold text-slate-800 mt-0.5 block">{totalHours.toFixed(1)} h</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 uppercase font-bold tracking-tight block">Últims 7d</span>
                      <span className="text-[11px] font-mono font-medium text-slate-600 mt-0.5 block">{(totalWeeklyMins / 60).toFixed(1)} h</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 uppercase font-bold tracking-tight block">Generat</span>
                      <span className="text-[11px] font-mono font-bold text-slate-800 mt-0.5 block text-right">
                        {db.settings.showAmountsByDefault ? formatCurrency(totalEarnings, db.settings.currency) : '***'}
                      </span>
                    </div>
                  </div>

                  {/* Deviations warning display */}
                  {proj.pressupostHores ? (
                    <div className="space-y-1 my-3 bg-slate-50 p-2 border border-slate-100 rounded-lg">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-medium text-slate-500">Ús del pressupost hores ({proj.pressupostHores}h)</span>
                        <span className={`font-mono font-bold ${budgetWarn ? 'text-red-600 ' : 'text-slate-705'}`}>{percentExceeded}%</span>
                      </div>

                      <div className="w-full bg-slate-250 h-2 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${Math.min(100, percentExceeded)}%` }}
                          className={`h-full rounded-full ${budgetWarn ? 'bg-red-500' : 'bg-[#234e70]'}`}
                        />
                      </div>
                      {budgetWarn && (
                        <span className="text-[11px] text-red-500 font-bold flex items-center gap-0.5">
                          <AlertTriangle className="w-3 h-3 text-red-500" /> Atenció: Pressupost excedit en {(totalHours - proj.pressupostHores).toFixed(1)}h!
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic block mt-2">No s'ha definit sostre hores límit per aquest projecte.</span>
                  )}

                  {/* Additional parameters */}
                  <div className="space-y-1.5 text-xs text-slate-500 pt-3 border-t border-slate-50 mt-4">
                    <div className="flex justify-between">
                      <span>Data d'Inici:</span>
                      <span className="font-semibold text-slate-700">{proj.dataInici}</span>
                    </div>
                    {proj.dataFinalitzacioPrevista && (
                      <div className="flex justify-between">
                        <span>Prev. Finalització:</span>
                        <span className="font-semibold text-slate-705">{proj.dataFinalitzacioPrevista}</span>
                      </div>
                    )}
                    {proj.tarifaHoraria && (
                      <div className="flex justify-between border-t border-slate-50/50 pt-1">
                        <span>Tarifa base enllaçable:</span>
                        <span className="font-mono font-semibold text-slate-700">{proj.tarifaHoraria} {db.settings.currency}/h</span>
                      </div>
                    )}
                  </div>

                  {/* Task categories display */}
                  {projTasks.length > 0 && (
                    <div className="mt-3 bg-[#edf3f8]/20 border border-slate-200/20 rounded p-2 text-xs text-slate-500">
                      <span className="font-bold text-slate-600 block mb-1">Tasques ({projTasks.length}):</span>
                      <div className="flex flex-wrap gap-1">
                        {projTasks.map(t => (
                          <span key={t.id} className="bg-white border border-slate-100/50 px-1.5 py-0.5 rounded text-[11px]">
                            {t.nom}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-50 mt-5">
                  <button
                    type="button"
                    onClick={() => {
                      const nextEstat = proj.estat === 'arxivat' ? 'actiu' : 'arxivat';
                      onUpdateProject({ ...proj, estat: nextEstat, dataModificacio: new Date().toISOString() });
                    }}
                    className={`p-1 px-2.5 hover:bg-slate-100 text-[11px] font-bold rounded flex items-center gap-1 transition cursor-pointer ${
                      proj.estat === 'arxivat' ? 'text-emerald-600 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100' : 'text-amber-600 bg-amber-50/40 border border-amber-100/30 hover:bg-amber-100/40'
                    }`}
                    title={proj.estat === 'arxivat' ? 'Restaurar de l\'arxiu' : 'Arxivar projecte'}
                  >
                    <Archive className="w-3.5 h-3.5" />
                    {proj.estat === 'arxivat' ? 'Activar' : 'Arxivar'}
                  </button>

                  <button
                    onClick={() => startEdit(proj)}
                    className="p-1 px-2 hover:bg-slate-100 text-slate-650 hover:text-[#234e70] rounded flex items-center gap-1 text-[11px] font-semibold cursor-pointer border border-slate-100"
                    id={`btn-edit-project-${proj.id}`}
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Editar
                  </button>

                  <button
                    onClick={() => handleDeleteProject(proj)}
                    className="p-1 px-2 hover:bg-slate-150 text-slate-400 hover:text-red-650 rounded flex items-center gap-1 text-[11px] cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Eliminar
                  </button>
                </div>
              </div>
            );
          })}
      </div>

    </div>
  );
}
