import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';

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

  constructor(private route: ActivatedRoute) {
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
}
