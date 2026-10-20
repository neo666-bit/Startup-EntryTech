import { Routes } from '@angular/router';
import { LandingPage } from './components/landing-page/landing-page';
import { Login } from './components/autenticacao/login/login';
import { Registrar } from './components/autenticacao/registrar/registrar';
import { LayoutPaciente } from './components/paciente/estrutura/layout-paciente/layout-paciente';
import { Painel } from './components/paciente/paginas/painel/painel';

export const routes: Routes = [
    {path: '', component: LandingPage},
    {path: 'login', component: Login},
    {path: 'registrar', component: Registrar},

    {
    path: 'paciente',
    component: LayoutPaciente,
    children: [
      { path: '', redirectTo: 'painel', pathMatch: 'full' },
      { path: 'painel', component: Painel },
    ],
  },
];

