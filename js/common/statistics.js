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
            
            // 更新总句子数
            if (!stats.totalSentences) {
                stats.totalSentences = this.getLearnedSentences();
            }
            stats.totalSentences += splitQuestionCount;

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
        
        // 返回总的已学句子数
        if (stats.totalSentences !== undefined) {
            return stats.totalSentences;
        }
        
        // 如果没有 totalSentences，计算所有天数的总和
        let total = 0;
        Object.values(stats.dailyStats || {}).forEach(dayStats => {
            total += dayStats.sentencesLearned || 0;
        });
        
        // 更新 totalSentences
        stats.totalSentences = total;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stats));
        
        return total;
    }

    static getLearningDays() {
        const stats = this.getStatistics();
        // 确保返回值永远不会是 0
        return Math.max(stats.consecutiveDays || 1, 1);
    }

    static updateMasteryStats() {
        const stats = this.getStatistics();
        
        // 初始化掌握统计
        const masteryStats = { low: 0, medium: 0, high: 0, master: 0 };
        
        // 遍历 reviewHistory 中的所有句子
        if (stats.reviewHistory) {
            Object.values(stats.reviewHistory).forEach(item => {
                // 根据 proficiency 计数
                if (item.proficiency === 'low' || !item.proficiency) {
                    masteryStats.low++;
                } else if (item.proficiency === 'medium') {
                    masteryStats.medium++;
                } else if (item.proficiency === 'high') {
                    masteryStats.high++;
                } else if (item.proficiency === 'master') {
                    masteryStats.master++;
                } else {
                    // 如果没有 proficiency 或是新句子，默认为 low
                    masteryStats.low++;
                }
            });
        }

        // 检查总数是否与 totalSentences 一致
        const totalMastery = masteryStats.low + masteryStats.medium + 
                            masteryStats.high + masteryStats.master;
        
        console.log('掌握情况统计:', masteryStats);
        console.log('总句子数:', stats.totalSentences);
        console.log('掌握统计总数:', totalMastery);

        // 如果总数不一致，可能有新句子未计入
        if (totalMastery < stats.totalSentences) {
            // 将差值添加到 low 类别
            masteryStats.low += (stats.totalSentences - totalMastery);
        }

        // 更新统计数据
        stats.masteryStats = masteryStats;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stats));
        
        return masteryStats;
    }
}

export default Statistics; 

// 统计面板交互
document.addEventListener('DOMContentLoaded', () => {
    const statsButton = document.querySelector('[data-action="stats"]');
    const statsPanel = document.querySelector('.stats-panel');
    const statsOverlay = document.querySelector('.stats-overlay');
    const closeButton = document.querySelector('.stats-panel .close-btn');

    // 打开统计面板
    function openStatsPanel() {
        if (statsPanel) {
            statsPanel.classList.add('show');
            statsOverlay.classList.add('show');
            loadStatistics(); // 加载统计数据
        }
    }

    // 关闭统计面板
    function closeStatsPanel() {
        if (statsPanel) {
            statsPanel.classList.remove('show');
            statsOverlay.classList.remove('show');
            // 触发统计更新事件，确保主页面的数据保持最新
            window.dispatchEvent(new CustomEvent('statisticsUpdated'));
        }
    }

    // 加载统计数据
    function loadStatistics() {
        const stats = Statistics.getStatistics();
        // 更新掌握情况
        Statistics.updateMasteryStats();
        // 更新学习趋势
        updateLearningTrend(stats);
    }

    // 更新学习趋势
    function updateLearningTrend(stats) {
        const trendChart = document.getElementById('learningTrendChart');
        if (!trendChart) return;

        // 获取最近7天的数据
        const last7Days = [];
        const today = new Date();
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toLocaleDateString();
            const count = stats.dailyStats[dateStr]?.sentencesLearned || 0;
            
            // 格式化日期显示
            const displayDate = `${date.getMonth() + 1}/${date.getDate()}`;
            last7Days.push({
                date: displayDate,
                count: count
            });
        }

        // 准备图表数据
        const chartData = {
            labels: last7Days.map(day => day.date),
            datasets: [{
                label: '学习句子数',
                data: last7Days.map(day => day.count),
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        };

        // 如果已经有图表实例，先销毁它
        if (window.learningTrendChart) {
            window.learningTrendChart.destroy();
        }

        // 创建新的图表
        window.learningTrendChart = new Chart(trendChart, {
            type: 'bar',
            data: chartData,
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '句子数量'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: '日期'
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: '最近7天学习趋势'
                    }
                }
            }
        });
    }

    // 事件监听
    if (statsButton) {
        statsButton.addEventListener('click', openStatsPanel);
    }
    if (closeButton) {
        closeButton.addEventListener('click', closeStatsPanel);
    }
    if (statsOverlay) {
        statsOverlay.addEventListener('click', (e) => {
            if (e.target === statsOverlay) {
                closeStatsPanel();
            }
        });
    }

    // ESC键关闭面板
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && statsPanel && statsPanel.classList.contains('show')) {
            closeStatsPanel();
        }
    });
}); 