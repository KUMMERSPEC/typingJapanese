import DataLoader from './dataLoader.js';
import statsData from '../../js/common/statsData.js';
// statistics.js removed

// 修改初始化方式
const PUNCT_RE = /^[、。！？….,，;；:：!！?？]+$/;
function stripPunctArr(arr){return arr.filter(u=>u && !PUNCT_RE.test(u));}

export class PracticeManager {
    constructor() {
        this.currentQuestionIndex = 0;
        this.questions = [];
        this.score = 0;
        
        // 初始化语音合成
        this.speechSynthesis = window.speechSynthesis;
        // 获取日语语音
        this.japaneseVoice = null;
        this.initVoice();
        
        // 初始化侧边栏状态
        this.isSidebarOpen = false;
        
        // 获取当前课程信息
        const urlParams = new URLSearchParams(window.location.search);
        this.currentCourse = urlParams.get('course');
        this.currentLesson = urlParams.get('lesson');
        
        this.totalSentences = 0;
        this.completedSentences = 0;