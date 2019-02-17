import { Component } from '@angular/core';
import { DemoService } from './demo.service';
import { Observable } from 'rxjs';
 
@Component({
  selector: 'demo-app',
  template:`
  <button (click)="toggleLogger()">Log</button>
  <ul>
    <li>Temp: {{date_temp?.temp}}</li>
    <li>Date: {{date_temp?.date}}</li>
  </ul>
  {{date_temp | json}}
  `
})
export class AppComponent {
 
  public date_temp;
  public refresh = 1000;
  public id;
  public logger = false;
 
  constructor(private _demoService: DemoService) { }

  ngOnInit() {
    setInterval(() => {

    },  this.refresh);
  }

  toggleLogger() {
    console.log('Toggle Logger')
    this.logger = !this.logger;
    if(!this.logger) {
      this._demoService.toggleLog().subscribe(
        data => { this.id = this.getDateTemp(data._id); }
      );
      setInterval(() => {
        this.getDateTemp(this.id)
      }, this.refresh);
    } else {
      this._demoService.toggleLog().subscribe(
        data => { console.log(data); }
      );
    }
  }

  getDateTemp(id) {
    if(id) {
    this._demoService.getLogFromId(id).subscribe(
      data => { this.date_temp = data},
      err => console.error(err),
      () => console.log('done gathering data')
    );
    }
  }

}
