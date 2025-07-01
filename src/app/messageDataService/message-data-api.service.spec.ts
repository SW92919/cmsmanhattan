import { TestBed } from '@angular/core/testing';
import { MessageDataApiService } from './message-data-api.service';

describe('MessageDataApiService', () => {
  let service: MessageDataApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MessageDataApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
