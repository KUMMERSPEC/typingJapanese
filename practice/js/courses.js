import Statistics from './common/statistics.js';

function updateStatistics() {
    // 获取今日学习的句子数量
    const todayLearned = Statistics.getTodayLearnedSentences();
    document.querySelector('.learned-sentences').textContent = todayLearned;

    // 获取连续学习天数
    const streakDays = Statistics.getStreakDays();
    document.querySelector('.streak-days').textContent = streakDays;

    // 获取待复习的句子数量
    const reviewItems = Statistics.getReviewItems();
    document.querySelector('.review-items').textContent = reviewItems;
}

// 页面加载时更新统计
document.addEventListener('DOMContentLoaded', updateStatistics);

// 暴露给全局以供其他模块调用
window.updateStatistics = updateStatistics; 