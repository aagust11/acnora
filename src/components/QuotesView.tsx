import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FileText, AlertTriangle, Download, Info, Trash2, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react';
import type { LocalDatabase, IssuedQuote } from '../types';
import { buildQuoteSummary, getTaskQuoteInputs, hoursRange, quoteRange } from '../utils/quotation';
import { generateQuotePDF, DEFAULT_TAX_NOTE, DEFAULT_ESTIMATE_NOTE, DEFAULT_CONDITIONS } from '../utils/quotePdf';
import { downloadIssuedQuote } from '../utils/issuedQuotes';
import { localToday } from '../utils/timeUtils';
import { orderQuoteTasks, moveQuoteTask, moveQuoteGroup, quoteGroupKey, quoteGroupLabel } from '../utils/quoteOrdering';

interface QuotesViewProps {
  db: LocalDatabase;
  initialProjectId?: string;
  onEditTasks?: () => void;
  onIssueQuote: (record: IssuedQuote) => boolean;
  onAcceptQuote: (id: string) => boolean;
  onDeleteQuote: (id: string) => boolean;
}

export default function QuotesView({ db, initialProjectId, onEditTasks, onIssueQuote, onAcceptQuote, onDeleteQuote }: QuotesViewProps) {
  const [projectId, setProjectId] = useState(initialProjectId || '');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [manualOrder, setManualOrder] = useState<string[]>([]);
  const [showHours, setShowHours] = useState(true);
  const [showHourlyRates, setShowHourlyRates] = useState(true);
  const [issueDate, setIssueDate] = useState(localToday());
  const [quoteNumber, setQuoteNumber] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [conditions, setConditions] = useState(DEFAULT_CONDITIONS);
  const [observations, setObservations] = useState('');
  const [taxNote, setTaxNote] = useState(DEFAULT_TAX_NOTE);
  const [estimateNote, setEstimateNote] = useState(DEFAULT_ESTIMATE_NOTE);
  const [error, setError] = useState('');

  const project = db.projects.find(p => p.id === projectId);
  const client = db.clients.find(c => c.id === project?.clientId);
  const projectTasks = db.tasks.filter(t => t.projecteId === projectId && t.estat !== 'arxivada');
  const orderedTasks = orderQuoteTasks(projectTasks, db.blocs, manualOrder);
  const displayedGroups = [...new Set(orderedTasks.map(quoteGroupKey))];

  useEffect(() => {
    if (initialProjectId) setProjectId(initialProjectId);
  }, [initialProjectId]);

  useEffect(() => {
    setSelectedIds(projectTasks.map(t => t.id));
    setManualOrder([]);
    setError('');
  }, [projectId]);

  const selectedTasks = orderedTasks.filter(t => selectedIds.includes(t.id));
  const summary = useMemo(
    () => {
      if (!project) return null;
      const result = buildQuoteSummary(selectedTasks, project, db.settings);
      result.lines = result.lines.map(line => ({
        ...line,
        blocNom: quoteGroupLabel(quoteGroupKey(line.task), db.blocs),
      }));
      return result;
    },
    [selectedTasks, project, db.settings, db.blocs]
  );
  const currency = db.settings.currency;
  const canExport = !!project && !!client && !!summary && summary.lines.length > 0 && summary.errors.length === 0 && !!quoteNumber.trim() && !!issueDate && !!validUntil && validUntil >= issueDate && validUntil >= localToday() && !db.issuedQuotes.some(q => q.reference.toLowerCase() === quoteNumber.trim().toLowerCase());

  const exportPDF = () => {
    if (!project || !client || !summary || !canExport) {
      setError('Completa les dades del pressupost i revisa les tasques seleccionades.');
      return;
    }
    try {
      const pdf = generateQuotePDF(client, project, summary.lines, db.settings, {
        quoteNumber: quoteNumber.trim(), issueDate, validUntil,
        showHours, showHourlyRates, conditions, observations, taxNote, estimateNote,
      });
      // Snapshot all commercial information and retain exact PDF bytes; never rebuild an issued document.
      const snapshot = JSON.parse(JSON.stringify({
        client, project, tasks: summary.lines.map(l => l.task), settings: db.settings,
        blocks: db.blocs.filter(b => b.projecteId === project.id),
        orderedTaskIds: summary.lines.map(l => l.task.id),
        text: { taxes: taxNote, estimate: estimateNote, conditions, observations },
        showHours, showHourlyRates,
      })) as IssuedQuote['snapshot'];
      const record: IssuedQuote = {
        id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        reference: quoteNumber.trim(), projectId: project.id, clientId: client.id,
        projectName: project.nom, clientName: client.nom,
        createdAt: new Date().toISOString(), issueDate, validUntil, status: 'pendent',
        minAmount: summary.minAmount, maxAmount: summary.maxAmount,
        currency: db.settings.currency,
        filename: pdf.filename, pdfDataUri: pdf.pdfDataUri, snapshot,
      };
      if (!onIssueQuote(record)) {
        setError('No s’ha pogut desar el pressupost emès. Revisa la referència i l’espai d’emmagatzematge.');
        return;
      }
      downloadIssuedQuote(record);
      setQuoteNumber('');
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No s’ha pogut generar el PDF.');
    }
  };

  return (
    <div className="max-w-6xl space-y-5" id="view-quotes">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="font-semibold text-lg text-slate-900">Pressupostos</h2>
          <p className="text-sm text-slate-600 mt-1">Emet pressupostos, conserva el PDF original i gestiona la validesa de cada proposta.</p>
        </div>
        <button onClick={exportPDF} disabled={!canExport} className="bg-[#234e70] hover:bg-[#1b3f5c] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md px-4 py-2.5 text-sm font-semibold flex items-center gap-2">
          <FileText className="w-4 h-4" /> Emetre pressupost i desar PDF
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="text-sm font-medium text-slate-700">Projecte a pressupostar
            <select value={projectId} onChange={e => { setProjectId(e.target.value); setQuoteNumber(''); }} className="block w-full mt-1.5 rounded-md border border-slate-300 p-2.5 bg-white">
              <option value="">Selecciona un projecte...</option>
              {db.projects.map(p => <option key={p.id} value={p.id}>{db.clients.find(c => c.id === p.clientId)?.nom || 'Client'} · {p.nom}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">Referència del pressupost
            <input type="text" maxLength={60} value={quoteNumber} onChange={e => setQuoteNumber(e.target.value)} placeholder="ACN-2026-001" className="block w-full mt-1.5 rounded-md border border-slate-300 p-2.5" />
          </label>
          <label className="text-sm font-medium text-slate-700">Data d’emissió
            <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className="block w-full mt-1.5 rounded-md border border-slate-300 p-2.5" />
          </label>
          <label className="text-sm font-medium text-slate-700">Vàlid fins a *
            <input type="date" required min={issueDate > localToday() ? issueDate : localToday()} value={validUntil} onChange={e => setValidUntil(e.target.value)} className="block w-full mt-1.5 rounded-md border border-slate-300 p-2.5" />
          </label>
        </div>
        {client && <p className="text-sm text-slate-600">Destinatari: <span className="font-semibold text-slate-800">{client.nom}</span></p>}
        {!db.settings.freelancer.name && <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-3">Configura el teu nom o raó social a Configuració abans d’enviar el pressupost.</p>}
      </div>

      {project && <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200">
          <div>
            <h3 className="font-semibold text-slate-900">Tasques incloses</h3>
            <p className="text-sm text-slate-600 mt-1">Ordenat inicialment per nom del bloc de treball i després per tasca. Pots moure els blocs i les tasques amb les fletxes; l’ordre escollit serà el del PDF.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setManualOrder([])} disabled={!manualOrder.length}
              className="border border-slate-300 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 inline-flex items-center gap-2">
              <RotateCcw className="w-4 h-4" /> Ordenar alfabèticament
            </button>
            {onEditTasks && <button onClick={onEditTasks} className="border border-slate-300 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Editar tasques</button>}
          </div>
        </div>
        {projectTasks.length === 0 ? (
          <div className="px-5 py-8 text-sm text-slate-600">Aquest projecte no té tasques actives. Crea’n una a l’apartat Tasques i defineix-hi les hores mínimes, màximes i la tarifa.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[700px]">
              <thead className="bg-slate-50 text-slate-600 text-xs">
                <tr><th className="text-left p-3">Incloure</th><th className="text-left p-3">Tasca</th><th className="text-center p-3">Ordre</th><th className="text-right p-3">Estimació manual</th><th className="text-right p-3">Tarifa</th><th className="text-right p-3">Import estimat</th></tr>
              </thead>
              <tbody>
                {orderedTasks.map((task, index) => {
                  const currentGroup = quoteGroupKey(task);
                  const groupTasks = orderedTasks.filter(t => quoteGroupKey(t) === currentGroup);
                  const taskPosition = groupTasks.findIndex(t => t.id === task.id);
                  const groupPosition = displayedGroups.indexOf(currentGroup);
                  const isGroupStart = index === 0 || quoteGroupKey(orderedTasks[index - 1]) !== currentGroup;
                  const values = getTaskQuoteInputs(task, project, db.settings);
                  const one = buildQuoteSummary([task], project, db.settings);
                  const valid = one.errors.length === 0 && one.lines.length === 1;
                  const quoted = one.lines[0];
                  return <React.Fragment key={task.id}>
                    {isGroupStart && <tr className="bg-[#edf3f8] border-t border-slate-200">
                      <td colSpan={6} className="px-3 py-2">
                        <div className="flex flex-wrap justify-between items-center gap-2">
                          <span className="text-sm font-semibold text-[#234e70]">{quoteGroupLabel(currentGroup, db.blocs)}</span>
                          <div className="inline-flex gap-1" aria-label={`Reordenar bloc ${quoteGroupLabel(currentGroup, db.blocs)}`}>
                            <button type="button" aria-label={`Pujar bloc ${quoteGroupLabel(currentGroup, db.blocs)}`} title="Pujar bloc" disabled={groupPosition === 0} onClick={() => setManualOrder(moveQuoteGroup(projectTasks, db.blocs, manualOrder, currentGroup, -1))} className="rounded border border-slate-300 bg-white p-1.5 disabled:opacity-30 hover:bg-slate-50"><ArrowUp className="w-4 h-4" /></button>
                            <button type="button" aria-label={`Baixar bloc ${quoteGroupLabel(currentGroup, db.blocs)}`} title="Baixar bloc" disabled={groupPosition === displayedGroups.length - 1} onClick={() => setManualOrder(moveQuoteGroup(projectTasks, db.blocs, manualOrder, currentGroup, 1))} className="rounded border border-slate-300 bg-white p-1.5 disabled:opacity-30 hover:bg-slate-50"><ArrowDown className="w-4 h-4" /></button>
                          </div>
                        </div>
                      </td>
                    </tr>}
                    <tr className="border-t border-slate-100">
                    <td className="px-3 py-3"><input type="checkbox" checked={selectedIds.includes(task.id)} onChange={e => setSelectedIds(ids => e.target.checked ? [...ids, task.id] : ids.filter(id => id !== task.id))} aria-label={`Incloure ${task.nom}`} className="w-4 h-4 accent-[#234e70]" /></td>
                    <td className="px-3 py-3">
                      {task.blocId && <div className="text-xs font-medium text-[#234e70] mb-1">{db.blocs.find(b=>b.id===task.blocId)?.nom || 'Bloc desconegut'}</div>}
                      <div className="font-medium text-slate-800">{task.nom}</div>
                      {task.descripcio && <div className="text-xs text-slate-500 mt-0.5 whitespace-pre-line">{task.descripcio}</div>}
                      {values.trams && values.trams.length > 1 && <div className="text-xs text-slate-600 mt-2 space-y-1 border-l-2 border-slate-200 pl-2">
                        {values.trams.map(t => <div key={t.id}>{t.concepte || 'Tram'}: {t.horesMin === 0 && t.horesMax === 0
                          ? `preu fix ${quoteRange(t.tarifa,t.tarifa,currency)}`
                          : `${hoursRange(t.horesMin,t.horesMax)} × ${quoteRange(t.tarifa,t.tarifa,currency)}/h`}</div>)}
                      </div>}
                    </td>
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      <button type="button" title="Pujar tasca" aria-label={`Pujar tasca ${task.nom}`} disabled={taskPosition === 0} onClick={() => setManualOrder(moveQuoteTask(projectTasks, db.blocs, manualOrder, task.id, -1))} className="inline-flex rounded border border-slate-300 p-1.5 mr-1 disabled:opacity-30 hover:bg-slate-50"><ArrowUp className="w-4 h-4" /></button>
                      <button type="button" title="Baixar tasca" aria-label={`Baixar tasca ${task.nom}`} disabled={taskPosition === groupTasks.length - 1} onClick={() => setManualOrder(moveQuoteTask(projectTasks, db.blocs, manualOrder, task.id, 1))} className="inline-flex rounded border border-slate-300 p-1.5 disabled:opacity-30 hover:bg-slate-50"><ArrowDown className="w-4 h-4" /></button>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{values.minHours === undefined || values.maxHours === undefined ? <span className="text-amber-700">Pendent</span> : values.maxHours === 0 ? <span className="text-slate-500">—</span> : hoursRange(values.minHours, values.maxHours)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{values.maxHours === 0 ? <span className="text-slate-600">Preu fix</span> : values.hourlyRate === null ? <span className="text-slate-600">Diverses tarifes</span> : quoteRange(values.hourlyRate, values.hourlyRate, currency)}</td>
                    <td className="px-3 py-3 text-right tabular-nums font-medium">{valid ? <>{quoteRange(quoted.minAmount, quoted.maxAmount, currency)}{quoted.manualPrice !== undefined && <span className="block text-xs text-slate-500">Import manual</span>}</> : <span className="text-amber-700">Per completar</span>}</td>
                    </tr>
                  </React.Fragment>;
                })}
              </tbody>
            </table>
          </div>
        )}
        {summary && summary.errors.length > 0 && (
          <div className="mx-5 mb-4 p-3 rounded-md bg-amber-50 border border-amber-200 text-sm text-amber-800 flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> <div>{summary.errors.map((e,i) => <p key={i}>{e}</p>)}</div>
          </div>
        )}
        {summary && summary.lines.length > 0 && <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:justify-between gap-3">
          <div className="text-sm text-slate-600">Estimació interna: <strong className="text-slate-800">{summary.maxHours === 0 ? 'Sense hores (preu fix)' : hoursRange(summary.minHours, summary.maxHours)}</strong></div>
          <div className="text-base font-semibold text-[#234e70]">Total estimat: {quoteRange(summary.minAmount, summary.maxAmount, currency)}</div>
        </div>}
      </div>}

      {project && <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <h3 className="font-semibold text-slate-900">Presentació del pressupost al client</h3>
        <div className="flex flex-wrap gap-6">
          <label className="text-sm text-slate-700 flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={showHours} onChange={e => setShowHours(e.target.checked)} className="w-4 h-4 accent-[#234e70]" /> Mostrar hores estimades al PDF
          </label>
          <label className="text-sm text-slate-700 flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={showHourlyRates} onChange={e => setShowHourlyRates(e.target.checked)} className="w-4 h-4 accent-[#234e70]" /> Mostrar tarifa horària al PDF
          </label>
        </div>
        {!showHours && showHourlyRates && <div className="text-sm text-slate-600 flex items-start gap-2"><Info className="w-4 h-4 mt-0.5 shrink-0" /> Tot i ocultar les hores, mostrar tarifes i imports permet al client deduir aproximadament la dedicació.</div>}
        <div className="grid md:grid-cols-2 gap-4">
          <label className="text-sm font-medium text-slate-700 block">Nota sobre impostos
            <textarea rows={3} value={taxNote} onChange={e => setTaxNote(e.target.value)} placeholder="Informació fiscal que vols mostrar..." className="block w-full mt-1.5 rounded-md border border-slate-300 p-3 font-normal text-sm" />
          </label>
          <label className="text-sm font-medium text-slate-700 block">Avís sobre l'import estimat
            <textarea rows={3} value={estimateNote} onChange={e => setEstimateNote(e.target.value)} placeholder="Text sobre estimacions o preus tancats..." className="block w-full mt-1.5 rounded-md border border-slate-300 p-3 font-normal text-sm" />
          </label>
        </div>
        <label className="text-sm font-medium text-slate-700 block">Condicions comercials
          <textarea rows={4} value={conditions} onChange={e => setConditions(e.target.value)} placeholder="Forma de pagament, terminis, abast, modificacions..." className="block w-full mt-1.5 rounded-md border border-slate-300 p-3 font-normal text-sm" />
        </label>
        <label className="text-sm font-medium text-slate-700 block">Observacions addicionals
          <textarea rows={4} value={observations} onChange={e => setObservations(e.target.value)} placeholder="Aclariments al client, requisits o notes complementàries..." className="block w-full mt-1.5 rounded-md border border-slate-300 p-3 font-normal text-sm" />
        </label>
        <p className="text-xs text-slate-500">Tots els textos admeten salts de línia. Quedaran incorporats al PDF emès i no es modificaran encara que posteriorment editis aquest formulari.</p>
        <p className="text-xs text-slate-600">La validesa és obligatòria. El PDF emès queda congelat; els pressupostos pendents que caduquin s'eliminen en reobrir ACnora o mentre estigui oberta. Els acceptats es conserven.</p>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <div className="flex justify-end"><button onClick={exportPDF} disabled={!canExport} className="bg-[#234e70] hover:bg-[#1b3f5c] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md px-5 py-3 text-sm font-semibold flex items-center gap-2"><FileText className="w-4 h-4" /> Emetre i desar el pressupost</button></div>
      </div>}
      {!project && <div className="bg-white border border-slate-200 rounded-lg p-8 text-sm text-slate-600 flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-slate-400" /> Selecciona un projecte per preparar un pressupost.</div>}

      <section className="bg-white rounded-lg border border-slate-200 overflow-hidden" aria-label="Registre de pressupostos emesos">
        <div className="p-5 border-b border-slate-200">
          <h3 className="text-base font-semibold text-slate-900">Pressupostos emesos</h3>
          <p className="text-xs text-slate-600 mt-1">Es conserva el PDF original, independentment de qualsevol canvi posterior a l'aplicació. Després de caducar, les propostes no acceptades s'eliminen en obrir o utilitzar ACnora.</p>
        </div>
        {!db.issuedQuotes.length ? <p className="px-5 py-7 text-sm text-slate-600">Encara no s'ha emès cap pressupost.</p> : (
          <div className="divide-y divide-slate-100">
            {[...db.issuedQuotes].sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map(q => <div key={q.id} className="p-4 md:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2 items-center"><span className="font-semibold text-sm text-slate-900">{q.reference}</span><span className={`px-2 py-0.5 rounded text-xs ${q.status === 'acceptat' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>{q.status === 'acceptat' ? 'Acceptat' : 'Pendent'}</span></div>
                <p className="text-sm text-slate-700 mt-1">{q.clientName} · {q.projectName}</p>
                <p className="text-xs text-slate-600 mt-1">Emès: {q.issueDate} · Vàlid fins: {q.validUntil} · {quoteRange(q.minAmount, q.maxAmount, q.currency)}</p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <button type="button" onClick={() => { try { downloadIssuedQuote(q); setError(''); } catch (e) { setError(e instanceof Error ? e.message : 'No s’ha pogut descarregar.'); } }} className="inline-flex items-center gap-2 border border-slate-300 rounded-md px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Download className="w-4 h-4" /> PDF original</button>
                {q.status === 'pendent' && <button type="button" onClick={() => { if (window.confirm(`Confirmes que el client ha acceptat el pressupost ${q.reference}?`)) { if (!onAcceptQuote(q.id)) setError('No s’ha pogut registrar l’acceptació.'); } }} className="border border-emerald-300 text-emerald-800 rounded-md px-3 py-2 text-xs font-semibold hover:bg-emerald-50">Marcar acceptat</button>}
                <button type="button" onClick={() => { if (window.confirm(`Eliminar definitivament el pressupost ${q.reference} i el seu PDF original? Aquesta acció no es pot desfer.`)) { if (!onDeleteQuote(q.id)) setError('No s’ha pogut eliminar.'); } }} className="inline-flex items-center gap-1 border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-600 hover:text-red-700 hover:border-red-300"><Trash2 className="w-4 h-4" /> Eliminar</button>
              </div>
            </div>)}
          </div>
        )}
      </section>
      {error && <div role="alert" className="text-sm text-red-700">{error}</div>}
    </div>
  );
}
