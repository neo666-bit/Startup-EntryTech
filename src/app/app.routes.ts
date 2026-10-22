import { Routes } from '@angular/router';
import { LandingPage } from './landing-page/landing-page';
import { Login } from './login/login';
import { Registrar } from './registrar/registrar';
import { AppShell } from './app-shell/app-shell';
import { Home } from './home/home';
import { Wizard } from './wizard/wizard';
import { Plan } from './plan/plan';
import { Nutritionists } from './nutritionists/nutritionists';
import { Profile } from './profile/profile';
import { Schedule } from './schedule/schedule';
import { Confirmed } from './confirmed/confirmed';
import { PhotoAnalysis } from './photo-analysis/photo-analysis';
import { Progress } from './progress/progress';

export const routes: Routes = [
    {path: '', component: LandingPage, pathMatch: 'full'},
    {path: 'login', component: Login},
    {path: 'registrar', component: Registrar},
    {
        path: '',
        component: AppShell,
        children: [
            {path: 'home', component: Home},
            {path: 'wizard', component: Wizard},
            {path: 'plan', component: Plan},
            {path: 'nutritionists', component: Nutritionists},
            {path: 'profile', component: Profile},
            {path: 'schedule', component: Schedule},
            {path: 'confirmed', component: Confirmed},
            {path: 'photo', component: PhotoAnalysis},
            {path: 'progress', component: Progress},
        ]
    }

];
