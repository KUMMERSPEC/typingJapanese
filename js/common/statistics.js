class Statistics {
    static STORAGE_KEY = 'typing_statistics';

    static getStatistics() {
        const stats = localStorage.getItem(this.STORAGE_KEY);
        if (!stats) {
            return this.initializeStats();
        }
        return JSON.parse(stats);
    }

    static initializeStats() {
        const initialStats = {
            firstUseDate: new Date().toISOString(),
            lastStudyDate: new Date().toLocaleDateString(),
            consecutiveDays: 1,
            dailyStats: {},
            completedQuestions: {}
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
            }

            // 更新学习天数
            if (stats.lastStudyDate !== today) {
                stats.consecutiveDays = this.isConsecutiveDay(stats.lastStudyDate) ? stats.consecutiveDays + 1 : 1;
                stats.lastStudyDate = today;
            }

            // 更新今天学习的句子数量
            stats.dailyStats[today].sentencesLearned += splitQuestionCount;

            // 记录课程完成情况
            if (!stats.dailyStats[today].completedLessons) {
                stats.dailyStats[today].completedLessons = {};
            }
            stats.dailyStats[today].completedLessons[`${courseKey}`] = splitQuestionCount;
            
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stats));
            return stats;
        } catch (error) {
            console.error('Error updating statistics:', error);
            return null;
        }
    }

    static isConsecutiveDay(lastDate) {
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
        return stats.consecutiveDays || 1;
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