/**
 * indexedDBManager.js
 * --------------------------------------------------
 * 统一封装 IndexedDB 基础增删改查，供 StorageManager 调用。
 * 设计目标：简洁可靠，只存一张 key-value 表。
 */

const DB_NAME = 'TypingAppDB';
const DB_VERSION = 1;
const STORE_NAME = 'keyval';

/** 打开数据库（若不存在会自动创建） */
function openDB() {
    return new Promise((resolve, reject) => {
        if (!('indexedDB' in window)) {
            reject(new Error('IndexedDB not supported'));
            return;
        }
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error || new Error('IndexedDB open error'));
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });
}

/** 读取指定 key */
function getItem(key) {
    return openDB().then(db => {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
    });
}

/** 写入指定 key */
function setItem(key, value) {
    return openDB().then(db => {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.put(value, key);
            req.onsuccess = () => resolve(true);
            req.onerror = () => reject(req.error);
        });
    });
}

export default {
    getItem,
    setItem,
    /** 判断是否已有数据 */
    hasData(key) {
        return getItem(key).then(v => !!v);
    }
};

