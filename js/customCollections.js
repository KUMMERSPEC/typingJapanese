import converter from './converter.js';

export class CustomCollectionsManager {
    constructor() {
        this.collections = this.loadCollections();
        // 管理句子面板的本地状态（分页/搜索）
        this.manageState = { page: 1, pageSize: 10, query: '', collectionId: null };
        this.initializeModals();
        this.initializeEventListeners();
        this.initializeReviewProperties();
    }

    // 获取所有收藏夹
    getCollections() {
        const collections = Object.entries(this.collections).map(([id, collection]) => {
            const sentences = Object.entries(collection.sentences || {}).map(([sentenceId, sentence]) => ({
                id: sentenceId,
                ...sentence
            }));
            return {
                id,
                ...collection,
                sentences
            };
        });
        return collections;
    }

    // 加载所有收藏夹
    loadCollections() {
        return JSON.parse(localStorage.getItem('custom_collections') || '{}');
    }

    // 保存到 localStorage
    saveCollections() {
        const collectionsJson = JSON.stringify(this.collections);
        localStorage.setItem('custom_collections', collectionsJson);

        // Also save to Firebase if the sync module is available
        if (window.firebaseSync) {
            window.firebaseSync.saveData('custom_collections', collectionsJson);
        }
    }

    // 创建新收藏夹
    createCollection(name, description) {
        const id = `collection_${Date.now()}`;
        this.collections[id] = {
            name,
            description,
            created_at: new Date().toISOString(),
            sentences: {},
            review: {
                last_review: null,
                next_review: null,
                interval_days: 7,
                review_count: 0
            }
        };
        this.saveCollections();
        return id;
    }

    // 添加句子到收藏夹
    addSentence(collectionId, sentenceData) {
        if (!this.collections[collectionId]) {
            throw new Error('收藏夹不存在');
        }
        const id = `sentence_${Date.now()}`;
        this.collections[collectionId].sentences[id] = {
            ...sentenceData,
            type: 'split',
            created_at: new Date().toISOString()
        };
        this.saveCollections();
        return id;
    }

    // 获取收藏夹中的句子用于复习
    getSentencesForReview(collectionId) {
        const collection = this.collections[collectionId];
        if (!collection) return [];
        return Object.entries(collection.sentences).map(([id, sentence]) => ({
            id,
            ...sentence,
            course: collection.name,
            lesson: '自定义'
        }));
    }

    // 获取收藏夹中的句子用于闪卡
    getSentencesForFlashcard(collectionId) {
        const collection = this.collections[collectionId];
        if (!collection) return [];
        return Object.entries(collection.sentences).map(([id, sentence]) => ({
            id,
            japanese: sentence.japanese,
            hiragana: sentence.hiragana,
            romaji: sentence.romaji,
            meaning: sentence.meaning,
            type: 'custom',
            course: collection.name,
            lesson: '自定义',
            proficiency: 'low',
            lastReview: new Date().toISOString(),
            audioUrl: null
        }));
    }

    // 删除收藏夹
    deleteCollection(collectionId) {
        if (this.collections[collectionId]) {
            delete this.collections[collectionId];
            this.saveCollections();
            return true;
        }
        return false;
    }

    // 删除句子
    deleteSentence(collectionId, sentenceId) {
        if (this.collections[collectionId]?.sentences[sentenceId]) {
            delete this.collections[collectionId].sentences[sentenceId];
            this.saveCollections();
            return true;
        }
        return false;
    }

    // 编辑收藏夹信息
    editCollection(collectionId, name, description) {
        if (this.collections[collectionId]) {
            this.collections[collectionId].name = name;
            this.collections[collectionId].description = description;
            this.saveCollections();
            return true;
        }
        return false;
    }

    // 编辑句子
    editSentence(collectionId, sentenceId, sentenceData) {
        if (this.collections[collectionId]?.sentences[sentenceId]) {
            this.collections[collectionId].sentences[sentenceId] = {
                ...this.collections[collectionId].sentences[sentenceId],
                ...sentenceData,
                updated_at: new Date().toISOString()
            };
            this.saveCollections();
            return true;
        }
        return false;
    }

    // 初始化模态框
    initializeModals() {
        // 创建收藏夹管理模态框
        if (!document.getElementById('collectionsModal')) {
            const collectionsModal = document.createElement('div');
            collectionsModal.id = 'collectionsModal';
            collectionsModal.className = 'modal';
            collectionsModal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>管理收藏夹</h3>
                        <button class="close-btn">&times;</button>
                    </div>
                    <div class="collections-container">
                        <button class="add-collection-btn">
                            <i class="fas fa-plus"></i> 新建收藏夹
                        </button>
                        <div class="collections-list"></div>
                    </div>
                </div>
            `;
            document.body.appendChild(collectionsModal);
        }

        // 新建收藏夹模态框
        if (!document.getElementById('addCollectionModal')) {
            const addCollectionModal = document.createElement('div');
            addCollectionModal.id = 'addCollectionModal';
            addCollectionModal.className = 'modal';
            addCollectionModal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>新建收藏夹</h3>
                        <button class="close-btn">&times;</button>
                    </div>
                    <form id="addCollectionForm">
                        <div class="form-group">
                            <label for="collectionName">
                                <i class="fas fa-folder" style="margin-right: 6px; color: #4a90e2;"></i>
                                收藏夹名称
                            </label>
                            <input type="text" id="collectionName" required placeholder="例如：旅行常用句" maxlength="50">
                            <small class="form-hint">为您的收藏夹起一个易于识别的名称（最多50个字符）</small>
                        </div>
                        <div class="form-group">
                            <label for="collectionDescription">
                                <i class="fas fa-align-left" style="margin-right: 6px; color: #4a90e2;"></i>
                                描述
                            </label>
                            <textarea id="collectionDescription" placeholder="简单描述一下这个收藏夹的用途和内容..." maxlength="200"></textarea>
                            <small class="form-hint">可选：添加一些描述信息，帮助您更好地管理收藏夹（最多200个字符）</small>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="secondary-btn cancel-btn">
                                <i class="fas fa-times"></i> 取消
                            </button>
                            <button type="submit" class="primary-btn">
                                <i class="fas fa-check"></i> 创建
                            </button>
                        </div>
                    </form>
                </div>
            `;
            document.body.appendChild(addCollectionModal);
        }

        // 添加句子模态框
        if (!document.getElementById('addSentenceModal')) {
            const addSentenceModal = document.createElement('div');
            addSentenceModal.id = 'addSentenceModal';
            addSentenceModal.className = 'modal';
            addSentenceModal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>添加句子</h3>
                        <button class="close-btn">&times;</button>
                    </div>
                    <form id="addSentenceForm">
                        <div class="form-group lang-select-group">
                            <label for="lang">
                                <i class="fas fa-language" style="margin-right: 6px; color: #4a90e2;"></i>
                                语言
                            </label>
                            <select id="lang" class="lang-select">
                                <option value="ja" selected>日语</option>
                                <option value="en">英语</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="japanese">句子</label>
                            <div class="input-group">
                                <input type="text" id="japanese" required placeholder="输入句子（根据语言）">
                                <button type="button" class="convert-btn" id="convertBtn" disabled>
                                    <i class="fas fa-sync"></i> 转换
                                </button>
                            </div>
                            <div class="auto-convert-toggle">
                                <label>
                                    <input type="checkbox" id="autoConvert" checked>
                                    自动分词/转换
                                </label>
                            </div>
                        </div>
                        <div class="form-group" id="groupHiragana">
                            <label for="hiragana">目标分词</label>
                            <div class="input-group">
                                <input type="text" id="hiragana" required placeholder="日语：わたし:は:がくせい:です | 英语：i:am:a:student">
                                <div class="loading-spinner" style="display: none;"></div>
                            </div>
                        </div>
                        <div class="form-group" id="groupRomaji">
                            <label for="romaji">罗马音（仅日语）</label>
                            <div class="input-group">
                                <input type="text" id="romaji" required placeholder="watashi:wa:gakusei:desu">
                                <div class="loading-spinner" style="display: none;"></div>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="meaning">中文含义</label>
                            <input type="text" id="meaning" required placeholder="输入中文翻译">
                        </div>
                        <div class="form-actions">
                            <button type="button" class="secondary-btn cancel-btn">取消</button>
                            <button type="submit" class="primary-btn">添加</button>
                        </div>
                    </form>
                </div>
            `;
            document.body.appendChild(addSentenceModal);
        }

        // 编辑句子模态框
        if (!document.getElementById('editSentenceModal')) {
            const editSentenceModal = document.createElement('div');
            editSentenceModal.id = 'editSentenceModal';
            editSentenceModal.className = 'modal';
            editSentenceModal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>编辑句子</h3>
                        <button class="close-btn">&times;</button>
                    </div>
                    <form id="editSentenceForm">
                        <div class="form-group">
                            <label for="editJapanese">日语</label>
                            <div class="input-group">
                                <input type="text" id="editJapanese" required placeholder="输入日语句子">
                                <button type="button" class="convert-btn" id="editConvertBtn">
                                    <i class="fas fa-sync"></i> 转换
                                </button>
                            </div>
                            <div class="auto-convert-toggle">
                                <label>
                                    <input type="checkbox" id="editAutoConvert" checked>
                                    自动转换
                                </label>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="editHiragana">平假名</label>
                            <div class="input-group">
                                <input type="text" id="editHiragana" required placeholder="用冒号分隔，如：わたし:は:がくせい:です">
                                <div class="loading-spinner" style="display: none;"></div>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="editRomaji">罗马音</label>
                            <div class="input-group">
                                <input type="text" id="editRomaji" required placeholder="watashi wa gakusei desu">
                                <div class="loading-spinner" style="display: none;"></div>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="editMeaning">中文含义</label>
                            <input type="text" id="editMeaning" required placeholder="输入中文翻译">
                        </div>
                        <div class="form-actions">
                            <button type="button" class="secondary-btn cancel-btn">取消</button>
                            <button type="submit" class="primary-btn">保存</button>
                        </div>
                    </form>
                </div>
            `;
            document.body.appendChild(editSentenceModal);
        }

        // 批量导入模态框
        if (!document.getElementById('batchImportModal')) {
            const batchImportModal = document.createElement('div');
            batchImportModal.id = 'batchImportModal';
            batchImportModal.className = 'modal';
            batchImportModal.innerHTML = `
                <div class="modal-content" style="max-width:1100px;width:95%;max-height:90vh;overflow-y:auto;">
                    <div class="modal-header">
                        <h3>批量导入句子</h3>
                        <button class="close-btn">&times;</button>
                    </div>
                    <form id="batchImportForm">
                        <div class="form-group lang-select-group">
                            <label for="batchLang">
                                <i class="fas fa-language" style="margin-right: 6px; color: #4a90e2;"></i>
                                语言
                            </label>
                            <select id="batchLang" class="lang-select">
                                <option value="ja" selected>日语</option>
                                <option value="en">英语</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="batchImportText">输入要导入的句子：</label>
                            <div class="separator-options">
                                <div class="separator-option">
                                    <input type="radio" id="comma" name="separator" value="," checked>
                                    <label for="comma">逗号分隔</label>
                                </div>
                                <div class="separator-option">
                                    <input type="radio" id="space" name="separator" value=" ">
                                    <label for="space">空格分隔</label>
                                </div>
                                <div class="separator-option">
                                    <input type="radio" id="customSep" name="separator" value="__CUSTOM__">
                                    <label for="customSep">自定义</label>
                                    <input type="text" id="customSeparatorInput" placeholder="分隔符" style="width:80px;margin-left:6px;" disabled>
                                </div>
                                <span class="import-tips">格式：句子原文 [分隔符] 中文翻译</span>
                            </div>
                            <textarea id="batchImportText" rows="10" required></textarea>
                        </div>
                        <div class="form-actions">
                            <button type="button" id="previewImportBtn" class="secondary-btn">预览</button>
                            <button type="submit" class="primary-btn">导入</button>
                            <button type="button" class="cancel-btn">取消</button>
                        </div>
                    </form>
                    <div id="importPreview" class="import-preview"></div>
                </div>
            `;
            document.body.appendChild(batchImportModal);
            // 只注入一次预览表格样式
            if (!document.getElementById('importPreviewExtraStyles')) {
              const css = document.createElement('style');
              css.id = 'importPreviewExtraStyles';
              css.textContent = `
                #importPreview{overflow-x:auto;}
                .preview-table th,.preview-table td{min-width:120px;box-sizing:border-box;}
                .preview-table input.preview-input{width:100%;min-width:100px;}
              `;
              document.head.appendChild(css);
            }
        }
      



        // 处理 Tab 键插入
        const batchModalEl = document.getElementById('batchImportModal');
        const textarea = batchModalEl ? batchModalEl.querySelector('#batchImportText') : null;
        if (textarea) {
            textarea.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    e.preventDefault();
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    textarea.value = textarea.value.substring(0, start) + '\t' + textarea.value.substring(end);
                    textarea.selectionStart = textarea.selectionEnd = start + 1;
                }
            });
        }

        // 编辑收藏夹模态框
        if (!document.getElementById('editCollectionModal')) {
            const editCollectionModal = document.createElement('div');
            editCollectionModal.id = 'editCollectionModal';
            editCollectionModal.className = 'modal';
            editCollectionModal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>编辑收藏夹</h3>
                        <button class="close-btn">&times;</button>
                    </div>
                    <form id="editCollectionForm">
                        <input type="hidden" id="editCollectionId">
                        <div class="form-group">
                            <label for="editCollectionName">
                                <i class="fas fa-folder" style="margin-right: 6px; color: #4a90e2;"></i>
                                收藏夹名称
                            </label>
                            <input type="text" id="editCollectionName" required placeholder="例如：旅行常用句" maxlength="50">
                            <small class="form-hint">为您的收藏夹起一个易于识别的名称（最多50个字符）</small>
                        </div>
                        <div class="form-group">
                            <label for="editCollectionDescription">
                                <i class="fas fa-align-left" style="margin-right: 6px; color: #4a90e2;"></i>
                                描述
                            </label>
                            <textarea id="editCollectionDescription" placeholder="简单描述一下这个收藏夹的用途和内容..." maxlength="200"></textarea>
                            <small class="form-hint">可选：添加一些描述信息，帮助您更好地管理收藏夹（最多200个字符）</small>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="secondary-btn cancel-btn">
                                <i class="fas fa-times"></i> 取消
                            </button>
                            <button type="submit" class="primary-btn">
                                <i class="fas fa-save"></i> 保存
                            </button>
                        </div>
                    </form>
                </div>
            `;
            document.body.appendChild(editCollectionModal);
        }

        // 管理句子模态框
        if (!document.getElementById('manageSentencesModal')) {
            const manageSentencesModal = document.createElement('div');
            manageSentencesModal.id = 'manageSentencesModal';
            manageSentencesModal.className = 'modal';
            manageSentencesModal.innerHTML = `
                <div class="modal-content" style="max-width:900px;">
                    <div class="modal-header" style="display:flex;align-items:center;justify-content:space-between;">
                        <h3 style="margin:0;">管理句子</h3>
                        <button class="close-btn" aria-label="关闭">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="ms-toolbar" style="display:flex;gap:10px;align-items:center;margin-bottom:12px;flex-wrap:wrap;">
                            <input id="msSearch" type="text" placeholder="搜索：原文/分词/中文" style="flex:1 1 280px;padding:8px 10px;border:1px solid #e5e7eb;border-radius:8px;">
                            <label class="nowrap" style="color:#666;">每页
                                <select id="msPageSize" style="margin-left:6px;padding:6px 8px;border:1px solid #e5e7eb;border-radius:8px;">
                                    <option value="10" selected>10</option>
                                    <option value="20">20</option>
                                    <option value="50">50</option>
                                </select>
                            </label>
                            <span id="msCount" class="nowrap" style="color:#666;margin-left:auto;"></span>
                        </div>
                        <div class="sentences-container sentence-list" style="display:flex;flex-direction:column;gap:10px;min-height:180px;"></div>
                        <div class="ms-pagination" style="display:flex;align-items:center;justify-content:center;gap:12px;margin-top:12px;">
                            <button id="msPrev" type="button">上一页</button>
                            <span id="msPageInfo">1 / 1</span>
                            <button id="msNext" type="button">下一页</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(manageSentencesModal);

            // 注入一次性的样式，优化外观
            if (!document.getElementById('manageSentencesStyles')) {
                const style = document.createElement('style');
                style.id = 'manageSentencesStyles';
                style.textContent = `
                .sentence-list .sentence-item{display:flex;gap:12px;align-items:flex-start;padding:12px;border:1px solid #eee;border-radius:10px;background:#fff;box-shadow:0 2px 6px rgba(0,0,0,.04);transition:box-shadow 0.2s ease}
                .sentence-list .sentence-item:hover{box-shadow:0 4px 12px rgba(0,0,0,.08)}
                .sentence-list .sentence-main{flex:1 1 auto;min-width:0}
                .sentence-list .jp{font-weight:600;margin-bottom:6px;word-break:break-word;font-size:1rem;color:#333;display:flex;align-items:center;flex-wrap:wrap;gap:6px}
                .sentence-list .meta{font-size:12px;color:#666;margin-bottom:8px;display:flex;gap:10px;flex-wrap:wrap;line-height:1.6}
                .sentence-list .cn{color:#333;font-size:0.95rem;line-height:1.5}
                .sentence-list .lang-badge{display:inline-block;font-size:11px;padding:3px 8px;border-radius:12px;background:#eef2ff;color:#4f46e5;font-weight:500}
                .sentence-list .actions{display:flex;gap:8px;flex:0 0 auto}
                .sentence-list .actions button{padding:8px 12px;border:1px solid #e5e7eb;background:#fff;border-radius:8px;cursor:pointer;transition:all 0.2s ease;color:#666}
                .sentence-list .actions button:hover{background:#f8fafc;border-color:#4a90e2;color:#4a90e2;transform:translateY(-1px)}
                .sentence-list .actions button i{font-size:0.9rem}
                .no-sentences{text-align:center;padding:60px 20px;color:#999;font-size:0.95rem}
                `;
                document.head.appendChild(style);
            }
        }
    }

    // 初始化事件监听
    initializeEventListeners() {
        // 管理收藏夹按钮
        const manageBtn = document.querySelector('[data-action="manage-collections"]');
        if (manageBtn) {
            manageBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showCollectionsModal();
            });
        }

        // 关闭/取消按钮
        document.addEventListener('click', (e) => {
            if (e.target.matches('.close-btn') || e.target.matches('.cancel-btn')) {
                const modal = e.target.closest('.modal');
                if (modal) {
                    modal.classList.remove('show');
                    // 如果关闭的是管理收藏夹模态，也关闭可能打开的其他模态
                    if (modal.id === 'collectionsModal') {
                        document.getElementById('addCollectionModal')?.classList.remove('show');
                        document.getElementById('addSentenceModal')?.classList.remove('show');
                        document.getElementById('editCollectionModal')?.classList.remove('show');
                    }
                }
            }
            if (e.target.matches('.add-collection-btn') || e.target.closest('.add-collection-btn')) {
                e.preventDefault();
                e.stopPropagation();
                this.showAddCollectionModal();
            }
        });

        // 点击遮罩层关闭模态框
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.remove('show');
            }
        });

        // 新建收藏夹表单
        const addCollectionForm = document.getElementById('addCollectionForm');
        if (addCollectionForm) {
            addCollectionForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = (document.getElementById('collectionName')).value;
                const description = (document.getElementById('collectionDescription')).value;
                this.createCollection(name, description);
                this.hideAddCollectionModal();
                this.refreshCollectionsList();
            });
        }

        // 添加单个句子
        const addSentenceForm = document.getElementById('addSentenceForm');
        if (addSentenceForm) {
            const japaneseInput = document.getElementById('japanese');
            const hiraganaInput = document.getElementById('hiragana');
            const romajiInput = document.getElementById('romaji');
            const convertBtn = document.getElementById('convertBtn');
            const autoConvertCheckbox = document.getElementById('autoConvert');
            const langSelect = document.getElementById('lang');
            const groupRomaji = document.getElementById('groupRomaji');
            const groupHiragana = document.getElementById('groupHiragana');
            const hiraganaSpinner = hiraganaInput?.parentElement?.querySelector('.loading-spinner');
            const romajiSpinner = romajiInput?.parentElement?.querySelector('.loading-spinner');

            const updateLangUI = () => {
                const isJa = (langSelect?.value || 'ja') === 'ja';
                if (convertBtn) convertBtn.disabled = !isJa;
                if (autoConvertCheckbox) autoConvertCheckbox.disabled = !isJa;
                if (groupRomaji) groupRomaji.style.display = isJa ? '' : 'none';
                if (romajiInput) romajiInput.required = isJa;
                if (!isJa && romajiInput) romajiInput.value = '';
                if (hiraganaInput) {
                    hiraganaInput.placeholder = isJa ? '日语：わたし:は:がくせい:です' : '英语：i:am:a:student';
                }
                if (hiraganaInput && autoConvertCheckbox) {
                    // 自动模式下，无论语言都只读；用户可取消勾选以手动微调
                    hiraganaInput.readOnly = autoConvertCheckbox.checked;
                }
            };

            updateLangUI();
            langSelect?.addEventListener('change', updateLangUI);

            if (convertBtn) (convertBtn).disabled = false;
            if (hiraganaInput && autoConvertCheckbox) (hiraganaInput).readOnly = (autoConvertCheckbox).checked;

            autoConvertCheckbox?.addEventListener('change', (e) => {
                if (hiraganaInput) {
                    (hiraganaInput).readOnly = e.target.checked && ((langSelect?.value || 'ja') === 'ja');
                }
            });

            hiraganaInput?.addEventListener('input', () => {
                const isJa = (langSelect?.value || 'ja') === 'ja';
                if (romajiInput && !autoConvertCheckbox?.checked && isJa) {
                    (romajiInput).value = converter.hiraganaToRomaji((hiraganaInput).value);
                }
            });

            convertBtn?.addEventListener('click', async () => {
                const isJa = (langSelect?.value || 'ja') === 'ja';
                if (!isJa) return; // 英语不转换
                const japanese = (japaneseInput).value.trim();
                if (!japanese) return;
                try {
                    if (hiraganaSpinner) (hiraganaSpinner).style.display = 'block';
                    if (romajiSpinner) (romajiSpinner).style.display = 'block';
                    (convertBtn).disabled = true;
                    const result = await converter.convert(japanese);
                    if (hiraganaInput) (hiraganaInput).value = result.data.hiragana || japanese;
                    if (romajiInput) (romajiInput).value = result.data.romaji || japanese;
                } catch (err) {
                    alert('转换失败，请手动输入');
                } finally {
                    if (hiraganaSpinner) (hiraganaSpinner).style.display = 'none';
                    if (romajiSpinner) (romajiSpinner).style.display = 'none';
                    (convertBtn).disabled = false;
                }
            });

            // 自动分词/转换（支持日语和英语）
            let addConversionTimeout;
            const autoSplitEnglish = (s) => {
                if (!s) return '';
                return s
                    .toLowerCase()
                    .replace(/[^a-z0-9']+/gi, ' ') // 保留字母数字和撇号
                    .trim()
                    .split(/\s+/)
                    .filter(Boolean)
                    .join(':');
            };
            japaneseInput?.addEventListener('input', () => {
                if (!autoConvertCheckbox?.checked) return;
                const lang = (document.getElementById('lang'))?.value || 'ja';
                const text = (japaneseInput).value.trim();
                clearTimeout(addConversionTimeout);
                addConversionTimeout = setTimeout(async () => {
                    if (lang === 'ja') {
                        if (!text) { if (hiraganaInput) hiraganaInput.value=''; if (romajiInput) romajiInput.value=''; return; }
                        try {
                            if (hiraganaSpinner) hiraganaSpinner.style.display = 'block';
                            if (romajiSpinner) romajiSpinner.style.display = 'block';
                            const result = await converter.convert(text);
                            if (hiraganaInput) hiraganaInput.value = result.data.hiragana || text;
                            if (romajiInput) romajiInput.value = result.data.romaji || '';
                        } catch (_) {
                            if (hiraganaInput) hiraganaInput.value = text;
                            if (romajiInput) romajiInput.value = '';
                        } finally {
                            if (hiraganaSpinner) hiraganaSpinner.style.display = 'none';
                            if (romajiSpinner) romajiSpinner.style.display = 'none';
                        }
                    } else { // 英语
                        if (hiraganaInput) hiraganaInput.value = autoSplitEnglish(text);
                        if (romajiInput) romajiInput.value = '';
                    }
                }, 400);
            });

            addSentenceForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const collectionId = (e.target).dataset.collectionId;
                const lang = (document.getElementById('lang'))?.value || 'ja';
                const sentenceData = {
                    japanese: (document.getElementById('japanese')).value,
                    hiragana: (document.getElementById('hiragana')).value,
                    romaji: lang === 'ja' ? (document.getElementById('romaji')).value : '',
                    meaning: (document.getElementById('meaning')).value,
                    lang
                };
                this.addSentence(collectionId, sentenceData);
                const modal = document.getElementById('addSentenceModal');
                if (modal) modal.classList.remove('show');
                this.refreshCollectionsList();
                // 若管理句子模态仍在显示，刷新它
                const manageModal = document.getElementById('manageSentencesModal');
                if (manageModal && manageModal.classList.contains('show')) {
                    this.renderManageSentences();
                }
                window.dispatchEvent(new CustomEvent('collectionsUpdated'));
            });
        }

        // 编辑句子表单与转换
        const editSentenceForm = document.getElementById('editSentenceForm');
        if (editSentenceForm) {
            const editJapanese = document.getElementById('editJapanese');
            const editHiragana = document.getElementById('editHiragana');
            const editRomaji = document.getElementById('editRomaji');
            const editMeaning = document.getElementById('editMeaning');
            const editConvertBtn = document.getElementById('editConvertBtn');
            const editAutoConvert = document.getElementById('editAutoConvert');
            const editHiraSpinner = editHiragana?.parentElement?.querySelector('.loading-spinner');
            const editRomaSpinner = editRomaji?.parentElement?.querySelector('.loading-spinner');

            if (editConvertBtn) editConvertBtn.disabled = false;
            if (editHiragana && editAutoConvert) editHiragana.readOnly = editAutoConvert.checked;

            editAutoConvert?.addEventListener('change', (e) => {
                if (editHiragana) {
                    editHiragana.readOnly = e.target.checked;
                }
            });

            editHiragana?.addEventListener('input', () => {
                if (editRomaji && !(editAutoConvert?.checked)) {
                    editRomaji.value = converter.hiraganaToRomaji(editHiragana.value);
                }
            });

            editConvertBtn?.addEventListener('click', async () => {
                const japanese = editJapanese.value.trim();
                if (!japanese) return;
                try {
                    if (editHiraSpinner) editHiraSpinner.style.display = 'block';
                    if (editRomaSpinner) editRomaSpinner.style.display = 'block';
                    editConvertBtn.disabled = true;
                    const result = await converter.convert(japanese);
                    if (editHiragana) editHiragana.value = result.data.hiragana || japanese;
                    if (editRomaji) editRomaji.value = result.data.romaji || japanese;
                } catch (err) {
                    console.error('转换失败:', err);
                    alert('转换失败，请手动输入');
                } finally {
                    if (editHiraSpinner) editHiraSpinner.style.display = 'none';
                    if (editRomaSpinner) editRomaSpinner.style.display = 'none';
                    editConvertBtn.disabled = false;
                }
            });

            let editConversionTimeout;
            editJapanese?.addEventListener('input', () => {
                if (!editAutoConvert?.checked) return;
                clearTimeout(editConversionTimeout);
                editConversionTimeout = setTimeout(async () => {
                    const japanese = editJapanese.value.trim();
                    if (!japanese) return;
                    try {
                        if (editHiraSpinner) editHiraSpinner.style.display = 'block';
                        if (editRomaSpinner) editRomaSpinner.style.display = 'block';
                        const result = await converter.convert(japanese);
                        if (editHiragana && editAutoConvert.checked) editHiragana.value = result.data.hiragana;
                        if (editRomaji) editRomaji.value = result.data.romaji;
                    } catch (error) {
                        console.error('自动转换失败:', error);
                    } finally {
                        if (editHiraSpinner) editHiraSpinner.style.display = 'none';
                        if (editRomaSpinner) editRomaSpinner.style.display = 'none';
                    }
                }, 500);
            });

            editSentenceForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const collectionId = editSentenceForm.dataset.collectionId;
                const sentenceId = editSentenceForm.dataset.sentenceId;
                const data = {
                    japanese: editJapanese.value,
                    hiragana: editHiragana.value,
                    romaji: editRomaji.value,
                    meaning: editMeaning.value
                };
                this.editSentence(collectionId, sentenceId, data);
                const modal = document.getElementById('editSentenceModal');
                if (modal) modal.classList.remove('show');
                // 刷新列表视图
                this.refreshCollectionsList();
                // 若管理句子模态仍在显示，刷新它
                const manageModal = document.getElementById('manageSentencesModal');
                if (manageModal && manageModal.classList.contains('show')) {
                    this.renderManageSentences();
                }
            });
        }

        // 批量导入 - 事件绑定
        const previewBtn = document.getElementById('previewImportBtn');
            if (previewBtn) {
                previewBtn.addEventListener('click', async () => {
                const importText = (document.getElementById('batchImportText')).value.trim();
                let separator = (document.querySelector('input[name="separator"]:checked')).value;
                    if (separator === '__CUSTOM__') {
                        separator = document.getElementById('customSeparatorInput').value || '';
                        if (!separator) { alert('请输入自定义分隔符'); return; }
                    }
                const lang = (document.getElementById('batchLang'))?.value || 'ja';
                    if (!importText) {
                        alert('请输入要导入的内容');
                        return;
                    }
                    const parsedData = await this.parseBatchImport(importText, separator, lang);
                    this.previewBatchImport(parsedData, lang);
                });
            }
            
        const batchImportForm = document.getElementById('batchImportForm');
            if (batchImportForm) {
                batchImportForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                const collectionId = (batchImportForm).dataset.collectionId;
                const lang = (document.getElementById('batchLang'))?.value || 'ja';
                if (!collectionId) {
                    alert('未指定收藏夹');
                        return;
                    }
                const previewContainer = document.getElementById('importPreview');
                const rows = previewContainer ? previewContainer.querySelectorAll('tbody tr') : [];
                if (!rows || rows.length === 0) {
                    alert('没有可导入的句子');
                    return;
                }
                const sentencesToImport = [];
                const requireRomaji = lang === 'ja';
                rows.forEach((row) => {
                    // japanese 兼容：优先读 input，否则读第二个单元格文本
                    const jpInput = row.querySelector('input[data-field="japanese"]');
                    let japanese = jpInput ? jpInput.value : '';
                    if (!jpInput) {
                        const jpCell = row.querySelector('td:nth-child(2)');
                        japanese = jpCell ? jpCell.textContent.trim() : '';
                    }
                    const hiraganaEl = row.querySelector('input[data-field="hiragana"]');
                    const romajiEl = row.querySelector('input[data-field="romaji"]');
                    const meaningEl = row.querySelector('input[data-field="meaning"]');
                    const hiragana = hiraganaEl ? hiraganaEl.value : '';
                    const romaji = romajiEl ? romajiEl.value : '';
                    const meaning = meaningEl ? meaningEl.value : '';
                    const isValid = japanese && hiragana && meaning && (!requireRomaji || romaji);
                    if (isValid) {
                        sentencesToImport.push({ japanese, hiragana, romaji: requireRomaji ? romaji : '', meaning, lang });
                    }
                });
                if (sentencesToImport.length === 0) {
                    alert('没有有效的句子， 请检查预览中的内容');
                    return;
                }
                await this.processBatchImport(sentencesToImport, collectionId);
                const modal = document.getElementById('batchImportModal');
                if (modal) modal.classList.remove('show');
                this.refreshCollectionsList();
                // 若管理句子模态仍在显示，刷新它
                const manageModal = document.getElementById('manageSentencesModal');
                if (manageModal && manageModal.classList.contains('show')) {
                    this.renderManageSentences();
                }
                alert(`成功导入 ${sentencesToImport.length} 条句子`);
            });
        }

        // 编辑收藏夹表单
        const editCollectionForm = document.getElementById('editCollectionForm');
        if (editCollectionForm) {
            editCollectionForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const id = (document.getElementById('editCollectionId')).value;
                const name = (document.getElementById('editCollectionName')).value;
                const description = (document.getElementById('editCollectionDescription')).value;
                this.editCollection(id, name, description);
                this.hideEditCollectionModal();
                this.refreshCollectionsList();
            });
        }
    }

    // 解析批量导入文本
    async parseBatchImport(text, separator, lang = 'ja') {
        if (!text) return [];
        const lines = text.trim().split('\n');
        const result = [];
        const autoSplitEnglish = (s) => {
            return s
                .toLowerCase()
                .replace(/[^a-z0-9']+/gi, ' ')
                .trim()
                .split(/\s+/)
                .filter(Boolean)
                .join(':');
        };
        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                const parts = line.split(separator);
                if (parts.length < 2) continue;
                const sentence = parts[0].trim();
                const meaning = parts.slice(1).join(separator).trim();
                if (!sentence || !meaning) continue;
                if (lang === 'ja') {
                    let hiragana = '';
                    let romaji = '';
                    try {
                        // 尝试使用分词器转换。如果 kuromoji 尚未就绪或发生错误，继续使用回退方案
                        const converted = await converter.convert(sentence);
                        if (converted && converted.success) {
                            hiragana = converted.data.hiragana;
                            romaji = converted.data.romaji;
                        }
                    } catch (err) {
                        /* eslint-disable no-console */
                        console.warn('Japanese convert failed, fallback to simple mode:', err);
                        /* eslint-enable no-console */
                    }
                    // 如果转换失败，则简单按字符拆分以保证预览可用
                    if (!hiragana) {
                        hiragana = sentence.split('').join(':');
                    }
                    result.push({
                        japanese: sentence,
                        hiragana,
                        romaji,
                        meaning,
                        lang
                    });
                } else {
                    result.push({
                        japanese: sentence,
                        hiragana: autoSplitEnglish(sentence),
                        romaji: '',
                        meaning,
                        lang
                    });
                }
            } catch (err) {
                console.error('处理行失败:', line, err);
            }
        }
        return result;
    }
    
    // 预览批量导入数据（可编辑，并保留删除）
    previewBatchImport(parsedData, lang = 'ja') {
        console.log('[previewBatchImport] parsedData length:', Array.isArray(parsedData) ? parsedData.length : 'N/A', parsedData);
        const previewContainerDebug = document.getElementById('importPreview');
        if(!previewContainerDebug) {
            console.warn('[previewBatchImport] #importPreview element not found in DOM');
        }
        const previewContainer = document.getElementById('importPreview');
        if (!previewContainer) return;
        if (!Array.isArray(parsedData) || parsedData.length === 0) {
            previewContainer.innerHTML = '<div class="preview-empty">没有可导入的句子</div>';
            return;
        }
        const isJa = (lang || 'ja') === 'ja';
        const table = document.createElement('table');
        table.className = 'preview-table';
        const thead = isJa
            ? `
                <thead>
                    <tr>
                        <th>序号</th>
                        <th>日语</th>
                        <th>假名</th>
                        <th>罗马字</th>
                        <th>中文</th>
                        <th>操作</th>
                    </tr>
                </thead>
            `
            : `
                <thead>
                    <tr>
                        <th>序号</th>
                        <th>英文</th>
                        <th>分词</th>
                        <th>中文</th>
                        <th>操作</th>
                    </tr>
                </thead>
            `;
        const tbody = `
            <tbody>
                ${parsedData.map((item, index) => isJa ? `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${item.japanese}</td>
                        <td><input type="text" class="preview-input" value="${item.hiragana}" data-field="hiragana"></td>
                        <td><input type="text" class="preview-input" value="${item.romaji}" data-field="romaji"></td>
                        <td><input type="text" class="preview-input" value="${item.meaning}" data-field="meaning"></td>
                        <td><button type="button" class="delete-preview-btn">删除</button></td>
                    </tr>
                ` : `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${item.japanese}</td>
                        <td><input type="text" class="preview-input" value="${item.hiragana}" data-field="hiragana"></td>
                        <td><input type="text" class="preview-input" value="${item.meaning}" data-field="meaning"></td>
                        <td><button type="button" class="delete-preview-btn">删除</button></td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        table.innerHTML = `${thead}${tbody}`;
        previewContainer.innerHTML = '';
        previewContainer.appendChild(table);
        table.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-preview-btn')) {
                const row = e.target.closest('tr');
                if (row) {
                    row.remove();
                    this._updatePreviewRowNumbers(table);
                }
            }
        });
        previewContainer.style.display = 'block';
    }

    _updatePreviewRowNumbers(table) {
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach((row, index) => {
            const cell = row.querySelector('td:first-child');
            if (cell) cell.textContent = String(index + 1);
        });
    }
    
    // 处理批量导入数据
    async processBatchImport(parsedData, collectionId) {
        if (!Array.isArray(parsedData) || parsedData.length === 0) {
            throw new Error('没有有效的句子可导入');
        }
        if (!this.collections[collectionId]) {
            throw new Error('收藏夹不存在');
        }
        let successCount = 0;
        const errors = [];
        for (const sentence of parsedData) {
            try {
                const isJa = (sentence.lang || 'ja') === 'ja';
                const hasRequired = sentence.japanese && sentence.hiragana && sentence.meaning && (!isJa || sentence.romaji);
                if (!hasRequired) {
                    errors.push(`句子格式不完整: ${sentence.japanese}`);
                    continue;
                }
                const id = `sentence_${Date.now()}_${successCount}`;
                this.collections[collectionId].sentences[id] = {
                    ...sentence,
                    romaji: isJa ? (sentence.romaji || '') : '',
                    created_at: new Date().toISOString()
                };
                successCount++;
            } catch (err) {
                errors.push(`导入失败: ${sentence.japanese}`);
            }
        }
        this.saveCollections();
        this.refreshCollectionsList();
        return { success: successCount, errors };
    }

    // 显示/隐藏类方法
    showCollectionsModal() {
        const modal = document.getElementById('collectionsModal');
        if (modal) {
            this.refreshCollectionsList();
            modal.classList.add('show');
        }
    }

    showAddCollectionModal() {
        const modal = document.getElementById('addCollectionModal');
        if (modal) {
            const form = document.getElementById('addCollectionForm');
            if (form) form.reset();
            modal.classList.add('show');
        }
    }

    hideAddCollectionModal() {
        const modal = document.getElementById('addCollectionModal');
        if (modal) modal.classList.remove('show');
    }

    showAddSentenceModal(collectionId) {
        const modal = document.getElementById('addSentenceModal');
        if (modal) {
            const form = modal.querySelector('#addSentenceForm');
            if (form) {
                form.reset();
                form.dataset.collectionId = collectionId;
            }
            modal.classList.add('show');
        }
    }

    showBatchImportModal(collectionId) {
        const modal = document.getElementById('batchImportModal');
        if (modal) {
            const form = document.getElementById('batchImportForm');
            if (form) {
                form.reset();
                form.dataset.collectionId = collectionId;
            }
            const previewContainer = document.getElementById('importPreview');
            if (previewContainer) {
                previewContainer.style.display = 'none';
                previewContainer.innerHTML = '';
            }
            modal.classList.add('show');
        }
    }

    // 显示编辑句子模态框
    showEditSentenceModal(collectionId, sentenceId) {
        const modal = document.getElementById('editSentenceModal');
        if (!modal) return;
        const form = modal.querySelector('#editSentenceForm');
        if (!form) return;
        // 不关闭管理句子模态框，直接在其上方显示编辑弹窗（通过更高的 z-index 实现）
        form.dataset.collectionId = collectionId;
        form.dataset.sentenceId = sentenceId;
        const data = this.collections?.[collectionId]?.sentences?.[sentenceId];
        if (data) {
            modal.querySelector('#editJapanese').value = data.japanese || '';
            modal.querySelector('#editHiragana').value = data.hiragana || '';
            modal.querySelector('#editRomaji').value = data.romaji || '';
            modal.querySelector('#editMeaning').value = data.meaning || '';
        } else {
            modal.querySelector('#editJapanese').value = '';
            modal.querySelector('#editHiragana').value = '';
            modal.querySelector('#editRomaji').value = '';
            modal.querySelector('#editMeaning').value = '';
        }
        modal.classList.add('show');
    }

    hideEditSentenceModal() {
        const modal = document.getElementById('editSentenceModal');
        if (modal) modal.classList.remove('show');
        }

    hideEditCollectionModal() {
        const modal = document.getElementById('editCollectionModal');
        if (modal) modal.classList.remove('show');
    }

    // 刷新收藏夹列表
    refreshCollectionsList() {
        const collectionsContainer = document.querySelector('.collections-list');
        if (!collectionsContainer) return;
        collectionsContainer.innerHTML = '';
        Object.entries(this.collections).forEach(([id, collection]) => {
            const collectionElement = document.createElement('div');
            collectionElement.className = 'collection-item';
            const reviewStatus = '';
            collectionElement.innerHTML = `
                <div class="collection-header">
                    <div class="collection-title-group">
                        <h3>${collection.name}</h3>
                        <div class="collection-review-status">${reviewStatus}</div>
                    </div>
                    <div class="collection-actions">
                        <button class="add-sentence-btn" title="添加句子"><i class="fas fa-plus"></i></button>
                        <button class="batch-import-btn" title="批量导入"><i class="fas fa-file-import"></i></button>
                        <button class="edit-btn" title="编辑"><i class="fas fa-edit"></i></button>
                        <button class="manage-sentences-btn" title="管理"><i class="fas fa-list"></i></button>
                        <button class="review-btn" title="标记已复习"><i class="fas fa-check"></i></button>
                        <button class="delete-btn" title="删除收藏夹"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                <p class="collection-description">${collection.description || ''}</p>
                <div class="collection-stats"><span><i class="fas fa-book"></i>${Object.keys(collection.sentences || {}).length} 个句子</span></div>
            `;
            // 事件绑定
            collectionElement.querySelector('.add-sentence-btn')?.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation(); this.showAddSentenceModal(id);
            });
            collectionElement.querySelector('.batch-import-btn')?.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation(); this.showBatchImportModal(id);
            });
            collectionElement.querySelector('.edit-btn')?.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation(); this.showEditCollectionModal(id);
            });
            collectionElement.querySelector('.manage-sentences-btn')?.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation(); this.showManageSentencesModal(id);
            });
            collectionElement.querySelector('.review-btn')?.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation(); this.updateReviewStatus(id); this.refreshCollectionsList();
            });
            collectionElement.querySelector('.delete-btn')?.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                if (confirm('确定要删除这个收藏夹吗？')) { this.deleteCollection(id); this.refreshCollectionsList(); }
            });
            collectionsContainer.appendChild(collectionElement);
        });
    }

    showEditCollectionModal(collectionId) {
        const collection = this.collections[collectionId];
        if (!collection) return;
        const modal = document.getElementById('editCollectionModal');
        if (modal) {
            (document.getElementById('editCollectionId')).value = collectionId;
            (document.getElementById('editCollectionName')).value = collection.name;
            (document.getElementById('editCollectionDescription')).value = collection.description || '';
            modal.classList.add('show');
        }
    }

    showManageSentencesModal(collectionId) {
        const collection = this.collections[collectionId];
        if (!collection) return;
        const modal = document.getElementById('manageSentencesModal');
        if (!modal) return;
        
        // 更新状态
        this.manageState.collectionId = collectionId;
        this.manageState.page = 1;
        this.manageState.query = '';
        
        // 绑定事件监听器（只绑定一次）
        this.setupManageSentencesListeners(collectionId);
        
        // 渲染句子列表
        this.renderManageSentences();
        
        modal.classList.add('show');
    }

    // 设置管理句子模态框的事件监听器
    setupManageSentencesListeners(collectionId) {
        const modal = document.getElementById('manageSentencesModal');
        if (!modal) return;
        
        // 搜索框
        const searchInput = modal.querySelector('#msSearch');
        if (searchInput && !searchInput.dataset.listenerAttached) {
            searchInput.dataset.listenerAttached = 'true';
            searchInput.addEventListener('input', (e) => {
                this.manageState.query = e.target.value.trim();
                this.manageState.page = 1;
                this.renderManageSentences();
            });
        }
        
        // 每页数量选择
        const pageSizeSelect = modal.querySelector('#msPageSize');
        if (pageSizeSelect && !pageSizeSelect.dataset.listenerAttached) {
            pageSizeSelect.dataset.listenerAttached = 'true';
            pageSizeSelect.addEventListener('change', (e) => {
                this.manageState.pageSize = parseInt(e.target.value);
                this.manageState.page = 1;
                this.renderManageSentences();
            });
        }
        
        // 上一页按钮
        const prevBtn = modal.querySelector('#msPrev');
        if (prevBtn && !prevBtn.dataset.listenerAttached) {
            prevBtn.dataset.listenerAttached = 'true';
            prevBtn.addEventListener('click', () => {
                if (this.manageState.page > 1) {
                    this.manageState.page--;
                    this.renderManageSentences();
                }
            });
        }
        
        // 下一页按钮
        const nextBtn = modal.querySelector('#msNext');
        if (nextBtn && !nextBtn.dataset.listenerAttached) {
            nextBtn.dataset.listenerAttached = 'true';
            nextBtn.addEventListener('click', () => {
                const totalPages = this.getManageSentencesTotalPages();
                if (this.manageState.page < totalPages) {
                    this.manageState.page++;
                    this.renderManageSentences();
                }
            });
        }
    }

    // 获取过滤后的句子列表
    getFilteredSentences() {
        const collectionId = this.manageState.collectionId;
        const collection = this.collections[collectionId];
        if (!collection || !collection.sentences) return [];
        
        const sentences = Object.entries(collection.sentences).map(([id, sentence]) => ({
            id,
            ...sentence
        }));
        
        const query = this.manageState.query.toLowerCase();
        if (!query) return sentences;
        
        return sentences.filter(sentence => {
            const japanese = (sentence.japanese || '').toLowerCase();
            const hiragana = (sentence.hiragana || '').toLowerCase();
            const meaning = (sentence.meaning || '').toLowerCase();
            return japanese.includes(query) || hiragana.includes(query) || meaning.includes(query);
        });
    }

    // 获取总页数
    getManageSentencesTotalPages() {
        const filtered = this.getFilteredSentences();
        return Math.max(1, Math.ceil(filtered.length / this.manageState.pageSize));
    }

    // 渲染管理句子列表
    renderManageSentences() {
        const modal = document.getElementById('manageSentencesModal');
        if (!modal) return;
        
        const container = modal.querySelector('.sentences-container');
        const countSpan = modal.querySelector('#msCount');
        const pageInfo = modal.querySelector('#msPageInfo');
        const prevBtn = modal.querySelector('#msPrev');
        const nextBtn = modal.querySelector('#msNext');
        
        if (!container) return;
        
        const filtered = this.getFilteredSentences();
        const totalPages = this.getManageSentencesTotalPages();
        const startIndex = (this.manageState.page - 1) * this.manageState.pageSize;
        const endIndex = startIndex + this.manageState.pageSize;
        const paginated = filtered.slice(startIndex, endIndex);
        
        // 更新计数
        if (countSpan) {
            countSpan.textContent = `共 ${filtered.length} 条`;
        }
        
        // 更新分页信息
        if (pageInfo) {
            pageInfo.textContent = `${this.manageState.page} / ${totalPages}`;
        }
        
        // 更新按钮状态
        if (prevBtn) {
            prevBtn.disabled = this.manageState.page <= 1;
            prevBtn.style.opacity = prevBtn.disabled ? '0.5' : '1';
            prevBtn.style.cursor = prevBtn.disabled ? 'not-allowed' : 'pointer';
        }
        if (nextBtn) {
            nextBtn.disabled = this.manageState.page >= totalPages;
            nextBtn.style.opacity = nextBtn.disabled ? '0.5' : '1';
            nextBtn.style.cursor = nextBtn.disabled ? 'not-allowed' : 'pointer';
        }
        
        // 清空容器
        container.innerHTML = '';
        
        if (paginated.length === 0) {
            container.innerHTML = '<div class="no-sentences" style="text-align:center;padding:40px;color:#999;">暂无句子</div>';
            return;
        }
        
        const collectionId = this.manageState.collectionId;
        paginated.forEach((sentence) => {
            const sentenceElement = document.createElement('div');
            sentenceElement.className = 'sentence-item';
            const langBadge = sentence.lang === 'en' ? '<span class="lang-badge">英语</span>' : '<span class="lang-badge">日语</span>';
            sentenceElement.innerHTML = `
                <div class="sentence-main">
                    <div class="jp">${sentence.japanese || ''}${langBadge}</div>
                    <div class="meta">
                        <span>分词：${sentence.hiragana || ''}</span>
                        ${sentence.romaji ? `<span>罗马音：${sentence.romaji}</span>` : ''}
                    </div>
                    <div class="cn">${sentence.meaning || ''}</div>
                </div>
                <div class="actions">
                    <button class="edit-sentence-btn" title="编辑句子"><i class="fas fa-edit"></i></button>
                    <button class="delete-sentence-btn" title="删除句子"><i class="fas fa-trash"></i></button>
                </div>
            `;
            
            // 编辑句子
            sentenceElement.querySelector('.edit-sentence-btn')?.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                this.showEditSentenceModal(collectionId, sentence.id);
            });
            
            // 删除句子
            sentenceElement.querySelector('.delete-sentence-btn')?.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                if (confirm('确定要删除这个句子吗？')) {
                    this.deleteSentence(collectionId, sentence.id);
                    this.renderManageSentences();
                }
            });
            
            container.appendChild(sentenceElement);
        });
    }

    // 初始化复习属性
    initializeReviewProperties() {
        Object.values(this.collections).forEach((collection) => {
            if (!collection.review) {
                collection.review = { last_review: null, next_review: null, interval_days: 7, review_count: 0 };
            }
        });
        this.saveCollections();
    }

    // 更新复习状态
    updateReviewStatus(collectionId) {
        const collection = this.collections[collectionId];
        if (!collection) return;
        if (!collection.review) {
            collection.review = { last_review: null, next_review: null, interval_days: 7, review_count: 0 };
        }
        const now = new Date();
        collection.review.last_review = now.toISOString();
        const nextReview = new Date(now);
        nextReview.setDate(nextReview.getDate() + collection.review.interval_days);
        collection.review.next_review = nextReview.toISOString();
        collection.review.review_count++;
        this.saveCollections();
        alert(`已标记复习完成！\n下次复习时间：${nextReview.toLocaleDateString()}`);
    }

    checkReviewStatus() {
        const now = new Date();
        const needReview = [];
        Object.entries(this.collections).forEach(([id, collection]) => {
            if (collection.review && collection.review.next_review) {
                const nextReview = new Date(collection.review.next_review);
                if (nextReview <= now) {
                    needReview.push({ id, name: collection.name, daysOverdue: Math.floor((now.getTime() - nextReview.getTime()) / (1000 * 60 * 60 * 24)) });
                }
            }
        });
        return needReview;
    }
}
