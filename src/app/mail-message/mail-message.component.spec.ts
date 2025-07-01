import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MailMessageComponent } from './mail-message.component';

describe('MailMessageComponent', () => {
  let component: MailMessageComponent;
  let fixture: ComponentFixture<MailMessageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MailMessageComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MailMessageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
