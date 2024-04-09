import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PeopleinfoComponent } from './peopleinfo.component';

describe('PeopleinfoComponent', () => {
  let component: PeopleinfoComponent;
  let fixture: ComponentFixture<PeopleinfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PeopleinfoComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PeopleinfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
