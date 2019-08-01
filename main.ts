import { app, BrowserWindow, ipcMain, IpcMainEvent } from 'electron';
import * as path from 'path';
import * as url from 'url';
import * as SerialPort from 'serialport';

let port: SerialPort;

let mainWindow: BrowserWindow;
let serve;
let retryConnection = 0;
const argsRoot = process.argv.slice(1);
serve = argsRoot.some(val => val === '--serve');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: { nodeIntegration: true, webSecurity: false }
  });

  if (serve) {
    require('electron-reload')(__dirname, {
      electron: require(`${__dirname}/node_modules/electron`)
    });
    mainWindow.loadURL('http://localhost:4200');
  } else {
    mainWindow.loadURL(
      url.format({
        pathname: path.join(__dirname, './dist/index.html'),
        protocol: 'file:',
        slashes: true
      })
    );
  }
  // Open the DevTools.
  mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (port) {
      port.close();
    }
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

ipcMain.on('serialport:port:connect', (event: IpcMainEvent, args) => {
  const comName = args[0];
  retryConnection = 0;
  openPort(comName, event);
});

ipcMain.on('serialport:port:close', (event: IpcMainEvent, args) => {
  port.close(err => {
    event.reply('serialport:port:closed');
  });
});

ipcMain.on('serialport:list:action', event => {
  SerialPort.list().then(ports => {
    event.reply('serialport:list:result', {
      ports
    });
  });
});

ipcMain.on('serialport:command:send', (event, args: [{ room: any }]) => {
  const room = args[0].room;
  const active = room.value ? 1 : 0;

  const command = `at+txc=1,1000,${room.node}0000000${active}\r\n`;
  if (port) {
    port.write(command);
  }
  event.reply('serialport:command:result', room);
});

function openPort(comName: string, event: IpcMainEvent) {
  retryConnection++;
  console.log('retry', retryConnection);
  port = new SerialPort(comName, {
    baudRate: 115200
  })
    .on('open', () => {
      console.log(`[${comName}]: opened`);
      port.set({
        dtr: true,
        dsr: true
      });
      event.reply('serialport:port:open', comName);
    })
    .on('data', data => {
      // console.log(`[${comName}]: data: ${Buffer.from(data).toString()}`);
    })
    .on('error', (err: Error) => {
      console.log('err', err);
      if (port.isOpen) {
        port.close();
      }
      if (err.message.includes('Error Resource temporarily unavailable') && retryConnection < 3) {
        openPort(comName, event);
      }
      process.exit();
    });
}
