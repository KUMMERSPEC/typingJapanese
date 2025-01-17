import statsData from './common/statsData.js';

class CourseManager {
    constructor() {
        this.courses = [];
        this.loadCourses();
    }

    async loadCourses() {
        try {
            // 直接加载课程列表
            const courseList = [
                {
                    id: 'kimochi',
                    title: '気持ち',
                    description: '表达感受的词汇'
                },
                {
                    id: 'gimon',
                    title: '疑問詞',
                    description: '疑问词练习'
                }
            ];

            this.courses = courseList;
            this.renderCourses();
        } catch (error) {
            console.error('Error loading courses:', error);
            this.showError('加载课程失败，请刷新重试');
        }
    }

    renderCourses() {
        const courseList = document.querySelector('.course-list');
        if (!courseList) return;

        courseList.innerHTML = this.courses.map(course => `
            <div class="course-card" onclick="window.location.href='practice/practice.html?course=${course.id}&lesson=Lesson1'">
                <h3>${course.title}</h3>
                <p>${course.description}</p>
            </div>
        `).join('');
    }

    showError(message) {
        alert(message);
    }
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
        filterSelect.addEventListener('change', updateReviewList);
    }
    
    // 点击待复习按钮时显示面板
    if (reviewTrigger) {
        reviewTrigger.addEventListener('click', () => {
            if (reviewPanel && overlay) {
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
    
    // 初始化课程管理器
    const courseManager = new CourseManager();
    
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
    if (elements.learningDays) elements.learningDays.textContent = statsData.getLearningDays();
    if (elements.learnedSentences) elements.learnedSentences.textContent = statsData.getLearnedSentences();
    if (elements.reviewItems) elements.reviewItems.textContent = statsData.getReviewCount();

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

    // 初始化复习面板
    initReviewPanel();
});

// 显示复习面板
function showReviewPanel() {
    const reviewPanel = document.querySelector('.review-panel');
    const overlay = document.querySelector('.overlay');
    
    if (reviewPanel && overlay) {
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
        }, 300);
    }
}

// 更新复习列表
function updateReviewList() {
    const filterSelect = document.getElementById('reviewFilter');
    const selectedFilter = filterSelect.value;
    const reviewList = document.querySelector('.review-list');
    const reviewCountDiv = document.querySelector('.review-count');
    
    // 获取所有复习项
    const stats = JSON.parse(localStorage.getItem('typing_statistics') || '{}');
    const reviewHistory = stats.reviewHistory || {};
    let items = [];
    
    // 根据选择的筛选条件过滤句子
    const today = new Date().toISOString().split('T')[0];
    
    for (const key in reviewHistory) {
        const item = reviewHistory[key];
        const nextReviewDate = item.nextReviewDate ? new Date(item.nextReviewDate).toISOString().split('T')[0] : null;
        
        if (selectedFilter === 'all') {
            // 显示所有学习过的句子
            items.push(item);
        } else if (selectedFilter === 'today' && nextReviewDate && nextReviewDate <= today) {
            // 显示今日需要复习的句子
            items.push(item);
        } else if (selectedFilter === 'weak' && 
                  (item.proficiency === 'low' || 
                   (item.reviewCount > 0 && (item.correctCount / item.reviewCount) < 0.6))) {
            // 显示需要加强的句子（掌握度低或正确率低于60%）
            items.push(item);
        }
    }
    
    // 更新复习数量显示
    reviewCountDiv.textContent = `待复习：${items.length}`;
    
    // 清空并重新生成列表
    reviewList.innerHTML = '';
    
    if (items.length === 0) {
        reviewList.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">没有需要复习的句子</div>';
        return;
    }
    
    items.forEach(item => {
        const reviewItem = document.createElement('div');
        reviewItem.className = 'review-item';
        
        const sentenceInfo = document.createElement('div');
        sentenceInfo.className = 'sentence-info';
        
        const japanese = document.createElement('div');
        japanese.className = 'japanese';
        japanese.textContent = item.japanese;
        
        const meaning = document.createElement('div');
        meaning.className = 'meaning';
        meaning.textContent = item.meaning;
        
        const courseInfo = document.createElement('div');
        courseInfo.className = 'course-info';
        courseInfo.textContent = `课程：${item.course || '未知'} - ${item.lesson || '未知'}`;
        
        sentenceInfo.appendChild(japanese);
        sentenceInfo.appendChild(meaning);
        sentenceInfo.appendChild(courseInfo);
        
        const reviewStatus = document.createElement('div');
        reviewStatus.className = 'review-status';
        
        const lastReview = document.createElement('span');
        lastReview.className = 'last-review';
        lastReview.textContent = item.lastReview ? `上次复习: ${new Date(item.lastReview).toLocaleDateString()}` : '未复习';
        
        const proficiency = document.createElement('span');
        proficiency.className = `proficiency ${item.proficiency || 'low'}`;
        proficiency.textContent = {
            'low': '需加强',
            'medium': '一般',
            'high': '熟练'
        }[item.proficiency || 'low'];
        
        reviewStatus.appendChild(lastReview);
        reviewStatus.appendChild(proficiency);
        
        reviewItem.appendChild(sentenceInfo);
        reviewItem.appendChild(reviewStatus);
        
        reviewList.appendChild(reviewItem);
    });
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
    const statsPanel = document.getElementById('statsPanel');
    const overlay = document.querySelector('.overlay');
    if (statsPanel && overlay) {
        statsPanel.style.display = 'flex';
        overlay.style.display = 'block';
        updateStatsDisplay();
    }
}

// 关闭统计面板
window.closeStatsPanel = function() {
    const statsPanel = document.getElementById('statsPanel');
    const overlay = document.querySelector('.overlay');
    if (statsPanel && overlay) {
        statsPanel.style.display = 'none';
        overlay.style.display = 'none';
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
    if (elements.totalDays) elements.totalDays.textContent = stats.consecutiveDays || 0;
    if (elements.totalSentences) elements.totalSentences.textContent = stats.totalSentences || 0;
    if (elements.totalReviews) {
        elements.totalReviews.textContent = Object.values(stats.reviewHistory || {})
            .reduce((sum, item) => sum + (item.reviewCount || 0), 0);
    }

    // 更新掌握度指标
    const completedQuestions = stats.completedQuestions || {};
    let low = 0, medium = 0, high = 0;

    Object.values(completedQuestions).forEach(question => {
        const correctRate = question.correctCount / question.totalAttempts;
        if (correctRate < 0.6) low++;
        else if (correctRate < 0.9) medium++;
        else high++;
    });

    if (elements.masteryHigh) elements.masteryHigh.textContent = high;
    if (elements.masteryMedium) elements.masteryMedium.textContent = medium;
    if (elements.masteryLow) elements.masteryLow.textContent = low;
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