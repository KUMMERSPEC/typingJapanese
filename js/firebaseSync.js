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

  // 只有在用户登录后，才允许响应本地数据变动并推送到云端
  auth.onAuthStateChanged(user => {
    if (user) {
      cloudLoaded = true;
      console.log('[firebaseSync] User is authenticated. Sync to cloud is now active.');
    } else {
      cloudLoaded = false;
      console.log('[firebaseSync] User is not authenticated. Sync to cloud is disabled.');
    }
  });

  // push on local change（需等云端数据加载完毕）
  window.addEventListener('statisticsUpdated', () => {
    if (!cloudLoaded || pushingInProgress) return;
    try {
      pushingInProgress = true;
      console.log('[firebaseSync] statisticsUpdated detected, pushing to cloud...');
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
    const user = auth.currentUser;
    if (!user) return;

    console.log(`[firebaseSync] Attempting to load data for user: ${user.uid}`);
    try {
        const userDocRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userDocRef);
        if (!snap.exists()) {
            console.log('[firebaseSync] No user document found. Initializing with empty stats.');
            mergeWithLocal(EMPTY_STATS());
            updateLocalStorage({ typing_statistics: EMPTY_STATS() });
            return;
        }

        const raw = snap.data();
        let finalStatsJson = null;

        // 1. 优先从子集合加载 (新方法)
        const chunksColRef = collection(userDocRef, 'statistics_chunks');
        const chunksSnap = await getDocs(query(chunksColRef));

        if (!chunksSnap.empty) {
            console.log('[firebaseSync] Found chunks in subcollection. Assembling...');
            const chunks = chunksSnap.docs
                .map(d => ({ id: d.id, content: d.data().content }))
                .sort((a, b) => parseInt(a.id.split('_')[1]) - parseInt(b.id.split('_')[1]));
            finalStatsJson = chunks.map(c => c.content).join('');
        } else {
            // 2. 回退到旧的分块字段
            const legacyChunks = [];
            for (let i = 0; i < 10; i++) {
                if (raw[`typing_statistics_chunk${i}`]) {
                    legacyChunks.push(raw[`typing_statistics_chunk${i}`]);
                } else {
                    break;
                }
            }
            if (legacyChunks.length > 0) {
                console.log('[firebaseSync] No subcollection found. Assembling from legacy chunk fields.');
                finalStatsJson = legacyChunks.join('');
            } else if (raw.typing_statistics) {
                // 3. 回退到单一字段
                console.log('[firebaseSync] No chunks found. Using single typing_statistics field.');
                finalStatsJson = raw.typing_statistics;
            }
        }

        // 4. 验证、修复并更新本地存储
        if (finalStatsJson) {
            const repairedJson = repairUtf8(finalStatsJson);
            if (jsonIsValid(repairedJson)) {
                finalStatsJson = repairedJson;
            } else {
                console.warn('[firebaseSync] Assembled statistics are invalid JSON. Attempting to salvage...');
                const salvaged = salvageJson(repairedJson);
                if (salvaged) {
                    console.log('[firebaseSync] Successfully salvaged typing_statistics.');
                    finalStatsJson = salvaged;
                } else {
                    console.error('[firebaseSync] All recovery methods failed. Resetting statistics to prevent data loss.');
                    finalStatsJson = EMPTY_STATS();
                }
            }
        } else {
            console.log('[firebaseSync] No statistics data found in cloud. Initializing with empty stats.');
            finalStatsJson = EMPTY_STATS();
        }

        // 5. 将最终的、干净的数据写入本地
        mergeWithLocal(finalStatsJson);
        // `updateLocalStorage` 会触发 UI 更新
        updateLocalStorage({ typing_statistics: finalStatsJson });

    } catch (e) {
        console.error('[firebaseSync] A critical error occurred during data load:', e);
        // 在发生严重错误时，也使用空数据以避免应用崩溃
        mergeWithLocal(EMPTY_STATS());
        updateLocalStorage({ typing_statistics: EMPTY_STATS() });
    }
}

// 用从云端加载的权威数据直接覆盖本地缓存
function mergeWithLocal(cloudJsonStr) {
  try {
    if (!jsonIsValid(cloudJsonStr)) {
        console.warn('[firebaseSync] Cloud data is invalid, skipping update.');
        return;
    }
    // 云端是权威数据源。在加载时，直接用云端数据覆盖本地缓存。
    localStorage.setItem('typing_statistics', cloudJsonStr);
    console.log('[firebaseSync] Local storage has been updated with authoritative data from the cloud.');
  } catch (err) {
    console.warn('[firebaseSync] An error occurred while updating local storage with cloud data:', err);
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
    if (localStorage.getItem(k) !== vStr) { 
      localStorage.setItem(k, vStr); 
      changed = true; 
    }
  }
  if (changed) {
    console.log('[firebaseSync] Local data changed. Dispatching statisticsUpdated event shortly...');
    // Defer the event to prevent race conditions with UI script loading.
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('statisticsUpdated'));
      console.log('[firebaseSync] statisticsUpdated event dispatched.');
    }, 0);
  }
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
