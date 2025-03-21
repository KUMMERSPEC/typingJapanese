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
        this.initializationAttempts = 0;
        this.maxInitializationAttempts = 3;

        // 使用绝对路径
        this.dictPath = `${BASE_URL}/dict`;
    }

    // 修改初始化方法
    async initTokenizer() {
        // 如果已经初始化成功，直接返回
        if (this.initialized && this.tokenizer) {
            return this.tokenizer;
        }

        // 如果正在初始化，返回现有的 promise
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = new Promise((resolve, reject) => {
            try {
                console.log('开始初始化分词器...');
                console.log('使用词典路径:', this.dictPath);

                // 使用原生 kuromoji 初始化
                kuromoji.builder({ dicPath: this.dictPath }).build((err, tokenizer) => {
                    if (err) {
                        console.error('分词器构建失败:', err);
                        reject(err);
                        return;
                    }
                    
                    console.log('分词器构建成功');
                    this.tokenizer = tokenizer;
                    this.initialized = true;
                    resolve(tokenizer);
                });

            } catch (error) {
                console.error('分词器初始化失败:', error);
                reject(error);
            }
        });

        return this.initializationPromise;
    }

    // 修改转换方法
    async convert(text) {
        try {
            // 如果未初始化，先初始化
            if (!this.initialized) {
                await this.initTokenizer();
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
                error: "转换失败: " + (error.message || "请手动输入假名和罗马音")
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
        // 转换失败，启用手动输入
        console.error(result.error);
        alert(result.error);
        enableManualInput(hiraganaInput, romajiInput);
    }
}

// 添加启用手动输入的辅助函数
function enableManualInput(hiraganaInput, romajiInput) {
    if (hiraganaInput) {
        hiraganaInput.removeAttribute('readonly');
        hiraganaInput.placeholder = '请手动输入假名';
    }
    if (romajiInput) {
        romajiInput.removeAttribute('readonly');
        romajiInput.placeholder = '请手动输入罗马音';
    }
}

// 在页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 初始化转换器
        await converter.initTokenizer();
    } catch (error) {
        console.error('初始化失败:', error);
        // 不再显示alert，而是直接切换到手动模式
        const hiraganaInputs = document.querySelectorAll('.hiragana-input');
        const romajiInputs = document.querySelectorAll('.romaji-input');
        
        hiraganaInputs.forEach(input => enableManualInput(input, null));
        romajiInputs.forEach(input => enableManualInput(null, input));
        
        // 可以添加一个提示信息
        const notice = document.createElement('div');
        notice.className = 'notice';
        notice.textContent = '自动转换功能暂时不可用，已切换到手动输入模式';
        document.body.insertBefore(notice, document.body.firstChild);
    }
}); 