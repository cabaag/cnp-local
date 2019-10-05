import {Injectable} from '@angular/core';
import {first, map, switchMap, tap} from 'rxjs/operators';
import {AngularFireDatabase} from '@angular/fire/database';
import {of} from 'rxjs';
import {AngularFireAuth} from '@angular/fire/auth';
import {database} from 'firebase';

@Injectable({
  providedIn: 'root'
})
export class PresenceService {

  constructor(private afAuth: AngularFireAuth, private db: AngularFireDatabase) {
    console.log('let there be presence');
    this.updateOnUser().subscribe();
    this.updateOnDisconnect().subscribe();
  }

  static get timestamp() {
    return database.ServerValue.TIMESTAMP;
  }

  getPresence(uid: string) {
    return this.db.object(`status`).valueChanges();
  }

  getUser() {
    return this.afAuth.authState.pipe(first()).toPromise();
  }

  async setPresence(status: string) {
    const user = await this.getUser();
    if (user) {
      return this.db.object(`status`).update({status, timestamp: PresenceService.timestamp});
    }
  }

  updateOnUser() {
    const connection = this.db.object('.info/connected').valueChanges().pipe(
      map(connected => connected ? 'online' : 'offline')
    );

    return this.afAuth.authState.pipe(
      switchMap(user => user ? connection : of('offline')),
      tap(status => this.setPresence(status as string))
    );
  }

  updateOnDisconnect() {
    return this.afAuth.authState.pipe(
      tap(user => {
        if (user) {
          this.db.object(`status`).query.ref.onDisconnect()
            .update({
              status: 'offline',
              timestamp: PresenceService.timestamp
            });
        }
      })
    );
  }

  async signIn() {
    await this.afAuth.auth.signInAnonymously();
  }

  async signOut() {
    await this.setPresence('offline');
    await this.afAuth.auth.signOut();
  }
}
