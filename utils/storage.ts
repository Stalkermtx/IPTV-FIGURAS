import { get, set } from 'idb-keyval';

export interface HistoryItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  prompt: string;
  audioUrl?: string;
}

export interface StickerItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  createdAt: number;
}

const HISTORY_KEY = 'conextv_history';
const STICKERS_KEY = 'conextv_stickers';

export const saveHistory = async (history: HistoryItem[]) => {
  try {
    await set(HISTORY_KEY, history);
  } catch (error) {
    console.error('Failed to save history to IndexedDB', error);
  }
};

export const loadHistory = async (): Promise<HistoryItem[]> => {
  try {
    const history = await get<HistoryItem[]>(HISTORY_KEY);
    return history || [];
  } catch (error) {
    console.error('Failed to load history from IndexedDB', error);
    return [];
  }
};

export const saveStickers = async (stickers: StickerItem[]) => {
  try {
    await set(STICKERS_KEY, stickers);
  } catch (error) {
    console.error('Failed to save stickers to IndexedDB', error);
  }
};

export const loadStickers = async (): Promise<StickerItem[]> => {
  try {
    const stickers = await get<StickerItem[]>(STICKERS_KEY);
    return stickers || [];
  } catch (error) {
    console.error('Failed to load stickers from IndexedDB', error);
    return [];
  }
};
