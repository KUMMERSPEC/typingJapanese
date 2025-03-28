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
        console.log('开始更新掌握情况统计');
        console.log('原始统计数据:', stats);
        
        // 初始化掌握统计
        const masteryStats = { low: 0, medium: 0, high: 0, master: 0 };
        
        // 遍历 reviewHistory 中的所有句子
        if (stats.reviewHistory) {
            console.log('处理 reviewHistory 中的句子');
            Object.entries(stats.reviewHistory).forEach(([key, item]) => {
                console.log('处理句子:', key);
                console.log('句子数据:', item);
                
                // 根据 proficiency 计数
                if (item.proficiency === 'low' || !item.proficiency) {
                    masteryStats.low++;
                    console.log('添加到 low，当前 low 数量:', masteryStats.low);
                } else if (item.proficiency === 'medium') {
                    masteryStats.medium++;
                    console.log('添加到 medium，当前 medium 数量:', masteryStats.medium);
                } else if (item.proficiency === 'high') {
                    masteryStats.high++;
                    console.log('添加到 high，当前 high 数量:', masteryStats.high);
                } else if (item.proficiency === 'master') {
                    masteryStats.master++;
                    console.log('添加到 master，当前 master 数量:', masteryStats.master);
                } else {
                    masteryStats.low++;
                    console.log('未知 proficiency，添加到 low，当前 low 数量:', masteryStats.low);
                }
            });
        }

        // 检查总数是否与 totalSentences 一致
        const totalMastery = masteryStats.low + masteryStats.medium + 
                            masteryStats.high + masteryStats.master;
        
        console.log('当前掌握情况统计:', masteryStats);
        console.log('总句子数:', stats.totalSentences);
        console.log('掌握统计总数:', totalMastery);

        // 如果总数不一致，可能有新句子未计入
        if (totalMastery < stats.totalSentences) {
            const diff = stats.totalSentences - totalMastery;
            console.log('发现未计入的句子数量:', diff);
            // 将差值添加到 low 类别
            masteryStats.low += diff;
            console.log('更新后的 low 数量:', masteryStats.low);
        }

        // 更新统计数据
        stats.masteryStats = masteryStats;
        console.log('最终掌握情况统计:', masteryStats);
        
        // 保存更新后的统计数据
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stats));
        
        // 更新 DOM 中的显示
        const masteryLowElement = document.getElementById('masteryLow');
        const masteryMediumElement = document.getElementById('masteryMedium');
        const masteryHighTotalElement = document.getElementById('masteryHighTotal');
        
        if (masteryLowElement) masteryLowElement.textContent = masteryStats.low;
        if (masteryMediumElement) masteryMediumElement.textContent = masteryStats.medium;
        if (masteryHighTotalElement) {
            // 将 high 和 master 的数量加在一起显示在"完全掌握"区域
            const totalHighMastery = masteryStats.high + masteryStats.master;
            console.log('完全掌握总数:', totalHighMastery, '(high:', masteryStats.high, 'master:', masteryStats.master, ')');
            masteryHighTotalElement.textContent = totalHighMastery;
        }
        
        return masteryStats;
    }
}

export default Statistics; 

// 将关闭函数设置为全局函数
window.closeStatsPanel = function() {
    console.log('执行全局 closeStatsPanel');
    const statsPanel = document.getElementById('statsPanel');
    const overlay = document.querySelector('.overlay');
    
    if (statsPanel) {
        console.log('找到统计面板，准备关闭');
        statsPanel.classList.remove('show');
        if (overlay) {
            overlay.classList.remove('show');
            // 添加过渡结束事件监听
            overlay.addEventListener('transitionend', function handler() {
                overlay.style.display = 'none';
                statsPanel.style.display = 'none';
                overlay.removeEventListener('transitionend', handler);
            });
        } else {
            statsPanel.style.display = 'none';
        }
        // 触发统计更新事件
        window.dispatchEvent(new CustomEvent('statisticsUpdated'));
    } else {
        console.error('未找到统计面板元素');
    }
};

// 统计面板交互
document.addEventListener('DOMContentLoaded', () => {
    const statsButton = document.querySelector('[data-action="stats"]');
    const statsPanel = document.querySelector('.stats-panel');
    const overlay = document.querySelector('.overlay');
    const closeButton = document.querySelector('.stats-panel-header .close-btn');

    // 显示统计面板
    function openStatsPanel() {
        console.log('打开统计面板');
        const statsPanel = document.getElementById('statsPanel');
        const overlay = document.querySelector('.overlay');
        
        if (statsPanel) {
            // 先设置 display
            statsPanel.style.display = 'flex';
            if (overlay) {
                overlay.style.display = 'block';
            }
            // 强制重排
            statsPanel.offsetHeight;
            // 然后添加 show 类触发动画
            statsPanel.classList.add('show');
            if (overlay) {
                overlay.classList.add('show');
            }
            loadStatistics();
        }
    }

    // 加载统计数据
    function loadStatistics() {
        console.log('开始加载统计数据');
        const stats = Statistics.getStatistics();
        console.log('获取到的统计数据:', stats);
        
        // 更新掌握情况
        const masteryStats = Statistics.updateMasteryStats();
        console.log('更新后的掌握情况:', masteryStats);
        
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

    // 为关闭按钮添加事件监听
    if (closeButton) {
        console.log('找到关闭按钮，添加点击事件');
        closeButton.addEventListener('click', (e) => {
            console.log('点击关闭按钮');
            e.preventDefault();
            window.closeStatsPanel();
        });
    } else {
        console.error('未找到关闭按钮');
    }

    // 点击遮罩层关闭面板
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                window.closeStatsPanel();
            }
        });
    }

    // ESC键关闭面板
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && statsPanel && statsPanel.classList.contains('show')) {
            window.closeStatsPanel();
        }
    });
}); 