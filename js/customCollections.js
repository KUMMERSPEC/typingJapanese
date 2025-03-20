export class CustomCollectionsManager {
    constructor() {
        this.collections = this.loadCollections();
        this.initializeEventListeners();
        this.initializeModals();
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
            sentences: {}
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

        // 创建添加收藏夹模态框
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

        // 创建添加句子模态框
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

        // 创建批量导入句子模态框
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
                            <label for="batchImportText">导入内容</label>
                            <textarea id="batchImportText" rows="10" required placeholder="每行一个句子，格式为「日语句子 = 中文翻译」&#10;例如：&#10;私は学生です = 我是学生&#10;こんにちは = 你好"></textarea>
                        </div>
                        <div class="form-group">
                            <label>分隔方式</label>
                            <div class="radio-group">
                                <label>
                                    <input type="radio" name="separator" value="=" checked>
                                    使用等号 (日语 = 中文)
                                </label>
                                <label>
                                    <input type="radio" name="separator" value="tab">
                                    使用制表符 Tab
                                </label>
                                <label>
                                    <input type="radio" name="separator" value="comma">
                                    使用逗号 (日语, 中文)
                                </label>
                            </div>
                        </div>
                        <div class="form-group">
                            <button type="button" id="previewImportBtn" class="secondary-btn">预览</button>
                            <div id="importPreview" class="import-preview-container" style="display: none;"></div>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="secondary-btn cancel-btn">取消</button>
                            <button type="submit" class="primary-btn">导入</button>
                        </div>
                    </form>
                </div>
            `;
            document.body.appendChild(batchImportModal);
        }

        // 创建编辑收藏夹模态框
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

        // 创建管理句子模态框
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
        // 管理收藏夹按钮点击事件
        const manageBtn = document.querySelector('[data-action="manage-collections"]');
        if (manageBtn) {
            manageBtn.addEventListener('click', () => {
                this.showCollectionsModal();
            });
        }

        // 全局事件委托
        document.addEventListener('click', (e) => {
            // 关闭按钮
            if (e.target.matches('.close-btn')) {
                const modal = e.target.closest('.modal');
                if (modal) {
                    modal.classList.remove('show');
                }
            }

            // 取消按钮
            if (e.target.matches('.cancel-btn')) {
                const modal = e.target.closest('.modal');
                if (modal) {
                    modal.classList.remove('show');
                }
            }

            // 新建收藏夹按钮
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
            // 获取相关元素
            const japaneseInput = document.getElementById('japanese');
            const hiraganaInput = document.getElementById('hiragana');
            const romajiInput = document.getElementById('romaji');
            const convertBtn = document.getElementById('convertBtn');
            const autoConvertCheckbox = document.getElementById('autoConvert');
            const hiraganaSpinner = hiraganaInput?.parentElement?.querySelector('.loading-spinner');
            const romajiSpinner = romajiInput?.parentElement?.querySelector('.loading-spinner');

            // 导入转换器
            import('../js/common/japaneseConverter.js').then(module => {
                const { japaneseConverter } = module;
                
                // 启用转换按钮
                if (convertBtn) {
                    convertBtn.disabled = false;
                }

                // 手动转换按钮点击事件
                convertBtn?.addEventListener('click', async () => {
                    const japanese = japaneseInput.value.trim();
                    if (!japanese) return;

                    try {
                        // 显示加载动画
                        hiraganaSpinner.style.display = 'block';
                        romajiSpinner.style.display = 'block';
                        convertBtn.disabled = true;

                        // 执行转换
                        const result = await japaneseConverter.convert(japanese);
                        
                        // 更新输入框
                        hiraganaInput.value = result.hiragana || japanese;
                        romajiInput.value = result.romaji || japanese;
                    } catch (error) {
                        console.error('转换失败:', error);
                        alert('转换失败，请手动输入假名和罗马音');
                        
                        // 尝试分解日语句子为单个字符，用冒号分隔
                        if (japanese) {
                            hiraganaInput.value = japanese.split('').join(':');
                        }
                    } finally {
                        // 隐藏加载动画
                        hiraganaSpinner.style.display = 'none';
                        romajiSpinner.style.display = 'none';
                        convertBtn.disabled = false;
                    }
                });

                // 自动转换功能
                let conversionTimeout;
                japaneseInput?.addEventListener('input', () => {
                    if (!autoConvertCheckbox?.checked) return;
                    
                    // 清除之前的定时器
                    clearTimeout(conversionTimeout);
                    
                    // 设置新的定时器，延迟500ms后执行转换
                    conversionTimeout = setTimeout(async () => {
                        const japanese = japaneseInput.value.trim();
                        if (!japanese) return;

                        try {
                            // 显示加载动画
                            hiraganaSpinner.style.display = 'block';
                            romajiSpinner.style.display = 'block';

                            // 执行转换
                            const result = await japaneseConverter.convert(japanese);
                            
                            // 更新输入框
                            hiraganaInput.value = result.hiragana || japanese;
                            romajiInput.value = result.romaji || japanese;
                        } catch (error) {
                            console.error('自动转换失败:', error);
                            // 不显示错误提示以避免打断用户输入
                            
                            // 尝试分解日语句子为单个字符，用冒号分隔
                            if (japanese) {
                                hiraganaInput.value = japanese.split('').join(':');
                            }
                        } finally {
                            // 隐藏加载动画
                            hiraganaSpinner.style.display = 'none';
                            romajiSpinner.style.display = 'none';
                        }
                    }, 500);
                });

                // 批量导入功能
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
                        
                        const parsedData = await this.parseBatchImport(importText, separator, japaneseConverter);
                        this.previewBatchImport(parsedData);
                    });
                }
                
                if (batchImportForm) {
                    batchImportForm.addEventListener('submit', async (e) => {
                        e.preventDefault();
                        const importText = document.getElementById('batchImportText').value.trim();
                        const separator = document.querySelector('input[name="separator"]:checked').value;
                        const collectionId = batchImportForm.dataset.collectionId;
                        
                        if (!importText || !collectionId) {
                            alert('请输入要导入的内容');
                            return;
                        }
                        
                        try {
                            const parsedData = await this.parseBatchImport(importText, separator, japaneseConverter);
                            await this.processBatchImport(parsedData, collectionId);
                            
                            // 关闭模态框
                            const modal = document.getElementById('batchImportModal');
                            if (modal) {
                                modal.classList.remove('show');
                            }
                            
                            // 刷新列表
                            this.refreshCollectionsList();
                            alert(`成功导入 ${parsedData.length} 条句子`);
                        } catch (error) {
                            console.error('批量导入失败:', error);
                            alert('导入失败，请检查输入格式');
                        }
                    });
                }
            }).catch(error => {
                console.error('加载转换器失败:', error);
                if (convertBtn) {
                    convertBtn.disabled = false; // 保持按钮可用，用户可以手动尝试
                    convertBtn.title = '日语转换器加载失败，但您仍可以点击尝试转换';
                }
                
                // 为用户提供友好提示
                alert('日语转换功能可能不可用，您需要手动填写假名和罗马音');
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
                    if (modal) {
                        modal.classList.remove('show');
                    }
                    this.refreshCollectionsList();
                    window.dispatchEvent(new CustomEvent('collectionsUpdated'));
                } catch (error) {
                    console.error('Error adding sentence:', error);
                    alert('添加句子失败，请重试');
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

    // 解析批量导入数据
    async parseBatchImport(text, separatorType, converter) {
        if (!text) return [];
        
        // 确定分隔符
        let separator = '=';
        if (separatorType === 'tab') {
            separator = '\t';
        } else if (separatorType === 'comma') {
            separator = ',';
        }
        
        // 按行分割文本
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
        const result = [];
        
        // 处理每一行
        for (const line of lines) {
            // 跳过空行或注释
            if (line.trim() === '' || line.trim().startsWith('#')) {
                continue;
            }
            
            const parts = line.split(separator);
            
            // 至少需要日语和中文两部分
            if (parts.length < 2) {
                continue;
            }
            
            const japanese = parts[0].trim();
            const meaning = parts[1].trim();
            
            // 转换日语为平假名和罗马字
            try {
                const converted = await converter.convert(japanese);
                
                result.push({
                    japanese,
                    hiragana: converted.hiragana,
                    romaji: converted.romaji,
                    meaning
                });
            } catch (error) {
                console.error('转换失败:', error);
                
                // 即使转换失败，也添加到结果中，但使用简单的分词
                result.push({
                    japanese,
                    hiragana: japanese.split('').join(':'),
                    romaji: japanese,
                    meaning
                });
            }
        }
        
        return result;
    }
    
    // 预览批量导入数据
    previewBatchImport(sentences) {
        const previewContainer = document.getElementById('importPreview');
        if (!previewContainer) return;
        
        if (sentences.length === 0) {
            previewContainer.innerHTML = '<div class="preview-empty">没有有效的句子可以导入</div>';
            previewContainer.style.display = 'block';
            return;
        }
        
        // 最多显示 5 个
        const previewItems = sentences.slice(0, 5);
        let html = `
            <div class="preview-header">预览 (${sentences.length} 个句子)</div>
            <div class="preview-items">
        `;
        
        previewItems.forEach(sentence => {
            html += `
                <div class="preview-item">
                    <div class="preview-japanese">${sentence.japanese}</div>
                    <div class="preview-meaning">${sentence.meaning}</div>
                    <div class="preview-detail">
                        <span class="preview-hiragana">${sentence.hiragana}</span>
                        <span class="preview-romaji">${sentence.romaji}</span>
                    </div>
                </div>
            `;
        });
        
        if (sentences.length > 5) {
            html += `<div class="preview-more">...还有 ${sentences.length - 5} 个句子</div>`;
        }
        
        html += '</div>';
        
        previewContainer.innerHTML = html;
        previewContainer.style.display = 'block';
    }
    
    // 处理批量导入数据
    async processBatchImport(sentences, collectionId) {
        if (!this.collections[collectionId]) {
            throw new Error('收藏夹不存在');
        }
        
        // 记录总共处理的句子数
        let count = 0;
        
        // 批量添加句子
        for (const sentence of sentences) {
            if (sentence.japanese && sentence.meaning) {
                this.addSentence(collectionId, sentence);
                count++;
            }
        }
        
        // 保存到 localStorage
        this.saveCollections();
        
        return count;
    }

    // 显示收藏夹列表模态框
    showCollectionsModal() {
        const modal = document.getElementById('collectionsModal');
        if (modal) {
            this.refreshCollectionsList();
            modal.classList.add('show');
        }
    }

    // 显示添加收藏夹模态框
    showAddCollectionModal() {
        const modal = document.getElementById('addCollectionModal');
        if (modal) {
            document.getElementById('addCollectionForm').reset();
            modal.classList.add('show');
        }
    }

    // 隐藏添加收藏夹模态框
    hideAddCollectionModal() {
        const modal = document.getElementById('addCollectionModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    // 显示添加句子模态框
    showAddSentenceModal(collectionId) {
        const modal = document.getElementById('addSentenceModal');
        if (modal) {
            // 重置表单
            const form = modal.querySelector('#addSentenceForm');
            if (form) {
                form.reset();
                form.dataset.collectionId = collectionId;
            }
            
            // 显示模态框
            modal.classList.add('show');
        }
    }

    // 显示批量导入模态框
    showBatchImportModal(collectionId) {
        const modal = document.getElementById('batchImportModal');
        if (modal) {
            // 重置表单
            const form = document.getElementById('batchImportForm');
            if (form) {
                form.reset();
                form.dataset.collectionId = collectionId;
            }
            
            // 隐藏预览区域
            const previewContainer = document.getElementById('importPreview');
            if (previewContainer) {
                previewContainer.style.display = 'none';
                previewContainer.innerHTML = '';
            }
            
            // 显示模态框
            modal.classList.add('show');
        }
    }

    // 隐藏添加句子模态框
    hideAddSentenceModal() {
        const modal = document.getElementById('addSentenceModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    // 刷新收藏夹列表
    refreshCollectionsList() {
        const collectionsContainer = document.querySelector('.collections-list');
        if (!collectionsContainer) return;

        collectionsContainer.innerHTML = '';

        Object.entries(this.collections).forEach(([id, collection]) => {
            const collectionElement = document.createElement('div');
            collectionElement.className = 'collection-item';
            collectionElement.innerHTML = `
                <div class="collection-header">
                    <h3>${collection.name}</h3>
                    <div class="collection-actions">
                        <button class="add-sentence-btn" title="添加句子">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="batch-import-btn" title="批量导入">
                            <i class="fas fa-file-import"></i>
                        </button>
                        <button class="edit-btn" title="编辑收藏夹">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="manage-sentences-btn" title="管理句子">
                            <i class="fas fa-list"></i>
                        </button>
                        <button class="flashcard-btn" title="闪卡练习">
                            <i class="fas fa-graduation-cap"></i>
                        </button>
                        <button class="delete-btn" title="删除收藏夹">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <p class="collection-description">${collection.description || ''}</p>
                <div class="collection-stats">
                    <span><i class="fas fa-book"></i>${Object.keys(collection.sentences || {}).length} 个句子</span>
                </div>
            `;

            // 添加句子按钮事件
            const addSentenceBtn = collectionElement.querySelector('.add-sentence-btn');
            addSentenceBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showAddSentenceModal(id);
            });

            // 批量导入按钮事件
            const batchImportBtn = collectionElement.querySelector('.batch-import-btn');
            batchImportBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showBatchImportModal(id);
            });

            // 编辑按钮事件
            const editBtn = collectionElement.querySelector('.edit-btn');
            editBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showEditCollectionModal(id);
            });

            // 管理句子按钮事件
            const manageSentencesBtn = collectionElement.querySelector('.manage-sentences-btn');
            manageSentencesBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showManageSentencesModal(id);
            });

            // 闪卡练习按钮事件
            const flashcardBtn = collectionElement.querySelector('.flashcard-btn');
            flashcardBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const sentences = this.getSentencesForFlashcard(id);
                if (sentences.length === 0) {
                    alert('当前收藏夹没有句子，请先添加句子');
                    return;
                }
                sessionStorage.setItem('reviewSentences', JSON.stringify(sentences));
                window.location.href = 'review/flashcard.html';
            });

            // 删除按钮事件
            const deleteBtn = collectionElement.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (confirm('确定要删除这个收藏夹吗？')) {
                    this.deleteCollection(id);
                    this.refreshCollectionsList();
                }
            });

            collectionsContainer.appendChild(collectionElement);
        });
    }

    // 显示编辑收藏夹模态框
    showEditCollectionModal(collectionId) {
        const collection = this.collections[collectionId];
        if (!collection) return;

        const modal = document.getElementById('editCollectionModal');
        if (modal) {
            document.getElementById('editCollectionId').value = collectionId;
            document.getElementById('editCollectionName').value = collection.name;
            document.getElementById('editCollectionDescription').value = collection.description || '';
            modal.classList.add('show');
        }
    }

    // 隐藏编辑收藏夹模态框
    hideEditCollectionModal() {
        const modal = document.getElementById('editCollectionModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    // 显示管理句子模态框
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
            Object.entries(collection.sentences).forEach(([sentenceId, sentence]) => {
                const sentenceElement = document.createElement('div');
                sentenceElement.className = 'sentence-item';
                sentenceElement.innerHTML = `
                    <div class="sentence-content">
                        <div class="japanese">${sentence.japanese}</div>
                        <div class="chinese">${sentence.meaning}</div>
                    </div>
                    <div class="sentence-actions">
                        <button class="delete-sentence-btn" title="删除句子">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;

                // 删除句子按钮事件
                const deleteBtn = sentenceElement.querySelector('.delete-sentence-btn');
                deleteBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (confirm('确定要删除这个句子吗？')) {
                        this.deleteSentence(collectionId, sentenceId);
                        this.showManageSentencesModal(collectionId); // 刷新列表
                    }
                });

                container.appendChild(sentenceElement);
            });
        }

        modal.classList.add('show');
    }
} 