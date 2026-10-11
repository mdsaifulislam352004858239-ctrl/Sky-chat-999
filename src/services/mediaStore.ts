/**
 * Robust IndexedDB Media Storage
 * Handles storing large video files and images locally without hitting localStorage 5MB quota.
 */

const DB_NAME = 'sky_chat_media_store';
const DB_VERSION = 1;
const STORE_NAME = 'media_files';

let dbPromise: Promise<IDBDatabase> | null = null;

const getDB = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open media database'));
    };
  });

  return dbPromise;
};

export interface StoredMediaRecord {
  id: string;
  blob: Blob;
  mimeType: string;
  size: number;
  createdAt: number;
}

/**
 * Save a media File or Blob to IndexedDB
 * Returns an internal ID reference, e.g. "idb:media_17285..."
 */
export const saveMediaToIndexedDB = async (fileOrBlob: File | Blob, customId?: string): Promise<string> => {
  try {
    const db = await getDB();
    const isImage = fileOrBlob.type.startsWith('image/');
    const isAudio = fileOrBlob.type.startsWith('audio/');
    const typePrefix = isImage ? 'img_' : isAudio ? 'aud_' : 'vid_';
    const id = customId || `${typePrefix}${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const record: StoredMediaRecord = {
      id,
      blob: fileOrBlob,
      mimeType: fileOrBlob.type,
      size: fileOrBlob.size,
      createdAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);

      req.onsuccess = () => {
        resolve(`idb:${id}`);
      };

      req.onerror = () => {
        reject(req.error || new Error('Failed to save media in IndexedDB'));
      };
    });
  } catch (err) {
    console.error('Error saving media to IndexedDB:', err);
    throw err;
  }
};

/**
 * Get media record metadata (mimeType, size, etc.) from IndexedDB
 */
export const getStoredMediaMetadata = async (urlOrRef: string): Promise<StoredMediaRecord | null> => {
  if (!urlOrRef || !urlOrRef.startsWith('idb:')) return null;
  const id = urlOrRef.replace('idb:', '');
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => {
        resolve((req.result as StoredMediaRecord) || null);
      };
      req.onerror = () => {
        resolve(null);
      };
    });
  } catch {
    return null;
  }
};

// Cache of blob URLs in memory to prevent memory leaks and redundant conversions
const blobUrlCache = new Map<string, string>();

/**
 * Resolve an internal reference (e.g. "idb:media_123") or external URL to a playable URL
 */
export const resolveMediaUrl = async (urlOrRef: string): Promise<string> => {
  if (!urlOrRef) return '';

  // Already a normal web URL or data URL
  if (!urlOrRef.startsWith('idb:')) {
    return urlOrRef;
  }

  const id = urlOrRef.replace('idb:', '');
  if (blobUrlCache.has(id)) {
    return blobUrlCache.get(id)!;
  }

  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);

      req.onsuccess = () => {
        const result = req.result as StoredMediaRecord | undefined;
        if (result && result.blob) {
          const blobUrl = URL.createObjectURL(result.blob);
          blobUrlCache.set(id, blobUrl);
          resolve(blobUrl);
        } else {
          resolve('');
        }
      };

      req.onerror = () => {
        resolve('');
      };
    });
  } catch {
    return '';
  }
};

/**
 * Delete a media item from IndexedDB
 */
export const deleteMediaFromIndexedDB = async (urlOrRef: string): Promise<void> => {
  if (!urlOrRef || !urlOrRef.startsWith('idb:')) return;
  const id = urlOrRef.replace('idb:', '');

  if (blobUrlCache.has(id)) {
    const oldUrl = blobUrlCache.get(id)!;
    URL.revokeObjectURL(oldUrl);
    blobUrlCache.delete(id);
  }

  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
  } catch (err) {
    console.error('Failed to delete media from IndexedDB:', err);
  }
};
