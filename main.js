import electron, { ipcMain } from 'electron';
import { search } from './src/external/intra';

const { app, BrowserWindow } = electron;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

function getScreenCenter() {
  const {width, height} = electron.screen.getPrimaryDisplay().workAreaSize;
  return {x: Math.round(width/2), y: Math.round(height/2)};
}

function createWindow () {
  const center = getScreenCenter();
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 800,
    x: center.x - 400,
    y: Math.round(center.y/2),
    transparent: true,
    frame: false,
    show: false,
  });

  // and load the index.html of the app.
  mainWindow.loadURL(`file://${__dirname}/index.html`);

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

// ipc communication
ipcMain.on('quit', () => {
  app.quit();
});

ipcMain.on('search', (event, arg) => {
  event.sender.send('searchResult', search(arg));
});

ipcMain.on('search_rendered', (event, arg) => {
  // Resize the window as well, due to weird GUI artifacts when resizing <ul> component
  // (probably because of frameless transparent window).
  mainWindow.setSize(mainWindow.getSize()[0], arg.height + 50, false);
});
