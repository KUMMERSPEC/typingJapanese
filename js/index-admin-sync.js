// separated admin sync injector to keep original index.js minimal
import firebaseServices from './firebase-init.js';
import { syncGoogleSheetToFirestore } from './syncSheetsToCourses.js';
const { db, auth } = firebaseServices;

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/XXXX/export?format=csv'; // TODO replace

auth.onAuthStateChanged(async user => {
  if (!user) return;
  const token = await user.getIdTokenResult();
  if (!token.claims.admin) return;
  // admin
  const headerBtns = document.querySelector('.header-buttons');
  if (!headerBtns) return;
  const btn = document.createElement('button');
  btn.id = 'adminSyncBtn';
  btn.className = 'action-button';
  btn.innerHTML = '<i class="fas fa-cloud-download-alt"></i> 同步官方课程';
  headerBtns.appendChild(btn);

  btn.addEventListener('click', async () => {
    if (btn.dataset.busy) return;
    btn.dataset.busy = '1';
    const orig = btn.textContent;
    btn.textContent = '同步中...';
    try {
      await syncGoogleSheetToFirestore(SHEET_CSV_URL, db, (c) => console.log('courses', c));
      alert('同步完成！请刷新查看官方课程');
      window.dispatchEvent(new Event('coursesChanged'));
    } catch (e) {
      console.error(e);
      alert('同步失败：' + e.message);
    } finally {
      btn.textContent = orig;
      delete btn.dataset.busy;
    }
  });
});