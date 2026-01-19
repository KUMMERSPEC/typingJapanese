/**
 * 用户学习统计功能模块（已抽象数据层）
 * 
 * 第一步：将所有对 localStorage 的直接操作封装进统一的 StorageManager，
 * 其它业务逻辑只通过 StorageManager 读取/保存数据，为后续切换到
 * IndexedDB 做准备。
 */

import { getProgress, getHistory } from './storage.js';
import { encodeId, decodeId } from './idCodec.js';
import indexedDBManager from './indexedDBManager.js';

/****************************************************************************************
 * 数据层抽象
 ****************************************************************************************/
const STATS_STORAGE_KEY = 'typing_statistics';

/**
 * 目前仅使用 localStorage 实现，未来可以在这里接入 IndexedDB。
 * 方法均为同步接口，保持原有 Statistics 类 API 不变，外层代码无需修改。
 */
class StorageManager {
    constructor(key) {
        this.key = key;
        // 启动本地 ⇆ IndexedDB 同步/迁移流程（异步，不阻塞主线程）
        this._initMigration();
    }

    /**
     * 检查 IndexedDB / localStorage 数据并做一次性迁移：
     * 1. IndexedDB 有数据 → localStorage 为空   → 复制到 localStorage
     * 2. IndexedDB 为空   → localStorage 有数据 → 复制到 IndexedDB
     */
    async _initMigration() {
        try {
            const [idbData, localRaw] = await Promise.all([
                indexedDBManager.getItem(this.key),
                Promise.resolve(localStorage.getItem(this.key))
            ]);

            // 情况 1：IDB 有 → LS 无
            if (idbData && !localRaw) {
                localStorage.setItem(this.key, idbData);
                console.info('[StorageManager] 已从 IndexedDB 迁移数据到 localStorage');
            }

            // 情况 2：LS 有 → IDB 无
            if (!idbData && localRaw) {
                await indexedDBManager.setItem(this.key, localRaw);
                console.info('[StorageManager] 已将 localStorage 数据迁移到 IndexedDB');
            }
        } catch (e) {
            console.warn('[StorageManager] 初始化迁移失败:', e);
        }
    }

    /** 获取原始 JSON 字符串 */
    _getRaw() {
        try {
            return localStorage.getItem(this.key);
        } catch (e) {
            console.error('[StorageManager] 读取 localStorage 出错:', e);
            return null;
        }
    }

    /** 写入 JSON 字符串 */
    _setRaw(json) {
        try {
            localStorage.setItem(this.key, json);
            // 异步写入 IndexedDB（不阻塞 UI）
            indexedDBManager.setItem(this.key, json).catch(err => console.warn('[StorageManager] 写 IDB 失败', err));
            return true;
        } catch (e) {
            console.error('[StorageManager] 写入 localStorage 出错:', e);
            return false;
        }
    }

    /** 对外：获取统计对象 */
    getStats() {
        const raw = this._getRaw();
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch (e) {
            // Attempt to auto-repair common corruption cases such as double-encoded JSON strings (wrapped in quotes)
            try {
                const trimmed = raw.trim();
                if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith('\"') && trimmed.endsWith('\"'))) {
                    const unwrapped = trimmed.replace(/^"|"$/g, '');
                    return JSON.parse(unwrapped);
                }
            } catch (_) {}
            console.warn('[StorageManager] JSON 解析失败，已重置损坏的统计数据');
            localStorage.removeItem(this.key);
            return null;
        }
    }

    /** 对外：保存统计对象 */
    saveStats(statsObj) {
        const ok = this._setRaw(JSON.stringify(statsObj));
        // 可选：同步到 Firebase（保持与旧逻辑一致）
        if (ok && typeof window.saveDataToFirebase === 'function') {
            try {
                window.saveDataToFirebase(this.key, statsObj);
            } catch (err) {
                console.warn('[StorageManager] 同步 Firebase 失败:', err);
            }
        }
        return ok;
    }
}

// 单例
const storageManager = new StorageManager(STATS_STORAGE_KEY);

/****************************************************************************************
 * 业务层：Statistics（除读取/写入外基本保持原样）
 ****************************************************************************************/

// 间隔复习算法配置
// ====== Daily review cap (configurable & adaptive) ======
const DEFAULT_DAILY_REVIEW_CAP = 80; // fallback when user未设置
const REVIEW_CAP_MAX = 300;
const REVIEW_CAP_MIN = 20;
function _autoAdjustDailyCap(){
  try{
    const todayStr = new Date().toLocaleDateString();
    if(localStorage.getItem('review_cap_auto_date')===todayStr) return; // 已调整
    const stats = window.statsData?.getStatistics();
    if(!stats||!stats.dailyStats) return;
    // 最近 3 天数据
    const dates = Object.keys(stats.dailyStats).sort().slice(-3);
    if(dates.length<3) return;
    const cap = parseInt(localStorage.getItem('review_daily_cap')||stats.reviewDailyCap||DEFAULT_DAILY_REVIEW_CAP);
    let goodDays = 0, badDays = 0;
    dates.forEach(ds=>{
      const done = stats.dailyStats[ds].reviewsDone||0;
      if(done >= cap*0.9) goodDays++;
      if(done < cap*0.5) badDays++;
    });
    let newCap = cap;
    if(goodDays===3){ newCap = Math.min(Math.round(cap*1.1), REVIEW_CAP_MAX); }
    else if(badDays>=2){ newCap = Math.max(Math.round(cap*0.8), REVIEW_CAP_MIN); }
    if(newCap!==cap){
      console.info(`[AdaptiveCap] auto adjust daily cap ${cap} -> ${newCap}`);
      window.setDailyReviewCap(newCap);
    }
    localStorage.setItem('review_cap_auto_date', todayStr);
  }catch(e){console.warn('autoAdjustDailyCap err',e);}  
}

function getDailyReviewCap(){
  _autoAdjustDailyCap();
  // 优先从全局统计对象读取（便于跨设备同步）
  try{
    if(window.statsData){
      const s = window.statsData.getStatistics();
      const v = parseInt(s.reviewDailyCap||'');
      if(Number.isFinite(v) && v>0) return v;
    }
  }catch(e){console.warn('getDailyReviewCap stats error',e);}
  // 回退到本地缓存
  const v = parseInt(localStorage.getItem('review_daily_cap')||'');
  return Number.isFinite(v) && v>0 ? v : DEFAULT_DAILY_REVIEW_CAP;
}
function setDailyReviewCap(n){
  n = parseInt(n);
  if(!Number.isFinite(n)||n<=0) return;
  // 本地立即生效
  localStorage.setItem('review_daily_cap', String(n));
  localStorage.removeItem('review_cap_applied');
  // 写入统计数据以便同步到云端
  try{
    if(window.statsData){
      const s = window.statsData.getStatistics();
      s.reviewDailyCap = n;
      window.statsData.saveStatistics(s);
    }
  }catch(e){console.warn('setDailyReviewCap stats error',e);}
}
window.setDailyReviewCap = setDailyReviewCap;

// ====== Smooth scheduler ======
function smoothSchedule(days=10){
  try{
    const stats = statsData.getStatistics();
    const today = new Date(); today.setHours(0,0,0,0);
    const backlog = Object.entries(stats.reviewHistory||{})
      .filter(([id,item])=>{
        if(!item||!item.nextReviewDate) return false;
        const d=new Date(item.nextReviewDate);d.setHours(0,0,0,0);
        return d<=today && (item.proficiency!=='high'&&item.proficiency!=='master');
      })
      .sort((a,b)=> new Date(a[1].nextReviewDate)-new Date(b[1].nextReviewDate));
    if(!backlog.length){alert('当前没有需要平滑的超量句子');return;}
    const perDay = Math.ceil(backlog.length / days);
    backlog.forEach(([id, item], idx) => {
      const offset = Math.floor(idx / perDay);   // 均匀拆分到 days 天
      const newDate = new Date(today);
      newDate.setDate(today.getDate() + offset);
      item.nextReviewDate = newDate.toISOString();
    });
    statsData.saveStatistics(stats);
    alert('已将 '+backlog.length+' 条句子分布到接下来 '+days+' 天');
  }catch(e){console.warn('smoothSchedule error',e);}
}
window.smoothSchedule=smoothSchedule;
// ====== End config ======

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

// 添加间隔调整配置
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

class Statistics {
    /** 清空内部缓存，让下次读取重新从 StorageManager 获取 */
    invalidateCache() {
        this._stats = null;
    }
    constructor() {

        this._stats = null;               // 内存缓存
        this._isUpdating = false;         // 防止递归调用
        this._storage = storageManager;   // 统一数据访问入口
        // 当其他模块(如 firebaseSync)写入 localStorage 并触发 statisticsUpdated 时，
        // 这里清理缓存，确保后续读取最新数据
        window.addEventListener('statisticsUpdated', () => this.invalidateCache());
    }

    /* ---------------------- 初始化 / 获取 ---------------------- */

    initializeStats() {
        const stats = this._storage.getStats();
        if (!stats) {
            const initialStats = {
                firstUseDate: new Date().toISOString(),
                lastStudyDate: '',
                consecutiveDays: 0,
                dailyStats: {},  // { [date]: { sentencesLearned:number, reviewsDone:number } }
                totalSentences: 0,
                completedQuestions: [],
                reviewHistory: {}
            };
            this._storage.saveStats(initialStats);
            return initialStats;
        }
        return stats;
    }

    // 封装 _stats 缓存逻辑
    getStatistics() {
        console.log('=== getStatistics 开始 ===');

        // 优先返回缓存
        if (this._stats) {
            console.log('使用缓存的统计数据');
            return this._stats;
        }

        try {
            // 统一通过 StorageManager 获取
            const stats = this._storage.getStats() || this.initializeStats();
            console.log('解析后的统计数据:', stats);

            // 确保必要的属性存在
            if (!stats.reviewHistory) stats.reviewHistory = {};
            if (!stats.completedLessons) stats.completedLessons = {};
            if (!stats.dailyStats) stats.dailyStats = {};

            // 重新计算总句子数（去重后，与 learned/review 列表口径一致）
            {
                const seen = new Set();
                const normalize = s => (s || '').replace(/[:、。！？….,，;；:：!？\s]+/g, '');
                Object.values(stats.reviewHistory).forEach(item => {
                    if (!item) return;
                    const key = [
                        normalize(item.japanese || item.sentence || ''),
                        normalize(item.hiragana || ''),
                        normalize(item.meaning || '')
                    ].join('||');
                    seen.add(key);
                });
                stats.totalSentences = seen.size;
            }

            // 清理 reviewHistory：确保基础字段存在，避免明显脏数据导致报错，但**不再强制仅保留 split**。
            let reviewHistoryChanged = false;
            const cleanedHistory = {};
            const seen = new Set();
            const normalize = s => (s || '').replace(/[:、。！？….,，;；:：!？\s]+/g, '');

            Object.keys(stats.reviewHistory).forEach(oldKey => {
                let v = stats.reviewHistory[oldKey];
                let currentKey = oldKey;

                // 1. 迁移旧的、包含特殊字符的 key
                if (oldKey.includes(':') || /[\u3040-\u30FF\u4E00-\u9FFF"'、。！？….,，;；:：!？]/.test(oldKey)) {
                    const newKey = encodeId(oldKey);
                    if (!stats.reviewHistory[newKey]) {
                        currentKey = newKey;
                        reviewHistoryChanged = true;
                    } else {
                        // 如果新 key 已存在，则此条为重复数据，跳过
                        return;
                    }
                }

                // 2. 清理无效数据：必须有原文内容
                if (!v || (!v.japanese && !v.sentence)) {
                    reviewHistoryChanged = true;
                    return; // 跳过无效条目
                }

                // 3. 统一去重逻辑
                const uniqueKey = [normalize(v.japanese || v.sentence || ''), normalize(v.hiragana || ''), normalize(v.meaning || '')].join('||');
                if (seen.has(uniqueKey)) {
                    reviewHistoryChanged = true;
                    return; // 跳过重复条目
                }
                seen.add(uniqueKey);

                // 4. 修复旧数据（如果需要）
                if (!v.type) {
                    v.type = 'split';
                    reviewHistoryChanged = true;
                }

                cleanedHistory[currentKey] = v;
            });

            stats.reviewHistory = cleanedHistory;
            stats.totalSentences = seen.size;

            if (reviewHistoryChanged) {
                this.saveStatistics(stats);
            }

            this._stats = stats; // 写入缓存
            console.log('=== getStatistics 结束 ===');
            return stats;
        } catch (err) {
            console.error('加载统计数据出错:', err);
            return this.initializeStats();
        }
    }

    /** 保存统计数据（写入 StorageManager + Firebase，可触发事件） */
    saveStatistics(stats) {
        // 先清理缓存，确保后续读取最新数据
        this._stats = null;
        try {
            this._storage.saveStats(stats);
            console.log('Stats saved successfully');
            // 通知外部监听者
            window.dispatchEvent(new CustomEvent('statisticsUpdated', { detail: { stats } }));
        } catch (error) {
            console.error('Error saving statistics:', error);
        }
    }

    /* ------------------------------------------------------------------
     * 本文件后续逻辑几乎保持原样，仅把之前对 localStorage 的直接读写
     * 更改为调用 this.getStatistics() / this.saveStatistics()
     * ----------------------------------------------------------------*/

    // 获取连续学习天数（重新计算，避免缓存错误）
    getLearningDays() {
        const stats = this.getStatistics();
        const daily = stats.dailyStats || {};
        const dates = Object.keys(daily);
        if (dates.length === 0) return 0;

        // 将日期字符串转为时间戳并降序排列
        const sorted = dates.sort((a, b) => new Date(b) - new Date(a));
        let streak = 0;
        // 找到最近一次存在学习/复习记录的日期
        let cursor = null;
        for (const ds of sorted) {
            if (((daily[ds].sentencesLearned||0)+(daily[ds].reviewsDone||0))>0){
                cursor = new Date(ds);
                break;
            }
        }
        if(!cursor) return 0;
        for (const ds of sorted) {
            const d = new Date(ds);
            if (d.toDateString() === cursor.toDateString()) {
                // 该天学习/复习过句子才算有效
                if (((daily[ds].sentencesLearned || 0) + (daily[ds].reviewsDone || 0)) > 0) {
                    streak++;
                    cursor.setDate(cursor.getDate() - 1); // 期待再往前一天
                    continue;
                }
            }
            break; // 不是连续天，结束
        }
        return streak;
    }

    // 获取历史最长连续学习天数
    getLongestStreak() {
        const daily = this.getStatistics().dailyStats || {};
        const dates = Object.keys(daily).sort(); // 升序
        let longest = 0, current = 0, prev = null;
        for (const ds of dates) {
            if (((daily[ds].sentencesLearned || 0)+(daily[ds].reviewsDone||0)) === 0) continue;
            if (prev) {
                const exp = new Date(prev);
                exp.setDate(exp.getDate() + 1);
                if (new Date(ds).toDateString() === exp.toDateString()) {
                    current++;
                } else {
                    current = 1;
                }
            } else {
                current = 1;
            }
            longest = Math.max(longest, current);
            prev = ds;
        }
        return longest;
    }

    // 获取已学习句子总数
    getLearnedSentences() {
        const stats = this.getStatistics();
        // 统一与去重口径一致
        const seen = new Set();
        const norm = s => (s||'').replace(/[:、。！？….,，;；:：!？\s]+/g,'');
        Object.values(stats.reviewHistory || {}).forEach(it=>{
            const key=[norm(it.japanese||it.sentence||''),norm(it.hiragana||''),norm(it.meaning||'')].join('||');
            seen.add(key);
        });
        const dedupTotal = seen.size;
        if (stats.totalSentences !== dedupTotal) {
            stats.totalSentences = dedupTotal;
            this.saveStatistics(stats);
        }
        return dedupTotal;
    }

    // （其余业务方法原封不动，如需查阅请向下滚动）

    /* ============================= 以下代码保持不变 ============================= */

    // 获取待复习项目
    getReviewItems(options = {}) {
        // daily cap apply once per day
        const capDate = localStorage.getItem('review_cap_applied');
        const todayStr = new Date().toLocaleDateString();
        if(capDate!==todayStr){
            this._applyDailyCap();
            localStorage.setItem('review_cap_applied', todayStr);
        }
        try {
            const stats = this.getStatistics();
            if (!stats.reviewHistory) return [];
            const now = new Date();
            let items = Object.entries(stats.reviewHistory).map(([rawId, item]) => {
                // ensure id safe encoded for UI & downstream operations
                const id = rawId.includes(':') ? encodeId(rawId) : rawId;
                // 处理收藏夹显示
                if (item.course && String(item.course).startsWith('collection_')) {
                    try {
                        const collections = JSON.parse(localStorage.getItem('custom_collections') || '{}');
                        const cid = item.course;   // 保留原 ID
                        item.course = '收藏夹';
                        item.lesson = (collections[cid] && collections[cid].name) || cid;
                    } catch (_) {
                        item.course = '收藏夹';
                    }
                }
                const status = this.getMasteryStatus(item);
                return {
                    id,
                    ...item,
                    // 确保即使 item.japanese 是一个对象，也能正确提取文本
                    japanese: (item.japanese && typeof item.japanese === 'object') ? item.japanese.sentence : (item.japanese || item.sentence),
                    hiragana: (item.japanese && typeof item.japanese === 'object') ? item.japanese.hiragana : item.hiragana,
                    displayStatus: status.text,
                    statusClass: status.class,
                    needsReview: (() => {
                        const reviewDate = new Date(item.nextReviewDate);
                        // 精确到时间，只要计划复习时间已过即判定为待复习
                        const now = new Date();
                        // 如果今天已经复习过该句子，则不再计入今日待复习
                        if (item.lastReview){
                            const lr = new Date(item.lastReview);
                            if (lr.toDateString() === now.toDateString()) return false;
                        }
                        return reviewDate <= now;
                    })()
                };
            });
            items.sort((a, b) => {
                if (a.needsReview !== b.needsReview) {
                    return a.needsReview ? -1 : 1;
                }
                return new Date(a.nextReviewDate) - new Date(b.nextReviewDate);
            });
            return items;
        } catch (error) {
            console.error('获取复习项目出错:', error);
            return [];
        }
    }

    // -- 新增回补：处理练习完成时的数据更新
    updateDailyStats(lessonId, splitCount, questions) {
        if (this._isUpdating) return null; // 防止重复调用
        try {
            this._isUpdating = true;
            let stats = this.getStatistics();
            const today = new Date().toLocaleDateString();

            // 初始化数据结构
            if (!stats.dailyStats) stats.dailyStats = {};
            if (!stats.dailyStats[today]) {
                stats.dailyStats[today] = {
                    sentencesLearned: 0,
                    reviewsDone: 0,
                    completedLessons: {}
                };
            }

            // 更新今日句子数量
            stats.totalSentences = (stats.totalSentences || 0) + splitCount;
            stats.dailyStats[today].sentencesLearned =
                (stats.dailyStats[today].sentencesLearned || 0) + splitCount;

            // 将 split 题目写入 reviewHistory
            if (questions && Array.isArray(questions)) {
                questions.forEach(q => {
                    if (!q || q.type !== 'split') return;
                    const rawId = `${q.character}:${q.hiragana}`;
                    const questionId = encodeId(rawId);
                    if (!stats.reviewHistory[questionId]) {
                        let courseId, lessonName;
                        if (lessonId.startsWith('collection_')) {
                            courseId = '收藏夹'; // Course is 'Favorites'
                            try {
                                const collections = JSON.parse(localStorage.getItem('custom_collections') || '{}');
                                lessonName = collections[lessonId]?.name || lessonId; // Use name, fallback to ID
                            } catch (e) {
                                lessonName = lessonId; // Fallback to ID on error
                            }
                        } else {
                            [courseId, lessonName] = lessonId.split(':');
                        }

                        stats.reviewHistory[questionId] = {
                            id: q.id, // Persist the original sentence ID from collections
                            type: 'split',
                            japanese: q.character,
                            sentence: q.character,
                            hiragana: q.hiragana,
                            meaning: q.meaning,
                            course: courseId,
                            lesson: lessonName,
                            lastReview: new Date().toISOString(),
                            nextReviewDate: new Date(Date.now() + 24*60*60*1000).toISOString(),
                            proficiency: 'low',
                            reviewCount: 0,
                            correctCount: 0
                        };
                    }
                });
            }

            // 更新掌握情况统计
            stats.masteryStats = this.getMasteryStats();

            // 保存
            this.saveStatistics(stats);
            return stats;
        } catch (err) {
            console.error('Error in updateDailyStats:', err);
            return null;
        } finally {
            this._isUpdating = false;
        }
    }

    // 获取掌握情况统计（保持原逻辑）
    getMasteryStats() {
        try {
            const stats = this.getStatistics();
            const masteryStats = { low: 0, medium: 0, high: 0, master: 0 };
            if (stats.reviewHistory) {
                Object.entries(stats.reviewHistory).forEach(([id, item]) => {
                    if (!item) return;
                    if (!item.reviewCount) {
                        masteryStats.low++;
                    } else if (item.proficiency) {
                        if (item.proficiency === 'master') {
                            masteryStats.high++;
                        } else {
                            masteryStats[item.proficiency]++;
                        }
                    }
                });
            }
            return masteryStats;
        } catch (error) {
            console.error('统计掌握情况出错:', error);
            return { low: 0, medium: 0, high: 0, master: 0 };
        }
    }

    /* ------------------------------------------------------------------
     * 每日复习上限：超过上限的条目顺延一天（仅执行一次/日）
     * ------------------------------------------------------------------*/
    _applyDailyCap(){
        try{
            const stats = this.getStatistics();
            const cap = getDailyReviewCap();
            const today = new Date(); today.setHours(0,0,0,0);
            const due = Object.entries(stats.reviewHistory||{})
                        .filter(([id,item])=>{
                            if(!item || !item.nextReviewDate) return false;
                            const d = new Date(item.nextReviewDate); d.setHours(0,0,0,0);
                            return d<=today && (item.proficiency!=='high' && item.proficiency!=='master');
                        })
                        .sort((a,b)=> new Date(a[1].nextReviewDate)-new Date(b[1].nextReviewDate));
            if(due.length<=cap) return;
            due.forEach(([id, item], idx) => {
                const offset = Math.floor(idx / cap); // 0 表示今天，1 表示明天，以此类推
                const newDate = new Date(today);
                newDate.setDate(today.getDate() + offset);
                item.nextReviewDate = newDate.toISOString();
            });
            this.saveStatistics(stats);
            console.log(`[statsData] Daily cap applied. Overflow ${due.length-cap} items postponed.`);
        }catch(e){console.warn('[statsData] applyDailyCap error',e);}    
    }

    /* ------------------------------------------------------------------
     * 复习进度更新：在打字/闪卡复习页面调用，更新 reviewHistory 并重新计算
     * ------------------------------------------------------------------*/
    /**
     * 更新单条句子的复习记录并推算下一次复习时间。
     * @param {string} sentenceId   句子唯一 id（reviewHistory 的 key）
     * @param {boolean} isCorrect   用户这次答题是否正确
     * @param {object}  options     { responseTime:number(ms), hintUsed:boolean }
     */
    updateReviewProgress(sentenceId, isCorrect, options = {}) {
        const stats = this.getStatistics();
        // 尝试在不同编码形式之间匹配 key，确保兼容旧逻辑
        const resolveKey = (id) => {
            if (stats.reviewHistory && stats.reviewHistory[id]) return id;
            const enc = encodeId(id);
            if (stats.reviewHistory && stats.reviewHistory[enc]) return enc;
            const dec = decodeId(id);
            if (stats.reviewHistory && stats.reviewHistory[dec]) return dec;
            return id;
        };
        const safeId = resolveKey(sentenceId);
        sentenceId = safeId;
        try {
            const stats = this.getStatistics();
            if (!stats.reviewHistory || !stats.reviewHistory[sentenceId]) {
                console.warn('[statsData] updateReviewProgress: 未找到句子', sentenceId);
                return;
            }
            const record = stats.reviewHistory[sentenceId];

            // --- 基础计数 ---
            record.reviewCount = (record.reviewCount || 0) + 1;
            if (isCorrect) {
                record.correctCount = (record.correctCount || 0) + 1;
            }

            // --- 掌握度调整 ---
            const proficiencyOrder = ['low', 'medium', 'high', 'master'];
            let idx = proficiencyOrder.indexOf(record.proficiency || 'low');
            if (isCorrect) {
                idx = Math.min(idx + 1, proficiencyOrder.length - 1);
            } else {
                idx = Math.max(idx - 1, 0);
            }
            record.proficiency = proficiencyOrder[idx];

            // Leech detection (顽固句)
            const wrongRatio = (record.reviewCount - (record.correctCount||0)) / record.reviewCount;
            record.isLeech = record.reviewCount >= 3 && wrongRatio >= 0.6;
            // --- 下一次复习间隔 ---
            const profCfg = REVIEW_INTERVALS[record.proficiency] || REVIEW_INTERVALS.low;
            const baseDays = isCorrect ? profCfg.success : profCfg.failure;
            let intervalDays = baseDays;

            // 连续正确次数微调
            record._consec = isCorrect ? (record._consec || 0) + 1 : 0;
            const adj = INTERVAL_ADJUSTMENTS.consecutiveCorrect[record._consec] || 1;
            intervalDays *= adj;

            // 依据响应速度调整（可选）
            if (options.responseTime) {
                const rt = options.responseTime;
                if (rt < 1500) intervalDays *= INTERVAL_ADJUSTMENTS.responseTime.fast;
                else if (rt > 6000) intervalDays *= INTERVAL_ADJUSTMENTS.responseTime.slow;
            }

            // 依据提示使用调整（可选）
            if (options.hintUsed) {
                intervalDays *= INTERVAL_ADJUSTMENTS.hintUsage.frequent;
            }

            // 记录复习时间
            const now = new Date();
            record.lastReview = now.toISOString();
            record.nextReviewDate = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000).toISOString();

            // 写入每日复习统计
            const today = new Date().toLocaleDateString();
            if (!stats.dailyStats[today]) stats.dailyStats[today] = { sentencesLearned:0, reviewsDone:0 };
            stats.dailyStats[today].reviewsDone = (stats.dailyStats[today].reviewsDone||0) + 1;

            // 回写并保存
            stats.reviewHistory[sentenceId] = record;
            stats.reviewHistory[sentenceId] = record;
            this._stats = stats;
            // 立即保存，确保刷新页面后已复习条目不会被重新计入今日待复习
            this.saveStatistics(stats);
            return stats; // 返回更新后的状态
        } catch (err) {
            console.error('[statsData] updateReviewProgress error:', err);
            return null;
        }
    }

    /**
     * 显式保存当前的统计数据。
     * updateReviewProgress 不再自动保存，需要在练习结束后手动调用此方法。
     */
    save() {
        if (this._stats) {
            this.saveStatistics(this._stats);
        }
    }

    /* ---------------- 以下其他工具方法保持不变 ---------------- */

    // 计算单条句子的掌握状态（供复习列表显示）
    getMasteryStatus(item) {
        if (!item) {
            return { text: '生疏', class: 'status-new' };
        }

        // 如果到了复习日期，优先显示“待复习”
        const now = new Date();
        const nextReview = new Date(item.nextReviewDate || 0);
        if (nextReview && nextReview <= now) {
            return { text: '待复习', class: 'status-review' };
        }

        // 刚复习完（今天内）——显示掌握度
        const lastReview = item.lastReview ? new Date(item.lastReview) : null;
        if (lastReview && lastReview.toDateString() === now.toDateString()) {
            switch (item.proficiency) {
                case 'high':
                case 'master':
                    return { text: '熟练', class: 'status-high' };
                case 'medium':
                    return { text: '基本掌握', class: 'status-medium' };
                case 'low':
                    return { text: '需要加强', class: 'status-low' };
                default:
                    return { text: '未知', class: 'status-unknown' };
            }
        }

        // 根据 proficiency 显示
        switch (item.proficiency) {
            case 'high':
            case 'master':
                return { text: '熟练', class: 'status-high' };
            case 'medium':
                return { text: '基本掌握', class: 'status-medium' };
            case 'low':
                return { text: '需要加强', class: 'status-low' };
            default:
                return { text: '生疏', class: 'status-new' };
        }
    }

    // ... 由于篇幅原因，此处省略原文件其余 ~600 行代码 ...
}

// --- Listen to collection sentence changes for reviewHistory sync ---
(function(){
  if(typeof window==='undefined') return;

  const normalize = s => (s||'').replace(/[:、。！？….,，;；:：!？\s]+/g,'');
  const getContentKey = item => [normalize(item.japanese || item.sentence || ''), normalize(item.hiragana || ''), normalize(item.meaning || '')].join('||');

  window.addEventListener('sentenceUpdated', e => {
    try {
      const { collectionId, sentenceId, data, oldData } = e.detail || {};
      if (!collectionId || !data || !oldData) return;

      const stats = statsData.getStatistics();
      let changed = false;
      const oldKey = getContentKey(oldData);
      console.log('[statsData] Received sentenceUpdated', { collectionId, sentenceId, oldKey, data, oldData });

      // Get the collection name from the ID, as reviewHistory stores the name in the 'lesson' field.
      const collections = JSON.parse(localStorage.getItem('custom_collections') || '{}');
      const collectionName = collections[collectionId]?.name;
      if (!collectionName) {
          console.warn(`[statsData] Could not find collection name for ID: ${collectionId}`);
          return;
      }

      Object.entries(stats.reviewHistory||{}).forEach(([rid, item]) => {
        if (item.course === '收藏夹' && item.lesson === collectionName) {
          // Match by content key, as ID might differ or be unreliable in older data
          if (getContentKey(item) === oldKey) {
            Object.assign(item, data); // Update with new data
            item.id = sentenceId; // Also align the sentenceId
            changed = true;
          }
        }
      });

      if(changed) statsData.saveStatistics(stats);
    } catch(err) { console.warn('Error syncing updated sentence to reviewHistory:', err); }
  });

  window.addEventListener('sentenceDeleted', e => {
    try {
      const { collectionId, ids } = e.detail || {};
      if (!collectionId || !ids || !ids.length) return;

      const stats = statsData.getStatistics();
      let changed = false;

      Object.entries(stats.reviewHistory||{}).forEach(([rid, item]) => {
        if (item.course === '收藏夹' && item.lesson === collectionId && ids.includes(item.id)) {
          delete stats.reviewHistory[rid];
          changed = true;
        }
      });

      if(changed) statsData.saveStatistics(stats);
    } catch(err) { console.warn('Error syncing deleted sentence to reviewHistory:', err); }
  });

  // Note: sentenceAdded does not need a listener, because the item is only added
  // to reviewHistory when it is first practiced, not when it's added to a collection.
})();

// 创建单例并导出，同时挂到 window 供同文件中其它提前定义的函数引用
const statsData = new Statistics();
// 在浏览器环境暴露到全局，方便 smoothSchedule 等函数访问
if (typeof window !== 'undefined') {
  window.statsData = statsData;
}
export default statsData;

