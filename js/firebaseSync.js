// js/firebaseSync.js - Using explicit initialization (dependency injection)

let db, auth, doc, getDoc, setDoc;

/************************* Utility helpers *************************/
function jsonIsValid(str) {
  if (typeof str !== 'string') return false;
  try { JSON.parse(str); return true; } catch (_) { return false; }
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

/*******************************************************************/
// Public init
export function initFirebaseSync(services) {
  if (!services?.db || !services?.auth) {
    console.error('[firebaseSync] Invalid firebaseServices');
    return;
  }
  db = services.db;
  auth = services.auth;
  ({ doc, getDoc, setDoc } = services);

  // push on change
  window.addEventListener('statisticsUpdated', () => {
    try {
      saveDataToFirebase('typing_statistics', localStorage.getItem('typing_statistics') || '{}');
    } catch (e) { console.warn('[firebaseSync] push fail', e); }
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

    updateLocalStorage(assembled);
  } catch (e) {
    console.error('[firebaseSync] load error', e);
  }
}

async function saveDataToFirebase(key, value) {
  if (!db || !auth) return;
  const user = auth.currentUser; if (!user) return;
  try {
    const ref = doc(db, 'users', user.uid);
    let writeObj = {};
    if (typeof value !== 'string') value = JSON.stringify(value);
    if (value.length > CHUNK_SIZE) {
      chunkString(value, CHUNK_SIZE).forEach((c, i) => writeObj[`${key}_chunk${i}`] = c);
    } else {
      writeObj[key] = value;
    }
    await setDoc(ref, writeObj, { merge: true });
    console.log(`[firebaseSync] Saved ${key}`);
  } catch (e) {
    console.error('[firebaseSync] save error', e);
  }
}

/************************* Helpers *********************************/
function chunkString(s, size) {
  const arr = []; for (let i = 0; i < s.length; i += size) arr.push(s.slice(i, i + size)); return arr;
}
function concatChunks(arr) { return arr.join(''); }
function assembleChunkedFields(raw) {
  const byBase = {}, res = {};
  for (const k in raw) {
    const m = k.match(/^(.*)_chunk(\d+)$/);
    if (m) {
      const base = m[1], idx = +m[2];
      (byBase[base] ||= [])[idx] = raw[k];
    } else {
      res[k] = raw[k];
    }
  }
  for (const b in byBase) {
    const parts = [];
    for (let i = 0; i < byBase[b].length; i++) {
      if (byBase[b][i] == null) break;
      parts.push(byBase[b][i]);
    }
    res[b] = concatChunks(parts);
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
