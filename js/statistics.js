import statsData from './common/statsData.js';

class Statistics {
    constructor() {
        this.bindEvents();
        this.updateDisplay();
    }

    bindEvents() {
        // 绑定统计按钮点击事件
        const statsButton = document.querySelector('[data-action="stats"]');
        if (statsButton) {
            statsButton.addEventListener('click', () => this.openStatsPanel());
        }

        // 绑定关闭按钮事件
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('stats-close')) {
                this.closeStatsPanel();
            }
        });
    }

    openStatsPanel() {
        const statsPanel = document.getElementById('statsPanel');
        if (!statsPanel) {
            this.createStatsPanel();
        } else {
            statsPanel.style.display = 'flex';
        }
        this.updateDisplay();
    }

    closeStatsPanel() {
        const statsPanel = document.getElementById('statsPanel');
        if (statsPanel) {
            statsPanel.style.display = 'none';
        }
    }

    createStatsPanel() {
        const panel = document.createElement('div');
        panel.id = 'statsPanel';
        panel.className = 'stats-panel';
        panel.innerHTML = `
            <div class="stats-content">
                <div class="stats-header">
                    <h2>学习统计</h2>
                    <button class="stats-close">×</button>
                </div>
                <div class="stats-body">
                    <div class="mastery-section">
                        <h3>掌握情况</h3>
                        <div class="mastery-grid">
                            <div class="mastery-item high">
                                <div class="mastery-label">完全掌握</div>
                                <div class="mastery-value" id="masteryHigh">0</div>
                            </div>
                            <div class="mastery-item medium">
                                <div class="mastery-label">基本掌握</div>
                                <div class="mastery-value" id="masteryMedium">0</div>
                            </div>
                            <div class="mastery-item low">
                                <div class="mastery-label">需要加强</div>
                                <div class="mastery-value" id="masteryLow">0</div>
                            </div>
                        </div>
                    </div>
                    <div class="chart-section">
                        <canvas id="learningTrendChart"></canvas>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(panel);
    }

    updateDisplay() {
        const stats = statsData.getStatistics();
        const masteryStats = stats.masteryStats || { low: 0, medium: 0, high: 0 };

        // 更新掌握情况数据
        const elements = {
            high: document.getElementById('masteryHigh'),
            medium: document.getElementById('masteryMedium'),
            low: document.getElementById('masteryLow')
        };

        if (elements.high) elements.high.textContent = masteryStats.high;
        if (elements.medium) elements.medium.textContent = masteryStats.medium;
        if (elements.low) elements.low.textContent = masteryStats.low;
    }
}

// 初始化统计功能
document.addEventListener('DOMContentLoaded', () => {
    window.statistics = new Statistics();
});

export default Statistics; 