/**
 * 用户学习统计功能模块
 */
import { getProgress, getHistory } from './storage.js';

const STATS_STORAGE_KEY = 'typing_statistics';

// 间隔复习算法配置
const REVIEW_INTERVALS = {
    low: {
        success: 1,     // 1天后复习
        failure: 0.5    // 12小时后复习
    },
    medium: {
        success: 3,     // 3天后复习
        failure: 1      // 1天后复习
    },
    high: {
        success: 7,     // 7天后复习
        failure: 3      // 3天后复习
    },
    master: {
        success: 14,    // 14天后复习
        failure: 7      // 7天后复习
    }
};

// 添加间隔调整配置
const INTERVAL_ADJUSTMENTS = {
    consecutiveCorrect: {
        3: 1.2,  // 连续正确3次，间隔延长20%
        5: 1.5,  // 连续正确5次，间隔延长50%
        7: 2.0   // 连续正确7次，间隔延长100%
    },
    responseTime: {
        fast: 1.2,    // 快速回答，间隔延长20%
        normal: 1.0,  // 正常速度
        slow: 0.8     // 慢速回答，间隔缩短20%
    },
    hintUsage: {
        none: 1.2,    // 不使用提示，间隔延长20%
        some: 1.0,    // 偶尔使用提示
        frequent: 0.8  // 频繁使用提示，间隔缩短20%
    }
};

/* 后续优化可能会用到的配置
const INTERVAL_ADJUSTMENTS = {
    consecutiveCorrect: {
        3: 1.2,  // 连续正确3次，间隔延长20%
        5: 1.5,  // 连续正确5次，间隔延长50%
        7: 2.0   // 连续正确7次，间隔延长100%
    },
    responseTime: {
        fast: 1.2,    // 快速回答，间隔延长20%
        normal: 1.0,  // 正常速度
        slow: 0.8     // 慢速回答，间隔缩短20%
    },
    hintUsage: {
        none: 1.2,    // 不使用提示，间隔延长20%
        some: 1.0,    // 偶尔使用提示
        frequent: 0.8  // 频繁使用提示，间隔缩短20%
    }
};
*/

class Statistics {
    constructor() {
        this._stats = null; // 添加缓存
        this._isUpdating = false; // 添加标志位防止循环
    }

    initializeStats() {
        const stats = localStorage.getItem(STATS_STORAGE_KEY);
        if (!stats) {
            const initialStats = {
                firstUseDate: new Date().toISOString(),
                lastStudyDate: '',
                consecutiveDays: 0,
                dailyStats: {},
                totalSentences: 0,
                completedQuestions: []
            };
            localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(initialStats));
            return initialStats;
        }
        return JSON.parse(stats);
    }

    // 获取学习天数
    getLearningDays() {
        const stats = this.getStatistics();
        const today = new Date().toLocaleDateString();
        
        // 如果今天有学习记录
        if (stats.dailyStats && stats.dailyStats[today]) {
            if (stats.lastStudyDate !== today) {
                // 检查是否是连续学习
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayString = yesterday.toLocaleDateString();
                
                stats.consecutiveDays = (stats.dailyStats[yesterdayString]) ? 
                    (stats.consecutiveDays || 0) + 1 : 1;
                    
                stats.lastStudyDate = today;
                this.saveStatistics(stats);
            }
            return stats.consecutiveDays || 1;
        }
        
        return stats.consecutiveDays || 0;
    }

    // 获取已学习的句子总数
    getLearnedSentences() {
        const stats = this.getStatistics();
        // 从复习历史中计算总句子数
        const reviewHistory = stats.reviewHistory || {};
        const totalSentences = Object.keys(reviewHistory).length;
        console.log('Calculating learned sentences:', {
            reviewHistory,
            totalSentences,
            storedTotal: stats.totalSentences
        });
        return totalSentences;
    }

    // 获取待复习数量
    getReviewItems(options = {}) {
        try {
            const stats = this.getStatistics();
            if (!stats.reviewHistory) return [];

            const now = new Date();
            let items = Object.entries(stats.reviewHistory)
                .map(([id, item]) => {
                    const status = this.getMasteryStatus(item);
                    return {
                        id,
                        ...item,
                        displayStatus: status.text,
                        statusClass: status.class,
                        needsReview: new Date(item.nextReviewDate) <= now
                    };
                });

            // 排序：需要复习的在前面
            items.sort((a, b) => {
                if (a.needsReview !== b.needsReview) {
                    return a.needsReview ? -1 : 1;
                }
                return new Date(a.nextReviewDate) - new Date(b.nextReviewDate);
            });

            return items;
        } catch (error) {
            console.error('获取复习项目出错:', error);
            return [];
        }
    }

    // 获取掌握情况统计
    getMasteryStats() {
        try {
            const stats = this.getStatistics();
            console.log('=== getMasteryStats 开始 ===');
            
            const masteryStats = {
                low: 0,
                medium: 0,
                high: 0,
                master: 0
            };

            // 从复习历史中统计掌握情况
            if (stats.reviewHistory) {
                Object.entries(stats.reviewHistory).forEach(([id, item]) => {
                    if (item) {
                        // 新句子计入 low 级别
                        if (!item.reviewCount) {
                            console.log(`${id}: 新句子，计入 low`);
                            masteryStats.low++;
                        } 
                        // 已有复习记录的句子按照当前掌握度统计
                        else if (item.proficiency) {
                            // master 级别的句子计入 high
                            if (item.proficiency === 'master') {
                                console.log(`${id}: master级别，计入high`);
                                masteryStats.high++;
                            } else {
                                console.log(`${id}: 掌握度 ${item.proficiency}`);
                                masteryStats[item.proficiency]++;
                            }
                        }
                    }
                });
            }

            console.log('掌握情况统计结果:', masteryStats);
            return masteryStats;
        } catch (error) {
            console.error('统计掌握情况出错:', error);
            return { low: 0, medium: 0, high: 0, master: 0 };
        }
    }

    // 获取统计数据
    getStatistics() {
        console.log('=== getStatistics 开始 ===');
        
        if (this._stats) {
            console.log('使用缓存的统计数据');
            return this._stats;
        }

        try {
            const rawData = localStorage.getItem(STATS_STORAGE_KEY);
            console.log('从 localStorage 读取的原始数据:', rawData);
            
            const stats = JSON.parse(rawData || '{}');
            console.log('解析后的统计数据:', stats);
            
            // 确保必要的属性存在
            if (!stats.reviewHistory) {
                console.log('初始化 reviewHistory');
                stats.reviewHistory = {};
            }
            if (!stats.completedLessons) {
                console.log('初始化 completedLessons');
                stats.completedLessons = {};
            }
            if (!stats.dailyStats) {
                console.log('初始化 dailyStats');
                stats.dailyStats = {};
            }
            
            // 重新计算总句子数
            stats.totalSentences = Object.keys(stats.reviewHistory).length;
            console.log('计算得到的总句子数:', stats.totalSentences);
            
            this._stats = stats;
            console.log('=== getStatistics 结束 ===');
            return stats;
        } catch (error) {
            console.error('加载统计数据出错:', error);
            return this.initializeStats();
        }
    }

    // 新增：计算总句子数的方法
    calculateTotalSentences(stats) {
        if (!stats.dailyStats) return 0;
        
        return Object.values(stats.dailyStats).reduce((total, day) => {
            return Math.max(total, day.totalSentences || 0);
        }, 0);
    }

    // 检查是否是连续天数
    isConsecutiveDay(lastDate) {
        if (!lastDate) return false;
        const last = new Date(lastDate);
        const today = new Date();
        const diffTime = Math.abs(today - last);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays === 1;
    }

    // 修改 updateReviewProgress 方法，确保数据正确保存和更新
    updateReviewProgress(questionId, isCorrect, options = {}) {
        try {
            console.log('=== updateReviewProgress 开始 ===');
            console.log('更新句子:', questionId);
            console.log('是否正确:', isCorrect);
            
            let stats = this.getStatistics();
            
            // 确保 reviewHistory 存在
            if (!stats.reviewHistory) {
                stats.reviewHistory = {};
            }
            
            // 如果句子不存在，初始化它
            if (!stats.reviewHistory[questionId]) {
                stats.reviewHistory[questionId] = {
                    proficiency: 'low',
                    reviewCount: 0,
                    correctCount: 0,
                    consecutiveCorrect: 0,
                    lastReview: null,
                    nextReviewDate: null
                };
            }

            const item = stats.reviewHistory[questionId];
            const now = new Date();

            // 更新基础统计
            item.reviewCount = (item.reviewCount || 0) + 1;
            if (isCorrect) {
                item.correctCount = (item.correctCount || 0) + 1;
                item.consecutiveCorrect = (item.consecutiveCorrect || 0) + 1;
            } else {
                item.consecutiveCorrect = 0;
            }

            // 更新掌握度
            const previousProficiency = item.proficiency;
            if (isCorrect) {
                switch (item.proficiency) {
                    case 'low':
                        if (item.consecutiveCorrect >= 2) {
                            item.proficiency = 'medium';
                        }
                        break;
                    case 'medium':
                        if (item.consecutiveCorrect >= 2) {
                            item.proficiency = 'high';
                        }
                        break;
                    case 'high':
                        if (item.consecutiveCorrect >= 3) {
                            item.proficiency = 'master';
                        }
                        break;
                    // master 状态保持不变
                }
            } else {
                // 答错时降级
                switch (item.proficiency) {
                    case 'master':
                        item.proficiency = 'high';
                        break;
                    case 'high':
                        item.proficiency = 'medium';
                        break;
                    case 'medium':
                        item.proficiency = 'low';
                        break;
                    // low 状态保持不变
                }
            }

            // 更新复习时间
            item.lastReview = now.toISOString();
            const interval = REVIEW_INTERVALS[item.proficiency][isCorrect ? 'success' : 'failure'];
            item.nextReviewDate = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000).toISOString();

            // 更新统计 - 直接使用 getMasteryStats
            stats.masteryStats = this.getMasteryStats();

            // 保存到 localStorage
            try {
                localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
                console.log('更新后的句子状态:', {
                    questionId,
                    proficiency: item.proficiency,
                    reviewCount: item.reviewCount,
                    correctCount: item.correctCount,
                    consecutiveCorrect: item.consecutiveCorrect,
                    nextReviewDate: item.nextReviewDate
                });
            } catch (e) {
                console.error('保存到 localStorage 失败:', e);
            }

            return item;
        } catch (error) {
            console.error('更新复习进度出错:', error);
            return null;
        }
    }

    // 添加获取待复习数量的方法
    getReviewCount() {
        try {
            const stats = this.getStatistics();
            if (!stats.reviewHistory) return 0;

            const now = new Date();
            return Object.values(stats.reviewHistory)
                .filter(item => new Date(item.nextReviewDate) <= now)
                .length;
        } catch (error) {
            console.error('Error getting review count:', error);
            return 0;
        }
    }

    saveStatistics(stats) {
        try {
            console.log('Saving stats with totalSentences:', stats.totalSentences);
            localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
            console.log('Stats saved successfully');
        } catch (error) {
            console.error('Error saving statistics:', error);
        }
    }

    // 修改添加学习记录方法
    addLearningRecord(sentences) {
        console.log('Starting addLearningRecord with:', {
            sentences,
            currentStats: this.getStatistics()
        });

        const stats = this.getStatistics();
        const today = new Date().toLocaleDateString();

        // 确保基础数据结构存在
        if (!stats.dailyStats) {
            stats.dailyStats = {};
        }
        if (!stats.completedQuestions) {
            stats.completedQuestions = [];
        }

        // 初始化或更新今天的数据
        if (!stats.dailyStats[today]) {
            stats.dailyStats[today] = {
                sentencesLearned: 0,
                studyTime: 0,
                lessons: {}  // 添加 lessons 对象
            };
        }

        // 更新句子数据
        const sentenceCount = Array.isArray(sentences) ? sentences.length : sentences;
        stats.dailyStats[today].sentencesLearned += sentenceCount;

        // 如果传入的是句子数组，更新完成的题目
        if (Array.isArray(sentences)) {
            sentences.forEach(sentence => {
                const sentenceId = typeof sentence === 'object' ? sentence.id : sentence;
                if (!stats.completedQuestions.includes(sentenceId)) {
                    stats.completedQuestions.push(sentenceId);
                }
            });
        }

        // 更新总句子数
        stats.totalSentences = stats.completedQuestions.length;

        // 更新连续学习天数
        if (stats.lastStudyDate !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayString = yesterday.toLocaleDateString();
            
            if (stats.lastStudyDate === yesterdayString) {
                stats.consecutiveDays = (stats.consecutiveDays || 0) + 1;
            } else {
                stats.consecutiveDays = 1;
            }
            stats.lastStudyDate = today;
        }

        // 保存前确保所有必要的字段都存在
        const finalStats = {
            ...stats,
            firstUseDate: stats.firstUseDate || new Date().toISOString(),
            totalSentences: stats.totalSentences || 0,
            consecutiveDays: stats.consecutiveDays || 0,
            dailyStats: stats.dailyStats || {},
            completedQuestions: stats.completedQuestions || [],
            lastStudyDate: stats.lastStudyDate || ''
        };

        // 保存更新后的统计数据
        console.log('Saving final stats:', finalStats);
        this.saveStatistics(finalStats);

        return finalStats;
    }

    // 修改：处理练习完成时的数据更新
    updateDailyStats(lessonId, splitCount, questions) {
        if (this._isUpdating) return null; // 防止重复调用
        
        try {
            this._isUpdating = true;
            let stats = this.getStatistics();
            const today = new Date().toLocaleDateString();

            // 初始化数据结构
            if (!stats.dailyStats[today]) {
                stats.dailyStats[today] = {
                    sentencesLearned: 0,
                    completedLessons: {}
                };
            }

            // 更新句子数量
            stats.totalSentences = (stats.totalSentences || 0) + splitCount;
            stats.dailyStats[today].sentencesLearned = 
                (stats.dailyStats[today].sentencesLearned || 0) + splitCount;

            // 更新复习记录
            if (questions && Array.isArray(questions)) {
                questions.forEach(question => {
                    if (!question) return;
                    const questionId = `${question.character}:${question.hiragana}`;
                    if (!stats.reviewHistory[questionId]) {
                        const [courseId, lessonName] = lessonId.split(':');
                        stats.reviewHistory[questionId] = {
                            japanese: question.character,
                            hiragana: question.hiragana,
                            meaning: question.meaning,
                            course: courseId,
                            lesson: lessonName,
                            lastReview: new Date().toISOString(),
                            nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                            proficiency: 'low'
                        };
                    }
                });
            }

            // 计算掌握情况
            stats.masteryStats = this.getMasteryStats();

            // 保存更新后的统计数据
            this.saveStatistics(stats);
            
            return stats;
        } catch (error) {
            console.error('Error in updateDailyStats:', error);
            return null;
        } finally {
            this._isUpdating = false; // 确保标志位被重置
        }
    }

    // 获取学习趋势数据
    getTrendData() {
        const stats = this.getStatistics();
        const trendData = {
            labels: [],
            data: []
        };

        if (stats.dailyStats) {
            // 获取最近7天的数据
            const today = new Date();
            for (let i = 6; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(today.getDate() - i);
                const dateStr = date.toLocaleDateString();
                
                trendData.labels.push(dateStr);
                const dailyStats = stats.dailyStats[dateStr];
                trendData.data.push(dailyStats ? dailyStats.totalSentences || 0 : 0);
            }
        }

        return trendData;
    }

    // 更新学习趋势图表
    updateTrendChart() {
        const chartElement = document.getElementById('learningTrendChart');
        if (!chartElement) return;

        const stats = this.getStatistics();
        const dailyData = {
            labels: [],
            data: []
        };

        // 获取最近7天的数据
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateStr = date.toLocaleDateString();
            
            dailyData.labels.push(dateStr);
            const dayStats = stats.dailyStats?.[dateStr];
            const count = dayStats ? (dayStats.totalSentences || 0) : 0;
            dailyData.data.push(count);
        }

        // 确保图表实例存在
        if (!window.learningTrendChart) {
            window.learningTrendChart = new Chart(chartElement, {
                type: 'line',
                data: {
                    labels: dailyData.labels,
                    datasets: [{
                        label: '每日学习句子数',
                        data: dailyData.data,
                        borderColor: '#4CAF50',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    }
                }
            });
        } else {
            // 更新现有图表
            window.learningTrendChart.data.labels = dailyData.labels;
            window.learningTrendChart.data.datasets[0].data = dailyData.data;
            window.learningTrendChart.update();
        }
    }

    // 修改 updateDisplay 方法，调整统计区域显示
    updateDisplay() {
        try {
            const stats = this.getStatistics();
            console.log('=== 更新显示 ===');

            // 获取最新的掌握情况统计
            const masteryStats = this.getMasteryStats();
            console.log('当前掌握情况:', masteryStats);

            // 更新统计面板显示
            const displayElements = {
                'master': { id: 'masteryMaster', label: '完全掌握' },
                'high': { id: 'masteryHigh', label: '熟练' },
                'medium': { id: 'masteryMedium', label: '基本掌握' },
                'low': { id: 'masteryLow', label: '需要加强' }
            };

            Object.entries(displayElements).forEach(([level, config]) => {
                const element = document.getElementById(config.id);
                if (element) {
                    const count = masteryStats[level] || 0;
                    element.textContent = count;
                    console.log(`更新 ${config.label} 数量: ${count}`);
                }
            });

            // 更新总句子数显示
            const totalSentencesElement = document.getElementById('totalSentences');
            const learnedSentencesElement = document.querySelector('.learned-sentences');
            const totalSentences = this.getLearnedSentences();

            if (totalSentencesElement) {
                totalSentencesElement.textContent = totalSentences;
                console.log('Updated totalSentences display to:', totalSentences);
            }

            if (learnedSentencesElement) {
                learnedSentencesElement.textContent = totalSentences;
                console.log('Updated learnedSentences display to:', totalSentences);
            }

            // 更新学习天数
            const learningDaysElement = document.querySelector('.learning-days');
            if (learningDaysElement) {
                learningDaysElement.textContent = stats.consecutiveDays || 0;
            }

            // 更新待复习列表
            const reviewItems = this.getReviewItems();
            const reviewListElement = document.querySelector('.review-list');
            if (reviewListElement) {
                reviewListElement.innerHTML = reviewItems.map(item => {
                    // 使用课程和句子的完整信息
                    const lessonPrefix = item.lessonId ? `[${item.lessonId}] ` : '';
                    return `
                        <div class="review-item" data-id="${item.id}">
                            <div class="sentence-content">
                                <div class="japanese">${lessonPrefix}${item.sentence}</div>
                                <div class="hiragana">${item.hiragana || ''}</div>
                                <div class="meaning">${item.meaning || ''}</div>
                            </div>
                        </div>
                    `;
                }).join('');
            }

            // 更新待复习数量
            const reviewItemsElement = document.querySelector('.review-items');
            if (reviewItemsElement) {
                reviewItemsElement.textContent = reviewItems.length;
            }

            // 更新学习趋势图表
            this.updateTrendChart();
        } catch (error) {
            console.error('更新显示出错:', error);
        }
    }

    // 修改 getMasteryStatus 方法，强制显示 master 级别句子的状态
    getMasteryStatus(item) {
        console.log('获取状态:', item);
        
        // 如果是新句子（没有复习记录）
        if (!item || !item.reviewCount) {
            return { text: '生疏', class: 'status-new' };
        }
        
        // 特殊处理 master 级别的句子 - 无论何种情况都显示为"熟练"
        if (item.proficiency === 'master') {
            console.log('发现 master 级别句子，强制显示为熟练');
            return { text: '熟练', class: 'status-high' };
        }

        // 检查是否需要复习
        const nextReview = new Date(item.nextReviewDate);
        const now = new Date();
        const lastReview = item.lastReview ? new Date(item.lastReview) : null;
        
        // 如果是今天刚复习过的，优先显示掌握状态
        if (lastReview && lastReview.toDateString() === now.toDateString()) {
            switch (item.proficiency) {
                case 'high':
                    return { text: '熟练', class: 'status-high' };
                case 'medium':
                    return { text: '基本掌握', class: 'status-medium' };
                case 'low':
                    return { text: '需要加强', class: 'status-low' };
                default:
                    return { text: '未知', class: 'status-unknown' };
            }
        }

        // 如果已经到了复习时间，显示"待复习"
        if (nextReview <= now) {
            return { text: '待复习', class: 'status-review' };
        }

        // 其他情况显示当前掌握状态
        switch (item.proficiency) {
            case 'high':
                return { text: '熟练', class: 'status-high' };
            case 'medium':
                return { text: '基本掌握', class: 'status-medium' };
            case 'low':
                return { text: '需要加强', class: 'status-low' };
            default:
                return { text: '未知', class: 'status-unknown' };
        }
    }

    // 更新复习列表显示的代码
    updateReviewList(items) {
        const reviewList = document.querySelector('.review-list');
        if (!reviewList) return;

        if (items.length === 0) {
            reviewList.innerHTML = '<div class="empty-message">没有需要复习的句子</div>';
            return;
        }

        reviewList.innerHTML = items.map(item => {
            // 获取最新状态
            const status = this.getMasteryStatus(item);
            return `
                <div class="review-item ${status.class}">
                    <div class="sentence-content">
                        <div class="sentence">${item.sentence || item.japanese}</div>
                        <div class="meaning">${item.meaning}</div>
                        <div class="status">${status.text}</div>
                        <div class="next-review">下次：${this.formatDate(item.nextReviewDate)}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // 更新每日统计
    updateDailyStats() {
        const stats = this.getStatistics();
        const today = new Date().toISOString().split('T')[0];
        
        // 初始化每日统计
        if (!stats.dailyStats) {
            stats.dailyStats = {};
        }
        
        // 更新今天的记录
        if (!stats.dailyStats[today]) {
            stats.dailyStats[today] = {
                sentencesLearned: 0,
                reviewCount: 0,
                lastUpdated: new Date().toISOString()
            };
        }

        // 计算连续学习天数
        let consecutiveDays = 1; // 今天算一天
        const dates = Object.keys(stats.dailyStats).sort();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        for (let i = dates.length - 1; i >= 0; i--) {
            if (dates[i] === yesterdayStr) {
                consecutiveDays++;
                break;
            }
        }

        stats.consecutiveDays = consecutiveDays;
        localStorage.setItem('typing_statistics', JSON.stringify(stats));

        // 触发统计更新事件
        window.dispatchEvent(new CustomEvent('statisticsUpdated', {
            detail: { stats }
        }));
    },

    // 记录学习的句子
    recordSentenceLearned(sentenceId) {
        const stats = this.getStatistics();
        const today = new Date().toISOString().split('T')[0];

        // 初始化数据结构
        if (!stats.learnedSentences) stats.learnedSentences = {};
        if (!stats.dailyStats) stats.dailyStats = {};
        if (!stats.dailyStats[today]) {
            stats.dailyStats[today] = {
                sentencesLearned: 0,
                reviewCount: 0,
                lastUpdated: new Date().toISOString()
            };
        }

        // 记录新学习的句子
        if (!stats.learnedSentences[sentenceId]) {
            stats.learnedSentences[sentenceId] = {
                firstLearned: new Date().toISOString(),
                lastReviewed: new Date().toISOString()
            };
            stats.dailyStats[today].sentencesLearned++;
        }

        this.updateDailyStats();
        localStorage.setItem('typing_statistics', JSON.stringify(stats));
    },

    // 获取连续学习天数
    getConsecutiveDays() {
        const stats = this.getStatistics();
        return stats.consecutiveDays || 0;
    }
}

export default new Statistics(); 