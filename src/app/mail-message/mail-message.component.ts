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
import { FilePreviewComponent } from '../file-preview/image-preview.component';
import {
  MessageContentResponse,
  FileItem,
} from '../messageDataService/mail-message-api-response';
import { MessageActionService } from './message-action.service';
import { Subscription } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Browser } from '@capacitor/browser';
import { InAppBrowser } from '@capacitor/inappbrowser';
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
  private saveSub?: Subscription;
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
    this.editor = new Editor();
    this.isMobile = this.platform.ANDROID || this.platform.IOS;
    this.saveSub = this.messageActionService.save$.subscribe(() =>
      this.saveMessage()
    );
  }

  ngOnDestroy(): void {
    this.editor.destroy();
    this.saveSub?.unsubscribe();
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
    } else {
      this.hasTo = false;
      this.hasSubject = false;
      this.hasBody = false;
      this.hasSubmitButton = false;
      this.showSendFields = false;

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
      const blob = new Blob([response as Blob], { type: mimeType });
      const blobUrl = window.URL.createObjectURL(blob);
      console.log('Created blob URL:', blobUrl, 'for file:', fileName);

      const modal = await this.modalController.create({
        component: FilePreviewComponent,
        componentProps: {
          fileUrl: blobUrl,
          fileName: fileName,
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
    } catch (error) {
      console.error('Error previewing file:', error);
      this.showToast('Error previewing file', 'danger');
    }
  }

  // **NEW: Preview file in browser**
  private async previewFileInBrowser(fileName: string): Promise<void> {
    try {
      const baseUrl = environment.apiUrl;
      const attachmentUrl = `${baseUrl}attachment?folder=${
        this.folder
      }&messageNumber=${
        this.messageContent?.messageNumber
      }&filename=${fileName}&userName=${this.getUserName()}`;

      if (Capacitor.isNativePlatform()) {
        // Use Browser for mobile
        await Browser.open({
          url: attachmentUrl,
        });
      } else {
        // Use blob URL for web browsers
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
    } catch (error) {
      console.error('Error previewing file in browser:', error);
      this.showToast('Error previewing file', 'danger');
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
    this.isReplyMode = false;
    this.isForwardMode = false;
    let editorValue = this.addressForm.get('body')?.value;
    let htmlBody = '';
    if (typeof editorValue === 'string') {
      htmlBody = editorValue;
    } else if (editorValue && this.editor && this.editor.schema) {
      htmlBody = toHTML(editorValue, this.editor.schema);
    } else {
      htmlBody = '';
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

    this.sendApiService.sendMail(sendRequest).subscribe((response) => {
      this.saveMessage();
      this.closeTab();
      this.messageSent.emit();
      this.navigateToSentMessages();
    });
  }

  replyMessage(): void {
    if (this.isReplyMode) {
      return;
    }

    this.isReplyMode = true;
    this.isForwardMode = false;
    let to: string = this.addressForm.get('from')?.value as string;
    let from: string = this.addressForm.get('to')?.value as string;
    let subject: string = ('Re: ' +
      this.addressForm.get('subject')?.value) as string;
    let body: string = (' -----Original Message-----' +
      ' From: ' +
      this.addressForm.get('from')?.value +
      ' To: ' +
      this.addressForm.get('to')?.value +
      ' subject: ' +
      this.addressForm.get('subject')?.value +
      ' ' +
      this.addressForm.get('body')?.value) as string;

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
    let from: string = this.addressForm.get('to')?.value as string;
    let subject: string = ('Fwd: ' +
      this.addressForm.get('subject')?.value) as string;
    let body: string = (' -----forwarded Message-----' +
      ' From: ' +
      this.addressForm.get('from')?.value +
      ' To: ' +
      this.addressForm.get('to')?.value +
      ' subject: ' +
      this.addressForm.get('subject')?.value +
      ' ' +
      this.addressForm.get('body')?.value) as string;

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
    this.showUploadFile = true;
  }

  uploadedFile(file: { fileName: string; contentType: string; size: number }) {
    this.files.push(file);
    this.showUploadFile = false;
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

  private navigateToSentMessages(): void {
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
