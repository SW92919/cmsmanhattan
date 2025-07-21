import {
  Component,
  ElementRef,
  inject,
  Input,
  OnInit,
  ViewChild,
  OnDestroy,
  EventEmitter,
  Output,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Platform } from '@angular/cdk/platform';
import {
  IonicModule,
  ActionSheetController,
  ToastController,
  ModalController,
} from '@ionic/angular';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatCardModule } from '@angular/material/card';
import { MessageDataApiService } from '../messageDataService/message-data-api.service';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Editor, NgxEditorModule, toHTML } from 'ngx-editor';
import { SendApiService } from '../sendService/send-api.service';
import { MailMessageSendRequest } from '../sendService/new-message-api-request';
import { FileUploadComponent } from '../file-upload/file-upload.component';
import { FileDisplayComponent } from '../file-display/file-display.component';
import { MatIconModule } from '@angular/material/icon';
import { FilePreviewComponent } from '../file-preview/file-preview.component';
import {
  MessageContentResponse,
  FileItem,
} from '../messageDataService/mail-message-api-response';
import { MessageActionService } from './message-action.service';
import { Subscription } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Browser } from '@capacitor/browser';
import { InAppBrowser } from '@capgo/inappbrowser';
// import { FileOpener } from '@ionic-native/file-opener/ngx';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { environment } from '../../environments/environment';

// Utility type for merged attachment info
interface MergedAttachment {
  fileName: string;
  size?: string;
  contentType?: string;
  file?: any;
  charset?: string;
  saved?: boolean;
}

@Component({
  selector: 'app-mail-message',
  standalone: true,
  imports: [
    CommonModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatRadioModule,
    MatCardModule,
    ReactiveFormsModule,
    MatDividerModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    NgxEditorModule,
    FileDisplayComponent,
    FileUploadComponent,
    MatIconModule,
    IonicModule,
    FilePreviewComponent,
  ],
  templateUrl: './mail-message.component.html',
  styleUrl: './mail-message.component.css',
})
export class MailMessageComponent implements OnInit, OnChanges, OnDestroy {
  @Input() messageNumber: number = 0;
  @Input() folder: string = '';
  files: { fileName: string; contentType: string; size: number }[] = [];
  @Output() removeTab = new EventEmitter<void>();
  @Output() newClicked = new EventEmitter<void>();
  @Output() messageSent = new EventEmitter<void>();
  @Output() navigateToSent = new EventEmitter<void>();
  @Output() modeChange = new EventEmitter<{
    isComposing: boolean;
    isReplyMode: boolean;
    isForwardMode: boolean;
  }>();

  closeTab() {
    this.removeTab.emit();
  }

  editor!: Editor;
  html = '';
  @ViewChild('body') body!: ElementRef;
  @ViewChild('from') from!: ElementRef;
  @ViewChild('to') to!: ElementRef;
  @ViewChild('cc') cc!: ElementRef;
  @ViewChild('bcc') bcc!: ElementRef;
  @ViewChild('subject') subject!: ElementRef;
  @ViewChild('receivedDate') receivedDate!: ElementRef;
  hasSubmitButton: boolean = false;
  showSendFields: boolean = false;
  messageContent: MessageContentResponse['mailMessage'] | null = null;
  isMobile: boolean = false;
  isReplyMode = false;
  isForwardMode = false;
  showCcBcc = false;
  showForwardedContent = false;
  showThreeDotsButton = true; // Control visibility of three dots button
  originalMessageContent: string = '';
  newMessageContent: string = ''; // Store new content separately
  mergedAttachments: MergedAttachment[] = [];
  cleanedBody: string = '';
  safeCleanedBody: SafeHtml = '';

  private fb = inject(FormBuilder);
  addressForm = this.fb.group({
    from: '',
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: '',
    receivedDate: '',
    shipping: ['free', Validators.required],
    attachment: [null],
  });

  hasBcc = false;
  hasCc = false;
  hasTo = false;
  hasSubject = false;
  hasBody = false;
  showUploadFile = false;

  constructor(
    private messageDataApiService: MessageDataApiService,
    private sendApiService: SendApiService,
    private platform: Platform,
    private messageActionService: MessageActionService,
    private toastController: ToastController,
    private router: Router,
    private sanitizer: DomSanitizer,
    private actionSheetController: ActionSheetController,
    private modalController: ModalController
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['messageNumber'] &&
      changes['messageNumber'].currentValue !==
        changes['messageNumber'].previousValue
    ) {
      this.fetchMessage();
    }
  }

  ngOnInit(): void {
    // Only create editor for desktop (mobile uses textarea)
    if (!this.platform.ANDROID && !this.platform.IOS) {
      this.editor = new Editor();
    }
    this.isMobile = this.platform.ANDROID || this.platform.IOS;
    // Removed the save subscription since archive is now handled by LayoutComponent
  }

  ngOnDestroy(): void {
    if (this.editor) {
      this.editor.destroy();
    }
    // Removed saveSub unsubscribe since it's no longer used
  }

  private emitModeChange(): void {
    this.modeChange.emit({
      isComposing: this.hasSubmitButton,
      isReplyMode: this.isReplyMode,
      isForwardMode: this.isForwardMode,
    });
  }

  fetchMessage(): void {
    this.isReplyMode = false;
    this.isForwardMode = false;

    if (this.messageNumber === 0) {
      this.messageContent = null;
      this.addressForm.reset();
      this.addressForm.patchValue({ from: this.getUserName() });
      this.hasTo = true;
      this.hasSubject = true;
      this.hasBody = true;
      this.hasSubmitButton = true;
      this.showSendFields = true;
      this.emitModeChange();
    } else {
      this.hasTo = false;
      this.hasSubject = false;
      this.hasBody = false;
      this.hasSubmitButton = false;
      this.showSendFields = false;
      this.emitModeChange();

      switch (this.folder) {
        case 'SENT':
          this.folder = 'Sent';
          break;
        case 'DRAFT':
          this.folder = 'Draft';
          break;
        case 'ARCHIVE':
          this.folder = 'Archive';
          break;
        case 'OUTBOX':
          this.folder = 'Outbox';
          break;
        case 'SPAM':
          this.folder = 'Spam';
          break;
      }

      const requestPayload = {
        folder: this.folder,
        messageNumber: this.messageNumber,
        renderingType: 1,
      };

      this.messageDataApiService.getMessage(requestPayload).subscribe({
        next: (messageContentResponse) => {
          if (messageContentResponse && messageContentResponse.mailMessage) {
            this.messageContent = messageContentResponse.mailMessage;
            this.addressForm.setValue({
              to: messageContentResponse.mailMessage.to || '',
              from: messageContentResponse.mailMessage.from || '',
              cc: messageContentResponse.mailMessage.cc || '',
              bcc: messageContentResponse.mailMessage.bcc || '',
              subject: messageContentResponse.mailMessage.subject || '',
              body: messageContentResponse.mailMessage.body || '',
              receivedDate:
                messageContentResponse.mailMessage.receivedDate || '',
              shipping: null,
              attachment: null,
            });
            this.updateMergedAttachments();
          } else {
            this.messageContent = null;
            this.mergedAttachments = [];
            this.addressForm.reset();
            console.error(
              '[fetchMessage] No mailMessage in response:',
              messageContentResponse
            );
          }
        },
        error: (err) => {
          this.messageContent = null;
          this.mergedAttachments = [];
          this.addressForm.reset();
          console.error('[fetchMessage] Error fetching message:', err);
        },
      });
    }
  }

  // **UPDATED: New hybrid approach for handling attachment links**
  async onBodyLinkClick(event: Event): Promise<void> {
    const target = event.target as HTMLElement;
    if (target.tagName === 'A') {
      event.preventDefault();
      const link = target as HTMLAnchorElement;
      const fileName = link.textContent?.trim() || 'download';

      if (!this.messageContent) {
        this.showToast('No message content available', 'danger');
        return;
      }

      // Show user options: Preview or Download
      await this.showFileOptions(fileName);
    }
  }

  // **NEW: Show action sheet with preview/download options**
  private async showFileOptions(fileName: string): Promise<void> {
    const actionSheet = await this.actionSheetController.create({
      header: `${fileName}`,
      buttons: [
        {
          text: 'Preview in App',
          icon: 'eye-outline',
          handler: () => {
            this.previewFile(fileName);
            return true;
          },
        },
        {
          text: 'Download to Device',
          icon: 'download-outline',
          handler: () => {
            this.downloadFileFromLink(fileName);
            return true;
          },
        },
        {
          text: 'Cancel',
          icon: 'close-outline',
          role: 'cancel',
        },
      ],
      backdropDismiss: true,
      keyboardClose: true,
    });
    await actionSheet.present();
  }

  // **NEW: Preview file in-app (Gmail-like experience)**
  private async previewFile(fileName: string): Promise<void> {
    try {
      // For all files, use the modal preview
      await this.previewFileInModal(fileName);
    } catch (error) {
      console.error('Error previewing file:', error);
      this.showToast('Error previewing file', 'danger');
    }
  }

  // **NEW: Preview file in modal**
  private async previewFileInModal(fileName: string): Promise<void> {
    try {
      console.log('Starting preview for file:', fileName);
      const response = await this.messageDataApiService
        .attachment(
          this.folder,
          Number(this.messageContent?.messageNumber),
          fileName,
          this.getUserName()
        )
        .toPromise();

      // Determine MIME type based on file extension
      const getMimeType = (filename: string): string => {
        const extension = filename
          .toLowerCase()
          .substring(filename.lastIndexOf('.'));
        const mimeTypes: { [key: string]: string } = {
          '.pdf': 'application/pdf',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.bmp': 'image/bmp',
          '.webp': 'image/webp',
          '.svg': 'image/svg+xml',
          '.mp4': 'video/mp4',
          '.avi': 'video/x-msvideo',
          '.mov': 'video/quicktime',
          '.mp3': 'audio/mpeg',
          '.wav': 'audio/wav',
          '.flac': 'audio/flac',
          '.txt': 'text/plain',
          '.html': 'text/html',
          '.htm': 'text/html',
          '.css': 'text/css',
          '.js': 'application/javascript',
          '.json': 'application/json',
          '.xml': 'application/xml',
          '.zip': 'application/zip',
          '.doc': 'application/msword',
          '.docx':
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          '.xls': 'application/vnd.ms-excel',
          '.xlsx':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          '.ppt': 'application/vnd.ms-powerpoint',
          '.pptx':
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        };
        return mimeTypes[extension] || 'application/octet-stream';
      };

      const mimeType = getMimeType(fileName);

      if (Capacitor.isNativePlatform()) {
        // For mobile: Save to filesystem first, then use local path
        await this.previewFileMobile(response as Blob, fileName, mimeType);
      } else {
        // For web: Use blob URL (works fine on desktop)
        const blob = new Blob([response as Blob], { type: mimeType });
        const blobUrl = window.URL.createObjectURL(blob);
        console.log('Created blob URL:', blobUrl, 'for file:', fileName);

        const modal = await this.modalController.create({
          component: FilePreviewComponent,
          componentProps: {
            fileUrl: blobUrl,
            fileName: fileName,
            isLocalFile: false, // Explicitly set for web
          },
          cssClass: 'file-preview-modal',
          backdropDismiss: true,
          showBackdrop: true,
        });

        await modal.present();
        console.log('Modal presented for file:', fileName);

        // Clean up blob URL when modal is dismissed
        modal.onDidDismiss().then(() => {
          console.log('Modal dismissed, cleaning up blob URL for:', fileName);
          window.URL.revokeObjectURL(blobUrl);
        });
      }
    } catch (error) {
      console.error('Error previewing file:', error);
      this.showToast('Error previewing file', 'danger');
    }
  }

  // **NEW: Preview file on mobile using filesystem**
  private async previewFileMobile(
    blob: Blob,
    fileName: string,
    mimeType: string
  ): Promise<void> {
    try {
      // Convert blob to base64
      const base64Data = await this.blobToBase64(blob);
      const safePath = `preview_${Date.now()}_${fileName.replace(
        /[^a-zA-Z0-9.\-_]/g,
        '_'
      )}`;

      // Save to cache directory for preview
      const result = await Filesystem.writeFile({
        path: safePath,
        data: base64Data,
        directory: Directory.Cache,
        recursive: true,
      });

      console.log('File saved to cache for preview:', result.uri);

      // Create a file:// URL for the local file
      // Note: On Android, the URI might already include file:// prefix
      let localFileUrl = result.uri;
      if (
        !localFileUrl.startsWith('file://') &&
        !localFileUrl.startsWith('content://')
      ) {
        localFileUrl = `file://${result.uri}`;
      }

      console.log('Local file URL created:', localFileUrl);
      console.log('File path for filesystem:', safePath);

      const modal = await this.modalController.create({
        component: FilePreviewComponent,
        componentProps: {
          fileUrl: localFileUrl,
          fileName: fileName,
          isLocalFile: true, // Flag to indicate this is a local file
          filePath: safePath, // Pass the path used to save the file
        },
        cssClass: 'file-preview-modal',
        backdropDismiss: true,
        showBackdrop: true,
      });

      await modal.present();
      console.log('Modal presented for local file:', fileName);

      // Clean up the temporary file when modal is dismissed
      modal.onDidDismiss().then(async () => {
        try {
          await Filesystem.deleteFile({
            path: safePath,
            directory: Directory.Cache,
          });
          console.log('Temporary preview file cleaned up:', safePath);
        } catch (cleanupError) {
          console.warn('Could not clean up temporary file:', cleanupError);
        }
      });
    } catch (error) {
      console.error('Error previewing file on mobile:', error);

      // Fallback: Try with blob URL if filesystem fails
      try {
        console.log('Falling back to blob URL approach');
        const blobUrl = window.URL.createObjectURL(blob);

        const modal = await this.modalController.create({
          component: FilePreviewComponent,
          componentProps: {
            fileUrl: blobUrl,
            fileName: fileName,
            isLocalFile: false,
          },
          cssClass: 'file-preview-modal',
          backdropDismiss: true,
          showBackdrop: true,
        });

        await modal.present();
        console.log('Modal presented with blob URL fallback:', fileName);

        // Clean up blob URL when modal is dismissed
        modal.onDidDismiss().then(() => {
          window.URL.revokeObjectURL(blobUrl);
        });
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        this.showToast('Error previewing file', 'danger');
      }
    }
  }

  // **NEW: Preview file in browser**
  private async previewFileInBrowser(fileName: string): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        // For mobile: Save to filesystem first, then open with browser
        await this.previewFileInBrowserMobile(fileName);
      } else {
        // For web: Use direct API URL or blob URL
        const baseUrl = environment.apiUrl;
        const attachmentUrl = `${baseUrl}attachment?folder=${
          this.folder
        }&messageNumber=${
          this.messageContent?.messageNumber
        }&filename=${fileName}&userName=${this.getUserName()}`;

        // Try direct URL first, fallback to blob URL
        try {
          window.open(attachmentUrl, '_blank');
        } catch (error) {
          // Fallback to blob URL
          const response = await this.messageDataApiService
            .attachment(
              this.folder,
              Number(this.messageContent?.messageNumber),
              fileName,
              this.getUserName()
            )
            .toPromise();

          const blob = new Blob([response as Blob]);
          const blobUrl = window.URL.createObjectURL(blob);
          window.open(blobUrl, '_blank');

          // Clean up after 30 seconds
          setTimeout(() => window.URL.revokeObjectURL(blobUrl), 30000);
        }
      }
    } catch (error) {
      console.error('Error previewing file in browser:', error);
      this.showToast('Error previewing file', 'danger');
    }
  }

  // **NEW: Preview file in browser on mobile using filesystem**
  private async previewFileInBrowserMobile(fileName: string): Promise<void> {
    try {
      const response = await this.messageDataApiService
        .attachment(
          this.folder,
          Number(this.messageContent?.messageNumber),
          fileName,
          this.getUserName()
        )
        .toPromise();

      // Convert blob to base64
      const base64Data = await this.blobToBase64(response as Blob);
      const safePath = `browser_${Date.now()}_${fileName.replace(
        /[^a-zA-Z0-9.\-_]/g,
        '_'
      )}`;

      // Save to cache directory
      const result = await Filesystem.writeFile({
        path: safePath,
        data: base64Data,
        directory: Directory.Cache,
        recursive: true,
      });

      console.log('File saved to cache for browser:', result.uri);

      // Create a file:// URL for the local file
      // Note: On Android, the URI might already include file:// prefix
      let localFileUrl = result.uri;
      if (
        !localFileUrl.startsWith('file://') &&
        !localFileUrl.startsWith('content://')
      ) {
        localFileUrl = `file://${result.uri}`;
      }

      // Open with Capacitor Browser
      await Browser.open({
        url: localFileUrl,
      });

      // Clean up the temporary file after a delay
      setTimeout(async () => {
        try {
          await Filesystem.deleteFile({
            path: safePath,
            directory: Directory.Cache,
          });
          console.log('Temporary browser file cleaned up:', safePath);
        } catch (cleanupError) {
          console.warn(
            'Could not clean up temporary browser file:',
            cleanupError
          );
        }
      }, 60000); // Clean up after 1 minute
    } catch (error) {
      console.error('Error previewing file in browser on mobile:', error);

      // Fallback: Try direct API URL
      try {
        console.log('Falling back to direct API URL approach');
        const baseUrl = environment.apiUrl;
        const attachmentUrl = `${baseUrl}attachment?folder=${
          this.folder
        }&messageNumber=${
          this.messageContent?.messageNumber
        }&filename=${fileName}&userName=${this.getUserName()}`;

        await Browser.open({
          url: attachmentUrl,
        });
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        this.showToast('Error previewing file', 'danger');
      }
    }
  }

  // **NEW: Download file from link (similar to existing attachment download)**
  private async downloadFileFromLink(fileName: string): Promise<void> {
    try {
      const folder = this.folder;
      const messageNumber = Number(this.messageContent?.messageNumber);
      const userName = this.getUserName();

      const response = await this.messageDataApiService
        .attachment(folder, messageNumber, fileName, userName)
        .toPromise();

      if (Capacitor.isNativePlatform()) {
        await this.downloadFileMobile(response as Blob, fileName);
      } else {
        this.downloadFileWeb(response, fileName);
      }
    } catch (error) {
      console.error('Error downloading from link:', error);
      this.showToast('Error downloading file from link', 'danger');
    }
  }

  // **UPDATED: Enhanced attachment download with preview option**
  async downloadAttachment(file: MergedAttachment): Promise<void> {
    if (!this.messageContent) return;

    // Show options for attachment box downloads too
    await this.showAttachmentOptions(file);
  }

  // **NEW: Show options for attachment box**
  private async showAttachmentOptions(file: MergedAttachment): Promise<void> {
    const actionSheet = await this.actionSheetController.create({
      header: `${file.fileName}`,
      subHeader: file.size ? `Size: ${this.formatSize(file.size)}` : '',
      buttons: [
        {
          text: 'Preview in App',
          icon: 'eye-outline',
          handler: () => {
            this.previewFile(file.fileName);
            return true;
          },
        },
        {
          text: 'Download to Device',
          icon: 'download-outline',
          handler: () => {
            this.downloadAttachmentFile(file);
            return true;
          },
        },
        {
          text: 'Open with External App',
          icon: 'open',
          handler: () => {
            this.openWithExternalApp(file);
            return true;
          },
        },
        {
          text: 'Cancel',
          icon: 'close-outline',
          role: 'cancel',
        },
      ],
      backdropDismiss: true,
      keyboardClose: true,
    });
    await actionSheet.present();
  }

  // **NEW: Download attachment file to filesystem**
  private async downloadAttachmentFile(file: MergedAttachment): Promise<void> {
    const folder = this.folder;
    const messageNumber = Number(this.messageContent?.messageNumber);
    const filename = file.fileName;
    const userName = this.getUserName();

    try {
      const response = await this.messageDataApiService
        .attachment(folder, messageNumber, filename, userName)
        .toPromise();

      if (Capacitor.isNativePlatform()) {
        await this.downloadFileMobile(response as Blob, filename);
      } else {
        this.downloadFileWeb(response, filename);
      }
    } catch (error) {
      console.error('Error downloading attachment:', error);
      this.showToast('Error downloading file', 'danger');
    }
  }

  // **NEW: Open with external app (like Gmail's "Open with" feature)**
  private async openWithExternalApp(file: MergedAttachment): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      this.showToast(
        'External app opening only available on mobile',
        'warning'
      );
      return;
    }

    try {
      const folder = this.folder;
      const messageNumber = Number(this.messageContent?.messageNumber);
      const filename = file.fileName;
      const userName = this.getUserName();

      const response = await this.messageDataApiService
        .attachment(folder, messageNumber, filename, userName)
        .toPromise();

      // Save to filesystem first
      const base64Data = await this.blobToBase64(response as Blob);
      const safePath = filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');

      const result = await Filesystem.writeFile({
        path: safePath,
        data: base64Data,
        directory: Directory.Cache,
        recursive: true,
      });

      // For now, just show success message since FileOpener is not available
      this.showToast(`File saved to cache: ${filename}`, 'success');
    } catch (error) {
      console.error('Error opening with external app:', error);
      this.showToast('Error opening file with external app', 'danger');
    }
  }

  // **EXISTING: Keep your existing methods - these remain unchanged**
  private downloadFileWeb(response: Blob | undefined, filename: string): void {
    if (!response) {
      this.showToast('Error downloading file', 'danger');
      return;
    }

    const fixedType = response.type.replace(
      'application/octet-stream',
      'text/plain'
    );
    const fixedBlob = new Blob([response], { type: fixedType });
    const fileUrl = window.URL.createObjectURL(fixedBlob);
    console.log('fileUrl', fileUrl);

    const url = window.URL.createObjectURL(response);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Clean up URLs
    window.URL.revokeObjectURL(url);
    window.URL.revokeObjectURL(fileUrl);
  }

  private async downloadFileMobile(
    response: Blob,
    filename: string
  ): Promise<void> {
    if (!response) {
      this.showToast('Error downloading file', 'danger');
      return;
    }

    // Request storage permission at runtime (Android only)
    if (Capacitor.getPlatform() === 'android') {
      const permStatus = await Filesystem.requestPermissions();
      if (permStatus.publicStorage !== 'granted') {
        this.showToast('Storage permission denied', 'danger');
        return;
      }
    }

    try {
      // Convert Blob to base64
      const base64Data = await this.blobToBase64(response);
      const safePath = filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');

      let result;
      let userMessage = '';

      if (Capacitor.getPlatform() === 'android') {
        try {
          // Try External Storage Downloads folder
          result = await Filesystem.writeFile({
            path: `Download/${safePath}`,
            data: base64Data,
            directory: Directory.ExternalStorage,
            recursive: true,
          });
          userMessage = `📁 File saved to Downloads folder: ${filename}`;
        } catch (error) {
          // Fallback: App Documents folder
          result = await Filesystem.writeFile({
            path: safePath,
            data: base64Data,
            directory: Directory.Documents,
            recursive: true,
          });
          userMessage = `📁 File saved to app Documents: ${filename}`;
        }
      } else if (Capacitor.getPlatform() === 'ios') {
        result = await Filesystem.writeFile({
          path: safePath,
          data: base64Data,
          directory: Directory.Documents,
          recursive: true,
        });
        userMessage = `📁 File saved: ${filename}\nFind it in: Files app > On My iPhone > [App Name]`;
      }

      this.showToast(userMessage, 'success');
      console.log('File saved to:', result?.uri);
    } catch (error) {
      console.error('Error saving file to device:', error);
      this.showToast('❌ Error saving file to device', 'danger');
    }
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private async showToast(
    message: string,
    color: 'success' | 'danger' | 'warning' = 'success'
  ): Promise<void> {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      color: color,
      position: 'bottom',
    });
    await toast.present();
  }

  // **ALL OTHER EXISTING METHODS REMAIN UNCHANGED**
  covertToAttachment(file: string[]): FileItem[] {
    let attachment: FileItem[] = [];
    file.forEach((element) => {
      attachment.push({
        contentType: '',
        fileName: element,
        file: { path: '', name: '' },
        charset: '',
        saved: false,
      });
    });
    return attachment;
  }

  onSubmit(): void {
    // Store the current mode before resetting it
    const wasReplyMode = this.isReplyMode;
    const wasForwardMode = this.isForwardMode;

    this.isReplyMode = false;
    this.isForwardMode = false;
    this.showThreeDotsButton = true; // Reset for next use
    this.emitModeChange();
    let editorValue = this.addressForm.get('body')?.value;
    let htmlBody = '';

    // If this was a reply or forward, ALWAYS include the original content for the recipient
    if ((wasReplyMode || wasForwardMode) && this.originalMessageContent) {
      // Always include both new content and original content for the recipient
      let newContent = '';
      if (this.isMobile) {
        // For mobile: textarea returns plain text, convert to HTML
        if (typeof editorValue === 'string') {
          newContent = editorValue.replace(/\n/g, '<br>');
        }
      } else {
        // For desktop: rich text editor
        if (typeof editorValue === 'string') {
          newContent = editorValue;
        } else if (editorValue && this.editor && this.editor.schema) {
          newContent = toHTML(editorValue, this.editor.schema);
        }
      }

      // Combine new content with original message content
      htmlBody =
        newContent +
        (newContent ? '<br><br>' : '') +
        this.originalMessageContent;
    } else {
      // Normal compose mode
      if (this.isMobile) {
        // For mobile: textarea returns plain text, convert to HTML
        if (typeof editorValue === 'string') {
          // Convert plain text to HTML with line breaks
          htmlBody = editorValue.replace(/\n/g, '<br>');
        } else {
          htmlBody = '';
        }
      } else {
        // For desktop: rich text editor
        if (typeof editorValue === 'string') {
          htmlBody = editorValue;
        } else if (editorValue && this.editor && this.editor.schema) {
          htmlBody = toHTML(editorValue, this.editor.schema);
        } else {
          htmlBody = '';
        }
      }
    }

    const attachments = this.files.map((file) => ({
      contentType: file.contentType,
      fileName: file.fileName,
      file: { path: '', name: '' },
      charset: '',
      saved: false,
    }));

    const sendRequest = {
      messageNumber: '',
      to: this.addressForm.get('to')?.value as string,
      from: this.addressForm.get('from')?.value as string,
      cc: this.addressForm.get('cc')?.value as string,
      bcc: this.addressForm.get('bcc')?.value as string,
      subject: this.addressForm.get('subject')?.value as string,
      body: htmlBody,
      receivedDate: this.addressForm.get('receivedDate')?.value as string,
      html: true,
      attachment: attachments,
    };

    console.log(
      '🔍 MailMessage - Sending request:',
      JSON.stringify(sendRequest, null, 2)
    );
    console.log('🔍 MailMessage - Current folder:', this.folder);
    console.log('🔍 MailMessage - Current user:', this.getUserName());

    this.sendApiService.sendMail(sendRequest).subscribe({
      next: (response) => {
        console.log('🔍 MailMessage - sendMail response received:', response);
        console.log('🔍 MailMessage - Response type:', typeof response);
        console.log('🔍 MailMessage - Response length:', response?.length);
        this.saveMessage();
        this.closeTab();
        this.messageSent.emit();
        this.navigateToSentMessages();
      },
      error: (error) => {
        console.error('🔍 MailMessage - sendMail error:', error);
      },
    });
  }

  replyMessage(): void {
    if (this.isReplyMode) {
      return;
    }

    this.isReplyMode = true;
    this.isForwardMode = false;
    this.showForwardedContent = false; // Start with hidden content
    this.showThreeDotsButton = true; // Show three dots button initially
    this.emitModeChange();

    let to: string;
    let from: string;
    let subject: string = ('Re: ' +
      this.addressForm.get('subject')?.value) as string;

    // Check if we're in Sent folder - adjust From/To logic accordingly
    if (this.folder === 'SENT' || this.folder === 'Sent') {
      // In Sent folder: current "from" is the user, "to" is the recipient
      // For reply: send to the original recipient
      to = this.addressForm.get('to')?.value as string;
      from = this.addressForm.get('from')?.value as string;
    } else {
      // In other folders (INBOX, etc.): current "from" is sender, "to" is the user
      // For reply: send to the original sender
      to = this.addressForm.get('from')?.value as string;
      from = this.addressForm.get('to')?.value as string;
    }

    // Create the original message content that can be toggled
    const originalBody = this.formatOriginalContent(
      this.addressForm.get('body')?.value || ''
    );
    this.originalMessageContent = (' -----Replied Message-----\n' +
      'From: ' +
      this.addressForm.get('from')?.value +
      '\nTo: ' +
      this.addressForm.get('to')?.value +
      '\nsubject: ' +
      this.addressForm.get('subject')?.value +
      '\n' +
      originalBody) as string;

    // Start with empty body, original content will be shown/hidden via toggle
    let body: string = '';

    this.addressForm.setValue({
      to: to,
      from: from,
      cc: this.addressForm.get('cc')?.value as string,
      bcc: this.addressForm.get('bcc')?.value as string,
      subject: subject,
      body: body,
      receivedDate: '',
      shipping: null,
      attachment: null,
    });

    this.hasTo = true;
    this.hasSubject = true;
    this.hasBody = true;
    this.hasSubmitButton = true;
    this.showSendFields = true;
  }

  forwardMessage(): void {
    if (this.isForwardMode) {
      return;
    }

    this.isForwardMode = true;
    this.isReplyMode = false;
    this.showForwardedContent = false; // Start with hidden content
    this.showThreeDotsButton = true; // Show three dots button initially
    this.emitModeChange();

    let from: string;
    let subject: string = ('Fwd: ' +
      this.addressForm.get('subject')?.value) as string;

    // Check if we're in Sent folder - adjust From logic accordingly
    if (this.folder === 'SENT' || this.folder === 'Sent') {
      // In Sent folder: current "from" is the user
      from = this.addressForm.get('from')?.value as string;
    } else {
      // In other folders (INBOX, etc.): current "to" is the user
      from = this.addressForm.get('to')?.value as string;
    }

    // Create the original message content that can be toggled
    const originalBody = this.formatOriginalContent(
      this.addressForm.get('body')?.value || ''
    );
    this.originalMessageContent = (' -----forwarded Message-----\n' +
      'From: ' +
      this.addressForm.get('from')?.value +
      '\nTo: ' +
      this.addressForm.get('to')?.value +
      '\nsubject: ' +
      this.addressForm.get('subject')?.value +
      '\n' +
      originalBody) as string;

    // Start with empty body, original content will be shown/hidden via toggle
    let body: string = '';

    this.addressForm.setValue({
      to: '',
      from: from,
      cc: '',
      bcc: '',
      subject: subject,
      body: body,
      receivedDate: '',
      shipping: null,
      attachment: null,
    });

    this.hasTo = true;
    this.hasSubject = true;
    this.hasBody = true;
    this.hasSubmitButton = true;
    this.showSendFields = true;
  }

  saveMessage(): void {
    this.hasTo = false;
    this.hasCc = false;
    this.hasBcc = false;
    this.hasSubject = false;
    this.hasBody = false;
    this.hasSubmitButton = false;
    this.showSendFields = false;
    this.ngOnInit();
  }

  deleteMessage(): void {
    alert('Are you sure delete the message ?');
  }

  moveMessage(): void {
    alert('Are you sure move the message ?');
  }

  attachFile() {
    console.log('Attach file button clicked');
    this.showUploadFile = true;
    console.log('showUploadFile set to:', this.showUploadFile);
  }

  uploadedFile(file: { fileName: string; contentType: string; size: number }) {
    console.log('File uploaded:', file);
    this.files.push(file);
    this.showUploadFile = false;
    console.log('Files array:', this.files);
  }

  newMessage() {
    this.newClicked.emit();
  }

  getUserName(): string {
    return sessionStorage.getItem('userName') || '';
  }

  toggleChange(event: any) {
    const toggle = event.source;
    toggle.buttonToggleGroup.value = [toggle.value];
  }

  formatSize(size: number | string): string {
    let kb =
      typeof size === 'string' ? parseFloat(size.replace(/[^\d.]/g, '')) : size;
    return `${Math.floor(kb)} kB`;
  }

  toggleCcBcc() {
    this.showCcBcc = !this.showCcBcc;
  }

  toggleForwardedContent() {
    this.showForwardedContent = !this.showForwardedContent;

    // Hide the three dots button after it's clicked
    this.showThreeDotsButton = false;

    // Update the form body content based on toggle state (UI only - doesn't affect what gets sent)
    if (this.showForwardedContent) {
      // Show new content + original message content with proper line breaks (UI preview only)
      const formattedOriginalContent = this.formatOriginalContent(
        this.originalMessageContent
      );
      const combinedContent =
        this.newMessageContent +
        (this.newMessageContent && formattedOriginalContent ? '\n\n' : '') +
        formattedOriginalContent;
      this.addressForm.patchValue({
        body: combinedContent,
      });
    } else {
      // Hide the original message content (show only new content in UI)
      this.addressForm.patchValue({
        body: this.newMessageContent,
      });
    }
  }

  onBodyContentChange() {
    // Track new content when user types in reply/forward mode (separate from original content)
    if (this.isReplyMode || this.isForwardMode) {
      const currentBody = this.addressForm.get('body')?.value || '';

      if (this.showForwardedContent) {
        // If showing forwarded content, extract only the new part (original content will be added separately when sending)
        const formattedOriginalContent = this.formatOriginalContent(
          this.originalMessageContent
        );
        if (currentBody.includes(formattedOriginalContent)) {
          // Remove the original content to get only new content
          this.newMessageContent = currentBody
            .replace(formattedOriginalContent, '')
            .trim();
        } else {
          this.newMessageContent = currentBody;
        }
      } else {
        // If not showing forwarded content, all content is new (original content will be added separately when sending)
        this.newMessageContent = currentBody;
      }
    }
  }

  private formatOriginalContent(content: string): string {
    if (!content) return '';

    // Replace HTML <br> tags with actual line breaks
    let formatted = content.replace(/<br\s*\/?>/gi, '\n');

    // Replace other common HTML entities
    formatted = formatted.replace(/&nbsp;/g, ' ');
    formatted = formatted.replace(/&amp;/g, '&');
    formatted = formatted.replace(/&lt;/g, '<');
    formatted = formatted.replace(/&gt;/g, '>');
    formatted = formatted.replace(/&quot;/g, '"');

    // Remove any remaining HTML tags
    formatted = formatted.replace(/<[^>]*>/g, '');

    return formatted;
  }

  private navigateToSentMessages(): void {
    console.log('🔍 MailMessage - navigateToSentMessages called');
    this.navigateToSent.emit();
    this.router.navigate(['/app'], { queryParams: { folder: 'SENT' } });
  }

  private parseAttachmentsFromBody(body: string): MergedAttachment[] {
    if (!body) return [];
    return [];
  }

  private cleanBody(body: string): string {
    if (!body) return '';
    return body;
  }

  private updateMergedAttachments() {
    const backend = this.messageContent?.attachment || [];
    this.mergedAttachments = backend;
    this.cleanedBody = this.cleanBody(this.messageContent?.body || '');
    this.safeCleanedBody = this.sanitizer.bypassSecurityTrustHtml(
      this.cleanedBody
    );
  }
}
