import { CapturedPhotoInfo } from '../types/camera';

const DB_NAME = 'ultra_cam_pro_media_v1';
const STORE_NAME = 'media';
const DB_VERSION = 1;

interface StoredMediaRecord extends Omit<CapturedPhotoInfo, 'url'> {
  blob: Blob;
}

function openMediaDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestampMillis', 'timestampMillis', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open media DB'));
  });
}

export async function loadAllMediaFromDb(): Promise<CapturedPhotoInfo[]> {
  try {
    const db = await openMediaDb();
    const records = await new Promise<StoredMediaRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as StoredMediaRecord[]) ?? []);
      req.onerror = () => reject(req.error ?? new Error('Failed to read media'));
    });
    db.close();

    return records
      .filter((r) => r && r.blob instanceof Blob && r.blob.size > 0)
      .sort((a, b) => b.timestampMillis - a.timestampMillis)
      .map((r) => ({
        ...r,
        isFavorite: Boolean(r.isFavorite),
        url: URL.createObjectURL(r.blob),
      }));
  } catch {
    return [];
  }
}

export async function saveMediaToDb(
  item: CapturedPhotoInfo
): Promise<{ ok: boolean; error?: string }> {
  if (!item.blob || item.blob.size <= 0) {
    return { ok: false, error: 'Captured media payload is empty' };
  }
  try {
    const db = await openMediaDb();
    const { url: _unusedUrl, ...rest } = item;
    const record: StoredMediaRecord = {
      ...rest,
      blob: item.blob,
      isFavorite: Boolean(item.isFavorite),
    };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Failed to save media'));
    });
    db.close();
    return { ok: true };
  } catch (err) {
    const message =
      err instanceof DOMException && err.name === 'QuotaExceededError'
        ? 'Browser storage quota exceeded — export or free space in Gallery'
        : err instanceof Error
          ? err.message
          : 'Unable to persist media to browser vault';
    return { ok: false, error: message };
  }
}

export async function updateMediaFavoriteInDb(id: string, isFavorite: boolean): Promise<void> {
  try {
    const db = await openMediaDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const rec = getReq.result as StoredMediaRecord | undefined;
        if (rec) {
          rec.isFavorite = isFavorite;
          store.put(rec);
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Failed to update favorite'));
    });
    db.close();
  } catch {
    // Ignore storage error
  }
}

export async function deleteMediaFromDb(id: string): Promise<void> {
  try {
    const db = await openMediaDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Failed to delete media'));
    });
    db.close();
  } catch {
    // Ignore storage error
  }
}

export function readImageFileMetadata(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const tempUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || 1920;
      const h = img.naturalHeight || 1080;
      URL.revokeObjectURL(tempUrl);
      resolve({ width: w, height: h });
    };
    img.onerror = () => {
      URL.revokeObjectURL(tempUrl);
      resolve({ width: 1920, height: 1080 });
    };
    img.src = tempUrl;
  });
}

export function readVideoFileMetadata(
  file: File
): Promise<{ width: number; height: number; durationMs: number }> {
  return new Promise((resolve) => {
    const tempUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const w = video.videoWidth || 1920;
      const h = video.videoHeight || 1080;
      const durationMs = Number.isFinite(video.duration) ? Math.round(video.duration * 1000) : 0;
      URL.revokeObjectURL(tempUrl);
      resolve({ width: w, height: h, durationMs });
    };
    video.onerror = () => {
      URL.revokeObjectURL(tempUrl);
      resolve({ width: 1920, height: 1080, durationMs: 0 });
    };
    video.src = tempUrl;
  });
}

export async function buildPickedMediaItems(files: FileList | File[]): Promise<CapturedPhotoInfo[]> {
  const list = Array.from(files);
  const items: CapturedPhotoInfo[] = [];

  for (const file of list) {
    if (file.size <= 0) continue;
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    if (!isVideo && !isImage) continue;

    const cleanName =
      file.name.replace(/[\u0000-\u001F\u007F/\\]/g, '').slice(0, 120) ||
      (isVideo ? 'Picked_Video.mp4' : 'Picked_Photo.jpg');

    const url = URL.createObjectURL(file);
    if (isVideo) {
      const meta = await readVideoFileMetadata(file);
      items.push({
        id: `PICK_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        url,
        blob: file,
        width: meta.width,
        height: meta.height,
        sizeBytes: file.size,
        displayName: cleanName,
        timestampMillis: file.lastModified || Date.now(),
        isVideo: true,
        durationMs: meta.durationMs,
        mimeType: file.type || 'video/mp4',
        videoFrameRate: null,
        isHdrVideo: false,
        isFavorite: false,
        captureMeta: {
          mode: 'Photo Picker Import',
          format: (file.type.split('/')[1] || 'VIDEO').toUpperCase(),
        },
      });
    } else {
      const dims = await readImageFileMetadata(file);
      items.push({
        id: `PICK_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        url,
        blob: file,
        width: dims.width,
        height: dims.height,
        sizeBytes: file.size,
        displayName: cleanName,
        timestampMillis: file.lastModified || Date.now(),
        isVideo: false,
        durationMs: 0,
        mimeType: file.type || 'image/jpeg',
        videoFrameRate: null,
        isHdrVideo: false,
        isFavorite: false,
        captureMeta: {
          mode: 'Photo Picker Import',
          format: (file.type.split('/')[1] || 'IMAGE').toUpperCase(),
        },
      });
    }
  }

  return items;
}
