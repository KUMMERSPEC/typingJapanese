import statsData from './common/statsData.js';

// 确保Chart.js已加载
if (typeof Chart === 'undefined') {
    console.error('Chart.js is not loaded');
}

class StatsChart {
    constructor() {
        if (typeof Chart === 'undefined') {
            console.error('Chart.js is required but not loaded');
            return;
        }
        this.initCharts();
    }

    initCharts() {
        this.initProficiencyChart();
        this.initDailyChart();
    }

    initProficiencyChart() {
        const ctx = document.getElementById('proficiencyChart');
        if (!ctx) return;

        // 从 statsData 获取学习数据
        const stats = statsData.getStatistics();
        
        // 获取掌握程度分布
        const proficiencyData = this.getProficiencyDistribution(stats);

        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['生疏', '熟练', '掌握'],
                datasets: [{
                    data: [
                        proficiencyData.low, 
                        proficiencyData.medium, 
                        proficiencyData.high
                    ],
                    backgroundColor: [
                        '#ff6b6b',  // 生疏 - 红色
                        '#ffd93d',  // 熟练 - 黄色
                        '#6bcb77'   // 掌握 - 绿色
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            font: {
                                size: 14
                            },
                            padding: 20
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const percentage = Math.round((value / proficiencyData.total) * 100);
                                return `${label}: ${value}个 (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    getProficiencyDistribution(stats) {
        const masteryStats = stats.masteryStats || { low: 0, medium: 0, high: 0 };
        const total = masteryStats.low + masteryStats.medium + masteryStats.high;

        return {
            low: masteryStats.low,
            medium: masteryStats.medium,
            high: masteryStats.high,
            total: total || 1  // 避免除以零
        };
    }

    initDailyChart() {
        const canvas = document.getElementById('learningTrendChart');
        if (!canvas) {
            console.error('Cannot find learningTrendChart canvas');
            return;
        }

        const container = canvas.parentElement;
        if (container) {
            canvas.style.width = '100%';
            canvas.style.height = '180px';
            canvas.width = container.offsetWidth;
            canvas.height = 180;
        }

        const stats = statsData.getStatistics();

        const daysToShow = 35;
        const monthData = this.getMonthData(stats, daysToShow);

        const labels = Object.keys(monthData);
        const data = Object.values(monthData);

        new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '学习/复习次数',
                    data: data,
                    backgroundColor: 'rgba(79, 171, 247, 0.8)',
                    borderColor: 'rgba(79, 171, 247, 1)',
                    borderWidth: 1
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
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                return context[0].label;
                            },
                            label: function(context) {
                                return `学习了 ${context.raw} 个句子`;
                            }
                        }
                    }
                }
            }
        });
    }

    getMonthData(stats, days) {
        const monthData = {};
        const currentDate = new Date();
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(currentDate);
            date.setDate(date.getDate() - i);
            const dateStr = date.toLocaleDateString();
            monthData[dateStr] = (stats.dailyStats[dateStr]?.sentencesLearned||0) + (stats.dailyStats[dateStr]?.reviewsDone||0);
        }
        
        return monthData;
    }
}

// 当文档加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded');
        return;
    }

    let chartsInitialized = false;
    const statsPanel = document.getElementById('statsPanel');

    if (statsPanel) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.target.style.display === 'flex' && !chartsInitialized) {
                    chartsInitialized = true;
                    console.log('Stats panel shown, initializing charts for the first time.');
                    
                    // 清除可能存在的旧图表实例
                    const oldChart = Chart.getChart('learningTrendChart');
                    if (oldChart) {
                        oldChart.destroy();
                    }
                    const oldPieChart = Chart.getChart('proficiencyChart');
                    if (oldPieChart) {
                        oldPieChart.destroy();
                    }

                    new StatsChart();
                }
            });
        });

        observer.observe(statsPanel, {
            attributes: true,
            attributeFilter: ['style']
        });
    }
});