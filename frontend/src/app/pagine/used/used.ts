import { Component, OnInit, OnDestroy } from '@angular/core';
import { Header } from '../../header/header';
import { Footer } from '../../footer/footer';
import { io, Socket } from 'socket.io-client';
import { CommonModule } from '@angular/common';
// JsonPipe removed because it's no longer used in the template
import { Filter } from '../../filter/filter';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';

interface FilterCriteria {
  make?: string;
  model?: string;
  bodyTypes: string[];
  priceMin: number;
  priceMax: number;
  yearMin: number;
  yearMax: number;
  mileageMin: number;
  mileageMax: number;
  engineTypes: string[];
  drivetrains: string[];
}

@Component({
  selector: 'app-used',
  standalone: true,
  templateUrl: './used.html',
  styleUrl: './used.css',
  imports: [Header, Footer, CommonModule, Filter, HttpClientModule, RouterModule]
})

export class UsedComponent implements OnInit, OnDestroy {
  private socket!: Socket;
  public autotraderData: any[] = [];

  // Normalized list for display
  public allVehicles: VehicleCard[] = [];
  public filteredVehicles: VehicleCard[] = [];
  public errorBanner: { title: string; detail?: string } | null = null;

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
      if (card) {
        this.allVehicles.unshift(card);
        this.filteredVehicles = [...this.allVehicles];
      }
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
        // Normalize common API shapes to a flat array
        this.errorBanner = null;
        const arr = this.normalizeArrayResponse(res);
        const cards: VehicleCard[] = (arr || []).map((it: any) => this.toCard(it)).filter(Boolean) as VehicleCard[];
        this.allVehicles = cards;
        this.filteredVehicles = [...cards];
      },
      error: (err) => {
        console.warn('Errore caricando /api/vehicles:', err);
        // HttpErrorResponse shape from Angular
        const status = err?.status;
        const body = err?.error;
        if (status === 403 && body && (body.code === 'AUTOTRADER_FORBIDDEN' || /accesso negato/i.test(body?.error))) {
          const advertiserId = body?.advertiserId || (err?.headers?.get ? err.headers.get('x-autotrader-sandbox-id') : undefined);
          this.errorBanner = {
            title: 'L\'accesso alla Stock API è disabilitato per questo sandbox.',
            detail: `AutoTrader ha risposto 403 Forbidden sull\'endpoint /stock. ID sandbox: ${advertiserId ?? 'sconosciuto'}. Contatta il supporto per abilitare la Stock API.`
          };
          this.allVehicles = [];
          this.filteredVehicles = [];
          return;
        }
        this.errorBanner = {
          title: 'Impossibile caricare le auto in questo momento.',
          detail: 'Riprova più tardi. Se il problema persiste, contatta il supporto.'
        };
      }
    });
  }

  private normalizeArrayResponse(res: any): any[] {
    if (!res) return [];
    // Direct array
    if (Array.isArray(res)) return res;
    // Common wrappers
    const candidates = [
      res.vehicles,
      res.items,
      res.results,
      res.data,
      res.stock,
      res.adverts,
      res.list
    ];
    for (const c of candidates) {
      if (Array.isArray(c)) return c;
      if (c && Array.isArray(c.items)) return c.items;
      if (c && Array.isArray(c.results)) return c.results;
    }
    return [];
  }

  private toCard(item: any): VehicleCard | null {
    if (!item) return null;
    // Handle different shapes
    const v = item.vehicle || item; // mock returns fields at root

    const make = v?.make || v?.manufacturer || v?.brand;
    const model = v?.model || v?.derivative || v?.variant;
    const year = v?.year || v?.yearOfManufacture || v?.registrationYear || this.tryParseYear(v?.firstRegistration || v?.registration);
    const price = v?.price || v?.priceGBP || v?.retailPrice || v?.price_gbp || v?.askingPrice || v?.salePrice || v?.listPrice;
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
      imageUrl,
      raw: item
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
    
    // Prova prima i campi diretti più comuni
    const direct = this.firstNonEmpty(
      obj.imageUrl, obj.imageURL, obj.image, obj.thumbnailUrl, obj.thumbnail,
      obj.mainImageUrl, obj.primaryImage, obj.photo, obj.photoUrl,
      // AutoTrader Stock API potrebbe usare questi campi
      obj.images?.[0]?.url, obj.images?.[0]?.href, obj.images?.[0]?.link,
      obj.media?.image, obj.media?.photo, obj.vehicle?.image
    );
    if (direct) return String(direct);

    // Arrays di immagini/foto/media con ricerca più approfondita
    const arrs: any[] = [
      obj.images, obj.photos, obj.media?.images, obj.media?.photos,
      obj.vehicle?.images, obj.vehicle?.photos, obj.vehicle?.media?.images,
      obj.imageUrls, obj.photoUrls, obj.gallery
    ].filter(Array.isArray);
    
    for (const arr of arrs) {
      if (!arr || !arr.length) continue;
      for (const item of arr) {
        const candidate = this.firstNonEmpty(
          item?.url, item?.href, item?.link, item?.source, item?.src,
          item?.original, item?.large, item?.medium, item?.small,
          typeof item === 'string' ? item : undefined
        );
        if (candidate) return String(candidate);
      }
    }
    return undefined;
  }

  private pickImage(make?: string): string {
    // Usa sempre la foto auto generica invece dei loghi brand
    return '/assets/27277.jpg';
  }

  // Metodi per le statistiche nella header
  getUniqueCount(field: string): number {
    if (field === 'make') {
      const makes = this.filteredVehicles.map((v: VehicleCard) => v.title.split(' ')[0]).filter(Boolean);
      return new Set(makes).size;
    }
    return 0;
  }

  getAveragePrice(): number {
    const prices = this.filteredVehicles.map((v: VehicleCard) => v.price).filter(Boolean) as number[];
    if (prices.length === 0) return 0;
    return prices.reduce((sum, price) => sum + price, 0) / prices.length;
  }

  onFilterChange(criteria: FilterCriteria) {
    this.filteredVehicles = this.allVehicles.filter(vehicle => {
      // Filter by make
      if (criteria.make && !vehicle.title.toLowerCase().includes(criteria.make.toLowerCase())) {
        return false;
      }

      // Filter by body types
      if (criteria.bodyTypes.length > 0) {
        const vehicleBodyType = vehicle.raw?.bodyType?.toLowerCase() || vehicle.raw?.category?.toLowerCase() || '';
        if (!criteria.bodyTypes.some(type => vehicleBodyType.includes(type.toLowerCase()))) {
          return false;
        }
      }

      // Filter by price
      if (vehicle.price) {
        if (vehicle.price < criteria.priceMin || vehicle.price > criteria.priceMax) {
          return false;
        }
      }

      // Filter by year
      if (vehicle.year) {
        if (vehicle.year < criteria.yearMin || vehicle.year > criteria.yearMax) {
          return false;
        }
      }

      // Filter by mileage
      if (vehicle.mileage) {
        if (vehicle.mileage < criteria.mileageMin || vehicle.mileage > criteria.mileageMax) {
          return false;
        }
      }

      // Filter by engine types
      if (criteria.engineTypes.length > 0) {
        const vehicleFuel = vehicle.fuel?.toLowerCase() || '';
        if (!criteria.engineTypes.some(type => vehicleFuel.includes(type.toLowerCase()))) {
          return false;
        }
      }

      // Filter by drivetrains
      if (criteria.drivetrains.length > 0) {
        const vehicleDrivetrain = vehicle.raw?.drivetrain?.toLowerCase() || '';
        if (!criteria.drivetrains.some(drive => vehicleDrivetrain.includes(drive.toLowerCase()))) {
          return false;
        }
      }

      return true;
    });
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
  raw?: any;
}
