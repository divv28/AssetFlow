import { AsyncLocalStorage } from 'async_hooks';

export const contextStore = new AsyncLocalStorage();
