import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/firestore';
import { Component, NgZone, OnDestroy, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { IpcService } from './services/ipc.service';
import { map, takeWhile, take } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { Port } from './interfaces/port';
import { Room } from './interfaces/room';
import { LocalStorageService } from 'ngx-webstorage';
import { MatSnackBar } from '@angular/material';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.sass'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit, OnDestroy {
  ports: Port[];
  private alive = true;
  roomsCollection: AngularFirestoreCollection;
  roomsObs: Observable<Room[]>;
  rooms: Room[];
  selectedPort: string;
  loraMode = false;

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

          if (a.type === 'modified') {
            // Si el valor modificado es diferente al anterior, cambia el estado
            if (this.rooms.find(r => r.id === id).value !== room.value) {
              console.log(room.name, Date.now());
              setTimeout(() => {
                this.ipc.send('serialport:command:sendNoReturn', {
                  room
                });
              }, 500);
            }
          }
          return room;
        })
      )
    );
    this.roomsObs.subscribe(r => {
      this.rooms = r;
      this.cdr.markForCheck();
    });
  }

  ngOnInit() {
    this.ipc.on('serialport:list:result', (event, args: { ports: Port[] }) => {
      this.ngZone.run(() => {
        this.ports = args.ports;
        this.cdr.markForCheck();
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
        this.cdr.markForCheck();
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
        this.cdr.markForCheck();
      });
    });

    this.ipc.on('serialport:command:result', (event, args: Room) => {
      const room = args;
      this.firestore.doc<Room>('rooms/' + room.id).update({
        value: room.value
      });
    });

    this.ipc.on('serialport:port:welcome', () => {
      this.ngZone.run(() => {
        this.loraMode = true;
        this.cdr.markForCheck();
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
    this.rooms = this.rooms.map(room => {
      room.value = false;
      return room;
    });
    this.ipc.send('serialport:command:turnOffAll');
    this.rooms = this.rooms.map((room, index, array) => {
      if (room.value) {
        room.value = false;
        array[index].value = false;
        this.roomsCollection.doc(room.id).update({
          value: false
        });
        this.cdr.markForCheck();
      }
      return room;
    });
  }

  turnOnAll() {
    this.rooms = this.rooms.map(room => {
      room.value = true;
      return room;
    });
    console.log(this.rooms);
    this.ipc.send('serialport:command:turnOnAll');
    this.rooms = this.rooms.map((room, index, array) => {
      if (!room.value) {
        room.value = true;
        array[index].value = true;
        this.roomsCollection.doc(room.id).update({
          value: true
        });
        this.cdr.markForCheck();
      }
      return room;
    });
  }
}
