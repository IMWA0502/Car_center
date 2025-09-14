import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-splash',
  imports: [],
  templateUrl: './splash.html',
  styleUrl: './splash.css'
})
export class SplashComponent {
  constructor(private router: Router) {
    setTimeout(() => {
      this.router.navigate(['/home']);
    }, 2000);
  }
}
