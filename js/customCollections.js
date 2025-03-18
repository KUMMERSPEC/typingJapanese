export class CustomCollectionsManager {
    constructor() {
        this.collections = this.loadCollections();
        this.initializeEventListeners();
    }

    // 获取所有收藏夹
    getCollections() {
        return Object.entries(this.collections).map(([id, collection]) => ({
            id,
            ...collection,
            sentences: Object.values(collection.sentences || {})
        }));
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

    // 初始化事件监听
    initializeEventListeners() {
        // 显示收藏夹模态框
        document.querySelector('[data-action="custom-collection"]')?.addEventListener('click', () => {
            this.showCollectionsModal();
        });

        // 关闭按钮事件
        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    modal.classList.remove('show');
                }
            });
        });

        // 新建收藏夹按钮
        document.querySelector('.add-collection-btn')?.addEventListener('click', () => {
            this.showAddCollectionModal();
        });

        // 添加收藏夹表单提交
        document.getElementById('addCollectionForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('collectionName').value;
            const description = document.getElementById('collectionDescription').value;
            this.createCollection(name, description);
            this.hideAddCollectionModal();
            this.refreshCollectionsList();
        });

        // 取消按钮
        document.querySelectorAll('.cancel-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    modal.classList.remove('show');
                }
            });
        });

        // 添加句子表单提交
        document.getElementById('addSentenceForm')?.addEventListener('submit', (e) => {
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
                // 触发自定义事件通知 CourseDisplay 更新
                window.dispatchEvent(new CustomEvent('collectionsUpdated'));
            } catch (error) {
                console.error('Error adding sentence:', error);
                alert('添加句子失败，请重试');
            }
        });
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
        const listContainer = document.querySelector('.collections-list');
        if (!listContainer) return;

        listContainer.innerHTML = '';
        
        if (Object.keys(this.collections).length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder-open" style="font-size: 48px; color: #ddd; margin-bottom: 15px;"></i>
                    <p>还没有创建任何收藏夹</p>
                    <p style="font-size: 14px; color: #666;">点击上方的"新建收藏夹"按钮开始创建</p>
                </div>
            `;
            return;
        }
        
        Object.entries(this.collections).forEach(([id, collection]) => {
            const sentenceCount = Object.keys(collection.sentences).length;
            const collectionElement = document.createElement('div');
            collectionElement.className = 'collection-item';
            
            // 创建句子列表HTML
            let sentencesHtml = '';
            if (sentenceCount > 0) {
                sentencesHtml = '<div class="sentences-list">';
                Object.values(collection.sentences).slice(0, 3).forEach(sentence => {
                    sentencesHtml += `
                        <div class="sentence-preview">
                            <div class="japanese">${sentence.japanese}</div>
                            <div class="meaning">${sentence.meaning}</div>
                        </div>
                    `;
                });
                if (sentenceCount > 3) {
                    sentencesHtml += `<div class="more-sentences">还有 ${sentenceCount - 3} 个句子...</div>`;
                }
                sentencesHtml += '</div>';
            }

            collectionElement.innerHTML = `
                <div class="collection-header">
                    <h3>${collection.name}</h3>
                    <div class="collection-actions">
                        <button onclick="window.customCollections.showAddSentenceModal('${id}')" class="action-button" title="添加句子">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button onclick="window.customCollections.showEditCollectionModal('${id}')" class="action-button" title="编辑收藏夹">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="window.customCollections.deleteCollectionWithConfirm('${id}')" class="action-button" title="删除收藏夹">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <p class="collection-description">${collection.description || '暂无描述'}</p>
                <div class="collection-stats">
                    <span><i class="fas fa-book"></i> ${sentenceCount} 个句子</span>
                    <span><i class="fas fa-calendar"></i> ${new Date(collection.created_at).toLocaleDateString()}</span>
                </div>
                ${sentencesHtml}
            `;
            listContainer.appendChild(collectionElement);
        });
    }

    // 显示添加句子模态框
    showAddSentenceModal(collectionId) {
        const modal = document.getElementById('addSentenceModal');
        if (modal) {
            document.getElementById('addSentenceForm').dataset.collectionId = collectionId;
            document.getElementById('addSentenceForm').reset();
            modal.classList.add('show');
        }
    }

    // 删除收藏夹（带确认）
    deleteCollectionWithConfirm(collectionId) {
        if (confirm('确定要删除这个收藏夹吗？此操作不可撤销。')) {
            this.deleteCollection(collectionId);
            this.refreshCollectionsList();
        }
    }

    showEditCollectionModal(collectionId) {
        const collection = this.collections[collectionId];
        if (!collection) return;

        const modal = document.getElementById('addCollectionModal');
        if (!modal) return;

        // 更新模态框标题
        modal.querySelector('.modal-header h2').textContent = '编辑收藏夹';
        
        // 填充表单
        const form = document.getElementById('addCollectionForm');
        form.dataset.editId = collectionId;
        document.getElementById('collectionName').value = collection.name;
        document.getElementById('collectionDescription').value = collection.description || '';

        // 更新提交按钮文本
        const submitBtn = form.querySelector('.primary-btn');
        submitBtn.textContent = '保存修改';

        // 显示模态框
        modal.classList.add('show');

        // 修改表单提交处理
        const submitHandler = (e) => {
            e.preventDefault();
            const name = document.getElementById('collectionName').value;
            const description = document.getElementById('collectionDescription').value;
            
            this.editCollection(collectionId, name, description);
            modal.classList.remove('show');
            form.reset();
            delete form.dataset.editId;
            submitBtn.textContent = '创建';
            
            // 刷新列表
            this.refreshCollectionsList();
            // 触发更新事件
            window.dispatchEvent(new CustomEvent('collectionsUpdated'));
            
            // 移除这个特殊的提交处理函数
            form.removeEventListener('submit', submitHandler);
        };

        // 添加一次性提交处理函数
        form.addEventListener('submit', submitHandler, { once: true });
    }
} 