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

        // 添加事件处理，防止 Tab 键跳转
        const textarea = batchImportModal.querySelector('#batchImportText');
        if (textarea) {
            textarea.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    e.preventDefault(); // 阻止默认的 Tab 行为
                    // 在光标位置插入制表符
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    textarea.value = textarea.value.substring(0, start) + '\t' + 
                                   textarea.value.substring(end);
                    // 将光标移动到插入位置之后
                    textarea.selectionStart = textarea.selectionEnd = start + 1;
                }
            });
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
                    if (hiraganaSpinner) hiraganaSpinner.style.display = 'block';
                    if (romajiSpinner) romajiSpinner.style.display = 'block';
                    if (convertBtn) convertBtn.disabled = true;

                    // 执行转换
                    const result = await converter.convert(japanese);
                    
                    // 更新输入框
                    if (hiraganaInput) hiraganaInput.value = result.data.hiragana || japanese;
                    if (romajiInput) romajiInput.value = result.data.romaji || japanese;
                } catch (error) {
                    console.error('转换失败:', error);
                    alert('转换失败，请手动输入假名和罗马音');
                } finally {
                    // 隐藏加载动画
                    if (hiraganaSpinner) hiraganaSpinner.style.display = 'none';
                    if (romajiSpinner) romajiSpinner.style.display = 'none';
                    if (convertBtn) convertBtn.disabled = false;
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
                        const result = await converter.convert(japanese);
                        
                        // 更新输入框
                        hiraganaInput.value = result.data.hiragana || japanese;
                        romajiInput.value = result.data.romaji || japanese;
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
                    
                    const parsedData = await this.parseBatchImport(importText, separator);
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
                        const parsedData = await this.parseBatchImport(importText, separator);
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

            // 设置平假名输入框的初始状态
            if (hiraganaInput && autoConvertCheckbox) {
                hiraganaInput.readOnly = autoConvertCheckbox.checked;
            }

            // 自动转换复选框事件
            if (autoConvertCheckbox) {
                autoConvertCheckbox.addEventListener('change', (e) => {
                    if (hiraganaInput) {
                        hiraganaInput.readOnly = e.target.checked;
                        if (!e.target.checked) {
                            hiraganaInput.focus();
                        }
                    }
                });
            }

            // 平假名输入框的手动输入事件
            if (hiraganaInput && !hiraganaInput.hasEventListener) {
                hiraganaInput.addEventListener('input', () => {
                    if (romajiInput && !autoConvertCheckbox.checked) {
                        // 当手动输入平假名时，自动更新罗马字
                        romajiInput.value = converter.hiraganaToRomaji(hiraganaInput.value);
                    }
                });
                hiraganaInput.hasEventListener = true;
            }

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
                        if (hiraganaSpinner) hiraganaSpinner.style.display = 'block';
                        if (romajiSpinner) romajiSpinner.style.display = 'block';

                        // 执行转换
                        const result = await converter.convert(japanese);
                        
                        // 更新输入框
                        if (hiraganaInput && autoConvertCheckbox.checked) {
                            hiraganaInput.value = result.data.hiragana;
                        }
                        if (romajiInput) {
                            romajiInput.value = result.data.romaji;
                        }
                    } catch (error) {
                        console.error('自动转换失败:', error);
                    } finally {
                        // 隐藏加载动画
                        if (hiraganaSpinner) hiraganaSpinner.style.display = 'none';
                        if (romajiSpinner) romajiSpinner.style.display = 'none';
                    }
                }, 500);
            });

            // 添加表单提交事件
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

    // 解析批量导入文本
    async parseBatchImport(text, separator) {
        if (!text) return [];
        
        // 按行分割文本
        const lines = text.trim().split('\n');
        const result = [];
        
        for (const line of lines) {
            if (!line.trim()) continue;
            
            try {
                // 根据选择的分隔符分割
                const parts = line.split(separator);
                if (parts.length < 2) continue;
                
                const japanese = parts[0].trim();
                const meaning = parts[1].trim();
                
                if (!japanese || !meaning) continue;
                
                // 转换日语
                const converted = await converter.convert(japanese);
                if (!converted.success) {
                    console.warn('转换失败:', japanese);
                    continue;
                }
                
                result.push({
                    japanese,
                    hiragana: converted.data.hiragana,
                    romaji: converted.data.romaji,
                    meaning
                });
            } catch (error) {
                console.error('处理行失败:', line, error);
            }
        }
        
        return result;
    }
    
    // 预览批量导入数据
    previewBatchImport(parsedData) {
        const previewContainer = document.getElementById('importPreview');
        if (!previewContainer) return;
        
        if (!Array.isArray(parsedData) || parsedData.length === 0) {
            previewContainer.innerHTML = '<div class="preview-empty">没有可导入的句子</div>';
            return;
        }
        
        // 创建预览表格
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
                </tr>
            </thead>
            <tbody>
                ${parsedData.map((item, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${item.japanese}</td>
                        <td>${item.hiragana}</td>
                        <td>${item.romaji}</td>
                        <td>${item.meaning}</td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        
        previewContainer.innerHTML = '';
        previewContainer.appendChild(table);
        previewContainer.style.display = 'block'; // 确保预览区域可见
    }
    
    // 处理批量导入数据
    async processBatchImport(parsedData, collectionId) {
        if (!Array.isArray(parsedData) || parsedData.length === 0) {
            throw new Error('没有有效的句子可导入');
        }
        
        if (!this.collections[collectionId]) {
            throw new Error('收藏夹不存在');
        }
        
        // 记录成功导入的数量
        let successCount = 0;
        const errors = [];
        
        // 逐个添加句子
        for (const sentence of parsedData) {
            try {
                // 验证数据完整性
                if (!sentence.japanese || !sentence.hiragana || !sentence.romaji || !sentence.meaning) {
                    errors.push(`句子格式不完整: ${sentence.japanese}`);
                    continue;
                }
                
                // 添加到收藏夹
                const id = `sentence_${Date.now()}_${successCount}`; // 确保 ID 唯一
                this.collections[collectionId].sentences[id] = {
                    ...sentence,
                    created_at: new Date().toISOString()
                };
                
                successCount++;
            } catch (error) {
                console.error('添加句子失败:', error, sentence);
                errors.push(`导入失败: ${sentence.japanese}`);
            }
        }
        
        // 保存更改
        this.saveCollections();
        
        // 刷新收藏夹列表
        this.refreshCollectionsList();
        
        // 返回导入结果
        return {
            success: successCount,
            errors: errors
        };
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
            
            // 计算复习状态
            let reviewStatus = '';
            if (collection.review && collection.review.next_review) {
                const nextReview = new Date(collection.review.next_review);
                const now = new Date();
                
                if (nextReview <= now) {
                    const daysOverdue = Math.floor((now - nextReview) / (1000 * 60 * 60 * 24));
                    reviewStatus = `<div class="review-reminder overdue">需要复习</div>`;
                } else {
                    const daysUntil = Math.ceil((nextReview - now) / (1000 * 60 * 60 * 24));
                    reviewStatus = `<div class="review-reminder upcoming">${daysUntil}天后复习</div>`;
                }
            }

            collectionElement.innerHTML = `
                <div class="collection-header">
                    <div class="collection-title-group">
                        <h3>${collection.name}</h3>
                        <div class="collection-review-status">
                            ${reviewStatus}
                        </div>
                    </div>
                    <div class="collection-actions">
                        <button class="add-sentence-btn" title="添加句子">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="batch-import-btn" title="批量导入">
                            <i class="fas fa-file-import"></i>
                        </button>
                        <button class="edit-btn" title="编辑">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="manage-sentences-btn" title="管理">
                            <i class="fas fa-list"></i>
                        </button>
                        <button class="review-btn" title="标记已复习">
                            <i class="fas fa-check"></i>
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

            // 复习按钮事件
            const reviewBtn = collectionElement.querySelector('.review-btn');
            reviewBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.updateReviewStatus(id);
                this.refreshCollectionsList();
            });

            // 删除按钮事件 - 移动到底部按钮
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

    // 初始化复习属性
    initializeReviewProperties() {
        Object.values(this.collections).forEach(collection => {
            if (!collection.review) {
                collection.review = {
                    last_review: null,
                    next_review: null,
                    interval_days: 7,
                    review_count: 0
                };
            }
        });
        this.saveCollections();
    }

    // 更新复习状态
    updateReviewStatus(collectionId) {
        const collection = this.collections[collectionId];
        if (!collection) return;

        // 确保有复习属性
        if (!collection.review) {
            collection.review = {
                last_review: null,
                next_review: null,
                interval_days: 7,
                review_count: 0
            };
        }

        const now = new Date();
        collection.review.last_review = now.toISOString();
        
        // 计算下次复习时间（7天后）
        const nextReview = new Date(now);
        nextReview.setDate(nextReview.getDate() + collection.review.interval_days);
        collection.review.next_review = nextReview.toISOString();
        
        collection.review.review_count++;
        
        this.saveCollections();
        
        // 显示提示
        alert(`已标记复习完成！\n下次复习时间：${nextReview.toLocaleDateString()}`);
    }

    // 检查是否需要复习
    checkReviewStatus() {
        const now = new Date();
        const needReview = [];

        Object.entries(this.collections).forEach(([id, collection]) => {
            if (collection.review && collection.review.next_review) {
                const nextReview = new Date(collection.review.next_review);
                if (nextReview <= now) {
                    needReview.push({
                        id,
                        name: collection.name,
                        daysOverdue: Math.floor((now - nextReview) / (1000 * 60 * 60 * 24))
                    });
                }
            }
        });

        return needReview;
    }
}