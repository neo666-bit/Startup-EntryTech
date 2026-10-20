import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'app-landing-page',
  styleUrl: './landing-page.css',
  templateUrl: './landing-page.html',
})
export class LandingPage {}
