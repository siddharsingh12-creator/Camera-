import { DetectedFaceBox, DoubleExposureParams } from '../types/doubleExposure';

const DRAFT_DB_NAME = 'ultra_cam_pro_dbl_exp_draft_v1';
const DRAFT_STORE = 'drafts';
const ACTIVE_KEY = 'active_session';

export interface DoubleExposureDraftRecord {
  key: string;
  capture1Blob: Blob | null;
  capture2Blob: Blob | null;
  eraserMaskBlob: Blob | null;
  params: DoubleExposureParams;
  faceBox: DetectedFaceBox | null;
  updatedAt: number;
}

function openDraftDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DRAFT_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DRAFT_STORE)) {
        db.createObjectStore(DRAFT_STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open draft DB'));
  });
}

export async function saveDoubleExposureDraft(
  payload: Omit<DoubleExposureDraftRecord, 'key' | 'updatedAt'>
): Promise<void> {
  try {
    const db = await openDraftDb();
    const record: DoubleExposureDraftRecord = {
      key: ACTIVE_KEY,
      ...payload,
      updatedAt: Date.now(),
    };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DRAFT_STORE, 'readwrite');
      tx.objectStore(DRAFT_STORE).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Draft save failed'));
    });
    db.close();
  } catch {
    // Best-effort crash recovery; never throw during background persistence
  }
}

export async function loadDoubleExposureDraft(): Promise<DoubleExposureDraftRecord | null> {
  try {
    const db = await openDraftDb();
    const record = await new Promise<DoubleExposureDraftRecord | null>((resolve, reject) => {
      const tx = db.transaction(DRAFT_STORE, 'readonly');
      const req = tx.objectStore(DRAFT_STORE).get(ACTIVE_KEY);
      req.onsuccess = () => resolve((req.result as DoubleExposureDraftRecord | undefined) ?? null);
      req.onerror = () => reject(req.error ?? new Error('Draft load failed'));
    });
    db.close();
    if (!record || (!record.capture1Blob && !record.capture2Blob)) {
      return null;
    }
    return record;
  } catch {
    return null;
  }
}

export async function clearDoubleExposureDraft(): Promise<void> {
  try {
    const db = await openDraftDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DRAFT_STORE, 'readwrite');
      tx.objectStore(DRAFT_STORE).delete(ACTIVE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Draft clear failed'));
    });
    db.close();
  } catch {
    // Ignore cleanup errors
  }
}
