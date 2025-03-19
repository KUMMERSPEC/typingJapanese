// 日语转换器
export class JapaneseConverter {
    constructor() {
        this.kuroshiro = null;
        this.initialized = false;
        this.initializing = false;
    }

    async init() {
        if (this.initialized || this.initializing) {
            return;
        }

        try {
            this.initializing = true;
            this.kuroshiro = new Kuroshiro();
            await this.kuroshiro.init(new KuromojiAnalyzer());
            this.initialized = true;
            console.log('日语转换器初始化成功');
        } catch (error) {
            console.error('日语转换器初始化失败:', error);
            throw error;
        } finally {
            this.initializing = false;
        }
    }

    async convert(text) {
        if (!this.initialized) {
            await this.init();
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

            return {
                hiragana: hiragana.replace(/\s+/g, ':'),
                romaji: romaji.toLowerCase()
            };
        } catch (error) {
            console.error('转换失败:', error);
            throw error;
        }
    }
}

// 创建单例实例
export const japaneseConverter = new JapaneseConverter();