import { Component, ElementRef, inject, Input, OnInit, ViewChild, OnDestroy, EventEmitter, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Platform } from '@angular/cdk/platform';
import { IonicModule } from '@ionic/angular';
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
import { MessageContentResponse, FileItem } from '../messageDataService/mail-message-api-response';
import { MessageActionService } from './message-action.service';
import { Subscription } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { ToastController } from '@ionic/angular';

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
		IonicModule

	],
	templateUrl: './mail-message.component.html',
	styleUrl: './mail-message.component.css'
})
export class MailMessageComponent implements OnInit, OnChanges, OnDestroy {

	@Input() messageNumber: number = 0;
	@Input() folder: string = '';
	files: { fileName: string, contentType: string, size: number }[] = [];
	@Output() removeTab = new EventEmitter();
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

	constructor(
		private messageDataApiService: MessageDataApiService,
		private sendApiService: SendApiService,
		private platform: Platform,
		private messageActionService: MessageActionService,
		private toastController: ToastController,
		private router: Router
	) { }

	ngOnChanges(changes: SimpleChanges): void {
		// console.log('MailMessageComponent ngOnChanges', changes);
		if (changes['messageNumber'] && changes['messageNumber'].currentValue !== changes['messageNumber'].previousValue) {
			this.fetchMessage();
		}
	}

	ngOnInit(): void {
		// console.log('MailMessageComponent ngOnInit', this.messageNumber, this.folder);
		this.editor = new Editor();
		this.isMobile = this.platform.ANDROID || this.platform.IOS;
		this.saveSub = this.messageActionService.save$.subscribe(() => this.saveMessage());
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
				case "SENT":
					this.folder = "Sent";
					break;
				case "DRAFT":
					this.folder = "Draft";
					break;
				case "ARCHIVE":
					this.folder = "Archive";
					break;
				case "OUTBOX":
					this.folder = "Outbox";
					break;
				case "SPAM":
					this.folder = "Spam";
					break;
			}
			const requestPayload = {
				folder: this.folder,
				messageNumber: this.messageNumber,
				renderingType: 1
			};
			// console.log('[fetchMessage] Sending request to getMessage:', requestPayload);
			this.messageDataApiService.getMessage(requestPayload).subscribe({
				next: messageContentResponse => {
					if (messageContentResponse && messageContentResponse.mailMessage) {
						this.messageContent = messageContentResponse.mailMessage;
						this.addressForm.setValue({
							to: messageContentResponse.mailMessage.to || '',
							from: messageContentResponse.mailMessage.from || '',
							cc: messageContentResponse.mailMessage.cc || '',
							bcc: messageContentResponse.mailMessage.bcc || '',
							subject: messageContentResponse.mailMessage.subject || '',
							body: messageContentResponse.mailMessage.body || '',
							receivedDate: messageContentResponse.mailMessage.receivedDate || '',
							shipping: null,
							attachment: null
						});
						this.updateMergedAttachments();
					} else {
						this.messageContent = null;
						this.mergedAttachments = [];
						this.addressForm.reset();
						console.error('[fetchMessage] No mailMessage in response:', messageContentResponse);
					}
				},
				error: err => {
					this.messageContent = null;
					this.mergedAttachments = [];
					this.addressForm.reset();
					console.error('[fetchMessage] Error fetching message:', err);
				}
			});
		}
	}

	private fb = inject(FormBuilder);
	addressForm = this.fb.group({
		from: "",
		to: "",
		cc: "",
		bcc: "",
		subject: "",
		body: "",
		receivedDate: "",
		shipping: ['free', Validators.required],
		attachment: [null]
	});

	hasBcc = false;
	hasCc = false;
	hasTo = false;
	hasSubject = false;
	hasBody = false;
	showUploadFile = false;

	covertToAttachment(file: string[]): FileItem[] {
		let attachment: FileItem[] = [];
		file.forEach(element => {
			attachment.push({ contentType: '', fileName: element, file: { path: '', name: '' }, charset: '', saved: false });
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

		const attachments = this.files.map(file => ({
			contentType: file.contentType,
			fileName: file.fileName,
			file: { path: '', name: '' },
			charset: '',
			saved: false
		}));

		const sendRequest = {
			messageNumber: "",
			to: this.addressForm.get('to')?.value as string,
			from: this.addressForm.get('from')?.value as string,
			cc: this.addressForm.get('cc')?.value as string,
			bcc: this.addressForm.get('bcc')?.value as string,
			subject: this.addressForm.get('subject')?.value as string,
			body: htmlBody,
			receivedDate: this.addressForm.get('receivedDate')?.value as string,
			html: true,
			attachment: attachments
		};

		this.sendApiService.sendMail(sendRequest).subscribe(response => {
			this.saveMessage();
			this.closeTab();
			this.messageSent.emit();
			this.navigateToSentMessages();
		})
	}

	replyMessage(): void {
		if (this.isReplyMode) {
			return;
		}
		this.isReplyMode = true;
		this.isForwardMode = false;
		let to: string = this.addressForm.get('from')?.value as string;
		let from: string = this.addressForm.get('to')?.value as string;
		let subject: string = "Re: " + this.addressForm.get('subject')?.value as string;
		let body: string = "<br/><br/>  -----Original Message-----" +
			"<br/> From: " + this.addressForm.get('from')?.value +
			"<br/> To: " + this.addressForm.get('to')?.value +
			"<br/> subject: " + this.addressForm.get('subject')?.value +
			"<br/> " + this.addressForm.get('body')?.value as string;

		this.addressForm.setValue({
			to: to,
			from: from,
			cc: this.addressForm.get('cc')?.value as string,
			bcc: this.addressForm.get('bcc')?.value as string,
			subject: subject,
			body: body,
			receivedDate: '',
			shipping: null,
			attachment: null
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
		let subject: string = "Fwd: " + this.addressForm.get('subject')?.value as string;
		let body: string = "<br/><br/>  -----forwarded Message-----" +
			"<br/> From: " + this.addressForm.get('from')?.value +
			"<br/> To: " + this.addressForm.get('to')?.value +
			"<br/> subject: " + this.addressForm.get('subject')?.value +
			"<br/> " + this.addressForm.get('body')?.value as string;

		this.addressForm.setValue({
			to: '',
			from: from,
			cc: '',
			bcc: '',
			subject: subject,
			body: body,
			receivedDate: '',
			shipping: null,
			attachment: null
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

	uploadedFile(file: { fileName: string, contentType: string, size: number }) {
		this.files.push(file);
		this.showUploadFile = false;
	}

	newMesssage() {
		this.newClicked.emit();
	}

	getUserName(): string {
		return <string>sessionStorage.getItem('userName');
	}

	toggleChange(event: any) {
		const toggle = event.source;
		//if (toggle && event.value.some(item => item == toggle.value)) {
		toggle.buttonToggleGroup.value = [toggle.value];
		// }
	}

	async downloadAttachment(file: MergedAttachment) {
		if (!this.messageContent) return;

		const folder = this.folder;
		const messageNumber = Number(this.messageContent.messageNumber);
		const filename = file.fileName;
		const userName = this.getUserName(); // Use getUserName() instead of form value

		try {
			const response = await this.messageDataApiService.attachment(folder, messageNumber, filename, userName).toPromise();

			// Check if we're running on a native platform (mobile)
			if (Capacitor.isNativePlatform()) {
				await this.downloadFileMobile(response as Blob, filename);
			} else {
				// Use browser download for web
				this.downloadFileWeb(response, filename);
			}
		} catch (error) {
			console.error('Error downloading attachment:', error);
			this.showToast('Error downloading file', 'danger');
		}
	}
	private downloadFileWeb(response: Blob | undefined, filename: string) {
		if (!response) {
			this.showToast('Error downloading file', 'danger');
			return;
		}
		const url = window.URL.createObjectURL(response);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		window.URL.revokeObjectURL(url);
	}

	private async downloadFileMobile(response: Blob, filename: string) {
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

			// Clean filename to be safe for filesystem
			const safePath = filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');

			let result;
			let userMessage = '';

			if (Capacitor.getPlatform() === 'android') {
				try {
					// BEST: Try External Storage Downloads folder (most accessible)
					result = await Filesystem.writeFile({
						path: `Download/${safePath}`,
						data: base64Data,
						directory: Directory.ExternalStorage,
						recursive: true
					});
					userMessage = `📁 File saved to Downloads folder: ${filename}`;
				} catch (error) {
					console.log('External storage failed, trying Documents:', error);
					// FALLBACK: App Documents folder
					result = await Filesystem.writeFile({
						path: safePath,
						data: base64Data,
						directory: Directory.Documents,
						recursive: true
					});
					userMessage = `📁 File saved to app Documents: ${filename}\nFind it in: Files app > Internal Storage > Android > data > [app] > files`;
				}
			} else if (Capacitor.getPlatform() === 'ios') {
				// iOS: Documents directory is the standard location
				result = await Filesystem.writeFile({
					path: safePath,
					data: base64Data,
					directory: Directory.Documents,
					recursive: true
				});
				userMessage = `📁 File saved: ${filename}\nFind it in: Files app > On My iPhone > [App Name]`;
			} else {
				// Fallback for other platforms
				result = await Filesystem.writeFile({
					path: safePath,
					data: base64Data,
					directory: Directory.Documents,
					recursive: true
				});
				userMessage = `📁 File saved: ${filename}`;
			}

			this.showToast(userMessage, 'success');
			console.log('File saved to:', result.uri);

		} catch (error) {
			console.error('Error saving file to device:', error);
			this.showToast('❌ Error saving file to device', 'danger');
		}
	}

	private arrayBufferToBase64(buffer: ArrayBuffer): string {
		const bytes = new Uint8Array(buffer);
		let binary = '';
		for (let i = 0; i < bytes.byteLength; i++) {
			binary += String.fromCharCode(bytes[i]);
		}
		return btoa(binary);
	}

	private blobToBase64(blob: Blob): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => {
				const result = reader.result as string;
				// Remove data URL prefix (e.g., "data:application/pdf;base64,")
				const base64 = result.split(',')[1];
				resolve(base64);
			};
			reader.onerror = reject;
			reader.readAsDataURL(blob);
		});
	}

	private async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
		const toast = await this.toastController.create({
			message: message,
			duration: 3000,
			color: color,
			position: 'bottom'
		});
		await toast.present();
	}

	toggleCcBcc() {
		this.showCcBcc = !this.showCcBcc;
	}

	private navigateToSentMessages(): void {
		// Emit event to notify parent component
		this.navigateToSent.emit();

		// Navigate to sent messages page
		this.router.navigate(['/app'], { queryParams: { folder: 'SENT' } });
	}

	private parseAttachmentsFromBody(body: string): MergedAttachment[] {
		if (!body) return [];
		const div = document.createElement('div');
		div.innerHTML = body;
		const links = div.querySelectorAll('a[href*="/api/attachment"]');
		const attachments: MergedAttachment[] = [];
		links.forEach(link => {
			const fileName = link.textContent?.trim() || '';
			// Try to find size info in the text after the link (e.g., (9.934 kB))
			let size = '';
			const next = link.nextSibling;
			if (next && next.nodeType === Node.TEXT_NODE) {
				const match = (next.textContent || '').match(/\(([^)]+)\)/);
				if (match) size = match[1];
			}
			attachments.push({ fileName, size });
		});
		return attachments;
	}

	private mergeAttachmentInfo(backend: FileItem[], parsed: MergedAttachment[]): MergedAttachment[] {
		const map = new Map<string, MergedAttachment>();
		backend.forEach(item => {
			map.set(item.fileName, { ...item });
		});
		parsed.forEach(item => {
			if (map.has(item.fileName)) {
				map.set(item.fileName, { ...map.get(item.fileName), ...item });
			} else {
				map.set(item.fileName, item);
			}
		});
		return Array.from(map.values());
	}

	private cleanBody(body: string): string {
		if (!body) return '';
		// Remove lines like: Attachment : <a ...>...</a>(size)
		// This regex removes the whole line containing the attachment link
		// Also removes any <br> before/after
		return body.replace(/(<br\s*\/?>)?\s*Attachment\s*:[^<]*<a [^>]+>[^<]+<\/a>\([^\)]+\)(<br\s*\/?>)?/gi, '');
	}

	private updateMergedAttachments() {
		const backend = this.messageContent?.attachment || [];
		const parsed = this.parseAttachmentsFromBody(this.messageContent?.body || '');
		this.mergedAttachments = this.mergeAttachmentInfo(backend, parsed);
		this.cleanedBody = this.cleanBody(this.messageContent?.body || '');
	}
}
