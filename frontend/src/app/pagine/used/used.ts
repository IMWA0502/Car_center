import { Component, OnInit, OnDestroy } from '@angular/core';
import { Header } from '../../header/header';
import { Footer } from '../../footer/footer';
import { io, Socket } from 'socket.io-client';
import { CommonModule } from '@angular/common';
// JsonPipe removed because it's no longer used in the template
import { Filter } from '../../filter/filter';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-used',
  standalone: true,
  templateUrl: './used.html',
  styleUrl: './used.css',
  imports: [Header, Footer, CommonModule, Filter, HttpClientModule]
})

export class UsedComponent implements OnInit, OnDestroy {
  private socket!: Socket;
  public autotraderData: any[] = [];

  // Normalized list for display
  public vehicles: VehicleCard[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit() {
  // TODO: if your backend runs on a different port, update this URL or derive from environment
  this.socket = io('http://localhost:3000');
    this.socket.on('connect', () => {
      console.log('Socket.io connesso!');
    });
    this.socket.on('autotrader-update', (data) => {
      console.log('Ricevuto dal backend:', data);
      this.autotraderData.push(data);
      const card = this.toCard(data);
      if (card) this.vehicles.unshift(card);
    });

    // Fetch initial data from backend REST API
    this.fetchInitialVehicles();
  }

  ngOnDestroy() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  private fetchInitialVehicles() {
    // Prefer relative URL if you proxy the backend; otherwise use full URL
    const url = 'http://localhost:3000/api/vehicles';
    this.http.get<any>(url).subscribe({
      next: (res) => {
        // Expect shape: { vehicles: array | object }
        const raw = Array.isArray(res?.vehicles) ? res.vehicles : (res?.vehicles?.items || res?.vehicles?.results || []);
        const cards: VehicleCard[] = (raw || []).map((it: any) => this.toCard(it)).filter(Boolean) as VehicleCard[];
        this.vehicles = cards;
      },
      error: (err) => {
        console.warn('Errore caricando /api/vehicles:', err);
      }
    });
  }

  private toCard(item: any): VehicleCard | null {
    if (!item) return null;
    // Handle different shapes
    const v = item.vehicle || item; // mock returns fields at root

    const make = v?.make || v?.manufacturer || v?.brand;
    const model = v?.model || v?.derivative || v?.variant;
    const year = v?.year || v?.registrationYear || this.tryParseYear(v?.firstRegistration || v?.registration);
    const price = v?.price || v?.priceGBP || v?.retailPrice || v?.price_gbp;
    const mileage = v?.mileage || v?.odometer || v?.odometerReading;
    const fuel = v?.fuel || v?.fuelType;
    const registration = v?.registration || v?.plate || v?.vrm;
    const id = v?.id || item?.id || `${make || 'veh'}-${model || 'model'}-${registration || Math.random().toString(36).slice(2,7)}`;

    const title = [make, model].filter(Boolean).join(' ');
    const subtitle = [year, registration].filter(Boolean).join(' • ');

    // Prefer an explicit image URL from API if available
    const imageUrl = this.getImageUrl(item) || this.getImageUrl(v) || this.pickImage(make);

    if (!title) return null;
    return {
      id: String(id),
      title,
      subtitle,
      price: this.toNumber(price),
      mileage: this.toNumber(mileage),
      fuel: fuel || undefined,
      year: this.toNumber(year),
      registration: registration || undefined,
      imageUrl
    };
  }

  private toNumber(x: any): number | undefined {
    const n = typeof x === 'string' ? Number(x.replace(/[^0-9.]/g, '')) : Number(x);
    return Number.isFinite(n) ? n : undefined;
  }

  private tryParseYear(x: any): number | undefined {
    if (!x) return undefined;
    const m = String(x).match(/\b(19|20)\d{2}\b/);
    return m ? Number(m[0]) : undefined;
  }

  private firstNonEmpty<T>(...vals: Array<T | undefined | null>): T | undefined {
    for (const v of vals) {
      if (v !== undefined && v !== null && String(v).length > 0) return v as T;
    }
    return undefined;
  }

  private getImageUrl(obj: any): string | undefined {
    if (!obj) return undefined;
    // Common fields
    const direct = this.firstNonEmpty(
      obj.imageUrl, obj.imageURL, obj.image, obj.thumbnailUrl, obj.thumbnail
    );
    if (direct) return String(direct);

    // Arrays of images/photos/media
    const arrs: any[] = [
      obj.images, obj.photos, obj.media?.images, obj.media?.photos,
      obj.vehicle?.images, obj.vehicle?.photos, obj.vehicle?.media?.images
    ].filter(Array.isArray);
    for (const arr of arrs) {
      if (!arr || !arr.length) continue;
      const first = arr[0];
      const candidate = this.firstNonEmpty(first?.url, first?.href, first?.link, first?.source, first?.src);
      if (candidate) return String(candidate);
    }
    return undefined;
  }

  private pickImage(make?: string): string {
    if (!make) return '/assets/image.png';
    const m = String(make).toLowerCase();
    // Try to map to available brand images
    const map: Record<string, string> = {
      audi: '/assets/Nuova cartella/audi.png',
      bmw: '/assets/Nuova cartella/bmw.png',
      ford: '/assets/Nuova cartella/ford.png',
      ferrari: '/assets/Nuova cartella/ferrari.png',
      nissan: '/assets/Nuova cartella/nissan.png',
      mercedes: '/assets/Nuova cartella/marcedes.png',
      toyota: '/assets/Nuova cartella/tayota.png',
    };
    return map[m] || '/assets/image.png';
  }
}

interface VehicleCard {
  id: string;
  title: string;
  subtitle?: string;
  price?: number;
  mileage?: number;
  fuel?: string;
  year?: number;
  registration?: string;
  imageUrl?: string;
}
