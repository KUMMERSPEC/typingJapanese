// 在类外部定义基础URL
const BASE_URL = window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));

class JapaneseConverter {
    constructor() {
        try {
            // 初始化假名到罗马字的映射
            this.hiraganaToRomajiMap = {
                // 基本假名
                'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
                'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
                'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
                'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
                'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
                'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
                'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
                'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
                'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
                'わ': 'wa', 'を': 'wo', 'ん': 'n',
                'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go',
                'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo',
                'だ': 'da', 'ぢ': 'ji', 'づ': 'zu', 'で': 'de', 'ど': 'do',
                'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo',
                'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po',
                // 拗音
                'きょ': 'kyo', 'きゅ': 'kyu', 'きゃ': 'kya',
                'しょ': 'sho', 'しゅ': 'shu', 'しゃ': 'sha',
                'ちょ': 'cho', 'ちゅ': 'chu', 'ちゃ': 'cha',
                'にょ': 'nyo', 'にゅ': 'nyu', 'にゃ': 'nya',
                'ひょ': 'hyo', 'ひゅ': 'hyu', 'ひゃ': 'hya',
                'みょ': 'myo', 'みゅ': 'myu', 'みゃ': 'mya',
                'りょ': 'ryo', 'りゅ': 'ryu', 'りゃ': 'rya',
                'ぎょ': 'gyo', 'ぎゅ': 'gyu', 'ぎゃ': 'gya',
                'じょ': 'jo', 'じゅ': 'ju', 'じゃ': 'ja',
                'びょ': 'byo', 'びゅ': 'byu', 'びゃ': 'bya',
                'ぴょ': 'pyo', 'ぴゅ': 'pyu', 'ぴゃ': 'pya',
                // 促音 (handled in logic)
                'っ': '',
                // 长音 (handled in logic)
                'ー': 'ー',
                // 片假名
            'ア': 'a', 'イ': 'i', 'ウ': 'u', 'エ': 'e', 'オ': 'o',
            'カ': 'ka', 'キ': 'ki', 'ク': 'ku', 'ケ': 'ke', 'コ': 'ko',
            'サ': 'sa', 'シ': 'shi', 'ス': 'su', 'セ': 'se', 'ソ': 'so',
            'タ': 'ta', 'チ': 'chi', 'ツ': 'tsu', 'テ': 'te', 'ト': 'to',
            'ナ': 'na', 'ニ': 'ni', 'ヌ': 'nu', 'ネ': 'ne', 'ノ': 'no',
            'ハ': 'ha', 'ヒ': 'hi', 'フ': 'fu', 'ヘ': 'he', 'ホ': 'ho',
            'マ': 'ma', 'ミ': 'mi', 'ム': 'mu', 'メ': 'me', 'モ': 'mo',
            'ヤ': 'ya', 'ユ': 'yu', 'ヨ': 'yo',
            'ラ': 'ra', 'リ': 'ri', 'ル': 'ru', 'レ': 're', 'ロ': 'ro',
            'ワ': 'wa', 'ヲ': 'wo', 'ン': 'n',
            'ガ': 'ga', 'ギ': 'gi', 'グ': 'gu', 'ゲ': 'ge', 'ゴ': 'go',
            'ザ': 'za', 'ジ': 'ji', 'ズ': 'zu', 'ゼ': 'ze', 'ゾ': 'zo',
            'ダ': 'da', 'ヂ': 'ji', 'ヅ': 'zu', 'デ': 'de', 'ド': 'do',
            'バ': 'ba', 'ビ': 'bi', 'ブ': 'bu', 'ベ': 'be', 'ボ': 'bo',
            'パ': 'pa', 'ピ': 'pi', 'プ': 'pu', 'ペ': 'pe', 'ポ': 'po',
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
            // イェ系
            'イェ': 'ye',
            // ウァ系
            'ウァ': 'wha',
            // ウィ系
            'ウィ': 'whi', 'ウェ': 'whe', 'ウォ': 'who',
            // キェ系
            'キェ': 'kye',
            // ギェ系
            'ギェ': 'gye',
            // ク系
            'クァ': 'kwa', 'クィ': 'kwi', 'クゥ': 'kwu', 'クェ': 'kwe', 'クォ': 'kwo',
            'クャ': 'kya', 'クュ': 'kyu', 'クョ': 'kyo',
            // グ系
            'グァ': 'gwa', 'グィ': 'gwi', 'グゥ': 'gwu', 'グェ': 'gwe', 'グォ': 'gwo',
            // シ系・ジ系
            'シェ': 'she', 'ジェ': 'je',
            // ス系
            'スァ': 'swa', 'スィ': 'swi', 'スゥ': 'swu', 'スェ': 'swe', 'スォ': 'swo',
            // チ系
            'チィ': 'tyi', 'チェ': 'che',
            // ツ系
            'ツァ': 'tsa', 'ツィ': 'tsi', 'ツェ': 'tse', 'ツォ': 'tso',
            // テ系
            'テャ': 'tha', 'ティ': 'thi', 'テュ': 'thu', 'テェ': 'the', 'テョ': 'tho',
            // デ系
            'デャ': 'dha', 'ディ': 'dhi', 'デュ': 'dhu', 'デェ': 'dhe', 'デョ': 'dho',
            // ト系
            'トァ': 'twa', 'トィ': 'twi', 'トゥ': 'twu', 'トェ': 'twe', 'トォ': 'two',
            // ド系
            'ドァ': 'dwa', 'ドィ': 'dwi', 'ドゥ': 'dwu', 'ドェ': 'dwe', 'ドォ': 'dwo',
            // ニ系
            'ニャ': 'nya', 'ニィ': 'nyi', 'ニュ': 'nyu', 'ニェ': 'nye', 'ニョ': 'nyo',
            // フ系
            'ファ': 'fa', 'フィ': 'fi', 'フゥ': 'fwu', 'フェ': 'fe', 'フォ': 'fo',
            'フャ': 'fya', 'フュ': 'fyu', 'フョ': 'fyo',
            // ヴ系
            'ヴァ': 'va', 'ヴィ': 'vi', 'ヴ': 'vu', 'ヴェ': 've', 'ヴォ': 'vo',
            'ヴャ': 'vya', 'ヴュ': 'vyu', 'ヴョ': 'vyo',
            // ビ系・ピ系
            'ビィ': 'byi', 'ビェ': 'bye',
            'ピィ': 'pyi', 'ピェ': 'pye',
            // リ系
            'リィ': 'ryi', 'リェ': 'rye',
            };

            // 修改初始化状态管理
            this.initialized = false;
            this.tokenizer = null;
            this.initializationPromise = null;
            this.isLoading = false;
            
            // 字典路径：基于当前模块位置，兼容各页面
            try {
                const dictUrl = new URL('../dict/', import.meta.url);
                this.dictPath = dictUrl.pathname.replace(/\/$/, '');
            } catch(_) {
                // 旧浏览器或特殊环境回退为页面所在目录下的 /dict
                this.dictPath = (window.location.pathname.replace(/\/[^\/.]*$/, '')) + '/dict';
            }
            
            console.log('Dictionary path:', this.dictPath);
        } catch (error) {
            console.error('Converter initialization error:', error);
            throw error; // 抛出错误以便更好地处理初始化失败
        }
    }

    async initTokenizer() {
        try {
            if (this.initialized && this.tokenizer) {
                return this.tokenizer;
            }

            if (this.isLoading) {
                return this.initializationPromise;
            }

            this.isLoading = true;
            console.log('Initializing tokenizer...');

            if (typeof kuromoji === 'undefined') {
                throw new Error('kuromoji not loaded');
            }

            this.initializationPromise = new Promise((resolve, reject) => {
                // 修正：始终使用相对于项目根目录的固定路径
                const dicPath = window.location.hostname === 'kummerspec.github.io' 
                    ? '/typingJapanese/dict/' 
                    : './dict/';

                kuromoji.builder({ dicPath: dicPath }).build((err, tokenizer) => {
                    if (err) {
                        console.error('Tokenizer initialization failed:', err);
                        this.isLoading = false;
                        reject(err);
                        return;
                    }
                    
                    console.log('Tokenizer initialized successfully');
                    this.tokenizer = tokenizer;
                    this.initialized = true;
                    this.isLoading = false;
                    resolve(tokenizer);
                });
            });

            return await this.initializationPromise;
        } catch (error) {
            console.error('Tokenizer initialization error:', error);
            this.isLoading = false;
            throw error;
        }
    }

    async convert(text) {
        try {
            console.log('Converting text:', text);

            // 如果未初始化，先初始化
            if (!this.initialized) {
                console.log('Tokenizer not initialized, initializing...');
                await this.initTokenizer();
            }

            // 如果没有分词器，返回错误
            if (!this.tokenizer) {
                console.error('Tokenizer not available');
                throw new Error('Tokenizer not available');
            }

            // 执行转换
            console.log('Tokenizing text...');
            const tokens = this.tokenizer.tokenize(text);
            console.log('Tokens:', tokens);
            
            // 获取平假名和罗马字，按词分割
            const readings = [];
            let skipNext = false;

            for (let i = 0; i < tokens.length; i++) {
                if (skipNext) {
                    skipNext = false;
                    continue;
                }

                const token = tokens[i];
                const nextToken = i + 1 < tokens.length ? tokens[i + 1] : null;
                const reading = token.reading || token.surface_form;

                // 判断是否需要添加分隔符
                let needSeparator = true;

                // 处理拟声拟态词
                if (nextToken && isOnomatopoeiaStart(token, nextToken)) {
                    // 合并拟声拟态词
                    const combinedReading = (token.reading || token.surface_form) + 
                                         (nextToken.reading || nextToken.surface_form);
                    readings.push(combinedReading);
                    skipNext = true;
                    continue;
                }

                // 特殊处理形容词和名词的连接
                if (readings.length > 0) {
                    const prevToken = tokens[i - 1];
                    
                    // 如果当前是名词，前一个是形容词，添加分隔符
                    if (token.pos === '名詞' && 
                        (prevToken.pos === '形容詞' || 
                         (prevToken.pos === '形容動詞' && prevToken.surface_form.endsWith('な')))) {
                        needSeparator = true;
                    }
                    // 如果当前token和前一个token都是名词的一部分，不添加分隔符
                    else if (token.pos === '名詞' && prevToken.pos === '名詞') {
                        needSeparator = false;
                    }
                    // 如果是助词，在前面添加分隔符
                    else if (token.pos === '助詞') {
                        needSeparator = true;
                    }
                    // 如果当前是动词，前一个是助词，添加分隔符
                    else if (token.pos === '動詞' && prevToken.pos === '助詞') {
                        needSeparator = true;
                    }
                    // 如果当前是动词，前一个是名词，添加分隔符
                    else if (token.pos === '動詞' && prevToken.pos === '名詞') {
                        needSeparator = true;
                    }
                    // 如果当前是动词，前一个是形容词，添加分隔符
                    else if (token.pos === '動詞' && prevToken.pos === '形容詞') {
                        needSeparator = true;
                    }
                    // 如果当前token是动词的一部分，不添加分隔符
                    else if (token.pos_detail_1 === '動詞語幹' || 
                            (token.pos === '動詞' && token.pos_detail_1 === '自立' && 
                             nextToken?.pos_detail_1 === '動詞語尾')) {
                        needSeparator = false;
                    }
                }

                // 添加当前词
                if (needSeparator && readings.length > 0) {
                    readings.push(':' + reading);
                } else {
                    readings.push(reading);
                }
            }

            // 将读音连接成字符串
            const hiragana = readings.join('');

            // 转换为罗马字
            const romaji = this.hiraganaToRomaji(this.katakanaToHiragana(hiragana));

            return {
                success: true,
                data: {
                    original: text,
                    hiragana: this.katakanaToHiragana(hiragana),
                    romaji: romaji
                }
            };
        } catch (error) {
            console.error('Conversion error:', error);
            throw error;
        }
    }

    // 获取读音
    getReading(token) {
        if (!token.reading) {
            return token.surface_form;
        }
        return this.katakanaToHiragana(token.reading);
    }

    // 修改片假名转平假名方法
    katakanaToHiragana(str) {
        return str.replace(/[\u30A0-\u30FF]/g, char => {
            // 长音符号 ー (U+30FC) 不应被转换，直接保留
            if (char === 'ー') {
                return 'ー';
            }
            return String.fromCharCode(char.charCodeAt(0) - 0x60);
        });
    }

    // 修改平假名转罗马字方法
    hiraganaToRomaji(hiragana) {
        const longVowelMap = {
            'aa': 'ā',
            'ii': 'ī',
            'uu': 'ū',
            'ee': 'ē',
            'oo': 'ō',
            'ou': 'ō'
        };

        const parts = hiragana.split(':');
        return parts.map(part => {
            if (!part) return '';
            
            let romaji = '';
            let i = 0;
            while (i < part.length) {
                // 检查拗音 (e.g., きゃ)
                if (i + 1 < part.length && this.hiraganaToRomajiMap[part.substring(i, i + 2)]) {
                    romaji += this.hiraganaToRomajiMap[part.substring(i, i + 2)];
                        i += 2;
                        continue;
                    }

                // 处理促音 (っ)
                if (part[i] === 'っ' || part[i] === 'ッ') {
                    if (i + 1 < part.length) {
                        const nextKana = part.substring(i + 1, i + 3);
                    const nextChar = part[i + 1];
                        let nextRomaji = this.hiraganaToRomajiMap[nextKana] || this.hiraganaToRomajiMap[nextChar];
                    if (nextRomaji) {
                            // 特殊处理 'ch'
                            if (nextRomaji.startsWith('ch')) {
                                romaji += 't';
                            } else {
                                romaji += nextRomaji.charAt(0);
                            }
                        }
                    }
                    i++;
                    continue;
                }

                // 基本假名转换
                const kana = this.hiraganaToRomajiMap[part[i]] || part[i];
                romaji += kana;
                i++;
            }
            
            // 处理长音
            // 1. 先处理长音符号 ー
            let processedRomaji = '';
            for (let j = 0; j < romaji.length; j++) {
                if (romaji[j] === 'ー' && j > 0) {
                    const prevChar = processedRomaji[processedRomaji.length - 1];
                    if ('aiueo'.includes(prevChar)) {
                        processedRomaji = processedRomaji.slice(0, -1) + longVowelMap[prevChar + prevChar];
                    }
                } else {
                    processedRomaji += romaji[j];
                }
            }
            
            // 2. 处理元音组合的长音 (e.g., ou -> ō)
            processedRomaji = processedRomaji.replace(/ou/g, 'ō');
            processedRomaji = processedRomaji.replace(/oo/g, 'ō');
            processedRomaji = processedRomaji.replace(/aa/g, 'ā');
            processedRomaji = processedRomaji.replace(/ii/g, 'ī');
            processedRomaji = processedRomaji.replace(/uu/g, 'ū');
            processedRomaji = processedRomaji.replace(/ee/g, 'ē');

            return processedRomaji;
        }).join(':');
    }
}

// 修改初始化逻辑，使用 window.onerror 捕获全局错误
window.onerror = function(msg, url, line, col, error) {
    console.warn('Global error:', { msg, url, line, col, error });
    return false;
};

// 修改单例实例创建和错误处理
let converter;
try {
    converter = new JapaneseConverter();
    // 立即初始化分词器
    converter.initTokenizer().catch(error => {
        console.error('Failed to initialize tokenizer:', error);
    });
} catch (error) {
    console.error('Failed to create converter:', error);
    converter = {
        async convert(text) {
            console.error('Using fallback converter');
            throw new Error('Converter initialization failed');
        }
    };
}

export default converter;

// 修改处理转换结果的函数
function handleConversionResult(result, hiraganaInput, romajiInput) {
    if (result.success) {
        console.log('Conversion successful:', result.data);
        hiraganaInput.value = result.data.hiragana;
        romajiInput.value = result.data.romaji;
    } else {
        console.error('Conversion failed:', result.error);
        alert('转换失败，请检查控制台获取详细信息');
    }
}

// 改进页面加载初始化逻辑
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('Initializing converter on page load...');
        await converter.initTokenizer();
        console.log('Converter initialized successfully');
    } catch (error) {
        console.error('Initialization error:', error);
        alert('初始化失败，请检查控制台获取详细信息');
    }
});

// 新的辅助函数，用于判断拟声拟态词的开始部分
function isOnomatopoeiaStart(token, nextToken) {
    // 检查是否为拟声拟态词的开始部分
    const isStartPattern = (token) => {
        return token.pos === '副詞' || // 词性为副词
               token.surface_form.match(/^[ぁ-んァ-ン]+$/); // 假名序列
    };

    // 检查是否为拟声拟态词的结束部分
    const isEndPattern = (token) => {
        return token.surface_form === 'っと' || 
               token.surface_form === 'ッと' ||
               token.surface_form.match(/^[っッ][とト]$/);
    };

    // 检查组合是否构成完整的拟声拟态词
    if (isStartPattern(token) && isEndPattern(nextToken)) {
        return true;
    }

    return false;
} 