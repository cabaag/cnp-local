import { AngularFireModule } from '@angular/fire';
import { AngularFirestoreModule } from '@angular/fire/firestore';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BrowserModule } from '@angular/platform-browser';
import { environment } from 'src/environments/environment';
import { IpcService } from './services/ipc.service';
import {
  MatButtonModule,
  MatListModule,
  MatToolbarModule,
  MatRippleModule,
  MatSnackBarModule
} from '@angular/material';
import { NgModule } from '@angular/core';
import { NgxElectronModule } from 'ngx-electron';
import { NgxWebstorageModule } from 'ngx-webstorage';
import { FlexLayoutModule } from '@angular/flex-layout';
import { PortComponent } from './components/port/port.component';
import { RoomComponent } from './components/room/room.component';

@NgModule({
  declarations: [AppComponent, RoomComponent, PortComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    NgxWebstorageModule.forRoot({ prefix: 'cnp', separator: '.' }),
    AngularFireModule.initializeApp(environment.firebase, 'cnpachuca'),
    AngularFirestoreModule.enablePersistence(),
    NgxElectronModule,
    FlexLayoutModule,

    MatButtonModule,
    MatListModule,
    MatRippleModule,
    MatSnackBarModule,
    MatToolbarModule
  ],
  providers: [IpcService],
  bootstrap: [AppComponent]
})
export class AppModule {}
