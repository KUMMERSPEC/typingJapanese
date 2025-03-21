// 在类外部定义基础URL
const BASE_URL = window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));

class JapaneseConverter {
    constructor() {
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
            'きょ': 'kyo', 'しょ': 'sho', 'ちょ': 'cho', 'にょ': 'nyo',
            'ひょ': 'hyo', 'みょ': 'myo', 'りょ': 'ryo', 'ぎょ': 'gyo',
            'じょ': 'jo', 'びょ': 'byo', 'ぴょ': 'pyo',
            // 促音
            'っ': '',
            // 长音
            'ー': ''
        };

        // 修改初始化状态管理
        this.initialized = false;
        this.tokenizer = null;
        this.initializationPromise = null;

        // 使用绝对路径
        this.dictPath = `${BASE_URL}/dict`;

        // 添加加载状态标志
        this.isLoading = false;
        this.loadingError = null;
    }

    // 改进初始化方法
    async initTokenizer() {
        // 如果已经初始化成功，直接返回
        if (this.initialized && this.tokenizer) {
            return this.tokenizer;
        }

        // 如果正在加载中，等待现有的promise
        if (this.isLoading && this.initializationPromise) {
            return this.initializationPromise;
        }

        this.isLoading = true;
        this.loadingError = null;

        this.initializationPromise = new Promise((resolve, reject) => {
            try {
                console.log('开始初始化分词器...');
                console.log('使用词典路径:', this.dictPath);

                // 添加超时处理
                const timeoutId = setTimeout(() => {
                    const error = new Error('分词器初始化超时');
                    this.handleInitError(error);
                    reject(error);
                }, 30000); // 30秒超时

                kuromoji.builder({ dicPath: this.dictPath }).build((err, tokenizer) => {
                    clearTimeout(timeoutId);
                    
                    if (err) {
                        this.handleInitError(err);
                        reject(err);
                        return;
                    }
                    
                    console.log('分词器构建成功');
                    this.tokenizer = tokenizer;
                    this.initialized = true;
                    this.isLoading = false;
                    resolve(tokenizer);
                });

            } catch (error) {
                this.handleInitError(error);
                reject(error);
            }
        });

        return this.initializationPromise.catch(error => {
            this.handleInitError(error);
            throw error;
        });
    }

    // 添加错误处理方法
    handleInitError(error) {
        console.error('分词器初始化失败:', error);
        this.loadingError = error;
        this.isLoading = false;
        this.initialized = false;
        this.initializationPromise = null;
    }

    // 修改转换方法以更好地处理错误
    async convert(text) {
        try {
            if (this.loadingError) {
                throw new Error('分词器初始化失败，请刷新页面重试');
            }

            // 如果未初始化，先初始化
            if (!this.initialized) {
                await this.initTokenizer();
            }

            if (!this.tokenizer) {
                throw new Error('分词器未正确初始化');
            }

            // 执行转换
            const tokens = this.tokenizer.tokenize(text);
            
            // 获取平假名和罗马字
            const hiragana = tokens.map(token => {
                const reading = token.reading || token.surface_form;
                return token.pos === '助詞' ? `:${reading}:` : reading;
            }).join('');

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
            console.error('转换失败:', error);
            return {
                success: false,
                error: error.message || "转换失败，请稍后重试"
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

    // 片假名转平假名
    katakanaToHiragana(str) {
        return str.replace(/[\u30A0-\u30FF]/g, char => 
            String.fromCharCode(char.charCodeAt(0) - 0x60)
        );
    }

    // 转换为罗马字
    hiraganaToRomaji(hiragana) {
        const parts = hiragana.split(':');
        return parts.map(part => {
            if (!part) return '';
            
            let result = '';
            let i = 0;
            
            while (i < part.length) {
                // 检查双字符组合
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

// 创建单例实例
const converter = new JapaneseConverter();

// 导出单例实例
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
        // 设置较长的超时时间进行初始化
        const initTimeout = setTimeout(() => {
            console.error('初始化超时');
            alert('分词器加载超时，请刷新页面重试');
        }, 30000);

        await converter.initTokenizer();
        clearTimeout(initTimeout);
    } catch (error) {
        console.error('初始化失败:', error);
        alert('分词器初始化失败，请刷新页面重试');
    }
}); 