// 日语转换器
export class JapaneseConverter {
    constructor() {
        this.kuroshiro = null;
        this.initialized = false;
        this.initializing = false;
        this.initPromise = null;
    }

    async init() {
        if (this.initialized) {
            return;
        }

        if (this.initializing) {
            // 如果已经在初始化过程中，等待初始化完成
            return this.initPromise;
        }

        // 创建初始化Promise
        this.initializing = true;
        this.initPromise = new Promise(async (resolve, reject) => {
            try {
                console.log('开始初始化日语转换器...');
                
                // 检查 Kuroshiro 是否存在
                if (typeof Kuroshiro === 'undefined' || typeof KuromojiAnalyzer === 'undefined') {
                    console.error('Kuroshiro 或 KuromojiAnalyzer 未定义，请确保已正确加载相关库');
                    throw new Error('所需库未加载');
                }
                
                this.kuroshiro = new Kuroshiro();
                await this.kuroshiro.init(new KuromojiAnalyzer({
                    dictPath: "https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict"
                }));
                this.initialized = true;
                console.log('日语转换器初始化成功');
                resolve();
            } catch (error) {
                console.error('日语转换器初始化失败:', error);
                this.initialized = false;
                reject(error);
            } finally {
                this.initializing = false;
            }
        });

        return this.initPromise;
    }

    async convert(text) {
        if (!text) {
            return { hiragana: '', romaji: '' };
        }
        
        try {
            if (!this.initialized) {
                await this.init();
            }

            console.log('使用Kuroshiro转换:', text);

            // 获取平假名 - 使用segmented模式以获得更好的分词
            const hiragana = await this.kuroshiro.convert(text, {
                to: 'hiragana',
                mode: 'furigana'
            });

            // 获取罗马字
            const romaji = await this.kuroshiro.convert(text, {
                to: 'romaji',
                mode: 'spaced'
            });

            // 处理furigana模式的输出，提取纯平假名文本并用冒号分隔
            const hiraganaText = this.extractTextFromFurigana(hiragana);
            
            return {
                hiragana: hiraganaText,
                romaji: romaji.toLowerCase()
            };
        } catch (error) {
            console.error('转换失败，使用简易转换:', error);
            
            // 使用简单的手动分词作为回退方案
            return this.simpleConvert(text);
        }
    }
    
    // 从furigana HTML中提取纯文本并添加分隔符
    extractTextFromFurigana(furiganaHtml) {
        try {
            // 创建临时DOM元素并设置innerHTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = furiganaHtml;
            
            // 提取所有ruby元素
            const rubyElements = tempDiv.querySelectorAll('ruby');
            
            if (rubyElements.length === 0) {
                // 如果没有ruby元素，返回原始文本并用冒号替换空格
                return tempDiv.textContent.trim().replace(/\s+/g, ':');
            }
            
            // 提取文本并适当分隔
            const segments = [];
            let currentText = '';
            let lastNode = null;
            
            // 处理所有子节点
            for (const node of tempDiv.childNodes) {
                if (node.nodeType === Node.TEXT_NODE) {
                    // 处理文本节点
                    const text = node.textContent.trim();
                    if (text) {
                        if (currentText) {
                            segments.push(currentText);
                        }
                        // 文本节点按字符拆分并添加冒号
                        const chars = text.split('');
                        currentText = chars.join('');
                    }
                } else if (node.nodeName === 'RUBY') {
                    // 处理ruby元素
                    const rbText = node.querySelector('rb')?.textContent || '';
                    const rtText = node.querySelector('rt')?.textContent || '';
                    
                    if (rtText) {
                        if (currentText) {
                            segments.push(currentText);
                        }
                        currentText = rtText;
                    } else if (rbText) {
                        currentText += rbText;
                    }
                }
                
                lastNode = node;
            }
            
            // 添加最后一段文本
            if (currentText) {
                segments.push(currentText);
            }
            
            // 连接所有段落并用冒号分隔
            return segments.join(':');
        } catch (error) {
            console.error('提取furigana文本失败:', error);
            return furiganaHtml.replace(/<[^>]*>/g, '').replace(/\s+/g, ':');
        }
    }
    
    // 检查是否是日本汉字
    isKanji(char) {
        return /[\u4E00-\u9FAF]/.test(char);
    }
    
    // 简单的日文分词 - 加强版
    tokenizeJapanese(text) {
        if (!text) return [];
        
        // 分词规则：
        // 1. 遇到标点符号分词
        // 2. 日语和非日语之间分词
        // 3. 汉字和假名之间可能需要分词
        // 4. 尝试通过语法规则进行分词
        
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
        
        // 判断是否为助词
        const isParticle = (token) => {
            return ['は', 'が', 'を', 'に', 'へ', 'と', 'で', 'から', 'まで', 'より', 'の', 'や', 'な', 'ね'].includes(token);
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
            
            // 如果字符类型改变了，考虑是否需要分词
            if (lastCharType && charType !== lastCharType) {
                // 汉字后面跟假名，可能是同一个词
                if (lastCharType === 'kanji' && (charType === 'hiragana' || charType === 'katakana')) {
                    // 查看后续几个字符，如果只有很少的假名（1-2个），可能是一个词
                    let hiraganaCount = 0;
                    let j = i;
                    while (j < text.length && (getCharType(text[j]) === 'hiragana' || getCharType(text[j]) === 'katakana')) {
                        hiraganaCount++;
                        j++;
                    }
                    
                    // 如果后面跟很多假名或者是已知的助词，分词
                    if (hiraganaCount > 2 || isParticle(text.substring(i, j))) {
                        tokens.push(currentToken);
                        currentToken = char;
                        lastCharType = charType;
                        continue;
                    }
                    // 否则不分词，继续添加
                }
                // 如果从日语文字变成非日语文字，则分词
                else if (
                    (lastCharType === 'hiragana' || lastCharType === 'katakana' || lastCharType === 'kanji') &&
                    (charType !== 'hiragana' && charType !== 'katakana' && charType !== 'kanji')
                ) {
                    tokens.push(currentToken);
                    currentToken = char;
                    lastCharType = charType;
                    continue;
                }
                // 如果从非日语文字变成日语文字，则分词
                else if (
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
        
        // 进一步处理分词结果，处理助词等特殊情况
        const finalTokens = [];
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            // 检查常见的助词
            if (token.length > 1) {
                const lastChar = token.charAt(token.length - 1);
                if (isParticle(lastChar) && getCharType(lastChar) === 'hiragana') {
                    // 将助词单独分词
                    finalTokens.push(token.substring(0, token.length - 1));
                    finalTokens.push(lastChar);
                    continue;
                }
            }
            finalTokens.push(token);
        }
        
        return finalTokens.filter(token => token.trim() !== '');
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
                
                // 检查是否包含汉字
                const containsKanji = [...token].some(char => this.isKanji(char));
                
                // 对于纯汉字词，尝试基于常见汉字词映射
                if (containsKanji) {
                    // 常见汉字词的读音映射（这只是一个小例子，实际应用中需要更完整的词典）
                    const kanjiDict = {
                        '私': 'わたし',
                        '僕': 'ぼく',
                        '今日': 'きょう',
                        '明日': 'あした',
                        '昨日': 'きのう',
                        '学生': 'がくせい',
                        '先生': 'せんせい',
                        '日本': 'にほん',
                        '映画': 'えいが',
                        '学校': 'がっこう',
                        '図書館': 'としょかん',
                        '大学': 'だいがく',
                        '食べる': 'たべる',
                        '飲む': 'のむ',
                        '見る': 'みる',
                        '来る': 'くる',
                        '行く': 'いく',
                        '帰る': 'かえる',
                        '話す': 'はなす',
                        '聞く': 'きく',
                        '読む': 'よむ',
                        '書く': 'かく',
                        '勉強': 'べんきょう',
                        '電話': 'でんわ',
                        '携帯': 'けいたい',
                        '時間': 'じかん',
                        '自転車': 'じてんしゃ',
                        '電車': 'でんしゃ',
                        '新幹線': 'しんかんせん',
                        '美味しい': 'おいしい',
                        '早い': 'はやい',
                        '遅い': 'おそい',
                        '高い': 'たかい',
                        '安い': 'やすい',
                        '暑い': 'あつい',
                        '寒い': 'さむい'
                    };
                    
                    // 尝试在词典中查找
                    if (kanjiDict[token]) {
                        tokenHiragana = kanjiDict[token];
                        // 遍历假名计算罗马字
                        for (let j = 0; j < tokenHiragana.length; j++) {
                            const char = tokenHiragana[j];
                            if (hiraganaToRomaji[char]) {
                                tokenRomaji += hiraganaToRomaji[char];
                            } else {
                                tokenRomaji += char;
                            }
                        }
                        
                        resultHiragana.push(tokenHiragana);
                        resultRomaji.push(tokenRomaji);
                        continue;
                    }
                }
                
                // 常规处理
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
                    
                    // 如果是汉字，我们无法简单转换，保持原样
                    if (this.isKanji(char)) {
                        tokenRomaji += char;
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