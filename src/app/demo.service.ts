import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
 
const httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};
 
@Injectable()
export class DemoService {
 
    constructor(private http:HttpClient) {}
 
    // Uses http.get() to load data from a single API endpoint
    getDateTemp() {
        return this.http.get('http://localhost:3000');
    }

    getLogFromId(id) {
        return this.http.get('http://localhost:3000/querydata/' + id);
    }

    toggleLog() {
        return this.http.get('http://localhost:3000/logger');
    }

    loggerStatus() {
        return this.http.get('http://localhost:3000/logger_status');
    }
}