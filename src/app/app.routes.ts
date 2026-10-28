import { Routes } from '@angular/router';
import { AppShell } from './app-shell/app-shell';
import { Home } from './home/home';
import { MontarDieta } from './montar-dieta/montar-dieta';
import { MinhaDieta } from './minha-dieta/minha-dieta';
import { Nutricionistas } from './nutricionistas/nutricionistas';
import { PerfilNutricionista } from './perfil-nutricionista/perfil-nutricionista';
import { AgendarConsulta } from './agendar-consulta/agendar-consulta';
import { ConsultaConfirmada } from './consulta-confirmada/consulta-confirmada';
import { AnaliseFoto } from './analise-foto/analise-foto';
import { Progresso } from './progresso/progresso';
import { LandingPage } from './components/landing-page/landing-page';
import { Login } from './components/autenticacao/login/login';
import { Registrar } from './components/autenticacao/registrar/registrar';
import { LayoutPaciente } from './components/paciente/estrutura/layout-paciente/layout-paciente';
import { Painel } from './components/paciente/paginas/painel/painel';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'inicio', component: LandingPage },
  { path: 'login', component: Login },
  { path: 'registrar', component: Registrar },
  {
    path: '',
    component: AppShell,
    children: [
      { path: 'home', component: Home },
      { path: 'montar-dieta', component: MontarDieta },
      { path: 'minha-dieta', component: MinhaDieta },
      { path: 'nutricionistas', component: Nutricionistas },
      { path: 'perfil-nutricionista', component: PerfilNutricionista },
      { path: 'agendar-consulta', component: AgendarConsulta },
      { path: 'consulta-confirmada', component: ConsultaConfirmada },
      { path: 'analise-foto', component: AnaliseFoto },
      { path: 'progresso', component: Progresso },
    ],
  },
  {
    path: 'paciente',
    component: LayoutPaciente,
    children: [
      { path: '', redirectTo: 'painel', pathMatch: 'full' },
      { path: 'painel', component: Painel },
    ],
  },
  { path: '**', redirectTo: 'home' },
];
