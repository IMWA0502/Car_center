import { Component } from '@angular/core';
import { Header } from '../../header/header';
import { Footer } from '../../footer/footer';

@Component({
  selector: 'app-reviews',
  standalone: true,
  templateUrl: './reviews.html',
  styleUrl: './reviews.css',
  imports: [Header, Footer]
})
export class ReviewsComponent {}