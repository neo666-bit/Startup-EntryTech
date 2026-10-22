import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LayoutPaciente } from './layout-paciente';

describe('LayoutPaciente', () => {
  let component: LayoutPaciente;
  let fixture: ComponentFixture<LayoutPaciente>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LayoutPaciente],
    }).compileComponents();

    fixture = TestBed.createComponent(LayoutPaciente);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
