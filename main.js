import electron, { ipcMain, session } from 'electron';
import { search as searchGdrive, setAlgoliaCredentials } from './src/external/gdrive';
import { getAlgoliaCredentials } from './src/util.js';
import { API_ROOT, isDevelopment } from './src/const.js';

const { app, dialog, BrowserWindow, Menu, MenuItem, Tray, globalShortcut} = electron;

const searchCatalog = {
  // intra: searchIntra,
  gdrive: searchGdrive
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let searchWindow;
let loginWindow;
let tray;

let credentials;
let appHide = true;
let screenBounds;

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  buildMenu();
  loadCredentialsOrLogin();
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// ipc communication
ipcMain.on('hide-search', () => {
  toggleHide();
});


ipcMain.on('log', (event, arg) => {
  console.log(arg);
});

ipcMain.on('search', (event, arg) => {
  let searchers = [];
  let q = arg;
  if (arg.indexOf(' ') > -1) {
    const words = arg.split(' ');
    const searcher = words[0];
    const query = words.slice(1).join(' ');
    if (searcher in searchCatalog && query.trim()) {
      searchers.push(searchCatalog[searcher]);
      q = query;
    }
  }
  if (searchers.length < 1) {
    searchers = Object.keys(searchCatalog).map(key => searchCatalog[key]);
  }
  Promise.all(searchers.map(search => search(q))).then(result => {
    const hits = [].concat.apply([], result);
    event.sender.send('searchResult', hits);
  });
});

ipcMain.on('search_rendered', (event, arg) => {
  // Resize the window after search results have been rendered to html/dom, due to weird GUI artifacts
  // when resizing elements, e.g. <ul> component. Probably happens because of frameless and transparent window.
  if (searchWindow.getSize()[1] !== arg.height) {
    searchWindow.setSize(searchWindow.getSize()[0], arg.height, false);
  }
});

ipcMain.on('close_login', () => {
  loginWindow.hide();
  loadCredentialsOrLogin();
});

//----------- UTILITY FUNCTIONS
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
        { label: "Quit", accelerator: "Command+Q", click: function() { app.quit(); }}
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
    { label: "Preferences...", accelerator: "Command+,", click: function() { createLoginWindow(); }},
    { label: "Clear cookies", click: () => {
        session.defaultSession.clearStorageData({origin: API_ROOT});
        createLoginWindow();
      }
    }
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
  const w = 800;
  return {
    width: w,
    height: 62,
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
    shadow: true
  });

  // and load the index.html of the app.
  searchWindow.loadURL(`file://${__dirname}/index.html`);

  // Emitted when the window is closed.
  searchWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    searchWindow.removeAllListeners();
    searchWindow = null;
  });
  searchWindow.on('hide', () => {
    searchWindow.webContents.send('clear');
  });
  searchWindow.on('blur', () => {
    if (!isDevelopment()) {
      hide();
    }
  });
  searchWindow.on('show', () => {
    const bounds = calculatePositionAndSize();
    if (bounds.screenWidth != screenBounds.screenWidth || bounds.screenHeight != screenBounds.screenHeight) {
      // reposition, needed because of external screen(s) might be (un)plugged
      searchWindow.setPosition(bounds.x, bounds.y, false);
      screenBounds = bounds;
    }
  });
};

function createLoginWindow() {
  appHide = false;
  if (loginWindow) {
    loginWindow.show();
    return;
  }

  // Create the browser window.
  const bounds = calculatePositionAndSize();
  loginWindow = new BrowserWindow({
    width: 800,
    height: 800,
    center: true
  });

  // remove 'x-frame-options' header to allow embedding external pages into 'iframe'
  const onHeadersReceived = (d, c) => {
    if(d.responseHeaders['x-frame-options']){
        delete d.responseHeaders['x-frame-options'];
    }
    c({cancel: false, responseHeaders: d.responseHeaders});
  }
  loginWindow.webContents.session.webRequest.onHeadersReceived({}, onHeadersReceived);

  // capture redirects to reload our own index.html
  let oauthSuccess = false;
  loginWindow.webContents.on('will-navigate', (event, url) => {
    if (url.indexOf('complete/google-oauth2/?state') > -1) {
      oauthSuccess = true;
    }
  });

  loginWindow.webContents.on('did-navigate', (event, url) => {
    if (oauthSuccess && url.endsWith('/home/#')) {
      oauthSuccess = false;
      event.preventDefault();
      loginWindow.loadURL(`file://${__dirname}/index.html?login=true`);
    }
  });

  loginWindow.loadURL(`file://${__dirname}/index.html?login=true`);

  // Emitted when the window is closed.
  loginWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    loginWindow = null;
  });
}

function loadCredentialsOrLogin() {
  loadTray();
  session.defaultSession.cookies.get({ url: API_ROOT }, (error, cookies) => {
    let csrfToken = cookies.filter(c => c.name === 'csrftoken');
    let sessionId = cookies.filter(c => c.name === 'sessionid');
    if (csrfToken.length > 0 && sessionId.length > 0) {
      getAlgoliaCredentials(csrfToken[0].value, sessionId[0].value).then(([response, error]) => {
        if (response) {
          if (response.appId) {
            setAlgoliaCredentials(response);
            loginSuccess();
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
          app.quit();
        });
      });
    } else {
      createLoginWindow();
    }
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
    if (!(loginWindow && loginWindow.isVisible())) {
      toggleHide();
    }
  });
  if (p === 'darwin') {
    tray.setPressedImage(imageDir + '/osx/cuelyHighlight.png');
  }
}

function loginSuccess() {
  // init global shortcut
  const ret = globalShortcut.register('CommandOrControl+Backspace', () => {
    toggleHideOrCreate();
  })

  console.log(ret ? 'Registered global shurtcut' : 'Could not register global shortcut');
  if (!searchWindow) {
    createSearchWindow();
  }
  if (loginWindow) {
    loginWindow.close();
  }
}

function hide() {
  searchWindow.hide();
  if (appHide && process.platform === 'darwin') {
    app.hide();
  }
  if (!appHide) {
    appHide = true;
  }
}

function toggleHide() {
  if (searchWindow.isVisible()) {
    hide();
  } else {
    searchWindow.show();
  }
}

function toggleHideOrCreate() {
  if (searchWindow) {
    toggleHide();
  } else {
    createSearchWindow();
  }
}
