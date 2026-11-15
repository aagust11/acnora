export type ClientStatus = 'actiu' | 'inactiu' | 'arxivat';
export type ProjectStatus = 'actiu' | 'pausat' | 'finalitzat' | 'arxivat';
export type TaskStatus = 'pendent' | 'en curs' | 'feta' | 'arxivada';
export type EntryOrigin = 'cronòmetre' | 'manual';
export type EntryStatus = 'correcte' | 'pendent de revisar' | 'incoherent';

export interface Client {
  id: string;
  nom: string;
  descripcio?: string;
  email?: string;
  telefon?: string;
  web?: string;
  estat: ClientStatus;
  notes: string;
  dataCreacio: string;
  dataModificacio: string;
}

export interface Project {
  id: string;
  clientId: string;
  nom: string;
  descripcio: string;
  estat: ProjectStatus;
  tarifaHoraria?: number;
  pressupostHores?: number;
  color?: string; // Hex or tailwind color name
  dataInici: string;
  dataFinalitzacioPrevista?: string;
  notes: string;
  dataCreacio: string;
  dataModificacio: string;
}

export type WorkBlockType = 'fase' | 'lliurable' | 'funcionalitat' | 'manteniment' | 'altre';

export interface WorkBlock {
  id: string;
  projecteId: string;
  nom: string;
  tipus: WorkBlockType;
  descripcio?: string;
  ordre: number;
  dataCreacio: string;
  dataModificacio: string;
}

export interface QuoteRateBand {
  id: string;
  concepte?: string;
  horesMin: number;
  horesMax: number;
  tarifa: number; // Amb hores: €/h (0 = no facturable); amb 0–0 hores: preu fix del servei en €
}

export interface Task {
  id: string;
  projecteId: string;
  nom: string;
  descripcio?: string;
  blocId?: string; // Optional; older JSON remains compatible
  categoria?: string;
  estat: TaskStatus;
  pressupostHores?: number; // Límit operatiu anterior; s'utilitza com a màxim estimat
  horesEstimadesMin?: number; // Estimació comercial manual i independent de l'import
  horesEstimadesMax?: number;
  tarifaHorariaPressupost?: number; // Legacy single-rate estimate, retained for compatibility
  pressupostTrams?: QuoteRateBand[]; // Trams horaris i serveis de preu fix (0 h / 0 h)
  importManualPressupost?: number; // Import final de la tasca; si es defineix, substitueix el càlcul per trams
  notes?: string;
  dataCreacio: string;
  dataModificacio: string;
}

export interface TimeEntry {
  id: string;
  clientId: string;
  projecteId: string;
  tascaId?: string;
  data: string; // YYYY-MM-DD
  horaInici: string; // HH:MM
  horaFi?: string; // HH:MM (optional if active/not set, though active is handled by activeSession)
  duradaMinuts: number; // Treball efectiu (les pauses no es facturen)
  pausaSegons?: number; // Temps acumulat de pausa, opcional per a registres antics
  dataFi?: string; // Data real de finalització quan la sessió creua mitjanit
  facturable: boolean;
  tarifaHorariaAplicada?: number;
  importCalculat?: number;
  descripcio: string;
  notes: string;
  origen: EntryOrigin;
  estat: EntryStatus;
  warningsDescartades?: boolean;
  dataCreacio: string;
  dataModificacio: string;
}

export interface ActiveSession {
  clientId: string;
  projecteId: string;
  tascaId?: string;
  data: string; // YYYY-MM-DD
  horaInici: string; // HH:MM:SS or HH:MM
  facturable: boolean;
  tarifaHoraria?: number;
  descripcio: string;
  notes?: string;
  startedTimestamp: number; // moment d'inici en ms
  pausedAt?: number; // instant en què s'ha començat la pausa en curs
  pausedMs?: number; // suma de pauses ja finalitzades en mil·lisegons
}

export interface FreelancerSettings {
  name: string;
  taxId?: string;
  email: string;
  phone: string;
  website?: string;
  address?: string;
}

export interface Settings {
  currency: string;
  defaultHourlyRate: number;
  dateFormat: 'dd/MM/yyyy' | 'yyyy-MM-dd';
  timeFormat: '24h' | '12h';
  weekStartsOn: 'monday' | 'sunday';
  showAmountsByDefault: boolean;
  freelancer: FreelancerSettings;
  maxActiveSessionHours: number; // Suspicious duration limit
}

export interface AuditLogEntry {
  id: string;
  timestamp: string; // ISO string
  accio: string; // 'crear', 'editar', 'eliminar', 'arxivar', etc.
  entitatAfectada: 'client' | 'projecte' | 'bloc' | 'tasca' | 'registre' | 'pressupost' | 'configuració' | 'fitxer';
  idEntitat: string;
  resum: string;
}

/** Each issued quote stores the exact original PDF; never regenerate it from edited tasks. */
export interface IssuedQuote {
  id: string;
  reference: string;
  projectId: string;
  clientId: string;
  projectName: string;
  clientName: string;
  createdAt: string;
  issueDate: string;
  validUntil: string; // Mandatory for auto-expiration of unaccepted proposals
  status: 'pendent' | 'acceptat';
  acceptedAt?: string;
  minAmount: number;
  maxAmount: number;
  currency: string;
  filename: string;
  pdfDataUri: string; // Original PDF bytes encoded once, stored with JSON backups
  snapshot: {
    client: Client;
    project: Project;
    tasks: Task[];
    blocks?: WorkBlock[];
    orderedTaskIds?: string[];
    settings: Settings;
    text: {
      taxes: string;
      estimate: string;
      conditions: string;
      observations: string;
    };
    showHours: boolean;
    showHourlyRates: boolean;
  };
}

export interface LocalDatabase {
  version: string;
  settings: Settings;
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  blocs: WorkBlock[];
  issuedQuotes: IssuedQuote[];
  timeEntries: TimeEntry[];
  activeSession: ActiveSession | null;
  auditLog: AuditLogEntry[];
}
