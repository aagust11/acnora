/** Chrome/Edge File System Access: the user explicitly grants access to their JSON. */
export interface WritableLocalFile {
  write(data: string): Promise<void>;
  close(): Promise<void>;
  abort?(): Promise<void>;
}

export interface LocalJsonHandle {
  name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<WritableLocalFile>;
  queryPermission(options: { mode: 'readwrite' }): Promise<PermissionState>;
  requestPermission(options: { mode: 'readwrite' }): Promise<PermissionState>;
}

export interface RememberedLink {
  handle: LocalJsonHandle;
  hash: string;
}

const DB_NAME = 'acnora-local-json-link';
const STORE = 'linked-files';
const KEY = 'workspace';

function openLinkDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('Aquest navegador no admet enllaços persistents.')); return; }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('No es pot obrir la memòria del vincle.'));
  });
}

function withStore<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openLinkDatabase().then(db => new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    let result: T;
    const request = operation(transaction.objectStore(STORE));
    request.onsuccess = () => { result = request.result; };
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => { db.close(); resolve(result); };
    transaction.onerror = () => { db.close(); reject(transaction.error); };
    transaction.onabort = () => { db.close(); reject(transaction.error); };
  }));
}

export async function rememberLink(link: RememberedLink): Promise<void> {
  await withStore('readwrite', store => store.put(link, KEY));
}

export async function retrieveLink(): Promise<RememberedLink | undefined> {
  return withStore<RememberedLink | undefined>('readonly', store => store.get(KEY));
}

export async function forgetLink(): Promise<void> {
  await withStore('readwrite', store => store.delete(KEY));
}

export async function contentHash(content: string): Promise<string> {
  const bytes = new TextEncoder().encode(content);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

export function isConflictingContent(expectedHash: string, actualHash: string): boolean {
  return expectedHash !== actualHash;
}

export async function canWrite(handle: LocalJsonHandle): Promise<boolean> {
  return (await handle.queryPermission({ mode: 'readwrite' })) === 'granted';
}
