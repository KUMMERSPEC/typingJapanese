/**
 * 用户学习统计功能模块
 */
import { getProgress, getHistory } from './storage.js';

const STATS_STORAGE_KEY = 'learningStats';

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
        this.STATS_STORAGE_KEY = 'learningStats';
    }

    initializeStats() {
        const stats = localStorage.getItem(STATS_STORAGE_KEY);
        if (!stats) {
            const initialStats = {
                firstUseDate: new Date().toISOString(),
                lastStudyDate: new Date().toLocaleDateString(),
                consecutiveDays: 1,
                dailyStats: {},
                completedQuestions: {},
                totalSentences: 0,
                reviewHistory: {}
            };
            localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(initialStats));
        }
    }

    // 获取学习天数
    getLearningDays() {
        const stats = this.getStatistics();
        if (!stats.dailyStats) return 0;

        // 获取所有学习日期并排序
        const learningDates = Object.keys(stats.dailyStats).sort();
        if (learningDates.length === 0) return 0;

        // 获取最近的学习记录
        const today = new Date().toLocaleDateString();
        const lastLearningDate = learningDates[learningDates.length - 1];

        // 如果今天没有学习，返回之前的连续天数
        if (!stats.dailyStats[today]) {
            return stats.consecutiveDays || 0;
        }

        // 如果是新的一天学习，增加连续天数
        if (stats.lastStudyDate !== today) {
            stats.consecutiveDays = this.isConsecutiveDay(stats.lastStudyDate) ? 
                (stats.consecutiveDays || 0) + 1 : 1;
            stats.lastStudyDate = today;
            this.saveStatistics(stats);
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

    // 更新今日学习统计
    updateDailyStats(lessonId, sentenceCount, sentences = []) {
        const stats = this.getStatistics();
        const today = new Date().toISOString().split('T')[0];

        // 初始化每日统计
        if (!stats.dailyStats) {
            stats.dailyStats = {};
        }

        // 初始化今日数据
        if (!stats.dailyStats[today]) {
            stats.dailyStats[today] = {
                totalSentences: 0,
                lessons: {},
                lastUpdate: new Date().toISOString()
            };
        }

        // 更新今日数据
        stats.dailyStats[today].totalSentences += sentenceCount;
        if (!stats.dailyStats[today].lessons[lessonId]) {
            stats.dailyStats[today].lessons[lessonId] = {
                count: 0,
                sentences: []
            };
        }
        stats.dailyStats[today].lessons[lessonId].count += sentenceCount;
        stats.dailyStats[today].lessons[lessonId].sentences.push(...sentences);
        stats.dailyStats[today].lastUpdate = new Date().toISOString();

        // 保存更新后的统计数据
        this.saveStatistics(stats);

        return stats.dailyStats[today].totalSentences;
    }

    // 获取掌握情况统计
    getMasteryStats() {
        const stats = localStorage.getItem(STATS_STORAGE_KEY);
        if (!stats) {
            return { low: 0, medium: 0, high: 0, master: 0 };
        }
        const parsedStats = JSON.parse(stats);
        let low = 0, medium = 0, high = 0, master = 0;

        // 从复习历史中统计掌握情况
        if (parsedStats.reviewHistory) {
            Object.values(parsedStats.reviewHistory).forEach(item => {
                switch (item.proficiency) {
                    case 'low':
                        low++;
                        break;
                    case 'medium':
                        medium++;
                        break;
                    case 'high':
                        high++;
                        break;
                    case 'master':
                        master++;
                        break;
                }
            });
        }

        return { low, medium, high, master };
    }

    // 获取统计数据
    getStatistics() {
        const stats = localStorage.getItem(STATS_STORAGE_KEY);
        return stats ? JSON.parse(stats) : {
            dailyStats: {},
            lastStudyDate: '',
            consecutiveDays: 0,
            totalSentences: 0,
            reviewHistory: {} // 确保有复习历史字段
        };
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
        localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
    }

    // 修改添加学习记录方法
    addLearningRecord(sentences) {
        const stats = this.getStatistics();
        const today = new Date().toLocaleDateString();

        // 初始化今天的数据
        if (!stats.dailyStats[today]) {
            stats.dailyStats[today] = {
                sentencesLearned: 0,
                studyTime: 0
            };
        }

        // 更新今天的学习数据
        stats.dailyStats[today].sentencesLearned += sentences.length;
        stats.totalSentences += sentences.length;

        // 更新连续学习天数
        if (stats.lastStudyDate !== today) {
            stats.consecutiveDays = this.isConsecutiveDay(stats.lastStudyDate) ? 
                (stats.consecutiveDays || 0) + 1 : 1;
            stats.lastStudyDate = today;
        }

        // 添加句子到复习历史
        sentences.forEach(sentence => {
            if (!stats.reviewHistory[sentence.id]) {
                stats.reviewHistory[sentence.id] = {
                    sentence: sentence.text,
                    translation: sentence.translation,
                    nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24小时后复习
                    proficiency: 'low',
                    reviewCount: 0
                };
            }
        });

        // 保存更新后的统计数据
        this.saveStatistics(stats);
        this.updateDisplay();
    }

    // 更新显示方法
    updateDisplay() {
        const stats = this.getStatistics();
        
        // 更新学习天数显示
        const learningDaysElement = document.querySelector('.learning-days');
        if (learningDaysElement) {
            learningDaysElement.textContent = stats.consecutiveDays || 0;
        }

        // 更新已学句子数显示
        const learnedSentencesElement = document.querySelector('.learned-sentences');
        if (learnedSentencesElement) {
            learnedSentencesElement.textContent = stats.totalSentences || 0;
        }

        // 更新待复习数量显示
        const reviewItemsElement = document.querySelector('.review-items');
        if (reviewItemsElement) {
            reviewItemsElement.textContent = this.getReviewCount();
        }
    }
}

export default new Statistics(); 