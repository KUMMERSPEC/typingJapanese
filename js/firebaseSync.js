// js/firebaseSync.js - Using explicit initialization (dependency injection)

let db, auth, doc, getDoc, setDoc;

// Helper: validate JSON quickly
function jsonIsValid(str) {
  if (typeof str !== 'string') return false;
  try { JSON.parse(str); return true; } catch (_) { return false; }
}

// Helper: attempt to salvage a JSON string by trimming trailing rubbish
function salvageJson(str, maxTrim = 2000) {
  if (!str || typeof str !== 'string') return null;
  for (let cut = 0; cut < Math.min(maxTrim, str.length); cut++) {
    const sub = str.slice(0, str.length - cut);
    if (sub.trim().endsWith('}')) {
      if (jsonIsValid(sub)) return sub;
    }
  }
  return null;
}

// An initialization function to be called from index.html
export function initFirebaseSync(firebaseServices) {
    if (!firebaseServices || !firebaseServices.db || !firebaseServices.auth) {
        console.error("[firebaseSync] Initialization failed: Invalid services object provided.");
        return;
    }

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
    if (!db || !auth) { console.error('[firebaseSync] Firebase not ready'); return; }
    const user = auth.currentUser; if (!user) return;

    console.log(`[firebaseSync] Attempting to load data for user: ${user.uid} from Firestore.`);
    try {
        const ref = doc(db, 'users', user.uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) return;
        const raw = snap.data();
        console.log('[firebaseSync] Raw data loaded from Firestore:', raw);

        const assembled = assembleChunkedFields(raw);
        console.log('[firebaseSync] Data after assembling chunks:', assembled);

        // --- fix typing_statistics ---
        if (assembled.typing_statistics) {
            let ts = assembled.typing_statistics;
            if (!jsonIsValid(ts)) {
                const salv = salvageJson(ts);
                if (salv) {
                    console.warn('[firebaseSync] Salvaged typing_statistics via trim');
                    ts = salv;
                } else if (raw.typing_statistics && jsonIsValid(raw.typing_statistics)) {
                    console.warn('[firebaseSync] Falling back to non-chunked typing_statistics');
                    ts = raw.typing_statistics;
                } else {
                    console.warn('[firebaseSync] typing_statistics irrecoverable; resetting');
                    ts = JSON.stringify({ firstUseDate:new Date().toISOString(), lastStudyDate:'', consecutiveDays:0, dailyStats:{}, totalSentences:0, completedQuestions:[], reviewHistory:{} });
                }
                assembled.typing_statistics = ts;
            }
        }

        updateLocalStorage(assembled);
    } catch (err) { console.error('[firebaseSync] Error load', err); }
}

// ---------- chunk helpers ----------
const CHUNK_SIZE = 300000;
function chunkString(s,size){const arr=[];for(let i=0;i<s.length;i+=size)arr.push(s.slice(i,i+size));return arr;}
function concatChunks(a){return a.join('');}
function assembleChunkedFields(raw){
  const byBase={},res={};
  for(const k in raw){const m=k.match(/^(.*)_chunk(\d+)$/);if(m){const b=m[1],idx=+m[2];(byBase[b]||(byBase[b]=[]))[idx]=raw[k];}else res[k]=raw[k];}
  for(const b in byBase){const arr=byBase[b];let parts=[];for(let i=0;i<arr.length;i++){if(arr[i]==null) break; parts.push(arr[i]);}res[b]=concatChunks(parts);}return res;
}

async function saveDataToFirebase(key,val){if(!db||!auth)return;const user=auth.currentUser;if(!user)return;try{const ref=doc(db,'users',user.uid);let obj={};if(typeof val!=='string')val=JSON.stringify(val);if(val.length>CHUNK_SIZE){chunkString(val,CHUNK_SIZE).forEach((c,i)=>obj[`${key}_chunk${i}`]=c);}else obj[key]=val;await setDoc(ref,obj,{merge:true});console.log(`[firebaseSync] Saved ${key}`);}catch(e){console.error('[firebaseSync] save error',e);}}

function updateLocalStorage(cloud){let changed=false;for(const k in cloud){const v=typeof cloud[k]==='string'?cloud[k]:JSON.stringify(cloud[k]);if(localStorage.getItem(k)!==v){localStorage.setItem(k,v);changed=true;}}if(changed)window.dispatchEvent(new CustomEvent('statisticsUpdated'));}

window.loadDataFromFirebase=loadDataFromFirebase;window.saveDataToFirebase=saveDataToFirebase;window.firebaseSync={saveData:saveDataToFirebase,loadData:loadDataFromFirebase};
