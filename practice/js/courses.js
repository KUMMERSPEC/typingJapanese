import statsData from '../../js/common/statsData.js';

function updateStatistics() {
    const stats = statsData.getStatistics();
    const today = new Date().toLocaleDateString();

    // 获取今日学习的句子数量
    const todayLearned = stats.dailyStats[today]?.sentencesLearned || 0;
    const learnedSentencesEl = document.querySelector('.learned-sentences');
    if(learnedSentencesEl) learnedSentencesEl.textContent = todayLearned;


    // 获取连续学习天数
    const streakDays = statsData.getLearningDays();
    const streakDaysEl = document.querySelector('.streak-days');
    if(streakDaysEl) streakDaysEl.textContent = streakDays;


    // 获取待复习的句子数量
    const reviewItems = statsData.getReviewItems().filter(item => item.needsReview).length;
    const reviewItemsEl = document.querySelector('.review-items');
    if(reviewItemsEl) reviewItemsEl.textContent = reviewItems;
}

// 页面加载时更新统计
document.addEventListener('DOMContentLoaded', updateStatistics);

// 暴露给全局以供其他模块调用
window.updateStatistics = updateStatistics;