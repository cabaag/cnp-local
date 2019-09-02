"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var electron_1 = require("electron");
var path = require("path");
var url = require("url");
var SerialPort = require("serialport");
var XLSX = require("xlsx");
var port;
var mainWindow;
var serve;
var retryConnection = 0;
var argsRoot = process.argv.slice(1);
serve = argsRoot.some(function (val) { return val === '--serve'; });
var intervalCommands = 700;
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
    var pathPort = args[0];
    retryConnection = 0;
    openPort(pathPort, event);
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
electron_1.ipcMain.on('serialport:command:turnOnAll', function (event) {
    console.log('Turn on all');
    var command = "at+txc=1,1000,FF00000001\r\n";
    if (!!port) {
        port.write(command);
        setTimeout(function () {
            console.log('Returning on all');
            mainWindow.webContents.send('serialport:command:result', null);
        }, intervalCommands);
    }
});
electron_1.ipcMain.on('serialport:command:turnOffAll', function (event) {
    var command = "at+txc=1,1000,FF00000000\r\n";
    if (!!port) {
        port.write(command);
        setTimeout(function () {
            console.log('Returning off all');
            mainWindow.webContents.send('serialport:command:result', null);
        }, intervalCommands);
    }
});
electron_1.ipcMain.on('serialport:command:sendNoReturn', function (event, args) {
    console.log('no return');
    var room = args[0].room;
    var active = room.value ? 1 : 0;
    var command = "at+txc=1,1000," + room.node + "0000000" + active + "\r\n";
    if (!!port) {
        port.write(command);
        console.log('drain');
    }
});
electron_1.ipcMain.on('serialport:command:send', function (event, args) {
    var room = args[0].room;
    var active = room.value ? 1 : 0;
    var command = "at+txc=1,1000," + room.node + "0000000" + active + "\r\n";
    if (!!port) {
        port.write(command);
        setTimeout(function () {
            console.log('return', room.name);
            event.reply('serialport:command:result', room);
        }, intervalCommands);
    }
});
electron_1.ipcMain.on('utils:downloadHistory', function (event, args) { return __awaiter(_this, void 0, void 0, function () {
    var data, parsed, XTENSION, ws, wb, file;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                data = args[0];
                parsed = data.map(function (d) { return [
                    d.date,
                    d.value.toFixed(2)
                ]; });
                XTENSION = 'xls|xlsx|xlsm|xlsb|xml|csv'.split('|');
                ws = XLSX.utils.aoa_to_sheet([['Fecha']['Descarga(Mb)']].concat(parsed));
                wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Historial');
                return [4 /*yield*/, electron_1.dialog.showSaveDialog({
                        title: 'Guardar historial',
                        filters: [{
                                name: 'Spreadsheets',
                                extensions: XTENSION
                            }]
                    })];
            case 1:
                file = _a.sent();
                XLSX.writeFile(wb, file.filePath);
                return [4 /*yield*/, electron_1.dialog.showMessageBox({ message: 'Historial guardado', buttons: ['OK'] })];
            case 2:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
function openPort(pathPort, event) {
    retryConnection++;
    port = new SerialPort(pathPort, {
        baudRate: 115200,
        lock: false
    })
        .on('open', function () {
        console.log("[" + pathPort + "]: opened");
        port.set({
            dtr: true,
            dsr: true
        });
        event.reply('serialport:port:open', pathPort);
    })
        .on('data', function (data) {
        // console.log(`[${comName}]: data: ${Buffer.from(data).toString()}, ${Date.now()}`);
        var message = Buffer.from(data).toString();
        if (message.includes('Welcome to RAK811')) {
            mainWindow.webContents.send('serialport:port:welcome');
            port.drain();
        }
    })
        .on('error', function (err) {
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
//# sourceMappingURL=main.js.map