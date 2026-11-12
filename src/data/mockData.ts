import { LocalDatabase } from '../types';

export const mockDatabase: LocalDatabase = {
  version: '1.0.0',
  settings: {
    currency: 'EUR',
    defaultHourlyRate: 45,
    dateFormat: 'dd/MM/yyyy',
    timeFormat: '24h',
    weekStartsOn: 'monday',
    showAmountsByDefault: true,
    freelancer: {
      name: 'Marta Soler i Vila',
      taxId: 'ES48293021X',
      email: 'marta.soler@example.com',
      phone: '+34 612 345 678',
      website: 'www.martasolervila.cat',
      address: 'Carrer de Gràcia, 42, 2n 1a, 08012 Barcelona'
    },
    maxActiveSessionHours: 10
  },
  clients: [
    {
      id: 'c-1',
      nom: 'Ajuntament de Girona',
      descripcio: 'Serveis de consulta i desenvolupament web municipal',
      email: 'tecnologia@ajgirona.cat',
      telefon: '972 00 11 22',
      web: 'www.girona.cat',
      estat: 'actiu',
      notes: 'Requereix facturació detallada a final de mes amb informe PDF adjunt.',
      dataCreacio: '2026-01-10T09:00:00Z',
      dataModificacio: '2026-01-10T09:00:00Z'
    },
    {
      id: 'c-2',
      nom: 'Sinergia Cooperativa',
      descripcio: 'Entitat d’economia social i solidària',
      email: 'info@sinergia.coop',
      telefon: '934 88 77 66',
      web: 'www.sinergia.coop',
      estat: 'actiu',
      notes: 'Tarifa reduïda ajustada per a projectes cooperatius.',
      dataCreacio: '2026-02-15T11:30:00Z',
      dataModificacio: '2026-02-15T11:30:00Z'
    },
    {
      id: 'c-3',
      nom: 'Pastisseria Llumà (Arxivat)',
      descripcio: 'Antic client comercialitzador de torrons',
      email: 'contacte@pastisserialluma.cat',
      estat: 'arxivat',
      notes: 'Projecte completat el 2025. Guardat per motius històrics.',
      dataCreacio: '2025-05-10T08:00:00Z',
      dataModificacio: '2025-12-30T17:00:00Z'
    }
  ],
  projects: [
    {
      id: 'p-101',
      clientId: 'c-1',
      nom: 'Portal de Turisme 2026',
      descripcio: 'Disseny i implementació del nou gestor de turisme municipal',
      estat: 'actiu',
      tarifaHoraria: 50,
      pressupostHores: 120,
      color: '#3B82F6', // Blue
      dataInici: '2026-05-01',
      dataFinalitzacioPrevista: '2026-07-31',
      notes: 'Reunions de seguiment els dimarts a les 10h per Teams.',
      dataCreacio: '2026-04-20T10:00:00Z',
      dataModificacio: '2026-05-01T08:30:00Z'
    },
    {
      id: 'p-102',
      clientId: 'c-1',
      nom: 'Auditoria d’Accessibilitat',
      descripcio: 'Verificació de pautes WCAG 2.2 a la intranet municipal',
      estat: 'pausat',
      tarifaHoraria: 60,
      pressupostHores: 40,
      color: '#F59E0B', // Amber
      dataInici: '2026-05-10',
      notes: 'Pendent de l’entrega dels codis font de la intranet.',
      dataCreacio: '2026-05-05T09:15:00Z',
      dataModificacio: '2026-05-10T14:20:00Z'
    },
    {
      id: 'p-103',
      clientId: 'c-2',
      nom: 'Gestor de Reserves d’Espais',
      descripcio: 'Plataforma web per automatitzar reserves de sales',
      estat: 'actiu',
      tarifaHoraria: 40,
      pressupostHores: 80,
      color: '#10B981', // Emerald
      dataInici: '2026-05-05',
      dataFinalitzacioPrevista: '2026-06-15',
      notes: 'Utilitzar React per a l’agenda interactiva.',
      dataCreacio: '2026-05-01T15:00:00Z',
      dataModificacio: '2026-05-05T08:00:00Z'
    },
    {
      id: 'p-104',
      clientId: 'c-3',
      nom: 'Botiga de Torrons Clàssics',
      descripcio: 'E-commerce històric',
      estat: 'arxivat',
      tarifaHoraria: 45,
      pressupostHores: 100,
      color: '#64748B', // Slate
      dataInici: '2025-06-01',
      notes: 'Arxivat.',
      dataCreacio: '2025-05-15T12:00:00Z',
      dataModificacio: '2025-12-30T17:00:00Z'
    }
  ],
  blocs: [],
  issuedQuotes: [],
  tasks: [
    {
      id: 't-1001',
      projecteId: 'p-101',
      nom: 'Disseny d’UI Mockups',
      descripcio: 'Creació dels wireframes de la pàgina principal i rutes turístiques',
      categoria: 'Disseny',
      estat: 'feta',
      pressupostHores: 30,
      dataCreacio: '2026-05-01T09:00:00Z',
      dataModificacio: '2026-05-05T17:30:00Z'
    },
    {
      id: 't-1002',
      projecteId: 'p-101',
      nom: 'Desenvolupament Frontend React',
      descripcio: 'Maquetació de vistes completes i rutes dinàmiques',
      categoria: 'Programació',
      estat: 'en curs',
      pressupostHores: 60,
      dataCreacio: '2026-05-01T09:10:00Z',
      dataModificacio: '2026-05-01T09:10:00Z'
    },
    {
      id: 't-1003',
      projecteId: 'p-101',
      nom: 'Integració d’API Mapes',
      descripcio: 'Sincronització de geolocalització pels punts d’interès històrics',
      categoria: 'Programació',
      estat: 'pendent',
      pressupostHores: 30,
      dataCreacio: '2026-05-02T11:00:00Z',
      dataModificacio: '2026-05-02T11:00:00Z'
    },
    {
      id: 't-2001',
      projecteId: 'p-103',
      nom: 'Backend API de Reserves',
      descripcio: 'Creació de persistència en memòria i endpoints de reserves',
      categoria: 'Backend',
      estat: 'feta',
      pressupostHores: 20,
      dataCreacio: '2026-05-05T08:30:00Z',
      dataModificacio: '2026-05-18T18:00:00Z'
    },
    {
      id: 't-2002',
      projecteId: 'p-103',
      nom: 'Agenda Interactiva Frontend',
      descripcio: 'Component de calendari setmanal arrossegable',
      categoria: 'Programació',
      estat: 'en curs',
      pressupostHores: 40,
      dataCreacio: '2026-05-05T08:45:00Z',
      dataModificacio: '2026-05-05T08:45:00Z'
    }
  ],
  timeEntries: [], // Will be generated based on current local time below for realistic presentation
  activeSession: null,
  auditLog: [
    {
      id: 'log-1',
      timestamp: '2026-05-01T08:30:00Z',
      accio: 'crear',
      entitatAfectada: 'projecte',
      idEntitat: 'p-101',
      resum: 'Nou projecte creat: Portal de Turisme 2026'
    },
    {
      id: 'log-2',
      timestamp: '2026-05-05T08:45:00Z',
      accio: 'crear',
      entitatAfectada: 'tasca',
      idEntitat: 't-2002',
      resum: 'Nova tasca creada: Agenda Interactiva Frontend'
    }
  ]
};

/**
 * Dynamically populates mock time entries relative to the current local date (2026-05-25)
 * so that dashboard gauges and weekly charts are instantly populated with data!
 */
export function generateMockEntries(nowIsoString: string): LocalDatabase {
  const base = { ...mockDatabase };
  
  // Base date is 2026-05-25 (User metadata says current local time is: 2026-05-25)
  const baseDate = new Date(nowIsoString);
  const formatDateString = (offsetDays: number): string => {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
  };

  const entries = [
    // --- TODAY (Monday, May 25, 2026) ---
    {
      id: 'e-1',
      clientId: 'c-1',
      projecteId: 'p-101',
      tascaId: 't-1002', // Desenvolupament Frontend
      data: formatDateString(0), // Today (2026-05-25)
      horaInici: '08:00',
      horaFi: '11:30',
      duradaMinuts: 210, // 3h 30m
      facturable: true,
      tarifaHorariaAplicada: 50,
      importCalculat: 175,
      descripcio: 'Maquetació dels panells interactius de turisme i rutes dinàmiques.',
      notes: 'He fet servir React Router i hooks de Vite.',
      origen: 'cronòmetre' as const,
      estat: 'correcte' as const,
      dataCreacio: '2026-05-25T11:30:00Z',
      dataModificacio: '2026-05-25T11:30:00Z'
    },
    {
      id: 'e-2',
      clientId: 'c-2',
      projecteId: 'p-103', // Reserves
      tascaId: 't-2002', // Agenda Interactiva
      data: formatDateString(0), // Today (2026-05-25)
      horaInici: '13:00',
      horaFi: '14:30',
      duradaMinuts: 90, // 1h 30m
      facturable: true,
      tarifaHorariaAplicada: 40,
      importCalculat: 60,
      descripcio: 'Reunió amb l’equip de desenvolupament de Sinergia per polir la sincro del calendari.',
      notes: 'Feedback molt positiu. Demanaran canvis en la paleta de colors.',
      origen: 'manual' as const,
      estat: 'correcte' as const,
      dataCreacio: '2026-05-25T14:40:00Z',
      dataModificacio: '2026-05-25T14:40:00Z'
    },
    
    // --- THIS WEEK ---
    {
      id: 'e-3',
      clientId: 'c-1',
      projecteId: 'p-101',
      tascaId: 't-1001', // Disseny
      data: formatDateString(-1), // Yesterday, Sunday (2026-05-24)
      horaInici: '10:00',
      horaFi: '13:00',
      duradaMinuts: 180, // 3h
      facturable: true,
      tarifaHorariaAplicada: 50,
      importCalculat: 150,
      descripcio: 'Disseny addicional d’avatars i targetes de ruta per la llista de punts.',
      notes: 'Tasca tancada correctament.',
      origen: 'manual' as const,
      estat: 'correcte' as const,
      dataCreacio: '2026-05-24T13:05:00Z',
      dataModificacio: '2026-05-24T13:05:00Z'
    },
    {
      id: 'e-4',
      clientId: 'c-2',
      projecteId: 'p-103',
      tascaId: 't-2002',
      data: formatDateString(-2), // Friday (2026-05-22)
      horaInici: '15:00',
      horaFi: '19:15',
      duradaMinuts: 255, // 4h 15m
      facturable: true,
      tarifaHorariaAplicada: 40,
      importCalculat: 170,
      descripcio: 'Maquetació de components Drag and Drop pel fitxer interactiu de reservations.',
      notes: '',
      origen: 'cronòmetre' as const,
      estat: 'correcte' as const,
      dataCreacio: '2026-05-22T19:15:00Z',
      dataModificacio: '2026-05-22T19:15:00Z'
    },
    {
      id: 'e-5',
      clientId: 'c-1',
      projecteId: 'p-101',
      tascaId: 't-1002',
      data: formatDateString(-3), // Thursday (2026-05-21)
      horaInici: '09:00',
      horaFi: '14:00',
      duradaMinuts: 300, // 5h
      facturable: true,
      tarifaHorariaAplicada: 50,
      importCalculat: 250,
      descripcio: 'Desenvolupament de panells de filtratge avançat per dates i proximitat.',
      notes: '',
      origen: 'cronòmetre' as const,
      estat: 'correcte' as const,
      dataCreacio: '2026-05-21T14:00:00Z',
      dataModificacio: '2026-05-21T14:00:00Z'
    },

    // --- PAST CHECKS / DELIBERATE WARNINGS ---
    {
      id: 'e-6', // WARNING: Overlapping start/end
      clientId: 'c-1',
      projecteId: 'p-101',
      tascaId: 't-1002',
      data: formatDateString(-3), // Thursday (2026-05-21)
      horaInici: '11:00', // Solapament amb e-5 (09:00 - 14:00)
      horaFi: '12:30',
      duradaMinuts: 90,
      facturable: true,
      tarifaHorariaAplicada: 50,
      importCalculat: 75,
      descripcio: '[Alerta de Solapament] Proves paral·leles del renderitzador amb el client.',
      notes: 'S’ha d’editar per solucionar el conflicte d’hores.',
      origen: 'manual' as const,
      estat: 'incoherent' as const,
      dataCreacio: '2026-05-21T15:00:00Z',
      dataModificacio: '2026-05-21T15:00:00Z'
    },
    {
      id: 'e-7', // WARNING: Time duration negative / incoherent hours
      clientId: 'c-2',
      projecteId: 'p-103',
      data: formatDateString(-4), // Wednesday (2026-05-20)
      horaInici: '17:00',
      horaFi: '15:30', // Negative!
      duradaMinuts: -90,
      facturable: true,
      tarifaHorariaAplicada: 40,
      importCalculat: -60,
      descripcio: '[Alerta Incoherent] Correccions d’estils rurals al full de maquetació.',
      notes: 'Error humà al desar les dades manualment.',
      origen: 'manual' as const,
      estat: 'incoherent' as const,
      dataCreacio: '2026-05-20T17:00:00Z',
      dataModificacio: '2026-05-20T17:00:00Z'
    },
    {
      id: 'e-8', // WARNING: Facturable sense tarifa aplicada
      clientId: 'c-2',
      projecteId: 'p-103',
      tascaId: 't-2001',
      data: formatDateString(-5), // Tuesday (2026-05-19)
      horaInici: '08:00',
      horaFi: '13:00',
      duradaMinuts: 300,
      facturable: true,
      tarifaHorariaAplicada: 0, // Missing tariff!
      importCalculat: 0,
      descripcio: '[Alerta pendent de revisar] Configurar endpoints del backend i base de dades sqlite.',
      notes: 'Marta va oblidar definir la tarifa en aquest històric especial.',
      origen: 'cronòmetre' as const,
      estat: 'pendent de revisar' as const,
      dataCreacio: '2026-05-19T13:00:00Z',
      dataModificacio: '2026-05-19T13:00:00Z'
    },

    // --- MONTHLY DATA (May 1st - 15th) ---
    {
      id: 'e-9',
      clientId: 'c-1',
      projecteId: 'p-101',
      tascaId: 't-1001',
      data: formatDateString(-15), // May 10, 2026
      horaInici: '09:00',
      horaFi: '15:00',
      duradaMinuts: 360, // 6h
      facturable: true,
      tarifaHorariaAplicada: 50,
      importCalculat: 300,
      descripcio: 'Preparació del Disseny dels canvis de perfil del viatger i rutes recomendades.',
      notes: '',
      origen: 'manual' as const,
      estat: 'correcte' as const,
      dataCreacio: '2026-05-10T15:30:00Z',
      dataModificacio: '2026-05-10T15:30:00Z'
    },
    {
      id: 'e-10',
      clientId: 'c-2',
      projecteId: 'p-103',
      tascaId: 't-2001',
      data: formatDateString(-13), // May 12, 2026
      horaInici: '14:00',
      horaFi: '18:30',
      duradaMinuts: 270, // 4h 30m
      facturable: true,
      tarifaHorariaAplicada: 40,
      importCalculat: 180,
      descripcio: 'Disseny d’esquemes de relació i mock endpoints de la API de reserves.',
      notes: '',
      origen: 'manual' as const,
      estat: 'correcte' as const,
      dataCreacio: '2026-05-12T19:00:00Z',
      dataModificacio: '2026-05-12T19:00:00Z'
    },
    {
      id: 'e-11',
      clientId: 'c-1',
      projecteId: 'p-101',
      data: formatDateString(-20), // May 5, 2026
      horaInici: '09:00',
      horaFi: '16:00',
      duradaMinuts: 420, // 7h
      facturable: true,
      tarifaHorariaAplicada: 50,
      importCalculat: 350,
      descripcio: 'Planificació de kickoff amb el departament de turisme municipal i lliurament dels mockups.',
      notes: 'Primera reunió molt reeixida.',
      origen: 'manual' as const,
      estat: 'correcte' as const,
      dataCreacio: '2026-05-05T17:00:00Z',
      dataModificacio: '2026-05-05T17:00:00Z'
    }
  ];

  base.timeEntries = entries;
  base.auditLog.push({
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    accio: 'fitxer',
    entitatAfectada: 'fitxer',
    idEntitat: 'mock-db',
    resum: 'Dades de mostra inicials carregades correctament.'
  });

  return base;
}
