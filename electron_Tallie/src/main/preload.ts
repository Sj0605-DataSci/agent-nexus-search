// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export type Channels = 
  | 'ipc-example'
  | 'oauth:success'
  | 'oauth:error'
  | 'tally-sync:progress';

export type InvokeChannels = 
  | 'oauth:signin'
  | 'oauth:providers'
  | 'execute-odbc-query'
  | 'tally-sync:initialize'
  | 'tally-sync:get-master-tables'
  | 'tally-sync:sync-table'
  | 'tally-sync:sync-all'
  | 'tally-sync:sync-accounting'
  | 'tally-sync:sync-inventory'
  | 'tally-sync:get-status'
  | 'tally-sync:query'
  | 'tally-sync:get-db-info';

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: Channels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
    invoke<T = unknown>(channel: InvokeChannels, ...args: unknown[]): Promise<T> {
      return ipcRenderer.invoke(channel, ...args);
    },
    removeAllListeners(channel: Channels) {
      ipcRenderer.removeAllListeners(channel);
    },
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
