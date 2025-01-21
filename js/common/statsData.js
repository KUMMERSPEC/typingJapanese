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
        return stats.totalSentences || 0;
    }

    // 获取待复习数量
    getReviewItems(options = {}) {
        try {
            const stats = this.getStatistics();
            if (!stats.reviewHistory) return [];

            const now = new Date();
            let items = Object.entries(stats.reviewHistory)
                .filter(([_, item]) => new Date(item.nextReviewDate) <= now)
                .map(([id, item]) => ({
                    id,
                    ...item
                }));

            // 如果设置了专注薄弱项
            if (options.focusWeak) {
                items.sort((a, b) => {
                    const proficiencyOrder = { low: 0, medium: 1, high: 2, master: 3 };
                    return proficiencyOrder[a.proficiency] - proficiencyOrder[b.proficiency];
                });
            }

            // 如果设置了随机顺序
            if (options.random) {
                items.sort(() => Math.random() - 0.5);
            }

            return items;
        } catch (error) {
            console.error('Error getting review items:', error);
            return [];
        }
    }

    // 获取掌握情况统计
    getMasteryStats() {
        try {
            const stats = this.getStatistics();
            const masteryStats = {
                low: 0,
                medium: 0,
                high: 0,
                master: 0
            };

            // 从复习历史中统计掌握情况
            if (stats.reviewHistory) {
                Object.values(stats.reviewHistory).forEach(item => {
                    if (item && item.proficiency) {
                        masteryStats[item.proficiency] = (masteryStats[item.proficiency] || 0) + 1;
                    }
                });
            }

            console.log('Calculated mastery stats:', masteryStats);
            return masteryStats;
        } catch (error) {
            console.error('Error calculating mastery stats:', error);
            return { low: 0, medium: 0, high: 0, master: 0 };
        }
    }

    // 获取统计数据
    getStatistics() {
        try {
            const statsStr = localStorage.getItem(STATS_STORAGE_KEY);
            let stats = statsStr ? JSON.parse(statsStr) : {};
            
            // 初始化基本属性
            stats.totalSentences = stats.totalSentences || 0;
            stats.dailyStats = stats.dailyStats || {};
            stats.reviewHistory = stats.reviewHistory || {};
            
            // 只在非更新状态时计算 masteryStats
            if (!this._isUpdating) {
                stats.masteryStats = this.calculateMasteryStats(stats);
            }
            
            return stats;
        } catch (error) {
            console.error('Error getting statistics:', error);
            return {
                totalSentences: 0,
                dailyStats: {},
                reviewHistory: {},
                masteryStats: { low: 0, medium: 0, high: 0, master: 0 }
            };
        }
    }

    // 新增：计算总句子数的方法
    calculateTotalSentences(stats) {
        if (!stats.dailyStats) return 0;
        
        return Object.values(stats.dailyStats).reduce((total, day) => {
            return Math.max(total, day.totalSentences || 0);
        }, 0);
    }

    // 新增：计算掌握情况的方法
    calculateMasteryStats(stats) {
        const masteryStats = {
            low: 0,
            medium: 0,
            high: 0,
            master: 0
        };

        if (stats.reviewHistory) {
            Object.values(stats.reviewHistory).forEach(item => {
                if (item && item.proficiency) {
                    masteryStats[item.proficiency] = (masteryStats[item.proficiency] || 0) + 1;
                }
            });
        }

        return masteryStats;
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

    // 添加更新复习进度的方法
    updateReviewProgress(questionId, isCorrect) {
        try {
            let stats = this.getStatistics();
            if (!stats.reviewHistory || !stats.reviewHistory[questionId]) {
                return;
            }

            const item = stats.reviewHistory[questionId];
            const now = new Date();

            // 更新复习次数
            item.reviewCount = (item.reviewCount || 0) + 1;

            // 根据答题结果更新熟练度
            if (isCorrect) {
                switch (item.proficiency) {
                    case 'low':
                        item.proficiency = 'medium';
                        break;
                    case 'medium':
                        item.proficiency = 'high';
                        break;
                    case 'high':
                        item.proficiency = 'master';
                        break;
                }
            } else {
                // 答错时降低熟练度
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
                }
            }

            // 计算下次复习时间
            const interval = REVIEW_INTERVALS[item.proficiency][isCorrect ? 'success' : 'failure'];
            item.lastReview = now.toISOString();
            item.nextReviewDate = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000).toISOString();

            // 保存更新后的统计数据
            localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
            
            return item;
        } catch (error) {
            console.error('Error updating review progress:', error);
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
            stats.masteryStats = this.calculateMasteryStats(stats);

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

    // 修改：获取待复习项目
    getReviewItems() {
        const stats = this.getStatistics();
        if (!stats.reviewHistory) return [];

        const now = new Date();
        return Object.entries(stats.reviewHistory)
            .filter(([_, item]) => new Date(item.nextReviewDate) <= now)
            .map(([id, item]) => ({
                id,
                sentence: item.sentence,
                hiragana: item.hiragana,
                romaji: item.romaji,
                meaning: item.meaning,
                proficiency: item.proficiency
            }));
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

    // 修改现有的 updateDisplay 方法，添加图表更新
    updateDisplay() {
        try {
            const stats = this.getStatistics();
            console.log('Updating display with stats:', {
                totalSentences: stats.totalSentences,
                stats: stats
            });

            // 更新总句子数显示
            const totalSentencesElement = document.getElementById('totalSentences');
            if (totalSentencesElement) {
                totalSentencesElement.textContent = stats.totalSentences || 0;
                console.log('Updated totalSentences display to:', stats.totalSentences);
            } else {
                console.log('totalSentences element not found');
            }

            // 更新学习天数
            const learningDaysElement = document.querySelector('.learning-days');
            if (learningDaysElement) {
                learningDaysElement.textContent = stats.consecutiveDays || 0;
            }

            // 更新已学句子数
            const learnedSentencesElement = document.querySelector('.learned-sentences');
            if (learnedSentencesElement) {
                learnedSentencesElement.textContent = stats.totalSentences || 0;
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

            // 更新统计面板
            const masteryStats = this.getMasteryStats();
            ['low', 'medium', 'high', 'master'].forEach(level => {
                const element = document.getElementById(`mastery${level.charAt(0).toUpperCase() + level.slice(1)}`);
                if (element) {
                    element.textContent = masteryStats[level] || 0;
                }
            });

            // 更新学习趋势图表
            this.updateTrendChart();
        } catch (error) {
            console.error('Error in updateDisplay:', error);
        }
    }
}

export default new Statistics(); 