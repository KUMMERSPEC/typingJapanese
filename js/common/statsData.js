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
        const stats = this.getStatistics();
        const masteryStats = { low: 0, medium: 0, high: 0, master: 0 };

        if (stats.reviewHistory) {
            Object.values(stats.reviewHistory).forEach(item => {
                masteryStats[item.proficiency] = (masteryStats[item.proficiency] || 0) + 1;
            });
        }

        return masteryStats;
    }

    // 获取统计数据
    getStatistics() {
        // 如果已经有缓存的统计数据，直接返回
        if (this._stats) {
            return this._stats;
        }

        try {
            const statsJson = localStorage.getItem(STATS_STORAGE_KEY);
            if (!statsJson) {
                return this.initializeStats();
            }

            const stats = JSON.parse(statsJson);
            // 缓存统计数据
            this._stats = {
                firstUseDate: stats.firstUseDate || new Date().toISOString(),
                lastStudyDate: stats.lastStudyDate || '',
                consecutiveDays: stats.consecutiveDays || 0,
                dailyStats: stats.dailyStats || {},
                totalSentences: this.calculateTotalSentences(stats),
                completedQuestions: stats.completedQuestions || [],
                reviewHistory: stats.reviewHistory || {},
                masteryStats: this.calculateMasteryStats(stats)
            };

            return this._stats;
        } catch (error) {
            console.error('Error getting statistics:', error);
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

    // 新增：计算掌握情况的方法
    calculateMasteryStats(stats) {
        const masteryStats = { low: 0, medium: 0, high: 0, master: 0 };
        
        if (stats.reviewHistory) {
            Object.values(stats.reviewHistory).forEach(item => {
                masteryStats[item.proficiency] = (masteryStats[item.proficiency] || 0) + 1;
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
            // 更新缓存
            this._stats = stats;
            localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
            // 触发显示更新
            this.updateDisplay();
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
    updateDailyStats(lessonId, sentenceCount, sentences = []) {
        console.log('Updating daily stats with:', { lessonId, sentenceCount, sentences }); // 调试日志
        
        const stats = this.getStatistics();
        const today = new Date().toLocaleDateString();

        // 初始化数据结构
        if (!stats.dailyStats) stats.dailyStats = {};
        if (!stats.reviewHistory) stats.reviewHistory = {};
        if (!stats.dailyStats[today]) {
            stats.dailyStats[today] = {
                totalSentences: 0,
                lessons: {}
            };
        }

        // 更新课程数据
        if (!stats.dailyStats[today].lessons[lessonId]) {
            stats.dailyStats[today].lessons[lessonId] = {
                count: 0,
                sentences: []
            };
        }

        // 更新句子数据和复习项
        stats.dailyStats[today].lessons[lessonId].count += sentenceCount;

        // 确保 sentences 是数组
        const sentencesArray = Array.isArray(sentences) ? sentences : [sentences];
        
        sentencesArray.forEach(sentence => {
            try {
                // 添加到今日学习的句子
                stats.dailyStats[today].lessons[lessonId].sentences.push(sentence);
                
                // 处理 split 类型的句子
                if (sentence && sentence.type === 'split' && Array.isArray(sentence.answers)) {
                    // 为每个答案创建复习项
                    sentence.answers.forEach(answer => {
                        const reviewId = `${sentence.character}_${answer}`;
                        if (!stats.reviewHistory[reviewId]) {
                            stats.reviewHistory[reviewId] = {
                                sentence: answer,
                                character: sentence.character,
                                hiragana: sentence.hiragana,
                                romaji: sentence.romaji,
                                meaning: sentence.meaning,
                                proficiency: 'low',
                                lastReview: new Date().toISOString(),
                                nextReviewDate: new Date().toISOString(),
                                reviewCount: 0
                            };
                        }
                    });
                } else {
                    console.log('Invalid sentence format:', sentence); // 调试日志
                }
            } catch (error) {
                console.error('Error processing sentence:', error, sentence);
            }
        });

        // 更新总句子数
        stats.dailyStats[today].totalSentences = 
            (stats.dailyStats[today].totalSentences || 0) + sentenceCount;
        stats.totalSentences = Math.max(
            stats.totalSentences || 0,
            stats.dailyStats[today].totalSentences
        );

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

        // 保存并更新显示
        this.saveStatistics(stats);
        this.updateDisplay();

        return stats;
    }

    // 修改：获取待复习项目
    getReviewItems() {
        const stats = this.getStatistics();
        if (!stats.reviewHistory) return [];

        const now = new Date();
        const reviewItems = Object.entries(stats.reviewHistory)
            .filter(([_, item]) => new Date(item.nextReviewDate) <= now)
            .map(([id, item]) => ({
                id,
                ...item
            }));

        console.log('Review items:', reviewItems); // 调试日志
        return reviewItems;
    }

    // 修改：更新显示方法
    updateDisplay() {
        const stats = this.getStatistics();
        console.log('Updating display with stats:', stats); // 调试日志

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
            reviewListElement.innerHTML = reviewItems.map(item => `
                <div class="review-item" data-id="${item.id}">
                    <div class="sentence-content">
                        <div class="japanese">${item.sentence}</div>
                        <div class="meaning">${item.meaning}</div>
                    </div>
                    <div class="proficiency ${item.proficiency}">${item.proficiency}</div>
                </div>
            `).join('');
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
    }
}

export default new Statistics(); 