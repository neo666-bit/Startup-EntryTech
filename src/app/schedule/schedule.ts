import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { marinaPhoto } from '../nutrisync-data';

@Component({
  selector: 'app-schedule',
  imports: [RouterLink],
  templateUrl: './schedule.html',
  styleUrl: './schedule.css',
})
export class Schedule {
  protected readonly marinaPhoto = marinaPhoto;
  protected readonly date = signal(2);
  protected readonly time = signal('10:30');

  protected readonly weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  protected readonly days = Array.from({ length: 31 }, (_, i) => i + 1);
  protected readonly morning = ['08:00', '09:30', '10:30', '11:30'];
  protected readonly afternoon = ['14:00', '15:30', '17:00'];
  protected readonly reasons = ['Revisar plano e acompanhar emagrecimento', 'Melhorar alimentação'];
  protected readonly shares = ['Plano alimentar atual', 'Respostas do perfil', 'Histórico de progresso'];

  protected pad(day: number) {
    return String(day).padStart(2, '0');
  }
}
