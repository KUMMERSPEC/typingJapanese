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
            
            // 修改路径处理，使用更可靠的方式
            const pathSegments = window.location.pathname.split('/');
            const repoName = pathSegments[1]; // 获取仓库名
            
            // 根据不同环境设置不同的路径
            if (window.location.hostname === 'kummerspec.github.io') {
                this.dictPath = `/${repoName}/dict`;  // GitHub Pages
            } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                this.dictPath = './dict';  // 本地开发
            } else {
                this.dictPath = '/dict';   // 其他环境
            }
            
            console.log('Current hostname:', window.location.hostname);
            console.log('Current pathname:', window.location.pathname);
            console.log('Dictionary path:', this.dictPath);
        } catch (error) {
            console.error('Converter initialization error:', error);
            // 确保基本属性被设置
            this.initialized = false;
            this.tokenizer = null;
            this.dictPath = './dict';
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

            if (typeof kuromoji === 'undefined') {
                throw new Error('kuromoji not loaded');
            }

            return await new Promise((resolve) => {
                try {
                    kuromoji.builder({ dicPath: this.dictPath }).build((err, tokenizer) => {
                        if (err) {
                            console.warn('Tokenizer initialization failed:', err);
                            this.isLoading = false;
                            resolve(null);
                            return;
                        }
                        
                        this.tokenizer = tokenizer;
                        this.initialized = true;
                        this.isLoading = false;
                        resolve(tokenizer);
                    });
                } catch (error) {
                    console.warn('Tokenizer build error:', error);
                    this.isLoading = false;
                    resolve(null);
                }
            });
        } catch (error) {
            console.warn('Tokenizer initialization error:', error);
            this.isLoading = false;
            return null;
        }
    }

    // 修改转换方法
    async convert(text) {
        try {
            // 如果未初始化，先初始化
            if (!this.initialized) {
                await this.initTokenizer();
            }

            // 如果没有分词器，返回原文
            if (!this.tokenizer) {
                return {
                    success: true,
                    data: {
                        original: text,
                        hiragana: text,
                        romaji: text
                    }
                };
            }

            // 执行转换
            const tokens = this.tokenizer.tokenize(text);
            
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
                    // 特殊处理拟声拟态词（副词）
                    else if ((token.pos === '助動詞' || token.pos === '助詞') && 
                            prevToken.pos === '副詞' && 
                            (prevToken.surface_form.endsWith('っと') || 
                             prevToken.surface_form.endsWith('ッと'))) {
                        needSeparator = false;
                    }
                    // 如果是助词，在前面添加分隔符
                    else if (token.pos === '助詞' && !token.surface_form.endsWith('っと') && !token.surface_form.endsWith('ッと')) {
                        needSeparator = true;
                    }
                    // 如果前一个是助词，不添加分隔符
                    else if (prevToken.pos === '助詞' && !prevToken.surface_form.endsWith('っと') && !prevToken.surface_form.endsWith('ッと')) {
                        needSeparator = false;
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
            console.log('转换失败，返回原文');
            return {
                success: true,
                data: {
                    original: text,
                    hiragana: text,
                    romaji: text
                }
            };
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

// 创建单例实例
let converter;
try {
    converter = new JapaneseConverter();
} catch (error) {
    console.error('Failed to create converter:', error);
    // 创建一个降级版本的转换器
    converter = {
        async convert(text) {
            return {
                success: true,
                data: { original: text, hiragana: text, romaji: text }
            };
        }
    };
}

export default converter;

// 修改处理转换结果的函数
function handleConversionResult(result, hiraganaInput, romajiInput) {
    if (result.success) {
        // 转换成功，自动填充
        hiraganaInput.value = result.data.hiragana;
        romajiInput.value = result.data.romaji;
    } else {
        // 转换失败
        console.error(result.error);
    }
}

// 改进页面加载初始化逻辑
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await converter.initTokenizer();
    } catch (error) {
        console.log('初始化过程出错，使用降级模式');
    }
}); 