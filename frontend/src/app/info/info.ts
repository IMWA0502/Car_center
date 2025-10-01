import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-info',
  imports: [RouterModule],
  templateUrl: './info.html',
  styleUrl: './info.css'
})
export class Info {
  
  openInstagram() {
    window.open('https://www.instagram.com/', '_blank');
  }

  openFacebook() {
    window.open('https://www.facebook.com/', '_blank');
  }

  openTwitter() {
    window.open('https://www.twitter.com/', '_blank');
  }

  openLinkedIn() {
    window.open('https://www.linkedin.com/', '_blank');
  }
}
