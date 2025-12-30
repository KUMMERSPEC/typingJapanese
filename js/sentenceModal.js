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
    modal.id = 'sentenceModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="min-width:320px;max-width:460px;">
            <div class="modal-header"><h3 id="sentenceModalTitle">添加句子</h3><button class="close-btn">&times;</button></div>
            <form id="sentenceForm" style="display:flex;flex-direction:column;gap:12px;margin-top:12px;">
                <label>语言
                    <select id="smLang">
                        <option value="ja" selected>日语</option>
                        <option value="en">英语</option>
                    </select>
                </label>
                <label>句子<input id="smJapanese" type="text" required></label>
                <button type="button" id="smConvertBtn" style="align-self:flex-start;">转换/分词</button>
                <label>分词<textarea id="smHiragana" rows="2" required></textarea></label>
                <label id="smRomajiLabel">罗马字<input id="smRomaji" type="text"></label>
                <label>中文<input id="smMeaning" type="text" required></label>
                <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px;">
                    <button type="button" class="cancel-btn">取消</button>
                    <button type="submit" class="primary-btn">保存</button>
                </div>
            </form>
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

    updateUIForLang(); // Initial setup

    // 分词(假名) -> 罗马字联动（仅日语）
    hiraArea.addEventListener('input', () => {
        if (langSelect.value !== 'ja') return;
        romaInput.value = converter.hiraganaToRomaji(hiraArea.value);
    });

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

