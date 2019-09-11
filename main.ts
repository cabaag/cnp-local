import {app, BrowserWindow, dialog, ipcMain, IpcMainEvent} from 'electron';
import * as path from 'path';
import * as url from 'url';
import * as SerialPort from 'serialport';
import * as XLSX from 'xlsx';

let port: SerialPort;
let mainWindow: BrowserWindow;
let serve;
let retryConnection = 0;
const argsRoot = process.argv.slice(1);
serve = argsRoot.some(val => val === '--serve');
const intervalCommands = 900;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {nodeIntegration: true, webSecurity: false}
  });

  if (serve) {
    require('electron-reload')(__dirname, {
      electron: require(`${__dirname}/node_modules/electron`)
    });
    mainWindow.loadURL('http://localhost:4200');
    // Open the DevTools.
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL(
      url.format({
        pathname: path.join(__dirname, './dist/index.html'),
        protocol: 'file:',
        slashes: true
      })
    );
  }

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
  const pathPort = args[0];
  retryConnection = 0;
  openPort(pathPort, event);
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

ipcMain.on('serialport:command:turnOnAll', event => {
  console.log('Turn on all');
  const command = `at+txc=1,1000,FF00000001\r\n`;
  if (!!port) {
    port.write(command);
    setTimeout(() => {
      console.log('Returning on all');
      mainWindow.webContents.send('serialport:command:result', null);
    }, intervalCommands);
  }
});

ipcMain.on('serialport:command:turnOffAll', event => {
  const command = `at+txc=1,1000,FF00000000\r\n`;
  if (!!port) {
    port.write(command);
    setTimeout(() => {
      console.log('Returning off all');
      mainWindow.webContents.send('serialport:command:result', null);
    }, intervalCommands);
  }
});

ipcMain.on('serialport:command:sendNoReturn', (event, args: [{ room: any }]) => {
  console.log('no return');
  const room = args[0].room;
  const active = room.value ? 1 : 0;

  const command = `at+txc=1,1000,${room.node}0000000${active}\r\n`;

  if (!!port) {
    port.write(command);
    console.log('drain');
  }
});

ipcMain.on('serialport:command:send', (event, args: [{ room: any }]) => {
  const room = args[0].room;
  const active = room.value ? 1 : 0;

  const command = `at+txc=1,1000,${room.node}0000000${active}\r\n`;
  if (!!port) {
    port.write(command);
    setTimeout(() => {
      console.log('return', room.name);
      event.reply('serialport:command:result', room);
    }, intervalCommands);
  }
});

ipcMain.on('utils:downloadHistory', async (event, args: any) => {
  const data: [{
    date: string,
    value: number
  }] = args[0];
  const parsed = data.map(d => [
    d.date,
    d.value.toFixed(2)
  ]);

  const XTENSION = 'xls|xlsx|xlsm|xlsb|xml|csv'.split('|');

  const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet([['Fecha']['Descarga(Mb)'], ...parsed]);
  const wb: XLSX.WorkBook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Historial');

  /* show a file-save dialog and write the workbook */
  const file = await dialog.showSaveDialog({
    title: 'Guardar historial',
    filters: [{
      name: 'Spreadsheets',
      extensions: XTENSION
    }]
  });

  XLSX.writeFile(wb, file.filePath);
  await dialog.showMessageBox({message: 'Historial guardado', buttons: ['OK']});
});

function openPort(pathPort: string, event: IpcMainEvent) {
  retryConnection++;
  port = new SerialPort(pathPort, {
    baudRate: 115200,
    lock: false
  })
    .on('open', () => {
      console.log(`[${pathPort}]: opened`);
      port.set({
        dtr: true,
        dsr: true
      });
      event.reply('serialport:port:open', pathPort);
    })
    .on('data', data => {
      // console.log(`[${comName}]: data: ${Buffer.from(data).toString()}, ${Date.now()}`);
      const message = Buffer.from(data).toString();
      if (message.includes('Welcome to RAK811')) {
        mainWindow.webContents.send('serialport:port:welcome');
        port.drain();
      }
    })
    .on('error', (err: Error) => {
      console.log('err', err);
      if (port.isOpen) {
        port.close();
      }

      if (err.message.includes('Error Resource temporarily unavailable') && retryConnection < 3) {
        return openPort(pathPort, event);
      }

      if (err.message.includes('No such file or directory')) {
        return mainWindow.webContents.send('serialport:port:closed');
      }
      process.exit();
    });
}
