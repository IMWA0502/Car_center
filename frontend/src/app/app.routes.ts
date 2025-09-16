import { Routes } from '@angular/router';
import { HomeComponent } from './pagine/home/home';
import { ContactComponent } from './pagine/contact/contact';
import { UsedComponent } from './pagine/used/used';
import { ConditionComponent } from './pagine/condition/condition';
import { ReviewsComponent } from './pagine/reviews/reviews';
import { SellComponent } from './pagine/sell/sell';
import { SearchComponent } from './pagine/search/search';
import { SplashComponent } from './splash/splash';
import { PartExchangeComponent } from './pagine/part_exchange/part_exchange';

export const routes: Routes = [
  { path: '', redirectTo: 'splash', pathMatch: 'full' },
  { path: 'splash', component: SplashComponent },
  { path: 'home', component: HomeComponent },
  { path: 'contact', component: ContactComponent },
  { path: 'used', component: UsedComponent },
  { path: 'condition', component: ConditionComponent },
  { path: 'reviews', component: ReviewsComponent },
  { path: 'sell', component: SellComponent },
  { path: 'search', component: SearchComponent },
  { path: 'part_exchange', component: PartExchangeComponent }
];
