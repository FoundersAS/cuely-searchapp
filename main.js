import electron, { ipcMain } from 'electron';
import { search as searchIntra } from './src/external/intra';
import { search as searchGdrive } from './src/external/gdrive';

const { app, BrowserWindow, Tray, globalShortcut} = electron;
const searchCatalog = {
  // intra: searchIntra,
  gdrive: searchGdrive
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let tray;

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
  tray = new Tray(trayImage);
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
    const hits = [].concat.apply([], result).sort((a, b) => {
      // order in multiple steps: first based on algolia score (first matched word, typos count),
      // then on modified time
      if (a._algolia.nbTypos !== b._algolia.nbTypos) {
        return a._algolia.nbTypos - b._algolia.nbTypos;
      }
      if (a._algolia.firstMatchedWord !== b._algolia.firstMatchedWord) {
        return a._algolia.firstMatchedWord - b._algolia.firstMatchedWord;
      } else if (a._algolia.proximityDistance !== b._algolia.proximityDistance) {
        return a._algolia.proximityDistance - b._algolia.proximityDistance;
      }
      return new Date(b.modified) - new Date(a.modified);
    });
    event.sender.send('searchResult', hits);
  });
});

ipcMain.on('search_rendered', (event, arg) => {
  // Resize the window after search results have been rendered to html/dom, due to weird GUI artifacts
  // when resizing elements, e.g. <ul> component. Probably happens because of frameless and transparent window.
  mainWindow.setSize(mainWindow.getSize()[0], arg.height + (arg.height < 80 ? 0 : 50), false);
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

function calculatePositionAndSize() {
  const screen = getScreenProps();
  // try to account for small and big screens
  // const w = Math.round(Math.max(800, Math.min(1000, screen.width / 3)));
  const w = 800;
  return {
    width: w,
    height: 100,
    x: Math.round(screen.center.x - (w / 2)),
    y: Math.round(screen.center.y / 2)
  }
}

function createWindow() {
  // Create the browser window.
  const bounds = calculatePositionAndSize();
  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    transparent: true,
    frame: false,
    show: false,
    enableLargerThanScreen: true
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
  mainWindow.on('blur', () => {
    hide();
  });
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
  mainWindow.on('show', () => {
    // reposition, neede because of external screen(s) might be (un)plugged
    const bounds = calculatePositionAndSize();
    mainWindow.setPosition(bounds.x, bounds.y, false);
  });
};

function hide() {
  mainWindow.hide();
  if (process.platform === 'darwin') {
    app.hide();
  }
}

function toggleHide() {
  if (mainWindow.isVisible()) {
    hide();
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
