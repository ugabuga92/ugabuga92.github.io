// Simple storage using localStorage as fallback; IndexedDB could be added if needed
const KEY = 'mechaalpaca_save_v1';

export function saveState(state){
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function loadState(){
  const raw = localStorage.getItem(KEY);
  if(!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function clearState(){
  localStorage.removeItem(KEY);
}
