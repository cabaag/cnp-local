"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var electron_1 = require("electron");
var path = require("path");
var url = require("url");
var SerialPort = require("serialport");
var electron = require('electron');
var port;
console.log(electron_1.ipcRenderer);
var mainWindow;
var serve;
var retryConnection = 0;
var argsRoot = process.argv.slice(1);
serve = argsRoot.some(function (val) { return val === '--serve'; });
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: { nodeIntegration: true, webSecurity: false }
    });
    if (serve) {
        require('electron-reload')(__dirname, {
            electron: require(__dirname + "/node_modules/electron")
        });
        mainWindow.loadURL('http://localhost:4200');
        // Open the DevTools.
        mainWindow.webContents.openDevTools();
    }
    else {
        mainWindow.loadURL(url.format({
            pathname: path.join(__dirname, './dist/index.html'),
            protocol: 'file:',
            slashes: true
        }));
    }
    mainWindow.on('closed', function () {
        mainWindow = null;
        if (port) {
            port.close();
        }
    });
}
electron_1.app.on('ready', createWindow);
electron_1.app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
});
electron_1.ipcMain.on('serialport:port:connect', function (event, args) {
    var comName = args[0];
    retryConnection = 0;
    openPort(comName, event);
});
electron_1.ipcMain.on('serialport:port:close', function (event, args) {
    port.close(function (err) {
        event.reply('serialport:port:closed');
    });
});
electron_1.ipcMain.on('serialport:list:action', function (event) {
    SerialPort.list().then(function (ports) {
        event.reply('serialport:list:result', {
            ports: ports
        });
    });
});
electron_1.ipcMain.on('serialport:command:turnOnAll', function () {
    var command = "at+txc=1,1000,FF00000001\r\n";
    if (!!port) {
        port.write(command);
    }
});
electron_1.ipcMain.on('serialport:command:turnOffAll', function () {
    var command = "at+txc=1,1000,FF00000000\r\n";
    if (!!port) {
        port.write(command);
    }
});
electron_1.ipcMain.on('serialport:command:send', function (event, args) {
    var room = args[0].room;
    var active = room.value ? 1 : 0;
    var command = "at+txc=1,1000," + room.node + "0000000" + active + "\r\n";
    if (!!port) {
        port.write(command);
    }
    event.reply('serialport:command:result', room);
});
function openPort(comName, event) {
    retryConnection++;
    port = new SerialPort(comName, {
        baudRate: 115200,
        lock: false
    })
        .on('open', function () {
        console.log("[" + comName + "]: opened");
        port.set({
            dtr: true,
            dsr: true
        });
        event.reply('serialport:port:open', comName);
    })
        .on('data', function (data) {
        var message = Buffer.from(data).toString();
        if (message.includes('Welcome to RAK811')) {
            mainWindow.webContents.send('serialport:port:welcome');
        }
        console.log("[" + comName + "]: data: " + Buffer.from(data).toString());
    })
        .on('error', function (err) {
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
//# sourceMappingURL=main.js.map