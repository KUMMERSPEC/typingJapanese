// syncSheetsToCourses.js
// Admin-only helper: fetch Google Sheets (CSV) and publish to Firestore
// Usage: import { syncGoogleSheetToFirestore } and call with csvUrl, db

import { writeBatch, doc, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

/**
 * Very small CSV → rows parser (handles quoted fields)
 */
function csvToRows(csvText) {
  const rows = [];
  let cur = '', inQuotes = false;
  const push = (row) => rows.push(row.map((s) => s.trim()));
  let row = [];
  for (let i = 0; i < csvText.length; i++) {
    const c = csvText[i];
    if (c === '"') {
      if (inQuotes && csvText[i + 1] === '"') { // escaped quote
        cur += '"'; i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push(cur); cur = '';
    } else if ((c === '\n' || c === '\r') && !inQuotes) {
      if (c === '\r' && csvText[i + 1] === '\n') i++; // CRLF
      row.push(cur); cur = '';
      push(row); row = [];
    } else {
      cur += c;
    }
  }
  if (cur.length || row.length) { row.push(cur); push(row); }
  return rows;
}

export async function syncGoogleSheetToFirestore(csvUrl, db, progressCb = () => {}) {
  const res = await fetch(csvUrl);
  if (!res.ok) throw new Error('fetch csv failed');
  const csv = await res.text();
  const rows = csvToRows(csv).filter(r => r.length && r.some(v => v));
  if (rows.length < 2) throw new Error('no data');

  // assume header row
  const header = rows[0].map(h => h.toLowerCase());
  const idx = (name) => header.indexOf(name);

  const map = {};
  for (const r of rows.slice(1)) {
    const courseId = r[idx('courseid')] || 'default_course';
    const courseName = r[idx('coursename')] || courseId;
    const lessonId = r[idx('lessonid')] || 'lesson_'+courseId;
    const lessonName = r[idx('lessonname')] || lessonId;
    const sentenceId = r[idx('sentenceid')] || crypto.randomUUID();
    const sentence = {
      japanese: r[idx('japanese')] || r[idx('sentence')] || '',
      hiragana: r[idx('hiragana')] || '',
      meaning: r[idx('meaning')] || ''
    };
    if (!map[courseId]) map[courseId] = { meta: { name: courseName }, lessons: {} };
    const course = map[courseId];
    if (!course.lessons[lessonId]) course.lessons[lessonId] = { meta: { name: lessonName }, sentences: {} };
    course.lessons[lessonId].sentences[sentenceId] = sentence;
  }

  // write
  const batch = writeBatch(db);
  let writes = 0;
  for (const [cid, c] of Object.entries(map)) {
    batch.set(doc(db, 'official_courses', cid), c.meta, { merge: true }); writes++;
    for (const [lid, l] of Object.entries(c.lessons)) {
      const lessonRef = doc(db, 'official_courses', cid, 'lessons', lid);
      batch.set(lessonRef, l.meta, { merge: true }); writes++;
      for (const [sid, s] of Object.entries(l.sentences)) {
        const sentRef = doc(lessonRef, 'sentences', sid);
        batch.set(sentRef, s, { merge: true }); writes++;
        if (writes >= 400) { await batch.commit(); writes = 0; }
      }
    }
  }
  if (writes) await batch.commit();
  progressCb(Object.keys(map).length);
}
