class Statistics {
    static STORAGE_KEY = 'typing_statistics';

    static getStatistics() {
        const stats = localStorage.getItem(this.STORAGE_KEY);
        if (!stats) {
            return this.initializeStats();
        }
        const parsedStats = JSON.parse(stats);
        
        // 确保 consecutiveDays 不会被重置为 0
        if (!parsedStats.consecutiveDays) {
            parsedStats.consecutiveDays = 1;
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(parsedStats));
        }
        
        return parsedStats;
    }

    static initializeStats() {
        const initialStats = {
            firstUseDate: new Date().toISOString(),
            lastStudyDate: new Date().toLocaleDateString(),
            consecutiveDays: 1,
            dailyStats: {},
            completedLessons: {},
            totalSentences: 0
        };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(initialStats));
        return initialStats;
    }

    static updateStatistics(courseKey, lesson, splitQuestionCount) {
        try {
            const today = new Date().toLocaleDateString();
            let stats = this.getStatistics();
            
            // 初始化今日统计
            if (!stats.dailyStats[today]) {
                stats.dailyStats[today] = {
                    sentencesLearned: 0,
                    completedLessons: {}
                };
                
                // 如果是新的一天，更新连续学习天数
                if (stats.lastStudyDate !== today) {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yesterdayStr = yesterday.toLocaleDateString();
                    
                    // 保持现有的连续天数，除非确实中断了
                    if (!stats.dailyStats[yesterdayStr]) {
                        stats.consecutiveDays = 1;
                    }
                }
            }

            // 更新今天学习的句子数量
            stats.dailyStats[today].sentencesLearned += splitQuestionCount;
            stats.totalSentences = (stats.totalSentences || 0) + splitQuestionCount;

            // 记录课程完成情况
            if (!stats.dailyStats[today].completedLessons) {
                stats.dailyStats[today].completedLessons = {};
            }
            stats.dailyStats[today].completedLessons[`${courseKey}`] = splitQuestionCount;
            
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stats));

            // 触发统计更新事件
            window.dispatchEvent(new CustomEvent('statisticsUpdated', {
                detail: { stats }
            }));

            return stats;
        } catch (error) {
            console.error('Error updating statistics:', error);
            return null;
        }
    }

    static isConsecutiveDay(lastDate) {
        if (!lastDate) return false;
        const last = new Date(lastDate);
        const today = new Date();
        const diffTime = Math.abs(today - last);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays === 1;
    }

    static getLearnedSentences() {
        const stats = this.getStatistics();
        const today = new Date().toLocaleDateString();
        return stats.dailyStats[today]?.sentencesLearned || 0;
    }

    static getLearningDays() {
        const stats = this.getStatistics();
        // 确保返回值永远不会是 0
        return Math.max(stats.consecutiveDays || 1, 1);
    }

    static updateMasteryStats() {
        const stats = this.getStatistics();
        const reviewData = JSON.parse(localStorage.getItem('typing_statistics') || '{}');
        
        // 初始化掌握统计
        if (!stats.masteryStats) {
            stats.masteryStats = { low: 0, medium: 0, high: 0 };
        }
        
        // 重新计算掌握情况
        const masteryStats = { low: 0, medium: 0, high: 0 };
        
        // 遍历所有句子
        Object.values(reviewData.sentences || {}).forEach(item => {
            // 根据 proficiency 计数
            if (item.proficiency === 'low' || !item.proficiency) {
                masteryStats.low++;
            } else if (item.proficiency === 'medium') {
                masteryStats.medium++;
            } else if (item.proficiency === 'high') {
                masteryStats.high++;
            }
        });
        
        stats.masteryStats = masteryStats;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stats));
        return masteryStats;
    }
}

export default Statistics; 

// 统计面板交互
document.addEventListener('DOMContentLoaded', () => {
    // 获取DOM元素
    const statsButton = document.querySelector('[data-action="stats"]');
    const statsOverlay = document.querySelector('.stats-overlay');
    const statsPanel = document.querySelector('.stats-panel');
    const closeButton = document.querySelector('.stats-close');

    // 打开统计面板
    function openStatsPanel() {
        statsOverlay.classList.add('show');
        statsPanel.classList.add('show');
        document.body.classList.add('stats-open');
        loadStatistics(); // 加载统计数据
    }

    // 关闭统计面板
    function closeStatsPanel() {
        statsOverlay.classList.remove('show');
        statsPanel.classList.remove('show');
        document.body.classList.remove('stats-open');
    }

    // 加载统计数据
    function loadStatistics() {
        // 这里添加加载数据的逻辑
        updateLearningTrend();
        updateMasteryStatus();
    }

    // 更新学习趋势
    function updateLearningTrend() {
        const trendChart = document.getElementById('learningTrendChart');
        // 这里添加图表绘制逻辑
    }

    // 更新掌握情况
    function updateMasteryStatus() {
        // 这里添加更新掌握状态的逻辑
    }

    // 事件监听
    statsButton.addEventListener('click', openStatsPanel);
    closeButton.addEventListener('click', closeStatsPanel);
    statsOverlay.addEventListener('click', (e) => {
        if (e.target === statsOverlay) {
            closeStatsPanel();
        }
    });

    // ESC键关闭面板
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && statsPanel.classList.contains('show')) {
            closeStatsPanel();
        }
    });
}); 