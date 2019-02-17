import { Component } from '@angular/core';
import { DemoService } from './demo.service';
import { Observable } from 'rxjs';
import { callbackify } from 'util';

@Component({
  selector: 'demo-app',
  template:`
  <ng-container>
  <div *ngIf="loggerStatus">Logger: On</div>
  <div *ngIf="!loggerStatus">Logger: Off</div>
  </ng-container>
  <button (click)="toggleLogger()">Log</button>
  {{date_temp | json}}
  `
})
export class AppComponent {

  public date_temp;
  public refresh = 1000;
  public id: any;
  public loggerStatus;
  public data: any;
  public refreshInterval;

  constructor(private _demoService: DemoService) { }

  ngOnInit() {
    this.getLoggerStatus(loggerStatus => {
      loggerStatus = loggerStatus;
    });
  }

  getLoggerStatus(callback) {
    this._demoService.loggerStatus().subscribe(
      data => { callback(data); } ,
      err => console.error(err)
    );
  }

  toggleLogger() {
    // check logger status
    this.getLoggerStatus(data => {
      this.loggerStatus = data.logger_status;
      // if the logger is off, turn it on
      if (!this.loggerStatus) {
        console.log('---turn logger on---');
        this._demoService.toggleLog().subscribe(
          data => {
            console.log(data);
            this.loggerStatus = !this.loggerStatus;
            // next block refreshes the data as its updated
            this.refreshInterval = setInterval(() => {
              this.getDateTemp(data._id);
            }, this.refresh);
          },
        );
      // else turn off logger
      } else {
        console.log('---turn logger off---');
        this._demoService.toggleLog().subscribe(
          data => {
            console.log(data);
            this.loggerStatus = !this.loggerStatus;
          }
        );
        // we have to clear the refresher when we're done
        if (this.refreshInterval) {
          clearInterval(this.refreshInterval);
        }
      }
    });
  }

  getDateTemp(id) {
    if (id) {
    this._demoService.getLogFromId(id).subscribe(
      data => { this.date_temp = data},
      err => console.error(err)
    );
    }
  }

}
