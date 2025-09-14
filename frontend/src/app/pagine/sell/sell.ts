import { Component } from '@angular/core';
import { Header } from '../../header/header';
import { Footer } from '../../footer/footer';

@Component({
  selector: 'app-sell',
  standalone: true,
  templateUrl: './sell.html',
  styleUrl: './sell.css',
  imports: [Header, Footer]
})
export class SellComponent {}