import { ThreadMessage, ReadingData, CalendarDay } from './types';

// localStorage key
const USER_ID = 'userId';

// Fallback if localStorage is unavailable
const safeLocalStorageGetItem = (key) => {
    try {
        return JSON.parse(localStorage.getItem(key));
    } catch {
        return null;
    }
};

const safeLocalStorageSetItem = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // handle the error (e.g., localStorage unavailable)
    }
};

export const getThread = (threadId) => {
    const threads = safeLocalStorageGetItem(`threads_${USER_ID}`) || {};
    return Promise.resolve(threads[threadId] || []);
};

export const upsertThread = (threadId, messages) => {
    const threads = safeLocalStorageGetItem(`threads_${USER_ID}`) || {};
    threads[threadId] = messages;
    safeLocalStorageSetItem(`threads_${USER_ID}`, threads);
    return Promise.resolve();
};

export const getReadingData = () => {
    const readingData = safeLocalStorageGetItem(`readingData_${USER_ID}`);
    return Promise.resolve(readingData);
};

export const upsertReadingData = (data) => {
    safeLocalStorageSetItem(`readingData_${USER_ID}`, data);
    return Promise.resolve();
};

export const getCalendarData = () => {
    const calendarData = safeLocalStorageGetItem(`calendarData_${USER_ID}`) || {};
    return Promise.resolve(calendarData);
};

export const upsertCalendarData = (calendarData) => {
    safeLocalStorageSetItem(`calendarData_${USER_ID}`, calendarData);
    return Promise.resolve();
};