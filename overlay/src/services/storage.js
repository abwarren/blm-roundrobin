/**
 * Storage Service — localStorage wrapper for session persistence
 */

export class StorageService {
    constructor(prefix = 'blm_') {
        this._prefix = prefix;
    }

    get(key, fallback = null) {
        try {
            const raw = localStorage.getItem(this._prefix + key);
            return raw ? JSON.parse(raw) : fallback;
        } catch {
            return fallback;
        }
    }

    set(key, value) {
        try {
            localStorage.setItem(this._prefix + key, JSON.stringify(value));
        } catch (e) {
            console.warn('[BLM] Storage full, could not save', key);
        }
    }

    remove(key) {
        localStorage.removeItem(this._prefix + key);
    }

    clear() {
        const keys = Object.keys(localStorage).filter(k => k.startsWith(this._prefix));
        keys.forEach(k => localStorage.removeItem(k));
    }
}
