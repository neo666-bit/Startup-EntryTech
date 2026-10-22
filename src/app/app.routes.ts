import { Routes } from '@angular/router';
<<<<<<< HEAD
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
=======
import { LandingPage } from './components/landing-page/landing-page';
import { Login } from './components/autenticacao/login/login';
import { Registrar } from './components/autenticacao/registrar/registrar';
import { LayoutPaciente } from './components/paciente/estrutura/layout-paciente/layout-paciente';
import { Painel } from './components/paciente/paginas/painel/painel';
>>>>>>> 778c6b76cd2920adca8ee5c692e4489f4a28b2bd

export const routes: Routes = [
    {path: '', component: LandingPage, pathMatch: 'full'},
    {path: 'login', component: Login},
    {path: 'registrar', component: Registrar},
<<<<<<< HEAD
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
=======
>>>>>>> 778c6b76cd2920adca8ee5c692e4489f4a28b2bd

    {
    path: 'paciente',
    component: LayoutPaciente,
    children: [
      { path: '', redirectTo: 'painel', pathMatch: 'full' },
      { path: 'painel', component: Painel },
    ],
  },
];
