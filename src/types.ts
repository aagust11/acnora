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

export interface Task {
  id: string;
  projecteId: string;
  nom: string;
  descripcio?: string;
  categoria?: string;
  estat: TaskStatus;
  pressupostHores?: number; // Límit operatiu anterior; s'utilitza com a màxim estimat
  horesEstimadesMin?: number; // Estimació comercial manual i independent de l'import
  horesEstimadesMax?: number;
  tarifaHorariaPressupost?: number; // Sobreescriu la tarifa del projecte només en pressupostos
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
  duradaMinuts: number; // calculated minutes
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
  startedTimestamp: number; // ms resolution for timer
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
  entitatAfectada: 'client' | 'projecte' | 'tasca' | 'registre' | 'configuració' | 'fitxer';
  idEntitat: string;
  resum: string;
}

export interface LocalDatabase {
  version: string;
  settings: Settings;
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  timeEntries: TimeEntry[];
  activeSession: ActiveSession | null;
  auditLog: AuditLogEntry[];
}
