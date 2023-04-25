// index.js file
const { app, BrowserWindow } = require('electron');
const path = require('path');
const appLogs = require('electron-log');

// Disable console logging
appLogs.transports.console.level = false;

// Add file transport to log to a file
appLogs.transports.file.level = 'debug';
appLogs.transports.file.format = '{h}:{i}:{s}:{ms} {text}';
appLogs.transports.file.maxSize = 5 * 1024 * 1024;
appLogs.transports.file.file = `${app.getPath('userData')}/myapp.log`;

// Log an error message
appLogs.error('An error occurred!');
// Declare a global variable to store the window object
let mainWindow;

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'loginpage.html'));

  // Open the DevTools.
  //mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Expose the mainWindow object to other files
module.exports = { mainWindow };
