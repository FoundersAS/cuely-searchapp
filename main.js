import electron, { ipcMain } from 'electron';
import { search } from './src/external/intra';

const { app, BrowserWindow, Tray, globalShortcut} = electron;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  const p = process.platform;
  const imageDir = __dirname + '/assets/images';

  let trayImage;
  if (p === 'darwin') {
    trayImage = imageDir + '/osx/cuelyTemplate.png';
  } else if (p === 'win32') {
    trayImage = imageDir + '/win/cuely.ico';
  }

  // init tray
  const tray = new Tray(trayImage);
  tray.setToolTip('Cuely search')
  if (p === 'darwin') {
    tray.setPressedImage(imageDir + '/osx/cuelyHighlight.png');
  }
  tray.on('click', () => {
    toggleHideOrCreate();
  });
  // init global shortcut
  const ret = globalShortcut.register('CommandOrControl+Backspace', () => {
    toggleHideOrCreate();
  })

  console.log(ret ? 'Registered global shurtcut' : 'Could not register global shortcut');
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

// ipc communication
ipcMain.on('hide-search', () => {
  toggleHide();
});

ipcMain.on('search', (event, arg) => {
  search(arg).then(hits => {
    event.sender.send('searchResult', hits);
  });
});

ipcMain.on('search_rendered', (event, arg) => {
  // Resize the window after search results have been rendered to html/dom, due to weird GUI artifacts
  // when resizing elements, e.g. <ul> component. Probably happens because of frameless and transparent window.
  mainWindow.setSize(mainWindow.getSize()[0], arg.height + (arg.height < 80 ? 2 : 50), false);
});

//----------- UTILITY FUNCTIONS
function getScreenProps() {
  const {width, height} = electron.screen.getPrimaryDisplay().workAreaSize;
  return {
    width: width,
    height: height,
    center: { x: Math.round(width/2), y: Math.round(height/2) },
  };
}

function createWindow() {
  // Create the browser window.
  const screen = getScreenProps();
  // try to account for small and big screens
  const w = Math.min(600, Math.max(900, screen.width / 3));
  mainWindow = new BrowserWindow({
    width: w,
    height: 100,
    x: screen.center.x - (w / 2),
    y: Math.min(200, Math.max(400, screen.center.y / 2)),
    transparent: true,
    frame: false,
    show: false,
  });

  // and load the index.html of the app.
  mainWindow.loadURL(`file://${__dirname}/index.html`);

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
  mainWindow.on('hide', () => {
    mainWindow.webContents.send('clear');
  });
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
};

function toggleHide() {
  if (mainWindow.isVisible()) {
    mainWindow.hide();
    if (process.platform === 'darwin') {
      app.hide();
    }
  } else {
    mainWindow.show();
  }
}

function toggleHideOrCreate() {
  if (mainWindow) {
    toggleHide();
  } else {
    createWindow();
  }
}
