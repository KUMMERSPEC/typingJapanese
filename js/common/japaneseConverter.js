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
    
    // 简单的日文分词
    tokenizeJapanese(text) {
        if (!text) return [];
        
        // 简单的分词规则：
        // 1. 遇到标点符号分词
        // 2. 日语和非日语之间分词
        // 3. 尝试通过语法规则进行分词
        
        const tokens = [];
        let currentToken = '';
        let lastCharType = null;
        
        // 检查字符类型
        const getCharType = (char) => {
            if (/[\p{Script=Hiragana}]/u.test(char)) return 'hiragana';
            if (/[\p{Script=Katakana}]/u.test(char)) return 'katakana';
            if (/[\p{Script=Han}]/u.test(char)) return 'kanji';
            if (/[a-zA-Z0-9]/u.test(char)) return 'latin';
            if (/[！？。、．，：；'"（）［］【】「」『』〈〉《》〔〕…‥]/u.test(char)) return 'punctuation';
            return 'other';
        };
        
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const charType = getCharType(char);
            
            // 标点符号前的内容作为一个词
            if (charType === 'punctuation') {
                if (currentToken) {
                    tokens.push(currentToken);
                    currentToken = '';
                }
                tokens.push(char);
                lastCharType = null;
                continue;
            }
            
            // 如果字符类型改变了，可能需要分词
            if (lastCharType && charType !== lastCharType) {
                // 如果从日语文字变成其他，或者从其他变成日语文字，则分词
                if (
                    (lastCharType === 'hiragana' || lastCharType === 'katakana' || lastCharType === 'kanji') &&
                    (charType !== 'hiragana' && charType !== 'katakana' && charType !== 'kanji')
                ) {
                    tokens.push(currentToken);
                    currentToken = char;
                    lastCharType = charType;
                    continue;
                }
                
                if (
                    (charType === 'hiragana' || charType === 'katakana' || charType === 'kanji') &&
                    (lastCharType !== 'hiragana' && lastCharType !== 'katakana' && lastCharType !== 'kanji')
                ) {
                    tokens.push(currentToken);
                    currentToken = char;
                    lastCharType = charType;
                    continue;
                }
            }
            
            // 默认情况下添加到当前词
            currentToken += char;
            lastCharType = charType;
        }
        
        // 添加最后一个词
        if (currentToken) {
            tokens.push(currentToken);
        }
        
        return tokens.filter(token => token.trim() !== '');
    }
    
    // 简易转换方法，不依赖外部库，使用基础映射表
    simpleConvert(text) {
        if (!text) return { hiragana: '', romaji: '' };
        
        // 基础假名到罗马字的映射表
        const hiraganaToRomaji = {
            // 平假名元音
            'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
            // 平假名 K 行
            'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
            // 平假名 S 行
            'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
            // 平假名 T 行
            'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
            // 平假名 N 行
            'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
            // 平假名 H 行
            'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
            // 平假名 M 行
            'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
            // 平假名 Y 行
            'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
            // 平假名 R 行
            'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
            // 平假名 W 行
            'わ': 'wa', 'を': 'wo',
            // 平假名 N
            'ん': 'n',
            // 平假名拗音
            'きゃ': 'kya', 'きゅ': 'kyu', 'きょ': 'kyo',
            'しゃ': 'sha', 'しゅ': 'shu', 'しょ': 'sho',
            'ちゃ': 'cha', 'ちゅ': 'chu', 'ちょ': 'cho',
            'にゃ': 'nya', 'にゅ': 'nyu', 'にょ': 'nyo',
            'ひゃ': 'hya', 'ひゅ': 'hyu', 'ひょ': 'hyo',
            'みゃ': 'mya', 'みゅ': 'myu', 'みょ': 'myo',
            'りゃ': 'rya', 'りゅ': 'ryu', 'りょ': 'ryo',
            'ぎゃ': 'gya', 'ぎゅ': 'gyu', 'ぎょ': 'gyo',
            'じゃ': 'ja', 'じゅ': 'ju', 'じょ': 'jo',
            'びゃ': 'bya', 'びゅ': 'byu', 'びょ': 'byo',
            'ぴゃ': 'pya', 'ぴゅ': 'pyu', 'ぴょ': 'pyo',
            // 平假名浊音
            'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go',
            'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo',
            'だ': 'da', 'ぢ': 'ji', 'づ': 'zu', 'で': 'de', 'ど': 'do',
            'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo',
            'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po',
            // 平假名拨音
            'っ': '',
            // 片假名元音
            'ア': 'a', 'イ': 'i', 'ウ': 'u', 'エ': 'e', 'オ': 'o',
            // 片假名 K 行
            'カ': 'ka', 'キ': 'ki', 'ク': 'ku', 'ケ': 'ke', 'コ': 'ko',
            // 片假名 S 行
            'サ': 'sa', 'シ': 'shi', 'ス': 'su', 'セ': 'se', 'ソ': 'so',
            // 片假名 T 行
            'タ': 'ta', 'チ': 'chi', 'ツ': 'tsu', 'テ': 'te', 'ト': 'to',
            // 片假名 N 行
            'ナ': 'na', 'ニ': 'ni', 'ヌ': 'nu', 'ネ': 'ne', 'ノ': 'no',
            // 片假名 H 行
            'ハ': 'ha', 'ヒ': 'hi', 'フ': 'fu', 'ヘ': 'he', 'ホ': 'ho',
            // 片假名 M 行
            'マ': 'ma', 'ミ': 'mi', 'ム': 'mu', 'メ': 'me', 'モ': 'mo',
            // 片假名 Y 行
            'ヤ': 'ya', 'ユ': 'yu', 'ヨ': 'yo',
            // 片假名 R 行
            'ラ': 'ra', 'リ': 'ri', 'ル': 'ru', 'レ': 're', 'ロ': 'ro',
            // 片假名 W 行
            'ワ': 'wa', 'ヲ': 'wo',
            // 片假名 N
            'ン': 'n',
            // 片假名拗音
            'キャ': 'kya', 'キュ': 'kyu', 'キョ': 'kyo',
            'シャ': 'sha', 'シュ': 'shu', 'ショ': 'sho',
            'チャ': 'cha', 'チュ': 'chu', 'チョ': 'cho',
            'ニャ': 'nya', 'ニュ': 'nyu', 'ニョ': 'nyo',
            'ヒャ': 'hya', 'ヒュ': 'hyu', 'ヒョ': 'hyo',
            'ミャ': 'mya', 'ミュ': 'myu', 'ミョ': 'myo',
            'リャ': 'rya', 'リュ': 'ryu', 'リョ': 'ryo',
            'ギャ': 'gya', 'ギュ': 'gyu', 'ギョ': 'gyo',
            'ジャ': 'ja', 'ジュ': 'ju', 'ジョ': 'jo',
            'ビャ': 'bya', 'ビュ': 'byu', 'ビョ': 'byo',
            'ピャ': 'pya', 'ピュ': 'pyu', 'ピョ': 'pyo',
            // 片假名浊音
            'ガ': 'ga', 'ギ': 'gi', 'グ': 'gu', 'ゲ': 'ge', 'ゴ': 'go',
            'ザ': 'za', 'ジ': 'ji', 'ズ': 'zu', 'ゼ': 'ze', 'ゾ': 'zo',
            'ダ': 'da', 'ヂ': 'ji', 'ヅ': 'zu', 'デ': 'de', 'ド': 'do',
            'バ': 'ba', 'ビ': 'bi', 'ブ': 'bu', 'ベ': 'be', 'ボ': 'bo',
            'パ': 'pa', 'ピ': 'pi', 'プ': 'pu', 'ペ': 'pe', 'ポ': 'po',
            // 标点符号
            '、': ',', '。': '.', '！': '!', '？': '?', '「': '"', '」': '"',
            '（': '(', '）': ')', '・': '·', '　': ' ', ' ': ' ',
            // 特殊符号
            'ー': '-',
            // 分隔符
            ':': ' '
        };
        
        try {
            // 先进行简单分词
            const tokens = this.tokenizeJapanese(text);
            
            // 组合结果
            let resultHiragana = [];
            let resultRomaji = [];
            
            // 处理每个词
            for (const token of tokens) {
                let tokenHiragana = '';
                let tokenRomaji = '';
                let i = 0;
                
                while (i < token.length) {
                    // 检查双字符组合 (主要用于拗音)
                    if (i + 1 < token.length) {
                        const pair = token.substring(i, i + 2);
                        if (hiraganaToRomaji[pair]) {
                            // 如果前一个字符是小促音 "っ"，则将后面的辅音重复
                            if (i > 0 && (token[i - 1] === 'っ' || token[i - 1] === 'ッ')) {
                                const nextChar = hiraganaToRomaji[pair][0]; // 获取第一个字母
                                if (nextChar && "kstnhmyrwgzdbp".includes(nextChar)) {
                                    tokenRomaji += nextChar;
                                }
                            }
                            
                            tokenRomaji += hiraganaToRomaji[pair];
                            tokenHiragana += pair;
                            i += 2;
                            continue;
                        }
                    }
                    
                    // 单字符处理
                    const char = token[i];
                    
                    // 如果当前字符是小促音 "っ"，暂时跳过，因为我们会在处理下一个字符时处理它
                    if (char === 'っ' || char === 'ッ') {
                        tokenHiragana += char;
                        i++;
                        continue;
                    }
                    
                    // 如果是音调符号，直接跳过
                    if (char === 'ー') {
                        tokenRomaji += '-';
                        tokenHiragana += char;
                        i++;
                        continue;
                    }
                    
                    // 正常处理单个字符
                    if (hiraganaToRomaji[char]) {
                        // 如果前一个字符是小促音 "っ"，则将当前字符的辅音重复
                        if (i > 0 && (token[i - 1] === 'っ' || token[i - 1] === 'ッ')) {
                            const nextChar = hiraganaToRomaji[char][0]; // 获取第一个字母
                            if (nextChar && "kstnhmyrwgzdbp".includes(nextChar)) {
                                tokenRomaji += nextChar;
                            }
                        }
                        
                        tokenRomaji += hiraganaToRomaji[char];
                        tokenHiragana += char;
                    } else {
                        // 对于未知字符，直接保留
                        tokenRomaji += char;
                        tokenHiragana += char;
                    }
                    
                    i++;
                }
                
                // 将处理好的词添加到结果
                resultHiragana.push(tokenHiragana);
                resultRomaji.push(tokenRomaji);
            }
            
            // 组合最终结果
            return {
                hiragana: resultHiragana.join(':'),
                romaji: resultRomaji.join(' ')
            };
            
        } catch (error) {
            console.error('简易转换失败:', error);
            
            // 如果以上尝试失败，回退到最简单的处理
            return {
                hiragana: text.split('').join(':'),
                romaji: text
            };
        }
    }
}

// 创建单例实例
export const japaneseConverter = new JapaneseConverter();