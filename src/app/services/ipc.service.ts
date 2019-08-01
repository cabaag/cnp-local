import { Injectable } from '@angular/core';
import { IpcRenderer, IpcRendererEvent } from 'electron';
import { ElectronService } from 'ngx-electron';

@Injectable({
  providedIn: 'root'
})
export class IpcService {
  private _ipc: IpcRenderer | undefined;

  constructor(private electronService: ElectronService) {}

  public on(channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void): IpcRenderer {
    if (this.electronService.isElectronApp) {
      return this.electronService.ipcRenderer.on(channel, listener);
    }
  }

  public send(channel: string, ...args): void {
    if (this.electronService.isElectronApp) {
      this.electronService.ipcRenderer.send(channel, args);
    }
  }
}
