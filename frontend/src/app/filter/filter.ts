import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface FilterCriteria {
  make?: string;
  priceMin: number;
  priceMax: number;
  yearMin: number;
  yearMax: number;
  mileageMin: number;
  mileageMax: number;
  engineTypes: string[];
}

@Component({
  selector: 'app-filter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './filter.html',
  styleUrl: './filter.css'
})
export class Filter implements OnChanges {
  @Input() vehicles: any[] = [];
  @Input() initialMake: string | null = null;
  @Output() filterChange = new EventEmitter<FilterCriteria>();

  makes: string[] = [];
  selectedmake: string = '';
  
  priceMin: number = 0;
  priceMax: number = 100000;
  currentPriceMin: number = 0;
  currentPriceMax: number = 100000;
  
  yearMin: number = 2000;
  yearMax: number = 2025;
  currentYearMin: number = 2000;
  currentYearMax: number = 2025;
  
  mileageMin: number = 0;
  mileageMax: number = 300000;
  currentMileageMin: number = 0;
  currentMileageMax: number = 300000;

  engineTypes = [
    { name: 'Petrol', count: 0, selected: false },
    { name: 'Diesel', count: 0, selected: false },
    { name: 'Electric', count: 0, selected: false },
    { name: 'Hybrid', count: 0, selected: false },
    { name: 'Petrol Hybrid', count: 0, selected: false }
  ];

  ngOnChanges(changes: SimpleChanges) {
    if (changes['vehicles'] && this.vehicles.length > 0) {
      this.updateFilterOptions();
    }
    
    // Applica il filtro iniziale se specificato
    if (changes['initialMake'] && this.initialMake) {
      this.selectedmake = this.initialMake;
      // Aspetta che le opzioni siano caricate prima di applicare il filtro
      setTimeout(() => {
        this.onFilterChange();
      }, 100);
    }
  }

  private updateFilterOptions() {
    // Aggiorna makes
    const makes = [...new Set(this.vehicles.map(v => v.title.split(' ')[0]).filter(Boolean))];
    this.makes = ['All', ...makes.sort()];
    
    // Aggiorna counts per engine types
    this.engineTypes.forEach(type => {
      type.count = this.vehicles.filter(v => 
        v.fuel?.toLowerCase().includes(type.name.toLowerCase())
      ).length;
    });

    // Aggiorna range prezzi
    const prices = this.vehicles.map(v => v.price).filter(Boolean) as number[];
    if (prices.length > 0) {
      this.priceMin = Math.min(...prices);
      this.priceMax = Math.max(...prices);
      this.currentPriceMin = this.priceMin;
      this.currentPriceMax = this.priceMax;
    }

    // Aggiorna range anni
    const years = this.vehicles.map(v => v.year).filter(Boolean) as number[];
    if (years.length > 0) {
      this.yearMin = Math.min(...years);
      this.yearMax = Math.max(...years);
      this.currentYearMin = this.yearMin;
      this.currentYearMax = this.yearMax;
    }

    // Aggiorna range mileage
    const mileages = this.vehicles.map(v => v.mileage).filter(Boolean) as number[];
    if (mileages.length > 0) {
      this.mileageMin = Math.min(...mileages);
      this.mileageMax = Math.max(...mileages);
      this.currentMileageMin = this.mileageMin;
      this.currentMileageMax = this.mileageMax;
    }
  }

  onFilterChange() {
    const criteria: FilterCriteria = {
      make: this.selectedmake === 'All' ? undefined : this.selectedmake,
      priceMin: this.currentPriceMin,
      priceMax: this.currentPriceMax,
      yearMin: this.currentYearMin,
      yearMax: this.currentYearMax,
      mileageMin: this.currentMileageMin,
      mileageMax: this.currentMileageMax,
      engineTypes: this.engineTypes.filter(t => t.selected).map(t => t.name)
    };
    this.filterChange.emit(criteria);
  }

  clearFilters() {
    this.selectedmake = 'All';
    this.engineTypes.forEach(t => t.selected = false);
    this.updateFilterOptions(); // Reset ranges
    this.onFilterChange();
  }

  resetMake() {
    this.selectedmake = 'All';
    this.onFilterChange();
  }

  onPriceRangeChange() {
    // Assicura che min <= max
    if (this.currentPriceMin > this.currentPriceMax) {
      const temp = this.currentPriceMin;
      this.currentPriceMin = this.currentPriceMax;
      this.currentPriceMax = temp;
    }
    this.onFilterChange();
  }

  onYearRangeChange() {
    // Assicura che min <= max
    if (this.currentYearMin > this.currentYearMax) {
      const temp = this.currentYearMin;
      this.currentYearMin = this.currentYearMax;
      this.currentYearMax = temp;
    }
    this.onFilterChange();
  }

  onMileageRangeChange() {
    // Assicura che min <= max
    if (this.currentMileageMin > this.currentMileageMax) {
      const temp = this.currentMileageMin;
      this.currentMileageMin = this.currentMileageMax;
      this.currentMileageMax = temp;
    }
    this.onFilterChange();
  }
}
