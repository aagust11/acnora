import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FileText, AlertTriangle, Download, Info } from 'lucide-react';
import type { LocalDatabase } from '../types';
import { buildQuoteSummary, getTaskQuoteInputs, hoursRange, quoteRange } from '../utils/quotation';
import { generateQuotePDF } from '../utils/quotePdf';
import { localToday } from '../utils/timeUtils';

interface QuotesViewProps {
  db: LocalDatabase;
  initialProjectId?: string;
  onEditTasks?: () => void;
}

export default function QuotesView({ db, initialProjectId, onEditTasks }: QuotesViewProps) {
  const [projectId, setProjectId] = useState(initialProjectId || '');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showHours, setShowHours] = useState(true);
  const [showHourlyRates, setShowHourlyRates] = useState(true);
  const [issueDate, setIssueDate] = useState(localToday());
  const [quoteNumber, setQuoteNumber] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [conditions, setConditions] = useState('La dedicació i l’import final dependran de l’abast definitiu i del temps realment necessari. Qualsevol ampliació de l’abast es pressupostarà per separat.');
  const [error, setError] = useState('');

  const project = db.projects.find(p => p.id === projectId);
  const client = db.clients.find(c => c.id === project?.clientId);
  const projectTasks = db.tasks.filter(t => t.projecteId === projectId && t.estat !== 'arxivada');

  useEffect(() => {
    if (initialProjectId) setProjectId(initialProjectId);
  }, [initialProjectId]);

  useEffect(() => {
    setSelectedIds(projectTasks.map(t => t.id));
    setError('');
  }, [projectId]);

  const selectedTasks = projectTasks.filter(t => selectedIds.includes(t.id));
  const summary = useMemo(
    () => project ? buildQuoteSummary(selectedTasks, project, db.settings) : null,
    [selectedTasks, project, db.settings]
  );
  const currency = db.settings.currency;
  const canExport = !!project && !!client && !!summary && summary.lines.length > 0 && summary.errors.length === 0 && !!quoteNumber.trim() && !!issueDate && (!validUntil || validUntil >= issueDate);

  const exportPDF = () => {
    if (!project || !client || !summary || !canExport) {
      setError('Completa les dades del pressupost i revisa les tasques seleccionades.');
      return;
    }
    try {
      generateQuotePDF(client, project, summary.lines, db.settings, {
        quoteNumber: quoteNumber.trim(), issueDate, validUntil,
        showHours, showHourlyRates, conditions,
      });
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
          <p className="text-sm text-slate-600 mt-1">Genera una oferta a partir de les tasques i de les estimacions definides a cada projecte.</p>
        </div>
        <button onClick={exportPDF} disabled={!canExport} className="bg-[#234e70] hover:bg-[#1b3f5c] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md px-4 py-2.5 text-sm font-semibold flex items-center gap-2">
          <Download className="w-4 h-4" /> Descarregar pressupost PDF
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
          <label className="text-sm font-medium text-slate-700">Vàlid fins a (opcional)
            <input type="date" min={issueDate} value={validUntil} onChange={e => setValidUntil(e.target.value)} className="block w-full mt-1.5 rounded-md border border-slate-300 p-2.5" />
          </label>
        </div>
        {client && <p className="text-sm text-slate-600">Destinatari: <span className="font-semibold text-slate-800">{client.nom}</span></p>}
        {!db.settings.freelancer.name && <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-3">Configura el teu nom o raó social a Configuració abans d’enviar el pressupost.</p>}
      </div>

      {project && <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200">
          <div>
            <h3 className="font-semibold text-slate-900">Tasques incloses</h3>
            <p className="text-sm text-slate-600 mt-1">Marca només les tasques que formen part de l’oferta. Les xifres són estimacions, no hores ja treballades.</p>
          </div>
          {onEditTasks && <button onClick={onEditTasks} className="border border-slate-300 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Editar tasques</button>}
        </div>
        {projectTasks.length === 0 ? (
          <div className="px-5 py-8 text-sm text-slate-600">Aquest projecte no té tasques actives. Crea’n una a l’apartat Tasques i defineix-hi les hores mínimes, màximes i la tarifa.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[700px]">
              <thead className="bg-slate-50 text-slate-600 text-xs">
                <tr><th className="text-left p-3">Incloure</th><th className="text-left p-3">Tasca</th><th className="text-right p-3">Estimació manual</th><th className="text-right p-3">Tarifa</th><th className="text-right p-3">Import estimat</th></tr>
              </thead>
              <tbody>
                {projectTasks.map(task => {
                  const values = getTaskQuoteInputs(task, project, db.settings);
                  const valid = values.minHours !== undefined && values.maxHours !== undefined && values.minHours >= 0 && values.maxHours >= values.minHours && values.hourlyRate > 0;
                  return <tr key={task.id} className="border-t border-slate-100">
                    <td className="px-3 py-3"><input type="checkbox" checked={selectedIds.includes(task.id)} onChange={e => setSelectedIds(ids => e.target.checked ? [...ids, task.id] : ids.filter(id => id !== task.id))} aria-label={`Incloure ${task.nom}`} className="w-4 h-4 accent-[#234e70]" /></td>
                    <td className="px-3 py-3"><div className="font-medium text-slate-800">{task.nom}</div>{task.descripcio && <div className="text-xs text-slate-500 mt-0.5">{task.descripcio}</div>}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{values.minHours === undefined || values.maxHours === undefined ? <span className="text-amber-700">Pendent</span> : hoursRange(values.minHours, values.maxHours)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{quoteRange(values.hourlyRate, values.hourlyRate, currency)}</td>
                    <td className="px-3 py-3 text-right tabular-nums font-medium">{valid ? quoteRange(values.minHours! * values.hourlyRate, values.maxHours! * values.hourlyRate, currency) : <span className="text-amber-700">Per completar</span>}</td>
                  </tr>;
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
          <div className="text-sm text-slate-600">Estimació interna: <strong className="text-slate-800">{hoursRange(summary.minHours, summary.maxHours)}</strong></div>
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
        <label className="text-sm font-medium text-slate-700 block">Condicions i observacions del pressupost
          <textarea rows={4} value={conditions} onChange={e => setConditions(e.target.value)} placeholder="Condicions comercials, forma de pagament..." className="block w-full mt-1.5 rounded-md border border-slate-300 p-3 font-normal text-sm" />
        </label>
        <p className="text-xs text-slate-600">El PDF inclou l’emissor (Configuració), el client i les tasques seleccionades. Mostra un rang de preus abans d’impostos, no una oferta de preu tancat. L’exportació no altera les hores fitxades.</p>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <div className="flex justify-end"><button onClick={exportPDF} disabled={!canExport} className="bg-[#234e70] hover:bg-[#1b3f5c] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md px-5 py-3 text-sm font-semibold flex items-center gap-2"><FileText className="w-4 h-4" /> Generar pressupost PDF</button></div>
      </div>}
      {!project && <div className="bg-white border border-slate-200 rounded-lg p-8 text-sm text-slate-600 flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-slate-400" /> Selecciona un projecte per preparar un pressupost.</div>}
    </div>
  );
}
