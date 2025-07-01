import { TestBed } from '@angular/core/testing';

import { BannerApiService } from './banner-api.service';

describe('BannerApiService', () => {
  let service: BannerApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BannerApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
