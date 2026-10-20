import { Component } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { BarraSuperior } from '../barra-superior/barra-superior';
import { MenuLateral } from '../menu-lateral/menu-lateral';


@Component({
  imports: [RouterOutlet, BarraSuperior, MenuLateral],
  selector: 'app-layout-paciente',
  styleUrl: './layout-paciente.css',
  templateUrl: './layout-paciente.html',
})
export class LayoutPaciente {}
