import {AngularFireModule} from '@angular/fire';
import {AngularFirestoreModule} from '@angular/fire/firestore';
import {AppComponent} from './app.component';
import {AppRoutingModule} from './app-routing.module';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {BrowserModule} from '@angular/platform-browser';
import {environment} from 'src/environments/environment';
import {IpcService} from './services/ipc.service';
import {
  MatButtonModule,
  MatListModule,
  MatToolbarModule,
  MatRippleModule,
  MatSnackBarModule,
  MatProgressSpinnerModule, MatCardModule, MatIconModule
} from '@angular/material';
import {NgModule} from '@angular/core';
import {NgxElectronModule} from 'ngx-electron';
import {NgxWebstorageModule} from 'ngx-webstorage';
import {FlexLayoutModule} from '@angular/flex-layout';
import {PortComponent} from './components/port/port.component';
import {RoomComponent} from './components/room/room.component';
import {InternetComponent} from './components/internet/internet.component';
import {NgxChartsModule} from '@swimlane/ngx-charts';
import {PresenceService} from './services/presence.service';
import {AngularFireDatabaseModule} from '@angular/fire/database';

@NgModule({
  declarations: [AppComponent, RoomComponent, PortComponent, InternetComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    NgxWebstorageModule.forRoot({prefix: 'cnp', separator: '.'}),
    AngularFireModule.initializeApp(environment.firebase, 'cnpachuca'),
    AngularFirestoreModule.enablePersistence(),
    AngularFireDatabaseModule,
    NgxElectronModule,
    NgxChartsModule,
    FlexLayoutModule,

    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatListModule,
    MatRippleModule,
    MatSnackBarModule,
    MatToolbarModule,
    MatProgressSpinnerModule
  ],
  providers: [IpcService, PresenceService],
  bootstrap: [AppComponent]
})
export class AppModule {
}
