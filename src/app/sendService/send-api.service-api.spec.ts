import { TestBed } from '@angular/core/testing';
import { SendApiService } from './send-api.service';

describe('SendApiService', () => {
  let service: SendApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SendApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
