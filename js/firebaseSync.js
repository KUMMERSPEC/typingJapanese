// js/firebaseSync.js - Using explicit initialization (dependency injection)

let db, auth, doc, getDoc, setDoc, deleteField, collection, writeBatch, getDocs, query, where, deleteDoc; // Firestore SDK functions

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

    // First, try to repair any UTF-8 corruption.
    str = repairUtf8(str);

    let bestCandidate = null;
    let bestLength = 0;

    // Find the largest, valid, brace-balanced JSON object in the string.
    for (let start = 0; (start = str.indexOf('{', start)) !== -1; start++) {
        let depth = 0;
        for (let i = start; i < str.length; i++) {
            if (str[i] === '{') {
                depth++;
            } else if (str[i] === '}') {
                depth--;
                if (depth === 0) {
                    const candidate = str.substring(start, i + 1);
                    if (jsonIsValid(candidate)) {
                        if (candidate.length > bestLength) {
                            bestCandidate = candidate;
                            bestLength = candidate.length;
                        }
                    }
                    break; // Found a balanced object, continue search from the start.
                }
            }
        }
    }

    // If a valid, balanced JSON object was found, return it.
    if (bestCandidate) {
        return bestCandidate;
    }

    // As a last resort, fall back to the original simple trim strategy.
    const start = str.indexOf('{');
    const end = str.lastIndexOf('}');
    if (start !== -1 && end > start) {
        const candidate = str.slice(start, end + 1);
        if (jsonIsValid(candidate)) {
            return candidate;
        }
    }

    return null; // Return null if no valid JSON could be salvaged.
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

function repairUtf8(str) {
  try {
    // The TextDecoder will throw an error if the input is not valid UTF-8.
    // We encode the string into a Uint8Array first to simulate reading raw bytes.
    const encoder = new TextEncoder();
    const decoder = new TextDecoder('utf-8', { fatal: true });
    decoder.decode(encoder.encode(str));
    return str; // String is valid, return as is.
  } catch (e) {
    // If decoding fails, it means there are invalid sequences.
    // We can use a non-fatal decoder to replace them with the replacement character (�).
    console.warn('[firebaseSync] Detected and repairing invalid UTF-8 sequence.');
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const encoder = new TextEncoder();
    return decoder.decode(encoder.encode(str));
  }
}

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
  ({ doc, getDoc, setDoc, deleteField, collection, writeBatch, getDocs, query, where, deleteDoc } = services); // Destructure all required Firestore functions

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
        const userDocRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userDocRef);
        if (!snap.exists()) return;

        const raw = snap.data();
        let assembled = { ...raw }; // Start with raw data

        // 1. Attempt to load from subcollection first (new method)
        const chunksColRef = collection(userDocRef, 'statistics_chunks');
        const chunksSnap = await getDocs(query(chunksColRef));

        if (!chunksSnap.empty) {
            console.log('[firebaseSync] Found chunks in subcollection. Assembling...');
            const chunks = chunksSnap.docs
                .map(doc => ({ id: doc.id, data: doc.data() }))
                .sort((a, b) => parseInt(a.id.split('_')[1]) - parseInt(b.id.split('_')[1]));
            
            const fullContent = chunks.map(c => c.data.content).join('');
            assembled.typing_statistics = fullContent;
            // Since we successfully loaded from subcollection, delete legacy fields from the assembled object
            delete assembled.typing_statistics_chunk0;
            delete assembled.typing_statistics_chunk1;
            delete assembled.typing_statistics_chunk2; // etc.

        } else {
            console.log('[firebaseSync] No subcollection found. Falling back to legacy chunk fields.');
            // 2. Fallback to legacy chunk fields
            const legacyChunks = [];
            for (let i = 0; i < 10; i++) {
                if (raw[`typing_statistics_chunk${i}`]) {
                    legacyChunks[i] = raw[`typing_statistics_chunk${i}`];
                } else {
                    break; // Stop if a chunk is missing
                }
            }
            if (legacyChunks.length > 0) {
                assembled.typing_statistics = legacyChunks.join('');
            }
        }

        // 3. Validate and salvage the final assembled statistics
        if (assembled.typing_statistics) {
            let ts = assembled.typing_statistics;
            ts = repairUtf8(ts); // Always repair before validation

            if (!jsonIsValid(ts)) {
                console.warn('[firebaseSync] Assembled statistics are invalid JSON. Attempting to salvage...');
                const salvaged = salvageJson(ts);
                if (salvaged) {
                    console.warn('[firebaseSync] Successfully salvaged typing_statistics.');
                    ts = salvaged;
                } else if (raw.typing_statistics && jsonIsValid(raw.typing_statistics)) {
                    console.warn('[firebaseSync] Salvage failed. Falling back to non-chunked typing_statistics field.');
                    ts = raw.typing_statistics;
                } else {
                    console.warn('[firebaseSync] All recovery methods failed. Resetting statistics.');
                    ts = EMPTY_STATS();
                }
            }
            assembled.typing_statistics = ts;
        } else {
            // No statistics found at all, create new empty stats
            assembled.typing_statistics = EMPTY_STATS();
        }

        // 4. Merge with local data and update UI
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
    if (!db || !auth || key !== 'typing_statistics') return;
    const user = auth.currentUser;
    if (!user) return;

    try {
        if (typeof value !== 'string') value = JSON.stringify(value);

        const userDocRef = doc(db, 'users', user.uid);
        const chunksColRef = collection(userDocRef, 'statistics_chunks');
        const batch = writeBatch(db);

        // Clean up old chunk fields on the main document for migration
        for (let i = 0; i < 10; i++) {
            batch.update(userDocRef, { [`${key}_chunk${i}`]: deleteField() });
        }

        if (value.length > CHUNK_SIZE) {
            // Data is large, use subcollection
            console.log('[firebaseSync] Data is large, saving to subcollection.');

            // 1. Delete the single field if it exists
            batch.update(userDocRef, { [key]: deleteField() });

            // 2. Clear the subcollection before writing new chunks
            const existingChunks = await getDocs(query(chunksColRef));
            existingChunks.forEach(doc => batch.delete(doc.ref));

            // 3. Add new chunks to the subcollection
            const chunks = chunkStringSafely(value, CHUNK_SIZE);
            chunks.forEach((chunk, index) => {
                const chunkDocRef = doc(chunksColRef, `chunk_${index}`);
                batch.set(chunkDocRef, { content: chunk });
            });

        } else {
            // Data is small, use a single field
            console.log('[firebaseSync] Data is small, saving to a single field.');

            // 1. Save data to the single field
            batch.set(userDocRef, { [key]: value }, { merge: true });

            // 2. Clear the subcollection as it's no longer needed
            const existingChunks = await getDocs(query(chunksColRef));
            if (!existingChunks.empty) {
                console.log('[firebaseSync] Clearing obsolete subcollection chunks.');
                existingChunks.forEach(doc => batch.delete(doc.ref));
            }
        }

        await batch.commit();
        console.log(`[firebaseSync] Successfully saved ${key}.`);

    } catch (e) {
        console.error('[firebaseSync] save error', e);
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
