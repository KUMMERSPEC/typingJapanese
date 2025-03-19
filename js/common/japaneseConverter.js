class JapaneseConverter {
    constructor() {
        this.kuroshiro = new Kuroshiro();
        this.initialized = false;
        this.initializing = false;
    }

    async initialize() {
        if (this.initialized || this.initializing) return;
        
        try {
            this.initializing = true;
            const analyzer = new KuromojiAnalyzer();
            await this.kuroshiro.init(analyzer);
            this.initialized = true;
            console.log('Kuroshiro initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Kuroshiro:', error);
            throw error;
        } finally {
            this.initializing = false;
        }
    }

    async convert(text) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            // 获取平假名
            const hiragana = await this.kuroshiro.convert(text, {
                to: 'hiragana',
                mode: 'spaced'
            });

            // 获取罗马字
            const romaji = await this.kuroshiro.convert(text, {
                to: 'romaji',
                mode: 'spaced'
            });

            // 处理平假名，将空格替换为冒号
            const formattedHiragana = hiragana.replace(/\s+/g, ':');
            
            // 处理罗马字，保持空格分隔
            const formattedRomaji = romaji.toLowerCase();

            return {
                hiragana: formattedHiragana,
                romaji: formattedRomaji
            };
        } catch (error) {
            console.error('Conversion failed:', error);
            throw error;
        }
    }
}

// 创建单例实例
const japaneseConverter = new JapaneseConverter();
export default japaneseConverter; 