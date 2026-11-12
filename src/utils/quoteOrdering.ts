import type { Task, WorkBlock } from '../types';

export const quoteGroupKey = (task: Task): string => task.blocId || '';
export const quoteGroupLabel = (key: string, blocks: WorkBlock[]): string =>
  key ? (blocks.find(b => b.id === key)?.nom ?? 'Bloc no disponible') : 'Tasques sense bloc';

const compareCa = (a: string, b: string): number =>
  a.localeCompare(b, 'ca', { sensitivity: 'base', numeric: true });

/** Sort by work-block name, then task name; manual order is draft-only. */
export function orderQuoteTasks(tasks: Task[], blocks: WorkBlock[], manualOrder: string[] = []): Task[] {
  const byId = new Map(tasks.map(task => [task.id, task]));
  const sorted = [...tasks].sort((a, b) => {
    const ak = quoteGroupKey(a), bk = quoteGroupKey(b);
    if (!ak && bk) return 1;
    if (ak && !bk) return -1;
    return compareCa(quoteGroupLabel(ak, blocks), quoteGroupLabel(bk, blocks)) ||
      compareCa(a.nom, b.nom) || compareCa(a.id, b.id);
  });
  const groups = [...new Set(sorted.map(quoteGroupKey))];
  const manualGroups = [...new Set(manualOrder.map(id => byId.get(id))
    .filter((task): task is Task => !!task).map(quoteGroupKey))];
  return [...manualGroups, ...groups.filter(g => !manualGroups.includes(g))].flatMap(group => {
    const originals = sorted.filter(task => quoteGroupKey(task) === group);
    const localOrder = manualOrder.filter(id => byId.get(id) && quoteGroupKey(byId.get(id)!) === group);
    const uniqueIds = [...new Set(localOrder)];
    return [...uniqueIds.map(id => byId.get(id)!), ...originals.filter(t => !uniqueIds.includes(t.id))];
  });
}

export function moveQuoteTask(tasks: Task[], blocks: WorkBlock[], manualOrder: string[], taskId: string, direction: -1 | 1): string[] {
  const ordered = orderQuoteTasks(tasks, blocks, manualOrder);
  const index = ordered.findIndex(task => task.id === taskId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= ordered.length ||
      quoteGroupKey(ordered[index]) !== quoteGroupKey(ordered[target])) {
    return ordered.map(t => t.id);
  }
  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
  return ordered.map(t => t.id);
}

export function moveQuoteGroup(tasks: Task[], blocks: WorkBlock[], manualOrder: string[], groupKey: string, direction: -1 | 1): string[] {
  const ordered = orderQuoteTasks(tasks, blocks, manualOrder);
  const groups = [...new Set(ordered.map(quoteGroupKey))];
  const index = groups.indexOf(groupKey), target = index + direction;
  if (index < 0 || target < 0 || target >= groups.length) return ordered.map(t => t.id);
  [groups[index], groups[target]] = [groups[target], groups[index]];
  return groups.flatMap(g => ordered.filter(t => quoteGroupKey(t) === g).map(t => t.id));
}