// js/firebaseSync.js - Using explicit initialization (dependency injection)

let db, auth, doc, getDoc, setDoc, deleteField; // <-- include deleteField

/************************* Runtime flags *************************/
let cloudLoaded = false;      // 是否已完成一次从云端拉取
let pushingInProgress = false; // 防止回环写入

/************************* Utility helpers *************************/
function jsonIsValid(str) {
  if (typeof str !== 'string') return false;
  try { JSON.parse(str); return true; } catch (_) { return false; }
}

// safe parse that returns null upon failure
function safeParse(str) {
  if (typeof str !== 'string') return null;
  try { return JSON.parse(str); } catch { return null; }
}

function salvageJson(str) {
  if (!str || typeof str !== 'string') return null;
  const start = str.indexOf('{');
  const end = str.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  const candidate = str.slice(start, end + 1);
  return jsonIsValid(candidate) ? candidate : null;
}

const CHUNK_SIZE = 300000; // chars < 1MiB
const EMPTY_STATS = () => JSON.stringify({
  firstUseDate: new Date().toISOString(),
  lastStudyDate: '',
  consecutiveDays: 0,
  dailyStats: {},
  totalSentences: 0,
  completedQuestions: [],
  reviewHistory: {}
});

/*******************************************************************
 * Incremental extractor for partially corrupted typing_statistics
 *******************************************************************/
function extractEntries(joined, targetObj = {}) {
  if (!joined || typeof joined !== 'string') return targetObj;

  const keyRegex = /"([A-Za-z0-9+/=]{10,})":\{/g;
  let m;
  while ((m = keyRegex.exec(joined))) {
    const key = m[1];
    if (targetObj[key]) continue;

    // Starting index of the opening brace for this entry
    let startIdx = keyRegex.lastIndex - 1; // points to the '{'
    let depth = 0;
    let endIdx = -1;
    for (let i = startIdx; i < joined.length; i++) {
      const ch = joined[i];
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) { endIdx = i; break; }
      }
    }
    if (endIdx === -1) break; // unmatched braces, abort loop

    const entryJson = joined.slice(startIdx, endIdx + 1);
    try {
      targetObj[key] = JSON.parse(entryJson);
    } catch {
      // ignore invalid json fragment
    }
    // Move regex cursor past this segment to avoid back-tracking cost
    keyRegex.lastIndex = endIdx + 1;
  }
  return targetObj;
}
/*******************************************************************/
// Public init
export function initFirebaseSync(services) {
  if (!services?.db || !services?.auth) {
    console.error('[firebaseSync] Invalid firebaseServices');
    return;
  }
  db = services.db;
  auth = services.auth;
  ({ doc, getDoc, setDoc, deleteField } = services); // accept deleteField

  // 拉取远程 → 覆盖本地 → 再监听变动
  auth.onAuthStateChanged(async user => {
    if (user) {
      await loadDataFromFirebase();
      cloudLoaded = true;
      // 首次拉取后立即 push 合并后的最终本地数据，确保云端最新
      saveDataToFirebase('typing_statistics', localStorage.getItem('typing_statistics'));
    }
  });

  // push on local change（需等云端数据加载完毕）
  window.addEventListener('statisticsUpdated', () => {
    if (!cloudLoaded || pushingInProgress) return;
    try {
      pushingInProgress = true;
      saveDataToFirebase('typing_statistics', localStorage.getItem('typing_statistics') || '{}');
    } catch (e) { console.warn('[firebaseSync] push fail', e); }
    finally { pushingInProgress = false; }
  });

  console.log('[firebaseSync] Initialized');

  // expose helper APIs
  window.exportStatisticsChunks = exportChunks;
  window.importFixedStatistics = importFixedStatistics;
}

/******************** Core load / save ******************************/
async function loadDataFromFirebase() {
  if (!db || !auth) return;
  const user = auth.currentUser; if (!user) return;

  console.log(`[firebaseSync] Attempting to load data for user: ${user.uid}`);
  try {
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (!snap.exists()) return;
    const raw = snap.data();
    console.log('[firebaseSync] Raw data:', raw);

    // Cleanup legacy field if chunks exist
    await cleanupLegacyField(raw, 'typing_statistics');

    // 1. store raw chunk fields to localStorage for inspection
    Object.entries(raw).forEach(([k, v]) => {
      if (/^typing_statistics_chunk\d+$/.test(k)) {
        localStorage.setItem(k, v);
      }
    });

    // 2. assemble
    const assembled = assembleChunkedFields(raw);
    console.log('[firebaseSync] Assembled:', assembled);

    // 3. validate / salvage typing_statistics
    if (assembled.typing_statistics) {
      let ts = assembled.typing_statistics;
      if (!jsonIsValid(ts)) {
        const salvaged = salvageJson(ts);
        if (salvaged) {
          console.warn('[firebaseSync] Salvaged typing_statistics via trim');
          ts = salvaged;
        } else if (raw.typing_statistics && jsonIsValid(raw.typing_statistics)) {
          console.warn('[firebaseSync] Falling back to non-chunked typing_statistics');
          ts = raw.typing_statistics;
        } else {
          console.warn('[firebaseSync] typing_statistics irrecoverable; resetting');
          ts = EMPTY_STATS();
        }
        assembled.typing_statistics = ts;
      }
    } else {
      assembled.typing_statistics = EMPTY_STATS();
    }

        // ---- 增量提取修补逻辑 ----
    const baseObj = safeParse(raw.typing_statistics) || safeParse(EMPTY_STATS());
    if (baseObj && typeof baseObj === 'object') {
      baseObj.reviewHistory ||= {};
      const before = Object.keys(baseObj.reviewHistory).length;
      extractEntries(assembled.typing_statistics, baseObj.reviewHistory);
      const after = Object.keys(baseObj.reviewHistory).length;
      if (after > before) {
        baseObj.totalSentences = after;
        assembled.typing_statistics = JSON.stringify(baseObj);
      }
    }

    mergeWithLocal(assembled.typing_statistics);

    updateLocalStorage(assembled);
  } catch (e) {
    console.error('[firebaseSync] load error', e);
  }
}

// 合并云端 reviewHistory（优先云端记录）
function mergeWithLocal(cloudJsonStr) {
  try {
    if (!jsonIsValid(cloudJsonStr)) return;
    const cloudStats = JSON.parse(cloudJsonStr);
    const localRaw = localStorage.getItem('typing_statistics');
    if (localRaw && jsonIsValid(localRaw)) {
      const localStats = JSON.parse(localRaw);
      const merged = { ...localStats, ...cloudStats };
      merged.reviewHistory = { ...localStats.reviewHistory, ...cloudStats.reviewHistory };
      // 更新其它可累加字段
      merged.totalSentences = Object.keys(merged.reviewHistory || {}).length;
      localStorage.setItem('typing_statistics', JSON.stringify(merged));
    } else {
      localStorage.setItem('typing_statistics', cloudJsonStr);
    }
  } catch (err) {
    console.warn('[firebaseSync] merge error', err);
  }
}

async function saveDataToFirebase(key, value) {
  if (!db || !auth) return;
  const user = auth.currentUser; if (!user) return;
  try {
    const ref = doc(db, 'users', user.uid);
    let writeObj = {};
    if (typeof value !== 'string') value = JSON.stringify(value);

    // helper to mark chunk keys for deletion when switching to unchunked
    const markChunkDeletions = () => {
      if (!deleteField) return;
      for (let i = 0; i < 10; i++) {
        writeObj[`${key}_chunk${i}`] = deleteField();
      }
    };

    if (value.length > CHUNK_SIZE) {
      // switching to chunked: ensure non-chunked key removed
      if (deleteField) writeObj[key] = deleteField();
      chunkStringSafely(value, CHUNK_SIZE).forEach((c, i) => writeObj[`${key}_chunk${i}`] = c);
    } else {
      // unchunked; ensure old chunks removed
      writeObj[key] = value;
      markChunkDeletions();
    }
    await setDoc(ref, writeObj, { merge: true });
    console.log(`[firebaseSync] Saved ${key}`);
  } catch (e) {
    console.error('[firebaseSync] save error', e);
  }
}

/************************* Helpers *********************************/
async function cleanupLegacyField(raw, key) {
  if (!db || !auth || !deleteField) return;
  const user = auth.currentUser; if (!user) return;

  // If chunks exist, the legacy field is obsolete.
  if (raw[`${key}_chunk0`]) {
    try {
      const ref = doc(db, 'users', user.uid);
      await setDoc(ref, { [key]: deleteField() }, { merge: true });
      console.log(`[firebaseSync] Cleaned up legacy field: ${key}`);
    } catch (e) {
      console.error(`[firebaseSync] Error cleaning up legacy field ${key}:`, e);
    }
  }
}

/************************* Helpers *********************************/
function chunkStringSafely(str, chunkSize) {
  if (chunkSize <= 0) throw new Error('Chunk size must be positive.');
  const chunks = [];
  let i = 0;
  while (i < str.length) {
    let chunkEnd = i + chunkSize;
    if (chunkEnd >= str.length) {
      chunks.push(str.slice(i));
      break;
    }

    // Backtrack to the start of the last character to avoid splitting it
    let lastCharIndex = chunkEnd;
    // Check if we are in the middle of a surrogate pair (for characters outside BMP)
    const highSurrogate = str.charCodeAt(lastCharIndex - 1);
    if (highSurrogate >= 0xD800 && highSurrogate <= 0xDBFF) {
      // we might have cut a surrogate pair, go back one more char
      lastCharIndex--;
    }

    chunks.push(str.slice(i, lastCharIndex));
    i = lastCharIndex;
  }
  return chunks;
}
function concatChunks(arr) { return arr.join(''); }
function assembleChunkedFields(raw) {
  const byBase = {}, res = {};
  const chunkedBases = new Set();

  // First, find all fields that are chunked and group them.
  for (const k in raw) {
    const m = k.match(/^(.*)_chunk(\d+)$/);
    if (m) {
      const base = m[1], idx = +m[2];
      chunkedBases.add(base);
      (byBase[base] ||= [])[idx] = raw[k];
    }
  }

  // Copy non-chunk fields, EXCLUDING legacy fields that have been chunked.
  for (const k in raw) {
    if (!/^(.*)_chunk(\d+)$/.test(k) && !chunkedBases.has(k)) {
      res[k] = raw[k];
    }
  }

  // Finally, assemble the chunks in the correct order.
  for (const b in byBase) {
    const parts = byBase[b];
    // Filter out empty/null slots and join.
    // This handles sparse arrays correctly if chunks are missing.
    res[b] = parts.filter(p => p != null).join('');
  }
  return res;
}

function updateLocalStorage(data) {
  let changed = false;
  for (const k in data) {
    const vStr = typeof data[k] === 'string' ? data[k] : JSON.stringify(data[k]);
    if (localStorage.getItem(k) !== vStr) { localStorage.setItem(k, vStr); changed = true; }
  }
  if (changed) window.dispatchEvent(new CustomEvent('statisticsUpdated'));
}

/********************** Debug utilities ****************************/
function exportChunks() {
  const out = {};
  ['typing_statistics_chunk0', 'typing_statistics_chunk1', 'typing_statistics_chunk2'].forEach(k => {
    out[k] = localStorage.getItem(k) || null;
  });
  console.log('[firebaseSync] exportChunks:', out);
  return out;
}

function importFixedStatistics(jsonStr) {
  if (!jsonIsValid(jsonStr)) { console.error('[firebaseSync] import: invalid JSON'); return; }
  localStorage.setItem('typing_statistics', jsonStr);
  window.dispatchEvent(new CustomEvent('statisticsUpdated'));
  // also push to cloud
  saveDataToFirebase('typing_statistics', jsonStr);
  console.log('[firebaseSync] importFixedStatistics: saved');
}

/********************** Expose globals *****************************/
window.loadDataFromFirebase = loadDataFromFirebase;
window.saveDataToFirebase = saveDataToFirebase;
window.firebaseSync = { loadData: loadDataFromFirebase, saveData: saveDataToFirebase };
