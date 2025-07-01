import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MessageActionService {
  private saveSubject = new Subject<void>();
  save$ = this.saveSubject.asObservable();

  triggerSave() {
    this.saveSubject.next();
  }
} 