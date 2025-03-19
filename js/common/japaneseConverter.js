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
            
            // 检查 Kuroshiro 是否存在
            if (typeof Kuroshiro === 'undefined' || typeof KuromojiAnalyzer === 'undefined') {
                console.error('Kuroshiro 或 KuromojiAnalyzer 未定义，请确保已正确加载相关库');
                throw new Error('所需库未加载');
            }
            
            this.kuroshiro = new Kuroshiro();
            await this.kuroshiro.init(new KuromojiAnalyzer());
            this.initialized = true;
            console.log('日语转换器初始化成功');
        } catch (error) {
            console.error('日语转换器初始化失败:', error);
            this.initialized = false;
            throw error;
        } finally {
            this.initializing = false;
        }
    }

    async convert(text) {
        if (!text) {
            return { hiragana: '', romaji: '' };
        }
        
        try {
            if (!this.initialized) {
                await this.init();
            }

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
            console.error('转换失败，使用简易转换:', error);
            
            // 使用简单的手动分词作为回退方案
            return this.simpleConvert(text);
        }
    }
    
    // 简易转换方法，不依赖外部库
    simpleConvert(text) {
        if (!text) return { hiragana: '', romaji: '' };
        
        // 简单处理：按字符分割并用冒号连接
        const hiragana = text.split('').join(':');
        
        // 这里无法真正转换为罗马音，所以直接返回原文
        return {
            hiragana: hiragana,
            romaji: text
        };
    }
}

// 创建单例实例
export const japaneseConverter = new JapaneseConverter();