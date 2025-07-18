import { HttpClient, HttpEventType, HttpHeaders } from '@angular/common/http';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Subscription } from 'rxjs/internal/Subscription';
import { catchError, finalize } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { LoginApiService } from '../logicService/login-api.service';
import { HandleError, HttpErrorHandler } from '../http-error-handler.service';
import { IonicModule } from '@ionic/angular';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [MatIconModule, MatProgressBarModule, CommonModule, IonicModule],
  templateUrl: './file-upload.component.html',
  styleUrl: './file-upload.component.css',
})
export class FileUploadComponent {
  baseUrl: string = environment.apiUrl;
  uploadUrl = this.baseUrl + 'uploadFileWithAddtionalData';

  @Input()
  requiredFileType!: string;
  @Output() uploadedFileEvent = new EventEmitter<{
    fileName: string;
    contentType: string;
    size: number;
  }>();

  fileName = '';
  uploadProgress: number = 0;
  uploadSub!: Subscription;
  private handleError!: HandleError;

  constructor(
    private http: HttpClient,
    private loginApiService: LoginApiService,
    httpErrorHandler: HttpErrorHandler
  ) {
    this.handleError = httpErrorHandler.createHandleError(
      'MessageDataApiService'
    );
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.fileName = file.name;
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name);
      formData.append('email', '');

      const upload$ = this.http
        .post(this.uploadUrl, formData, {
          reportProgress: true,
          observe: 'events',
        })
        .pipe(
          finalize(() => this.reset()),
          catchError(this.handleError<any>('upload'))
        );

      this.uploadSub = upload$.subscribe((event) => {
        if (event.type == HttpEventType.UploadProgress) {
          const total = event.total;
          this.uploadProgress = Math.round(100 * (event.loaded / total!));
          this.uploadedFileEvent.emit({
            fileName: file.name,
            contentType: file.type || 'application/octet-stream',
            size: file.size,
          });
        }
      });
    }
  }

  cancelUpload() {
    this.uploadSub.unsubscribe();
    this.reset();
  }

  reset() {
    this.uploadProgress = 0;
    this.uploadSub != null;
  }
}
