import React, { useState } from 'react';
import { LocalDatabase, Client, ClientStatus } from '../types';
import { Plus, Edit3, Archive, Trash2, CheckCircle2, FileText, Mail, Phone, Globe, ShieldAlert, UserCheck } from 'lucide-react';
import { formatDuration, formatCurrency } from '../utils/timeUtils';

interface ClientsViewProps {
  db: LocalDatabase;
  onAddClient: (client: Client) => void;
  onUpdateClient: (client: Client) => void;
  onDeleteClient: (id: string) => void;
}

export default function ClientsView({ db, onAddClient, onUpdateClient, onDeleteClient }: ClientsViewProps) {
  const { clients, projects, timeEntries } = db;

  // Modals / forms state
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [tab, setTab] = useState<'actius' | 'arxivats'>('actius');

  // Form Field state
  const [nom, setNom] = useState('');
  const [descripcio, setDescripcio] = useState('');
  const [email, setEmail] = useState('');
  const [telefon, setTelefon] = useState('');
  const [web, setWeb] = useState('');
  const [estat, setEstat] = useState<ClientStatus>('actiu');
  const [notes, setNotes] = useState('');

  const [alertError, setAlertError] = useState<string | null>(null);

  const startCreate = () => {
    setEditingClient(null);
    setNom('');
    setDescripcio('');
    setEmail('');
    setTelefon('');
    setWeb('');
    setEstat('actiu');
    setNotes('');
    setAlertError(null);
    setShowForm(true);
  };

  const startEdit = (client: Client) => {
    setEditingClient(client);
    setNom(client.nom);
    setDescripcio(client.descripcio || '');
    setEmail(client.email || '');
    setTelefon(client.telefon || '');
    setWeb(client.web || '');
    setEstat(client.estat);
    setNotes(client.notes);
    setAlertError(null);
    setShowForm(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) {
      setAlertError('El nom del client és obligatori.');
      return;
    }

    if (editingClient) {
      // Edit
      const updated: Client = {
        ...editingClient,
        nom,
        descripcio: descripcio || undefined,
        email: email || undefined,
        telefon: telefon || undefined,
        web: web || undefined,
        estat,
        notes,
        dataModificacio: new Date().toISOString()
      };
      onUpdateClient(updated);
    } else {
      // Create
      const created: Client = {
        id: `c-${Date.now()}`,
        nom,
        descripcio: descripcio || undefined,
        email: email || undefined,
        telefon: telefon || undefined,
        web: web || undefined,
        estat: 'actiu',
        notes,
        dataCreacio: new Date().toISOString(),
        dataModificacio: new Date().toISOString()
      };
      onAddClient(created);
    }

    setShowForm(false);
  };

  const handleDeleteClient = (client: Client) => {
    // Validation: cannot delete if they have child projects or associated time entries
    const hasProjects = projects.some(p => p.clientId === client.id);
    const hasEntries = timeEntries.some(e => e.clientId === client.id);

    if (hasProjects || hasEntries) {
      alert(`No es pot eliminar el client "${client.nom}" perquè té projectes o registres de temps associats. T'aconsellem que el canviïs a estat "arxivat" o "inactiu".`);
      return;
    }

    if (window.confirm(`Segur que vols eliminar definitivament el client: "${client.nom}"?`)) {
      onDeleteClient(client.id);
    }
  };

  return (
    <div className="space-y-6" id="view-clients">
      
      {/* Top action center */}
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-slate-100">
        <div>
          <h2 className="text-base font-sans font-semibold text-slate-900">Directori de Clients</h2>
          <p className="text-xs text-slate-400 mt-0.5">Consulta la teva llista comercial, estadístiques i projectes enllaçats.</p>
        </div>
        <button
          onClick={startCreate}
          id="btn-add-client"
          className="bg-[#234e70] hover:bg-[#193c58] text-white font-semibold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Afegir Client
        </button>
      </div>

      {/* FORM MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <form
            onSubmit={handleFormSubmit}
            className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden "
          >
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
              <h3 className="font-sans font-bold text-sm">
                {editingClient ? `Editar Client: ${editingClient.nom}` : 'Crear Nou Client'}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nom Comercial *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Ajuntament de Girona..."
                    value={nom}
                    onChange={e => setNom(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Estat Comercial</label>
                  <select
                    disabled={!editingClient}
                    value={estat}
                    onChange={e => setEstat(e.target.value as ClientStatus)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50"
                  >
                    <option value="actiu">Actiu</option>
                    <option value="inactiu">Inactiu</option>
                    <option value="arxivat">Arxivat</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Descripció o Tipus de serveis</label>
                <input
                  type="text"
                  placeholder="Ex: Consultoria de màrqueting web..."
                  value={descripcio}
                  onChange={e => setDescripcio(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email de contacte</label>
                  <input
                    type="email"
                    placeholder="tecnologia@client.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Telèfon de contacte</label>
                  <input
                    type="tel"
                    placeholder="972000000"
                    value={telefon}
                    onChange={e => setTelefon(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Pàgina Web URL</label>
                  <input
                    type="text"
                    placeholder="www.client.cat"
                    value={web}
                    onChange={e => setWeb(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes Internes i Acords Comercials</label>
                <textarea
                  placeholder="Notes privades sobre facturació, tarifes pactades, dates de rebre pagament..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 resize-none"
                  rows={3}
                />
              </div>

              {alertError && (
                <div className="bg-amber-50 text-amber-700 border border-amber-100 rounded-lg p-3 text-xs">
                  {alertError}
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
                id="btn-confirm-save-client"
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow cursor-pointer"
              >
                Desar Client
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab bar to switch between Active and Archived */}
      <div className="flex border-b border-slate-200 mt-4">
        <button
          onClick={() => setTab('actius')}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition -mb-px flex items-center gap-1.5 cursor-pointer ${
            tab === 'actius'
              ? 'border-[#234e70] text-[#234e70] font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Clients Actius / Inactius
          <span className="bg-slate-100 text-slate-600 font-bold text-xs px-2 py-0.5 rounded-full">
            {clients.filter(c => c.estat !== 'arxivat').length}
          </span>
        </button>
        <button
          onClick={() => setTab('arxivats')}
          className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition -mb-px flex items-center gap-1.5 cursor-pointer ${
            tab === 'arxivats'
              ? 'border-[#234e70] text-[#234e70] font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Archive className="w-3.5 h-3.5" />
          Clients Arxivats
          <span className="bg-slate-100 text-slate-600 font-bold text-xs px-2 py-0.5 rounded-full">
            {clients.filter(c => c.estat === 'arxivat').length}
          </span>
        </button>
      </div>

      {/* Grid of Clients Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients
          .filter(client => {
            if (tab === 'arxivats') return client.estat === 'arxivat';
            return client.estat !== 'arxivat';
          })
          .map(client => {
            // Calculate cumulative variables
            const clientProjects = projects.filter(p => p.clientId === client.id);
            const clientEntries = timeEntries.filter(e => e.clientId === client.id);

            const totalMins = clientEntries.reduce((sum, e) => sum + e.duradaMinuts, 0);
            const totalEarnings = clientEntries.reduce((sum, e) => sum + (e.facturable ? (e.importCalculat || 0) : 0), 0);

            return (
              <div
                key={client.id}
                className={`bg-white rounded-lg shadow-sm border border-slate-100 p-5 flex flex-col justify-between hover:border-slate-200 transition duration-150 ${
                  client.estat === 'arxivat' ? 'bg-slate-50/50 opacity-80 shadow-xs' : ''
                }`}
              >
                <div>
                  {/* Header state */}
                  <div className="flex justify-between items-start border-b border-slate-50 pb-3 mb-3">
                    <div>
                      <span className="text-xs text-slate-400 font-mono font-semibold block uppercase">ID: {client.id}</span>
                      <h3 className="font-sans font-bold text-slate-800 text-sm mt-0.5">{client.nom}</h3>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                      client.estat === 'actiu'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : client.estat === 'inactiu'
                        ? 'bg-slate-200 text-slate-600'
                        : 'bg-slate-250 text-slate-600 border border-slate-300/40 bg-slate-100'
                    }`}>
                      {client.estat}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 font-normal italic line-clamp-2 min-h-[32px]">{client.descripcio || 'Sense descripció genèrica'}</p>

                  {/* Statistics Box */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 border border-slate-100/50 rounded-lg p-3 my-4">
                    <div>
                      <span className="text-[11px] text-slate-400 uppercase font-bold tracking-tight block">Treball Total</span>
                      <span className="text-xs font-mono font-semibold text-slate-700 mt-0.5 block">{formatDuration(totalMins, 'decimal')}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 uppercase font-bold tracking-tight block">Facturació</span>
                      <span className="text-xs font-mono font-semibold text-slate-700 mt-0.5 block">
                        {db.settings.showAmountsByDefault ? formatCurrency(totalEarnings, db.settings.currency) : '***'}
                      </span>
                    </div>
                    <div className="col-span-2 pt-1.5 border-t border-slate-200/50 flex justify-between text-xs text-slate-400 font-medium">
                      <span>{clientProjects.length} Projectes enllaçats</span>
                      <span>{clientEntries.length} Registres d'hores</span>
                    </div>
                  </div>

                  {/* Contact Coordinates */}
                  <div className="space-y-1.5 text-xs text-slate-500 pt-2 border-t border-slate-50">
                    {client.email && (
                      <div className="flex items-center gap-1.5 line-clamp-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <a href={`mailto:${client.email}`} className="hover:text-[#234e70] truncate">{client.email}</a>
                      </div>
                    )}
                    {client.telefon && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{client.telefon}</span>
                      </div>
                    )}
                    {client.web && (
                      <div className="flex items-center gap-1.5 line-clamp-1">
                        <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <a href={`http://${client.web}`} target="_blank" rel="noreferrer" className="hover:text-[#234e70] truncate">{client.web}</a>
                      </div>
                    )}
                  </div>

                  {/* Notes box */}
                  {client.notes && (
                    <div className="my-3 p-2 bg-amber-50/40 border border-amber-100/40 rounded text-xs text-slate-500 italic max-h-16 overflow-y-auto">
                      Note: {client.notes}
                    </div>
                  )}
                </div>

                {/* Card Bottom Actions */}
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-50 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      const nextEstat = client.estat === 'arxivat' ? 'actiu' : 'arxivat';
                      onUpdateClient({ ...client, estat: nextEstat, dataModificacio: new Date().toISOString() });
                    }}
                    className={`p-1 px-2.5 hover:bg-slate-100 text-[11px] font-bold rounded flex items-center gap-1 transition cursor-pointer ${
                      client.estat === 'arxivat' ? 'text-emerald-600 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100' : 'text-amber-600 bg-amber-50/40 border border-amber-100/30 hover:bg-amber-100/40'
                    }`}
                    title={client.estat === 'arxivat' ? 'Restaurar de l\'arxiu' : 'Arxivar client'}
                  >
                    <Archive className="w-3.5 h-3.5" />
                    {client.estat === 'arxivat' ? 'Activar' : 'Arxivar'}
                  </button>

                  <button
                    onClick={() => startEdit(client)}
                    className="p-1 px-2 hover:bg-slate-100 text-slate-650 hover:text-[#234e70] rounded flex items-center gap-1 text-[11px] font-semibold cursor-pointer border border-slate-100"
                    id={`btn-edit-client-${client.id}`}
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Editar
                  </button>

                  <button
                    onClick={() => handleDeleteClient(client)}
                    className="p-1 px-2 hover:bg-slate-100 text-slate-400 hover:text-red-650 rounded flex items-center gap-1 text-[11px] cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Eliminar
                  </button>
                </div>

              </div>
            );
          })}
      </div>

    </div>
  );
}
