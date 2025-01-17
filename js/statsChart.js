import Statistics from './common/statistics.js';

// 确保Chart.js已加载
if (typeof Chart === 'undefined') {
    console.error('Chart.js is not loaded');
}

class StatsChart {
    constructor() {
        console.log('StatsChart instance created');
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

        console.log('Initializing proficiency chart');
        
        // 从 Statistics 获取学习数据
        const stats = Statistics.getStatistics();
        
        // 获取掌握程度分布
        const proficiencyData = this.getProficiencyDistribution(stats);
        
        console.log('Proficiency distribution:', proficiencyData);

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
        // 使用新的掌握情况统计
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

        // 设置合适的画布尺寸
        const container = canvas.parentElement;
        if (container) {
            canvas.style.width = '100%';
            canvas.style.height = '180px';
            canvas.width = container.offsetWidth;
            canvas.height = 180;
        }

        const stats = Statistics.getStatistics();
        console.log('Current stats:', stats);

        // 获取最近35天的数据
        const daysToShow = 35;
        const monthData = this.getMonthData(stats, daysToShow);
        console.log('Month data:', monthData);

        // 准备图表数据
        const labels = Object.keys(monthData);
        const data = Object.values(monthData);

        // 创建图表
        new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '学习句子数',
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

    // 获取指定天数的数据
    getMonthData(stats, days) {
        const monthData = {};
        const currentDate = new Date();
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(currentDate);
            date.setDate(date.getDate() - i);
            const dateStr = date.toLocaleDateString();
            monthData[dateStr] = stats.dailyStats[dateStr]?.sentencesLearned || 0;
        }
        
        return monthData;
    }

    // 绘制图例
    drawLegend(ctx, x, y) {
        const legendItems = ['较少', '', '中等', '', '较多'];
        const cellSize = 15;
        const padding = 4;
        
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#666';
        ctx.fillText('活跃度：', x, y + 12);
        
        legendItems.forEach((text, i) => {
            const intensity = i / 4;
            const legendX = x + 60 + i * (cellSize + padding);
            
            // 绘制色块
            ctx.fillStyle = `rgba(79, 171, 247, ${0.2 + intensity * 0.8})`;
            this.drawRoundRect(ctx, legendX, y, cellSize, cellSize, 2);
            ctx.fill();
            
            // 绘制文字
            if (text) {
                ctx.fillStyle = '#666';
                ctx.fillText(text, legendX - 2, y + cellSize + 15);
            }
        });
    }

    // 辅助函数：绘制圆角矩形
    drawRoundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    // 创建热力图数据
    createHeatmapGrid(stats) {
        const last7Days = this.getLast7Days();
        return last7Days.map(date => {
            return stats.dailyStats[this.getFullDate(date)]?.sentencesLearned || 0;
        });
    }

    // 获取最近7天的日期标签
    getLast7Days() {
        const weekdays = ['一', '二', '三', '四', '五', '六', '日'];
        const dates = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            dates.push(weekdays[date.getDay() === 0 ? 6 : date.getDay() - 1]);
        }
        return dates;
    }

    // 获取完整日期格式（用于查询统计数据）
    getFullDate(weekday) {
        const today = new Date();
        const dayIndex = ['日', '一', '二', '三', '四', '五', '六'].indexOf(weekday);
        const targetDate = new Date();
        const diff = today.getDay() - dayIndex;
        targetDate.setDate(today.getDate() - diff);
        return targetDate.toLocaleDateString();
    }

    getDailyData(stats, dates) {
        return dates.map(date => {
            return stats.dailyStats[date]?.sentencesLearned || 0;
        });
    }
}

// 当文档加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 确保Chart.js已加载
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded');
        return;
    }

    const statsPanel = document.getElementById('statsPanel');
    if (statsPanel) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.target.style.display === 'flex') {
                    console.log('Stats panel shown, initializing charts');
                    // 清除旧的图表实例
                    const oldChart = Chart.getChart('learningTrendChart');
                    if (oldChart) {
                        oldChart.destroy();
                    }
                    const chartManager = new StatsChart();
                }
            });
        });

        observer.observe(statsPanel, {
            attributes: true,
            attributeFilter: ['style']
        });
    }
});

// 添加调试日志
console.log('StatsChart module loaded');

function showStatsPanel() {
    const statsPanel = document.getElementById('statsPanel');
    if (statsPanel) {
        statsPanel.style.display = 'flex';
        
        // 更新统计数据
        const stats = Statistics.getStatistics();
        document.getElementById('learningDays').textContent = stats.totalDays || 0;
        document.getElementById('totalSentences').textContent = stats.totalSentences || 0;
        document.getElementById('totalReviews').textContent = stats.totalReviews || 0;
        
        // 初始化图表
        const chartManager = new StatsChart();
    }
} 