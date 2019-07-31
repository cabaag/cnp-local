import { LocalStorageService } from 'ngx-webstorage';
import { Component, OnInit, Input, NgZone } from '@angular/core';
import { Port } from 'src/app/interfaces/port';
import { IpcService } from 'src/app/services/ipc.service';

@Component({
  selector: 'app-port',
  templateUrl: './port.component.html',
  styleUrls: ['./port.component.sass']
})
export class PortComponent implements OnInit {
  @Input() port: Port;

  constructor(private ipc: IpcService, private ngZone: NgZone, private storage: LocalStorageService) {}

  ngOnInit() {}

  connect() {
    this.ipc.send('serialport:port:connect', this.port.comName);
    this.storage.store('port', this.port.comName);
  }
}
