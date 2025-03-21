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

        // 初始化分词器
        this.initTokenizer();
    }

    async initTokenizer() {
        try {
            this.tokenizer = await new Promise((resolve, reject) => {
                kuromoji.builder({ dicPath: "https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict" })
                    .build((err, tokenizer) => {
                        if (err) reject(err);
                        else resolve(tokenizer);
                    });
            });
        } catch (error) {
            console.error("分词器初始化失败:", error);
            throw error;
        }
    }

    // 转换日文文本
    async convert(text) {
        if (!this.tokenizer) {
            await this.initTokenizer();
        }

        // 分词
        const tokens = this.tokenizer.tokenize(text);
        
        // 生成假名形式（带分隔符）
        const hiragana = tokens.map(token => {
            const reading = this.getReading(token);
            return token.pos === '助詞' ? `:${reading}:` : reading;
        }).join('');

        // 生成罗马字（带分隔符）
        const romaji = this.hiraganaToRomaji(hiragana);

        return {
            original: text,
            hiragana: hiragana,
            romaji: romaji
        };
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