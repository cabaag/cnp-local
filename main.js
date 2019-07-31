// Modules to control application life and create native browser window
const {
  app,
  BrowserWindow
} = require('electron')
const path = require('path')
const SerialPort = require('serialport');
const {
  ipcMain
} = require('electron');
const url = require('url')

let portName = '/dev/cu.SLAB_USBtoUART';
let command = 'at+txc=1,1000,FF00000000\r\n';
let port;

let mainWindow


function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  })


  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, 'dist/cnp/index.html'),
      protocol: 'file:',
      slashes: true,
    })
  )
  // Open the DevTools.
  mainWindow.webContents.openDevTools()

  mainWindow.on('closed', () => {
    mainWindow = null
    port.close();
  });

  initLora();
}

app.on('ready', createWindow)

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
  if (mainWindow === null) createWindow()
})

function initLora() {
  port = new SerialPort(portName, {
      baudRate: 115200
    })
    .on('open', () => {
      console.log(`[${portName}]: open`);
      port.set({
        dtr: true,
        dsr: true
      });
      sendCommand();
    })
    .on('data', data => {
      console.log(`[${portName}]: data: ${Buffer.from(data).toString()}`);
    })
    .on('error', err => {
      console.log(`[${portName}]: ${err}`);
      process.exit();
    });
}

function listPorts() {
  SerialPort.list().then(ports => {
    ipcMain.emit('serialport:list:result', {
      ports
    });
  });
}

function sendCommand() {
  port.write(command);
}

ipcMain.on('serialport:list:action', (event, arg) => {
  listPorts();
});

ipcMain.on('serialport:command:send', (event, arg) => {
  console.log(event);
  console.log(arg);
  sendCommand();
  ipcMain.emit('serialport:command:result', {
    ports: {
      a: 'asa'
    }
  });
});
