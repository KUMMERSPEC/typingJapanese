import statsData from './common/statsData.js';
import { CourseDisplay } from './courseDisplay.js'; // 导入 CourseDisplay 类
import { CustomCollectionsManager } from './customCollections.js';

/* ========= 统一刷新首页统计徽章 ========= */
function refreshHomeBadges() {
    const stats = JSON.parse(localStorage.getItem('typing_statistics') || '{}');
  
    // 待学习
    const learnBadge = document.querySelector('#learnBadge');
    if (learnBadge) {
      const needLearn = Object.values(stats.reviewHistory || {})
                       .filter(r => r.proficiency === 'low').length;
      learnBadge.textContent = needLearn;
    }
  
    // 待复习
    const reviewBadge = document.querySelector('.review-items');
    if (reviewBadge) {
      const todayCount = statsData.getReviewItems()
                         .filter(item => item.needsReview).length;
      reviewBadge.textContent = todayCount;
    }
  }
  
  /* 首页加载 / 标签页返回时都刷新一次 */
  document.addEventListener('DOMContentLoaded', () => {
  refreshHomeBadges();
  // 清理可能遗留的遮罩并恢复滚动
  document.querySelectorAll('.overlay.show').forEach(el => el.classList.remove('show'));
  document.body.style.overflow = '';
});
  window.addEventListener('focus',          refreshHomeBadges);
// 跨标签页监听：任何标签页更新 typing_statistics 时立即刷新首页徽章
window.addEventListener('storage', (e)=>{
  if(e.key === 'typing_statistics') refreshHomeBadges();
});

// 分页状态（待复习面板）
let reviewPage = 1;
const REVIEW_PAGE_SIZE = 20;
let reviewTotalPages = 1;

function isTodayDue(item){
    if (!item.nextReviewDate) return false;
    if (item.proficiency === 'high' || item.proficiency === 'master') return false;
    const d = new Date(item.nextReviewDate);
    const today = new Date(); today.setHours(0,0,0,0);
    d.setHours(0,0,0,0);
    return d.getTime() <= today.getTime();
  }

// 初始化复习面板
function initReviewPanel() {
    const reviewTrigger = document.querySelector('[data-action="review"]');
    const reviewPanel = document.querySelector('.review-panel');
    const closeBtn = document.querySelector('.close-btn');
    const overlay = document.querySelector('.overlay');
    const filterSelect = document.getElementById('reviewFilter');
    
    // 确保面板和遮罩层初始状态为隐藏
    if (reviewPanel) {
        reviewPanel.style.display = 'none';
        reviewPanel.classList.remove('show');
    }
    if (overlay) {
        overlay.style.display = 'none';
        overlay.classList.remove('show');
    }
    
    // 添加下拉框变化事件监听
    if (filterSelect) {
        filterSelect.addEventListener('change', () => { reviewPage = 1; updateReviewList(); });
    }
    
    // 添加分页按钮事件监听
    const btnPrev = document.getElementById('reviewPrev');
    const btnNext = document.getElementById('reviewNext');
    if (btnPrev) {
        btnPrev.addEventListener('click', () => {
            if (reviewPage > 1) {
                reviewPage--;
                updateReviewList();
            }
        });
    }
    if (btnNext) {
        btnNext.addEventListener('click', () => {
            if (reviewPage < reviewTotalPages) {
                reviewPage++;
                updateReviewList();
            }
        });
    }
    
    // 点击待复习按钮时显示面板
    if (reviewTrigger) {
        reviewTrigger.addEventListener('click', () => {
            if (reviewPanel && overlay) {
                reviewPage = 1; // 打开时回到第一页
                if (filterSelect) {
                    filterSelect.value = 'today'; // 默认设置为“今日待复习”
                }
                reviewPanel.style.display = 'flex';
                overlay.style.display = 'block';
                setTimeout(() => {
                    reviewPanel.classList.add('show');
                    overlay.classList.add('show');
                }, 10);
                updateReviewList(); // 更新复习列表
            }
        });
    }
    
    // 点击关闭按钮时隐藏面板
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (reviewPanel && overlay) {
                reviewPanel.classList.remove('show');
                overlay.classList.remove('show');
                setTimeout(() => {
                    reviewPanel.style.display = 'none';
                    overlay.style.display = 'none';
                }, 300); // 等待动画完成
            }
        });
    }
    
    // 点击遮罩层时也关闭面板
    if (overlay) {
        overlay.addEventListener('click', () => {
            if (reviewPanel) {
                reviewPanel.classList.remove('show');
                overlay.classList.remove('show');
                setTimeout(() => {
                    reviewPanel.style.display = 'none';
                    overlay.style.display = 'none';
                }, 300);
            }
        });
    }
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('Page loaded, initializing...');
    
    // 初始化自定义收藏功能
    window.customCollections = new CustomCollectionsManager();
    window.customCollectionsManager = window.customCollections; // 确保别名可用

    // 初始化课程显示
    const courseDisplay = new CourseDisplay();



    // 现在加载课程，此时收藏夹已准备就绪
    courseDisplay.loadCourses();

    // 主页课程选择器（课程集 + 收藏夹）
    const courseSelector = document.getElementById('courseSelector');
    if (courseSelector) {
        // 构建选项
        const buildOptions = () => {
            courseSelector.innerHTML = '';
            // 课程集
            const og1 = document.createElement('optgroup');
            og1.label = '课程集';
            og1.appendChild(new Option('词组记单词', 'book:word-group'));
            og1.appendChild(new Option('写给无法说出一句完整日语的人', 'book:standard-basic-1'));
            courseSelector.appendChild(og1);
            // 收藏夹
            const mgr = window.customCollectionsManager;
            const collections = mgr ? mgr.getCollections() : [];
            if (collections && collections.length) {
                const og2 = document.createElement('optgroup');
                og2.label = '收藏夹';
                collections.forEach(c => og2.appendChild(new Option(c.name, `collection:${c.id}`)));
                courseSelector.appendChild(og2);
            }
        };
        buildOptions();

        // 初始值：优先选中已保存的收藏夹；否则选中保存的书籍
        const savedCollection = localStorage.getItem('selectedCollection');
        const savedBook = localStorage.getItem('selectedBook') || 'word-group';
        if (savedCollection) {
            courseSelector.value = `collection:${savedCollection}`;
        } else {
            courseSelector.value = `book:${savedBook}`;
        }

        // 监听变更
        courseSelector.addEventListener('change', () => {
            const val = courseSelector.value;
            if (val.startsWith('book:')) {
                const bookId = val.split(':')[1];
                courseDisplay.setBook(bookId);
            } else if (val.startsWith('collection:')) {
                const cid = val.split(':')[1];
                courseDisplay.setCollection?.(cid);
            }
        });

        // 监听收藏夹变更，自动刷新选项
        window.addEventListener('collectionsUpdated', () => {
            buildOptions();
            // 保持当前选择
            const savedCollection2 = localStorage.getItem('selectedCollection');
            const savedBook2 = localStorage.getItem('selectedBook') || 'word-group';
            courseSelector.value = savedCollection2 ? `collection:${savedCollection2}` : `book:${savedBook2}`;
        });
    }
    
    // 更新今日日期
    updateDate();

    // 批量获取DOM元素
    const elements = {
        learningDays: document.querySelector('.learning-days'),
        learnedSentences: document.querySelector('.learned-sentences'),
        reviewItems: document.querySelector('.review-items'),
        reviewItem: document.querySelector('[data-action="review"]'),
        statsItem: document.querySelector('[data-action="stats"]'),
        overlay: document.querySelector('.overlay'),
        statsPanel: document.getElementById('statsPanel')
    };

    // 批量更新统计数据
    const stats = statsData.getStatistics();
    const learnedSentences = statsData.getLearnedSentences();
    console.log('Initial stats:', { stats, learnedSentences });

    if (elements.learningDays) {
        elements.learningDays.textContent = statsData.getLearningDays();
    }
    if (elements.learnedSentences) {
        elements.learnedSentences.textContent = learnedSentences;
    }
        if (elements.reviewItems) {
        // 直接从过滤后的数组中获取“今日待复习”的数量
        const todayCount = statsData.getReviewItems().filter(item => item.needsReview).length;
        elements.reviewItems.textContent = todayCount;
    }

    // 添加事件监听
    if (elements.reviewItem) {
        elements.reviewItem.addEventListener('click', showReviewPanel);
    }
    if (elements.statsItem) {
        elements.statsItem.addEventListener('click', showStatsPanel);
    }
    if (elements.overlay) {
        elements.overlay.addEventListener('click', closeStatsPanel);
    }

    // 确保统计面板默认隐藏
    if (elements.statsPanel) {
        elements.statsPanel.style.display = 'none';
    }

    // 清除URL参数
    if (window.location.search) {
        window.history.replaceState({}, document.title, '/');
    }

    // 添加调试信息
    console.log('Current hostname:', window.location.hostname);
    console.log('Current pathname:', window.location.pathname);
    console.log('Current href:', window.location.href);

    // 修改"查看全部课程"按钮的链接
    const viewAllBtn = document.querySelector('.view-all-btn');
    if (viewAllBtn) {
        // 根据环境设置正确的路径
        if (window.location.hostname === 'kummerspec.github.io') {
            viewAllBtn.href = '/typingJapanese/practice/courses.html';  // 添加 practice 路径
        } else {
            viewAllBtn.href = './practice/courses.html';  // 本地开发环境也添加 practice 路径
        }
        
        // 添加点击事件监听器来调试
        viewAllBtn.addEventListener('click', (e) => {
            console.log('Button clicked');
            console.log('Target href:', e.currentTarget.href);
            console.log('Resolved URL:', new URL(e.currentTarget.href, window.location.href).href);
        });
    } else {
        console.warn('View all button not found');
    }

    // 初始化复习面板
    initReviewPanel();

    // 检查课程完成状态
    checkCourseCompletion();

    // 监听统计更新事件
    window.addEventListener('statisticsUpdated', () => {
        console.log('Statistics update event received, fetching new stats...');
        const stats = statsData.getStatistics(); // 从数据源获取最新数据
        const learnedSentences = statsData.getLearnedSentences();
        
        // 更新首页统计数据
        const elements = {
            learningDays: document.querySelector('.learning-days'),
            learnedSentences: document.querySelector('.learned-sentences'),
            reviewItems: document.querySelector('.review-items')
        };

        if (elements.learningDays) {
            elements.learningDays.textContent = statsData.getLearningDays();
        }
        if (elements.learnedSentences) {
            elements.learnedSentences.textContent = learnedSentences;
        }
        if (elements.reviewItems) {
            // 直接从过滤后的数组中获取“今日待复习”的数量
            const todayCount = statsData.getReviewItems().filter(item => item.needsReview).length;
            elements.reviewItems.textContent = todayCount;
        }

        // 更新复习列表
        updateReviewList();
    });

    // 添加已学句子点击事件
    const learnedSentencesContainer = document.querySelector('[data-action="learned"]');
    console.log('Found learned sentences container:', learnedSentencesContainer);
    
    if (learnedSentencesContainer) {
        learnedSentencesContainer.style.cursor = 'pointer';
        learnedSentencesContainer.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const basePath = window.location.hostname === 'kummerspec.github.io' ? '/typingJapanese/' : './';
            window.location.href = `${basePath}review/learned.html`;
        });
    } else {
        console.warn('Learned sentences container not found');
    }
});

// 显示复习面板
function showReviewPanel() {
    const reviewPanel = document.querySelector('.review-panel');
    const overlay = document.querySelector('.overlay');
    
    if (reviewPanel && overlay) {
        reviewPage = 1; // 打开时重置到第一页
        reviewPanel.style.display = 'flex';
        overlay.style.display = 'block';
        setTimeout(() => {
            reviewPanel.classList.add('show');
            overlay.classList.add('show');
        }, 10);
        updateReviewList();
    }
}

// 关闭复习面板
window.closeReviewPanel = function() {
    const reviewPanel = document.querySelector('.review-panel');
    const overlay = document.querySelector('.overlay');
    
    if (reviewPanel && overlay) {
        reviewPanel.classList.remove('show');
        overlay.classList.remove('show');
        setTimeout(() => {
            reviewPanel.style.display = 'none';
            overlay.style.display = 'none';
        }, 150); // 从 300ms 改为 150ms，使动画更快
    }
}

// 更新复习列表
function updateReviewList() {
    const pageInfoEl = document.getElementById('reviewPageInfo');
    const btnPrev = document.getElementById('reviewPrev');
    const btnNext = document.getElementById('reviewNext');
    const paginationEl = document.querySelector('.review-pagination');
    const filterSelect = document.getElementById('reviewFilter');
    const selectedFilter = filterSelect ? filterSelect.value : 'today';
    const reviewList = document.querySelector('.review-list');
    const reviewCountDiv = document.querySelector('.review-count');
    
        // 通过 statsData 获取统一的复习项
    // 通过 statsData 获取统一的复习项，并过滤掉无效数据
    let allItems = statsData.getReviewItems().filter(item => item && (item.japanese || item.sentence));
    let items = [];

    // 根据筛选条件处理
    switch (selectedFilter) {
        case 'all':
            items = allItems;
            break;
        case 'today':
            items = allItems.filter(item => item.needsReview && item.proficiency !== 'high' && item.proficiency !== 'master');
            break;
        case 'weak':
            items = allItems.filter(item => item.proficiency === 'low' || 
                (item.reviewCount > 0 && (item.correctCount / item.reviewCount) < 0.6));
            break;
    }

    // 按复习日期排序
    items.sort((a, b) => new Date(a.nextReviewDate) - new Date(b.nextReviewDate));

    // 计算分页信息
    reviewTotalPages = Math.max(1, Math.ceil(items.length / REVIEW_PAGE_SIZE));
    
    // 确保当前页不超过总页数
    if (reviewPage > reviewTotalPages) {
        reviewPage = reviewTotalPages;
    }
    
    // 计算当前页的数据范围
    const startIndex = (reviewPage - 1) * REVIEW_PAGE_SIZE;
    const endIndex = startIndex + REVIEW_PAGE_SIZE;
    const currentPageItems = items.slice(startIndex, endIndex);

    // 更新复习列表显示
    if (reviewList) {
        if (items.length === 0) {
            reviewList.innerHTML = '<div class="empty-message">没有需要复习的句子</div>';
        } else {
            reviewList.innerHTML = currentPageItems.map(item => {
                // 直接使用 item 中已经计算好的状态
                const status = item.displayStatus;
                const statusClass = item.statusClass;

                return `
                    <div class="review-item">
                        <div class="sentence-content">
                            <div class="japanese">${item.japanese || item.sentence || item.text || 'Error: Missing Content'}</div>
                            <div class="hiragana">${item.hiragana || ''}</div>
                            <div class="meaning">${item.meaning || ''}</div>
                            <div class="course-info">${item.course || ''} ${item.lesson ? '- ' + item.lesson : ''}</div>
                        </div>
                        <div class="review-status">
                            <span class="status-badge ${statusClass}">${status}</span>
                            <span class="next-review">下次复习: ${
                                (()=>{
                                    const d=new Date(item.nextReviewDate);
                                    const t=new Date(); t.setHours(0,0,0,0); d.setHours(0,0,0,0);
                                    return (d<t?t:d).toLocaleDateString();
                                  })()
                            }</span>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    // 更新复习数量显示
    if (reviewCountDiv) {
        reviewCountDiv.textContent = `待复习：${items.length}`;
    }

    // 更新分页信息
    if (pageInfoEl) {
        pageInfoEl.textContent = `${reviewPage} / ${reviewTotalPages}`;
    }

    // 跳页输入框
    let jumpInput = document.getElementById('reviewPageJump');
    if (!jumpInput && paginationEl) {
        jumpInput = document.createElement('input');
        jumpInput.type = 'number';
        jumpInput.id = 'reviewPageJump';
        jumpInput.style.width = '60px';
        jumpInput.style.textAlign = 'center';
        jumpInput.min = 1;
        paginationEl.insertBefore(jumpInput, btnNext); // 插在下一页按钮之前
    }
    if (jumpInput) {
        jumpInput.max = reviewTotalPages;
        jumpInput.value = reviewPage;
        jumpInput.onchange = () => {
           let n = parseInt(jumpInput.value, 10) || 1;
           n = Math.max(1, Math.min(reviewTotalPages, n));
           reviewPage = n;
           updateReviewList();
        };
    }

    // 更新分页按钮状态
    if (btnPrev) {
        btnPrev.disabled = reviewPage <= 1;
    }
    if (btnNext) {
        btnNext.disabled = reviewPage >= reviewTotalPages;
    }

    // 显示/隐藏分页控件（当只有一页或没有数据时隐藏）
    if (paginationEl) {
        if (items.length === 0 || reviewTotalPages <= 1) {
            paginationEl.style.display = 'none';
        } else {
            paginationEl.style.display = 'flex';
        }
    }
}

// 添加获取状态样式的函数
function getStatusClass(item) {
    if (!item.reviewCount) {
        return 'status-new';  // 新学习的句子
    }
    
    const correctRate = item.correctCount / item.reviewCount;
    
    if (item.proficiency === 'low') {
        if (correctRate < 0.3) return 'status-weak';
        if (correctRate < 0.6) return 'status-learning';
        return 'status-basic';
    }
    
    if (item.proficiency === 'medium') {
        if (correctRate < 0.7) return 'status-familiar';
        if (correctRate < 0.9) return 'status-good';
        return 'status-skilled';
    }
    
    return 'status-mastered';
}

// 格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    return `${diffDays}天前`;
}

// 获取熟练度文本
function getProficiencyText(proficiency) {
    const texts = {
        low: '生疏',
        medium: '一般',
        high: '熟练'
    };
    return texts[proficiency] || '未知';
}

// 同样将 startReview 声明为全局函数
window.startReview = function(mode) {
    const randomOrder = document.getElementById('randomOrder').checked;
    const focusWeak = document.getElementById('focusWeak').checked;
    const filterSelect = document.getElementById('reviewFilter');
    const selectedFilter = filterSelect ? filterSelect.value : 'all';
    
    // 先关闭复习面板
    const reviewPanel = document.querySelector('.review-panel');
    const overlay = document.querySelector('.overlay');
    if (reviewPanel && overlay) {
        reviewPanel.classList.remove('show');
        overlay.classList.remove('show');
        setTimeout(() => {
            reviewPanel.style.display = 'none';
            overlay.style.display = 'none';
        }, 300);
    }
    
    // 获取需要复习的句子
    const stats = statsData.getStatistics();
    const reviewHistory = stats.reviewHistory || {};
    let reviewItems = [];
    
    // 根据筛选条件获取复习项
    const today = new Date().toISOString().split('T')[0];
    Object.entries(reviewHistory).forEach(([key, item]) => {
        const nextReview = new Date(item.nextReviewDate).toISOString().split('T')[0];
        
        // 根据选择的过滤条件筛选句子
        switch(selectedFilter) {
            case 'today':
                // 今日待复习：只选择今天需要复习的句子
                if (nextReview <= today) {
                    reviewItems.push({...item, id: key});
                }
                break;
            case 'weak':
                // 需要加强：选择掌握度低或正确率低的句子
                if (item.proficiency === 'low' || 
                    (item.reviewCount > 0 && (item.correctCount / item.reviewCount) < 0.6)) {
                    reviewItems.push({...item, id: key});
                }
                break;
            default: // 'all'
                // 全部句子：显示所有学习过的句子
                reviewItems.push({...item, id: key});
                break;
        }
    });

    // 如果没有需要复习的句子，显示对应的提示信息
    if (reviewItems.length === 0) {
        let message = '';
        switch(selectedFilter) {
            case 'today':
                message = '今日内容已复习完毕';
                break;
            case 'weak':
                message = '目前没有需要加强的句子';
                break;
            default:
                message = '还没有学习任何句子';
        }
        alert(message);
        return;
    }

    // 如果选择了随机顺序，打乱数组
    if (randomOrder) {
        reviewItems.sort(() => Math.random() - 0.5);
    }
    
    // 如果选择了专注薄弱项，按熟练度排序
    if (focusWeak) {
        reviewItems.sort((a, b) => {
            const proficiencyOrder = { low: 0, medium: 1, high: 2, master: 3 };
            return proficiencyOrder[a.proficiency] - proficiencyOrder[b.proficiency];
        });
    }

    // 将复习数据存储到 sessionStorage
    sessionStorage.setItem('reviewSentences', JSON.stringify(reviewItems));
    
    // 构建URL参数
    const params = new URLSearchParams({
        random: randomOrder,
        focus: focusWeak
    });
    
    // 根据模式跳转到对应页面
    if (mode === 'typing') {
        window.location.href = `review/typing.html?${params.toString()}`;
    } else if (mode === 'flashcard') {
        window.location.href = `review/flashcard.html?${params.toString()}`;
    }
}

// 显示统计面板
function showStatsPanel() {
    console.log('[index.js] showStatsPanel function called.'); // DEBUG
    const statsPanel = document.getElementById('statsPanel');
    const overlay = document.querySelector('.overlay');
    if (statsPanel && overlay) {
        // 先显示以便能触发动画
        statsPanel.style.display = 'flex';
        overlay.style.display = 'block';

        // 使用与复习面板相同的动画逻辑
        setTimeout(() => {
            statsPanel.classList.add('show');
            overlay.classList.add('show');
        }, 10);

        updateStatsDisplay();
    }
}

// 关闭统计面板
window.closeStatsPanel = function() {
    const statsPanel = document.getElementById('statsPanel');
    const overlay = document.querySelector('.overlay');
    if (statsPanel && overlay) {
        statsPanel.classList.remove('show');
        overlay.classList.remove('show');
        setTimeout(() => {
            statsPanel.style.display = 'none';
            overlay.style.display = 'none';
        }, 150);
    }
}

// 更新统计显示
function updateStatsDisplay() {
    const stats = statsData.getStatistics();
    const elements = {
        totalDays: document.getElementById('totalDays'),
        totalSentences: document.getElementById('totalSentences'),
        totalReviews: document.getElementById('totalReviews'),
        masteryHigh: document.getElementById('masteryHigh'),
        masteryMedium: document.getElementById('masteryMedium'),
        masteryLow: document.getElementById('masteryLow')
    };

    // 只在元素存在时更新内容
    if (elements.totalDays) elements.totalDays.textContent = statsData.getLearningDays();
    if (elements.totalSentences) elements.totalSentences.textContent = stats.totalSentences || 0;
    if (elements.totalReviews) {
        elements.totalReviews.textContent = Object.values(stats.reviewHistory || {})
            .reduce((sum, item) => sum + (item.reviewCount || 0), 0);
    }

    // 更新掌握度指标
    const masteryStats = statsData.getMasteryStats();

    if (elements.masteryHigh) elements.masteryHigh.textContent = masteryStats.high || 0;
    if (elements.masteryMedium) elements.masteryMedium.textContent = masteryStats.medium || 0;
    if (elements.masteryLow) elements.masteryLow.textContent = masteryStats.low || 0;
}

// 点击遮罩层关闭面板
document.querySelector('.overlay')?.addEventListener('click', closeStatsPanel); 

// 更新日期显示
function updateDate() {
    const dateElement = document.querySelector('.today-date');
    if (dateElement) {
        const today = new Date();
        dateElement.textContent = today.toLocaleDateString('zh-CN');
    }
}

// 添加下拉框变化事件监听
document.getElementById('reviewFilter')?.addEventListener('change', updateReviewList); 

// 添加课程完成检查函数
function checkCourseCompletion() {
    const stats = JSON.parse(localStorage.getItem('typing_statistics') || '{}');
    const completedLessons = stats.completedLessons || {};
    const todayRecommendation = document.querySelector('.today-recommendation');
    
    if (todayRecommendation) {
        const courseId = todayRecommendation.getAttribute('data-course-id');
        const lessonId = todayRecommendation.getAttribute('data-lesson-id');
        
        if (courseId && lessonId) {
            const lessonKey = `${courseId}_${lessonId}`;
            if (completedLessons[lessonKey]) {
                showCompletionMessage();
            }
        }
    }
}

// 添加完成提示函数
function showCompletionMessage() {
    const recommendationSection = document.querySelector('.today-recommendation');
    if (recommendationSection) {
        // 创建完成提示元素
        const completionMessage = document.createElement('div');
        completionMessage.className = 'completion-message';
        completionMessage.innerHTML = `
            <div class="completion-content">
                <i class="fas fa-check-circle"></i>
                <h3>恭喜完成今日推荐课程！</h3>
                <p>继续保持学习热情，明天再来完成新的课程吧。</p>
                <button class="review-now-btn">立即复习</button>
            </div>
        `;

        // 替换原有内容
        recommendationSection.innerHTML = '';
        recommendationSection.appendChild(completionMessage);

        // 添加复习按钮点击事件
        const reviewButton = completionMessage.querySelector('.review-now-btn');
        if (reviewButton) {
            reviewButton.addEventListener('click', () => {
                showReviewPanel();
            });
        }
    }
}

// 在课程完成时调用此函数
function markLessonAsCompleted(courseId, lessonId) {
    const stats = JSON.parse(localStorage.getItem('typing_statistics') || '{}');
    if (!stats.completedLessons) {
        stats.completedLessons = {};
    }
    
    const lessonKey = `${courseId}_${lessonId}`;
    stats.completedLessons[lessonKey] = {
        completedAt: new Date().toISOString(),
        nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24小时后复习
        proficiency: 'low',
        reviewCount: 0,
        correctCount: 0
    };
    
    localStorage.setItem('typing_statistics', JSON.stringify(stats));
    checkCourseCompletion(); // 检查并显示完成提示
}

// 修改 showLearnedSentencesPanel 函数
function showLearnedSentencesPanel() {
    console.log('=== Show Learned Panel Start ===');
    
    try {
        // 先移除已存在的面板和遮罩
        const existingPanels = document.querySelectorAll('.learned-panel, .overlay');
        existingPanels.forEach(panel => panel.remove());
        
        // 创建遮罩层和面板
        const overlay = document.createElement('div');
        overlay.className = 'overlay';
        
        const learnedPanel = document.createElement('div');
        learnedPanel.className = 'learned-panel';
        
        // 从 statsData 获取数据
        const stats = statsData.getStatistics();
        const reviewHistory = stats.reviewHistory || {};
        
        // 获取所有已学句子
        const items = Object.entries(reviewHistory)
            .filter(([_, item]) => item && (item.japanese || item.sentence))
            .map(([_, item]) => ({
                japanese: item.japanese || item.sentence,
                meaning: item.meaning || ''
            }));
        
        // 构建面板骨架（虚拟滚动）
        learnedPanel.innerHTML = `
            <div class="panel-header">
                <h3>已学句子 (${items.length})</h3>
                <button class="close-btn" type="button">×</button>
            </div>
            <div class="learned-list vscroll">
                <div class="vscroll-spacer" style="height:${items.length*48}px"></div>
                <div class="vscroll-pool"></div>
            </div>
        `;

        // 添加到页面
        document.body.appendChild(overlay);
        document.body.appendChild(learnedPanel);
        
        // 初始化虚拟列表
        const ROW_H = 48;
        const listEl = learnedPanel.querySelector('.vscroll');
        const poolEl = learnedPanel.querySelector('.vscroll-pool');
        const poolSize = Math.min(items.length, Math.ceil(learnedPanel.offsetHeight / ROW_H) + 5);
        let firstIdx = 0;
        // 创建池
        for (let i = 0; i < poolSize; i++) {
            const div = document.createElement('div');
            div.className = 'learned-item';
            div.style.position = 'absolute';
            div.style.width = '100%';
            div.style.height = ROW_H + 'px';
            poolEl.appendChild(div);
        }
        function fill(node, data) {
            node.innerHTML = `<div class="japanese">${data.japanese}</div><div class="meaning">${data.meaning}</div>`;
        }
        function render(start) {
            for (let i = 0; i < poolSize; i++) {
                const idx = start + i;
                const node = poolEl.children[i];
                if (idx >= items.length) {
                    node.style.display = 'none';
                    continue;
                }
                node.style.display = '';
                node.style.transform = `translateY(${idx * ROW_H}px)`;
                fill(node, items[idx]);
            }
        }
        render(0);
        listEl.addEventListener('scroll', () => {
            const newFirst = Math.floor(listEl.scrollTop / ROW_H);
            if (newFirst !== firstIdx) {
                firstIdx = newFirst;
                render(firstIdx);
            }
        });

        // 显示遮罩和面板
        overlay.style.display = 'block';
        requestAnimationFrame(() => {
            overlay.classList.add('show');
            learnedPanel.classList.add('show');
        });

        // 添加关闭事件
        const closeBtn = learnedPanel.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                learnedPanel.remove();
                overlay.remove();
            });
        }
        overlay.addEventListener('click', () => {
            learnedPanel.remove();
            overlay.remove();
        });

    } catch (error) {
        console.error('Error in showLearnedSentencesPanel:', error);
    }
}

// 修改 getMasteryStatus 函数，与 statsData.js 保持一致
function getMasteryStatus(item) {
    // 如果是新句子（没有复习记录）
    if (!item || !item.reviewCount) {
        return '生疏';
    }
    
    // 特殊处理 master 级别的句子
    if (item.proficiency === 'master') {
        return '熟练';
    }

    // 检查是否需要复习
    const nextReview = new Date(item.nextReviewDate);
    const now = new Date();
    const lastReview = item.lastReview ? new Date(item.lastReview) : null;
    
    // 如果是今天刚复习过的，优先显示掌握状态
    if (lastReview && lastReview.toDateString() === now.toDateString()) {
        switch (item.proficiency) {
            case 'high': return '熟练';
            case 'medium': return '基本掌握';
            case 'low': return '需要加强';
            default: return '未知';
        }
    }

    // 如果已经到了复习时间，显示"待复习"
    if (nextReview <= now) {
        return '待复习';
    }

    // 其他情况显示当前掌握状态
    switch (item.proficiency) {
        case 'high': return '熟练';
        case 'medium': return '基本掌握';
        case 'low': return '需要加强';
        default: return '未知';
    }
}
// 在需要获取掌握状态的地方使用
function updateSentenceStatus(item) {
    const status = statsData.getMasteryStatus(item);
    // 使用 status.text 和 status.class
    return status.text;
} 
