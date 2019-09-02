import {firestore} from 'firebase';

export interface InternetChart {
  date: Date | firestore.Timestamp;
  value: number;
}
