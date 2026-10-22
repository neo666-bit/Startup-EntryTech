import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { marinaPhoto } from '../nutrisync-data';
import { DietService } from '../nutrisync/diet.service';
import { fmtInt } from '../nutrisync/format';

@Component({
  selector: 'app-consulta-confirmada',
  imports: [RouterLink],
  templateUrl: './consulta-confirmada.html',
  styleUrl: './consulta-confirmada.css',
})
export class ConsultaConfirmada {
  protected readonly marinaPhoto = marinaPhoto;
  protected readonly fmtInt = fmtInt;
  protected readonly plan = inject(DietService).plan;
}
