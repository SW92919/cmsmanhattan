import { TestBed } from '@angular/core/testing';
import { UtilsApiService } from './utils-api.service';

describe('UtilsApiService', () => {
  let service: UtilsApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UtilsApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
