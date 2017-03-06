import electron, { ipcMain, session, autoUpdater } from 'electron';
import opbeat from 'opbeat';
import { search, searchAfter, setAlgoliaCredentials, searchLocalFiles } from './src/util/search';
import { getAlgoliaCredentials, getSyncStatus, startSync, setSegmentStatus, deleteAccount } from './src/util/util.js';
import { initCurrency } from './src/util/currency.js';
import { API_ROOT, isDevelopment, UPDATE_FEED_URL } from './src/util/const.js';
import { initPrefs } from './src/util/prefs.js';
import { initLocal, PREFERENCE_PREFIX } from './src/util/local.js';
import { initSegment } from './src/util/segment.js';
import AutoLaunch from 'auto-launch';
const math = require('mathjs');
const appVersion = require('./package.json').version;
const sessionLength = 900000; //900000 15 minutes = 1000 * 60 * 15
const { app, dialog, shell, BrowserWindow, Menu, MenuItem, Tray, globalShortcut } = electron;
const winHeight = 460;

let integrationActionsKeywords = [
  {
    mime: 'application/vnd.google-apps.document',
    type: 'gdrive',
    keywords: ['doc','docs','documents','document','gdoc','google doc','google document'],
    title: '<em>Create a new Google Document</em>',
    link: 'https://docs.google.com/a/your.domain.com/document/create'
  },
  {
    mime: 'application/vnd.google-apps.spreadsheet',
    type: 'gdrive',
    keywords: ['sheet','sheets','spreadsheet','spreadsheets','google sheet'],
    title: '<em>Create a new Google Sheet</em>',
    link: 'https://docs.google.com/a/your.domain.com/spreadsheet/ccc?new'
  },
  {
    mime: 'application/vnd.google-apps.presentation',
    type: 'gdrive',
    keywords: ['slide','slides','google slide','google slides','prezo','presentation','google presentation'],
    title: '<em>Create a new Google Presentation</em>',
    link: 'https://docs.google.com/a/your.domain.com/presentation/create'
  }
];

let gmailKeyword = {
    mime: 'gmail',
    type: 'gmail',
    keywords: ['gmail'],
    title: '<em>Open your work Gmail</em>',
    link: 'https://mail.google.com/a/your.domain.com/'
};

let gcalKeyword = {
    mime: 'gcal',
    type: 'gcal',
    keywords: ['gcal','calendar','google calendar'],
    title: '<em>Open your work Google Calendar</em>',
    link: 'https://calendar.google.com/a/your.domain.com/'
};

let googleKeyword = {
  mime: 'google',
  type: 'google',
  keywords: ['google'],
  title: '<em>Search Google for: </em>',
  link: 'https://www.google.com/search?q='
}

let websiteKeyword = {
  mime: 'google',
  type: 'google',
  title: '<em>Visit: </em>'
}

const KEYWORDS = {
  'google' : getGoogleItems,
  'gmail' : getGmailItems,
  'gcal' : getGcalItems,
  'calendar' : getGcalItems,
  'new' : getNewItems,
}

const integrationsAuth = [
  { name: 'Google Drive', id: 'google-oauth2'},
  { name: 'Intercom', id: 'intercom-oauth'},
  { name: 'Intercom', id: 'intercom-apikeys'},
  { name: 'Pipedrive', id: 'pipedrive-apikeys'},
  { name: 'Helpscout', id: 'helpscout-apikeys'},
  { name: 'Helpscout Docs', id: 'helpscout-docs-apikeys'},
  { name: 'Jira', id: 'jira-oauth'},
  { name: 'Github', id: 'github'},
  { name: 'Trello', id: 'trello'}
];

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let searchWindow;
let previewWindow;
let loginWindow;
let settingsWindow;
let debugWindow;
let tray;

let credentials;
let keepSearchVisible = false;
let screenBounds;
let syncPollerTimeouts = {};
let credentialsTimeout;
let prefs;
let segment;
let currency;
let local;
let updateInterval;
let sessionInterval;
let updateManual = false;
let latestSearchTime = 0;
let eNotify;
let accountEdit = false;

// debugging stuff
let settingsCache = [];
let searchCache = [];

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  const appPath = app.getPath('userData');
  prefs = initPrefs(appPath);
  currency = initCurrency();
  buildMenu();
  updateInterval = setInterval(checkForUpdates, 3600000);
  setupAutoLauncher();
  loadCredentialsOrLogin();
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('will-quit', () => {
  if (local) {
    local.stop();
  }
  if (updateInterval) {
    clearInterval(updateInterval);
  }
  if (credentialsTimeout) {
    clearTimeout(credentialsTimeout);
  }
  globalShortcut.unregisterAll();
});

app.on('activate', () => {
  if (searchWindow) {
    searchWindow.show();
  }
});

app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (url.indexOf('cloudfront.net') > -1) {
    // Verification logic.
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
})

// ipc communication
ipcMain.on('hide-search', () => {
  hide();
});

ipcMain.on('keep-search', () => {
  keepSearchVisible = true;
});

ipcMain.on('log', (event, arg) => {
  console.log(arg);
});

ipcMain.on('search', (event, arg, time, afterCreate) => {
  if (afterCreate) {
    refreshIntegrations();
  }

  let searchPromise;
  let localWords = arg.startsWith('mac ');
  
  if (localWords) {
    let localQuery = arg.split(' ').splice(1).join(' ');
    searchLocalFiles(localQuery, function (localResult) {
      if (time > latestSearchTime){
        // fix icon
        localResult = localResult.map(x => {
          let icon = local.getIconForMime(x.mime);
          if(!icon) {
            // try the first one (primary content type)
            if (x.metaInfo.contentTypes[0] !== 'public.item') {
              icon = local.getIconForMime(x.metaInfo.contentTypes[0]);
            }
            if (!icon) {
              // look for text type, otherwise give up
              for (let ct of x.metaInfo.contentTypes.filter(t => t.indexOf('text') > -1)) {
                icon = local.getIconForMime(ct);
                if (icon) {
                  break;
                }
              }
            }
          }
          if(!icon && local.currentApps && 'finder' in local.currentApps) {
            // fall back to finder icon
            icon = local.currentApps['finder'].cachedIcon;
          }
          x.displayIcon = icon;
          return x;
        });
        localResult = searchLocalApps(localQuery).concat(localResult);
        finalizeSearch(event, time, localResult, arg, true);
      }
    });
  } else {
    arg = arg.trim();
    if (arg === '') {
      // search for user's docs in the last 30 days
      const ts = parseInt((Date.now() - 1000 * 3600 * 24 * 30) / 1000);
      searchPromise = searchAfter(prefs.settings.account.name, ts);
    } else {
      searchPromise = search(arg);
    }

    if (searchPromise) {
      searchPromise.then(result => {
        if (time > latestSearchTime) {
          let hits = [];
          if (result) {
            hits = [].concat.apply([], result.hits);
            searchCache.unshift({
              time: result.searchInfo.time,
              query: result.searchInfo.query,
            });
            searchCache = searchCache.slice(0, 500);
            searchWindow.webContents.send('search-error-clear');
          } else {
            if (searchWindow) {
              searchWindow.webContents.send('search-error',  {
                message: 'Could not connect to Cuely service.',
                description: 'Please check your network connection and then try running the app again.'
              });
            }
          }
          
          hits = searchLocalApps(arg).concat(hits);
          finalizeSearch(event, time, hits, arg, false);
        }
      });
    }
  }
});

function finalizeSearch(event, time, hits, query, local) {
  if (!local) {
    hits = checkKeywords(query, hits);
  }

  if (time > latestSearchTime){
    latestSearchTime = time;
    event.sender.send('search-result', { items: hits, userDir: app.getPath('home') });
  }
}

ipcMain.on('close-login', () => {
  loginWindow.hide();
  loadCredentialsOrLogin();
});

ipcMain.on('close-debug', () => {
  debugWindow.close();
});

ipcMain.on('close-settings', () => {
  settingsWindow.close();
});

ipcMain.on('send-notification', (event, arg) => {
  sendDesktopNotification(arg.title, arg.body);
});

ipcMain.on('logout', (event, arg) => {
  session.defaultSession.clearStorageData({origin: API_ROOT});
  accountEdit = false;
  createLoginWindow();
  settingsWindow.close();
});

ipcMain.on('account', (event, arg) => {
  createLoginWindow();
  accountEdit = true;
  loginWindow.setSize(760, 680, false);
  if(settingsWindow){
    settingsWindow.close(); 
  }
});

ipcMain.on('account-delete', (event, arg) => {
  dialog.showMessageBox({
    type: 'warning',
    title: 'Cuely app',
    message: 'Are you sure?',
    detail: 'This action will remove the account and wipe all its data from the Cuely service.',
    buttons: ['Yes', 'No'],
    defaultId: 1 // select 'No' by default
  }, (response) => {
    if (response == 0) {
      // delete the account
      useAuthCookies((csrf, sessionId) => {
        if (csrf && sessionId) {
          deleteAccount(csrf, sessionId).then(([response, error]) => {
            // remove the session state and exit the app
            session.defaultSession.clearStorageData([], () => {
              console.log("Cleared session data");
              app.quit();
            });
          });
        }
      });
    }
  });
});

ipcMain.on('login-load', (event, arg) => {
  if (accountEdit) {
    event.sender.send('login-edit');
  }
});

ipcMain.on('settings-load', (event, arg) => {
  event.sender.send('settings-result', prefs.getAll());
});

ipcMain.on('debug-load', (event, arg) => {
  event.sender.send('debug-result', {
    settings: JSON.stringify(settingsCache, null, 2),
    settingsLocation: prefs.file,
    search: JSON.stringify(searchCache, null, 2)
  });
});

ipcMain.on('settings-save', (event, settings) => {
  if(!checkGlobalShortcut(settings.globalShortcut)) {
    event.sender.send(
      'settings-save-failed',
      'Could not set the global shortcut. Please try again without using national characters.'
    );
    return;
  }

  prefs.saveAll(settings);
  settingsCache.unshift({ time: Date(), settings: settings });
  settingsCache = settingsCache.slice(0, 10);
  sendDesktopNotification('Settings saved', 'Cuely has successfully saved new settings');
  updateGlobalShortcut();
  if (settings.showTrayIcon) {
    loadTray();
  } else {
    if(tray) {
      tray.destroy();
      tray = null;
    }
  }
  if (settings.showDockIcon) {
    if(!app.dock.isVisible()) {
      app.dock.show();
    }
  } else {
    app.dock.hide();
  }
  settingsWindow.close();
});

ipcMain.on('track', (event, arg) => {
  resetSession();
  if (segment) {
    segment.track(arg.name, arg.props);
  }
});

ipcMain.on('previewFile', (event, arg) => {
  keepSearchVisible = true;
  previewWindow = new BrowserWindow({
    closable: true,
    width: screenBounds.width,
    height: screenBounds.height,
    x: screenBounds.x,
    y: screenBounds.y,
    transparent: true,
    frame: false,
    shadow: true,
    resizable: false
  });

  previewWindow.previewFile(arg);

  previewWindow.on('blur', () => {
    previewWindow.close();
    previewWindow = null;
  });

});

ipcMain.on('openSettings', (event, arg) => {
  createSettingsWindow();
});

ipcMain.on('renderer-error', (event, arg) => {
  let { line, url, error } = arg;
  const account = prefs.getAccount();
  opbeat.captureError(error, {
    extra: {
      cuelyVersion: appVersion,
      user: `${account.userid} ${account.name}`,
      errorLine: line,
      errorUrl: url
    }
  });
});

//----------- UTILITY FUNCTIONS
function sendSyncDone(integrationName) {
  sendDesktopNotification('Synchronization complete', 'Cuely has finished indexing your ' + integrationName);
}

function sendDesktopNotification(title, body) {
  const target = searchWindow || loginWindow;
  if (target) {
    target.webContents.send('notification', { title, body });
  } else {
    console.log("Could not send desktop notification -> no window available");
  }
}

function buildMenu() {
  let menu;
  if (isDevelopment()) {
    menu = Menu.getApplicationMenu();
    menu.append(new MenuItem({
      type: 'submenu',
      label: 'Dev',
      submenu: customMenuItems(),
    }));
  } else {
    // set application menu to enable common key bindings, i.e. copy/paste/cut
    var template = [{
      label: "Cuely",
      submenu: customMenuItems().concat([
        { type: "separator" },
        { label: "Quit", accelerator: "Command+Q", click: () => { app.quit(); }}
      ])}, {
      label: "Edit",
      submenu: [
        { label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
        { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
        { type: "separator" },
        { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
        { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
        { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
        { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" },
        { label: "Hide", accelerator: "Cmd+H", click: () => { toggleHide(); }}
      ]}
    ];
    menu = Menu.buildFromTemplate(template);
  }
  Menu.setApplicationMenu(menu);
}

function customMenuItems() {
  return [
    { label: `Cuely v${appVersion}`, enabled: false },
    { label: "What's new", click: () => { shell.openExternal('https://cuely.co/whats_new.html'); }},
    { label: "Check for Updates", accelerator: "Command+U", click: () => { manualCheckForUpdates(); }},
    { type: "separator" },
    { label: "Preferences...", accelerator: "Command+,", click: () => { createSettingsWindow(); }},
    { label: "Debug log", accelerator: "Shift+CmdOrCtrl+D", click: () => { createDebugWindow(); }},
    { type: "separator" },
    { label: "About Cuely", click: () => { aboutDialog(); }},
    { label: "Help", click: () => { shell.openExternal('https://slack-files.com/T03V5J4DG-F33TWJJHL-542c183730'); }},
  ];
}

function aboutDialog() {
  dialog.showMessageBox({
    type: 'info',
    title: 'Cuely app',
    message: 'Cuely search app for macOS',
    detail: `Version ${appVersion}`,
    buttons: ['Ok']
  });
}

function getScreenProps() {
  let activeDisplays = electron.screen.getAllDisplays();

  if (activeDisplays.length > 1) {
    let display = getActiveDisplay(activeDisplays);

    return {
      width: display.workAreaSize.width,
      height: display.workAreaSize.height,
      center: { x: Math.round(display.workAreaSize.width/2), y: Math.round(display.workAreaSize.height/2) },
      const: { x: display.bounds.x, y: display.bounds.y }
    };
  }
  else {
    const {width, height} = electron.screen.getPrimaryDisplay().workAreaSize;
    return {
      width: width,
      height: height,
      center: { x: Math.round(width/2), y: Math.round(height/2) },
      const: { x: 0, y:0 }
    };
  }
}

function getActiveDisplay(activeDisplays) {
  let currentCursor = electron.screen.getCursorScreenPoint();

  for (let display of activeDisplays) {
    if (currentCursor.x >= display.bounds.x && currentCursor.x <= display.bounds.x + display.bounds.width && currentCursor.y >= display.bounds.y && currentCursor.y <= display.bounds.y + display.bounds.height) {
      return display;
    }
  }
}

function calculatePositionAndSize() {
  const screen = getScreenProps();
  // try to account for small and big screens
  // const w = Math.round(Math.max(800, Math.min(1000, screen.width / 3)));
  const w = 863;
  return {
    width: w,
    height: 460,
    x: screen.const.x + Math.round(screen.center.x - (w / 2)),
    y: screen.const.y + Math.round(screen.center.y / 2),
    screenWidth: screen.width,
    screenHeight: 460
  }
}

function createSearchWindow() {
  // Create the browser window.
  screenBounds = calculatePositionAndSize();
  searchWindow = new BrowserWindow({
    width: screenBounds.width,
    height: screenBounds.height,
    x: screenBounds.x,
    y: screenBounds.y,
    transparent: false,
    frame: false,
    show: false,
    enableLargerThanScreen: true,
    shadow: true,
    resizable: false
  });

  // and load the index.html of the app.
  searchWindow.loadURL(`file://${__dirname}/index.html?route=app`);

  searchWindow.once('ready-to-show', () => {
    setTimeout(toggleHide, 1000);
    searchWindow.webContents.send('setting-domain', prefs.settings.account.email.split('@')[1]);
  });
  // Emitted when the window is closed.
  searchWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    searchWindow.removeAllListeners();
    searchWindow = null;
  });
  searchWindow.on('show', () => {
    resetSession();
    searchWindow.webContents.send('focus-element', '#searchBar');
  });
  searchWindow.on('blur', () => {
    if (keepSearchVisible) {
      if (!auxilaryWindowVisible()) {
        keepSearchVisible = false;
      }
    } else if(!isDevelopment()) {
      hide();
    }
  });
};

function createLoginWindow() {
  keepSearchVisible = true;
  if (loginWindow) {
    loginWindow.show();
    return;
  }

  // Create the browser window.
  loginWindow = new BrowserWindow({
    width: 500,
    height: 500,
    center: true
  });

  // remove 'x-frame-options' header to allow embedding external pages into 'iframe'
  // also, capture possible redirects for completing various oauth flows
  loginWindow.webContents.session.webRequest.onHeadersReceived({}, (details, callback) => {
    for (let header in details.responseHeaders) {
      if (header.toLowerCase() === 'x-frame-options' || header.toLowerCase() === 'content-security-policy') {
        delete details.responseHeaders[header];
      }
    }

    const urlNoParams = details.url.split('?')[0];
    let integration = integrationsAuth.filter(x => urlNoParams.indexOf(`auth_complete/${x.id}`) > -1)[0];
    if (details.url.indexOf('github.com') > -1) {
      loginWindow.setSize(500, 700, false);
    }
    if (details.url.indexOf('trello.com') > -1) {
      // different sizes of window for different forms ...
      if (details.url.indexOf('1/OAuthAuthorizeToken') > -1) {
        loginWindow.setSize(500, 550, false);
      } else if (details.url.indexOf('login?returnUrl') > -1) {
        loginWindow.setSize(500, 370, false);
      }
    }

    if (details.url.indexOf('in_auth_flow') < 0 && integration) {
      startSyncPoller(integration.id, `${integration.name} account`);
    }
    callback({ cancel: false, responseHeaders: details.responseHeaders });
  });

  loginWindow.loadURL(`file://${__dirname}/index.html?route=login`);

  loginWindow.on('show', () => {
    keepSearchVisible = true;
  });
  // Emitted when the window is closed.
  loginWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    loginWindow = null;
    keepSearchVisible = false;
  });
}

function createDebugWindow() {
  keepSearchVisible = true;
  if (debugWindow) {
    debugWindow.show();
    return;
  }

  // Create the browser window.
  debugWindow = new BrowserWindow({
    width: 500,
    height: 500,
    center: true
  });

  debugWindow.loadURL(`file://${__dirname}/index.html?route=debug`);

  debugWindow.on('show', () => {
    keepSearchVisible = true;
  });
  // Emitted when the window is closed.
  debugWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    debugWindow = null;
    keepSearchVisible = false;
  });
}

function createSettingsWindow() {
  keepSearchVisible = true;
  if (settingsWindow) {
    settingsWindow.show();
    return;
  }

  // Create the browser window.
  settingsWindow = new BrowserWindow({
    width: 500,
    height: 500,
    center: true
  });

  settingsWindow.loadURL(`file://${__dirname}/index.html?route=settings`);

  settingsWindow.on('show', () => {
    keepSearchVisible = true;
  });
  // Emitted when the window is closed.
  settingsWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    settingsWindow = null;
    keepSearchVisible = false;
  });
}

function auxilaryWindowVisible() {
  for (let win of [loginWindow, debugWindow, settingsWindow]) {
    if (win && win.isVisible()) {
      return true;
    }
  }
  return false;
}

function loadCredentialsOrLogin(runSegment=true) {
  if (credentialsTimeout) {
    clearTimeout(credentialsTimeout);
  }

  useAuthCookies((csrf, sessionId) => {
    if (csrf && sessionId) {
      getAlgoliaCredentials(csrf, sessionId).then(([response, error]) => {
        if (response) {
          if (response.appId) {
            setAlgoliaCredentials(response);
            // update settings
            let settings = prefs.getAll();
            settings.account = {
              email: response.email,
              username: response.username,
              name: response.name,
              userid: response.userid,
              segmentIdentified: response.segmentIdentified,
              integrations: response.integrations
            }
            
            prefs.saveAll(settings);

            if (runSegment) {
              // init segment
              segment = initSegment(response.segmentKey);
              resetSession();
              const identified = segment.identify();
              if (identified) {
                setSegmentStatus(csrf, sessionId, identified);
              }
            }
            // refresh settings/credentials every hour
            credentialsTimeout = setTimeout(() => { loadCredentialsOrLogin(false) }, 3600000);
          } else {
            createLoginWindow();
            return;
          }
        }
        initFromSettings();
        if (error) {
          console.log('Failed to login to the backend');
          setTimeout(() => { loadCredentialsOrLogin(runSegment) }, 15000); // try again after 15s
          // if it's a connection issue, then opbeat also won't work, but in case it's just Cuely backend issue ...
          opbeat.captureError(error);
        }
      });
    } else {
      createLoginWindow();
    }
  });
}

function initFromSettings() {
  let settings = prefs.getAll();
  settingsCache.unshift({ time: Date(), settings: settings });
  settingsCache = settingsCache.slice(0, 10);
  if (settings.showTrayIcon) {
    loadTray();
  }
  endLogin();
}

function useAuthCookies(callback) {
  session.defaultSession.cookies.get({ url: API_ROOT }, (error, cookies) => {
    let csrfToken = cookies.filter(c => c.name === 'csrftoken');
    let sessionId = cookies.filter(c => c.name === 'sessionid');
    if (csrfToken.length > 0 && sessionId.length > 0) {
      callback(csrfToken[0].value, sessionId[0].value);
    } else {
      callback(null, null);
    }
  });
}

function startSyncPoller(type, integrationName) {
  if (syncPollerTimeouts[type]) {
    // already running
    return;
  }

  let syncing = true;
  syncPollerTimeouts[type] = setInterval(() => {
    useAuthCookies((csrf, sessionId) => {
      if (csrf && sessionId) {
        getSyncStatus(csrf, sessionId, type).then(([response, error]) => {
          if (error) {
            return;
          }
          if (syncing && response.has_started && !response.in_progress) {
            clearInterval(syncPollerTimeouts[type]);
            syncPollerTimeouts[type] = null;
            // send desktop notification
            sendSyncDone(integrationName);
          }
          syncing = response.in_progress;
        });
      } else {
        clearInterval(syncPollerTimeouts[type]);
        syncPollerTimeouts[type] = null;
      }
    });
  }, 30000);

  useAuthCookies((csrf, sessionId) => {
    if (csrf && sessionId) {
      startSync(csrf, sessionId, type);
    }
  });
  if (loginWindow) {
    loginWindow.hide();
  }
  loadCredentialsOrLogin();

  dialog.showMessageBox({
    type: 'info',
    title: 'Cuely app',
    message: `Cuely has started to sync with your ${integrationName}. You will receive a notification once it's done.`,
    detail: "You may start searching already now. The results will depend on how much data has been synced so far.",
    buttons: ['Ok']
  }, () => {
    endLogin();
  });
}

function loadTray() {
  if (tray) {
    return;
  }

  const p = process.platform;
  const imageDir = __dirname + '/assets/images';

  let trayImage;
  if (isOsx()) {
    trayImage = imageDir + '/osx/cuelyTemplate.png';
  } else if (isWin()) {
    trayImage = imageDir + '/win/cuely.ico';
  }

  // init tray
  tray = new Tray(trayImage);
  tray.setToolTip('Cuely search');
  tray.on('click', (event, bounds) => {
    if (searchWindow && !(loginWindow && loginWindow.isVisible())) {
      toggleHide();
    }
  });
  tray.on('right-click', (event, bounds) => {
    tray.popUpContextMenu(Menu.buildFromTemplate(customMenuItems()));
  });

  if (isOsx()) {
    tray.setPressedImage(imageDir + '/osx/cuelyHighlight.png');
  }
}

function isOsx() {
  const p = process.platform;
  return (process.platform === 'darwin');
}

function isWin() {
  const p = process.platform;
  return (process.platform === 'win32');
}

function endLogin() {
  updateGlobalShortcut();

  if (!searchWindow) {
    createSearchWindow();
    if (!prefs.getAll().showDockIcon) {
      app.dock.hide();
    }    
  }
  if (loginWindow) {
    loginWindow.close();
  }
  if (isOsx() && !local) {
    local = initLocal(app.getPath('userData'));
  }
  refreshIntegrations();
}

function refreshIntegrations() {
  searchWindow.webContents.send('integrations-load', prefs.settings.account.integrations);
}

function checkGlobalShortcut(shortcut) {
  // check if shortcut is possible to register
  try {
    globalShortcut.isRegistered(shortcut);
    return true;
  } catch(err) {
    console.log(err);
    // probably used a national character or some similar key that is rejected by native OS
    return false;
  }
}

function updateGlobalShortcut() {
  const shortcut = prefs.getAll().globalShortcut;
  if (checkGlobalShortcut(shortcut)) {
    globalShortcut.unregisterAll();
    const ret = globalShortcut.register(shortcut, () => {
      toggleHideOrCreate();
    })

    console.log(ret ? `Registered global shurtcut <${shortcut}>` : `Could not register global shortcut <${shortcut}>`);
  }
}

function checkKeywords(query, hits) {
  let itemsStart = [];
  let itemsEnd = [];
  let firstWord = '';
  let restOfQuery = '';
  let indexOfSpace = query.indexOf(' ');

  //cut query
  if (indexOfSpace == -1){
    firstWord = query;
  } else {
    firstWord = query.substr(0, indexOfSpace).trim();
    restOfQuery = query.substr(indexOfSpace + 1, query.length);
  }

  if (firstWord.length > 2) {
    //insert special keywords
    if (firstWord in KEYWORDS) {
      let items = KEYWORDS[firstWord](restOfQuery);

      itemsStart = itemsStart.concat(items);
    } else {
      let added = false;
      try {
        let mathResult = math.eval(query);  
        if (mathResult && typeof(mathResult) !== 'function' && String(mathResult) !== query && ('"' + String(mathResult) + '"' !== query)) {
          itemsStart.unshift(getMathExpression(mathResult));
          added = true;
        }
      } catch(err) {}
      if (!added) {
        // check currency
        let rates = currency.parseQuery(query);
        if (rates) {
          itemsStart.unshift(getCurrencyItem(rates));
        }
      }
    }
    
    if (restOfQuery === '' && itemsStart.length == 0) {
      let item = checkWebsiteKeyword(firstWord);
      
      if (item) {
        itemsStart.unshift(item);
      }
    }
  }

  //add search google at the end of hits
  if (((hits.length + itemsStart.length + itemsEnd.length) < 2) && firstWord != 'google') {
    let items = KEYWORDS['google'](query);

    itemsEnd = itemsEnd.concat(items);
  }

  hits = itemsStart.concat(hits);
  hits = hits.concat(itemsEnd);

  return hits;
}

function getGoogleItems(query) {
  let items = [];

  let itemStaticGoogle = Object.assign({}, googleKeyword);
  itemStaticGoogle = replaceGenericDomain(itemStaticGoogle);
  itemStaticGoogle.title = '<em>Open Google</em>';

  let itemSearchGoogle = Object.assign({}, googleKeyword);
  itemSearchGoogle = replaceGenericDomain(itemSearchGoogle);
  itemSearchGoogle.link = itemSearchGoogle.link + query;

  if (query === ''){
    itemSearchGoogle.title = 'Search Google: <em>&lt;type anything&gt;</em>';
  }
  else {
    itemSearchGoogle.title = 'Search Google: <em>' + query + '</em>';
  }

  items.push(getNewItem(itemStaticGoogle));

  if(query !== '') {
    items.unshift(getNewItem(itemSearchGoogle)); 
  }
  else {
    items.push(getNewItem(itemSearchGoogle));
  }

  return items;
}

function getGmailItems(query) {
  let items = [];

  let itemStaticGmail = Object.assign({}, gmailKeyword);
  itemStaticGmail = replaceGenericDomain(itemStaticGmail);
  itemStaticGmail.title = '<em>Open your work Gmail</em>';

  let itemSearchGmail = Object.assign({}, gmailKeyword);
  itemSearchGmail = replaceGenericDomain(itemSearchGmail);
  itemSearchGmail.link = itemSearchGmail.link + '#search/' + query;

  if (query === ''){
    itemSearchGmail.title = 'Search work Gmail: <em>&lt;type anything&gt;</em>';
  }
  else {
    itemSearchGmail.title = 'Search work Gmail: <em>' + query + '</em>';
  }

  items.push(getNewItem(itemStaticGmail));

  if(query !== '') {
    items.unshift(getNewItem(itemSearchGmail)); 
  }
  else {
    items.push(getNewItem(itemSearchGmail));
  }

  return items;
}

function getNewItems(query) {
  let items = [];

  if(query === '') {
    //give all the options
    for (let item of integrationActionsKeywords){
      items.push(getNewItem(replaceGenericDomain(item)));
    }
  } else {
    //give specific options
    for (let item of integrationActionsKeywords) {
      for (let keyword of item.keywords) {
        if (keyword.indexOf(query) != -1) {
          items.push(getNewItem(replaceGenericDomain(item)));
          break;
        }
      }
    }
  }

  return items;
}

function getGcalItems(query) {
  let items = [];

  let itemStaticGcal = Object.assign({}, gcalKeyword);
  itemStaticGcal = replaceGenericDomain(itemStaticGcal);
  itemStaticGcal.title = '<em>Open your work Google Calendar</em>';
  items.push(getNewItem(itemStaticGcal));

  return items;
}

function searchLocalApps(query) {
  // check if query matches any of the installed/local apps
  if (query && query.length >= 2 && local && local.currentApps) {
    let qLower = query.toLowerCase();
    let localHits = [];
    for (let item in local.currentApps) {
      let value = local.currentApps[item].name.toLowerCase();
      if (value.startsWith(PREFERENCE_PREFIX)) {
        value = value.split(PREFERENCE_PREFIX)[1];
      }

      if (qLower.split(' ').length > 1 && value.indexOf(qLower) > -1) {
        localHits.push(item);
        continue;
      }

      for(let word of value.split(' ')) {
        if (word.startsWith(qLower)) {
          localHits.push(item);
          break;
        }
      }
    }
    if (localHits.length > 0) {
      localHits.sort((a, b) => {
        return b.indexOf(qLower) - a.indexOf(qLower);
      });
      return localHits.slice(0, 3).map(x => getLocalItem(local.currentApps[x]));
    }
  }
  return [];
}

function checkWebsiteKeyword(arg){
  if (arg.indexOf('.') > -1){
    const urlRegex = /[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/;

    if (urlRegex.test(arg)) {
      let item = Object.assign({}, websiteKeyword);

      if (arg.indexOf("http://") == 0 || arg.indexOf("https://") == 0){
        item.link = arg;
      }
      else {
        item.link = 'http://'+arg;
      }      
      item.title = 'Visit: <em>' + arg + '</em>';

      return getNewItem(item);
    }
  }
}

function replaceGenericDomain(item){
  const domain = prefs.settings.account.email.split('@')[1];
  item.link = item.link.replace('your.domain.com', domain);

  return item;
}

function getNewItem(item) {
  return {
    type: item.type,
    mime: item.mime,
    title: item.title,
    titleRaw: item.titleRaw,
    content: null,
    metaInfo: null,
    displayIcon: null,
    webLink: item.link,
    thumbnailLink: null,
    modified: null,
    _algolia: null
  }
}

function getLocalItem(item) {
  let title = `App: <em>${item.name}</em>`;
  if (item.name.startsWith(PREFERENCE_PREFIX)) {
    title = 'Preferences: <em>' + item.name.split(PREFERENCE_PREFIX)[1] + '</em>';
  }

  return {
    type: 'local-app',
    mime: 'local-app',
    title: title,
    titleRaw: item.name,
    content: null,
    metaInfo: null,
    displayIcon: item.cachedIcon,
    webLink: item.location,
    thumbnailLink: null,
    modified: null,
    _algolia: null
  }
}

function getMathExpression(expression) {
  return {
    type: 'math',
    mime: 'math',
    title: `<em>= ${expression}</em>`,
    titleRaw: `${expression}`,
    content: null,
    metaInfo: null,
    displayIcon: null,
    webLink: null,
    thumbnailLink: null,
    modified: null,
    _algolia: null
  }
}

function getCurrencyItem(rates) {
  let titleRaw = `${rates[0].value} ${rates[0].currency}`;

  return {
    type: 'currency',
    mime: 'currency',
    title: `<em>= ${titleRaw}</em>`,
    titleRaw: `${titleRaw}`,
    content: rates,
    metaInfo: null,
    displayIcon: null,
    webLink: null,
    thumbnailLink: null,
    modified: null,
    _algolia: null
  }
}

function hide() {
  if (isOsx() && prefs.settings.showDockIcon) {
    app.hide();
  } else {
    searchWindow.hide();
  }
}

function toggleHide() {
  if (searchWindow.isVisible() && searchWindow.isFocused()) {
    hide();
  } else {
    //check where to position the searchWindow
    const bounds = calculatePositionAndSize();  
    if (bounds.screenWidth != screenBounds.screenWidth || bounds.screenHeight != screenBounds.screenHeight || bounds.x != screenBounds.x) {
      // reposition, needed because of external screen(s) might be (un)plugged
      searchWindow.setPosition(bounds.x, bounds.y, false);
      screenBounds = bounds;
    }

    //show and focus the searchWindow
    searchWindow.show();
    searchWindow.focus();
  }
}

function toggleHideOrCreate() {
  if (searchWindow) {
    toggleHide();
  } else {
    createSearchWindow();
  }
}

function setupAutoLauncher() {
  if(!isDevelopment()) {
    // Start Cuely on computer restart
    let appPath = app.getPath('exe').split('.app/Content')[0] + '.app';
    const cuelyAutoLauncher = new AutoLaunch({
      name: 'Cuely',
      isHidden: true,
      path: appPath
    });

    cuelyAutoLauncher.isEnabled().then(function(isEnabled){
      if(isEnabled){
        return;
      } else {
        cuelyAutoLauncher.enable();
      }
    });
  }
}

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Cuely Update',
    message: 'New Cuely Update is now available.',
    detail: 'New version has been successfully downloaded. The app will now close, install the new version and reopen.',
    buttons: ['Ok']
  });
  autoUpdater.quitAndInstall();
});

autoUpdater.on('update-not-available', () => {
  if (updateManual) {
    updateManual = false;
    dialog.showMessageBox({
      type: 'info',
      title: 'Cuely Update',
      message: 'There are no new updates',
      detail: 'You have the latest Cuely app installed.',
      buttons: ['Ok']
    });
  } else {
    console.log('There are no new updates.');
  }
});

autoUpdater.on('update-available', () => {
  sendDesktopNotification('New Cuely update available', 'A new version of Cuely app is being downloaded');
});

function manualCheckForUpdates() {
  updateManual = true;
  checkForUpdates();
}

function checkForUpdates() {
  if (!isDevelopment()) {
    autoUpdater.setFeedURL(UPDATE_FEED_URL + '/?v=' + appVersion);
    autoUpdater.checkForUpdates();
  }
}

function resetSession() {
  //check if sessionInterval is set and is currently active otherwise start a new session
  if (sessionInterval && !sessionInterval._called) {
    clearInterval(sessionInterval);
  } else {
    if (segment) {
      segment.track('Session', {});
    }
  }

  sessionInterval = setInterval(endSession, sessionLength);
}

function endSession() {
  const target = searchWindow || loginWindow;
  
  if (target) {
    target.webContents.send('end-session');
    clearInterval(sessionInterval);
  }
}
