import React, { useEffect, useState } from 'react';
import { LocalDatabase, TimeEntry, Project, Client, ActiveSession } from '../types';
import {
  Clock,
  Euro,
  CheckCircle,
  AlertTriangle,
  Play,
  Square,
  TrendingUp,
  Briefcase,
  Users,
  ChevronRight,
  ShieldCheck,
  Plus
} from 'lucide-react';
import {
  formatDuration,
  formatCurrency,
  isToday,
  isThisWeek,
  isThisMonth,
  validateEntry
} from '../utils/timeUtils';

interface DashboardViewProps {
  db: LocalDatabase;
  onNavigate: (view: string) => void;
  onStopSession: (description: string, notes: string) => void;
  onUpdateActiveSession: (session: ActiveSession) => void;
}

export default function DashboardView({ db, onNavigate, onStopSession, onUpdateActiveSession }: DashboardViewProps) {
  const { timeEntries, projects, clients, tasks, activeSession } = db;
  const [elapsedMins, setElapsedMins] = useState(0);
  const [sessionDesc, setSessionDesc] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');

  // Live elapsed counter for active session
  useEffect(() => {
    if (!activeSession) return;
    
    // Initial sync
    const computeElapsed = () => {
      const elapsedMs = Date.now() - activeSession.startedTimestamp;
      setElapsedMins(Math.max(0, Math.floor(elapsedMs / 60000)));
    };
    computeElapsed();

    const interval = setInterval(computeElapsed, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [activeSession]);

  // Aggregate Metrics
  let minsToday = 0;
  let minsThisWeek = 0;
  let minsThisMonth = 0;
  let billableMinsThisMonth = 0;
  let earningsThisMonth = 0;

  timeEntries.forEach(entry => {
    const minuts = entry.duradaMinuts;
    
    if (isToday(entry.data)) {
      minsToday += minuts;
    }
    if (isThisWeek(entry.data, db.settings.weekStartsOn)) {
      minsThisWeek += minuts;
    }
    if (isThisMonth(entry.data)) {
      minsThisMonth += minuts;
      if (entry.facturable) {
        billableMinsThisMonth += minuts;
        earningsThisMonth += entry.importCalculat || 0;
      }
    }
  });

  // Calculate project hours totals
  const projectStats = projects.map(proj => {
    const projEntries = timeEntries.filter(e => e.projecteId === proj.id);
    const totalProjMins = projEntries.reduce((sum, e) => sum + e.duradaMinuts, 0);
    const totalProjBillableMins = projEntries.reduce((sum, e) => sum + (e.facturable ? e.duradaMinuts : 0), 0);
    const totalProjEarnings = projEntries.reduce((sum, e) => sum + (e.facturable ? (e.importCalculat || 0) : 0), 0);
    const client = clients.find(c => c.id === proj.clientId);
    return {
      project: proj,
      clientName: client?.nom || 'Desconegut',
      hours: totalProjMins / 60,
      billableHours: totalProjBillableMins / 60,
      earnings: totalProjEarnings
    };
  }).filter(stat => stat.hours > 0)
    .sort((a, b) => b.hours - a.hours);

  // Over-budget project warnings
  const overBudgetProjects = projects.map(proj => {
    const projEntries = timeEntries.filter(e => e.projecteId === proj.id);
    const totalProjMins = projEntries.reduce((sum, e) => sum + e.duradaMinuts, 0);
    const totalProjHours = totalProjMins / 60;
    const client = clients.find(c => c.id === proj.clientId);

    return {
      project: proj,
      clientName: client?.nom || 'Desconegut',
      hoursRegistered: totalProjHours,
      budget: proj.pressupostHores || 0,
      isExceeded: proj.pressupostHores ? totalProjHours > proj.pressupostHores : false
    };
  }).filter(p => p.isExceeded);

  // Incoherent entries validation alerts
  const incoherentEntries = timeEntries.filter(entry => {
    const validation = validateEntry(entry, projects, tasks, timeEntries);
    return validation.status === 'incoherent' || validation.status === 'pendent de revisar';
  }).map(entry => {
    const validation = validateEntry(entry, projects, tasks, timeEntries);
    const proj = projects.find(p => p.id === entry.projecteId);
    return {
      entry,
      projectName: proj?.nom || 'Sense Projecte',
      warnings: validation.warnings,
      status: validation.status
    };
  });

  // Project Hours share calculation
  const totalWorked = Math.max(1, timeEntries.reduce((total, entry) => total + entry.duradaMinuts, 0));

  return (
    <div className="space-y-6" id="view-dashboard">
      {clients.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 md:p-8 flex flex-col sm:flex-row gap-5 sm:items-center justify-between">
          <div className="max-w-xl">
            <p className="text-xs font-medium uppercase tracking-wide text-[#234e70]">Comença aquí</p>
            <h2 className="text-lg font-semibold text-slate-900 mt-2">El teu espai de treball està preparat</h2>
            <p className="text-sm text-slate-600 mt-2">Afegeix un client, crea el primer projecte i ja podràs registrar hores. Les dades es desaran en aquest navegador.</p>
          </div>
          <button onClick={() => onNavigate('Clients')} className="shrink-0 bg-[#234e70] hover:bg-[#193c58] text-white text-sm font-medium px-4 py-2.5 rounded-md flex items-center gap-2">
            <Plus className="w-4 h-4" /> Afegir client
          </button>
        </div>
      )}
      {clients.length > 0 && projects.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-slate-600">Ja tens clients. Crea un projecte per començar a registrar temps.</p>
          <button onClick={() => onNavigate('Projectes')} className="text-sm font-semibold text-[#234e70] hover:underline">Crear projecte</button>
        </div>
      )}
      
      {/* Active Session Ticker */}
      {activeSession && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white shrink-0">
              <Clock className="w-6 h-6 " style={{ animationDuration: '8s' }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-emerald-200 text-emerald-800 font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                  Sessió En Curs
                </span>
                <span className="text-xs text-slate-500 font-mono mt-0.5">
                  Iniciada a les {activeSession.horaInici}
                </span>
              </div>
              <h3 className="font-semibold text-slate-800 text-sm mt-1">
                {projects.find(p => p.id === activeSession.projecteId)?.nom || 'Desconegut'}{' '}
                <span className="text-slate-400 font-normal">
                  ({clients.find(c => c.id === activeSession.clientId)?.nom || 'Desconegut'})
                </span>
              </h3>
              <div className="mt-2 w-full max-w-md">
                <label className="block text-[11px] uppercase font-bold text-emerald-800 font-sans tracking-tight mb-0.5">Què estàs fent ara mateix?</label>
                <input
                  type="text"
                  placeholder="Escriu la teva descripció d'activitat en temps real..."
                  value={activeSession.descripcio || ''}
                  onChange={(e) => onUpdateActiveSession({ ...activeSession, descripcio: e.target.value })}
                  className="w-full text-xs font-semibold bg-white/90 focus:bg-white text-slate-800 border border-emerald-250 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-emerald-500 placeholder-emerald-600/40 shadow-xs transition"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
            <div className="text-right">
              <div className="text-2xl font-mono font-bold text-slate-900">
                {formatDuration(elapsedMins, 'clock')}
              </div>
              <div className="text-xs text-slate-400 uppercase tracking-tight font-medium">Temps transcorregut</div>
            </div>

            <button
              onClick={() => onStopSession(activeSession.descripcio || '', activeSession.notes || '')}
              id="btn-stop-session-dashboard"
              className="bg-red-600 hover:bg-red-700 text-white font-medium text-xs px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition cursor-pointer shrink-0"
            >
              <Square className="w-4 h-4 fill-white" />
              Aturar sessió
            </button>
          </div>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-10 h-10 bg-[#edf3f8] text-[#234e70] rounded-lg flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Avui treballat</p>
            <h3 className="text-xl font-mono font-bold text-slate-800 mt-1">
              {formatDuration(minsToday, 'decimal')}
            </h3>
            <span className="text-xs text-slate-400 font-mono">{formatDuration(minsToday, 'clock')}</span>
          </div>
        </div>

        {/* This Week */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-100 text-slate-700 rounded-lg flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Aquesta Setmana</p>
            <h3 className="text-xl font-mono font-bold text-slate-800 mt-1">
              {formatDuration(minsThisWeek, 'decimal')}
            </h3>
            <span className="text-xs text-slate-400 font-mono">{formatDuration(minsThisWeek, 'clock')}</span>
          </div>
        </div>

        {/* This Month Hours */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Aquest Mes (Hores)</p>
            <h3 className="text-xl font-mono font-bold text-slate-800 mt-1 ">
              {formatDuration(minsThisMonth, 'decimal')}
            </h3>
            <span className="text-xs text-emerald-600 font-medium">Facturables: {formatDuration(billableMinsThisMonth, 'decimal')}</span>
          </div>
        </div>

        {/* This Month Earnings */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center shrink-0">
            <Euro className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Estimat del Mes ({db.settings.currency})</p>
            <h3 className="text-xl font-mono font-bold text-slate-800 mt-1">
              {db.settings.showAmountsByDefault ? formatCurrency(earningsThisMonth, db.settings.currency) : '***'}
            </h3>
            <span className="text-xs text-slate-400 font-mono">Segons les tarifes registrades</span>
          </div>
        </div>
      </div>

      {/* Main Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Project Dedication Bars (Left 2 cols on wide) */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-slate-100 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-sans font-semibold text-slate-900">Temps per projecte</h3>
                <p className="text-xs text-slate-400 mt-0.5">Hores acumulades registrades històriques per a cada projecte</p>
              </div>
              <button
                onClick={() => onNavigate('Informes')}
                className="text-xs font-semibold text-[#234e70] hover:text-[#193c58] flex items-center gap-1 cursor-pointer"
              >
                Veure Informes
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {projectStats.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No hi ha temps acumulat registrat per analitzar encara.
              </div>
            ) : (
              <div className="space-y-4">
                {projectStats.map(stat => {
                  const percentage = Math.min(100, Math.round((stat.hours * 60 / totalWorked) * 100));
                  const projectColor = stat.project.color || '#3B82F6';
                  return (
                    <div key={stat.project.id} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium text-slate-700">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: projectColor }} />
                          <span className="font-semibold">{stat.project.nom}</span>
                          <span className="text-slate-400 font-normal">({stat.clientName})</span>
                        </div>
                        <div className="font-mono text-slate-800 font-semibold">
                          {stat.hours.toFixed(1)} h <span className="text-slate-400 font-normal text-xs">({percentage}%)</span>
                        </div>
                      </div>
                      
                      {/* Custom SVG / Pure CSS Progress bar */}
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${percentage}%`, backgroundColor: projectColor }}
                          className="h-full rounded-full transition-all duration-500"
                        />
                      </div>

                      {db.settings.showAmountsByDefault && (
                        <div className="flex justify-end text-xs text-slate-400 font-mono">
                          Valor estimat: {formatCurrency(stat.earnings, db.settings.currency)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Alerts Center (Right 1 col) */}
        <div className="space-y-6">
          
          {/* Incoherencies Box */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-100 p-6">
            <h3 className="text-sm font-sans font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-slate-500" />
              Registres per revisar
            </h3>

            {incoherentEntries.length === 0 ? (
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 text-center">
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-medium text-emerald-800">No hi ha registres que requereixin revisió.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-amber-800">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-semibold">Hi ha {incoherentEntries.length} registres a revisar!</span>
                  </div>
                  <p className="text-xs text-amber-700 mt-1">
                    Detectat solapament horari, durades de zero/negatives o tarifes absents.
                  </p>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {incoherentEntries.slice(0, 3).map(alert => (
                    <div
                      key={alert.entry.id}
                      onClick={() => onNavigate('Registres')}
                      className="p-2 border border-slate-100 hover:border-slate-200 bg-slate-50 rounded-lg text-left cursor-pointer transition text-xs"
                    >
                      <div className="flex justify-between items-center text-xs text-slate-400 font-mono">
                        <span>{alert.entry.data}</span>
                        <span className="font-bold uppercase text-amber-600 font-sans">{alert.status}</span>
                      </div>
                      <div className="font-semibold text-slate-700 mt-0.5 mt-1">
                        {alert.projectName} - {alert.entry.horaInici} a {alert.entry.horaFi || '?'}
                      </div>
                      <ul className="text-xs text-slate-500 list-disc pl-3 mt-1 space-y-0.5">
                        {alert.warnings.map((w, idx) => (
                          <li key={idx} className="line-clamp-1">{w}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  {incoherentEntries.length > 3 && (
                    <button
                      onClick={() => onNavigate('Registres')}
                      className="text-[11px] text-[#234e70] font-bold w-full text-center hover:underline cursor-pointer py-1 block"
                    >
                      Veure els altres {incoherentEntries.length - 3} conflictes a la taula
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Over-budget Projects */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-100 p-6">
            <h3 className="text-sm font-sans font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-slate-400" />
              Límits de Pressupostos
            </h3>

            {overBudgetProjects.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                Cap projecte actiu ha superat el seu pressupost en hores. ¡Bon rendiment!
              </p>
            ) : (
              <div className="space-y-3">
                {overBudgetProjects.map(proj => {
                  const percentage = Math.round((proj.hoursRegistered / proj.budget) * 100);
                  return (
                    <div key={proj.project.id} className="space-y-1 p-2 bg-red-50/50 border border-red-100 rounded-lg text-xs">
                      <div className="flex justify-between font-medium">
                        <span className="font-semibold text-red-900 line-clamp-1">{proj.project.nom}</span>
                        <span className="font-mono text-red-700 shrink-0 font-bold">{percentage}%</span>
                      </div>
                      <p className="text-xs text-red-400">Client: {proj.clientName}</p>
                      
                      <div className="w-full bg-red-100 h-1.5 rounded-full overflow-hidden mt-1">
                        <div
                          style={{ width: `${Math.min(100, percentage)}%` }}
                          className="h-full bg-red-600 rounded-full"
                        />
                      </div>
                      <p className="text-xs text-slate-500 font-mono text-right mt-1">
                        Límit: {proj.budget}h | Consumit: {proj.hoursRegistered.toFixed(1)}h
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Quick guide of JSON usage for new users */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-100 p-6">
        <h3 className="font-semibold text-slate-800 text-sm mb-3">Com utilitzar ACnora</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-500 leading-relaxed">
          <div className="space-y-1">
            <div className="font-semibold text-slate-700 flex items-center gap-2">
              <span className="w-5 h-5 bg-[#deebf3] text-[#234e70] font-bold text-xs rounded-full flex items-center justify-center">1</span>
              Prepara els projectes
            </div>
            <p className="pl-7">Afegeix un <b>client</b>, crea els seus <b>projectes</b> i, si cal, organitza-hi <b>tasques</b>.</p>
          </div>
          <div className="space-y-1">
            <div className="font-semibold text-slate-700 flex items-center gap-2">
              <span className="w-5 h-5 bg-indigo-100 text-slate-700 font-bold text-xs rounded-full flex items-center justify-center">2</span>
              Registra les hores
            </div>
            <p className="pl-7">Tria client i projecte al <b>cronòmetre</b> o introdueix les hores manualment a <b>Registres</b>.</p>
          </div>
          <div className="space-y-1">
            <div className="font-semibold text-slate-700 flex items-center gap-2">
              <span className="w-5 h-5 bg-emerald-100 text-emerald-600 font-bold text-xs rounded-full flex items-center justify-center">3</span>
              Protegeix les dades
            </div>
            <p className="pl-7">Els canvis es guarden al navegador. Exporta regularment un fitxer a <b>Dades i còpies</b> per conservar-ne una còpia externa.</p>
          </div>
        </div>
      </div>

    </div>
  );
}
