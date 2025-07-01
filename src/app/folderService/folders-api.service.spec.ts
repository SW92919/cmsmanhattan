import { TestBed } from '@angular/core/testing';

import { FoldersApiService } from './folders-api.service';

describe('FoldersApiService', () => {
  let service: FoldersApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FoldersApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
