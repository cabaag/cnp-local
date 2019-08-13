import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Room } from 'src/app/interfaces/room';
import { IpcService } from 'src/app/services/ipc.service';

@Component({
  selector: 'app-room',
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.sass']
})
export class RoomComponent {
  @Input() room: Room;
  @Input() disabled: boolean;
  @Input() waiting: boolean;
  @Output() commandSend = new EventEmitter();

  constructor(private ipc: IpcService) {}

  update(room: Room) {
    room.value = !room.value;
    room.emitter = 'local';
    this.ipc.send('serialport:command:send', {
      room
    });
    this.commandSend.emit(true);
  }
}
