import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { Location } from '@angular/common';

@Component({
  selector: 'app-car',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './car.html',
  styleUrl: './car.css'
})
export class Car {
  id = '';
  title: string | null = null;
  vehicle: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location
  ) {
    this.route.paramMap.subscribe(params => {
      this.id = params.get('id') || '';
    });
    this.route.queryParamMap.subscribe(q => {
      this.title = q.get('title');
    });
    // Read navigation state (works when navigating via routerLink [state])
    const nav = history.state as any;
    if (nav && nav.vehicle) {
      this.vehicle = nav.vehicle;
      if (!this.title && this.vehicle?.title) this.title = this.vehicle.title;
    }
  }

  goBack() {
    this.location.back();
  }

  getEngineSize(vehicle: any): string | null {
    if (!vehicle || !vehicle.raw) return null;
    
    // Try to extract engine size from raw data
    const raw = vehicle.raw;
    if (raw.engineSize) return raw.engineSize;
    if (raw.engine?.size) return raw.engine.size;
    if (raw.engine?.displacement) return raw.engine.displacement;
    
    // Try to extract from title or description
    const text = (vehicle.title + ' ' + (vehicle.subtitle || '')).toLowerCase();
    const match = text.match(/(\d+\.?\d*)\s*l(iter)?/i);
    if (match) return match[1] + 'L';
    
    return null;
  }

  getTransmission(vehicle: any): string | null {
    if (!vehicle || !vehicle.raw) return null;
    
    const raw = vehicle.raw;
    if (raw.transmission) return raw.transmission;
    if (raw.gearbox) return raw.gearbox;
    if (raw.driveType) return raw.driveType;
    
    // Try to extract from title or other fields
    const text = (vehicle.title + ' ' + (vehicle.subtitle || '')).toLowerCase();
    if (text.includes('automatic') || text.includes('auto')) return 'Automatic';
    if (text.includes('manual')) return 'Manual';
    if (text.includes('cvt')) return 'CVT';
    
    return null;
  }
}
