import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-filter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './filter.html',
  styleUrl: './filter.css'
})
export class Filter {
  makes: string[] = ['Audi', 'BMW', 'Ferrari', 'Ford'];
  selectedmake: string = '';

  models: string[] = ['A4', 'X5', '488', 'Mustang'];
  selectedmodel: string = '';
  
    bodyTypes = [
      { name: 'Sedan', count: 0, selected: false },
      { name: 'Hatchback', count: 0, selected: false },
      { name: 'SUV', count: 0, selected: false },
      { name: 'Crossover', count: 0, selected: false },
      { name: 'Coupe', count: 0, selected: false },
      { name: 'Convertible', count: 0, selected: false },
      { name: 'Van', count: 0, selected: false },
      { name: 'Bus', count: 0, selected: false },
      { name: 'Truck', count: 0, selected: false },
      { name: 'Not set', count: 0, selected: false },
      { name: 'MVP', count: 0, selected: false },
      { name: 'Saloon', count: 1, selected: false },
      { name: 'Estate', count: 0, selected: false },
      { name: 'MPV', count: 0, selected: false }
    ];
  
    price: number = 690;
    year: number = 2008;
    mileage: number = 36000;
    engineCapacity: number = 1.0;

      engineTypes = [
        { name: 'Petrol', count: 0, selected: false },
        { name: 'Diesel', count: 0, selected: false },
        { name: 'Full electric', count: 0, selected: false },
        { name: 'Hybrid', count: 0, selected: false },
        { name: 'Petrol Hybrid', count: 0, selected: false }
      ];

      drivetrains = [
        { name: 'AWD', count: 0, selected: false },
        { name: 'FWD', count: 1, selected: false },
        { name: 'RWD', count: 0, selected: false },
        { name: '4WD', count: 0, selected: false }
      ];
}
