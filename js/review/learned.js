import statsData from '../common/statsData.js';

(function(){
  // State
  let allRows = [];
  let filteredRows = [];
  let page = 1;
  let pageSize = 50;
  let scope = 'all';
  let query = '';

  // DOM
  const tbody = document.getElementById('learnedTableBody');
  const totalCountEl = document.getElementById('totalCount');
  const pageInfoEl = document.getElementById('pageInfo');
  const btnPrev = document.getElementById('btnPrev');
  const btnNext = document.getElementById('btnNext');
  const searchInput = document.getElementById('searchInput');
  const searchScope = document.getElementById('searchScope');
  const pageSizeSel = document.getElementById('pageSize');
  const backHome = document.getElementById('backHome');

  // Back link base
  if (backHome) {
    const basePath = window.location.hostname === 'kummerspec.github.io' ? '/typingJapanese/' : '../';
    backHome.href = basePath;
  }

  // Load data
  function load() {
    try {
      const stats = statsData.getStatistics();
      const reviewHistory = stats.reviewHistory || {};

      allRows = Object.entries(reviewHistory)
        .filter(([id, item]) => item && (item.japanese || item.sentence))
        .map(([id, item]) => ({
          id,
          japanese: item.japanese || item.sentence || '',
          hiragana: (item.hiragana || '').replace(/:/g, ''),
          romaji: item.romaji || '',
          meaning: item.meaning || '',
          course: item.course || '',
          lesson: item.lesson || '',
          proficiency: item.proficiency || 'low',
          nextReviewDate: item.nextReviewDate || '',
          lastReview: item.lastReview || ''
        }));

      // 默认按 nextReviewDate 近到远排序
      allRows.sort((a,b) => new Date(a.nextReviewDate) - new Date(b.nextReviewDate));

      applyFilter();
    } catch (e) {
      console.error('加载已学句子失败:', e);
      tbody.innerHTML = '<tr><td colspan="7" class="muted">加载失败</td></tr>';
    }
  }

  function applyFilter() {
    const q = (query || '').trim().toLowerCase();

    filteredRows = allRows.filter(row => {
      if (!q) return true;
      if (scope === 'cn') {
        return (row.meaning || '').toLowerCase().includes(q);
      }
      if (scope === 'jp') {
        return (
          (row.japanese || '').toLowerCase().includes(q) ||
          (row.hiragana || '').toLowerCase().includes(q) ||
          (row.romaji || '').toLowerCase().includes(q)
        );
      }
      // all
      return (
        (row.japanese || '').toLowerCase().includes(q) ||
        (row.hiragana || '').toLowerCase().includes(q) ||
        (row.romaji || '').toLowerCase().includes(q) ||
        (row.meaning || '').toLowerCase().includes(q) ||
        (row.course || '').toLowerCase().includes(q) ||
        (row.lesson || '').toLowerCase().includes(q)
      );
    });

    page = 1;
    render();
  }

  function badgeClass(p) {
    if (p === 'high' || p === 'master') return 'high';
    if (p === 'medium') return 'medium';
    return 'low';
  }

  function fmtDate(d) {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString(); } catch { return d; }
  }

  function render() {
    // counts
    if (totalCountEl) totalCountEl.textContent = filteredRows.length.toString();

    const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
    if (page > totalPages) page = totalPages;

    const start = (page - 1) * pageSize;
    const sliced = filteredRows.slice(start, start + pageSize);

    if (tbody) {
      if (sliced.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="muted">没有记录</td></tr>';
      } else {
        tbody.innerHTML = sliced.map(r => `
          <tr>
            <td>${escapeHtml(r.japanese)}</td>
            <td>${escapeHtml(r.hiragana)}</td>
            <td>${escapeHtml(r.meaning)}</td>
            <td class="nowrap">${escapeHtml(r.course)}</td>
            <td class="nowrap">${escapeHtml(r.lesson)}</td>
            <td class="nowrap"><span class="badge ${badgeClass(r.proficiency)}">${proficiencyText(r.proficiency)}</span></td>
            <td class="nowrap">${fmtDate(r.nextReviewDate)}</td>
          </tr>
        `).join('');
      }
    }

    if (pageInfoEl) pageInfoEl.textContent = `${page} / ${totalPages}`;
    if (btnPrev) btnPrev.disabled = page <= 1;
    if (btnNext) btnNext.disabled = page >= totalPages;
  }

  function proficiencyText(p) {
    switch (p) {
      case 'high':
      case 'master': return '熟练';
      case 'medium': return '基本掌握';
      case 'low':
      default: return '需要加强';
    }
  }

  function escapeHtml(s) {
    return (s || '').toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // events
  searchInput?.addEventListener('input', (e) => {
    query = e.target.value;
    applyFilter();
  });
  searchScope?.addEventListener('change', (e) => {
    scope = e.target.value;
    applyFilter();
  });
  pageSizeSel?.addEventListener('change', (e) => {
    pageSize = parseInt(e.target.value, 10) || 50;
    page = 1;
    render();
  });
  btnPrev?.addEventListener('click', () => { if (page > 1) { page--; render(); } });
  btnNext?.addEventListener('click', () => { page++; render(); });

  // init
  load();
})();

