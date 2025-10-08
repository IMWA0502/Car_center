import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-api-data',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './api-data.html',
  styleUrls: ['./api-data.css']
})
export class ApiDataComponent implements OnInit {
  apiData: any = null;
  loading = true;
  error = '';
  lastUpdate = new Date();

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadApiData();
  }

  loadApiData() {
    this.loading = true;
    this.error = '';
    
    this.http.get<any>('http://localhost:3000/api/vehicles')
      .subscribe({
        next: (data) => {
          this.apiData = data;
          this.loading = false;
          this.lastUpdate = new Date();
          console.log('=== TUTTI I DATI API ===');
          console.table(data.vehicles || data);
          console.log('Struttura completa:', data);
        },
        error: (error) => {
          this.error = 'Errore nel caricamento dei dati API';
          this.loading = false;
          console.error('Errore API:', error);
        }
      });
  }

  refreshData() {
    this.loadApiData();
  }

  exportToJson() {
    const dataStr = JSON.stringify(this.apiData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'api-data-export.json';
    link.click();
    URL.revokeObjectURL(url);
  }
}