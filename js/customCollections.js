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
                            <input type="text" id="japanese" required>
                        </div>
                        <div class="form-group">
                            <label for="hiragana">平假名</label>
                            <input type="text" id="hiragana" required>
                        </div>
                        <div class="form-group">
                            <label for="romaji">罗马音</label>
                            <input type="text" id="romaji" required>
                        </div>
                        <div class="form-group">
                            <label for="meaning">含义</label>
                            <input type="text" id="meaning" required>
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
                        <button class="edit-btn" title="编辑收藏夹">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="manage-sentences-btn" title="管理句子">
                            <i class="fas fa-list"></i>
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