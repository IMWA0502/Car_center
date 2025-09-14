import { Component } from '@angular/core';
import { Header } from '../../header/header';
import { Footer } from '../../footer/footer';

@Component({
  selector: 'app-condition',
  standalone: true,
  templateUrl: './condition.html',
  styleUrl: './condition.css',
  imports: [Header, Footer]
})
export class ConditionComponent {}
