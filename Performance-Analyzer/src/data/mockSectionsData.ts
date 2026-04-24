// Simple observer pattern to let components know when sections update
type Listener = () => void;
const listeners: Set<Listener> = new Set();

const STORAGE_KEY = 'admin_sections';

// Load initial state from local storage or fallback to defaults
const loadInitialSections = (): string[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error("Failed to load sections from local storage", e);
    }
    return [];
};

let availableSections: string[] = loadInitialSections();

const saveSections = (sections: string[]) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sections));
    } catch (e) {
        console.error("Failed to save sections to local storage", e);
    }
};

export const getSections = () => {
    return [...availableSections];
};

export const addSection = (section: string) => {
    const normalized = section.trim().toUpperCase();
    if (!normalized) {
        throw new Error("Section name cannot be empty.");
    }
    if (availableSections.includes(normalized)) {
        throw new Error("Section already exists.");
    }
    availableSections = [...availableSections, normalized].sort();
    saveSections(availableSections);
    notifyListeners();
    return availableSections;
};

export const removeSection = (section: string) => {
    const normalized = section.trim().toUpperCase();
    availableSections = availableSections.filter(s => s !== normalized);
    saveSections(availableSections);
    notifyListeners();
    return availableSections;
};

export const subscribeToSections = (listener: Listener) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

const notifyListeners = () => {
    listeners.forEach(listener => listener());
};
