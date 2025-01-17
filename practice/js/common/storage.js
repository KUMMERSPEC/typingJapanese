/**
 * Local storage management for the typing practice system
 */

const STORAGE_KEYS = {
    PROGRESS: 'typing_progress',
    SETTINGS: 'typing_settings',
    HISTORY: 'typing_history'
};

// Save practice progress
export function saveProgress(lessonId, progress) {
    const allProgress = getProgress();
    allProgress[lessonId] = progress;
    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(allProgress));
}

// Get practice progress
export function getProgress() {
    const progress = localStorage.getItem(STORAGE_KEYS.PROGRESS);
    return progress ? JSON.parse(progress) : {};
}

// Save practice history
export function saveHistory(lessonId, historyItem) {
    const history = getHistory(lessonId);
    history.push({
        ...historyItem,
        timestamp: Date.now()
    });
    // Keep only last 100 items
    if (history.length > 100) {
        history.shift();
    }
    localStorage.setItem(`${STORAGE_KEYS.HISTORY}_${lessonId}`, JSON.stringify(history));
}

// Get practice history
export function getHistory(lessonId) {
    const history = localStorage.getItem(`${STORAGE_KEYS.HISTORY}_${lessonId}`);
    return history ? JSON.parse(history) : [];
}

// Save user settings
export function saveSettings(settings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}

// Get user settings
export function getSettings() {
    const settings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return settings ? JSON.parse(settings) : {
        soundEnabled: true,
        darkMode: false,
        showHints: true
    };
} 