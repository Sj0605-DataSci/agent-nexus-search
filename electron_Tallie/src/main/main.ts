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
