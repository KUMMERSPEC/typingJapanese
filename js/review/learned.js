import statsData from '../common/statsData.js';

(function(){
  // State
  let allRows = [];
  let filteredRows = [];
  let page = 1;
  let pageSize = 50;
  let scope = 'all';
  let query = '';
  let lang = 'all';

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
  const langFilter = document.getElementById('langFilter');
  const tableHead = document.querySelector('.table-wrap thead');

  function updateHeadersByLang(currentLang) {
    if (!tableHead) return;
    const ths = tableHead.querySelectorAll('th');
    if (ths && ths.length >= 3) {
      // 语言为全部时，使用中性表头
      if (currentLang === 'all') {
        ths[0].textContent = '原文';
        ths[1].textContent = '分词';
      } else if (currentLang === 'en') {
        ths[0].textContent = '英文';
        ths[1].textContent = '分词';
      } else { // ja
        ths[0].textContent = '日文';
        ths[1].textContent = '假名';
      }
      // 第三列“中文”保持不变
    }
    // 同步搜索框提示
    const searchInputEl = document.getElementById('searchInput');
    if (searchInputEl) {
      if (currentLang === 'all') {
        searchInputEl.placeholder = '搜索：原文、分词或中文翻译';
      } else if (currentLang === 'en') {
        searchInputEl.placeholder = '搜索：英文、分词或中文翻译';
      } else {
        searchInputEl.placeholder = '搜索：日文、假名、罗马音或中文翻译';
      }
    }
  }

  // Back link base
  if (backHome) {
    const basePath = window.location.hostname === 'kummerspec.github.io' ? '/typingJapanese/' : '../';
    backHome.href = basePath;
  }

  function formatHiraganaDisplay(text, lang) {
    const s = text || '';
    return (lang === 'en') ? s.replace(/:/g, ' ') : s.replace(/:/g, '');
  }

  // Load data
  function load() {
    try {
      // 直接从 statsData 获取所有已处理和去重后的复习项目
      // 不再需要手动合并或去重，保证数据源唯一
      allRows = statsData.getReviewItems();

      // 默认按 nextReviewDate 近到远排序（没有日期的排在后面）
      allRows.sort((a,b) => {
        const da = a.nextReviewDate ? new Date(a.nextReviewDate) : new Date(8640000000000000);
        const db = b.nextReviewDate ? new Date(b.nextReviewDate) : new Date(8640000000000000);
        return da - db;
      });

      applyFilter();
    } catch (e) {
      console.error('加载已学句子失败:', e);
      tbody.innerHTML = '<tr><td colspan="7" class="muted">加载失败</td></tr>';
    }
  }

  // 推断语言（兼容旧数据）
  function detectLang(row) {
    if (row.lang && (row.lang === 'ja' || row.lang === 'en')) return row.lang;
    const txt = (row.japanese || '').trim();
    const hasKanaKanji = /[\u3040-\u30FF\u4E00-\u9FFF]/.test(txt);
    if (hasKanaKanji) return 'ja';
    // 纯 ASCII 视作英文
    const isAscii = /^[\x00-\x7F]+$/.test(txt);
    return isAscii ? 'en' : 'ja';
  }

  function applyFilter() {
    const q = (query || '').trim().toLowerCase();

    filteredRows = allRows.filter(row => {
      // 语言筛选
      const rowLang = detectLang(row);
      if (lang !== 'all' && rowLang !== lang) return false;

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
    try {
      const date = new Date(d);
      const today = new Date();
      today.setHours(0,0,0,0);
      date.setHours(0,0,0,0);
      const adjusted = date < today ? today : date;
      return adjusted.toLocaleDateString();
    } catch { return d; }
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
            <td>${escapeHtml(r.japanese)} <span class="lang-badge lang-badge-${detectLang(r)}"></span></td>
            <td>${escapeHtml(formatHiraganaDisplay(r.hiragana, r.lang))}</td>
            <td>${escapeHtml(r.meaning)}</td>
            <td class="nowrap">${escapeHtml(displayText(r.course))}</td>
            <td class="nowrap">${escapeHtml(displayText(r.lesson))}</td>
            <td class="nowrap"><span class="badge ${badgeClass(r.proficiency)}">${proficiencyText(r.proficiency)}</span></td>
            <td class="nowrap">${fmtDate(r.nextReviewDate)}</td>
          </tr>
        `).join('');
      }
    }

    if (pageInfoEl) pageInfoEl.textContent = `${page} / ${totalPages}`;

    // 跳页输入
    let jump = document.getElementById('learnedPageJump');
    const pagWrap = document.querySelector('.pagination');
    if (!jump && pagWrap) {
        jump = document.createElement('input');
        jump.type = 'number';
        jump.id = 'learnedPageJump';
        jump.style.width = '60px';
        jump.style.textAlign = 'center';
        jump.min = 1;
        pagWrap.insertBefore(jump, btnNext);
    }
    if (jump) {
        jump.max = totalPages;
        jump.value = page;
        jump.onchange = () => {
           let n = parseInt(jump.value,10)||1;
           n = Math.max(1, Math.min(totalPages, n));
           page = n;
           render();
        };
    }

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

  function displayText(v){
    if(typeof v==='string') return v;
    if(v && typeof v==='object') return v.name || JSON.stringify(v);
    return v==null ? '' : String(v);
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
  langFilter?.addEventListener('change', (e) => { 
    lang = e.target.value || 'all'; 
    updateHeadersByLang(lang);
    applyFilter(); 
  });

  // init
  updateHeadersByLang(lang);
  load();
})();

