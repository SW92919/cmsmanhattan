import { Component, ElementRef, inject, Input, OnInit, ViewChild, OnDestroy, EventEmitter, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Platform } from '@angular/cdk/platform';
import { IonicModule } from '@ionic/angular';

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
import { Editor, NgxEditorModule,  toHTML } from 'ngx-editor';
import { SendApiService } from '../sendService/send-api.service';
import { MailMessageSendRequest } from '../sendService/new-message-api-request';
import { FileUploadComponent } from '../file-upload/file-upload.component';
import { FileDisplayComponent } from '../file-display/file-display.component';
import { MatIconModule} from '@angular/material/icon';
import { MessageContentResponse, FileItem } from '../messageDataService/mail-message-api-response';
import { MessageActionService } from './message-action.service';
import { Subscription } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { ToastController } from '@ionic/angular';

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
	files: string[] = [];
	@Output() removeTab = new EventEmitter();
	@Output() newClicked = new EventEmitter<void>();
	@Output() messageSent = new EventEmitter<void>();
	
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
	hasPriorityButton: boolean = false;
	showSendFields: boolean = false;
	messageContent: MessageContentResponse['mailMessage'] | null = null;
	isMobile: boolean = false;

	isReplyMode = false;
	isForwardMode = false;
	showCcBcc = false;

	private saveSub?: Subscription;

	constructor(private messageDataApiService: MessageDataApiService, private sendApiService: SendApiService, private platform: Platform, private messageActionService: MessageActionService, private toastController: ToastController) { }

	ngOnChanges(changes: SimpleChanges): void {
		if (changes['messageNumber'] && changes['messageNumber'].currentValue !== changes['messageNumber'].previousValue) {
			this.fetchMessage();
		}
	}

	ngOnInit(): void {
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
			this.hasPriorityButton = true;
			this.showSendFields = true;
		} else {
			this.hasTo = false;
			this.hasSubject = false;
			this.hasBody = false;
			this.hasSubmitButton = false;
			this.hasPriorityButton = false;
			this.showSendFields = false;
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
							shipping: null
						});
					} else {
						this.messageContent = null;
						this.addressForm.reset();
						console.error('[fetchMessage] No mailMessage in response:', messageContentResponse);
					}
				},
				error: err => {
					this.messageContent = null;
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
		shipping: ['free', Validators.required]
	});

	hasBcc = false;
	hasCc = false;
	hasTo = false;
	hasSubject = false;
	hasBody = false;
	showUploadFile = false ;
	
	covertToAttachment( file:string[] ): FileItem[]{
		let attachment: FileItem[] = [];
		file.forEach(element => {
			attachment.push({contentType:'',fileName:element, file:{path:'',name:''},charset:'',saved:false});
		});
		
		return attachment;
	}

	onSubmit(): void {
		this.isReplyMode = false;
		this.isForwardMode = false;
		// console.log('🔍 MailMessage - Submitting message...');
		let editorValue = this.addressForm.get('body')?.value;
		let htmlBody = '';
		if (typeof editorValue === 'string') {
			htmlBody = editorValue;
		} else if (editorValue && this.editor && this.editor.schema) {
			htmlBody = toHTML(editorValue, this.editor.schema);
		} else {
			htmlBody = '';
		}
		
		const sendRequest = {
			messageNumber: "",
			to: this.addressForm.get('to')?.value as string,
			from: this.addressForm.get('from')?.value as string,
			cc: this.addressForm.get('cc')?.value as string,
			bcc: this.addressForm.get('bcc')?.value as string,
			subject: this.addressForm.get('subject')?.value as string,
			body: htmlBody,
			receivedDate: this.addressForm.get('receivedDate')?.value as string,
			html:true,
			attachment: this.covertToAttachment(this.files) 
		};
		
		// console.log('🔍 MailMessage - Sending message with request:', sendRequest);
		
		this.sendApiService.sendMail(sendRequest).subscribe(response => {
			// console.log("🔍 MailMessage - Message sent successfully:", response);
			// console.log("🔍 MailMessage - Current folder context:", this.folder);
			this.saveMessage();
			this.closeTab();
			this.messageSent.emit();
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
			shipping: null
		});

		this.hasTo = true;
		this.hasSubject = true;
		this.hasBody = true;
		this.hasSubmitButton = true;
		this.hasPriorityButton = true;
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
			shipping: null
		});
		
		this.hasTo = true;
		this.hasSubject = true;
		this.hasBody = true;
		this.hasSubmitButton = true;
		this.hasPriorityButton = true;
		this.showSendFields = true;
	}

	saveMessage(): void {
		this.hasTo = false;
		this.hasCc = false;
		this.hasBcc = false;
		this.hasSubject = false;
		this.hasBody = false;
		this.hasSubmitButton = false;
		this.hasPriorityButton = false;
		this.showSendFields = false;
		this.ngOnInit();
	}

	deleteMessage(): void {
		alert('Are you sure delete the message ?');
	}

	moveMessage(): void {
		alert('Are you sure move the message ?');
	}

	attachFile()
	{
	this.showUploadFile = true ;
	}

    uploadedFile( fileName: string ){
		this.files.push(fileName);
		this.showUploadFile = false ;
		//this.files.length
	}

	newMesssage() {
		this.newClicked.emit();
	}

	getUserName(): string {
		return <string>sessionStorage.getItem('userName');
	}
	
	toggleChange(event:any) {
	    const toggle = event.source;
	    //if (toggle && event.value.some(item => item == toggle.value)) {
	        toggle.buttonToggleGroup.value = [toggle.value];
	   // }
	}

	async downloadAttachment(file: FileItem) {
		if (!this.messageContent) return;
		
		const folder = this.folder;
		const messageNumber = Number(this.messageContent.messageNumber);
		const filename = file.fileName;
		const userName = this.addressForm.get('to')?.value as string;
		
		try {
			const response = await this.messageDataApiService.attachment(folder, messageNumber, filename, userName).toPromise();
			
			// Check if we're running on a native platform (mobile)
			if (Capacitor.isNativePlatform()) {
				await this.downloadFileMobile(response, filename);
			} else {
				// Use browser download for web
				this.downloadFileWeb(response, filename);
			}
		} catch (error) {
			console.error('Error downloading attachment:', error);
			this.showToast('Error downloading file', 'danger');
		}
	}

	private downloadFileWeb(response: any, filename: string) {
		const blob = new Blob([response as any]);
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		window.URL.revokeObjectURL(url);
	}

	private async downloadFileMobile(response: any, filename: string) {
		try {
			// Convert response to base64 if it's not already
			let base64Data: string;
			if (typeof response === 'string') {
				base64Data = response;
			} else if (response instanceof ArrayBuffer) {
				base64Data = this.arrayBufferToBase64(response);
			} else if (response instanceof Blob) {
				base64Data = await this.blobToBase64(response);
			} else {
				throw new Error('Unsupported response format');
			}

			// Write file to device
			const result = await Filesystem.writeFile({
				path: filename,
				data: base64Data,
				directory: Directory.Documents,
				recursive: true
			});

			this.showToast(`File saved: ${filename}`, 'success');
			console.log('File saved to:', result.uri);
		} catch (error) {
			console.error('Error saving file to device:', error);
			this.showToast('Error saving file to device', 'danger');
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

}
