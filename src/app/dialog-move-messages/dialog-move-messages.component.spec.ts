import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogMoveMessagesComponent } from './dialog-move-messages.component';

describe('DialogMoveMessagesComponent', () => {
  let component: DialogMoveMessagesComponent;
  let fixture: ComponentFixture<DialogMoveMessagesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogMoveMessagesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DialogMoveMessagesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
