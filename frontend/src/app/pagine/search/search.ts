

import { Component } from '@angular/core';
import { Header } from '../../header/header';
import { Footer } from '../../footer/footer';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { CommonModule, JsonPipe } from '@angular/common';

@Component({
  selector: 'app-search',
  standalone: true,
  templateUrl: './search.html',
  styleUrl: './search.css',
  imports: [Header, Footer, CommonModule, JsonPipe],
})
export class SearchComponent {
  // Array che conterrà i veicoli ricevuti dal backend
  vehicles: any[] = [];
  // Stato di caricamento per mostrare spinner o messaggio
  loading = false;
  // Messaggio di errore da mostrare all'utente
  error: string | null = null;

  constructor(private http: HttpClient) {
    // Appena la pagina viene aperta, avvia la ricerca dei veicoli
    // Puoi anche chiamare questa funzione da un pulsante "Cerca"
    this.cercaVeicoli();
  }

  cercaVeicoli() {
    // Imposta lo stato di caricamento e resetta eventuali errori
    this.loading = true;
    this.error = null;
    // Chiamata HTTP al backend Node.js per ottenere i veicoli
    this.http.get<any>('http://localhost:3000/api/vehicles').subscribe({
      next: (data) => {
        // Log di debug: mostra la risposta ricevuta dal backend
        console.log('Risposta dal backend:', data);
        // Gestione della risposta: il backend può restituire diversi formati
        // 1. Se la risposta è un array, la salvo direttamente
        if (Array.isArray(data)) {
          this.vehicles = data;
        }
        // 2. Se la risposta ha una proprietà "results" (es. Search API)
        else if (data.results && Array.isArray(data.results)) {
          // Estraggo il veicolo da ogni elemento della lista
          this.vehicles = data.results.map((item: any) => item.vehicle ? item.vehicle : item);
        }
        // 3. Se la risposta ha una proprietà "vehicles" (es. Vehicles API)
        else if (data.vehicles && Array.isArray(data.vehicles)) {
          this.vehicles = data.vehicles;
        }
        // 4. Se la risposta ha una singola proprietà "vehicle"
        else if (data.vehicle) {
          this.vehicles = [data.vehicle];
        }
        // 5. Se nessuna delle precedenti, imposto array vuoto
        else {
          this.vehicles = [];
        }
        // Fine caricamento
        this.loading = false;
      },
      error: (err) => {
        // Log di errore per debug
        console.error('Errore HTTP:', err);
        // Mostra messaggio di errore all'utente
        this.error = 'Errore nel recupero dei veicoli';
        this.loading = false;
      }
    });
  }
}