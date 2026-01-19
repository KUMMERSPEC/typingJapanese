import converter from './converter.js';
import { showAddSentenceModal, showEditSentenceModal } from './sentenceModal.js';

export class CustomCollectionsManager {
    constructor() {
        this._lastTap = 0;
        this.collections = this.loadCollections();
        setTimeout(() => {
              window.dispatchEvent(new CustomEvent('collectionsUpdated', { detail: { collections: this.collections }}));
              }, 0); // 让 event 队列中的其他 DOM 任务先完成
        this.manageState = { page: 1, pageSize: 10, query: '', collectionId: null };
        this.confirmedImportData = null; // To store edited sentences from preview
        this.initializeEventListeners();
        // 当数据更新时，如果管理弹窗已打开则刷新列表
        window.addEventListener('collectionsUpdated', () => {
            const listEl = document.querySelector('#collectionsModal .collections-list');
            if (listEl && listEl.offsetParent) { // 弹窗存在且可见
                this.refreshCollectionsList(listEl);
            }
        });
    }

    // Method to get all collections
    getCollections() {
        return Object.entries(this.collections).map(([id, collection]) => ({
            id,
            ...collection,
            sentences: Object.entries(collection.sentences || {}).map(([sentenceId, sentence]) => ({ id: sentenceId, ...sentence }))
        }));
    }

    // Method to load collections from localStorage, with auto-repair for corrupted data
    loadCollections() {
        let rawData = localStorage.getItem('custom_collections') || '{}';
        try {
            let parsed = JSON.parse(rawData);
            // Check for double-stringified JSON (e.g., "{\"key\":\"value\"}")
            if (typeof parsed === 'string') {
                console.warn('[CustomCollections] Detected double-stringified JSON, attempting to repair.');
                parsed = JSON.parse(parsed); // Parse the inner string
            }
            return parsed;
        } catch (e) {
            console.error('[CustomCollections] Failed to parse collections, resetting to empty.', e);
            return {}; // Return empty object on failure to prevent further errors
        }
    }

    // Method to save collections to localStorage and Firebase
    saveCollections() {
        // 更新最后修改时间戳
        this.collections.__lastModified = Date.now();
        // 持久化到 localStorage
        const collectionsJson = JSON.stringify(this.collections);
        localStorage.setItem('custom_collections', collectionsJson);

        // 同步到 Firebase（直接传对象，避免二次 stringify）
        if (window.firebaseSync) {
            // 传已经序列化好的字符串，避免双重 stringify
            window.firebaseSync.saveData('custom_collections', collectionsJson);
        }

        // 统一通知并刷新列表
        window.dispatchEvent(new CustomEvent('collectionsUpdated', { detail: { collections: this.collections } }));
        // 如果管理弹窗已打开，刷新列表
        const listEl = document.querySelector('#collectionsModal .collections-list');
        if (listEl) this.refreshCollectionsList(listEl);
    }

    // Method to create a new collection
    createCollection(name, description) {
        const id = `collection_${Date.now()}`;
        this.collections[id] = {
            name,
            description,
            created_at: new Date().toISOString(),
            sentences: {},
            review: { last_review: null, next_review: null, interval_days: 7, review_count: 0 }
        };
        this.saveCollections();
        // 通知外部新句子
        
        return id;
    }

    // Method to add a sentence to a collection
    addSentence(collectionId, sentenceData) {
        if (!this.collections[collectionId]) throw new Error('收藏夹不存在');
        const id = `sentence_${Date.now()}`;
        this.collections[collectionId].sentences[id] = {
            ...sentenceData,
            type: 'split',
            created_at: new Date().toISOString()
        };
        this.saveCollections();
        const newSentence = this.collections[collectionId].sentences[id];
        window.dispatchEvent(new CustomEvent('sentenceAdded', {
            detail: {
                collectionId: collectionId,
                sentenceId: id,
                data: newSentence
            }
        }));
        return id;
    }

    // Method to delete a collection
    deleteCollection(collectionId) {
        if (this.collections[collectionId]) {
            delete this.collections[collectionId];
            this.saveCollections();
            window.dispatchEvent(new CustomEvent('sentenceDeleted',{detail:{collectionId:collectionId,ids:[sentenceId]}}));
            return true;
        }
        return false;
    }

    // Method to delete a sentence from a collection
    deleteSentence(collectionId, sentenceId) {
        if (this.collections[collectionId]?.sentences[sentenceId]) {
            delete this.collections[collectionId].sentences[sentenceId];
            this.saveCollections();
            window.dispatchEvent(new CustomEvent('sentenceDeleted',{detail:{collectionId:collectionId,ids:[sentenceId]}}));
            return true;
        }
        return false;
    }

    // Method to edit a collection's metadata
    editCollection(collectionId, name, description) {
        if (this.collections[collectionId]) {
            this.collections[collectionId].name = name;
            this.collections[collectionId].description = description;
            this.saveCollections();
            return true;
        }
        return false;
    }

    // Method to edit a sentence
    editSentence(collectionId, sentenceId, sentenceData) {
        if (this.collections[collectionId]?.sentences[sentenceId]) {
            const oldData = { ...this.collections[collectionId].sentences[sentenceId] };
            Object.assign(this.collections[collectionId].sentences[sentenceId], sentenceData, { updated_at: new Date().toISOString() });
            const newData = this.collections[collectionId].sentences[sentenceId];
            this.saveCollections();
            console.log('[customCollections] Dispatching sentenceUpdated', { collectionId, sentenceId, newData, oldData });
            window.dispatchEvent(new CustomEvent('sentenceUpdated',{
                detail:{
                    collectionId:collectionId,
                    sentenceId:sentenceId,
                    data:newData,
                    oldData:oldData
                }
            }));
            return true;
        }
        return false;
    }

    // Central event listener for modals
    initializeEventListeners() {
        // Prevent duplicate click on touch devices (double synthesized click)
        document.addEventListener('click',(e)=>{
            const now = Date.now();
            if(now - this._lastTap < 250){
                e.stopImmediatePropagation();
                e.preventDefault();
                return;
            }
            this._lastTap = now;
        },true);
        document.body.addEventListener('click', (e) => {
            const actionTarget = e.target.closest('[data-action]');
            const legacyAddBtn = e.target.closest('.add-collection-btn');

            // 1) Handle data-action buttons or legacy button
            if (actionTarget || legacyAddBtn) {
                e.preventDefault();
                e.stopPropagation();
                
                let action = actionTarget ? actionTarget.dataset.action : 'add-collection';
                let collectionId = e.target.closest('[data-collection-id]')?.dataset.collectionId;
                if (!collectionId) collectionId = this.manageState?.collectionId;

                switch (action) {
                    case 'manage-collections': this.showCollectionsModal(); break;
                    case 'add-collection': this.showAddCollectionModal(); break;
                    case 'edit-collection': this.showEditCollectionModal(collectionId); break;
                    case 'delete-collection': this.handleDeleteCollection(collectionId); break;
                    case 'add-sentence': this.showAddSentenceModal(collectionId); break;
                    case 'batch-import': this.showBatchImportModal(collectionId); break;
                    case 'manage-sentences': this.showManageSentencesModal(collectionId); break;
                    case 'edit-sentence': {
                        const sentenceItem = e.target.closest('[data-sentence-id]');
                        if (!sentenceItem) break;
                        const sId = sentenceItem.dataset.sentenceId;
                        // Re-fetch collections to ensure data is not stale
                        this.collections = this.loadCollections();
                        const data = this.collections[collectionId]?.sentences[sId];
                        if (data) {
                            this.showEditSentenceModal(collectionId, sId, data);
                        } else {
                            console.error('Could not find sentence data for edit:', {collectionId, sId});
                        }
                        break;
                    }
                    case 'delete-sentence': {
                        const sentenceItem = e.target.closest('[data-sentence-id]');
                        if (!sentenceItem) break;
                        const sId = sentenceItem.dataset.sentenceId;
                        if (confirm('确定删除这条句子吗？')) {
                            this.deleteSentence(collectionId, sId);
                            // 重新渲染列表
                            this.renderManageSentences();
                        }
                        break;
                    }
                }
                return; // Action handled
            }

            // 2) Handle modal close buttons
            if (e.target.closest('.modal .close-btn') || e.target.closest('.modal .cancel-btn')) {
                e.preventDefault();
                e.stopPropagation();
                e.target.closest('.modal')?.classList.remove('show');
                return;
            }

            // 3) Handle modal background clicks
            if (e.target.matches('.modal')) {
                e.target.classList.remove('show');
            }
        });
    }

    // --- BATCH IMPORT LOGIC ---
    async parseBatchImport(text, separator, lang) {
        const lines = text.trim().split('\n').filter(line => line.trim());
        const results = [];
        for (const line of lines) {
            const parts = line.split(separator);
            if (parts.length < 2) continue;
            const sentence = parts[0].trim();
            const meaning = parts.slice(1).join(separator).trim();
            if (!sentence || !meaning) continue;

            let hiragana = '', romaji = '';
            if (lang === 'ja') {
                try {
                    const converted = await converter.convert(sentence);
                    hiragana = converted?.data?.hiragana || sentence.split('').join(':');
                    romaji = converted?.data?.romaji || '';
                } catch { hiragana = sentence.split('').join(':'); }
            } else {
                hiragana = sentence.toLowerCase().replace(/[^a-z0-9']+/gi, ' ').trim().split(/\s+/).join(':');
            }
            results.push({ japanese: sentence, hiragana, romaji, meaning, lang });
        }
        return results;
    }

    previewBatchImport(parsedData, lang) {
        const table = document.createElement('table');
        table.className = 'preview-table';
        const isJa = lang === 'ja';
        table.innerHTML = `
            <thead><tr><th>#</th><th>${isJa ? '日语' : '英文'}</th><th>${isJa ? '假名' : '分词'}</th>${isJa ? '<th>罗马字</th>' : ''}<th>中文</th><th>操作</th></tr></thead>
            <tbody>${parsedData.map((item, i) => `
                <tr>
                    <td>${i + 1}</td><td>${item.japanese}</td>
                    <td><textarea data-field="hiragana">${item.hiragana}</textarea></td>
                    ${isJa ? `<td><input type="text" value="${item.romaji}" data-field="romaji"></td>` : ''}
                    <td><input type="text" value="${item.meaning}" data-field="meaning"></td>
                    <td><button type="button" class="delete-preview-btn">&times;</button></td>
                </tr>`).join('')}
            </tbody>`;

        table.addEventListener('click', e => {
            if (e.target.classList.contains('delete-preview-btn')) {
                e.target.closest('tr')?.remove();
                this._updatePreviewRowNumbers(table);
            }
        });

        if (isJa) {
            table.addEventListener('input', e => {
                if (e.target.dataset.field === 'hiragana') {
                    const romajiInput = e.target.closest('tr').querySelector('[data-field="romaji"]');
                    if (romajiInput) romajiInput.value = converter.hiraganaToRomaji(e.target.value);
                }
            });
        }
        this._openPreviewModal(table);
    }

    _openPreviewModal(table) {
        let modal = document.getElementById('importPreviewModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'importPreviewModal';
            modal.className = 'modal';
            modal.innerHTML = `
              <div class="modal-content" style="max-width:95%;width:95%;max-height:90vh;display:flex;flex-direction:column;">
                 <div class="modal-header"><h3>导入预览</h3><button class="close-btn">&times;</button></div>
                 <div class="preview-modal-body" style="flex:1;overflow:auto;padding:12px;"></div>
                 <div class="preview-modal-footer">
                     <button type="button" class="btn btn-primary confirm-preview-btn">确认修改</button>
                     <button type="button" class="btn btn-secondary cancel-btn">取消</button>
                 </div>
              </div>`;
            document.body.appendChild(modal);

            modal.querySelector('.confirm-preview-btn').addEventListener('click', () => {
                const lang = document.getElementById('batchLang')?.value || 'ja';
                const data = [];
                modal.querySelectorAll('tbody tr').forEach(row => {
                    const japanese = row.cells[1]?.textContent.trim();
                    const hiragana = row.querySelector('[data-field="hiragana"]')?.value.trim();
                    const romaji = row.querySelector('[data-field="romaji"]')?.value.trim() || '';
                    const meaning = row.querySelector('[data-field="meaning"]')?.value.trim();
                    if (japanese && hiragana && meaning && (lang !== 'ja' || romaji)) {
                        data.push({ japanese, hiragana, romaji, meaning, lang });
                    }
                });
                this.confirmedImportData = data;
                alert(`已确认 ${data.length} 条句子，请点击“导入”按钮完成操作。`);
                modal.classList.remove('show');
            });
        }
        modal.querySelector('.preview-modal-body').innerHTML = '';
        modal.querySelector('.preview-modal-body').appendChild(table);
        modal.classList.add('show');
    }

    async processBatchImport(sentencesToImport, collectionId) {
        if (!this.collections[collectionId]) throw new Error('收藏夹不存在');
        let successCount = 0;
        sentencesToImport.forEach(sentence => {
            const id = `sentence_${Date.now()}_${successCount++}`;
            this.collections[collectionId].sentences[id] = {
                ...sentence,
                created_at: new Date().toISOString()
            };
        });
        this.saveCollections();
        return { success: successCount };
    }

    _updatePreviewRowNumbers(table) {
        table.querySelectorAll('tbody tr').forEach((row, index) => {
            row.cells[0].textContent = index + 1;
        });
    }

    // --- MODAL DISPLAY METHODS ---
    showCollectionsModal() {
        // 每次打开弹窗都重新从 localStorage 读取一次，确保数据最新
        this.collections = this.loadCollections();
        let modal = document.getElementById('collectionsModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'collectionsModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header"><h3>管理收藏夹</h3><button class="close-btn">&times;</button></div>
                    <div class="collections-container">
                        <button data-action="add-collection" class="btn btn-primary" style="width:100%; margin-bottom: 16px;">+ 新建收藏夹</button>
                        <div class="collections-list"></div>
                    </div>
                </div>`;
            document.body.appendChild(modal);
        }
        this.refreshCollectionsList(modal.querySelector('.collections-list'));
        modal.classList.add('show');
    }

    refreshCollectionsList(container) {
        if (!container) return;
        container.innerHTML = '';
        Object.entries(this.collections).forEach(([id, collection]) => {
            if (!collection || typeof collection !== 'object' || !collection.name) return; // Skip metadata or malformed entries
            const item = document.createElement('div');
            item.className = 'collection-item';
            item.dataset.collectionId = id;
            item.innerHTML = `
                <h3>${collection.name}</h3><p>${collection.description || ''}</p>
                <div>${Object.keys(collection.sentences || {}).length} sentences</div>
                <div class="actions">
                    <button data-action="add-sentence" class="btn btn-secondary">添加</button>
                    <button data-action="batch-import" class="btn btn-secondary">批量导入</button>
                    <button data-action="edit-collection" class="btn btn-secondary">编辑</button>
                    <button data-action="delete-collection" class="btn btn-danger">删除</button>
                    <button data-action="manage-sentences" class="btn">管理句子</button>
                </div>`;
            container.appendChild(item);
        });
    }
    
    handleDeleteCollection(collectionId) {
        if (confirm('确定要删除这个收藏夹吗？')) {
            this.deleteCollection(collectionId);
            this.refreshCollectionsList(document.querySelector('#collectionsModal .collections-list'));
        }
    }

    showBatchImportModal(collectionId) {
        let modal = document.getElementById('batchImportModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'batchImportModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content" style="width:90%;max-width:800px;">
                    <div class="modal-header"><h3>批量导入句子</h3><button class="close-btn">&times;</button></div>
                    <form id="batchImportForm" class="modal-form">
                        <div class="form-group">
                            <label for="batchLang">语言</label>
                            <select id="batchLang"><option value="ja">日语</option><option value="en">英语</option></select>
                        </div>
                        <div class="form-group">
                            <label for="batchSeparator">分隔符</label>
                            <input type="text" id="batchSeparator" value=",">
                        </div>
                        <div class="form-group">
                            <label for="batchImportText">句子</label>
                            <textarea id="batchImportText" rows="8"></textarea>
                        </div>
                        <div class="form-actions">
                            <button type="button" id="previewImportBtn" class="btn btn-secondary">预览</button>
                            <button type="submit" class="btn btn-primary">导入</button>
                            <button type="button" class="cancel-btn btn btn-secondary">取消</button>
                        </div>
                    </form>
                </div>`;
            document.body.appendChild(modal);
            
            // Bind permanent events
            modal.querySelector('#previewImportBtn').addEventListener('click', async () => {
                const text = modal.querySelector('#batchImportText').value;
                const separator = modal.querySelector('#batchSeparator').value;
                const lang = modal.querySelector('#batchLang').value;
                const parsed = await this.parseBatchImport(text, separator, lang);
                this.previewBatchImport(parsed, lang);
            });

            modal.querySelector('form').addEventListener('submit', async (e) => {
                e.preventDefault();
                if (!this.confirmedImportData) {
                    alert('请先预览并确认修改。');
                    return;
                }
                const currentCollectionId = e.target.dataset.collectionId;
                await this.processBatchImport(this.confirmedImportData, currentCollectionId);
                this.confirmedImportData = null;
                modal.classList.remove('show');
                this.refreshCollectionsList(document.querySelector('#collectionsModal .collections-list'));
                alert('导入成功!');
            });
        }
        modal.querySelector('form').dataset.collectionId = collectionId;
        modal.classList.add('show');
    }

    showAddCollectionModal() {
        let modal = document.getElementById('addCollectionModal');

        const bindSubmitListener = () => {
            const form = modal.querySelector('form');
            if (form.dataset.listenerAttached) return;

            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const nameInput = modal.querySelector('#collectionName'); // Correct ID from index.html
                const descInput = modal.querySelector('#collectionDescription'); // Correct ID from index.html
                
                const name = nameInput ? nameInput.value.trim() : '';
                const desc = descInput ? descInput.value.trim() : '';

                if (!name) {
                    alert('名称不能为空');
                    return;
                }

                this.createCollection(name, desc);
                modal.classList.remove('show');
                // Also refresh the main collections list if it's visible
                const collectionsList = document.querySelector('#collectionsModal .collections-list');
                if (collectionsList) {
                    this.refreshCollectionsList(collectionsList);
                }
            });
            form.dataset.listenerAttached = 'true';
        };

        if (!modal) {
            // Fallback for safety: if modal is not in HTML, create it dynamically
            modal = document.createElement('div');
            modal.id = 'addCollectionModal';
            modal.className = 'modal';
            modal.innerHTML = `
              <div class="modal-content" style="max-width:400px;">
                <div class="modal-header"><h3>新建收藏夹</h3><button class="close-btn">&times;</button></div>
                <form id="addCollectionForm" class="modal-form">
                    <div class="form-group">
                        <label for="collectionName">名称</label>
                        <input id="collectionName" type="text" required>
                    </div>
                    <div class="form-group">
                        <label for="collectionDescription">描述</label>
                        <textarea id="collectionDescription" rows="3"></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary cancel-btn">取消</button>
                        <button type="submit" class="btn btn-primary">创建</button>
                    </div>
                </form>
              </div>`;
            document.body.appendChild(modal);
        }

        // Bind the listener and show the modal
        bindSubmitListener();
        modal.querySelector('form').reset();
        modal.classList.add('show');
    }

    showEditCollectionModal(collectionId) {
        let modal = document.getElementById('editCollectionModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'editCollectionModal';
            modal.className = 'modal';
            modal.innerHTML = `
              <div class="modal-content" style="max-width:400px;">
                <div class="modal-header"><h3>编辑收藏夹</h3><button class="close-btn">&times;</button></div>
                <form id="editCollectionForm" class="modal-form">
                    <input type="hidden" id="ecId">
                    <div class="form-group">
                        <label for="ecName">名称</label>
                        <input id="ecName" type="text" required>
                    </div>
                    <div class="form-group">
                        <label for="ecDesc">描述</label>
                        <textarea id="ecDesc" rows="3"></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary cancel-btn">取消</button>
                        <button type="submit" class="btn btn-primary">保存</button>
                    </div>
                </form>
              </div>`;
            document.body.appendChild(modal);

            modal.querySelector('form').addEventListener('submit', (e) => {
                e.preventDefault();
                const id = modal.querySelector('#ecId').value;
                const name = modal.querySelector('#ecName').value.trim();
                const desc = modal.querySelector('#ecDesc').value.trim();
                if (!name) { alert('名称不能为空'); return; }
                this.editCollection(id, name, desc);
                modal.classList.remove('show');
                this.refreshCollectionsList(document.querySelector('#collectionsModal .collections-list'));
            });
        }

        const collection = this.collections[collectionId];
        if (collection) {
            modal.querySelector('#ecId').value = collectionId;
            modal.querySelector('#ecName').value = collection.name;
            modal.querySelector('#ecDesc').value = collection.description || '';
            modal.classList.add('show');
        }
    }

    showAddSentenceModal(collectionId) {
        showAddSentenceModal(data => {
            this.addSentence(collectionId, data);
            this.refreshCollectionsList(document.querySelector('#collectionsModal .collections-list'));
        });
    }

    showEditSentenceModal(collectionId, sentenceId, sentenceData) {
        // Pass the original data to the modal, and receive it back in the save callback
        showEditSentenceModal(sentenceData, (updatedData, originalData) => {
            // Now call editSentence with the correct oldData
            this.editSentence(collectionId, sentenceId, updatedData, originalData);
            if (document.getElementById('manageSentencesModal')?.classList.contains('show')) {
                this.renderManageSentences();
            }
        });
    }
    
    showManageSentencesModal(collectionId) {
        let modal = document.getElementById('manageSentencesModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'manageSentencesModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content" style="max-width:900px;">
                    <div class="modal-header"><h3>管理句子</h3><button class="close-btn">&times;</button></div>
                    <div class="modal-body">
                        <div class="ms-toolbar">
                            <div class="ms-bulkbar" style="display:flex;align-items:center;gap:12px;margin:6px 0;">
                                <label><input type="checkbox" id="msCheckAll"> 全选</label>
                                <button id="msBulkDel" class="btn btn-danger" disabled>批量删除</button>
                            </div>
                            <input id="msSearch" type="text" placeholder="搜索...">
                            <select id="msPageSize"><option value="10">10</option><option value="20">20</option><option value="50">50</option></select>
                        </div>
                        <div class="sentences-container sentence-list"></div>
                        <div class="ms-pagination">
                            <button id="msPrev">上一页</button>
                            <span id="msPageInfo">1 / 1</span>
                            <button id="msNext">下一页</button>
                        </div>
                    </div>
                </div>`;
            document.body.appendChild(modal);

            // Bind events once
            const searchInput = modal.querySelector('#msSearch');
            const pageSizeSelect = modal.querySelector('#msPageSize');
            const prevBtn = modal.querySelector('#msPrev');
            const nextBtn = modal.querySelector('#msNext');

            const debounce = (fn,delay=200)=>{let t;return (...args)=>{clearTimeout(t);t=setTimeout(()=>fn.apply(this,args),delay);} }; 
            const render = () => this.renderManageSentences();
            const renderDebounced = debounce(render,200);

            searchInput.addEventListener('input', () => { this.manageState.query = searchInput.value; this.manageState.page = 1; renderDebounced(); });
            pageSizeSelect.addEventListener('change', () => { this.manageState.pageSize = parseInt(pageSizeSelect.value); this.manageState.page = 1; renderDebounced(); });
            prevBtn.addEventListener('click', () => { if (this.manageState.page > 1) { this.manageState.page--; render(); } });
            nextBtn.addEventListener('click', () => { 
                const totalPages = Math.ceil(this.getFilteredSentences().length / this.manageState.pageSize);
                if (this.manageState.page < totalPages) { this.manageState.page++; render(); } 
            });

            // ---- 批量删除绑定 ----
            const listEl = modal.querySelector('.sentences-container');
            const bulkBtn = modal.querySelector('#msBulkDel');
            const chkAll  = modal.querySelector('#msCheckAll');

            const updateBulkBtn = () => {
                bulkBtn.disabled = !listEl.querySelector('.ms-check:checked');
            };

            listEl.addEventListener('change', e => {
                if (e.target.classList.contains('ms-check')) updateBulkBtn();
            });
            chkAll.addEventListener('change', () => {
                listEl.querySelectorAll('.ms-check').forEach(cb=> cb.checked = chkAll.checked);
                updateBulkBtn();
            });
            bulkBtn.addEventListener('click', () => {
                const ids = Array.from(listEl.querySelectorAll('.ms-check:checked')).map(cb=> cb.dataset.sid);
                if (!ids.length) return;
                if (!confirm(`确定删除选中的 ${ids.length} 句？`)) return;
                ids.forEach(id=> this.deleteSentence(this.manageState.collectionId, id));
                this.renderManageSentences();
                chkAll.checked = false; bulkBtn.disabled = true;
            });
        }

        this.manageState.collectionId = collectionId;
        this.manageState.page = 1;
        this.manageState.query = '';
        modal.querySelector('#msSearch').value = '';
        this.renderManageSentences();
        modal.classList.add('show');
    }

    getFilteredSentences() {
        const { collectionId, query } = this.manageState;
        const collection = this.collections[collectionId];
        if (!collection || !collection.sentences) return [];
        
        const sentences = Object.entries(collection.sentences).map(([id, sentence]) => ({ id, ...sentence }));
        if (!query) return sentences;
        
        const lowerQuery = query.toLowerCase();
        return sentences.filter(s => 
            s.japanese?.toLowerCase().includes(lowerQuery) ||
            s.hiragana?.toLowerCase().includes(lowerQuery) ||
            s.meaning?.toLowerCase().includes(lowerQuery)
        );
    }

    renderManageSentences() {
        const modal = document.getElementById('manageSentencesModal');
        if (!modal) return;
        
        const container = modal.querySelector('.sentences-container');
        const pageInfo = modal.querySelector('#msPageInfo');
        const prevBtn = modal.querySelector('#msPrev');
        const nextBtn = modal.querySelector('#msNext');
        
        const filtered = this.getFilteredSentences();
        const totalPages = Math.max(1, Math.ceil(filtered.length / this.manageState.pageSize));
        this.manageState.page = Math.max(1, Math.min(this.manageState.page, totalPages));
        const startIndex = (this.manageState.page - 1) * this.manageState.pageSize;
        const paginated = filtered.slice(startIndex, startIndex + this.manageState.pageSize);

        container.innerHTML = paginated.map(sentence => `
            <div class="sentence-item" data-sentence-id="${sentence.id}">
                    <input type="checkbox" class="ms-check" data-sid="${sentence.id}" style="margin-right:8px;">
                <div class="sentence-main">
                    <div class="jp">${sentence.japanese || ''} <span class="lang-badge lang-badge-${sentence.lang}">${sentence.lang}</span></div>
                    <div class="meta">分词：${sentence.hiragana || ''}</div>
                    ${sentence.romaji ? `<div class="meta">罗马音：${sentence.romaji}</div>` : ''}
                    <div class="cn">${sentence.meaning || ''}</div>
                </div>
                <div class="actions">
                    <button data-action="edit-sentence" class="btn btn-secondary">编辑</button>
                    <button data-action="delete-sentence" class="btn btn-danger">删除</button>
                </div>
            </div>`
        ).join('');

        pageInfo.textContent = `${this.manageState.page} / ${totalPages}`;
        prevBtn.disabled = this.manageState.page <= 1;
        nextBtn.disabled = this.manageState.page >= totalPages;
    }
}
