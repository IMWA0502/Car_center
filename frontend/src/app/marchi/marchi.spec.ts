import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Marchi } from './marchi';

describe('Marchi', () => {
  let component: Marchi;
  let fixture: ComponentFixture<Marchi>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Marchi]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Marchi);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
