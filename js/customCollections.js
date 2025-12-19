import converter from './converter.js';

export class CustomCollectionsManager {
    constructor() {
        this.collections = this.loadCollections();
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
        localStorage.setItem('custom_collections', JSON.stringify(this.collections));
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
                            <label for="collectionName">名称</label>
                            <input type="text" id="collectionName" required>
                        </div>
                        <div class="form-group">
                            <label for="collectionDescription">描述</label>
                            <textarea id="collectionDescription"></textarea>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="secondary-btn cancel-btn">取消</button>
                            <button type="submit" class="primary-btn">创建</button>
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
                        <div class="form-group">
                            <label for="japanese">日语</label>
                            <div class="input-group">
                                <input type="text" id="japanese" required placeholder="输入日语句子">
                                <button type="button" class="convert-btn" id="convertBtn" disabled>
                                    <i class="fas fa-sync"></i> 转换
                                </button>
                            </div>
                            <div class="auto-convert-toggle">
                                <label>
                                    <input type="checkbox" id="autoConvert" checked>
                                    自动转换
                                </label>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="hiragana">平假名</label>
                            <div class="input-group">
                                <input type="text" id="hiragana" required placeholder="用冒号分隔，如：わたし:は:がくせい:です">
                                <div class="loading-spinner" style="display: none;"></div>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="romaji">罗马音</label>
                            <div class="input-group">
                                <input type="text" id="romaji" required placeholder="watashi wa gakusei desu">
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

        // 批量导入模态框
        if (!document.getElementById('batchImportModal')) {
            const batchImportModal = document.createElement('div');
            batchImportModal.id = 'batchImportModal';
            batchImportModal.className = 'modal';
            batchImportModal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>批量导入句子</h3>
                        <button class="close-btn">&times;</button>
                    </div>
                    <form id="batchImportForm">
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
                                <span class="import-tips">格式：日语原文 [分隔符] 中文翻译</span>
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
                            <label for="editCollectionName">名称</label>
                            <input type="text" id="editCollectionName" required>
                        </div>
                        <div class="form-group">
                            <label for="editCollectionDescription">描述</label>
                            <textarea id="editCollectionDescription"></textarea>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="secondary-btn cancel-btn">取消</button>
                            <button type="submit" class="primary-btn">保存</button>
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
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>管理句子</h3>
                        <button class="close-btn">&times;</button>
                    </div>
                    <div class="sentences-container"></div>
                </div>
            `;
            document.body.appendChild(manageSentencesModal);
        }
    }

    // 初始化事件监听
    initializeEventListeners() {
        // 管理收藏夹按钮
        const manageBtn = document.querySelector('[data-action="manage-collections"]');
        if (manageBtn) {
            manageBtn.addEventListener('click', () => this.showCollectionsModal());
        }

        // 关闭/取消按钮
        document.addEventListener('click', (e) => {
            if (e.target.matches('.close-btn') || e.target.matches('.cancel-btn')) {
                const modal = e.target.closest('.modal');
                if (modal) modal.classList.remove('show');
            }
            if (e.target.matches('.add-collection-btn') || e.target.closest('.add-collection-btn')) {
                this.showAddCollectionModal();
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
            const hiraganaSpinner = hiraganaInput?.parentElement?.querySelector('.loading-spinner');
            const romajiSpinner = romajiInput?.parentElement?.querySelector('.loading-spinner');

            if (convertBtn) (convertBtn).disabled = false;
            if (hiraganaInput && autoConvertCheckbox) (hiraganaInput).readOnly = (autoConvertCheckbox).checked;

            autoConvertCheckbox?.addEventListener('change', (e) => {
                if (hiraganaInput) {
                    (hiraganaInput).readOnly = e.target.checked;
                }
            });

            hiraganaInput?.addEventListener('input', () => {
                if (romajiInput && !(autoConvertCheckbox).checked) {
                    (romajiInput).value = converter.hiraganaToRomaji((hiraganaInput).value);
                }
            });

            convertBtn?.addEventListener('click', async () => {
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

            addSentenceForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const collectionId = (e.target).dataset.collectionId;
                const sentenceData = {
                    japanese: (document.getElementById('japanese')).value,
                    hiragana: (document.getElementById('hiragana')).value,
                    romaji: (document.getElementById('romaji')).value,
                    meaning: (document.getElementById('meaning')).value,
                };
                this.addSentence(collectionId, sentenceData);
                const modal = document.getElementById('addSentenceModal');
                if (modal) modal.classList.remove('show');
                this.refreshCollectionsList();
                window.dispatchEvent(new CustomEvent('collectionsUpdated'));
            });
        }

        // 批量导入 - 事件绑定
        const previewBtn = document.getElementById('previewImportBtn');
        if (previewBtn) {
            previewBtn.addEventListener('click', async () => {
                const importText = (document.getElementById('batchImportText')).value.trim();
                const separator = (document.querySelector('input[name="separator"]:checked')).value;
                if (!importText) {
                    alert('请输入要导入的内容');
                    return;
                }
                const parsedData = await this.parseBatchImport(importText, separator);
                this.previewBatchImport(parsedData);
            });
        }

        const batchImportForm = document.getElementById('batchImportForm');
        if (batchImportForm) {
            batchImportForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const collectionId = (batchImportForm).dataset.collectionId;
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
                    if (japanese && hiragana && romaji && meaning) {
                        sentencesToImport.push({ japanese, hiragana, romaji, meaning });
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
    async parseBatchImport(text, separator) {
        if (!text) return [];
        const lines = text.trim().split('\n');
        const result = [];
        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                const parts = line.split(separator);
                if (parts.length < 2) continue;
                const japanese = parts[0].trim();
                const meaning = parts.slice(1).join(separator).trim();
                if (!japanese || !meaning) continue;
                const converted = await converter.convert(japanese);
                if (!converted.success) continue;
                result.push({
                    japanese,
                    hiragana: converted.data.hiragana,
                    romaji: converted.data.romaji,
                    meaning
                });
            } catch (err) {
                console.error('处理行失败:', line, err);
            }
        }
        return result;
    }

    // 预览批量导入数据（可编辑，并保留删除）
    previewBatchImport(parsedData) {
        const previewContainer = document.getElementById('importPreview');
        if (!previewContainer) return;
        if (!Array.isArray(parsedData) || parsedData.length === 0) {
            previewContainer.innerHTML = '<div class="preview-empty">没有可导入的句子</div>';
            return;
        }
        const table = document.createElement('table');
        table.className = 'preview-table';
        table.innerHTML = `
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
            <tbody>
                ${parsedData.map((item, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${item.japanese}</td>
                        <td><input type="text" class="preview-input" value="${item.hiragana}" data-field="hiragana"></td>
                        <td><input type="text" class="preview-input" value="${item.romaji}" data-field="romaji"></td>
                        <td><input type="text" class="preview-input" value="${item.meaning}" data-field="meaning"></td>
                        <td><button type="button" class="delete-preview-btn">删除</button></td>
                    </tr>
                `).join('')}
            </tbody>
        `;
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
                if (!sentence.japanese || !sentence.hiragana || !sentence.romaji || !sentence.meaning) {
                    errors.push(`句子格式不完整: ${sentence.japanese}`);
                    continue;
                }
                const id = `sentence_${Date.now()}_${successCount}`;
                this.collections[collectionId].sentences[id] = {
                    ...sentence,
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
        const container = modal.querySelector('.sentences-container');
        if (!container) return;
        container.innerHTML = '';
        if (!collection.sentences || Object.keys(collection.sentences).length === 0) {
            container.innerHTML = '<div class="no-sentences">暂无句子</div>';
        } else {
            Object.entries(collection.sentences).forEach(([sentenceId, sentence]: any) => {
                const sentenceElement = document.createElement('div');
                sentenceElement.className = 'sentence-item';
                sentenceElement.innerHTML = `
                    <div class="sentence-content">
                        <div class="japanese">${sentence.japanese}</div>
                        <div class="chinese">${sentence.meaning}</div>
                    </div>
                    <div class="sentence-actions">
                        <button class="delete-sentence-btn" title="删除句子"><i class="fas fa-trash"></i></button>
                    </div>
                `;
                sentenceElement.querySelector('.delete-sentence-btn')?.addEventListener('click', (e) => {
                    e.preventDefault(); e.stopPropagation();
                    if (confirm('确定要删除这个句子吗？')) { this.deleteSentence(collectionId, sentenceId); this.showManageSentencesModal(collectionId); }
                });
                container.appendChild(sentenceElement);
            });
        }
        modal.classList.add('show');
    }

    // 初始化复习属性
    initializeReviewProperties() {
        Object.values(this.collections).forEach((collection: any) => {
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
        const needReview: any[] = [];
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
