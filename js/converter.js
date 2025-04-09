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
                // 促音
                'っ': '',
                // 长音
                'ー': ''
            };

            // 修改初始化状态管理
            this.initialized = false;
            this.tokenizer = null;
            this.initializationPromise = null;
            this.isLoading = false;
            
            // 修改字典路径处理
            const pathSegments = window.location.pathname.split('/');
            const repoName = pathSegments[1]; // 获取仓库名
            
            // 根据不同环境设置不同的路径
            if (window.location.hostname === 'kummerspec.github.io') {
                this.dictPath = `/${repoName}/dict`;  // GitHub Pages
            } else {
                // 本地开发环境使用相对路径
                this.dictPath = './dict';
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
                kuromoji.builder({ dicPath: this.dictPath }).build((err, tokenizer) => {
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
            const readings = tokens.map((token, index) => {
                // 获取读音（假名）
                const reading = token.reading || token.surface_form;
                
                // 判断是否需要添加分隔符
                let needSeparator = true;

                // 特殊处理形容词和名词的连接
                if (index > 0) {
                    const prevToken = tokens[index - 1];
                    
                    // 如果当前是名词，前一个是形容词（い形容词或な形容词），添加分隔符
                    if (token.pos === '名詞' && 
                        (prevToken.pos === '形容詞' || 
                         (prevToken.pos === '形容動詞' && prevToken.surface_form.endsWith('な')))) {
                        needSeparator = true;
                    }
                    // 如果当前token和前一个token都是名词的一部分，不添加分隔符
                    else if (token.pos === '名詞' && prevToken.pos === '名詞') {
                        needSeparator = false;
                    }
                    // 特殊处理拟声拟态词
                    else if (isOnomatopoeia(prevToken, token)) {
                        needSeparator = false;
                    }
                    // 如果当前是动词，前一个是拟声拟态词，添加分隔符
                    else if (token.pos === '動詞' && 
                            (prevToken.surface_form.endsWith('っと') || 
                             prevToken.surface_form.endsWith('ッと'))) {
                        needSeparator = true;
                    }
                    // 如果是助词，在前面添加分隔符
                    else if (token.pos === '助詞') {
                        needSeparator = true;
                    }
                    // 如果当前是动词，前一个是助词，添加分隔符
                    else if (token.pos === '動詞' && prevToken.pos === '助詞') {
                        needSeparator = true;
                    }
                }

                // 添加分隔符
                return needSeparator && index > 0 ? `:${reading}` : reading;
            });

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
        return str.replace(/[\u30A0-\u30FF]/g, char => 
            String.fromCharCode(char.charCodeAt(0) - 0x60)
        );
    }

    // 修改平假名转罗马字方法
    hiraganaToRomaji(hiragana) {
        const parts = hiragana.split(':');
        return parts.map(part => {
            if (!part) return '';
            
            let result = '';
            let i = 0;
            
            while (i < part.length) {
                // 检查双字符组合（拗音）
                if (i + 1 < part.length) {
                    const pair = part.slice(i, i + 2);
                    if (this.hiraganaToRomajiMap[pair]) {
                        result += this.hiraganaToRomajiMap[pair];
                        i += 2;
                        continue;
                    }
                }

                // 处理促音（っ）
                if (part[i] === 'っ' && i + 1 < part.length) {
                    const nextChar = part[i + 1];
                    const nextRomaji = this.hiraganaToRomajiMap[nextChar];
                    if (nextRomaji) {
                        const firstConsonant = nextRomaji.match(/^[^aeiou]/);
                        if (firstConsonant) {
                            result += firstConsonant[0];
                        }
                    }
                    i++;
                    continue;
                }

                // 单字符转换
                const romaji = this.hiraganaToRomajiMap[part[i]] || part[i];
                result += romaji;
                i++;
            }
            
            return result;
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

// 添加辅助函数来判断拟声拟态词
function isOnomatopoeia(prevToken, currentToken) {
    // 检查是否为拟声拟态词的一部分
    const isOnomatopoeiaPattern = (token) => {
        // 检查是否为拟声拟态词的常见模式
        const patterns = [
            /^[ぁ-んァ-ン]+[っッ][とト]$/, // ポロッと型
            /^[ぁ-んァ-ン]+$/, // ポロ、ガタ等
            /^[っッ][とト]$/ // っと、ッと
        ];
        
        return token.pos === '副詞' || // 词性为副词
               patterns.some(pattern => token.surface_form.match(pattern)) || // 匹配拟声拟态词模式
               (token.pos_detail_1 === '助動詞語幹' && token.surface_form.match(/^[ぁ-んァ-ン]+$/)); // 特殊情况处理
    };

    // 检查是否为完整的拟声拟态词组合
    const isFullOnomatopoeia = (token1, token2) => {
        const combined = token1.surface_form + token2.surface_form;
        return combined.match(/^[ぁ-んァ-ン]+[っッ][とト]$/);
    };

    // 如果前一个token和当前token组成完整的拟声拟态词
    if (isFullOnomatopoeia(prevToken, currentToken)) {
        return true;
    }

    // 如果前一个token是拟声拟态词的一部分，且当前token也是其一部分
    if (isOnomatopoeiaPattern(prevToken) && 
        (currentToken.surface_form === 'っと' || 
         currentToken.surface_form === 'ッと' ||
         isOnomatopoeiaPattern(currentToken))) {
        return true;
    }

    // 如果是单独的拟声拟态词
    if (prevToken.pos === '副詞' && 
        prevToken.surface_form.match(/^[ぁ-んァ-ン]+[っッ]?[とト]?$/)) {
        return true;
    }

    return false;
} 