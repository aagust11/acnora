/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  LocalDatabase,
  TimeEntry,
  Client,
  Project,
  Task,
  WorkBlock,
  Settings,
  ActiveSession,
  AuditLogEntry,
  IssuedQuote
} from './types';
import { generateMockEntries } from './data/mockData';
import { createEmptyDatabase, normalizeDatabase } from './utils/database';
import { validateEntry, localToday } from './utils/timeUtils';
import { formatSessionClock, isSessionPaused, pauseSession, resumeSession, sessionPausedMs, sessionWorkedMs } from './utils/sessionPause';
import { markQuoteAccepted, pruneExpiredQuotes } from './utils/issuedQuotes';
import { LocalJsonHandle, contentHash, canWrite, isConflictingContent, retrieveLink, rememberLink, forgetLink } from './utils/localFileSync';

// Import our views
import DashboardView from './components/DashboardView';
import ChronometerView from './components/ChronometerView';
import RecordsView from './components/RecordsView';
import CalendarView from './components/CalendarView';
import ClientsView from './components/ClientsView';
import ProjectsView from './components/ProjectsView';
import TasksView from './components/TasksView';
import ReportsView from './components/ReportsView';
import QuotesView from './components/QuotesView';
import SettingsView from './components/SettingsView';
import FileManagementView from './components/FileManagementView';

import {
  LayoutDashboard,
  Clock,
  Table,
  Calendar,
  Users,
  Briefcase,
  CheckSquare,
  FileBarChart2,
  Settings as SettingsIcon,
  FileJson,
  ReceiptText,
  Menu,
  X,
  Save,
  Database,
  Play
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'freelance_tracker_master_db';
const LOCAL_STORAGE_NAME_KEY = 'freelance_tracker_file_name';
type FileSaveStatus = 'browser' | 'restoring' | 'saved' | 'pending' | 'saving' | 'permission' | 'conflict' | 'error';
const AUTOSAVE_DELAY_MS = 600;

export default function App() {
  // Navigation State
  const [currentView, setCurrentView] = useState('Dashboard');
  const [quoteProjectId, setQuoteProjectId] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Core Db States
  const [db, setDb] = useState<LocalDatabase | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileHandle, setFileHandle] = useState<LocalJsonHandle | null>(null);
  const [fileSaveStatus, setFileSaveStatus] = useState<FileSaveStatus>('restoring');
  const [lastFileSavedAt, setLastFileSavedAt] = useState<string | null>(null);
  const linkRef = useRef<LocalJsonHandle | null>(null);
  const lastHashRef = useRef<string | null>(null);
  const latestDbRef = useRef<LocalDatabase | null>(null);
  const saveRevisionRef = useRef(0);
  const linkVersionRef = useRef(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const writingRef = useRef(false);
  const browserStorageErrorRef = useRef(false);
  const blockedRef = useRef(false);
  const [storageWarning, setStorageWarning] = useState('');

  // Time-tracking elapsed clock state
  const [tickingTime, setTickingTime] = useState<string>('00:00:00');

  // Preserve the original storage key for backward compatibility.
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    const savedName = localStorage.getItem(LOCAL_STORAGE_NAME_KEY);
    if (saved) {
      try {
        const original = normalizeDatabase(JSON.parse(saved));
        const current = pruneExpiredQuotes(original, localToday());
        latestDbRef.current = current;
        setDb(current);
        if (current !== original) {
          try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(current)); }
          catch (_) { setStorageWarning('No s’han pogut purgar els pressupostos caducats del desament local. Exporta una còpia JSON.'); }
        }
        if (savedName) setFileName(savedName);
      } catch (error) {
        console.error('No es poden carregar les dades locals', error);
        const empty = createEmptyDatabase(); latestDbRef.current = empty; setDb(empty);
        try { localStorage.setItem(LOCAL_STORAGE_KEY + '_recovery', saved); } catch (_) { /* Storage can be unavailable. */ }
        setStorageWarning('No s’han pogut llegir les dades anteriors. S’ha intentat conservar una còpia de recuperació al navegador; no comencis a treballar abans de revisar-la.');
      }
    } else {
      // A real workspace starts empty; example records must never look like real billing.
      const empty = createEmptyDatabase(); latestDbRef.current = empty; setDb(empty);
    }
  }, []);

  // A file handle can be remembered by IndexedDB, but the browser may ask for
  // read/write permission again after reopening. Never claim a successful file
  // save until the exact write operation has completed.
  useEffect(() => {
    if (!db) return;
    let cancelled = false;
    const restore = async () => {
      try {
        const linked = await retrieveLink();
        if (cancelled) return;
        if (!linked) { setFileSaveStatus('browser'); return; }
        linkRef.current = linked.handle;
        lastHashRef.current = linked.hash;
        setFileHandle(linked.handle);
        setFileName(linked.handle.name);
        if (!(await canWrite(linked.handle))) {
          if (!cancelled) { setFileSaveStatus('permission'); setIsDirty(true); }
          return;
        }
        const diskText = await (await linked.handle.getFile()).text();
        if (cancelled) return;
        if (isConflictingContent(linked.hash, await contentHash(diskText))) {
          blockedRef.current = true;
          setFileSaveStatus('conflict');
          setStorageWarning('El JSON vinculat ha canviat fora d’ACnora. No se sobreescriurà. Descarrega una còpia de les dades del navegador i torna a importar el fitxer si vols recuperar-lo.');
          return;
        }
        const browserText = localStorage.getItem(LOCAL_STORAGE_KEY);
        const diskNormalized = normalizeDatabase(JSON.parse(diskText));
        if (!browserText) {
          const restored = pruneExpiredQuotes(diskNormalized, localToday());
          latestDbRef.current = restored;
          setDb(restored);
          try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(restored)); } catch (_) { /* Warned on next write. */ }
        } else {
          const browserDatabase = latestDbRef.current ?? normalizeDatabase(JSON.parse(browserText));
          if (JSON.stringify(browserDatabase) !== JSON.stringify(diskNormalized)) {
            // Browser storage is our recovery copy for unsynced changes; the file
            // still matches the last known hash, so writing cannot overwrite
            // someone else's new changes.
            scheduleFileSave(browserDatabase);
            return;
          }
        }
        setFileSaveStatus('saved');
        setIsDirty(false);
      } catch (error) {
        if (!cancelled) {
          console.error('No es pot recuperar el vincle JSON', error);
          setFileSaveStatus(linkRef.current ? 'error' : 'browser');
          setStorageWarning('No s’ha pogut recuperar el fitxer JSON vinculat. Les dades locals es conserven; revisa «Dades i còpies».');
        }
      }
    };
    void restore();
    return () => { cancelled = true; };
  }, [!!db]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (fileSaveStatus === 'pending' || fileSaveStatus === 'saving') {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [fileSaveStatus]);

  const clearSaveTimer = () => {
    if (saveTimerRef.current !== null) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = null;
  };

  const unlinkFile = async (): Promise<void> => {
    clearSaveTimer();
    ++linkVersionRef.current;
    linkRef.current = null;
    lastHashRef.current = null;
    blockedRef.current = false;
    setFileHandle(null);
    setFileSaveStatus('browser');
    setLastFileSavedAt(null);
    // The browser-local workspace is never cleared by unlinking a JSON.
    await forgetLink().catch(error => {
      console.warn('No s’ha pogut esborrar el vincle de l’IndexedDB', error);
      setStorageWarning('El navegador no ha pogut oblidar el vincle. Si reobres la pàgina, comprova el fitxer actiu.');
    });
  };

  const scheduleFileSave = (nextDb: LocalDatabase) => {
    latestDbRef.current = nextDb;
    ++saveRevisionRef.current;
    if (!linkRef.current) return;
    setIsDirty(true);
    if (blockedRef.current) return;
    setFileSaveStatus('pending');
    clearSaveTimer();
    saveTimerRef.current = setTimeout(() => { void flushFileSave().catch(() => undefined); }, AUTOSAVE_DELAY_MS);
  };

  const flushFileSave = async (): Promise<void> => {
    clearSaveTimer();
    const handle = linkRef.current;
    const expectedHash = lastHashRef.current;
    if (!handle || !expectedHash) return;
    if (blockedRef.current) throw new Error('El fitxer està bloquejat per evitar sobreescriure modificacions externes.');
    if (writingRef.current) return; // The running write will pick up the latest revision.
    writingRef.current = true;
    const startRevision = saveRevisionRef.current;
    const startLinkVersion = linkVersionRef.current;
    const payload = JSON.stringify(latestDbRef.current, null, 2);
    let didWrite = false;
    try {
      if (!(await canWrite(handle))) { setFileSaveStatus('permission'); return; }
      setFileSaveStatus('saving');
      // Web Locks serializes the read/check/write operation across tabs from
      // the same browser origin. A hash check still blocks external programs.
      const exclusiveWrite = async () => {
        const currentHash = await contentHash(await (await handle.getFile()).text());
        if (currentHash !== expectedHash) {
          blockedRef.current = true;
          setFileSaveStatus('conflict');
          setStorageWarning('El JSON ha canviat des d’una altra pestanya o programa. ACnora ha aturat l’autodesament per no destruir aquests canvis. Descarrega una còpia JSON i torna a importar el fitxer.');
          return;
        }
        if (linkVersionRef.current !== startLinkVersion || linkRef.current !== handle) return;
        const writable = await handle.createWritable();
        try { await writable.write(payload); await writable.close(); }
        catch (e) { if (writable.abort) await writable.abort().catch(() => undefined); throw e; }
        if (linkVersionRef.current !== startLinkVersion || linkRef.current !== handle) return;
        const newHash = await contentHash(payload);
        lastHashRef.current = newHash;
        didWrite = true;
        try { await rememberLink({ handle, hash: newHash }); }
        catch (e) { console.warn('No s’ha pogut recordar el vincle, però el JSON s’ha escrit correctament.', e); }
      };
      if (navigator.locks?.request) {
        await navigator.locks.request(`acnora-json-${handle.name}`, exclusiveWrite);
      } else {
        await exclusiveWrite();
      }
      if (!didWrite) return;
      if (startRevision === saveRevisionRef.current) {
        setFileSaveStatus('saved');
        setIsDirty(false);
        setLastFileSavedAt(new Date().toLocaleTimeString('ca', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
      if (!browserStorageErrorRef.current) setStorageWarning('');
    } catch (error) {
      console.error('Error d’autodesament al JSON', error);
      setFileSaveStatus(error instanceof DOMException && error.name === 'NotAllowedError' ? 'permission' : 'error');
      setStorageWarning('No s’ha pogut escriure al JSON. Les dades es mantenen al navegador; revisa els permisos i desa una còpia manual abans de tancar.');
      throw error;
    } finally {
      writingRef.current = false;
      if (didWrite && linkRef.current === handle && !blockedRef.current && lastHashRef.current && startRevision !== saveRevisionRef.current) {
        clearSaveTimer();
        saveTimerRef.current = setTimeout(() => { void flushFileSave().catch(() => undefined); }, 100);
      }
    }
  };

  const restoreWritePermission = async () => {
    const handle = linkRef.current;
    if (!handle) return;
    const permission = await handle.requestPermission({ mode: 'readwrite' });
    if (permission !== 'granted') { setFileSaveStatus('permission'); return; }
    const currentHash = await contentHash(await (await handle.getFile()).text());
    if (lastHashRef.current !== currentHash) {
      blockedRef.current = true;
      setFileSaveStatus('conflict');
      setStorageWarning('El fitxer ha canviat des de l’última vinculació. No s’ha sobreescrit; importa’l de nou o conserva abans una còpia del navegador.');
      return;
    }
    blockedRef.current = false;
    setStorageWarning('');
    const browserDatabase = latestDbRef.current;
    if (browserDatabase) scheduleFileSave(browserDatabase);
  };

  // Cleanup on reopening and each minute while ACnora is open (no background worker).
  useEffect(() => {
    if (!db?.issuedQuotes?.length) return;
    const prune = () => {
      const cleaned = pruneExpiredQuotes(db, localToday());
      if (cleaned === db) return;
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleaned));
        setDb(cleaned);
        setIsDirty(true);
        scheduleFileSave(cleaned);
        setStorageWarning('');
      } catch (error) {
        console.error('No s’han pogut desar les caducitats', error);
        setStorageWarning('No s’han pogut eliminar els pressupostos caducats de l’emmagatzematge. Revisa les còpies.');
      }
    };
    prune();
    const interval = setInterval(prune, 60_000);
    return () => clearInterval(interval);
  }, [db]);

  const persistLocally = (database: LocalDatabase) => {
    latestDbRef.current = database;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(database));
      browserStorageErrorRef.current = false;
      setStorageWarning('');
    } catch (error) {
      console.error('No es pot desar al navegador', error);
      browserStorageErrorRef.current = true;
      setStorageWarning('El navegador no ha pogut desar els canvis. Exporta ara una còpia JSON des de «Dades i còpies».');
    }
  };

  // Update elapsed ticking visual in browser page titles
  useEffect(() => {
    if (!db || !db.activeSession) {
      setTickingTime('00:00:00');
      document.title = 'ACnora · Clients, projectes i temps';
      return;
    }

    const updateClock = () => {
      const formatted = formatSessionClock(sessionWorkedMs(db.activeSession!));
      setTickingTime(formatted);
      document.title = `${isSessionPaused(db.activeSession!) ? 'Pausa · ' : ''}${formatted} · ACnora`;
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);

    return () => clearInterval(interval);
  }, [db?.activeSession]);

  if (!db) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="text-center space-y-3 p-6 bg-white border border-slate-100 rounded-lg max-w-sm">
          <Clock className="w-10 h-10 text-slate-600 mx-auto" strokeWidth={1.5} />
          <h3 className="font-bold text-slate-800 text-sm">Carregant l'espai de treball...</h3>
          <p className="text-xs text-slate-400 leading-relaxed">Estem restaurant el teu magatzem privat de dades i configuracions des de la memòria local.</p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // CENTRAL STATE CHANGERS COMPILERS (With automated audits)
  // ---------------------------------------------------------------------------
  const commitDbChange = (
    newDb: LocalDatabase,
    meta?: {
      accio: string;
      entitat: 'client' | 'projecte' | 'bloc' | 'tasca' | 'registre' | 'pressupost' | 'configuració' | 'fitxer';
      idEntitat: string;
      resum: string;
    }
  ) => {
    const nextDb = { ...newDb };

    if (meta) {
      const logEntry: AuditLogEntry = {
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString(),
        accio: meta.accio,
        entitatAfectada: meta.entitat,
        idEntitat: meta.idEntitat,
        resum: meta.resum
      };
      nextDb.auditLog = [...nextDb.auditLog, logEntry];
    }

    setDb(nextDb);
    setIsDirty(true);
    persistLocally(nextDb);
    scheduleFileSave(nextDb);
  };

  // Linking or importing requires explicit user confirmation from the file view.
  const handleLoadDb = async (loadedDb: LocalDatabase, name: string, handle?: LocalJsonHandle, rawJson?: string): Promise<void> => {
    const normalized = pruneExpiredQuotes(normalizeDatabase(loadedDb), localToday());
    await unlinkFile();
    latestDbRef.current = normalized;
    setDb(normalized);
    setFileName(name);
    setIsDirty(false);
    persistLocally(normalized);
    localStorage.setItem(LOCAL_STORAGE_NAME_KEY, name);
    if (handle && rawJson) {
      const hash = await contentHash(rawJson);
      // Remember the original hash so future changes made by other programs
      // will never be silently overwritten.
      lastHashRef.current = hash;
      linkRef.current = handle;
      ++linkVersionRef.current;
      blockedRef.current = false;
      setFileHandle(handle);
      try { await rememberLink({ handle, hash }); }
      catch (error) {
        console.warn('La vinculació només es mantindrà durant aquesta sessió', error);
        setStorageWarning('No s’ha pogut recordar el fitxer per a la pròxima sessió. Desament automàtic actiu ara; caldrà tornar-lo a vincular després.');
      }
      if (await canWrite(handle)) {
        const importedOnDisk = normalizeDatabase(JSON.parse(rawJson));
        if (JSON.stringify(normalized) !== JSON.stringify(importedOnDisk)) scheduleFileSave(normalized);
        else setFileSaveStatus('saved');
      } else setFileSaveStatus('permission');
    }
  };

  // Create a fresh JSON from the current browser workspace, without importing
  // and losing current data. The operating-system picker supplies the handle.
  const handleCreateLinkedJson = async (handle: LocalJsonHandle): Promise<void> => {
    const original = await (await handle.getFile()).text();
    if (original.trim() && !window.confirm('El fitxer escollit ja conté dades. Vols SUBSTITUIR-LES per les dades actuals del navegador?')) return;
    if (!(await canWrite(handle))) throw new Error('No hi ha permís d’escriptura per aquest fitxer.');
    await unlinkFile();
    const originalHash = await contentHash(original);
    linkRef.current = handle;
    lastHashRef.current = originalHash;
    ++linkVersionRef.current;
    blockedRef.current = false;
    setFileHandle(handle);
    setFileName(handle.name);
    localStorage.setItem(LOCAL_STORAGE_NAME_KEY, handle.name);
    try { await rememberLink({ handle, hash: originalHash }); }
    catch (e) { console.warn('No es pot recordar el vincle entre sessions', e); }
    scheduleFileSave(latestDbRef.current ?? db);
  };

  const downloadDatabase = (database: LocalDatabase, name: string) => {
    const blob = new Blob([JSON.stringify(database, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Manual save is optional while a JSON is linked: normal edits autosave.
  const handleSaveDb = async () => {
    if (!linkRef.current) { downloadDatabase(db, fileName || 'acnora-dades.json'); return; }
    if (blockedRef.current) throw new Error('El JSON s’ha modificat fora d’ACnora. No es pot sobreescriure sense tornar-lo a vincular.');
    if (!(await canWrite(linkRef.current))) { setFileSaveStatus('permission'); throw new Error('Autoritza primer l’accés d’escriptura al fitxer.'); }
    if (writingRef.current) return; // An automatic write is already in progress.
    scheduleFileSave(db);
    await flushFileSave();
  };

  const handleCreateNewDb = () => {
    if (!window.confirm('Vols començar un espai de treball nou? Primer exporta una còpia JSON si vols conservar les dades actuals.')) return;
    const empty = createEmptyDatabase();
    setDb(empty);
    setFileName('acnora-dades.json');
    void unlinkFile();
    setIsDirty(true);
    persistLocally(empty);
    localStorage.setItem(LOCAL_STORAGE_NAME_KEY, 'acnora-dades.json');
    setCurrentView('Dashboard');
  };

  const handleClearDatabase = () => {
    const empty = createEmptyDatabase();
    setDb(empty);
    setFileName('');
    void unlinkFile();
    setIsDirty(false);
    persistLocally(empty);
    localStorage.removeItem(LOCAL_STORAGE_NAME_KEY);
    setCurrentView('Dashboard');
  };

  const handleLoadDemo = () => {
    if (!window.confirm('Les dades de demostració substituiran l’espai de treball actual. Has exportat una còpia si la necessites?')) return;
    const demo = generateMockEntries(new Date().toISOString());
    setDb(demo);
    setFileName('acnora-demostracio.json');
    void unlinkFile();
    setIsDirty(true);
    persistLocally(demo);
    localStorage.setItem(LOCAL_STORAGE_NAME_KEY, 'acnora-demostracio.json');
    setCurrentView('Dashboard');
  };

  // ---------------------------------------------------------------------------
  // WORK TRACKER ACTIONS (Start and Stop sessions)
  // ---------------------------------------------------------------------------
  const handleStartSession = (session: ActiveSession) => {
    const nextDb = { ...db, activeSession: session };
    commitDbChange(nextDb, {
      accio: 'crear',
      entitat: 'registre',
      idEntitat: 'active',
      resum: `Començat cronòmetre pel projecte "${db.projects.find(p => p.id === session.projecteId)?.nom}".`
    });
    setCurrentView('Dashboard'); // redirect to view ticket logs
  };

  const handlePauseSession = () => {
    if (!db.activeSession || isSessionPaused(db.activeSession)) return;
    const session = pauseSession(db.activeSession);
    commitDbChange({ ...db, activeSession: session }, {
      accio: 'editar', entitat: 'registre', idEntitat: 'active',
      resum: 'Cronòmetre pausat. Les pauses no compten com a treball efectiu.',
    });
  };

  const handleResumeSession = () => {
    if (!db.activeSession || !isSessionPaused(db.activeSession)) return;
    const session = resumeSession(db.activeSession);
    commitDbChange({ ...db, activeSession: session }, {
      accio: 'editar', entitat: 'registre', idEntitat: 'active',
      resum: 'Cronòmetre reprès.',
    });
  };

  const handleStopSession = (finalDesc?: string, finalNotes?: string) => {
    if (!db.activeSession) return;

    const { activeSession, timeEntries, projects, tasks } = db;
    
    // Descompta totes les pauses, inclosa la que encara estigui oberta.
    const stopTime = new Date();
    const workedMs = sessionWorkedMs(activeSession, stopTime.getTime());
    const pauseMs = sessionPausedMs(activeSession, stopTime.getTime());
    const computedMins = workedMs > 0 ? Math.max(1, Math.floor(workedMs / 60000)) : 0;

    const horaFiStr = stopTime.toLocaleTimeString('ca', { hour: '2-digit', minute: '2-digit' });

    // Generate real time entry block
    const newEntry: TimeEntry = {
      id: `e-${Date.now()}`,
      clientId: activeSession.clientId,
      projecteId: activeSession.projecteId,
      tascaId: activeSession.tascaId,
      data: activeSession.data,
      dataFi: localToday(),
      horaInici: activeSession.horaInici,
      horaFi: horaFiStr,
      duradaMinuts: computedMins,
      pausaSegons: Math.floor(pauseMs / 1000),
      facturable: activeSession.facturable,
      tarifaHorariaAplicada: activeSession.tarifaHoraria,
      importCalculat: activeSession.facturable ? Number(((computedMins / 60) * (activeSession.tarifaHoraria || 0)).toFixed(2)) : 0,
      descripcio: finalDesc || activeSession.descripcio || 'Temps cronometrat',
      notes: finalNotes || '',
      origen: 'cronòmetre',
      estat: 'correcte', // default will validate next
      dataCreacio: new Date().toISOString(),
      dataModificacio: new Date().toISOString()
    };

    // Audit validates and updates entry states
    const validation = validateEntry(newEntry, projects, tasks, timeEntries);
    newEntry.estat = validation.status;

    const nextDb = {
      ...db,
      activeSession: null,
      timeEntries: [...db.timeEntries, newEntry]
    };

    const projName = projects.find(p => p.id === activeSession.projecteId)?.nom;

    commitDbChange(nextDb, {
      accio: 'crear',
      entitat: 'registre',
      idEntitat: newEntry.id,
      resum: `Aturat cronòmetre. ${computedMins} min de treball i ${Math.floor(pauseMs / 60000)} min de pausa sobre "${projName}".`
    });

    setCurrentView('Registres'); // redirect directly to reviews
  };

  // ---------------------------------------------------------------------------
  // CHILD ENTITIY MUTATIONS (Clients/Projects/Tasks)
  // ---------------------------------------------------------------------------
  const handleAddClient = (cli: Client) => {
    const nextClients = [...db.clients, cli];
    commitDbChange({ ...db, clients: nextClients }, {
      accio: 'crear',
      entitat: 'client',
      idEntitat: cli.id,
      resum: `Afegit client comercial: "${cli.nom}".`
    });
  };

  const handleUpdateClient = (cli: Client) => {
    const nextClients = db.clients.map(c => c.id === cli.id ? cli : c);
    commitDbChange({ ...db, clients: nextClients }, {
      accio: 'editar',
      entitat: 'client',
      idEntitat: cli.id,
      resum: `Modificat client comercial: "${cli.nom}" (estat: ${cli.estat}).`
    });
  };

  const handleDeleteClient = (id: string) => {
    if (db.projects.some(p => p.clientId === id) || db.timeEntries.some(e => e.clientId === id)) {
      alert('Aquest client té projectes o hores associats. Arxiva’l en lloc d’eliminar-lo per preservar l’historial.');
      return;
    }
    const name = db.clients.find(c => c.id === id)?.nom;
    const nextClients = db.clients.filter(c => c.id !== id);
    commitDbChange({ ...db, clients: nextClients }, {
      accio: 'eliminar',
      entitat: 'client',
      idEntitat: id,
      resum: `Eliminat client comercial: "${name}".`
    });
  };

  const handleAddProject = (p: Project) => {
    const next = [...db.projects, p];
    commitDbChange({ ...db, projects: next }, {
      accio: 'crear',
      entitat: 'projecte',
      idEntitat: p.id,
      resum: `Afegit projecte: "${p.nom}" per client ID: "${p.clientId}".`
    });
  };

  const handleUpdateProject = (p: Project) => {
    const next = db.projects.map(item => item.id === p.id ? p : item);
    commitDbChange({ ...db, projects: next }, {
      accio: 'editar',
      entitat: 'projecte',
      idEntitat: p.id,
      resum: `Modificat projecte: "${p.nom}" (estat: ${p.estat}).`
    });
  };

  const handleDeleteProject = (id: string) => {
    if (db.tasks.some(t => t.projecteId === id) || db.blocs.some(b => b.projecteId === id) || db.timeEntries.some(e => e.projecteId === id) || db.activeSession?.projecteId === id) {
      alert('Aquest projecte té tasques, hores o una sessió activa. Arxiva’l en lloc d’eliminar-lo.');
      return;
    }
    const name = db.projects.find(p => p.id === id)?.nom;
    const next = db.projects.filter(p => p.id !== id);
    commitDbChange({ ...db, projects: next }, {
      accio: 'eliminar',
      entitat: 'projecte',
      idEntitat: id,
      resum: `Eliminat projecte comercial: "${name}".`
    });
  };

  const handleAddBlock = (bloc: WorkBlock) => {
    if (!db.projects.some(project => project.id === bloc.projecteId)) return;
    commitDbChange({ ...db, blocs: [...db.blocs, bloc] }, {
      accio: 'crear', entitat: 'bloc', idEntitat: bloc.id, resum: `Creat bloc de treball: ${bloc.nom}`,
    });
  };
  const handleUpdateBlock = (bloc: WorkBlock) => {
    const existing = db.blocs.find(b => b.id === bloc.id);
    if (!existing || existing.projecteId !== bloc.projecteId) return;
    commitDbChange({ ...db, blocs: db.blocs.map(b => b.id === bloc.id ? bloc : b) }, {
      accio: 'editar', entitat: 'bloc', idEntitat: bloc.id, resum: `Modificat bloc de treball: ${bloc.nom}`,
    });
  };
  const handleDeleteBlock = (id: string) => {
    if (db.tasks.some(t => t.blocId === id)) {
      alert('Aquest bloc conté tasques. Mou-les a un altre bloc o deixa-les sense bloc abans d’eliminar-lo.');
      return;
    }
    commitDbChange({ ...db, blocs: db.blocs.filter(b => b.id !== id) }, {
      accio: 'eliminar', entitat: 'bloc', idEntitat: id, resum: 'Eliminat bloc de treball sense tasques.',
    });
  };

  const handleAddTask = (t: Task) => {
    const next = [...db.tasks, t];
    commitDbChange({ ...db, tasks: next }, {
      accio: 'crear',
      entitat: 'tasca',
      idEntitat: t.id,
      resum: `Afegida tasca: "${t.nom}" pel projecte ID: "${t.projecteId}".`
    });
  };

  const handleUpdateTask = (t: Task) => {
    const next = db.tasks.map(item => item.id === t.id ? t : item);
    commitDbChange({ ...db, tasks: next }, {
      accio: 'editar',
      entitat: 'tasca',
      idEntitat: t.id,
      resum: `Modificada tasca: "${t.nom}" (estat: ${t.estat}).`
    });
  };

  const handleUpdateActiveSession = (sess: ActiveSession) => {
    commitDbChange({ ...db, activeSession: sess });
  };

  const handleUpdateTaskNotesSilent = (taskId: string, notes: string) => {
    const nextTasks = db.tasks.map(t => t.id === taskId ? { ...t, notes, dataModificacio: new Date().toISOString() } : t);
    commitDbChange({ ...db, tasks: nextTasks });
  };

  const handleDeleteTask = (id: string) => {
    if (db.timeEntries.some(e => e.tascaId === id) || db.activeSession?.tascaId === id) {
      alert('Aquesta tasca té hores registrades o una sessió activa. Arxiva-la per conservar les dades.');
      return;
    }
    const name = db.tasks.find(t => t.id === id)?.nom;
    const next = db.tasks.filter(t => t.id !== id);
    commitDbChange({ ...db, tasks: next }, {
      accio: 'eliminar',
      entitat: 'tasca',
      idEntitat: id,
      resum: `Eliminada tasca: "${name}".`
    });
  };

  const handleAddEntry = (entry: TimeEntry) => {
    // Check duplication
    const isDuplicate = db.timeEntries.some(e =>
      e.data === entry.data &&
      e.horaInici === entry.horaInici &&
      e.horaFi === entry.horaFi &&
      e.projecteId === entry.projecteId &&
      e.clientId === entry.clientId
    );

    if (isDuplicate) {
      alert('Atenció: No es pot crear aquest registre perquè és un duplicat exacte de dades d’un altre registre existent (mateixa data, client, projecte i hores d’inici/fi).');
      return;
    }

    // Audit validate and add
    const nextEntries = [...db.timeEntries, entry];
    
    // Validate entry before saving
    const validation = validateEntry(entry, db.projects, db.tasks, db.timeEntries);
    entry.estat = entry.warningsDescartades ? 'correcte' : validation.status;

    commitDbChange({ ...db, timeEntries: nextEntries }, {
      accio: 'crear',
      entitat: 'registre',
      idEntitat: entry.id,
      resum: `Creat registre d’hores manual: ${entry.duradaMinuts} mins. (Projecte: ${db.projects.find(p => p.id === entry.projecteId)?.nom})`
    });
  };

  const handleUpdateEntry = (entry: TimeEntry) => {
    // Check duplication excluding current
    const isDuplicateUpdate = db.timeEntries.some(e =>
      e.id !== entry.id &&
      e.data === entry.data &&
      e.horaInici === entry.horaInici &&
      e.horaFi === entry.horaFi &&
      e.projecteId === entry.projecteId &&
      e.clientId === entry.clientId
    );

    if (isDuplicateUpdate) {
      alert('Atenció: No es poden desar els canvis perquè el registre resultant seria un duplicat d’un altre existent (mateixa data, client, projecte i hores d’inici/fi).');
      return;
    }

    const nextEntries = db.timeEntries.map(e => e.id === entry.id ? entry : e);
    
    const validation = validateEntry(entry, db.projects, db.tasks, nextEntries);
    entry.estat = entry.warningsDescartades ? 'correcte' : validation.status;

    commitDbChange({ ...db, timeEntries: nextEntries }, {
      accio: 'editar',
      entitat: 'registre',
      idEntitat: entry.id,
      resum: `Actualitzat registre d’hores ID: ${entry.id}.`
    });
  };

  const handleDeleteEntry = (id: string) => {
    const next = db.timeEntries.filter(e => e.id !== id);
    commitDbChange({ ...db, timeEntries: next }, {
      accio: 'eliminar',
      entitat: 'registre',
      idEntitat: id,
      resum: `Eliminat registre de temps ID: ${id}.`
    });
  };

  const handleUpdateSettings = (set: Settings) => {
    commitDbChange({ ...db, settings: set }, {
      accio: 'editar',
      entitat: 'configuració',
      idEntitat: 'global',
      resum: 'Actualitzades les preferències i dades professionals.'
    });
  };

  // Quotes are written atomically before updating UI so a storage quota failure never
  // results in a visible 'issued' quote that has not actually been stored.
  const saveIssuedQuoteChanges = (nextDb: LocalDatabase): boolean => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextDb));
      setDb(nextDb);
      setIsDirty(true);
      scheduleFileSave(nextDb);
      setStorageWarning('');
      return true;
    } catch (error) {
      console.error('No es pot desar el pressupost', error);
      setStorageWarning('No s’ha pogut desar el pressupost. No s’ha emès. Comprova l’espai disponible o exporta una còpia JSON.');
      return false;
    }
  };

  const handleIssueQuote = (quote: IssuedQuote): boolean => {
    if (quote.validUntil < localToday() || quote.validUntil < quote.issueDate) return false;
    if (db.issuedQuotes.some(q => q.reference.trim().toLowerCase() === quote.reference.trim().toLowerCase())) {
      alert('Ja hi ha un pressupost emès amb aquesta referència. Introdueix-ne una de nova.');
      return false;
    }
    const log: AuditLogEntry = {
      id: `aud-q-${quote.id}`, timestamp: new Date().toISOString(), accio: 'emetre',
      entitatAfectada: 'pressupost', idEntitat: quote.id,
      resum: `Pressupost emès: ${quote.reference}. PDF immutable desat.`,
    };
    return saveIssuedQuoteChanges({
      ...db,
      issuedQuotes: [...db.issuedQuotes, quote],
      auditLog: [...db.auditLog, log],
    });
  };

  const handleAcceptQuote = (id: string): boolean => {
    const quote = db.issuedQuotes.find(q => q.id === id);
    if (!quote || quote.validUntil < localToday() || quote.status !== 'pendent') return false;
    const next = db.issuedQuotes.map(q => q.id === id ? markQuoteAccepted(q, new Date().toISOString()) : q);
    return saveIssuedQuoteChanges({ ...db, issuedQuotes: next });
  };

  const handleDeleteIssuedQuote = (id: string): boolean => {
    if (!db.issuedQuotes.some(q => q.id === id)) return false;
    const next = db.issuedQuotes.filter(q => q.id !== id);
    return saveIssuedQuoteChanges({ ...db, issuedQuotes: next });
  };

  // ---------------------------------------------------------------------------
  // NAVIGATION ROUTER PANEL RENDER
  // ---------------------------------------------------------------------------
  const renderViewContent = () => {
    switch (currentView) {
      case 'Dashboard':
        return (
          <DashboardView
            db={db}
            onNavigate={setCurrentView}
            onStopSession={handleStopSession}
            onPauseSession={handlePauseSession}
            onResumeSession={handleResumeSession}
            onUpdateActiveSession={handleUpdateActiveSession}
          />
        );
      case 'Cronòmetre':
        return (
          <ChronometerView
            db={db}
            onStartSession={handleStartSession}
            onStopSession={handleStopSession}
            onPauseSession={handlePauseSession}
            onResumeSession={handleResumeSession}
            onUpdateActiveSession={handleUpdateActiveSession}
            onUpdateTaskNotes={handleUpdateTaskNotesSilent}
          />
        );
      case 'Registres':
        return (
          <RecordsView
            db={db}
            onAddEntry={handleAddEntry}
            onUpdateEntry={handleUpdateEntry}
            onDeleteEntry={handleDeleteEntry}
          />
        );
      case 'Calendari':
        return (
          <CalendarView
            db={db}
            onAddEntry={handleAddEntry}
            onUpdateEntry={handleUpdateEntry}
            onDeleteEntry={handleDeleteEntry}
          />
        );
      case 'Clients':
        return (
          <ClientsView
            db={db}
            onAddClient={handleAddClient}
            onUpdateClient={handleUpdateClient}
            onDeleteClient={handleDeleteClient}
          />
        );
      case 'Projectes':
        return (
          <ProjectsView
            db={db}
            onAddProject={handleAddProject}
            onUpdateProject={handleUpdateProject}
            onDeleteProject={handleDeleteProject}
            onOpenQuote={projectId => { setQuoteProjectId(projectId); setCurrentView('Pressupostos'); }}
          />
        );
      case 'Tasques':
        return (
          <TasksView
            db={db}
            onAddBlock={handleAddBlock}
            onUpdateBlock={handleUpdateBlock}
            onDeleteBlock={handleDeleteBlock}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
          />
        );
      case 'Informes':
        return <ReportsView db={db} />;
      case 'Pressupostos':
        return <QuotesView db={db} initialProjectId={quoteProjectId} onEditTasks={() => setCurrentView('Tasques')} onIssueQuote={handleIssueQuote} onAcceptQuote={handleAcceptQuote} onDeleteQuote={handleDeleteIssuedQuote} />;
      case 'Configuració':
        return (
          <SettingsView
            db={db}
            onUpdateSettings={handleUpdateSettings}
            onClearDatabase={handleClearDatabase}
            onLoadDemo={handleLoadDemo}
          />
        );
      case 'Dades':
        return (
          <FileManagementView
            db={db}
            isDirty={isDirty}
            fileName={fileName}
            fileHandle={fileHandle}
            fileSaveStatus={fileSaveStatus}
            lastFileSavedAt={lastFileSavedAt}
            onRestorePermission={restoreWritePermission}
            onCreateLinkedJson={handleCreateLinkedJson}
            onLoadDb={handleLoadDb}
            onSaveDb={handleSaveDb}
            onCreateNewDb={handleCreateNewDb}
          />
        );
      default:
        return (
          <div className="py-12 text-center text-slate-400">
            Vista en construcció...
          </div>
        );
    }
  };

  const navItems = [
    { name: 'Resum', icon: LayoutDashboard, slug: 'Dashboard', group: 'Seguiment' },
    { name: 'Cronòmetre', icon: Clock, group: 'Seguiment' },
    { name: 'Registres', icon: Table, group: 'Seguiment' },
    { name: 'Calendari', icon: Calendar, group: 'Seguiment' },
    { name: 'Clients', icon: Users, group: 'Organització' },
    { name: 'Projectes', icon: Briefcase, group: 'Organització' },
    { name: 'Tasques', icon: CheckSquare, group: 'Organització' },
    { name: 'Pressupostos', icon: ReceiptText, group: 'Organització' },
    { name: 'Informes', icon: FileBarChart2, group: 'Anàlisi i dades' },
    { name: 'Configuració', icon: SettingsIcon, group: 'Anàlisi i dades' },
    { name: 'Dades i còpies', icon: Database, slug: 'Dades', group: 'Anàlisi i dades' }
  ];

  const viewInfo: Record<string, { title: string; subtitle: string }> = {
    Dashboard: { title: 'Resum', subtitle: 'Activitat, dedicació i seguiment dels projectes' },
    Cronòmetre: { title: 'Cronòmetre', subtitle: 'Registra el temps que dediques a cada feina' },
    Registres: { title: 'Registres de temps', subtitle: 'Consulta i edita les hores treballades' },
    Calendari: { title: 'Calendari', subtitle: 'Consulta l’activitat per dies i setmanes' },
    Clients: { title: 'Clients', subtitle: 'Dades i relacions comercials' },
    Projectes: { title: 'Projectes', subtitle: 'Organitza la feina i controla els pressupostos' },
    Tasques: { title: 'Tasques', subtitle: 'Seguiment de les activitats de cada projecte' },
    Pressupostos: { title: 'Pressupostos', subtitle: 'Estimacions i ofertes comercials per projecte' },
    Informes: { title: 'Informes', subtitle: 'Descarrega els registres i resums d’hores' },
    Configuració: { title: 'Configuració', subtitle: 'Preferències, tarifes i dades professionals' },
    Dades: { title: 'Dades i còpies', subtitle: 'Importa, exporta i protegeix la informació' },
  };
  const currentInfo = viewInfo[currentView] || viewInfo.Dashboard;
  const groups = ['Seguiment', 'Organització', 'Anàlisi i dades'];

  return (
    <div className="min-h-screen bg-[#f6f8fa] flex flex-col md:flex-row font-sans" id="app-wrapper">
      <aside className="hidden md:flex w-[244px] shrink-0 bg-white border-r border-slate-200 min-h-screen flex-col justify-between sticky top-0 h-screen">
        <div>
          <div className="px-6 py-7 border-b border-slate-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#234e70] text-white flex items-center justify-center text-lg font-bold tracking-tight">AC</div>
            <div>
              <div className="text-xl leading-tight font-semibold text-slate-900 tracking-tight">ACnora</div>
              <p className="text-[11px] text-slate-500 mt-0.5">Clients · Projectes · Temps</p>
            </div>
          </div>

          {db.activeSession && (
            <button onClick={() => setCurrentView('Cronòmetre')} className="mx-4 mt-4 w-[calc(100%-2rem)] rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-3 text-left">
              <span className={`text-xs font-semibold ${isSessionPaused(db.activeSession) ? 'text-amber-800' : 'text-emerald-800'}`}>{isSessionPaused(db.activeSession) ? 'Sessió en pausa' : 'Sessió en curs'}</span>
              <span className="block text-xl font-semibold tabular-nums text-slate-900 mt-1">{tickingTime}</span>
              <span className="block text-xs text-slate-600 truncate mt-1">{db.projects.find(p => p.id === db.activeSession!.projecteId)?.nom || 'Projecte'}</span>
            </button>
          )}

          <nav className="px-3 py-4" aria-label="Navegació principal">
            {groups.map(group => (
              <div key={group} className="mb-5">
                <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{group}</div>
                <div className="space-y-1">
                  {navItems.filter(item => item.group === group).map(item => {
                    const target = item.slug || item.name;
                    const active = currentView === target;
                    return (
                      <button key={target} onClick={() => setCurrentView(target)} id={`nav-item-${target}`}
                        aria-current={active ? 'page' : undefined}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] text-left font-medium transition-colors ${active ? 'bg-[#edf3f8] text-[#234e70]' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
                        <item.icon className="w-[17px] h-[17px] shrink-0" strokeWidth={1.9} />
                        {item.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>
        <div className="p-4 border-t border-slate-200">
          <p className="text-xs text-slate-600 mb-3">{fileHandle ? ({ saved: 'JSON desat automàticament', pending: 'Canvis pendents de desar', saving: 'Desant al JSON...', permission: 'Cal autoritzar el JSON', conflict: 'Conflicte: JSON extern modificat', error: 'Error de desament del JSON', restoring: 'Recuperant fitxer', browser: 'Desament al navegador' }[fileSaveStatus]) : 'Desament automàtic al navegador'}</p>
          <button onClick={handleSaveDb} id="sidebar-btn-save-db" className="flex items-center justify-center gap-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50">
            <Save className="w-4 h-4" /> {fileHandle ? 'Desar ara al JSON' : 'Exportar còpia JSON'}
          </button>
        </div>
      </aside>

      <header className="bg-white border-b border-slate-200 md:hidden flex justify-between items-center px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-md bg-[#234e70] text-white font-semibold flex items-center justify-center">AC</div>
          <div><div className="font-semibold text-slate-900">ACnora</div><div className="text-[11px] text-slate-500">Clients · Projectes · Temps</div></div>
        </div>
        <button onClick={() => setMobileMenuOpen(v => !v)} className="rounded-md p-2 border border-slate-200 text-slate-700" aria-label={mobileMenuOpen ? 'Tancar menú' : 'Obrir menú'} aria-expanded={mobileMenuOpen}>
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {mobileMenuOpen && (
        <nav className="bg-white border-b border-slate-200 px-4 py-3 grid grid-cols-2 gap-2 md:hidden" aria-label="Navegació mòbil">
          {navItems.map(item => {
            const target = item.slug || item.name;
            return <button key={target} onClick={() => { setCurrentView(target); setMobileMenuOpen(false); }} className={`flex items-center gap-2 p-3 rounded-md text-[13px] text-left ${currentView === target ? 'bg-[#edf3f8] text-[#234e70]' : 'text-slate-700 bg-slate-50'}`}>
              <item.icon className="w-4 h-4" /> {item.name}
            </button>;
          })}
        </nav>
      )}

      <main className="flex-1 min-w-0 min-h-screen">
        <section className="bg-white border-b border-slate-200 px-5 md:px-9 py-5 flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{currentInfo.title}</h1>
            <p className="text-[13px] text-slate-500 mt-1">{currentInfo.subtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setCurrentView('Dades')} className="hidden lg:block text-xs text-slate-600 max-w-64 truncate hover:underline text-left" title={fileName || 'Dades del navegador'}>{fileHandle ? `${fileName} · ${fileSaveStatus === 'saved' ? 'Desat automàtic' : fileSaveStatus === 'saving' ? 'Desant...' : fileSaveStatus === 'pending' ? 'Pendent' : 'Revisa el desament'}` : 'Dades desades al navegador'}</button>
            <button onClick={() => setCurrentView('Cronòmetre')} className="rounded-md bg-[#234e70] hover:bg-[#193c58] text-white text-[13px] font-medium px-4 py-2.5 flex items-center gap-2">
              {db.activeSession ? <Clock className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {db.activeSession ? (isSessionPaused(db.activeSession) ? 'Veure sessió en pausa' : 'Veure sessió activa') : 'Registrar temps'}
            </button>
          </div>
        </section>

        {storageWarning && (
          <div role="alert" className="mx-5 md:mx-9 mt-5 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex justify-between gap-4 items-start">
            <span>{storageWarning}</span>
            <button onClick={() => setCurrentView('Dades')} className="font-semibold underline shrink-0">Dades i còpies</button>
          </div>
        )}

        <div className="max-w-[1440px] mx-auto px-5 py-6 md:px-9 md:py-8">
          {renderViewContent()}
        </div>
      </main>
    </div>
  );
}
