// js/firebaseSync.js - Using explicit initialization (dependency injection)

let db, auth, doc, getDoc, setDoc;

// An initialization function to be called from index.html
export function initFirebaseSync(firebaseServices) {
    if (!firebaseServices || !firebaseServices.db || !firebaseServices.auth) {
        console.error("[firebaseSync] Initialization failed: Invalid services object provided.");
        return;
    }

    // ----- Auto-sync local changes to Firestore -----
    // Whenever the front-end dispatches 'statisticsUpdated', push latest typing_statistics.
    window.addEventListener('statisticsUpdated', () => {
        try {
            const statsStr = localStorage.getItem('typing_statistics') || '{}';
            saveDataToFirebase('typing_statistics', statsStr);
        } catch (err) {
            console.warn('[firebaseSync] Failed to push typing_statistics on statisticsUpdated:', err);
        }
    });
    console.log("[firebaseSync] Initializing with provided Firebase services.");
    db = firebaseServices.db;
    auth = firebaseServices.auth;
    doc = firebaseServices.doc;
    getDoc = firebaseServices.getDoc;
    setDoc = firebaseServices.setDoc;
}

async function loadDataFromFirebase() {
    if (!db || !auth) {
        console.error("[firebaseSync] Firebase services not initialized. Cannot load data.");
        return;
    }
    const user = auth.currentUser;
    if (!user) {
        return;
    }

    console.log(`[firebaseSync] Attempting to load data for user: ${user.uid} from Firestore.`);
    try {
        const userDocRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
            const rawData = docSnap.data();
            console.log("[firebaseSync] Raw data loaded from Firestore:", rawData);
            // Re-assemble any values saved in chunked format before updating localStorage
            const assembledData = assembleChunkedFields(rawData);
            console.log("[firebaseSync] Data after assembling chunks:", assembledData);

            // --- Validate typing_statistics JSON ---
            if (assembledData.typing_statistics) {
                let candidate = assembledData.typing_statistics;
                let ok = jsonIsValid(candidate);

                // If invalid, try salvage by truncating at last '}'
                if (!ok) {
                    const lastBrace = candidate.lastIndexOf('}');
                    if (lastBrace > 0) {
                        const truncated = candidate.slice(0, lastBrace + 1);
                        if (jsonIsValid(truncated)) {
                            candidate = truncated;
                            ok = true;
                            console.warn('[firebaseSync] Salvaged typing_statistics by truncating to last }');
                        }
                    }
                }
                // If still invalid, fallback to non-chunked field
                if (!ok && rawData.typing_statistics && jsonIsValid(rawData.typing_statistics)) {
                    candidate = rawData.typing_statistics;
                    ok = true;
                    console.warn('[firebaseSync] Used fallback non-chunked typing_statistics field');
                }
                // Reset to empty structure as last resort
                if (!ok) {
                    console.warn('[firebaseSync] typing_statistics irrecoverable; resetting');
                    candidate = JSON.stringify({
                        firstUseDate: new Date().toISOString(),
                        lastStudyDate: '',
                        consecutiveDays: 0,
                        dailyStats: {},
                        totalSentences: 0,
                        completedQuestions: [],
                        reviewHistory: {}
                    });
                }
                assembledData.typing_statistics = candidate;
            }

            updateLocalStorage(assembledData);
        } else {
            console.log("[firebaseSync] No data found for this user. Creating a new document.");
            const initialData = {
                typing_statistics: localStorage.getItem('typing_statistics') || '{}',
                custom_collections: '{}',
                isNewUser: true,
                lastUpdated: new Date().toISOString()
            };
            await setDoc(userDocRef, initialData);
            console.log("[firebaseSync] New user document created in Firestore.");
            updateLocalStorage(initialData);
        }
    } catch (error) {
        console.error("[firebaseSync] Error loading data from Firestore:", error);
    }
}

// --- helper for chunked save/load ----------------------------------
const CHUNK_SIZE = 300000; // chars, well under 1 MiB per doc
function chunkString(str, size) {
    const arr = [];
    for (let i = 0; i < str.length; i += size) arr.push(str.slice(i, i + size));
    return arr;
}
function concatChunks(arr) { return arr.join(''); }

// Convert raw Firestore data object where some fields might be stored as
// `${key}_chunk0`, `${key}_chunk1`, ... back into a plain object with the
// original keys. If both the original key **and** chunked keys exist, the
// chunked representation wins (it is assumed to be newer / larger).
function assembleChunkedFields(raw) {
    const chunksByBase = {};
    const result = {};

    for (const k in raw) {
        const m = k.match(/^(.*)_chunk(\d+)$/);
        if (m) {
            const base = m[1];
            const idx = parseInt(m[2], 10);
            if (!chunksByBase[base]) chunksByBase[base] = [];
            chunksByBase[base][idx] = raw[k];
        } else {
            // Tentatively copy non-chunked value; may be overwritten later if a
            // chunked version also exists.
            result[k] = raw[k];
        }
    }

    // Assemble chunk arrays and override corresponding plain keys if needed.
    for (const base in chunksByBase) {
        const arr = chunksByBase[base];
        // Only concatenate contiguous chunks starting from index 0 to avoid leftovers from old writes.
        let contiguous = [];
        for (let i = 0; i < arr.length; i++) {
            if (typeof arr[i] === 'undefined') break;
            contiguous.push(arr[i]);
        }
        result[base] = concatChunks(contiguous);
    }

    return result;
}

function jsonIsValid(str) {
    try { JSON.parse(str); return true; } catch (_) { return false; }
}

async function saveDataToFirebase(key, value) {
    if (!db || !auth) {
        console.error("[firebaseSync] Firebase services not initialized. Cannot save data.");
        return;
    }
    const user = auth.currentUser;
    if (!user) return;

    console.log(`[firebaseSync] Attempting to save data for user: ${user.uid} to Firestore`, { key });
    try {
        const userDocRef = doc(db, 'users', user.uid);

        // Build the object to write, handling chunking for large payloads.
        let writeObj = {};
        if (typeof value !== 'string') value = JSON.stringify(value);

        if (value.length > CHUNK_SIZE) {
            const chunks = chunkString(value, CHUNK_SIZE);
            chunks.forEach((chunk, idx) => {
                writeObj[`${key}_chunk${idx}`] = chunk;
            });
            // Optionally we could clean up the un-chunked field by overwriting
            // it with FieldValue.delete(), but to keep dependencies minimal we
            // simply ignore it – the loader prefers chunked fields anyway.
        } else {
            writeObj[key] = value;
        }

        await setDoc(userDocRef, writeObj, { merge: true });
        console.log(`[firebaseSync] Successfully saved key '${key}' to Firestore.`);
    } catch (error) {
        console.error(`[firebaseSync] Error saving key '${key}' to Firestore:`, error);
    }
}

function updateLocalStorage(cloudData) {
    if (!cloudData) return;
    let updated = false;
    for (const key in cloudData) {
        const remoteVal = cloudData[key];
        const remoteStr = typeof remoteVal === 'string' ? remoteVal : JSON.stringify(remoteVal);
        if (localStorage.getItem(key) !== remoteStr) {
            localStorage.setItem(key, remoteStr);
            updated = true;
        }
    }
    if (updated) {
        console.log("[firebaseSync] Local storage updated, dispatching event.");
        window.dispatchEvent(new CustomEvent('statisticsUpdated'));
    }
}

// Expose functions to global scope
window.loadDataFromFirebase = loadDataFromFirebase;
window.saveDataToFirebase = saveDataToFirebase;
// Provide a compatibility wrapper so other code can call window.firebaseSync.saveData(...)
window.firebaseSync = {
    saveData: saveDataToFirebase,
    loadData: loadDataFromFirebase
};
