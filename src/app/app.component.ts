import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/firestore';
import { Component, NgZone, OnDestroy, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { IpcService } from './services/ipc.service';
import { map, takeWhile } from 'rxjs/operators';
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
  rooms: Observable<Room[]>;
  roomsCollection: AngularFirestoreCollection;
  selectedPort: string;

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

    this.rooms = firestore.collection<Room>('rooms').valueChanges();
    this.roomsCollection = this.firestore.collection<Room>('rooms');
    this.rooms = this.roomsCollection.snapshotChanges().pipe(
      takeWhile(() => this.alive),
      map(actions =>
        actions.map(a => {
          const data = a.payload.doc.data() as Room;
          const id = a.payload.doc.id;
          const room = { id, ...data };
          if (a.type === 'modified') {
            this.ipc.send('serialport:command:send', {
              room
            });
          }
          // console.log(a);
          return room;
        })
      )
    );
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
      console.log(args);
      this.firestore.doc<Room>('rooms/' + room.id).update({
        value: room.value
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
}
