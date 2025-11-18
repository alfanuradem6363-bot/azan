import { openDB, IDBPDatabase } from 'https://cdn.jsdelivr.net/npm/idb@8/+esm';

const DB_NAME = 'AzanAlarmDB';
const DB_VERSION = 1;
const SOUND_STORE_NAME = 'sounds';

let dbPromise: Promise<IDBPDatabase> | null = null;

const initDB = (): Promise<IDBPDatabase> => {
  if (dbPromise) return dbPromise;
  dbPromise = openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(SOUND_STORE_NAME)) {
        db.createObjectStore(SOUND_STORE_NAME);
      }
    },
  });
  return dbPromise;
};

export const saveSound = async (name: string, blob: Blob): Promise<void> => {
  const db = await initDB();
  await db.put(SOUND_STORE_NAME, blob, name);
};

export const getSound = async (name: string): Promise<Blob | undefined> => {
  const db = await initDB();
  return db.get(SOUND_STORE_NAME, name);
};

export const getAllSoundKeys = async (): Promise<IDBValidKey[]> => {
  const db = await initDB();
  return db.getAllKeys(SOUND_STORE_NAME);
};

export const deleteSound = async (name: string): Promise<void> => {
  const db = await initDB();
  await db.delete(SOUND_STORE_NAME, name);
};
