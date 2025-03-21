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

        // 修改初始化策略
        this.initialized = false;
        this.tokenizer = null;
        this.initializationPromise = null;
    }

    // 修改初始化方法
    async initTokenizer() {
        // 如果已经在初始化中，返回现有的 promise
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        // 创建新的初始化 promise
        this.initializationPromise = new Promise((resolve, reject) => {
            // 检查 kuromoji 是否已加载
            if (typeof kuromoji === 'undefined') {
                // 尝试动态加载 kuromoji
                const script = document.createElement('script');
                script.src = "https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/build/kuromoji.js";
                script.onload = () => this.initKuromoji(resolve, reject);
                script.onerror = () => reject(new Error('无法加载 kuromoji 库'));
                document.head.appendChild(script);
            } else {
                this.initKuromoji(resolve, reject);
            }
        });

        try {
            await this.initializationPromise;
            console.log("分词器初始化成功");
            this.initialized = true;
        } catch (error) {
            console.error("分词器初始化失败:", error);
            this.initialized = false;
            throw error;
        }

        return this.initializationPromise;
    }

    // 分离 kuromoji 初始化逻辑
    initKuromoji(resolve, reject) {
        kuromoji.builder({ dicPath: "https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict" })
            .build((err, tokenizer) => {
                if (err) {
                    reject(err);
                    return;
                }
                this.tokenizer = tokenizer;
                this.initialized = true;
                resolve(tokenizer);
            });
    }

    // 修改转换方法，添加重试逻辑
    async convert(text, retryCount = 3) {
        for (let i = 0; i < retryCount; i++) {
            try {
                // 如果未初始化，先尝试初始化
                if (!this.initialized) {
                    await this.initTokenizer();
                }

                // 确保 tokenizer 存在
                if (!this.tokenizer) {
                    throw new Error("分词器未就绪");
                }

                const tokens = this.tokenizer.tokenize(text);
                const hiragana = tokens.map(token => {
                    const reading = this.getReading(token);
                    return token.pos === '助詞' ? `:${reading}:` : reading;
                }).join('');

                const romaji = this.hiraganaToRomaji(hiragana);

                return {
                    success: true,
                    data: {
                        original: text,
                        hiragana: hiragana,
                        romaji: romaji
                    }
                };
            } catch (error) {
                console.error(`转换失败 (尝试 ${i + 1}/${retryCount}):`, error);
                
                // 如果是最后一次尝试，返回错误
                if (i === retryCount - 1) {
                    return {
                        success: false,
                        error: "转换失败，请手动输入假名和罗马音"
                    };
                }
                
                // 等待一段时间后重试
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
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

// 添加一个全局函数来处理转换结果
function handleConversionResult(result, hiraganaInput, romajiInput) {
    if (result.success) {
        // 转换成功，自动填充
        hiraganaInput.value = result.data.hiragana;
        romajiInput.value = result.data.romaji;
    } else {
        // 转换失败，启用手动输入
        alert(result.error);
        hiraganaInput.removeAttribute('readonly');
        romajiInput.removeAttribute('readonly');
    }
}

// 使用示例：
async function example() {
    const converter = new JapaneseConverter();
    const result = await converter.convert('日本語を勉強する');
    console.log(result);
    // 输出:
    // {
    //   original: "日本語を勉強する",
    //   hiragana: "にほんご:を:べんきょうする",
    //   romaji: "nihongo:wo:benkyousuru"
    // }
} 