/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import { app, BrowserWindow, shell, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import dotenv from 'dotenv';
import { OAuthManager } from './oauth/OAuthManager';
import { OAuthProviders } from './oauth/providers';
import { tallyMasterSync } from '../lib/TallyMasterSync';

dotenv.config();

// Configure logging
log.transports.file.level = 'info';
log.transports.console.level = 'debug';

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;
const oauthManager = OAuthManager.getInstance();

// ============================================================================
// IPC Handlers
// ============================================================================

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

/**
 * Handle ODBC SQL query execution
 * Native modules like 'odbc' only work in main process
 */
ipcMain.handle('execute-odbc-query', async (event, sqlQuery: string, port: number = 9000) => {
  let connection: any = null;
  const logs: string[] = []; // Collect logs to send to renderer
  
  // Helper to log both to main and collect for renderer
  const logInfo = (message: string, data?: any) => {
    const logMsg = data ? `${message} ${JSON.stringify(data)}` : message;
    log.info(logMsg);
    logs.push(`[MAIN] ${logMsg}`);
  };
  
  const logWarn = (message: string, data?: any) => {
    const logMsg = data ? `${message} ${JSON.stringify(data)}` : message;
    log.warn(logMsg);
    logs.push(`[MAIN WARN] ${logMsg}`);
  };
  
  const logError = (message: string, data?: any) => {
    const logMsg = data ? `${message} ${JSON.stringify(data)}` : message;
    log.error(logMsg);
    logs.push(`[MAIN ERROR] ${logMsg}`);
  };
  
  try {
    logInfo('ODBC Query Request:', { sqlQuery, port });
    
    // Import odbc module (only works in main process)
    const odbc = require('odbc');
    logInfo('ODBC module loaded successfully');
    logInfo('ODBC methods available:', Object.keys(odbc).filter((k: string) => typeof odbc[k] === 'function'));
    
    // Try multiple connection string formats
    const dsnLessConnectionString = `DRIVER={Tally ODBC Driver};SERVER=localhost;PORT=${port}`;
    const dsnConnectionString = `DSN=TallyODBC64_${port}`;
    
    const connectStrings = [dsnLessConnectionString, dsnConnectionString];
    let lastError: any = null;
    
    // Try each connection string
    for (const connStr of connectStrings) {
      try {
        logInfo('Attempting ODBC connection:', connStr);
        
        // Use connect method (more reliable than pool for single queries)
        if (typeof odbc.connect === 'function') {
          connection = await odbc.connect(connStr);
          logInfo('Connected successfully with:', connStr);
          break;
        } else if (typeof odbc.pool === 'function') {
          connection = await odbc.pool(connStr);
          logInfo('Connected via pool with:', connStr);
          break;
        } else {
          throw new Error('No connect or pool method found in ODBC module');
        }
      } catch (connError: any) {
        logWarn('Connection failed:', `${connStr} - ${connError.message}`);
        lastError = connError;
        connection = null;
      }
    }
    
    if (!connection) {
      throw lastError || new Error('Failed to connect with any connection string');
    }
    
    // Execute query
    logInfo('Executing SQL query...');
    const result = await connection.query(sqlQuery);
    logInfo('Query executed successfully, rows:', result?.length);
    
    // Extract columns and rows
    const columns = result.columns?.map((col: any) => col.name) || [];
    
    // If no columns metadata, get from first row
    if (columns.length === 0 && result.length > 0) {
      columns.push(...Object.keys(result[0]));
    }
    
    // Extract rows
    const rows = result.map((row: any) => {
      return columns.map((col: string) => row[col] !== undefined ? row[col] : null);
    });
    
    // Close connection
    await connection.close();
    logInfo('Connection closed');
    
    return {
      success: true,
      columns,
      rows,
      logs // Send logs to renderer
    };
    
  } catch (error: any) {
    logError('ODBC Query Error:', error.message);
    
    // Close connection if open
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        logError('Error closing connection:', closeError);
      }
    }
    
    // Return error details with logs
    return {
      success: false,
      error: error.message || 'Unknown ODBC error',
      details: error.stack,
      logs // Send logs even on error
    };
  }
});

/**
 * Handle OAuth sign-in request
 * Supports multiple providers (google, github, etc.)
 */
ipcMain.handle('oauth:signin', async (_event, providerName: string) => {
  try {
    log.info(`[IPC] OAuth sign-in requested for provider: ${providerName}`);
    
    const provider = OAuthProviders.getProvider(providerName);
    if (!provider) {
      log.error(`[IPC] Unknown OAuth provider: ${providerName}`);
      return {
        success: false,
        error: `Unknown provider: ${providerName}`,
      };
    }

    const result = await oauthManager.startOAuthFlow(provider);
    return result;
  } catch (error) {
    log.error('[IPC] Error handling OAuth sign-in', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

/**
 * Get list of available OAuth providers
 */
ipcMain.handle('oauth:providers', async () => {
  try {
    const providers = OAuthProviders.getAllProviders();
    return {
      success: true,
      providers: providers.map(p => ({ name: p.name })),
    };
  } catch (error) {
    log.error('[IPC] Error getting OAuth providers', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

// ============================================================================
// Tally Master Data Sync IPC Handlers
// ============================================================================

/**
 * Initialize Tally Master Sync service
 */
ipcMain.handle('tally-sync:initialize', async () => {
  try {
    await tallyMasterSync.initialize();
    log.info('[TallySync] Service initialized successfully');
    return { success: true };
  } catch (error) {
    log.error('[TallySync] Initialization failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

/**
 * Get list of all master tables
 */
ipcMain.handle('tally-sync:get-master-tables', async () => {
  try {
    const tables = tallyMasterSync.getAllMasterTables();
    return tables;
  } catch (error) {
    log.error('[TallySync] Error getting master tables:', error);
    throw error;
  }
});

/**
 * Sync a single master table
 */
ipcMain.handle('tally-sync:sync-table', async (_event, tableName: string) => {
  try {
    log.info(`[TallySync] Syncing table: ${tableName}`);
    
    // Initialize database if not already initialized
    await tallyMasterSync.initialize();
    log.info(`[TallySync] Database initialized`);
    
    // Get ODBC connection
    const odbc = require('odbc');
    const port = 9000; // Default Tally ODBC port
    
    // Find the master table config
    const masterTable = tallyMasterSync.getAllMasterTables().find(t => t.name === tableName);
    if (!masterTable) {
      throw new Error(`Master table not found: ${tableName}`);
    }
    
    // Sync the table
    await tallyMasterSync.syncMasterTable(odbc, masterTable, port);
    
    // Get sync status
    const status = tallyMasterSync.getSyncStatus().get(tableName);
    
    log.info(`[TallySync] Table synced successfully: ${tableName}`, status);
    
    return {
      success: true,
      totalRecords: status?.totalRecords || 0,
    };
  } catch (error) {
    log.error(`[TallySync] Error syncing table ${tableName}:`, error);
    throw error;
  }
});

/**
 * Sync all master tables with progress updates
 */
ipcMain.handle('tally-sync:sync-all', async (event) => {
  try {
    log.info('[TallySync] Starting full sync of all masters');
    
    // Initialize database if not already initialized
    await tallyMasterSync.initialize();
    log.info(`[TallySync] Database initialized`);
    
    const odbc = require('odbc');
    const port = 9000;
    
    // Sync with progress callback
    const result = await tallyMasterSync.syncAllMasters(odbc, port, (progress) => {
      // Send progress update to renderer
      event.sender.send('tally-sync:progress', progress);
      log.info(`[TallySync] Progress: ${progress.percentage}% (${progress.current}/${progress.total}) - ${progress.tableName}`);
    });
    
    log.info('[TallySync] Full sync completed', result);
    
    if (result.failureCount > 0) {
      log.warn('[TallySync] Some tables failed to sync:', result.errors);
    }
    
    return { 
      success: result.successCount > 0,
      successCount: result.successCount,
      failureCount: result.failureCount,
      errors: result.errors
    };
  } catch (error) {
    log.error('[TallySync] Error syncing all masters:', error);
    throw error;
  }
});

/**
 * Sync only accounting masters
 */
ipcMain.handle('tally-sync:sync-accounting', async () => {
  try {
    log.info('[TallySync] Starting accounting masters sync');
    
    // Initialize database if not already initialized
    await tallyMasterSync.initialize();
    log.info(`[TallySync] Database initialized`);
    
    const odbc = require('odbc');
    const port = 9000;
    
    await tallyMasterSync.syncAccountingMasters(odbc, port);
    
    log.info('[TallySync] Accounting masters sync completed');
    
    return { success: true };
  } catch (error) {
    log.error('[TallySync] Error syncing accounting masters:', error);
    throw error;
  }
});

/**
 * Sync only inventory masters
 */
ipcMain.handle('tally-sync:sync-inventory', async () => {
  try {
    log.info('[TallySync] Starting inventory masters sync');
    
    // Initialize database if not already initialized
    await tallyMasterSync.initialize();
    log.info(`[TallySync] Database initialized`);
    
    const odbc = require('odbc');
    const port = 9000;
    
    await tallyMasterSync.syncInventoryMasters(odbc, port);
    
    log.info('[TallySync] Inventory masters sync completed');
    
    return { success: true };
  } catch (error) {
    log.error('[TallySync] Error syncing inventory masters:', error);
    throw error;
  }
});

/**
 * Get sync status for all tables
 */
ipcMain.handle('tally-sync:get-status', async () => {
  try {
    log.info('[TallySync] Getting sync status...');
    
    // Ensure database is initialized
    await tallyMasterSync.initialize();
    
    const statusMap = tallyMasterSync.getSyncStatus();
    log.info('[TallySync] Status map size:', statusMap.size);
    
    const statusObj: Record<string, any> = {};
    
    statusMap.forEach((value, key) => {
      statusObj[key] = value;
      log.info(`[TallySync] Status for ${key}:`, value);
    });
    
    log.info('[TallySync] Returning status object with keys:', Object.keys(statusObj));
    
    return statusObj;
  } catch (error) {
    log.error('[TallySync] Error getting sync status:', error);
    throw error;
  }
});

/**
 * Query synced master data
 */
ipcMain.handle('tally-sync:query', async (_event, tableName: string, limit: number = 100, offset: number = 0) => {
  try {
    const records = tallyMasterSync.getMasterRecords(tableName, limit, offset);
    return records;
  } catch (error) {
    log.error(`[TallySync] Error querying ${tableName}:`, error);
    throw error;
  }
});

/**
 * Get database path and info
 */
ipcMain.handle('tally-sync:get-db-info', async () => {
  try {
    const dbPath = tallyMasterSync.getDbPath();
    const fs = require('fs');
    const exists = fs.existsSync(dbPath);
    
    let size = 0;
    if (exists) {
      const stats = fs.statSync(dbPath);
      size = stats.size;
    }
    
    log.info('[TallySync] Database info:', { dbPath, exists, size });
    
    return {
      dbPath,
      exists,
      size,
      sizeFormatted: `${(size / 1024).toFixed(2)} KB`
    };
  } catch (error) {
    log.error('[TallySync] Error getting DB info:', error);
    throw error;
  }
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug').default();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  const preloadPath = app.isPackaged
    ? path.join(__dirname, 'preload.js')
    : path.join(__dirname, '../../.erb/dll/preload.js');
  
  log.info('[Main] Preload path:', preloadPath);
  log.info('[Main] Preload exists:', require('fs').existsSync(preloadPath));

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    title: 'Tallie - AI-Powered Tally Assistant',
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true, // Enable web security
      allowRunningInsecureContent: false,
    },
  });

  const htmlUrl = resolveHtmlPath('index.html');
  log.info('[Main] Loading URL:', htmlUrl);
  log.info('[Main] App is packaged:', app.isPackaged);
  log.info('[Main] __dirname:', __dirname);
  
  mainWindow.loadURL(htmlUrl);
  
  // Log when page finishes loading
  mainWindow.webContents.on('did-finish-load', () => {
    log.info('[Main] Page finished loading');
  });
  
  // Log any load failures
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    log.error('[Main] Page failed to load:', { errorCode, errorDescription });
  });

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
    
    // Open DevTools in production for debugging
    if (app.isPackaged) {
      mainWindow.webContents.openDevTools();
    }
  });

  mainWindow.on('closed', () => {
    oauthManager.setMainWindow(null);
    mainWindow = null;
  });

  // Set OAuth manager window reference
  oauthManager.setMainWindow(mainWindow);

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

// ============================================================================
// Deep Link / Protocol Handler
// ============================================================================

/**
 * Handle deep link callback from OAuth flow
 */
function handleDeepLink(url: string): void {
  log.info('[DeepLink] Received URL:', url);
  
  const protocolScheme = oauthManager.getProtocolScheme();
  
  if (url.startsWith(`${protocolScheme}://oauth/callback`)) {
    log.info('[DeepLink] Processing OAuth callback');
    oauthManager.handleCallback(url);
    
    // Focus the main window
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  }
}

/**
 * Register custom protocol for OAuth callbacks
 * Must be called before app.whenReady()
 */
function registerProtocolHandler(): void {
  const protocolScheme = oauthManager.getProtocolScheme();
  
  // In development, we need to handle the protocol differently
  if (process.defaultApp) {
    // Development mode - find the main entry point
    // Filter out electron flags and find the actual app path
    const appPath = process.argv.find((arg, index) => 
      index > 0 && 
      !arg.startsWith('--') && 
      !arg.startsWith('-') &&
      (arg.endsWith('.js') || arg.endsWith('.ts') || arg.includes('main'))
    );
    
    if (appPath) {
      const electronPath = process.execPath;
      const resolvedAppPath = path.resolve(appPath);
      
      log.info(`[Protocol] Registering in dev mode`, {
        scheme: protocolScheme,
        electronPath,
        appPath: resolvedAppPath,
        argv: process.argv
      });
      
      app.setAsDefaultProtocolClient(
        protocolScheme,
        electronPath,
        [resolvedAppPath]
      );
    } else {
      // Fallback: just register without args (may not work perfectly in dev)
      log.warn(`[Protocol] Could not find app path, registering without args`);
      app.setAsDefaultProtocolClient(protocolScheme);
    }
  } else {
    // Production mode - simple registration
    app.setAsDefaultProtocolClient(protocolScheme);
  }
  
  log.info(`[Protocol] Registered protocol handler: ${protocolScheme}://`);
}

// ============================================================================
// App Lifecycle
// ============================================================================

// Register protocol handler BEFORE app is ready
registerProtocolHandler();

// Handle single instance lock (prevents multiple app instances)
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  log.warn('[App] Another instance is already running, quitting...');
  app.quit();
} else {
  // Handle second instance (Windows deep link)
  app.on('second-instance', (_event, commandLine) => {
    log.info('[App] Second instance detected', { commandLine });
    
    // Find protocol URL in command line
    const url = commandLine.find((arg) => 
      arg.startsWith(`${oauthManager.getProtocolScheme()}://`)
    );
    
    if (url) {
      handleDeepLink(url);
    }

    // Focus the main window
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });
}

// Handle deep link on macOS (when app is already running)
app.on('open-url', (event, url) => {
  event.preventDefault();
  log.info('[App] open-url event received:', url);
  
  // If app is not ready yet, queue the URL
  if (!app.isReady()) {
    app.once('ready', () => {
      handleDeepLink(url);
    });
  } else {
    handleDeepLink(url);
  }
});

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  log.info('[App] App is quitting, cleaning up...');
  oauthManager.cleanup();
});

app
  .whenReady()
  .then(() => {
    log.info('[App] App is ready');
    
    // Set app name for macOS dock
    if (process.platform === 'darwin') {
      app.setName('Tallie');
    }
    
    createWindow();
    
    // Check if app was launched with a protocol URL (macOS/Linux)
    if (process.platform !== 'win32') {
      const protocolUrl = process.argv.find((arg) => 
        arg.startsWith(`${oauthManager.getProtocolScheme()}://`)
      );
      
      if (protocolUrl) {
        log.info('[App] Launched with protocol URL:', protocolUrl);
        // Give the window time to fully load before processing
        setTimeout(() => {
          handleDeepLink(protocolUrl);
        }, 1000);
      }
    }
    
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
