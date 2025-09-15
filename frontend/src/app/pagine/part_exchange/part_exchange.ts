import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Header } from '../../header/header';
import { Footer } from '../../footer/footer';

@Component({
  selector: 'app-part_exchange',
  imports: [CommonModule, FormsModule, Header, Footer],
  templateUrl: './part_exchange.html',
  styleUrls: ['./part_exchange.css']
})
export class PartExchangeComponent {
  activeStep = 1;

  nextStep() {
    if (this.activeStep < 3) {
      this.activeStep++;
    }
  }

  prevStep() {
    if (this.activeStep > 1) {
      this.activeStep--;
    }
  }
}