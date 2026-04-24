/**
 * Client-Side Storage Utility
 * Replaces SQLite backend. Uses cookies for small data (<4KB)
 * and LocalStorage as a fallback for larger datasets.
 */

// Utility to create a cookie, falling back to LocalStorage if data is too big.
export const setCookie = (name: string, value: any, expiryDays: number = 30): void => {
  try {
    const d = new Date();
    d.setTime(d.getTime() + (expiryDays * 24 * 60 * 60 * 1000));
    const expires = "expires=" + d.toUTCString();

    const jsonValue = JSON.stringify(value);
    // Basic obfuscation using Base64
    const encodedValue = btoa(encodeURIComponent(jsonValue));

    // Calculate approximate size in bytes
    const sizeInBytes = new Blob([encodedValue]).size;

    // Cookies can only hold about 4KB of data per domain
    if (sizeInBytes > 4000) {
      console.warn(`[Storage] Size exceeds 4KB for ${name} (${sizeInBytes} bytes), falling back to localStorage.`);
      localStorage.setItem(name, encodedValue);
      // Remove cookie if it existed before to avoid split-brain
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      return;
    }

    // Attempt to store in cookie with secure-like flags
    document.cookie = `${name}=${encodedValue};${expires};path=/;SameSite=Lax`;
    // Also remove from localStorage in case it downgraded in the past
    localStorage.removeItem(name);
  } catch (error) {
    console.error("Failed to set cookie/localstorage", error);
  }
};

// Utility to parse data back from Cookie or LocalStorage
export const getCookie = <T>(name: string): T | null => {
  try {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    let encodedValue = null;

    for (let i = 0; i < ca.length; i++) {
      let c = ca[i].trim();
      if (c.indexOf(nameEQ) === 0) {
        encodedValue = c.substring(nameEQ.length, c.length);
        break;
      }
    }

    // Fallback to localStorage if not found in cookies
    if (!encodedValue) {
      encodedValue = localStorage.getItem(name);
    }

    if (!encodedValue) return null;

    const jsonValue = decodeURIComponent(atob(encodedValue));
    return JSON.parse(jsonValue) as T;
  } catch (e) {
    console.error(`[Storage] Corrupted local storage data for ${name}`, e);
    return null;
  }
};

// Utility to format/clear data
export const deleteCookie = (name: string): void => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  localStorage.removeItem(name);
};

// --- Mock DB Collections ---
// These helpers act like our ORM to interact with the local storage

export const getCollection = <T>(collectionName: string): T[] => {
  return getCookie<T[]>(collectionName) || [];
};

export const saveCollection = <T>(collectionName: string, data: T[]): void => {
  setCookie(collectionName, data, 30);
};

// Generic CRUD operations
export const insertItem = <T>(collectionName: string, item: T): T => {
  const collection = getCollection<T>(collectionName);
  collection.push(item);
  saveCollection(collectionName, collection);
  return item;
};

export const updateItem = <T>(collectionName: string, query: Partial<T>, updates: Partial<T>): T | null => {
  const collection = getCollection<T>(collectionName);
  let updatedItem = null;
  
  const updatedCollection = collection.map((item: any) => {
    // Check if item matches query
    const matches = Object.keys(query).every(key => item[key] === (query as any)[key]);
    if (matches) {
      updatedItem = { ...item, ...updates };
      return updatedItem;
    }
    return item;
  });

  if (updatedItem) {
    saveCollection(collectionName, updatedCollection);
  }
  return updatedItem;
};

export const deleteItem = <T>(collectionName: string, query: Partial<T>): boolean => {
  const collection = getCollection<T>(collectionName);
  const initialLength = collection.length;
  
  const filteredCollection = collection.filter((item: any) => {
    return !Object.keys(query).every(key => item[key] === (query as any)[key]);
  });

  if (filteredCollection.length !== initialLength) {
    saveCollection(collectionName, filteredCollection);
    return true;
  }
  return false;
};
