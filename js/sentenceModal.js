/*
 * sentenceModal.js
 * 封装“添加 / 编辑 单句”弹窗逻辑，包含：
 * - 日语分词（converter.convert）
 * - 假名实时 → 罗马字联动
 */

import converter from './converter.js';

function createBaseModal() {
    let modal = document.getElementById('sentenceModal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.style.zIndex = 2200;
    modal.id = 'sentenceModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="min-width:320px;max-width:460px;">
            <div class="modal-header"><h3 id="sentenceModalTitle">添加句子</h3><button class="close-btn">&times;</button></div>
            <div class="modal-body">
                <form id="sentenceForm" class="modal-form">
                <div class="form-group">
                    <label for="smLang">语言</label>
                    <select id="smLang">
                        <option value="ja" selected>日语</option>
                        <option value="en">英语</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="smJapanese">句子</label>
                    <input id="smJapanese" type="text" required>
                </div>
                <div class="form-group">
                    <button type="button" id="smConvertBtn" class="btn btn-secondary" style="width:auto;">转换/分词</button>
                </div>
                <div class="form-group">
                    <label for="smHiragana">分词</label>
                    <textarea id="smHiragana" rows="2" required></textarea>
                </div>
                <div class="form-group" id="smRomajiLabel">
                    <label for="smRomaji">罗马字</label>
                    <input id="smRomaji" type="text">
                </div>
                <div class="form-group">
                    <label for="smMeaning">中文</label>
                    <input id="smMeaning" type="text" required>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary cancel-btn">取消</button>
                    <button type="submit" class="btn btn-primary">保存</button>
                </div>
            </form>
        </div>
        </div>`;
    document.body.appendChild(modal);

    // common close handlers
    const close = () => modal.classList.remove('show');
    modal.querySelector('.close-btn').onclick = close;
    modal.querySelector('.cancel-btn').onclick = close;
    modal.onclick = (e) => { if (e.target === modal) close(); };

    // convert btn & lang switcher
    const langSelect = modal.querySelector('#smLang');
    const jpInput = modal.querySelector('#smJapanese');
    const hiraArea = modal.querySelector('#smHiragana');
    const romaInput = modal.querySelector('#smRomaji');
    const romaLabel = modal.querySelector('#smRomajiLabel');

    const autoSplitEnglish = (s) => s.toLowerCase().replace(/[^a-z0-9']+/gi, ' ').trim().split(/\s+/).join(':');

    const updateUIForLang = () => {
        const isJa = langSelect.value === 'ja';
        romaLabel.style.display = isJa ? '' : 'none';
        romaInput.required = isJa;
    };

    langSelect.addEventListener('change', updateUIForLang);

    modal.querySelector('#smConvertBtn').onclick = async () => {
        const text = jpInput.value.trim();
        if (!text) return;

        if (langSelect.value === 'ja') {
            const { success, data } = await converter.convert(text);
            if (success) {
                hiraArea.value = data.hiragana;
                romaInput.value = data.romaji;
            }
        } else { // English
            hiraArea.value = autoSplitEnglish(text);
            romaInput.value = ''; // No romaji for English
        }
    };

    // 分词(假名) -> 罗马字联动（仅日语）
    hiraArea.addEventListener('input', () => {
        if (langSelect.value !== 'ja') return;
        romaInput.value = converter.hiraganaToRomaji(hiraArea.value);
    });
    
    updateUIForLang(); // Initial setup

    return modal;
}

export function showAddSentenceModal(onSave) {
    const modal = createBaseModal();
    modal.querySelector('#sentenceModalTitle').textContent = '添加句子';
    const form = modal.querySelector('#sentenceForm');
    form.onsubmit = (e) => {
        e.preventDefault();
        const data = {
            japanese: form.querySelector('#smJapanese').value.trim(),
            hiragana: form.querySelector('#smHiragana').value.trim(),
            romaji: form.querySelector('#smRomaji').value.trim(),
            meaning: form.querySelector('#smMeaning').value.trim(),
            lang: form.querySelector('#smLang').value
        };
        if (onSave) onSave(data);
        modal.classList.remove('show');
    };
    form.reset();
    modal.classList.add('show');
}

export function showEditSentenceModal(originalData, onSave) {
    const modal = createBaseModal();
    modal.querySelector('#sentenceModalTitle').textContent = '编辑句子';
    const form = modal.querySelector('#sentenceForm');
    form.querySelector('#smJapanese').value = originalData.japanese || '';
    form.querySelector('#smHiragana').value = originalData.hiragana || '';
    form.querySelector('#smRomaji').value = originalData.romaji || '';
    form.querySelector('#smMeaning').value = originalData.meaning || '';
    form.querySelector('#smLang').value = originalData.lang || 'ja';

    form.onsubmit = (e) => {
        e.preventDefault();
        const data = {
            japanese: form.querySelector('#smJapanese').value.trim(),
            hiragana: form.querySelector('#smHiragana').value.trim(),
            romaji: form.querySelector('#smRomaji').value.trim(),
            meaning: form.querySelector('#smMeaning').value.trim(),
            lang: form.querySelector('#smLang').value
        };
        if (onSave) onSave(data);
        modal.classList.remove('show');
    };
    modal.classList.add('show');
}
