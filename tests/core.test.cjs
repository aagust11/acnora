const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function loadUtility(file) {
  const source = fs.readFileSync(file, 'utf8');
  const result = ts.transpileModule(source, {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const module = { exports: {} };
  vm.runInNewContext(result.outputText, { module, exports: module.exports, Date, console });
  return module.exports;
}

const { createEmptyDatabase, normalizeDatabase } = loadUtility('src/utils/database.ts');
const { localToday, isToday, isThisWeek, formatDuration, validateEntry } = loadUtility('src/utils/timeUtils.ts');
const { buildQuoteSummary, getTaskQuoteInputs } = loadUtility('src/utils/quotation.ts');

test('Un espai nou no conté clients ni registres d’exemple', () => {
  const db = createEmptyDatabase();
  assert.equal(db.clients.length, 0);
  assert.equal(db.projects.length, 0);
  assert.equal(db.timeEntries.length, 0);
  assert.equal(db.activeSession, null);
});

test('Importa un JSON de l’aplicació anterior sense perdre col·leccions', () => {
  const existing = {
    version: '1.0.0', settings: { currency: 'EUR', freelancer: { name: 'Empresa' } },
    clients: [{ id: 'c1', nom: 'Client' }], projects: [{ id: 'p1' }],
    tasks: [{ id: 't1' }], timeEntries: [{ id: 'e1', duradaMinuts: 90 }],
    auditLog: [{ id: 'a1' }], activeSession: null,
  };
  const got = normalizeDatabase(existing);
  assert.equal(got.clients[0].id, 'c1');
  assert.equal(got.projects[0].id, 'p1');
  assert.equal(got.tasks[0].id, 't1');
  assert.equal(got.timeEntries[0].id, 'e1');
  assert.equal(got.auditLog.length, 1);
  assert.equal(got.settings.freelancer.name, 'Empresa');
  assert.equal(got.settings.defaultHourlyRate, 0);
});

test('Rebutja fitxers sense estructures bàsiques', () => {
  assert.throws(() => normalizeDatabase({ clients: [], projects: [] }));
});

test('Les dates es calculen segons la data local, no UTC', () => {
  const d = new Date();
  const expected = [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
  assert.equal(localToday(), expected);
  assert.equal(isToday(expected), true);
  assert.equal(isThisWeek(expected), true);
});

test('Les durades mantenen el format habitual', () => {
  assert.equal(formatDuration(90, 'clock'), '1 h 30 min');
  assert.equal(formatDuration(120, 'decimal'), '2 h');
});

test('Un registre sense tarifa facturable requereix revisió', () => {
  const entry = {
    id:'e1', projecteId:'p1', data: localToday(), horaInici:'09:00', horaFi:'10:00',
    facturable:true, tarifaHorariaAplicada:0, duradaMinuts:60,
  };
  const result = validateEntry(entry, [{ id:'p1', estat:'actiu' }], [], []);
  assert.equal(result.status, 'pendent de revisar');
});


test('Pressupost amb interval manual: 9–11 h a 50 €/h, no 10 h artificials', () => {
  const project = { id: 'p1', tarifaHoraria: 50 };
  const settings = { defaultHourlyRate: 20, currency: 'EUR' };
  const tasks = [{ id: 't1', nom: 'Automatització', horesEstimadesMin: 9, horesEstimadesMax: 11 }];
  const out = buildQuoteSummary(tasks, project, settings);
  assert.equal(out.errors.length, 0);
  assert.equal(out.minHours, 9);
  assert.equal(out.maxHours, 11);
  assert.equal(out.minAmount, 450);
  assert.equal(out.maxAmount, 550);
});

test('El pressupost de tasques antiga, d’una sola xifra, es conserva', () => {
  const project = { id: 'p1', tarifaHoraria: 50 };
  const settings = { defaultHourlyRate: 30 };
  const task = { id: 't1', nom: 'Tasca antiga', pressupostHores: 8 };
  const v = getTaskQuoteInputs(task, project, settings);
  assert.equal(v.minHours, 8);
  assert.equal(v.maxHours, 8);
  assert.equal(v.hourlyRate, 50);
});

test('No es pot generar un pressupost amb hores incoherents o sense tarifa', () => {
  const project = { id: 'p1' };
  const settings = { defaultHourlyRate: 0 };
  const tasks = [
    { id: 't1', nom: 'Interval invertit', horesEstimadesMin: 11, horesEstimadesMax: 9, tarifaHorariaPressupost: 50 },
    { id: 't2', nom: 'Sense tarifa', horesEstimadesMin: 2, horesEstimadesMax: 4 },
  ];
  const out = buildQuoteSummary(tasks, project, settings);
  assert.equal(out.errors.length, 2);
  assert.equal(out.lines.length, 0);
});


test('Una tasca combina diferents tarifes i hores no facturables a 0 €/h', () => {
  const task = { id: 't1', nom: 'Automatització', pressupostTrams: [
    { id:'r1', concepte:'Desenvolupament', horesMin:9, horesMax:11, tarifa:50 },
    { id:'r2', concepte:'Reunió no facturable', horesMin:1, horesMax:2, tarifa:0 },
    { id:'r3', concepte:'Revisió', horesMin:2, horesMax:3, tarifa:30 },
  ]};
  const summary = buildQuoteSummary([task], { id:'p1', tarifaHoraria:50 }, { defaultHourlyRate:40, currency:'EUR' });
  assert.equal(summary.errors.length, 0);
  assert.equal(summary.minHours, 12);
  assert.equal(summary.maxHours, 16);
  assert.equal(summary.minAmount, 510);
  assert.equal(summary.maxAmount, 640);
  assert.equal(summary.lines[0].trams[1].minAmount, 0);
  assert.equal(summary.lines[0].hourlyRate, null);
});

test('Un pressupost no accepta trams parcials, negatius o sense hores', () => {
  const project = { id:'p1' };
  const settings = { defaultHourlyRate:50 };
  for (const trams of [[{id:'a',horesMin:2,horesMax:1,tarifa:50}], [{id:'a',horesMin:1,horesMax:2,tarifa:-1}], [{id:'a',horesMin:0,horesMax:0,tarifa:0}], []]) {
    const summary = buildQuoteSummary([{id:'t',nom:'T',pressupostTrams:trams}],project,settings);
    assert.equal(summary.errors.length,1);
  }
});

test('Els JSON anteriors sense blocs ni trams es continuen carregant', () => {
  const before = { clients:[], projects:[{id:'p'}], tasks:[{id:'t',projecteId:'p',pressupostHores:4}], timeEntries:[] };
  const after = normalizeDatabase(before);
  assert.equal(after.blocs.length,0);
  assert.equal(after.tasks[0].pressupostHores,4);
  const quote = buildQuoteSummary(after.tasks,after.projects[0],{defaultHourlyRate:30});
  assert.equal(quote.minAmount,120);
});

const { isQuoteExpired, pruneExpiredQuotes, markQuoteAccepted } = loadUtility('src/utils/issuedQuotes.ts');

test('Pressupost pendent expira només DESPRÉS de l’últim dia de validesa', () => {
  const q = { id: 'q1', status: 'pendent', validUntil: '2026-11-20' };
  assert.equal(isQuoteExpired(q, '2026-11-19'), false);
  assert.equal(isQuoteExpired(q, '2026-11-20'), false);
  assert.equal(isQuoteExpired(q, '2026-11-21'), true);
});

test('Els pressupostos acceptats conserven exactament el PDF en caducar', () => {
  const issued = { id: 'q1', status: 'pendent', validUntil: '2026-11-20', pdfDataUri: 'data:application/pdf;base64,QUJD' };
  const accepted = markQuoteAccepted(issued, '2026-11-20T17:00:00Z');
  assert.equal(accepted.status, 'acceptat');
  assert.equal(accepted.pdfDataUri, issued.pdfDataUri);
  const db = normalizeDatabase({ clients: [], projects: [], timeEntries: [], issuedQuotes: [issued, accepted] });
  const after = pruneExpiredQuotes(db, '2026-11-21');
  assert.equal(after.issuedQuotes.length, 1);
  assert.equal(after.issuedQuotes[0].pdfDataUri, issued.pdfDataUri);
  assert.equal(after.issuedQuotes[0].status, 'acceptat');
});

test('Pressupostos antics sense historial segueixen sent compatibles', () => {
  const db = normalizeDatabase({ clients: [], projects: [], timeEntries: [] });
  assert.equal(db.issuedQuotes.length, 0);
});


const { orderQuoteTasks, moveQuoteTask, moveQuoteGroup } = loadUtility('src/utils/quoteOrdering.ts');
const task = (id, nom, blocId) => ({id, nom, blocId});
const groups = [{id:'bz',nom:'Zeta'},{id:'ba',nom:'Anàlisi'}];
const quoteTasks = [task('a','Zoologia','ba'),task('b','Altres','bz'),task('c','Anàlisi','ba'),task('d','Tasca lliure')];

test('Els pressupostos s’ordenen per nom del bloc i després per nom de la tasca, sense bloc al final', () => {
  assert.deepEqual(orderQuoteTasks(quoteTasks, groups).map(t => t.id).join(','), 'c,a,b,d');
});

test('Permet reordenar els blocs conservant les tasques agrupades', () => {
  const moved = moveQuoteGroup(quoteTasks, groups, [], 'bz', -1);
  assert.equal(orderQuoteTasks(quoteTasks, groups, moved).map(t => t.id).join(','), 'b,c,a,d');
});

test('Permet reordenar les tasques només dins del seu bloc', () => {
  const moved = moveQuoteTask(quoteTasks, groups, [], 'a', -1);
  assert.equal(orderQuoteTasks(quoteTasks, groups, moved).map(t => t.id).join(','), 'a,c,b,d');
  const unchanged = moveQuoteTask(quoteTasks, groups, moved, 'a', -1);
  assert.equal(orderQuoteTasks(quoteTasks, groups, unchanged).map(t => t.id).join(','), 'a,c,b,d');
});

test('Quan apareix una nova tasca no perd l’ordre personalitzat dels blocs', () => {
  const moved = moveQuoteGroup(quoteTasks, groups, [], 'bz', -1);
  const expanded = [...quoteTasks, task('e','Bona nit','bz')];
  assert.equal(orderQuoteTasks(expanded, groups, moved).map(t => t.id).join(','), 'b,e,c,a,d');
});

const { isConflictingContent } = loadUtility('src/utils/localFileSync.ts');

test('L’autodesament bloqueja un JSON canviat des de fora', () => {
  assert.equal(isConflictingContent('hash-original', 'hash-original'), false);
  assert.equal(isConflictingContent('hash-original', 'hash-modificat'), true);
});
