import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/firestore';
import { Component, NgZone, OnDestroy, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { IpcService } from './services/ipc.service';
import { map, takeWhile, take } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { Port } from './interfaces/port';
import { Room } from './interfaces/room';
import { LocalStorageService } from 'ngx-webstorage';
import { MatSnackBar } from '@angular/material';

const intervalCommands = 700;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.sass'],
  changeDetection: ChangeDetectionStrategy.Default
})
export class AppComponent implements OnInit, OnDestroy {
  ports: Port[];
  private alive = true;
  roomsCollection: AngularFirestoreCollection;
  roomsObs: Observable<Room[]>;
  rooms: Room[];
  selectedPort: string;
  loraMode = false;
  waitingResponse = false;
  index = 0;

  constructor(
    private readonly ipc: IpcService,
    private ngZone: NgZone,
    private firestore: AngularFirestore,
    private storage: LocalStorageService,
    private cdr: ChangeDetectorRef,
    private matSnackbar: MatSnackBar
  ) {
    this.selectedPort = this.storage.retrieve('port');
    if (this.selectedPort) {
      this.ipc.send('serialport:port:connect', this.selectedPort);
    }

    this.roomsCollection = this.firestore.collection<Room>('rooms');
    this.roomsObs = this.roomsCollection.snapshotChanges(['added', 'modified']).pipe(
      takeWhile(() => this.alive),
      map(actions =>
        actions.map(a => {
          const data = a.payload.doc.data() as Room;
          const id = a.payload.doc.id;
          const room = { id, ...data };

          if (a.type === 'modified' && room.emitter === 'web') {
            // Si el valor modificado es diferente al anterior, cambia el estado
            if (this.rooms.find(r => r.id === id).value !== room.value) {
              console.log(room, Date.now());
              this.ipc.send('serialport:command:sendNoReturn', {
                room
              });
              this.index++;
            }
          }
          return room;
        })
      )
    );
    this.roomsObs.subscribe(r => {
      this.rooms = r;
    });
  }

  ngOnInit() {
    this.ipc.on('serialport:list:result', (event, args: { ports: Port[] }) => {
      this.ngZone.run(() => {
        this.ports = args.ports;
      });
    });

    this.ipc.on('serialport:port:open', (event, comName: string) => {
      this.ngZone.run(() => {
        this.selectedPort = comName;
        this.matSnackbar.open('Puerto conectado', null, {
          duration: 3000,
          verticalPosition: 'bottom',
          horizontalPosition: 'end'
        });
      });
    });

    this.ipc.on('serialport:port:closed', () => {
      this.ngZone.run(() => {
        this.selectedPort = null;
        this.loraMode = false;
        this.storage.clear('port');
        this.matSnackbar.open('Puerto desconectado', null, {
          duration: 3000,
          verticalPosition: 'bottom',
          horizontalPosition: 'end'
        });
      });
    });

    this.ipc.on('serialport:command:result', (event, args: Room) => {
      this.ngZone.run(() => {
        const room = args;
        console.log('Receiving', room);
        if (room) {
          this.firestore.doc<Room>('rooms/' + room.id).update({
            value: room.value
          });
        }
        this.waitingResponse = false;
        this.cdr.markForCheck();
      });
    });

    this.ipc.on('serialport:port:welcome', () => {
      this.ngZone.run(() => {
        this.loraMode = true;
        setTimeout(() => {
          this.turnOnAll();
        }, intervalCommands);
      });
    });
    this.ipc.send('serialport:list:action');
  }

  ngOnDestroy() {
    this.alive = false;
    this.ipc.send('serialport:port:close');
  }

  listPorts() {
    this.ipc.send('serialport:list:action');
  }

  closePort() {
    this.ipc.send('serialport:port:close');
  }

  turnOffAll() {
    console.log('Turn off all');
    this.rooms = this.rooms.map(room => {
      room.value = false;
      return room;
    });
    this.ipc.send('serialport:command:turnOffAll');
    this.commandSend();
    this.rooms = this.rooms.map((room, index, array) => {
      room.value = false;
      array[index].value = false;
      this.roomsCollection.doc(room.id).update({
        value: false,
        emitter: 'local'
      });
      return room;
    });
  }

  turnOnAll() {
    console.log('Turn on all');
    this.rooms = this.rooms.map(room => {
      room.value = true;
      return room;
    });
    this.ipc.send('serialport:command:turnOnAll');
    this.commandSend();
    this.rooms = this.rooms.map((room, index, array) => {
      room.value = true;
      array[index].value = true;
      this.roomsCollection.doc(room.id).update({
        value: true,
        emitter: 'local'
      });
      return room;
    });
  }

  commandSend() {
    this.waitingResponse = true;
    this.cdr.markForCheck();
  }
}
