import React, { useState } from 'react';
import { LocalDatabase, Task, TaskStatus, Project, WorkBlock, WorkBlockType, QuoteRateBand } from '../types';
import { Plus, Edit3, Trash2, CheckCircle2, Circle, Clock, Briefcase, Eye, AlertTriangle, Kanban, LayoutGrid, RotateCcw, Play, Check } from 'lucide-react';
import { formatDuration, formatCurrency } from '../utils/timeUtils';
import { buildQuoteSummary, getTaskQuoteInputs, hoursRange, quoteRange } from '../utils/quotation';

interface TasksViewProps {
  db: LocalDatabase;
  onAddBlock: (bloc: WorkBlock) => void;
  onUpdateBlock: (bloc: WorkBlock) => void;
  onDeleteBlock: (id: string) => void;
  onAddTask: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
}

export default function TasksView({ db, onAddBlock, onUpdateBlock, onDeleteBlock, onAddTask, onUpdateTask, onDeleteTask }: TasksViewProps) {
  const { tasks, projects, clients, timeEntries, blocs } = db;

  // Active projects list
  const activeProjects = projects.filter(p => p.estat !== 'arxivat');

  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Form fields
  const [projecteId, setProjecteId] = useState('');
  const [nom, setNom] = useState('');
  const [descripcio, setDescripcio] = useState('');
  const [categoria, setCategoria] = useState('');
  const [estat, setEstat] = useState<TaskStatus>('pendent');
  const [blocId, setBlocId] = useState('');
  type DraftRate = { id: string; concepte: string; horesMin: string; horesMax: string; tarifa: string };
  const [draftRates, setDraftRates] = useState<DraftRate[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState('all');
  const [editingBlock, setEditingBlock] = useState<WorkBlock | null>(null);
  const [blockName, setBlockName] = useState('');
  const [blockType, setBlockType] = useState<WorkBlockType>('fase');
  const [blockDescription, setBlockDescription] = useState('');
  const [blockError, setBlockError] = useState('');
  const [blockFormOpen, setBlockFormOpen] = useState(false);
  const newDraft = (): DraftRate => ({ id: `tram-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, concepte: '', horesMin: '', horesMax: '', tarifa: '' });
  const selectedProject = projects.find(p => p.id === projecteId);
  const projectBlocks = blocs.filter(b => b.projecteId === projecteId).sort((a, b) => a.ordre - b.ordre);
  const previewRates: QuoteRateBand[] = draftRates.filter(t => t.horesMin !== '' && t.horesMax !== '' && t.tarifa !== '').map(t => ({
    id: t.id, concepte: t.concepte, horesMin: Number(t.horesMin), horesMax: Number(t.horesMax), tarifa: Number(t.tarifa),
  }));
  const previewQuote = selectedProject && previewRates.length && previewRates.length === draftRates.length
    ? buildQuoteSummary([{id: editingTask?.id ?? 'preview', nom, projecteId, estat, pressupostTrams: previewRates} as Task], selectedProject, db.settings)
    : null;

  const openCreateBlock = () => {
    setEditingBlock(null); setBlockName(''); setBlockDescription(''); setBlockType('fase'); setBlockError(''); setBlockFormOpen(true);
  };
  const openEditBlock = (block: WorkBlock) => {
    setEditingBlock(block); setBlockName(block.nom); setBlockDescription(block.descripcio || ''); setBlockType(block.tipus); setBlockError(''); setBlockFormOpen(true);
  };
  const saveBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProjectSelected) { setBlockError('Selecciona primer un projecte.'); return; }
    if (!blockName.trim()) { setBlockError('Introdueix el nom del bloc.'); return; }
    if (blocs.some(b => b.projecteId === activeProjectSelected.id && b.nom.trim().toLowerCase() === blockName.trim().toLowerCase() && b.id !== editingBlock?.id)) {
      setBlockError('Ja hi ha un bloc amb aquest nom en aquest projecte.'); return;
    }
    const now = new Date().toISOString();
    const block: WorkBlock = { id: editingBlock?.id ?? `b-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, projecteId: activeProjectSelected.id,
      nom: blockName.trim(), tipus: blockType, descripcio: blockDescription.trim() || undefined,
      ordre: editingBlock?.ordre ?? blocs.filter(b => b.projecteId === activeProjectSelected.id).length,
      dataCreacio: editingBlock?.dataCreacio ?? now, dataModificacio: now };
    if (editingBlock) onUpdateBlock(block); else onAddBlock(block);
    setBlockFormOpen(false);
  };

  const [formError, setFormError] = useState<string | null>(null);

  // Tab filter: 'all' or an active project's ID
  const [selectedProjectIdFilter, setSelectedProjectIdFilter] = useState<string>('all');
  // Visual presentation mode
  const [viewMode, setViewMode] = useState<'kanban' | 'grid'>('kanban');
  // Option to show or hide archived tasks
  const [showArchived, setShowArchived] = useState(false);

  const startCreate = () => {
    setEditingTask(null);
    // Auto pre-select the currently active project tab if any is selected (not 'all')
    const currentPreselected = selectedProjectIdFilter !== 'all' ? selectedProjectIdFilter : (activeProjects[0]?.id || '');
    setProjecteId(currentPreselected);
    setNom('');
    setDescripcio('');
    setCategoria('');
    setBlocId(selectedBlockId !== 'all' && selectedBlockId !== 'none' ? selectedBlockId : '');
    setEstat('pendent');
    setDraftRates([]);
    setFormError(null);
    setShowForm(true);
  };

  const startEdit = (task: Task) => {
    setEditingTask(task);
    setProjecteId(task.projecteId);
    setNom(task.nom);
    setDescripcio(task.descripcio || '');
    setCategoria(task.categoria || '');
    setBlocId(task.blocId || '');
    setEstat(task.estat);
    if (Array.isArray(task.pressupostTrams)) {
      setDraftRates(task.pressupostTrams.map(r => ({ id:r.id, concepte:r.concepte || '', horesMin:String(r.horesMin), horesMax:String(r.horesMax), tarifa:String(r.tarifa) })));
    } else {
      const min = task.horesEstimadesMin ?? task.pressupostHores;
      const max = task.horesEstimadesMax ?? task.pressupostHores;
      const proj = projects.find(p => p.id === task.projecteId);
      const defaultRate = task.tarifaHorariaPressupost ?? proj?.tarifaHoraria ?? db.settings.defaultHourlyRate;
      setDraftRates(min === undefined && max === undefined ? [] : [{ id:`tram-${Date.now()}`, concepte:'', horesMin:String(min ?? ''), horesMax:String(max ?? ''), tarifa:String(defaultRate) }]);
    }
    setFormError(null);
    setShowForm(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) {
      setFormError('El nom de la tasca és obligatori.');
      return;
    }
    if (!projecteId) {
      setFormError('Has de triar obligatòriament un Projecte associat.');
      return;
    }

    const partial = draftRates.some(t => [t.horesMin, t.horesMax, t.tarifa].some(value => value.trim() === ''));
    if (partial) { setFormError('Completa les hores mínimes, les màximes i la tarifa de cada tram. Per a hores gratuïtes, posa 0 a la tarifa.'); return; }
    const rated: QuoteRateBand[] = draftRates.map(t => ({ id:t.id, concepte:t.concepte.trim() || undefined,
      horesMin:Number(t.horesMin), horesMax:Number(t.horesMax), tarifa:Number(t.tarifa) }));
    if (rated.some(t => !Number.isFinite(t.horesMin) || !Number.isFinite(t.horesMax) || !Number.isFinite(t.tarifa) || t.horesMin < 0 || t.horesMax < t.horesMin || t.tarifa < 0)) {
      setFormError('Revisa els trams: mínim ≤ màxim i tarifa ≥ 0.'); return;
    }
    if (rated.length && !rated.some(t => t.horesMax > 0)) {
      setFormError('Introdueix alguna hora estimada o elimina els trams buits.'); return;
    }
    if (blocId && !blocs.some(b => b.id === blocId && b.projecteId === projecteId)) {
      setFormError('El bloc seleccionat no pertany a aquest projecte.'); return;
    }
    const min = rated.length ? rated.reduce((sum, r) => sum + r.horesMin, 0) : undefined;
    const max = rated.length ? rated.reduce((sum, r) => sum + r.horesMax, 0) : undefined;

    const payload: Task = {
      ...(editingTask ?? {}),
      id: editingTask ? editingTask.id : `t-${Date.now()}`,
      projecteId,
      nom,
      descripcio: descripcio || undefined,
      categoria: categoria || undefined,
      blocId: blocId || undefined,
      estat,
      // El màxim conserva el control de pressupost existent sense canviar els registres.
      pressupostHores: max,
      horesEstimadesMin: min,
      horesEstimadesMax: max,
      tarifaHorariaPressupost: undefined,
      pressupostTrams: rated.length ? rated : undefined,
      dataCreacio: editingTask ? editingTask.dataCreacio : new Date().toISOString(),
      dataModificacio: new Date().toISOString()
    };

    if (editingTask) {
      onUpdateTask(payload);
    } else {
      onAddTask(payload);
    }

    setShowForm(false);
  };

  const handleDeleteTask = (task: Task) => {
    const hasEntries = timeEntries.some(e => e.tascaId === task.id);
    if (hasEntries) {
      alert(`No es pot eliminar la tasca "${task.nom}" perquè té registres d’hores de temps vinculats a la base de dades. Pots canviar el seu estat a "arxivada".`);
      return;
    }

    if (window.confirm(`Segur que vols eliminar definitivament la tasca: "${task.nom}"?`)) {
      onDeleteTask(task.id);
    }
  };

  // Quick status state advancement
  const handlePromoStatus = (task: Task, nextEstat: TaskStatus) => {
    onUpdateTask({
      ...task,
      estat: nextEstat,
      dataModificacio: new Date().toISOString()
    });
  };

  // Filter tasks based on the active tab list
  const activeProjectIds = activeProjects.map(p => p.id);
  const filteredTasks = tasks.filter(t => {
    // 1. Filter by Project Selected
    if (selectedProjectIdFilter === 'all') {
      // Must be an active project (not archived)
      if (!activeProjectIds.includes(t.projecteId)) return false;
    } else {
      if (t.projecteId !== selectedProjectIdFilter) return false;
    }

    // 2. Optional intermediate block filter (only available within one project).
    if (selectedProjectIdFilter !== 'all' && selectedBlockId !== 'all') {
      if (selectedBlockId === 'none' ? !!t.blocId : t.blocId !== selectedBlockId) return false;
    }
    // 3. Filter out archived task unless requested
    if (!showArchived && t.estat === 'arxivada') {
      return false;
    }

    return true;
  });

  // Calculate detailed variables if one active project is selected
  const activeProjectSelected = selectedProjectIdFilter !== 'all' ? activeProjects.find(p => p.id === selectedProjectIdFilter) : null;
  const projectClientName = activeProjectSelected ? clients.find(c => c.id === activeProjectSelected.clientId)?.nom : null;
  
  // Total hours registered for the selected project
  const projectEntries = activeProjectSelected ? timeEntries.filter(e => e.projecteId === activeProjectSelected.id) : [];
  const totalMinsWorked = projectEntries.reduce((sum, e) => sum + e.duradaMinuts, 0);
  const totalHoursWorked = totalMinsWorked / 60;

  return (
    <div className="space-y-6" id="view-tasks">
      
      {/* Top operational controls and title bar */}
      <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-base font-sans font-semibold text-slate-900">Tauler de Tasques Operatives</h2>
          <p className="text-xs text-slate-400 mt-0.5">Controla i planifica el teu backlog diari dividit per cadascun dels teus projectes actius.</p>
        </div>

        <div className="flex flex-wrap gap-2.5 items-center w-full md:w-auto">
          {/* Show/Hide Archived Tasks Toggle */}
          <label className="flex items-center gap-2 text-xs text-slate-500 font-medium cursor-pointer py-1 px-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-100 transition shrink-0 select-none">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={() => setShowArchived(!showArchived)}
              className="rounded text-[#234e70] focus:ring-[#234e70] w-3.5 h-3.5"
            />
            <span>Visualitza Arxivades</span>
          </label>

          {/* View Presentation Toggle Buttons */}
          <div className="flex bg-slate-50 border border-slate-150 rounded-lg p-0.5 shrink-0">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 px-3 rounded-md text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-white shadow text-slate-900'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Vista en Columnes Kanban"
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Tauler Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 px-3 rounded-md text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white shadow text-slate-900'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Vista en Graella"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Llista Graella</span>
            </button>
          </div>

          <button
            onClick={startCreate}
            id="btn-add-task"
            className="bg-[#234e70] hover:bg-[#193c58] text-white font-bold text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Crear Tasca
          </button>
        </div>
      </div>

      {/* Horizontal Tab bar to dynamically switch active project contexts */}
      <div className="bg-white border border-slate-100 shadow-xs rounded-lg p-2.5">
        <div className="text-xs text-slate-400 font-sans uppercase font-bold tracking-wider px-2.5 mb-2">
          Projectes Actius a Consultar:
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => { setSelectedProjectIdFilter('all'); setSelectedBlockId('all'); }}
            className={`px-3.5 py-2.5 text-xs font-bold rounded-lg border transition cursor-pointer flex items-center gap-2 ${
              selectedProjectIdFilter === 'all'
                ? 'bg-[#234e70] text-white border-[#234e70] shadow-xs'
                : 'bg-slate-50 text-slate-600 border-slate-200/60 hover:bg-slate-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full shrink-0 bg-blue-400" />
            <span>Tots els Projectes Actius</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold font-mono ${
              selectedProjectIdFilter === 'all' ? 'bg-blue-750 text-white' : 'bg-slate-200/80 text-slate-700'
            }`}>
              {tasks.filter(t => activeProjectIds.includes(t.projecteId) && (showArchived || t.estat !== 'arxivada')).length}
            </span>
          </button>

          {activeProjects.map(proj => {
            const count = tasks.filter(t => t.projecteId === proj.id && (showArchived || t.estat !== 'arxivada')).length;
            const client = clients.find(c => c.id === proj.clientId);
            return (
              <button
                key={proj.id}
                onClick={() => { setSelectedProjectIdFilter(proj.id); setSelectedBlockId('all'); }}
                className={`px-3.5 py-2.5 text-xs font-semibold rounded-lg border transition flex items-center gap-2 cursor-pointer ${
                  selectedProjectIdFilter === proj.id
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs font-bold'
                    : 'bg-white text-slate-700 border-slate-200/65 hover:bg-slate-50'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: proj.color || '#CBD5E1' }} />
                <span>{proj.nom}</span>
                {client && <span className="text-xs opacity-60 font-normal">({client.nom})</span>}
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold font-mono ${
                  selectedProjectIdFilter === proj.id ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}

          {activeProjects.length === 0 && (
            <div className="text-xs text-slate-400 italic p-2 select-none">
              No s'han creat projectes actius. Configura primers l'apartat de "Projectes".
            </div>
          )}
        </div>
      </div>

      {/* Optional Selected Project Banner widget */}
      {activeProjectSelected && (
        <div className="bg-slate-50 border border-slate-200/70 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ">
          <div className="flex items-center gap-3">
            <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: activeProjectSelected.color || '#94A3B8' }} />
            <div>
              <span className="text-[11px] text-slate-400 font-bold block uppercase tracking-wide">Vista Detallada del Projecte</span>
              <h3 className="text-slate-800 font-bold text-xs font-sans">
                {activeProjectSelected.nom} <span className="text-slate-400 font-normal">({projectClientName || 'Sense Client'})</span>
              </h3>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-mono text-slate-650">
            <div>
              <span className="text-[11px] uppercase text-slate-400 font-sans font-semibold block">Total Treballat</span>
              <span className="text-slate-800 font-bold">{totalHoursWorked.toFixed(1)} h</span>
            </div>
            {activeProjectSelected.pressupostHores && (
              <div>
                <span className="text-[11px] uppercase text-slate-400 font-sans font-semibold block">Límit Sostre</span>
                <span className="text-slate-800 font-bold">{activeProjectSelected.pressupostHores}h</span>
              </div>
            )}
            <div>
              <span className="text-[11px] uppercase text-slate-400 font-sans font-semibold block">Iniciat el</span>
              <span className="text-slate-800 font-semibold">{activeProjectSelected.dataInici}</span>
            </div>
          </div>
        </div>
      )}

      {/* Optional intermediate structure: Projecte → Bloc de treball → Tasca */}
      {activeProjectSelected && (
        <section className="bg-white border border-slate-200 rounded-lg p-4 space-y-3" aria-label="Blocs de treball">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div><h3 className="text-sm font-semibold text-slate-900">Blocs de treball</h3>
              <p className="text-xs text-slate-600 mt-1">Agrupa tasques per fase, lliurable o funcionalitat. És opcional.</p></div>
            <button type="button" onClick={openCreateBlock} className="px-3 py-2 border border-slate-300 rounded-md text-xs font-semibold text-[#234e70]">+ Crear bloc</button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setSelectedBlockId('all')} className={`px-3 py-2 rounded-md border text-xs ${selectedBlockId === 'all' ? 'bg-[#edf3f8] border-[#234e70] font-semibold' : 'border-slate-200'}`}>Totes les tasques</button>
            {blocs.filter(b => b.projecteId === activeProjectSelected.id).sort((a,b) => a.ordre - b.ordre).map(b => (
              <div key={b.id} className="flex items-center border border-slate-200 rounded-md overflow-hidden">
                <button type="button" onClick={() => setSelectedBlockId(b.id)} className={`px-3 py-2 text-xs ${selectedBlockId === b.id ? 'bg-[#edf3f8] font-semibold' : ''}`}>{b.nom} <span className="text-slate-500">({tasks.filter(t => t.blocId === b.id).length})</span></button>
                <button type="button" onClick={() => openEditBlock(b)} className="px-2 py-2 text-xs border-l border-slate-200 text-slate-500" aria-label={`Editar bloc ${b.nom}`}><Edit3 className="w-3 h-3" /></button>
                <button type="button" onClick={() => { if (window.confirm(`Vols eliminar el bloc ${b.nom}? Només es pot eliminar si no té tasques.`)) onDeleteBlock(b.id); }} className="px-2 py-2 text-xs border-l border-slate-200 text-slate-500" aria-label={`Eliminar bloc ${b.nom}`}><Trash2 className="w-3 h-3" /></button>
              </div>
            ))}
            <button type="button" onClick={() => setSelectedBlockId('none')} className={`px-3 py-2 rounded-md border text-xs ${selectedBlockId === 'none' ? 'bg-[#edf3f8] border-[#234e70] font-semibold' : 'border-slate-200'}`}>Sense bloc</button>
          </div>
        </section>
      )}
      {blockFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <form onSubmit={saveBlock} className="bg-white rounded-lg shadow-xl border border-slate-200 p-5 w-full max-w-md space-y-4">
            <h3 className="font-semibold text-slate-900">{editingBlock ? 'Editar bloc de treball' : 'Crear bloc de treball'}</h3>
            <label className="text-xs font-medium text-slate-700 block">Nom del bloc *
              <input required value={blockName} onChange={e=>setBlockName(e.target.value)} className="block w-full border border-slate-300 p-2 rounded-md mt-1" placeholder="Ex.: Automatització n8n" />
            </label>
            <label className="text-xs font-medium text-slate-700 block">Tipus
              <select value={blockType} onChange={e=>setBlockType(e.target.value as WorkBlockType)} className="block w-full border border-slate-300 p-2 rounded-md mt-1">
                <option value="fase">Fase</option><option value="lliurable">Lliurable</option><option value="funcionalitat">Funcionalitat</option>
                <option value="manteniment">Manteniment</option><option value="altre">Altres</option>
              </select>
            </label>
            <label className="text-xs font-medium text-slate-700 block">Descripció
              <textarea rows={3} value={blockDescription} onChange={e=>setBlockDescription(e.target.value)} className="block w-full border border-slate-300 p-2 rounded-md mt-1" />
            </label>
            {blockError && <p className="text-xs text-red-700">{blockError}</p>}
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setBlockFormOpen(false)} className="px-3 py-2 border border-slate-300 rounded-md text-xs">Cancel·lar</button>
              <button type="submit" className="px-3 py-2 bg-[#234e70] text-white rounded-md text-xs">Desar bloc</button></div>
          </form>
        </div>
      )}

      {/* CREATE/EDIT MODAL OVERLAY */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <form
            onSubmit={handleFormSubmit}
            className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden "
          >
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
              <h3 className="font-sans font-bold text-sm">
                {editingTask ? `Editar Tasca: ${editingTask.nom}` : 'Crear Nova Tasca'}
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
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Projecte Associat *</label>
                <select
                  required
                  value={projecteId}
                  onChange={e => { setProjecteId(e.target.value); setBlocId(''); }}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 cursor-pointer"
                >
                  <option value="">-- Tria un projecte --</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.nom} ({p.estat})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bloc de treball (opcional)</label>
                <select value={blocId} onChange={e => setBlocId(e.target.value)} className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white">
                  <option value="">Sense bloc · tasca directament al projecte</option>
                  {projectBlocks.map(b => <option key={b.id} value={b.id}>{b.nom} · {b.tipus}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nom descriptiu de la Tasca *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Dissenyar wireframes d'interfície..."
                  value={nom}
                  onChange={e => setNom(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Categoria</label>
                  <input
                    type="text"
                    placeholder="Ex: Disseny, Programació..."
                    value={categoria}
                    onChange={e => setCategoria(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Estat de resolució</label>
                  <select
                    value={estat}
                    onChange={e => setEstat(e.target.value as TaskStatus)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 cursor-pointer"
                  >
                    <option value="pendent">Pendent</option>
                    <option value="en curs">En Curs</option>
                    <option value="feta">Feta (Tancada)</option>
                    <option value="arxivada">Arxivada</option>
                  </select>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">Pressupost d'aquesta tasca</h4>
                  <p className="text-xs text-slate-600 mt-1">Afegeix un o diversos trams. Pots combinar tarifes diferents i posar <strong>0 €/h</strong> quan la dedicació no sigui facturable.</p>
                </div>
                {draftRates.map((rate, index) => (
                  <div key={rate.id} className="bg-white border border-slate-200 rounded-md p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-slate-700">Tram {index + 1}</span>
                      <button type="button" onClick={() => setDraftRates(rows => rows.filter(r => r.id !== rate.id))} className="text-xs text-slate-500 hover:text-red-700">Eliminar tram</button>
                    </div>
                    <label className="text-xs text-slate-600 block">Concepte (opcional)
                      <input type="text" value={rate.concepte} onChange={e => setDraftRates(rows => rows.map(r => r.id === rate.id ? {...r, concepte:e.target.value} : r))}
                        placeholder="Anàlisi, desenvolupament, revisió..." className="block mt-1 w-full border border-slate-300 rounded-md p-2 bg-white" />
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {([['horesMin', 'Mínim (h)'], ['horesMax', 'Màxim (h)'], ['tarifa', `${db.settings.currency}/h`]] as const).map(([field, title]) => (
                        <label key={field} className="text-xs font-medium text-slate-700">{title}
                          <input type="number" min="0" step={field === 'tarifa' ? '0.01' : '0.25'} value={rate[field]}
                            onChange={e => setDraftRates(rows => rows.map(r => r.id === rate.id ? {...r, [field]:e.target.value} : r))}
                            placeholder={field === 'tarifa' ? '0 o 50' : field === 'horesMin' ? '9' : '11'}
                            className="block mt-1 w-full border border-slate-300 rounded-md p-2 bg-white" />
                        </label>
                      ))}
                    </div>
                    {rate.tarifa === '0' && <p className="text-xs text-slate-600">Aquest tram compta hores, però té un import de 0 €.</p>}
                  </div>
                ))}
                <button type="button" onClick={() => setDraftRates(rows => [...rows, newDraft()])} className="text-xs font-semibold text-[#234e70] border border-slate-300 bg-white rounded-md px-3 py-2">+ Afegir tram d'hores</button>
                {!draftRates.length && <p className="text-xs text-slate-500">Sense estimació: la tasca es pot desar, però no es podrà incloure en un pressupost fins que tingui algun tram.</p>}
                {previewQuote && previewQuote.errors.length === 0 && (
                  <div className="border-t border-slate-200 pt-3 text-xs font-semibold text-[#234e70] flex justify-between gap-2 flex-wrap">
                    <span>{hoursRange(previewQuote.minHours, previewQuote.maxHours)}</span>
                    <span>Total estimat: {quoteRange(previewQuote.minAmount, previewQuote.maxAmount, db.settings.currency)}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Descripció addicional</label>
                <textarea rows={4} placeholder="Detalls a fer... (pots escriure diverses línies)" value={descripcio} onChange={e => setDescripcio(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 resize-y" />
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
                id="btn-confirm-save-task"
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm cursor-pointer"
              >
                Desar Tasca
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PRESENTATION OF RESULTS */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-lg p-12 text-center shadow-xs">
          <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h4 className="text-slate-700 font-bold text-sm">No s'han trobat subtasques operatives</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
            {selectedProjectIdFilter === 'all'
              ? "Afegeix una nova tasca associant-la a algun dels teus projectes actius per organitzar els teus objectius."
              : "Aquest projecte encara no té cap tasca guardada. Fes clic a 'Crear Tasca' per planificar els teus fites!"}
          </p>
        </div>
      ) : viewMode === 'kanban' ? (
        /* VISTA KANBAN: Column list segregated dynamically */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          
          {/* COLUMN 1: PENDENT */}
          <div className="bg-slate-50/70 rounded-lg border border-slate-150 p-4 space-y-3 min-h-[400px]">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                <span className="text-xs font-bold text-slate-750 uppercase">Pendents</span>
              </div>
              <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-full font-mono">
                {filteredTasks.filter(t => t.estat === 'pendent').length}
              </span>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {filteredTasks.filter(t => t.estat === 'pendent').map(task => (
                <TaskKanbanCard
                  key={task.id}
                  task={task}
                  projects={projects}
                  clients={clients}
                  timeEntries={timeEntries}
                  onEdit={startEdit}
                  onDelete={handleDeleteTask}
                  blocs={blocs}
                  showAmountsByDefault={db.settings.showAmountsByDefault}
                  currency={db.settings.currency}
                  selectedProjectIdFilter={selectedProjectIdFilter}
                  onPromoStatus={handlePromoStatus}
                />
              ))}
              {filteredTasks.filter(t => t.estat === 'pendent').length === 0 && (
                <div className="py-8 text-center text-slate-400 text-[11px] font-sans italic border border-dashed border-slate-200 rounded-lg">
                  Sense pendent backlog
                </div>
              )}
            </div>
          </div>

          {/* COLUMN 2: EN CURS */}
          <div className="bg-[#edf3f8]/20 rounded-lg border border-slate-200 p-4 space-y-3 min-h-[400px]">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-550 shrink-0 select-none " />
                <span className="text-xs font-bold text-[#234e70] uppercase">En Curs</span>
              </div>
              <span className="bg-[#deebf3] text-[#234e70] text-xs font-bold px-2 py-0.5 rounded-full font-mono">
                {filteredTasks.filter(t => t.estat === 'en curs').length}
              </span>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {filteredTasks.filter(t => t.estat === 'en curs').map(task => (
                <TaskKanbanCard
                  key={task.id}
                  task={task}
                  projects={projects}
                  clients={clients}
                  timeEntries={timeEntries}
                  onEdit={startEdit}
                  onDelete={handleDeleteTask}
                  blocs={blocs}
                  showAmountsByDefault={db.settings.showAmountsByDefault}
                  currency={db.settings.currency}
                  selectedProjectIdFilter={selectedProjectIdFilter}
                  onPromoStatus={handlePromoStatus}
                />
              ))}
              {filteredTasks.filter(t => t.estat === 'en curs').length === 0 && (
                <div className="py-8 text-center text-slate-400 text-[11px] font-sans italic border border-dashed border-slate-200/30 rounded-lg">
                  Cap tasca activa ara mateix
                </div>
              )}
            </div>
          </div>

          {/* COLUMN 3: FETA */}
          <div className="bg-emerald-50/20 rounded-lg border border-emerald-100 p-4 space-y-3 min-h-[400px]">
            <div className="flex justify-between items-center pb-2 border-b border-emerald-100/60">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-550 shrink-0" />
                <span className="text-xs font-bold text-emerald-800 uppercase">Tancades</span>
              </div>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full font-mono">
                {filteredTasks.filter(t => t.estat === 'feta').length}
              </span>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {filteredTasks.filter(t => t.estat === 'feta').map(task => (
                <TaskKanbanCard
                  key={task.id}
                  task={task}
                  projects={projects}
                  clients={clients}
                  timeEntries={timeEntries}
                  onEdit={startEdit}
                  onDelete={handleDeleteTask}
                  blocs={blocs}
                  showAmountsByDefault={db.settings.showAmountsByDefault}
                  currency={db.settings.currency}
                  selectedProjectIdFilter={selectedProjectIdFilter}
                  onPromoStatus={handlePromoStatus}
                />
              ))}
              {filteredTasks.filter(t => t.estat === 'feta').length === 0 && (
                <div className="py-8 text-center text-slate-400 text-[11px] font-sans italic border border-dashed border-emerald-100/30 rounded-lg">
                  Encara cap tancada avui
                </div>
              )}
            </div>
          </div>

        </div>
      ) : (
        /* VISTA GRAELLA: Standard card layouts */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTasks.map(task => {
            const project = projects.find(p => p.id === task.projecteId);
            const taskEntries = timeEntries.filter(e => e.tascaId === task.id);
            const totalMins = taskEntries.reduce((sum, e) => sum + e.duradaMinuts, 0);
            const totalEarnings = taskEntries.reduce((sum, e) => sum + (e.facturable ? (e.importCalculat || 0) : 0), 0);

            return (
              <div
                key={task.id}
                className={`bg-white rounded-lg shadow-sm border border-slate-100 p-5 flex flex-col justify-between hover:border-slate-205 transition duration-150 ${
                  task.estat === 'arxivada' ? 'bg-slate-50/50 opacity-80' : ''
                }`}
              >
                <div>
                  <div className="flex justify-between items-start border-b border-slate-50 pb-3 mb-3">
                    <div>
                      <span className="text-xs text-slate-400 font-mono font-semibold block uppercase">Projecte: {project?.nom || 'Desconegut'}</span>
                      <h3 className="font-sans font-bold text-slate-800 text-sm mt-0.5">{task.nom}</h3>
                      {task.blocId && <p className="text-xs text-slate-500 mt-1">Bloc: {blocs.find(b => b.id === task.blocId)?.nom ?? 'No disponible'}</p>}
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider shrink-0 ${
                      task.estat === 'pendent'
                        ? 'bg-slate-100 text-slate-600 border border-slate-200'
                        : task.estat === 'en curs'
                        ? 'bg-[#edf3f8] text-[#193c58] border border-slate-200'
                        : task.estat === 'feta'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-amber-50 text-amber-700 border border-amber-100'
                    }`}>
                      {task.estat}
                    </span>
                  </div>

                  {task.descripcio && (
                    <p className="text-xs whitespace-pre-line text-slate-500 min-h-[32px] mb-3 italic">{task.descripcio}</p>
                  )}

                  <div className="grid grid-cols-2 gap-2 bg-slate-50 border border-slate-100/50 rounded-lg p-3 my-4">
                    <div>
                      <span className="text-[11px] text-slate-400 uppercase font-bold tracking-tight block">Treball dedicat</span>
                      <span className="text-xs font-mono font-semibold text-slate-700 mt-0.5 block">{formatDuration(totalMins, 'decimal')}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 uppercase font-bold tracking-tight block">Facturat</span>
                      <span className="text-xs font-mono font-semibold text-slate-700 mt-0.5 block">
                        {db.settings.showAmountsByDefault ? formatCurrency(totalEarnings, db.settings.currency) : '***'}
                      </span>
                    </div>
                    <div className="col-span-2 pt-1.5 border-t border-slate-200/50 flex justify-between text-xs text-slate-400 font-medium">
                      <span>{taskEntries.length} Intervals de temps</span>
                      {task.categoria && <span className="text-slate-500 uppercase font-bold tracking-wide text-[11px] bg-slate-100 px-1 py-0.5 rounded">{task.categoria}</span>}
                    </div>
                  </div>

                  {project && task.horesEstimadesMin !== undefined && task.horesEstimadesMax !== undefined && (
                    <div className="text-xs text-slate-600 border-t border-slate-100 pt-2">
                      Estimació comercial: <strong>{hoursRange(task.horesEstimadesMin, task.horesEstimadesMax)}</strong> · {getTaskQuoteInputs(task, project, db.settings).hourlyRate === null ? 'diverses tarifes' : `${getTaskQuoteInputs(task, project, db.settings).hourlyRate} ${db.settings.currency}/h`}
                    </div>
                  )}
                  {task.pressupostHores && (
                    <div className="text-xs text-slate-500 font-mono flex items-center justify-between border-t border-slate-50 pt-2">
                      <span>Pressupost hores tasca:</span>
                      <span className="font-semibold text-slate-750">{(totalMins / 60).toFixed(1)}h / {task.pressupostHores}h</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-50 mt-4">
                  <button
                    onClick={() => startEdit(task)}
                    className="p-1 px-2 hover:bg-slate-100 text-slate-650 hover:text-[#234e70] rounded flex items-center gap-1 text-[11px] font-semibold cursor-pointer border border-slate-100"
                    id={`btn-edit-task-${task.id}`}
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Editar
                  </button>
                  <button
                    onClick={() => handleDeleteTask(task)}
                    className="p-1 px-2 hover:bg-slate-100 text-slate-400 hover:text-red-650 rounded flex items-center gap-1 text-[11px] cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

// INNER HOOK COMPONENT: GORGEOUS INDIVIDUAL KANBAN CARD
interface TaskKanbanCardProps {
  key?: string;
  task: Task;
  projects: Project[];
  clients: any[];
  timeEntries: any[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  blocs: WorkBlock[];
  showAmountsByDefault: boolean;
  currency: string;
  selectedProjectIdFilter: string;
  onPromoStatus: (task: Task, next: TaskStatus) => void;
}

function TaskKanbanCard({
  task,
  projects,
  clients,
  timeEntries,
  onEdit,
  onDelete,
  blocs,
  showAmountsByDefault,
  currency,
  selectedProjectIdFilter,
  onPromoStatus
}: TaskKanbanCardProps) {
  const project = projects.find(p => p.id === task.projecteId);
  const client = project ? clients.find(c => c.id === project.clientId) : null;
  const taskEntries = timeEntries.filter(e => e.tascaId === task.id);

  // Stats
  const totalMins = taskEntries.reduce((sum, e) => sum + e.duradaMinuts, 0);
  const totalEarnings = taskEntries.reduce((sum, e) => sum + (e.facturable ? (e.importCalculat || 0) : 0), 0);

  return (
    <div className="bg-white rounded-lg shadow-xs border border-slate-200/60 p-4 hover:shadow-sm hover:border-slate-300 transition duration-150 flex flex-col justify-between">
      <div>
        {/* Header summary of project context if in ALL view */}
        {selectedProjectIdFilter === 'all' && (
          <div className="flex items-center gap-1.5 mb-2 border-b border-slate-100 pb-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: project?.color || '#CBD5E1' }} />
            <span className="text-[11px] font-semibold text-slate-500 font-sans truncate" title={`${project?.nom} - ${client?.nom}`}>
              {project?.nom}
            </span>
          </div>
        )}

        <div className="flex justify-between items-start gap-2">
          <h4 className="font-bold text-slate-800 text-xs font-sans line-clamp-2 leading-tight">
            {task.nom}
          </h4>
          
          {task.categoria && (
            <span className="bg-slate-50 border border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0">
              {task.categoria}
            </span>
          )}
        </div>

        {task.blocId && <p className="text-[11px] text-slate-500 mt-1">Bloc: {blocs.find(b => b.id === task.blocId)?.nom ?? 'No disponible'}</p>}
        {task.descripcio && (
          <p className="whitespace-pre-line text-[11px] text-slate-450 mt-1.5 line-clamp-3 leading-relaxed border-l-2 border-slate-100 pl-2.5 italic">
            {task.descripcio}
          </p>
        )}

        {/* Small numeric panel worked/earnings */}
        <div className="grid grid-cols-2 gap-2 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-lg p-2 mt-3 text-[11px]">
          <div>
            <span className="text-[8px] text-slate-400 uppercase font-semibold block">Dedicat</span>
            <span className="font-mono text-slate-755 font-bold">{formatDuration(totalMins, 'decimal')}</span>
          </div>
          <div>
            <span className="text-[8px] text-slate-400 uppercase font-semibold block">Facturat</span>
            <span className="font-mono text-slate-755 font-bold text-right block">
              {showAmountsByDefault ? formatCurrency(totalEarnings, currency) : '***'}
            </span>
          </div>
        </div>

        {/* Task Notes brief status */}
        {task.notes && (
          <div className="mt-2.5 p-1.5 bg-amber-50/30 border border-amber-100/40 rounded text-xs text-slate-500 truncate italic" title={task.notes}>
            Nota: {task.notes}
          </div>
        )}

        {task.horesEstimadesMin !== undefined && task.horesEstimadesMax !== undefined && (
          <div className="mt-2 text-[11px] text-slate-600">Estimació: {hoursRange(task.horesEstimadesMin, task.horesEstimadesMax)}</div>
        )}
        {/* Hour limitation target */}
        {task.pressupostHores && (
          <div className="mt-2.5 flex justify-between items-center text-[10.5px] font-mono text-slate-500 pt-1.5 border-t border-slate-50">
            <span>Pressupost:</span>
            <span className={`font-bold ${totalMins / 60 > task.pressupostHores ? 'text-red-600 ' : 'text-slate-650'}`}>
              {(totalMins / 60).toFixed(1)}h / {task.pressupostHores}h
            </span>
          </div>
        )}
      </div>

      {/* Direct Kanban Operations and Edit Actions */}
      <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between gap-1">
        {/* Quick state change button cycles */}
        <div className="flex gap-1">
          {task.estat === 'pendent' && (
            <button
              onClick={() => onPromoStatus(task, 'en curs')}
              className="p-1 px-2.5 bg-[#edf3f8] hover:bg-[#deebf3] text-[#193c58] font-bold rounded-md hover:rounded flex items-center gap-1 text-[11px] cursor-pointer transition"
              title="Començar a treballar en aquesta tasca"
            >
              <Play className="w-2.5 h-2.5 fill-blue-700" />
              <span>Sempre Actiu</span>
            </button>
          )}

          {task.estat === 'en curs' && (
            <button
              onClick={() => onPromoStatus(task, 'feta')}
              className="p-1 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-md hover:rounded flex items-center gap-1 text-[11px] cursor-pointer transition"
              title="Finalitzar / tancar la tasca"
            >
              <Check className="w-2.5 h-2.5 text-emerald-800" />
              <span>Tancar</span>
            </button>
          )}

          {task.estat === 'feta' && (
            <button
              onClick={() => onPromoStatus(task, 'pendent')}
              className="p-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-md hover:rounded flex items-center gap-1 text-[11px] cursor-pointer transition"
              title="Reobrir la tasca"
            >
              <RotateCcw className="w-2.5 h-2.5 text-slate-600" />
              <span>Reobrir</span>
            </button>
          )}
        </div>

        {/* Context buttons */}
        <div className="flex gap-1.5">
          <button
            onClick={() => onEdit(task)}
            className="p-1 text-slate-450 hover:text-[#234e70] rounded cursor-pointer shrink-0 transition"
            title="Editar tasca"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(task)}
            className="p-1 text-slate-350 hover:text-red-650 rounded cursor-pointer shrink-0 transition"
            title="Eliminar tasca"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
