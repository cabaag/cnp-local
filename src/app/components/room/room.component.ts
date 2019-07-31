import { AngularFirestore } from '@angular/fire/firestore';
import { Component, OnInit, Input } from '@angular/core';
import { Room } from 'src/app/interfaces/room';
import { IpcService } from 'src/app/services/ipc.service';

@Component({
  selector: 'app-room',
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.sass']
})
export class RoomComponent {
  @Input() room: Room;
  constructor(private afs: AngularFirestore, private ipc: IpcService) {}

  update(room: Room) {
    room.value = !room.value;
    this.ipc.send('serialport:command:send', {
      room
    });
  }
}
