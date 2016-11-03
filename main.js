import electron, { ipcMain, session } from 'electron';
import { search as searchAlgolia, setAlgoliaCredentials } from './src/util/search';
import { getAlgoliaCredentials, getSyncStatus, startSync, setSegmentStatus } from './src/util/util.js';
import { API_ROOT, isDevelopment } from './src/util/const.js';
import { initPrefs } from './src/util/prefs.js';
import { initSegment } from './src/util/segment.js';
import AutoLaunch from 'auto-launch';

const { app, dialog, BrowserWindow, Menu, MenuItem, Tray, globalShortcut } = electron;

let newKeywords = [
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

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let searchWindow;
let loginWindow;
let settingsWindow;
let tray;

let credentials;
let appHide = true;
let screenBounds;
let syncPollerTimeouts = {};
let prefs;
let segment;

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  const appPath = app.getPath('userData');
  prefs = initPrefs(appPath);
  buildMenu();
  setupAutoLauncher();
  loadCredentialsOrLogin();
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('activate', () => {
  if (searchWindow) {
    searchWindow.show();
  }
});

// ipc communication
ipcMain.on('hide-search', () => {
  app.hide();
});

ipcMain.on('log', (event, arg) => {
  
});

ipcMain.on('search', (event, arg) => {
  let q = (arg === '') ? prefs.settings.account.name : arg;
  searchAlgolia(q).then(result => {
    let hits = [].concat.apply([], result);

    const newItemType = getNewKeywordType(arg);
    if (newItemType){
      hits.unshift(getNewItem(newItemType));
    }
    event.sender.send('search-result', hits);
  });
});

ipcMain.on('search-rendered', (event, arg) => {
  // Resize the window after search results have been rendered to html/dom, due to weird GUI artifacts
  // when resizing elements, e.g. <ul> component. Probably happens because of frameless and transparent window.
  if (searchWindow.getSize()[1] !== arg.height) {
    searchWindow.setSize(searchWindow.getSize()[0], 477, false);
  }
});

ipcMain.on('close-login', () => {
  loginWindow.hide();
  loadCredentialsOrLogin();
});

ipcMain.on('close-settings', () => {
  settingsWindow.close();
});

ipcMain.on('send-notification', (event, arg) => {
  sendDesktopNotification(arg.title, arg.body);
});

ipcMain.on('logout', (event, arg) => {
  session.defaultSession.clearStorageData({origin: API_ROOT});
  createLoginWindow();
  settingsWindow.close();
});

ipcMain.on('account', (event, arg) => {
  createLoginWindow();
  settingsWindow.close();
});

ipcMain.on('settings-load', (event, arg) => {
  event.sender.send('settings-result', prefs.getAll());
});

ipcMain.on('settings-save', (event, settings) => {
  prefs.saveAll(settings);
  sendDesktopNotification('Settings saved ✓', 'Cuely has successfully saved new settings');
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
});

ipcMain.on('track', (event, arg) => {
  segment.track(arg.name, arg.props);
});

//----------- UTILITY FUNCTIONS
function sendSyncDone(integrationName) {
  sendDesktopNotification('Synchronization complete ✓', 'Cuely has finished indexing your ' + integrationName);
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
        { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" }
      ]}
    ];
    menu = Menu.buildFromTemplate(template);
  }
  Menu.setApplicationMenu(menu);
}

function customMenuItems() {
  return [
    { label: "Preferences...", accelerator: "Command+,", click: () => { createSettingsWindow(); }},
  ];
}

function getScreenProps() {
  const {width, height} = electron.screen.getPrimaryDisplay().workAreaSize;
  return {
    width: width,
    height: height,
    center: { x: Math.round(width/2), y: Math.round(height/2) },
  };
}

function calculatePositionAndSize() {
  const screen = getScreenProps();
  // try to account for small and big screens
  // const w = Math.round(Math.max(800, Math.min(1000, screen.width / 3)));
  const w = 816;
  return {
    width: w,
    height: 477,
    x: Math.round(screen.center.x - (w / 2)),
    y: Math.round(screen.center.y / 2),
    screenWidth: screen.width,
    screenHeight: screen.height
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
    transparent: true,
    frame: false,
    show: false,
    enableLargerThanScreen: true,
    shadow: true,
    resizable: false
  });

  // and load the index.html of the app.
  searchWindow.loadURL(`file://${__dirname}/index.html?route=app`);

  // Emitted when the window is closed.
  searchWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    searchWindow.removeAllListeners();
    searchWindow = null;
  });
  searchWindow.on('show', () => {
    searchWindow.webContents.send('focus-element', '#searchBar');
    const bounds = calculatePositionAndSize();
    if (bounds.screenWidth != screenBounds.screenWidth || bounds.screenHeight != screenBounds.screenHeight) {
      // reposition, needed because of external screen(s) might be (un)plugged
      searchWindow.setPosition(bounds.x, bounds.y, false);
      screenBounds = bounds;
    }
  });
  searchWindow.on('blur', () => {
    hide();
  });
};

function createLoginWindow() {
  appHide = false;
  if (loginWindow) {
    loginWindow.show();
    return;
  }

  // Create the browser window.
  loginWindow = new BrowserWindow({
    width: 800,
    height: 730,
    center: true
  });

  // remove 'x-frame-options' header to allow embedding external pages into 'iframe'
  // also, capture possible redirects for completing various oauth flows
  loginWindow.webContents.session.webRequest.onHeadersReceived({}, (details, callback) => {
    for (let header in details.responseHeaders) {
      if (header.toLowerCase() === 'x-frame-options') {
        delete details.responseHeaders[header];
      }
    }
    const urlNoParams = details.url.split('?')[0];
    if (urlNoParams.indexOf('complete/google-oauth2/') > -1) {
      startSyncPoller('google-oauth2', 'Google Drive');
    }
    if (urlNoParams.indexOf('complete/intercom-oauth/') > -1) {
      startSyncPoller('intercom-oauth', 'Intercom account');
    }
    if (urlNoParams.indexOf('complete/intercom-apikeys/') > -1) {
      startSyncPoller('intercom-apikeys', 'Intercom account');
    }
    callback({ cancel: false, responseHeaders: details.responseHeaders });
  });

  loginWindow.loadURL(`file://${__dirname}/index.html?route=login`);

  // Emitted when the window is closed.
  loginWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    loginWindow = null;
  });
}

function createSettingsWindow() {
  appHide = false;
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

  // Emitted when the window is closed.
  settingsWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    settingsWindow = null;
  });
}

function loadCredentialsOrLogin() {
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
              segmentIdentified: response.segmentIdentified
            }
            prefs.saveAll(settings);
            if (settings.showTrayIcon) {
              loadTray();
            }
            if (!settings.showDockIcon) {
              app.dock.hide();
            }

            // init segment
            segment = initSegment(response.segmentKey);
            const identified = segment.identify();
            if (identified) {
              setSegmentStatus(csrf, sessionId, identified);
            }

            endLogin();
          } else {
            createLoginWindow();
          }
          return;
        }
        dialog.showMessageBox({
          type: 'error',
          title: 'Cuely app',
          message: 'Could not connect to Cuely backend. Please check your network connection and then try running the app again.',
          detail: error.text + '\n' + error.stack,
          buttons: ['Ok']
        }, () => {
          if (!isDevelopment()) {
            app.quit();
          }
        });
      }).catch(err => {
        console.log(err);
      });
    } else {
      createLoginWindow();
    }
  });
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
          if (syncing && !response.in_progress) {
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
  }, 5000);

  useAuthCookies((csrf, sessionId) => {
    if (csrf && sessionId) {
      startSync(csrf, sessionId, type);
    }
  });
  loadCredentialsOrLogin();

  if (loginWindow) {
    loginWindow.hide();
  }
  dialog.showMessageBox({
    type: 'info',
    title: 'Cuely app',
    message: `Cuely has started to sync with your ${integrationName}. You will receive a notification once it's done.`,
    detail: "You may start searching already now using Cmd + Backspace. The results will depend on how much data has been synced so far.",
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
  if (p === 'darwin') {
    trayImage = imageDir + '/osx/cuelyTemplate.png';
    // app.dock.hide(); // hides the app from the dock and cmd+tab list
  } else if (p === 'win32') {
    trayImage = imageDir + '/win/cuely.ico';
  }

  // init tray
  tray = new Tray(trayImage);
  tray.setToolTip('Cuely search')
  tray.on('click', (event, bounds) => {
    if (searchWindow && !(loginWindow && loginWindow.isVisible())) {
      toggleHide();
    }
  });
  if (p === 'darwin') {
    tray.setPressedImage(imageDir + '/osx/cuelyHighlight.png');
  }
}

function endLogin() {
  updateGlobalShortcut();

  if (!searchWindow) {
    createSearchWindow();
  }
  if (loginWindow) {
    loginWindow.close();
  }
}

function updateGlobalShortcut() {
  const shortcut = prefs.getAll().globalShortcut;
  if (!globalShortcut.isRegistered(shortcut)) {
    globalShortcut.unregisterAll();
    const ret = globalShortcut.register(shortcut, () => {
      toggleHideOrCreate();
    })

    console.log(ret ? `Registered global shurtcut <${shortcut}>` : `Could not register global shortcut <${shortcut}>`);
  }
}

function getNewKeywordType(arg){
  const words = arg.split('new ');
  if (words.length < 2){
    return null;
  }
  else {
    for (let item of newKeywords){
      for (let keyword of item.keywords){
        if (keyword.indexOf(words[1].trim()) != -1){
          const domain = prefs.settings.account.email.split('@')[1];
          item.link = item.link.replace('your.domain.com', domain);

          return item;
        }
      }
    }
    return null;
  }
}

function getNewItem(item){
  const newItem = {
    type: item.type,
    mime: item.mime,
    title: item.title,
    titleRaw: null,
    content: null,
    metaInfo: null,
    displayIcon: null,
    webLink: item.link,
    thumbnailLink: null,
    modified: null,
    _algolia: null
  }

  return newItem;
}

function hide() {
  if (appHide && process.platform === 'darwin') {
    app.hide();
  } else {
    searchWindow.hide();
  }

  if (!appHide) {
    appHide = true;
  }
}

function toggleHide() {
  if (searchWindow.isVisible() && searchWindow.isFocused()) {
    hide();
  } else {
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
    const cuelyAutoLauncher = new AutoLaunch({
      name: 'Cuely',
      isHidden: true
    });

    cuelyAutoLauncher.enable();
  }
}
