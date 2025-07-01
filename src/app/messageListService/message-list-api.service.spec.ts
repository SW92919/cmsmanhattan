import { TestBed } from '@angular/core/testing';

import { MessageListApiService } from './message-list-api.service';

describe('MessageListApiService', () => {
  let service: MessageListApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MessageListApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
