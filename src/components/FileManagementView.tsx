import React, { useRef, useState } from 'react';
import { LocalDatabase } from '../types';
import { Download, Upload, FileJson, AlertTriangle, CheckCircle, Save, Plus } from 'lucide-react';
import { downloadFile } from '../utils/exportUtils';
import { normalizeDatabase } from '../utils/database';
import type { LocalJsonHandle } from '../utils/localFileSync';

interface FileManagementViewProps {
  db: LocalDatabase;
  isDirty: boolean;
  fileName: string;
  onLoadDb: (newDb: LocalDatabase, name: string, handle?: LocalJsonHandle, rawJson?: string) => Promise<void>;
  onSaveDb: () => Promise<void>;
  onCreateNewDb: () => void;
  fileHandle: LocalJsonHandle | null;
  fileSaveStatus: 'browser' | 'restoring' | 'saved' | 'pending' | 'saving' | 'permission' | 'conflict' | 'error';
  lastFileSavedAt: string | null;
  onRestorePermission: () => Promise<void>;
  onCreateLinkedJson: (handle: LocalJsonHandle) => Promise<void>;
}

export default function FileManagementView({
  db,
  isDirty,
  fileName,
  onLoadDb,
  onSaveDb,
  onCreateNewDb,
  fileHandle,
  fileSaveStatus,
  lastFileSavedAt,
  onRestorePermission,
  onCreateLinkedJson
}: FileManagementViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Manual file upload fallback
  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        
        const validated = normalizeDatabase(json);
        if (!window.confirm('Importar aquest fitxer substituirà les dades actuals d’ACnora en aquest navegador. Vols continuar?')) return;
        await onLoadDb(validated, file.name);
        setErrorMsg(null);
      } catch (err: any) {
        setErrorMsg(`Error de validació: ${err.message || 'Llegida incorrecta.'}`);
      }
    };
    reader.readAsText(file);
  };

  // Live File System Access API Picker
  const handleOpenFilePicker = async () => {
    try {
      if (!('showOpenFilePicker' in window)) {
        // Fallback to normal upload clicks
        fileInputRef.current?.click();
        return;
      }

      const picker = (window as Window & { showOpenFilePicker: (options: unknown) => Promise<LocalJsonHandle[]> }).showOpenFilePicker;
      const [handle] = await picker({
        types: [
          {
            description: 'Fitxer de dades JSON',
            accept: {
              'application/json': ['.json']
            }
          }
        ],
        excludeAcceptAllOption: true,
        multiple: false
      });

      const file = await handle.getFile();
      const text = await file.text();
      const json = JSON.parse(text);

      const validated = normalizeDatabase(json);
      if (!window.confirm('Importar aquest fitxer substituirà les dades actuals d’ACnora en aquest navegador. Vols continuar?')) return;
      // The picker gives read permission; request write permission while we have
      // a direct user interaction when possible. Otherwise the user can grant it
      // later using the clear "Autoritzar desament" control.
      try {
        if ((await handle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
          await handle.requestPermission({ mode: 'readwrite' });
        }
      } catch (_) { /* The explicit reauthorization button remains available. */ }
      await onLoadDb(validated, file.name, handle, text);
      setErrorMsg(null);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setErrorMsg(`Error en obrir fitxer: ${err.message || err}`);
        // Never silently change to a different data source after an error.
      }
    }
  };

  const handleCreateLinkedJson = async () => {
    try {
      const savePicker = (window as Window & { showSaveFilePicker?: (options: unknown) => Promise<LocalJsonHandle> }).showSaveFilePicker;
      if (!savePicker) {
        setErrorMsg('Per crear un fitxer JSON vinculat necessites Chrome o Edge d’escriptori. Pots descarregar una còpia amb el botó anterior.');
        return;
      }
      const handle = await savePicker({
        suggestedName: fileName || 'acnora-dades.json',
        types: [{ description: 'Dades ACnora', accept: { 'application/json': ['.json'] } }],
      });
      // The user may have to approve read/write access explicitly.
      try {
        if ((await handle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
          await handle.requestPermission({ mode: 'readwrite' });
        }
      } catch (_) { /* The parent will report whether write access exists. */ }
      await onCreateLinkedJson(handle);
      setErrorMsg(null);
    } catch (error: any) {
      if (error?.name !== 'AbortError') setErrorMsg(`No s’ha pogut crear o vincular el JSON: ${error?.message || error}`);
    }
  };

  const handleSaveClick = async () => {
    setIsSaving(true);
    setErrorMsg(null);
    try {
      await onSaveDb();
    } catch (err: any) {
      setErrorMsg(`No s’ha pogut desar directament: ${err.message || err}. Fes servir l’opció d’exportar.`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualExport = () => {
    const dataStr = JSON.stringify(db, null, 2);
    const saveName = fileName ? fileName : 'acnora-dades.json';
    downloadFile(dataStr, saveName, 'application/json');
  };

  return (
    <div className="space-y-6" id="view-file-management">
      <div className="bg-white rounded-lg shadow-sm border border-slate-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-sans font-semibold text-slate-900">Dades i còpies de seguretat</h2>
            <p className="text-sm text-slate-500 mt-1">
              Els canvis es desen automàticament al navegador i, si vincules un fitxer JSON, també s’hi escriuen sense haver de prémer «Desar».
            </p>
          </div>
          
          <button
            onClick={onCreateNewDb}
            id="btn-create-new-json"
            className="flex items-center gap-2 bg-[#edf3f8] hover:bg-[#deebf3] text-[#234e70] font-medium px-4 py-2 rounded-lg transition text-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nou espai de treball
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* File Status Box */}
          <div className="md:col-span-2 bg-slate-50 rounded-lg p-5 border border-slate-100 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3">
                <FileJson className="w-8 h-8 text-[#234e70]" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 text-sm">Fitxer actiu:</span>
                    <span className="text-xs bg-[#deebf3] text-[#234e70] font-mono px-2 py-0.5 rounded">
                      {fileHandle ? fileName : 'Dades del navegador'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 font-mono">
                    Canal: {fileHandle ? 'Fitxer vinculat · desament automàtic' : 'Navegador · exportació manual opcional'}
                  </div>
                </div>
              </div>

              {/* Reflect only confirmed file writes, never just an attempted write. */}
              <div className="mt-5 space-y-2" role="status" aria-live="polite">
                {fileHandle ? (
                  <div className={`flex items-start gap-2 text-xs rounded-md border p-3 ${fileSaveStatus === 'saved' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : fileSaveStatus === 'saving' || fileSaveStatus === 'pending' ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-amber-50 text-amber-900 border-amber-200'}`}>
                    {fileSaveStatus === 'saved' ? <CheckCircle className="w-4 h-4 shrink-0"/> : <AlertTriangle className="w-4 h-4 shrink-0"/>}
                    <div className="space-y-1">
                      <p className="font-semibold">{({
                        saved: 'Canvis desats automàticament al fitxer JSON',
                        pending: 'Hi ha canvis pendents de desar al JSON…',
                        saving: 'Desant ara al fitxer JSON…',
                        permission: 'Cal autoritzar l’escriptura al fitxer JSON',
                        conflict: 'El fitxer JSON s’ha modificat fora d’ACnora',
                        error: 'No s’ha pogut desar al fitxer JSON',
                        restoring: 'Recuperant el fitxer vinculat…',
                        browser: 'Dades desades al navegador',
                      } as const)[fileSaveStatus]}</p>
                      {fileSaveStatus === 'saved' && lastFileSavedAt && <p>Darrera escriptura: {lastFileSavedAt}</p>}
                      {fileSaveStatus === 'permission' && <button type="button" onClick={() => void onRestorePermission().catch(e => setErrorMsg(e instanceof Error ? e.message : String(e)))} className="underline font-semibold">Autoritzar desament automàtic</button>}
                      {fileSaveStatus === 'conflict' && <p>No se sobreescriurà el JSON. Descarrega una còpia de les dades actuals abans de tornar a importar el fitxer.</p>}
                      {fileSaveStatus === 'error' && <p>Conservem les dades al navegador. Revisa els permisos o descarrega una còpia JSON.</p>}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs rounded-md border border-slate-200 bg-white p-3 text-slate-700 flex gap-2 items-center">
                    <CheckCircle className="w-4 h-4 shrink-0 text-slate-500"/> Desament al navegador actiu. Per escriure també en un fitxer del teu ordinador, vincula un JSON.
                  </div>
                )}
              </div>
            </div>

            {/* Save Buttons */}
            <div className="flex flex-wrap gap-3 mt-6">
              {/* Direct Save Button: only works or shows if we have handle, or we can always allow clicking it to trigger handle action / backup */}
              <button
                onClick={handleSaveClick}
                disabled={isSaving}
                className="flex items-center gap-2 bg-[#234e70] hover:bg-[#193c58] disabled:bg-blue-300 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition shadow-sm cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Desant...' : fileHandle ? 'Desar ara' : 'Exportar còpia JSON'}
              </button>

              <button
                onClick={handleManualExport}
                className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-lg border border-slate-200 transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-500" />
                Descarregar còpia JSON
              </button>
            </div>
          </div>

          {/* Action Load File */}
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-lg p-5 flex flex-col justify-between text-center items-center">
            <div className="my-auto space-y-3">
              <Upload className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="space-y-1">
                <p className="font-medium text-slate-800 text-sm">Vols carregar un fitxer existent?</p>
                <p className="text-xs text-slate-400">Selecciona el teu fitxer .json de dades de treball per seguir on ho vas deixar.</p>
              </div>
            </div>

            <button type="button" onClick={handleCreateLinkedJson}
              className="mt-4 mb-2 w-full bg-[#234e70] hover:bg-[#1b3f5c] text-white text-xs font-semibold py-2.5 rounded-md">
              Crear JSON vinculat amb les dades actuals
            </button>
            <button
              onClick={handleOpenFilePicker}
              className="w-full border border-slate-300 bg-white text-[#234e70] hover:bg-slate-50 text-xs font-semibold py-2.5 rounded-md"
            >
              Vincular / importar JSON
            </button>

            {/* Hidden Input File for standard fallback */}
            <input
              type="file"
              accept=".json"
              ref={fileInputRef}
              onChange={handleManualUpload}
              className="hidden"
            />
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-50 text-red-600 border border-red-100 rounded-lg p-3 text-xs mt-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Explication box */}
      <div className="bg-[#edf3f8] border border-slate-200 rounded-lg p-5 text-slate-700 space-y-3">
        <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
          Com funcionen les dades locals
        </h4>
        <ul className="list-disc list-inside text-xs space-y-1 text-slate-600 leading-relaxed md:pl-2">
          <li>
            <strong>Dades locals:</strong> L’aplicació no té base de dades ni envia els registres a cap servidor propi. El navegador conserva les dades únicament en aquest dispositiu i perfil.
          </li>
          <li>
            <strong>Fitxer vinculat:</strong> A Chrome i Edge, després d’autoritzar l’accés, cada canvi confirmat s’escriu automàticament al fitxer JSON. En reobrir el navegador, pot ser necessari tornar a donar el permís.
          </li>
          <li>
            <strong>Altres navegadors:</strong> En navegadors sense accés directe al fitxer, els canvis continuen desant-se al navegador i cal exportar manualment el JSON. Importa-la manualment si canvies de dispositiu.
          </li>
          <li>
            <strong>Còpies de seguretat i conflictes:</strong> Les dades del navegador (<span className="italic">localStorage</span>) es poden perdre si es buiden les dades del lloc o falla el dispositiu. El JSON vinculat pot ser sobreescrit amb cada desament: conserva còpies de seguretat periòdiques i no l’editis simultàniament des d’altres pestanyes o programes.
          </li>
        </ul>
      </div>
    </div>
  );
}
