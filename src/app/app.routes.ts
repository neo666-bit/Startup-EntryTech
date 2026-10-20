import { Routes } from '@angular/router';
import { LandingPage } from './components/landing-page/landing-page';
import { Login } from './components/autenticacao/login/login';
import { Registrar } from './components/autenticacao/registrar/registrar';

export const routes: Routes = [
    {path: '', component: LandingPage},
    {path: 'login', component: Login},
    {path: 'registrar', component: Registrar}

];

