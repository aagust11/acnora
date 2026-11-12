import React, { useRef, useState } from 'react';
import { LocalDatabase } from '../types';
import { Download, Upload, FileJson, AlertTriangle, CheckCircle, Save, Plus } from 'lucide-react';
import { downloadFile } from '../utils/exportUtils';
import { normalizeDatabase } from '../utils/database';

interface FileManagementViewProps {
  db: LocalDatabase;
  isDirty: boolean;
  fileName: string;
  onLoadDb: (newDb: LocalDatabase, name: string, handle?: any) => void;
  onSaveDb: () => Promise<void>;
  onCreateNewDb: () => void;
  fileHandle: any;
}

export default function FileManagementView({
  db,
  isDirty,
  fileName,
  onLoadDb,
  onSaveDb,
  onCreateNewDb,
  fileHandle
}: FileManagementViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Manual file upload fallback
  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        
        const validated = normalizeDatabase(json);
        if (!window.confirm('Importar aquest fitxer substituirà les dades actuals d’ACnora en aquest navegador. Vols continuar?')) return;
        onLoadDb(validated, file.name, null);
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

      // @ts-ignore
      const [handle] = await window.showOpenFilePicker({
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
      onLoadDb(validated, file.name, handle);
      setErrorMsg(null);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setErrorMsg(`Error en obrir fitxer: ${err.message || err}`);
        // Fallback click
        fileInputRef.current?.click();
      }
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
              Els canvis es desen en aquest navegador. Pots exportar un JSON o vincular un fitxer local compatible.
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
                      {fileName || 'Dades del navegador'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 font-mono">
                    Canal: {fileHandle ? 'Fitxer vinculat (desament manual)' : 'Navegador + exportació JSON'}
                  </div>
                </div>
              </div>

              {/* Status Indicators */}
              <div className="mt-5 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  {isDirty ? (
                    <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1 rounded-lg border border-amber-100 w-full">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="font-medium text-xs">Hi ha canvis desats al navegador però encara no exportats al fitxer.</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100 w-full">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="font-medium text-xs">No hi ha canvis pendents de desar al fitxer. Les dades també es conserven en aquest navegador.</span>
                    </div>
                  )}
                </div>
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
                {isSaving ? 'Desant...' : 'Desar / exportar JSON'}
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

            <button
              onClick={handleOpenFilePicker}
              className="mt-4 w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-2 rounded-lg transition duration-200 cursor-pointer"
            >
              Importar fitxer JSON
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
            <strong>Fitxer vinculat:</strong> A Chrome i Edge, obrir un JSON pot donar permís per actualitzar el fitxer quan premis «Desar / exportar JSON». No s’actualitza automàticament.
          </li>
          <li>
            <strong>Altres navegadors:</strong> Si no hi ha accés directe al fitxer, l’opció de desar descarrega una còpia JSON. Importa-la manualment si canvies de dispositiu.
          </li>
          <li>
            <strong>Còpies de seguretat:</strong> Les dades del navegador (<span className="italic">localStorage</span>) es poden perdre si es buiden les dades del lloc o falla el dispositiu. Exporta una còpia periòdicament i desa-la en un lloc segur.
          </li>
        </ul>
      </div>
    </div>
  );
}
