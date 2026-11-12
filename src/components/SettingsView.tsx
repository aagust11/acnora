import React, { useState } from 'react';
import { LocalDatabase, Settings, FreelancerSettings } from '../types';
import { Settings as SettingsIcon, Euro, Clock, User, ShieldCheck, HelpCircle, HardDrive, Info, AlertTriangle } from 'lucide-react';

interface SettingsViewProps {
  db: LocalDatabase;
  onUpdateSettings: (settings: Settings) => void;
  onClearDatabase: () => void;
  onLoadDemo: () => void;
}

export default function SettingsView({ db, onUpdateSettings, onClearDatabase, onLoadDemo }: SettingsViewProps) {
  const { settings, auditLog } = db;

  // Freelancer profile fields
  const [name, setName] = useState(settings.freelancer.name);
  const [taxId, setTaxId] = useState(settings.freelancer.taxId || '');
  const [email, setEmail] = useState(settings.freelancer.email);
  const [phone, setPhone] = useState(settings.freelancer.phone);
  const [website, setWebsite] = useState(settings.freelancer.website || '');
  const [address, setAddress] = useState(settings.freelancer.address || '');

  // Core settings fields
  const [currency, setCurrency] = useState(settings.currency);
  const [defaultHourlyRate, setDefaultHourlyRate] = useState(settings.defaultHourlyRate);
  const [dateFormat, setDateFormat] = useState<'dd/MM/yyyy' | 'yyyy-MM-dd'>(settings.dateFormat);
  const [timeFormat, setTimeFormat] = useState<'24h' | '12h'>(settings.timeFormat);
  const [weekStartsOn, setWeekStartsOn] = useState<'monday' | 'sunday'>(settings.weekStartsOn);
  const [showAmountsByDefault, setShowAmountsByDefault] = useState(settings.showAmountsByDefault);
  const [maxActiveSessionHours, setMaxActiveSessionHours] = useState(settings.maxActiveSessionHours || 10);

  const [notification, setNotification] = useState<string | null>(null);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedFreelancerProfile: FreelancerSettings = {
      name,
      taxId: taxId || undefined,
      email,
      phone,
      website: website || undefined,
      address: address || undefined
    };

    const updatedGlobalSettings: Settings = {
      currency,
      defaultHourlyRate: Number(defaultHourlyRate),
      dateFormat,
      timeFormat,
      weekStartsOn,
      showAmountsByDefault,
      freelancer: updatedFreelancerProfile,
      maxActiveSessionHours: Number(maxActiveSessionHours)
    };

    onUpdateSettings(updatedGlobalSettings);
    
    // Toast notification pop
    setNotification('Configuració i dades professionals desades correctament!');
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="space-y-6" id="view-settings">
      
      {notification && (
        <div className="bg-emerald-50 text-emerald-850 border border-emerald-100 rounded-lg p-4 text-xs font-semibold ">
          {notification}
        </div>
      )}

      <form onSubmit={handleSaveProfile} className="space-y-6">
        
        {/* Core preferences boxes grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Settings Variables */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-100 p-6 space-y-4">
            <h3 className="font-sans font-semibold text-slate-800 text-sm flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-slate-500" />
              Preferències del Sistema
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Currency */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Moneda d'Ús</label>
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 cursor-pointer"
                >
                  <option value="EUR">Euros (€)</option>
                  <option value="USD">Dòlars ($)</option>
                  <option value="GBP">Lliures (£)</option>
                </select>
              </div>

              {/* Default hourly target */}
              <div>
                <label className="block text-xs font-semibold text-slate-100/10 text-slate-700 mb-1">Tarifa Horària per defecte</label>
                <input
                  type="number"
                  min="0"
                  value={defaultHourlyRate}
                  onChange={e => setDefaultHourlyRate(Number(e.target.value))}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 font-mono text-right"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Date format selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-705 mb-1">Format de data</label>
                <select
                  value={dateFormat}
                  onChange={e => setDateFormat(e.target.value as 'dd/MM/yyyy' | 'yyyy-MM-dd')}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 cursor-pointer"
                >
                  <option value="dd/MM/yyyy">DD/MM/YYYY (Europeu)</option>
                  <option value="yyyy-MM-dd">YYYY-MM-DD (ISO)</option>
                </select>
              </div>

              {/* Start of week selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Primer dia de la setmana</label>
                <select
                  value={weekStartsOn}
                  onChange={e => setWeekStartsOn(e.target.value as 'monday' | 'sunday')}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 cursor-pointer"
                >
                  <option value="monday">Dilluns</option>
                  <option value="sunday">Diumenge</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Suspicious sessions limit */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Minuts límit d'avís (Hores)</label>
                <input
                  type="number"
                  min="1"
                  value={maxActiveSessionHours}
                  onChange={e => setMaxActiveSessionHours(Number(e.target.value))}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 font-mono text-right"
                />
              </div>

              {/* Default amounts visibility */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Imports per defecte</label>
                <select
                  value={showAmountsByDefault ? 'yes' : 'no'}
                  onChange={e => setShowAmountsByDefault(e.target.value === 'yes')}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 cursor-pointer"
                >
                  <option value="yes">Sempre visibles</option>
                  <option value="no">Amagats (Sol hores)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Freelancer Profile Options */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-100 p-6 space-y-4">
            <h3 className="font-sans font-semibold text-slate-800 text-sm flex items-center gap-2">
              <User className="w-5 h-5 text-slate-500" />
              Dades professionals per als informes
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nom Complet / Comercial *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50"
                  placeholder="Marta Vila Soler..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Indentificació Fiscal / NIF</label>
                <input
                  type="text"
                  value={taxId}
                  onChange={e => setTaxId(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 uppercase"
                  placeholder="ES48293021X"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email professional</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50"
                  placeholder="contacte@empresa.cat"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Telèfon professional</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50"
                  placeholder="+34600000000"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-707 mb-1 font-sans">Adreça física o despatx</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50"
                placeholder="Carrer gran de Gràcia, 23..."
              />
            </div>
          </div>

        </div>

        {/* Global form submit actions */}
        <div className="flex justify-end">
          <button
            type="submit"
            id="btn-save-settings"
            className="bg-[#234e70] hover:bg-[#193c58] text-white font-bold text-xs px-6 py-3 rounded-lg shadow-sm cursor-pointer transition"
          >
            Desar Configuració i Perfil
          </button>
        </div>
      </form>

      {/* AUDIT LOGS VIEW PANEL */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-100 p-6 space-y-4">
        <h3 className="font-sans font-semibold text-slate-800 text-sm flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-slate-500" />
          Registre d'Accions i Sincro (AuditLog)
        </h3>
        <p className="text-xs text-slate-400">
          Un registre històric intern senzill per portar el seguiment cronològic de transaccions i modificacions sobre fitxers JSON o entitats de facturació.
        </p>

        <div className="border border-slate-100 rounded-lg overflow-hidden">
          <div className="max-h-60 overflow-y-auto">
            <table className="w-full border-collapse text-left text-xs bg-white text-slate-650">
              <thead className="bg-slate-50 text-slate-400 font-semibold border-b border-slate-100">
                <tr>
                  <th className="p-3">Data i Hora</th>
                  <th className="p-3">Acció</th>
                  <th className="p-3">Entitat Afectada</th>
                  <th className="p-3">Resum informatiu del canvi</th>
                </tr>
              </thead>
              <tbody>
                {auditLog.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-400 italic">No s'ha registrat cap acció en aquest fitxer de treball.</td>
                  </tr>
                ) : (
                  [...auditLog].reverse().map(log => (
                    <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/50 font-mono text-[11px]">
                      <td className="p-3 text-slate-400">{new Date(log.timestamp).toLocaleString('ca')}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                          log.accio === 'crear'
                            ? 'bg-[#deebf3] text-[#234e70]'
                            : log.accio === 'editar'
                            ? 'bg-amber-100 text-amber-800'
                            : log.accio === 'eliminar'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}>
                          {log.accio}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-700">{log.entitatAfectada}</td>
                      <td className="p-3 font-sans text-xs text-slate-700">{log.resum}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900 text-sm">Dades de demostració</h3>
          <p className="text-xs text-slate-500 mt-1">Carrega un exemple per explorar ACnora. Substituirà les dades actuals després de confirmar-ho.</p>
        </div>
        <button type="button" onClick={onLoadDemo} className="border border-slate-300 hover:bg-slate-50 bg-white text-slate-700 font-medium text-sm px-4 py-2 rounded-md">Carregar exemple</button>
      </div>

      {/* Dangerous Wipeout Section */}
      <div className="bg-red-50 border border-red-100 rounded-lg p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h4 className="font-semibold text-red-900 text-xs uppercase tracking-wide flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-red-500" /> Zona de perill
          </h4>
          <p className="text-xs text-red-700">Aquesta acció elimina completament totes les dades actives i buida els llistats per començar de zero.</p>
        </div>
        <button
          onClick={() => {
            if (window.confirm('Vols eliminar definitivament les dades locals d’ACnora? Exporta una còpia JSON abans de continuar.')) {
              onClearDatabase();
            }
          }}
          className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition shrink-0 cursor-pointer shadow-sm"
        >
          Esborrar dades locals
        </button>
      </div>

    </div>
  );
}
