/** Browser-local clip blob store (IndexedDB). Clips live on this device. */

const DB = "worldeye-clips";
const STORE = "blobs";
/**
 * In-progress recording segments, one entry per MediaRecorder timeslice,
 * written by the capture-session layer (lib/recording/sessions) as a
 * recording runs — so a crash or a closed tab loses at most the segment
 * still being captured, never the whole recording.
 */
const SEGMENTS = "segments";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 2);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      if (!req.result.objectStoreNames.contains(SEGMENTS)) req.result.createObjectStore(SEGMENTS);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbPutClip(id: string, blob: Blob): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function idbGetClip(id: string): Promise<Blob | null> {
  const db = await openDb();
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return blob;
}

export async function idbDeleteClip(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/** Bytes used by clip blobs in this browser (estimate). */
export async function idbUsageBytes(): Promise<number> {
  try {
    const db = await openDb();
    let total = 0;
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).openCursor();
      req.onsuccess = () => {
        const cur = req.result;
        if (cur) {
          const b = cur.value as Blob;
          total += b?.size ?? 0;
          cur.continue();
        } else resolve();
      };
      req.onerror = () => reject(req.error);
    });
    db.close();
    return total;
  } catch {
    return 0;
  }
}

/* ------------------------------------------------------------------ */
/* Recording segments — appended while a capture session records.      */
/* Keys sort lexicographically in sequence order (zero-padded seq).    */
/* ------------------------------------------------------------------ */

export const segmentKey = (sessionId: string, seq: number) =>
  `${sessionId}:${String(seq).padStart(6, "0")}`;

export async function idbPutSegment(sessionId: string, seq: number, blob: Blob): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(SEGMENTS, "readwrite");
    tx.objectStore(SEGMENTS).put(blob, segmentKey(sessionId, seq));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/** Every persisted segment of a session, in capture order. */
export async function idbGetSegments(sessionId: string): Promise<Blob[]> {
  const db = await openDb();
  const out = await new Promise<Blob[]>((resolve, reject) => {
    const tx = db.transaction(SEGMENTS, "readonly");
    const req = tx.objectStore(SEGMENTS).openCursor(
      IDBKeyRange.bound(`${sessionId}:`, `${sessionId}:\uffff`),
    );
    const acc: Blob[] = [];
    req.onsuccess = () => {
      const cur = req.result;
      if (cur) {
        acc.push(cur.value as Blob);
        cur.continue();
      } else resolve(acc);
    };
    req.onerror = () => reject(req.error);
  });
  db.close();
  return out;
}

export async function idbDeleteSegments(sessionId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(SEGMENTS, "readwrite");
    const req = tx.objectStore(SEGMENTS).openCursor(
      IDBKeyRange.bound(`${sessionId}:`, `${sessionId}:\uffff`),
    );
    req.onsuccess = () => {
      const cur = req.result;
      if (cur) {
        cur.delete();
        cur.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
