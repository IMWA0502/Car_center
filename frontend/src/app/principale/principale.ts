import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-principale',
  imports: [HttpClientModule, CommonModule, FormsModule],
  templateUrl: './principale.html',
  styleUrl: './principale.css'
})
export class Principale implements OnInit {
  makes: string[] = [];
  selectedMake: string = '';

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.loadMakes();
  }

  private loadMakes() {
    // Carica i veicoli dall'API per estrarre le marche
    this.http.get<any>('http://localhost:3000/api/vehicles').subscribe({
      next: (res) => {
        const vehicles = this.normalizeArrayResponse(res);
        const makes = [...new Set(vehicles.map((v: any) => {
          const vehicle = v.vehicle || v;
          return vehicle?.make || vehicle?.manufacturer || vehicle?.brand || v.title?.split(' ')[0];
        }).filter(Boolean))];
        this.makes = ['All', ...makes.sort()];
      },
      error: (err) => {
        console.warn('Errore caricando marche:', err);
        this.makes = ['All']; // Fallback
      }
    });
  }

  private normalizeArrayResponse(res: any): any[] {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    const candidates = [
      res.vehicles, res.items, res.results, res.data, res.stock, res.adverts, res.list
    ];
    for (const c of candidates) {
      if (Array.isArray(c)) return c;
      if (c && Array.isArray(c.items)) return c.items;
      if (c && Array.isArray(c.results)) return c.results;
    }
    return [];
  }

  onSearch() {
    console.log('=== SEARCH DEBUG ===');
    console.log('selectedMake:', this.selectedMake);
    
    // Naviga alla pagina used con il parametro make selezionato
    if (this.selectedMake && this.selectedMake !== '' && this.selectedMake !== 'All') {
      console.log('Navigating to /used with make:', this.selectedMake);
      this.router.navigate(['/used'], { 
        queryParams: { make: this.selectedMake } 
      });
    } else {
      console.log('No make selected, navigating to /used without params');
      // Se non è selezionata nessuna marca o è "All", vai semplicemente alla pagina used
      this.router.navigate(['/used']);
    }
    console.log('==================');
  }
}
