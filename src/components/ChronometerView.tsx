import { localToday } from '../utils/timeUtils';
import React, { useState, useEffect } from 'react';
import { LocalDatabase, Client, Project, Task, ActiveSession } from '../types';
import { Play, Pause, Square, AlertTriangle, Clock, Info, Check } from 'lucide-react';
import { formatDuration } from '../utils/timeUtils';
import { isSessionPaused, sessionPausedMs, sessionWorkedMs } from '../utils/sessionPause';

interface ChronometerViewProps {
  db: LocalDatabase;
  onStartSession: (session: ActiveSession) => void;
  onStopSession: (description: string, notes: string) => void;
  onPauseSession: () => void;
  onResumeSession: () => void;
  onUpdateActiveSession: (session: ActiveSession) => void;
  onUpdateTaskNotes: (taskId: string, notes: string) => void;
}

export default function ChronometerView({
  db,
  onStartSession,
  onStopSession,
  onPauseSession,
  onResumeSession,
  onUpdateActiveSession,
  onUpdateTaskNotes
}: ChronometerViewProps) {
  const { clients, projects, tasks, activeSession } = db;

  // Filter out inactive/archived unless needed
  const activeClients = clients.filter(c => c.estat === 'actiu');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [isFacturable, setIsFacturable] = useState(true);
  const [hourlyRate, setHourlyRate] = useState<number>(db.settings.defaultHourlyRate || 0);

  const [tickingMins, setTickingMins] = useState(0);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  // Dynamic projects list filtered by client
  const clientProjects = projects.filter(
    p => p.clientId === selectedClientId && p.estat !== 'arxivat' && p.estat !== 'finalitzat'
  );

  // Dynamic tasks list filtered by project
  const projectTasks = tasks.filter(
    t => t.projecteId === selectedProjectId && t.estat !== 'arxivada' && t.estat !== 'feta'
  );

  // Sync details when client/project changes
  useEffect(() => {
    if (selectedProjectId) {
      const proj = projects.find(p => p.id === selectedProjectId);
      if (proj) {
        setIsFacturable(true); // default
        if (proj.tarifaHoraria) {
          setHourlyRate(proj.tarifaHoraria);
        } else {
          setHourlyRate(db.settings.defaultHourlyRate || 0);
        }
      }
    }
  }, [selectedProjectId, db.settings.defaultHourlyRate]);

  // Handle active session ticker
  useEffect(() => {
    if (!activeSession) return;

    const computeDuration = () => {
      setTickingMins(Math.floor(sessionWorkedMs(activeSession) / 60000));
    };
    computeDuration();

    const interval = setInterval(computeDuration, 1000); // 1s visual update check
    return () => clearInterval(interval);
  }, [activeSession]);

  // Sync details and autosave when activeSession loads/changes
  useEffect(() => {
    if (activeSession) {
      setDescription(activeSession.descripcio || '');
      setNotes(activeSession.notes || '');
    } else {
      setDescription('');
      setNotes('');
    }
  }, [activeSession]);

  const handleDescriptionChange = (val: string) => {
    setDescription(val);
    if (activeSession) {
      onUpdateActiveSession({ ...activeSession, descripcio: val });
    }
  };

  const handleNotesChange = (val: string) => {
    setNotes(val);
    if (activeSession) {
      onUpdateActiveSession({ ...activeSession, notes: val });
    }
  };

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    setAlertMsg(null);

    if (!selectedClientId) {
      setAlertMsg('Has de seleccionar obligatòriament un Client.');
      return;
    }
    if (!selectedProjectId) {
      setAlertMsg('Has de seleccionar obligatòriament un Projecte.');
      return;
    }

    if (activeSession) {
      setAlertMsg('Ja tens una sessió activa de treball en curs.');
      return;
    }

    const todayStr = localToday();
    const hourStr = new Date().toLocaleTimeString('ca', { hour: '2-digit', minute: '2-digit' });

    const newSession: ActiveSession = {
      clientId: selectedClientId,
      projecteId: selectedProjectId,
      tascaId: selectedTaskId || undefined,
      data: todayStr,
      horaInici: hourStr,
      facturable: isFacturable,
      tarifaHoraria: isFacturable ? hourlyRate : 0,
      descripcio: description,
      startedTimestamp: Date.now()
    };

    onStartSession(newSession);
    
    // Clear inputs
    setDescription('');
    setNotes('');
  };

  const handleStop = () => {
    onStopSession(description, notes);
    // Flush local tracker specific inputs
    setDescription('');
    setNotes('');
  };

  const renderActiveSessionCard = () => {
    if (!activeSession) return null;

    const sessClient = clients.find(c => c.id === activeSession.clientId);
    const sessProject = projects.find(p => p.id === activeSession.projecteId);
    const sessTask = activeSession.tascaId ? tasks.find(t => t.id === activeSession.tascaId) : null;

    // Check if session exceeds maximum suspicious duration (e.g., default 8h or settings.maxActiveSessionHours)
    const paused = isSessionPaused(activeSession);
    const pauseMins = Math.floor(sessionPausedMs(activeSession) / 60000);
    const tooLong = tickingMins / 60 > (db.settings.maxActiveSessionHours || 10);

    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-100 p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${paused ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            <div>
              <h2 className="text-base font-sans font-semibold text-slate-800">{paused ? 'Sessió en pausa' : 'Sessió de temps en execució'}</h2>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">Iniciada a les {activeSession.horaInici} ({activeSession.data})</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-3 py-1 rounded-md ${paused ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>
              {paused ? 'Pausada' : 'En curs'}
            </span>
            {tooLong && (
              <span className="text-xs bg-amber-50 text-amber-700 font-bold px-3 py-1 rounded-full flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                Sessió Sospitosament Llarga!
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">Client</span>
                <span className="text-sm font-semibold text-slate-800 mt-1 block">{sessClient?.nom || 'Desconegut'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">Projecte</span>
                <span className="text-sm font-semibold text-slate-800 mt-1 block">
                  <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: sessProject?.color || '#cbd5e1' }} />
                  {sessProject?.nom || 'Desconegut'}
                </span>
                {sessTask && (
                  <span className="text-xs text-slate-500 mt-0.5 block italic">&gt; {sessTask.nom}</span>
                )}
              </div>
            </div>

            <div>
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">Descripció del treball actual</span>
              <input
                type="text"
                placeholder="Ex: Disseny conceptual, programació, integració..."
                value={description}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg p-3 mt-1.5 focus:ring-1 focus:ring-[#234e70] outline-none font-medium text-slate-700"
              />
            </div>

            {/* Notes and Task Details Section with Autosave */}
            <div className="space-y-4 pt-4 border-t border-slate-50">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1 flex justify-between">
                  <span>Notes Internes de la sessió (desades en temps real)</span>
                  <span className="text-[11px] text-slate-400 italic">Es guarden automàticament</span>
                </label>
                <textarea
                  placeholder="Escriu notes o comentaris de la feina que es fa ara mateix..."
                  rows={2}
                  value={notes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:ring-1 focus:ring-[#234e70] outline-none resize-none text-slate-700"
                />
              </div>

              {/* Live Task Notes Integration */}
              {sessTask && (
                <div className="bg-amber-50/50 border border-amber-200/50 rounded-lg p-4 mt-2 space-y-2">
                  <div className="flex justify-between items-center bg-amber-100/30 p-1.5 px-2.5 rounded-lg border border-amber-200/20">
                    <span className="text-xs text-amber-800 font-bold uppercase tracking-wider">Notes de la Tasca "{sessTask.nom}"</span>
                    <span className="text-[11px] text-amber-600 bg-amber-100/50 px-2 py-0.5 rounded font-semibold">Desat automàtic</span>
                  </div>
                  <textarea
                    placeholder="Escriu i modifica les notes permanents de la tasca aquí mateix..."
                    rows={3}
                    value={sessTask.notes || ''}
                    onChange={(e) => {
                      onUpdateTaskNotes(sessTask.id, e.target.value);
                    }}
                    className="w-full text-xs border border-amber-200/60 rounded-lg p-2.5 bg-white text-slate-700 focus:ring-1 focus:ring-amber-500 outline-none resize-none"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-lg p-5 flex flex-col justify-between items-center text-center">
            <div className="space-y-2">
              <Clock className="w-10 h-10 text-emerald-500 mx-auto " />
              <div className="text-4xl font-mono font-bold text-slate-800 tracking-tight">
                {formatDuration(tickingMins, 'clock')}
              </div>
              <p className="text-xs text-slate-500 font-medium">{paused ? 'Temps treballat · comptador aturat' : 'Temps treballat · comptador en marxa'}</p>
              {pauseMins > 0 && <p className="text-xs text-slate-500">Pauses acumulades: {formatDuration(pauseMins, 'clock')}</p>}
            </div>

            <div className="w-full space-y-2 pt-4">
              <div className="text-xs text-slate-500 font-mono">
                {activeSession.facturable ? (
                  <span className="text-emerald-600 font-semibold flex items-center justify-center gap-1 bg-emerald-50 border border-emerald-100 rounded-lg py-1 px-2">
                    Facturable: {activeSession.tarifaHoraria} {db.settings.currency}/h
                  </span>
                ) : (
                  <span className="text-slate-500 flex items-center justify-center gap-1 bg-slate-100 rounded-lg py-1 px-2">
                    No Facturable
                  </span>
                )}
              </div>
              
              <button
                type="button"
                onClick={paused ? onResumeSession : onPauseSession}
                id="btn-pause-resume-active-session"
                className={`w-full border font-semibold text-sm py-2.5 rounded-md flex items-center justify-center gap-2 ${paused ? 'bg-[#234e70] hover:bg-[#1b3f5c] text-white border-[#234e70]' : 'bg-white text-[#234e70] border-[#234e70] hover:bg-slate-50'}`}
              >
                {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                {paused ? 'Reprendre sessió' : 'Pausar sessió'}
              </button>
              <button
                onClick={handleStop}
                id="btn-stop-active-session"
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold text-xs py-2.5 rounded-lg transition duration-200 shadow-sm cursor-pointer flex items-center justify-center gap-2"
              >
                <Square className="w-3.5 h-3.5 fill-white" />
                Aturar i Desar temps
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6" id="view-chronometer">
      
      {activeSession ? (
        renderActiveSessionCard()
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Form Side */}
          <form onSubmit={handleStart} className="md:col-span-2 bg-white rounded-lg shadow-sm border border-slate-100 p-6 space-y-5">
            <div>
              <h2 className="text-lg font-sans font-semibold text-slate-900">Nou registre amb Cronòmetre</h2>
              <p className="text-xs text-slate-400 mt-0.5">Defineix el client, projecte i tasca per començar la nova sessió.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Client Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Client OBLIGATORI *</label>
                <select
                  required
                  value={selectedClientId}
                  onChange={(e) => {
                    setSelectedClientId(e.target.value);
                    setSelectedProjectId('');
                    setSelectedTaskId('');
                  }}
                  id="select-client-chrono"
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 hover:bg-slate-100/50 outline-none focus:ring-1 focus:ring-[#234e70] cursor-pointer"
                >
                  <option value="">-- Selecciona Client --</option>
                  {activeClients.map(c => (
                    <option key={c.id} value={c.id}>{c.nom}</option>
                  ))}
                </select>
              </div>

              {/* Project Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Projecte OBLIGATORI *</label>
                <select
                  required
                  disabled={!selectedClientId}
                  value={selectedProjectId}
                  onChange={(e) => {
                    setSelectedProjectId(e.target.value);
                    setSelectedTaskId('');
                  }}
                  id="select-project-chrono"
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 outline-none focus:ring-1 focus:ring-[#234e70] cursor-pointer"
                >
                  <option value="">-- Selecciona Projecte --</option>
                  {clientProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.nom}</option>
                  ))}
                </select>
                {!selectedClientId && (
                  <span className="text-xs text-slate-400 mt-1 block">Tria primer un client per debloquejar els projectes</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Optional Task selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tasca (Opcional)</label>
                <select
                  disabled={!selectedProjectId}
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  id="select-task-chrono"
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 outline-none focus:ring-1 focus:ring-[#234e70] cursor-pointer"
                >
                  <option value="">-- Cap tasca associada --</option>
                  {projectTasks.map(t => (
                    <option key={t.id} value={t.id}>{t.nom}</option>
                  ))}
                </select>
              </div>

              {/* Billable & Rate parameters */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Facturable?</label>
                  <div className="flex gap-2 items-center h-10">
                    <button
                      type="button"
                      onClick={() => setIsFacturable(true)}
                      className={`flex-1 text-xs py-1.5 px-2 rounded-lg font-semibold border transition cursor-pointer ${
                        isFacturable
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Sí
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsFacturable(false)}
                      className={`flex-1 text-xs py-1.5 px-2 rounded-lg font-semibold border transition cursor-pointer ${
                        !isFacturable
                          ? 'bg-slate-100 text-slate-700 border-slate-200'
                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    TarifaAplicada ({db.settings.currency}/h)
                  </label>
                  <input
                    type="number"
                    min="0"
                    disabled={!isFacturable}
                    value={isFacturable ? hourlyRate : 0}
                    onChange={(e) => setHourlyRate(Number(e.target.value))}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 outline-none text-right font-mono"
                  />
                </div>
              </div>
            </div>

            {/* General Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Descripció del treball inicial</label>
              <textarea
                placeholder="Ex: Disseny conceptual, programació, maquetació d’estils generats..."
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg p-3 outline-none focus:ring-1 focus:ring-[#234e70] resize-none"
              />
            </div>

            {alertMsg && (
              <div className="bg-amber-50 text-amber-700 border border-amber-100 rounded-lg p-3 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>{alertMsg}</span>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                id="btn-start-chrono"
                className="bg-[#234e70] hover:bg-[#193c58] text-white font-medium text-xs px-6 py-2.5 rounded-lg flex items-center gap-2 shadow-sm transition cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                Iniciar sessió
              </button>
            </div>
          </form>

          {/* Guidelines info sidebar */}
          <div className="bg-slate-50 border border-slate-100 rounded-lg p-5 space-y-4">
            <h4 className="font-semibold text-slate-900 text-xs flex items-center gap-1.5 uppercase tracking-wide">
              <Info className="w-4 h-4 text-slate-500" />
              Funcionament del mètode
            </h4>
            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                Quan prems «Començar», el cronòmetre registra el temps dedicat al projecte seleccionat.
              </p>
              <div className="flex items-start gap-2 bg-white rounded-lg p-2.5 border border-slate-100 shadow-sm">
                <Info className="w-4 h-4 text-[#234e70] shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-500">
                  Si tanques la pàgina per error, a l’obrir-la la sessió seguirà computant ja que es consolida amb marques temporals de seguretat.
                </p>
              </div>
              <p>
                Pots pausar i reprendre la sessió tantes vegades com necessitis. Les pauses no s'inclouen en el temps treballat ni en l'import facturable. Per finalitzar, prem <span className="font-semibold">Aturar</span>.
              </p>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
