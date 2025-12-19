import converter from './converter.js';

export class CustomCollectionsManager {
    constructor() {
        this.collections = this.loadCollections();
        this.initializeEventListeners();
        this.initializeModals();
        this.initializeReviewProperties();
    }

    // 获取所有收藏夹
    getCollections() {
        console.log('Raw collections:', this.collections); // 添加调试日志
        const collections = Object.entries(this.collections).map(([id, collection]) => {
            const sentences = Object.entries(collection.sentences || {}).map(([sentenceId, sentence]) => ({
                id: sentenceId,
                ...sentence
            }));
            console.log(`Collection ${id} sentences:`, sentences); // 添加调试日志
            return {
                id,
                ...collection,
                sentences
            };
        });
        console.log('Processed collections:', collections); // 添加调试日志
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
                last_review: null,          // 上次复习时间
                next_review: null,          // 下次复习时间
                interval_days: 7,           // 复习间隔（天）
                review_count: 0             // 复习次数
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

    // 获取收藏夹中的句子用于复习
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
            proficiency: 'low', // 初始设置为生疏
            lastReview: new Date().toISOString(),
            // 不设置 audioUrl，让系统使用 Web Speech API 播放
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
        // ... (this method is correct and remains unchanged) ...
    }

    // 初始化事件监听
    initializeEventListeners() {
        // 管理收藏夹按钮点击事件
        const manageBtn = document.querySelector('[data-action="manage-collections"]');
        if (manageBtn) {
            manageBtn.addEventListener('click', () => {
                this.showCollectionsModal();
            });
        }

        // 全局事件委托
        document.addEventListener('click', (e) => {
            if (e.target.matches('.close-btn')) {
                const modal = e.target.closest('.modal');
                if (modal) modal.classList.remove('show');
            }
            if (e.target.matches('.cancel-btn')) {
                const modal = e.target.closest('.modal');
                if (modal) modal.classList.remove('show');
            }
            if (e.target.matches('.add-collection-btn') || e.target.closest('.add-collection-btn')) {
                this.showAddCollectionModal();
            }
        });

        // 添加收藏夹表单提交
        const addCollectionForm = document.getElementById('addCollectionForm');
        if (addCollectionForm) {
            addCollectionForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = document.getElementById('collectionName').value;
                const description = document.getElementById('collectionDescription').value;
                this.createCollection(name, description);
                this.hideAddCollectionModal();
                this.refreshCollectionsList();
            });
        }

        // 添加句子表单提交
        const addSentenceForm = document.getElementById('addSentenceForm');
        if (addSentenceForm) {
            const japaneseInput = document.getElementById('japanese');
            const hiraganaInput = document.getElementById('hiragana');
            const romajiInput = document.getElementById('romaji');
            const convertBtn = document.getElementById('convertBtn');
            const autoConvertCheckbox = document.getElementById('autoConvert');
            const hiraganaSpinner = hiraganaInput?.parentElement?.querySelector('.loading-spinner');
            const romajiSpinner = romajiInput?.parentElement?.querySelector('.loading-spinner');

            if (convertBtn) convertBtn.disabled = false;
            if (hiraganaInput && autoConvertCheckbox) hiraganaInput.readOnly = autoConvertCheckbox.checked;

            autoConvertCheckbox?.addEventListener('change', (e) => {
                if (hiraganaInput) {
                    hiraganaInput.readOnly = e.target.checked;
                    if (!e.target.checked) {
                        hiraganaInput.focus();
                        hiraganaInput.style.backgroundColor = '#fff';
                    } else {
                        hiraganaInput.style.backgroundColor = '#f5f5f5';
                    }
                }
            });

            hiraganaInput?.addEventListener('input', () => {
                if (romajiInput && !autoConvertCheckbox.checked) {
                    romajiInput.value = converter.hiraganaToRomaji(hiraganaInput.value);
                }
            });

            convertBtn?.addEventListener('click', async () => {
                const japanese = japaneseInput.value.trim();
                if (!japanese) return;
                try {
                    if (hiraganaSpinner) hiraganaSpinner.style.display = 'block';
                    if (romajiSpinner) romajiSpinner.style.display = 'block';
                    if (convertBtn) convertBtn.disabled = true;
                    const result = await converter.convert(japanese);
                    if (hiraganaInput) hiraganaInput.value = result.data.hiragana || japanese;
                    if (romajiInput) romajiInput.value = result.data.romaji || japanese;
                } catch (error) {
                    console.error('转换失败:', error);
                    alert('转换失败，请手动输入假名和罗马音');
                } finally {
                    if (hiraganaSpinner) hiraganaSpinner.style.display = 'none';
                    if (romajiSpinner) romajiSpinner.style.display = 'none';
                    if (convertBtn) convertBtn.disabled = false;
                }
            });

            let conversionTimeout;
            japaneseInput?.addEventListener('input', () => {
                if (!autoConvertCheckbox?.checked) return;
                clearTimeout(conversionTimeout);
                conversionTimeout = setTimeout(async () => {
                    const japanese = japaneseInput.value.trim();
                    if (!japanese) return;
                    try {
                        if (hiraganaSpinner) hiraganaSpinner.style.display = 'block';
                        if (romajiSpinner) romajiSpinner.style.display = 'block';
                        const result = await converter.convert(japanese);
                        if (hiraganaInput && autoConvertCheckbox.checked) hiraganaInput.value = result.data.hiragana;
                        if (romajiInput) romajiInput.value = result.data.romaji;
                    } catch (error) {
                        console.error('自动转换失败:', error);
                    } finally {
                        if (hiraganaSpinner) hiraganaSpinner.style.display = 'none';
                        if (romajiSpinner) romajiSpinner.style.display = 'none';
                    }
                }, 500);
            });

            addSentenceForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const collectionId = e.target.dataset.collectionId;
                const sentenceData = {
                    japanese: document.getElementById('japanese').value,
                    hiragana: document.getElementById('hiragana').value,
                    romaji: document.getElementById('romaji').value,
                    meaning: document.getElementById('meaning').value
                };
                try {
                    this.addSentence(collectionId, sentenceData);
                    const modal = document.getElementById('addSentenceModal');
                    if (modal) modal.classList.remove('show');
                    this.refreshCollectionsList();
                    window.dispatchEvent(new CustomEvent('collectionsUpdated'));
                } catch (error) {
                    console.error('Error adding sentence:', error);
                    alert('添加句子失败，请重试');
                }
            });
        }

        // 批量导入功能 (Moved out of the if(addSentenceForm) block)
        const batchImportForm = document.getElementById('batchImportForm');
        const previewBtn = document.getElementById('previewImportBtn');
        
        if (previewBtn) {
            previewBtn.addEventListener('click', async () => {
                const importText = document.getElementById('batchImportText').value.trim();
                const separator = document.querySelector('input[name="separator"]:checked').value;
                if (!importText) {
                    alert('请输入要导入的内容');
                    return;
                }
                const parsedData = await this.parseBatchImport(importText, separator);
                this.previewBatchImport(parsedData);
            });
        }
        
        if (batchImportForm) {
            batchImportForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const collectionId = batchImportForm.dataset.collectionId;
                if (!collectionId) {
                    alert('未指定收藏夹');
                    return;
                }
                const previewContainer = document.getElementById('importPreview');
                const rows = previewContainer.querySelectorAll('tbody tr');
                if (rows.length === 0) {
                    alert('没有可导入的句子');
                    return;
                }
                const sentencesToImport = [];
                rows.forEach(row => {
                    const japanese = row.querySelector('input[data-field="japanese"]').value;
                    const hiragana = row.querySelector('input[data-field="hiragana"]').value;
                    const romaji = row.querySelector('input[data-field="romaji"]').value;
                    const meaning = row.querySelector('input[data-field="meaning"]').value;
                    if (japanese && hiragana && romaji && meaning) {
                        sentencesToImport.push({ japanese, hiragana, romaji, meaning });
                    }
                });
                try {
                    await this.processBatchImport(sentencesToImport, collectionId);
                    const modal = document.getElementById('batchImportModal');
                    if (modal) modal.classList.remove('show');
                    this.refreshCollectionsList();
                    alert(`成功导入 ${sentencesToImport.length} 条句子`);
                } catch (error) {
                    console.error('批量导入失败:', error);
                    alert('导入失败，请重试');
                }
            });
        }

        // 编辑收藏夹表单提交
        const editCollectionForm = document.getElementById('editCollectionForm');
        if (editCollectionForm) {
            editCollectionForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const id = document.getElementById('editCollectionId').value;
                const name = document.getElementById('editCollectionName').value;
                const description = document.getElementById('editCollectionDescription').value;
                this.editCollection(id, name, description);
                this.hideEditCollectionModal();
                this.refreshCollectionsList();
            });
        }
    }

    // ... (rest of the class methods are correct and unchanged) ...
}