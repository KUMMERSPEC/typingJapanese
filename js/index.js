import statsData from './common/statsData.js';
import { CourseDisplay } from './courseDisplay.js'; // 导入 CourseDisplay 类
import { CustomCollectionsManager } from './customCollections.js';

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
    
    // 初始化课程显示
    const courseDisplay = new CourseDisplay();
    courseDisplay.loadCourses(); // 使用 CourseDisplay 加载课程
    
    // 初始化自定义收藏功能
    window.customCollections = new CustomCollectionsManager();
    
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
        elements.learningDays.textContent = stats.consecutiveDays || 0;
    }
    if (elements.learnedSentences) {
        elements.learnedSentences.textContent = learnedSentences;
    }
    if (elements.reviewItems) {
        elements.reviewItems.textContent = Object.keys(stats.reviewHistory || {}).length;
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
    window.addEventListener('statisticsUpdated', (event) => {
        console.log('Statistics update event received:', event.detail);
        const stats = event.detail.stats;
        const learnedSentences = statsData.getLearnedSentences();
        
        // 更新首页统计数据
        const elements = {
            learningDays: document.querySelector('.learning-days'),
            learnedSentences: document.querySelector('.learned-sentences'),
            reviewItems: document.querySelector('.review-items')
        };

        if (elements.learningDays) {
            elements.learningDays.textContent = stats.consecutiveDays || 0;
        }
        if (elements.learnedSentences) {
            elements.learnedSentences.textContent = learnedSentences;
        }
        if (elements.reviewItems) {
            elements.reviewItems.textContent = Object.keys(stats.reviewHistory || {}).length;
        }

        // 更新复习列表
        updateReviewList();
    });
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
    const selectedFilter = filterSelect ? filterSelect.value : 'all';
    const reviewList = document.querySelector('.review-list');
    const reviewCountDiv = document.querySelector('.review-count');
    
    // 获取所有复习项
    const stats = JSON.parse(localStorage.getItem('typing_statistics') || '{}');
    const reviewHistory = stats.reviewHistory || {};
    let items = [];
    
    // 根据选择的筛选条件过滤句子
    const today = new Date().toISOString().split('T')[0];
    
    // 只处理有效的复习历史项
    for (const key in reviewHistory) {
        const item = reviewHistory[key];
        // 检查项目是否有效
        if (item && item.sentence && item.course && item.lesson) {
            const nextReviewDate = item.nextReviewDate ? 
                new Date(item.nextReviewDate).toISOString().split('T')[0] : null;
            
            // 添加调试信息
            console.log('Processing valid item:', {
                key,
                sentence: item.sentence,
                course: item.course,
                lesson: item.lesson,
                nextReviewDate
            });
            
            if (selectedFilter === 'all') {
                // 显示所有有效的句子
                items.push(item);
            } else if (selectedFilter === 'today' && nextReviewDate && nextReviewDate <= today) {
                // 显示今日需要复习的句子
                items.push(item);
            } else if (selectedFilter === 'weak' && 
                      (item.proficiency === 'low' || 
                       (item.reviewCount > 0 && (item.correctCount / item.reviewCount) < 0.6))) {
                // 显示需要加强的句子
                items.push(item);
            }
        } else {
            console.log('Skipping invalid item:', key, item);
        }
    }
    
    // 添加调试信息
    console.log('Valid items found:', items.length);
    console.log('Items:', items);
    
    // 更新复习数量显示
    if (reviewCountDiv) {
        reviewCountDiv.textContent = `待复习：${items.length}`;
    }
    
    // 清空并重新生成列表
    if (reviewList) {
        reviewList.innerHTML = '';
        
        if (items.length === 0) {
            reviewList.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">没有需要复习的句子</div>';
            return;
        }
        
        items.forEach(item => {
            if (!item.sentence) {
                console.log('Skipping item without sentence:', item);
                return;
            }

            const reviewItem = document.createElement('div');
            reviewItem.className = 'review-item';
            
            const sentenceInfo = document.createElement('div');
            sentenceInfo.className = 'sentence-info';
            
            const japanese = document.createElement('div');
            japanese.className = 'japanese';
            japanese.textContent = item.sentence;
            
            const meaning = document.createElement('div');
            meaning.className = 'meaning';
            meaning.textContent = item.meaning || '';
            
            const courseInfo = document.createElement('div');
            courseInfo.className = 'course-info';
            courseInfo.textContent = `${item.course} - ${item.lesson}`;
            
            sentenceInfo.appendChild(japanese);
            sentenceInfo.appendChild(meaning);
            sentenceInfo.appendChild(courseInfo);
            
            const reviewStatus = document.createElement('div');
            reviewStatus.className = 'review-status';
            
            const lastReview = document.createElement('span');
            lastReview.className = 'last-review';
            lastReview.textContent = item.lastReview ? 
                `上次复习: ${new Date(item.lastReview).toLocaleDateString()}` : 
                '未复习';
            
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

// 在 CSS 中添加相关样式
const style = document.createElement('style');
style.textContent = `
    .completion-message {
        background: #f8f9fa;
        border-radius: 12px;
        padding: 30px;
        text-align: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }

    .completion-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 15px;
    }

    .completion-message i {
        font-size: 48px;
        color: #4caf50;
    }

    .completion-message h3 {
        margin: 0;
        color: #333;
    }

    .completion-message p {
        color: #666;
        margin: 0;
    }

    .review-now-btn {
        background: #4caf50;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 16px;
        transition: all 0.3s ease;
    }

    .review-now-btn:hover {
        background: #45a049;
        transform: translateY(-1px);
    }
`;
document.head.appendChild(style);

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