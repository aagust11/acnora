import { localToday } from '../utils/timeUtils';
import React, { useState } from 'react';
import { LocalDatabase, Client, Project, Task, TimeEntry } from '../types';
import { FileText, Download, Eye, EyeOff, FileSpreadsheet, FileBox, Printer, Mail, Calendar } from 'lucide-react';
import { formatDuration, formatCurrency, formatDate } from '../utils/timeUtils';
import { exportToCSV, exportToExcel, generatePDF, downloadFile } from '../utils/exportUtils';

interface ReportsViewProps {
  db: LocalDatabase;
}

export default function ReportsView({ db }: ReportsViewProps) {
  const { timeEntries, clients, projects, tasks } = db;

  // Filter options
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isFacturable, setIsFacturable] = useState<string>('all'); // 'all', 'yes', 'no'
  const [entryEstat, setEntryEstat] = useState<string>('all'); // 'all', 'correcte', 'revisar'

  // Report presets
  const [isClientReport, setIsClientReport] = useState(false); // If true, hide notesInternes
  const [showAmounts, setShowAmounts] = useState(db.settings.showAmountsByDefault);

  // Generate Entries Filter
  const matchesPeriod = (entryDate: string): boolean => {
    const entryTime = new Date(entryDate).getTime();
    const start = startDate ? new Date(startDate).getTime() : null;
    const end = endDate ? new Date(endDate).getTime() : null;

    if (start && end) {
      return entryTime >= start && entryTime <= end;
    } else if (start) {
      return entryTime >= start;
    } else if (end) {
      return entryTime <= end;
    }
    return true;
  };

  const filteredEntries = timeEntries.filter(entry => {
    if (clientId && entry.clientId !== clientId) return false;
    if (projectId && entry.projecteId !== projectId) return false;
    if (taskId && entry.tascaId !== taskId) return false;
    if (!matchesPeriod(entry.data)) return false;

    if (isFacturable !== 'all') {
      const wantFacturable = isFacturable === 'yes';
      if (entry.facturable !== wantFacturable) return false;
    }

    // Ometem registres amb alertes d'incoherència de l'informe per al client
    if (isClientReport && (entry.estat === 'incoherent' || entry.estat === 'pendent de revisar')) return false;

    if (entryEstat !== 'all' && entry.estat !== entryEstat) return false;

    return true;
  });

  // Calculate aggregates
  let totalMins = 0;
  let totalFactuMins = 0;
  let totalEarnings = 0;

  filteredEntries.forEach(entry => {
    totalMins += entry.duradaMinuts;
    if (entry.facturable) {
      totalFactuMins += entry.duradaMinuts;
      totalEarnings += entry.importCalculat || 0;
    }
  });

  // Client name for PDF header
  const reportClientNom = clientId ? clients.find(c => c.id === clientId)?.nom : undefined;
  const reportProjectNom = projectId ? projects.find(p => p.id === projectId)?.nom : undefined;
  
  const periodStr = (startDate || endDate)
    ? `${startDate ? `des de ${startDate}` : ''} ${endDate ? `fins a ${endDate}` : ''}`
    : `Sencer (Històric absolut, total de ${filteredEntries.length} registres)`;

  // Export handlers
  const handleCSVExport = () => {
    const csvContent = exportToCSV(filteredEntries, clients, projects, tasks, showAmounts, db.settings.currency);
    const dateStr = localToday();
    downloadFile(csvContent, `informe_registres_${dateStr}.csv`, 'text/csv;charset=utf-8;');
  };

  const handleExcelExport = () => {
    const excelContent = exportToExcel(filteredEntries, clients, projects, tasks, showAmounts, db.settings.currency);
    const dateStr = localToday();
    downloadFile(excelContent, `informe_registres_${dateStr}.xls`, 'application/vnd.ms-excel;');
  };

  const handlePDFExport = () => {
    generatePDF(filteredEntries, clients, projects, tasks, db.settings, {
      clientNom: reportClientNom,
      projecteNom: reportProjectNom,
      periodStr,
      isClientReport,
      showAmounts
    });
  };

  return (
    <div className="space-y-6" id="view-reports">
      
      {/* Filters parameters */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-100 p-5 space-y-4">
        <h3 className="font-sans font-semibold text-slate-800 text-sm flex items-center gap-2">
          <FileText className="w-5 h-5 text-slate-500" />
          Filtres de Generació d'Informe
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Client select */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Filtrar per Client</label>
            <select
              value={clientId}
              onChange={e => { setClientId(e.target.value); setProjectId(''); setTaskId(''); }}
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 cursor-pointer"
            >
              <option value="">-- Tots els clients --</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </div>

          {/* Project select */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Filtrar per Projecte</label>
            <select
              disabled={!clientId}
              value={projectId}
              onChange={e => { setProjectId(e.target.value); setTaskId(''); }}
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 disabled:opacity-50 cursor-pointer"
            >
              <option value="">-- Tots els projectes --</option>
              {projects.filter(p => !clientId || p.clientId === clientId).map(p => (
                <option key={p.id} value={p.id}>{p.nom} {p.estat === 'arxivat' ? '(Arxivat)' : ''}</option>
              ))}
            </select>
          </div>

          {/* Task select */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Filtrar per Tasca</label>
            <select
              disabled={!projectId}
              value={taskId}
              onChange={e => setTaskId(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 disabled:opacity-50 cursor-pointer"
            >
              <option value="">-- Totes les tasques --</option>
              {tasks.filter(t => t.projecteId === projectId).map(t => (
                <option key={t.id} value={t.id}>{t.nom}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Des de (Inici)</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Fins a (Fi)</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Facturabilitat</label>
            <select
              value={isFacturable}
              onChange={e => setIsFacturable(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50"
            >
              <option value="all">Tots (Facturables i no)</option>
              <option value="yes">Només registres Facturables</option>
              <option value="no">Només no facturables</option>
            </select>
          </div>

          {!isClientReport && (
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Estat del Registre (Auditat)</label>
              <select
                value={entryEstat}
                onChange={e => setEntryEstat(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50"
              >
                <option value="all">Tots els registres</option>
                <option value="correcte">Només correctes</option>
                <option value="pendent de revisar">Pendent de revisar</option>
                <option value="incoherent">Amb incoherències insolubles</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Presentation Customizer Options (Client modes & Hiding prices) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Toggle switches side */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-100 p-5 flex flex-col justify-between">
          <div className="space-y-4">
            <h4 className="font-sans font-semibold text-slate-800 text-xs uppercase tracking-wider">Opcions de Maquetació</h4>

            {/* Client Report Mode */}
            <div className="flex items-start justify-between gap-2.5 pb-2 border-b border-slate-50">
              <div>
                <span className="text-xs font-semibold text-slate-850 block">Tipus d'destinatari</span>
                <span className="text-xs text-slate-400">Canvia entre informe privat d'ús intern o per enviar.</span>
              </div>
              <div className="flex bg-slate-100 p-0.5 rounded-md border text-xs">
                <button
                  type="button"
                  onClick={() => setIsClientReport(false)}
                  className={`px-2 py-1 rounded font-semibold text-xs cursor-pointer ${
                    !isClientReport ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Intern
                </button>
                <button
                  type="button"
                  onClick={() => setIsClientReport(true)}
                  className={`px-2 py-1 rounded font-semibold text-xs cursor-pointer ${
                    isClientReport ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Client
                </button>
              </div>
            </div>

            {/* Toggle show prices */}
            <div className="flex items-start justify-between gap-2.5 pt-2">
              <div>
                <span className="text-xs font-semibold text-slate-800 block">Mostrar Imports Econòmics</span>
                <span className="text-xs text-slate-400">Si està apagat, oculta honoraris, tarifes i sumes finals.</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAmounts(!showAmounts)}
                className={`p-1 rounded cursor-pointer transition ${
                  showAmounts ? 'text-[#234e70] bg-[#edf3f8]' : 'text-slate-400 bg-slate-100'
                }`}
                title="Mostrar/Ocultar diners"
                id="btn-toggle-amounts-visibility"
              >
                {showAmounts ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-50 text-xs text-slate-400 italic">
            * L'informe per a clients amaga instantàniament les columnes de notes internes o registres de control per rebre un format més llimpi i formal.
          </div>
        </div>

        {/* Aggregate metrics Display side */}
        <div className="md:col-span-2 bg-white text-slate-900 border border-slate-200 rounded-lg p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-500" />
              <h4 className="text-slate-600 font-sans font-bold text-xs uppercase tracking-wide">Resum del període</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
              {/* Core Hours */}
              <div>
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider block">Temps total</span>
                <span className="text-3xl font-mono font-bold mt-1 block">
                  {formatDuration(totalMins, 'decimal')}
                </span>
                <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">({formatDuration(totalMins, 'clock')})</span>
              </div>
              {/* Billable Hours */}
              <div>
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider block">Hores Facturables</span>
                <span className="text-3xl font-mono font-bold mt-1 block">
                  {formatDuration(totalFactuMins, 'decimal')}
                </span>
                <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">No facturable: {formatDuration(totalMins - totalFactuMins, 'decimal')}</span>
              </div>
              {/* Estimated Billings */}
              <div>
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider block">Import estimat</span>
                <span className="text-3xl font-mono font-bold mt-1 block">
                  {showAmounts ? formatCurrency(totalEarnings, db.settings.currency) : '***'}
                </span>
                <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">Basat en {filteredEntries.length} intervals</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 mt-8 border-t border-slate-200 pt-4">
            <button
              onClick={handlePDFExport}
              id="btn-export-pdf"
              className="px-4 py-2 bg-[#234e70] text-white hover:bg-[#193c58] text-xs font-bold rounded-lg transition duration-200 shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4 text-white" />
              Exportar en PDF
            </button>
            <button
              onClick={handleExcelExport}
              id="btn-export-excel"
              className="px-4 py-2 bg-emerald-600 text-white border border-emerald-500 hover:bg-emerald-500 text-xs font-bold rounded-lg transition duration-200 shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-slate-600" />
              Exportar en Excel (.xls)
            </button>
            <button
              onClick={handleCSVExport}
              className="px-4 py-2 bg-emerald-805 text-slate-500 hover:text-white hover:bg-emerald-600/80 text-xs font-bold rounded-lg transition duration-200 cursor-pointer flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              Exportar CSV (.csv)
            </button>
          </div>
        </div>

      </div>

      {/* DETAILED LOG LIST TABLE PREVIEW ATTACHED */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-100 p-6 space-y-4">
        <div>
          <h4 className="font-semibold text-slate-850 text-xs uppercase tracking-wide">Previsualització del Detall de Registres ({filteredEntries.length} files)</h4>
          <p className="text-xs text-slate-400 mt-0.5">La taula de sota canvia dinàmicament d’acord amb els filtres actius seleccionats.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-slate-650 min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                <th className="p-3.5 text-left w-24">Data</th>
                <th className="p-3.5 text-left w-36">Client / Projecte</th>
                <th className="p-3.5 text-center w-24">Interval</th>
                <th className="p-3.5 text-right w-24">Durada</th>
                <th className="p-3.5 text-center w-20">Facturable</th>
                {showAmounts && (
                  <>
                    <th className="p-3.5 text-right w-24">Tarifa Aplicada</th>
                    <th className="p-3.5 text-right w-28">Import Total</th>
                  </>
                )}
                <th className="p-3.5 text-left">Descripció del treball</th>
                {/* Internal notes column is hidden from preview if they toggle client report */}
                {!isClientReport && (
                  <th className="p-3.5 text-left bg-amber-50/20 text-slate-550 italic">Notes Internes de Control</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    Cap registre de temps trobat per a aquest informe. Revisa els paràmetres de cerca seleccionats.
                  </td>
                </tr>
              ) : (
                filteredEntries.map(entry => {
                  const client = clients.find(c => c.id === entry.clientId);
                  const project = projects.find(p => p.id === entry.projecteId);
                  const task = entry.tascaId ? tasks.find(t => t.id === entry.tascaId) : null;

                  return (
                    <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50/40">
                      <td className="p-3 font-mono text-slate-500">
                        {formatDate(entry.data, db.settings.dateFormat)}
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-800">{client?.nom || 'Desconegut'}</div>
                        <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: project?.color || '#cbd5e1' }} />
                          {project?.nom || 'Desconegut'} {task ? `> ${task.nom}` : ''}
                        </div>
                      </td>
                      <td className="p-3 text-center font-mono">
                        {entry.horaInici} - {entry.horaFi || '-'}
                      </td>
                      <td className="p-3 text-right font-mono font-medium">
                        {formatDuration(entry.duradaMinuts, 'decimal')}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                          entry.facturable ? 'bg-emerald-50 text-[#234e70]' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {entry.facturable ? 'SÍ' : 'NO'}
                        </span>
                      </td>
                      {showAmounts && (
                        <>
                          <td className="p-3 text-right font-mono text-slate-500">
                            {entry.facturable ? `${entry.tarifaHorariaAplicada} €/h` : '0 €/h'}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-800">
                            {entry.facturable ? `${(entry.importCalculat || 0).toFixed(2).replace('.', ',')} €` : '0,00 €'}
                          </td>
                        </>
                      )}
                      <td className="p-3 max-w-[200px] truncate" title={entry.descripcio}>
                        {entry.descripcio || '-'}
                      </td>
                      {!isClientReport && (
                        <td className="p-3 max-w-[150px] truncate bg-amber-50/20 text-slate-500 italic block">
                          {entry.notes || '-'}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
