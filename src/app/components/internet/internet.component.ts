import {AngularFirestore, AngularFirestoreDocument} from '@angular/fire/firestore';
import {ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {interval, Subscription} from 'rxjs';
import {take, takeWhile} from 'rxjs/operators';
import {firestore} from 'firebase';
import {InternetChart} from '../../interfaces/internet-chart';
import * as moment from 'moment';
import * as XLSX from 'xlsx';
import {IpcService} from '../../services/ipc.service';

moment.locale('es');
const imageAddr =
  'https://firebasestorage.googleapis.com/v0/b/cnpachuca-ff3db.appspot.com/o/test_internet.jpg?alt=media&token=2f857f76-23ec-49f2-95c7-322008eba760';
const downloadSize = 4418108;

@Component({
  selector: 'app-internet',
  styleUrls: ['./internet.component.scss'],
  templateUrl: './internet.component.html',
})
export class InternetComponent implements OnInit, OnDestroy {
  public chartData: InternetChart[] = [];
  internetDoc: AngularFirestoreDocument;
  public measuring = false;
  type = 'week';
  types = ['week', 'month', 'year'];
  intervalInternet: Subscription;
  multi = [
    {
      name: 'Speed',
      series: [],
    },
  ];
  showLegend = false;
  showXAxis = true;
  showYAxis = true;
  showXAxisLabel = false;
  showYAxisLabel = true;
  yAxisLabel = 'Velocidad';
  xAxisLabel = 'Fecha';
  view = [null, 300];
  colorScheme: any;
  private alive = true;

  constructor(
    private ipc: IpcService,
    private cdr: ChangeDetectorRef,
    private angularFirestore: AngularFirestore,
  ) {
    this.internetDoc = this.angularFirestore.doc<any>('data/internet');
    this.internetDoc
      .snapshotChanges()
      .pipe(take(1))
      .subscribe(data => {
        const history = data.payload.data().data;
        history.forEach(h => {
          h.date = (h.date as firestore.Timestamp).toDate();
        });
        this.chartData = history || [];

        this.redrawChart();
        console.log(moment.duration(moment().diff(history[history.length - 1].date)).asMinutes());
        if (moment.duration(moment().diff(history[history.length - 1].date)).asMinutes() > 15) {
          this.measureConnectionSpeed();
        }
      });
    this.cdr.markForCheck();
  }

  ngOnInit() {
    const tenMinutes = 1000 * 60 * 10;
    this.intervalInternet = interval(tenMinutes)
      .pipe(takeWhile(() => this.alive))
      .subscribe(this.measureConnectionSpeed.bind(this));
  }

  ngOnDestroy() {
    this.alive = false;
  }

  measureConnectionSpeed() {
    let startTime: number;
    let endTime: number;
    const download = new Image();
    download.onload = () => {
      endTime = new Date().getTime();
      this.calcResults(startTime, endTime);
    };

    startTime = new Date().getTime();
    const cacheBuster = '&nnn=' + startTime;
    download.src = imageAddr + cacheBuster;
  }

  downloadHistory() {
    this.ipc.send('utils:downloadHistory', this.chartData);
  }

  private calcResults(start, end): number {
    const duration = (end - start) / 1000;
    const bitsLoaded = downloadSize * 8;
    const speedBps = bitsLoaded / duration;
    const speedKbps = speedBps / 1024;
    const speedMbps = speedKbps / 1024;

    const now = new Date();

    this.chartData = [
      ...this.chartData,
      {
        date: new Date(),
        value: speedMbps,
      },
    ];
    if (this.chartData.length > 50) {
      this.chartData.shift();
    }

    this.chartData = this.chartData;
    this.internetDoc.update({
      data: this.chartData,
    });

    this.redrawChart();

    this.measuring = false;
    return speedMbps;
  }

  private redrawChart() {
    const today = moment();
    this.multi = [
      {
        name: 'Mb',
        series: this.chartData.map(data => {
          const date = moment(data.date as Date);
          data.date = new Date(data.date as Date);
          // const name = `${hour}:${minutes}`;
          const name = date.fromNow();
          return {
            name,
            value: data.value,
          };
        }),
      },
    ];
  }
}
