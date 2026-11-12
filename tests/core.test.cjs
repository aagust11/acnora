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
