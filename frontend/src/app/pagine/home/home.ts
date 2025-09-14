import { Component } from '@angular/core';
import { Header } from '../../header/header';
import { Footer } from '../../footer/footer';
import { Principale } from '../../principale/principale';
import { Dashboard } from '../../dashboard/dashboard';
import { Marchi} from '../../marchi/marchi';
import { Info} from '../../info/info';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.html',
  styleUrl: './home.css',
  imports: [Header, Footer, Principale, Dashboard, Marchi, Info]
})
export class HomeComponent {}
