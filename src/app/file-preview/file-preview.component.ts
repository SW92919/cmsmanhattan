import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { PDFViewer } from '@nadlowebagentur/capacitor-pdf-viewer';
import { addIcons } from 'ionicons';
import {
  removeOutline,
  refreshOutline,
  addOutline,
  closeOutline,
  documentTextOutline,
  open,
  downloadOutline,
  alertCircleOutline,
  musicalNotesOutline,
  imageOutline,
  codeSlashOutline,
  codeOutline,
  terminalOutline,
  serverOutline,
  analyticsOutline,
  settingsOutline,
  archiveOutline,
  videocamOutline,
  easelOutline,
  gridOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-file-preview',
  standalone: true,
  imports: [CommonModule, IonicModule, MatIconModule, MatButtonModule],
  templateUrl: './file-preview.component.html',
  styleUrls: ['./file-preview.component.css'],
})
export class FilePreviewComponent implements OnInit, OnDestroy {
  @Input() fileUrl: string = '';
  @Input() fileName: string = '';
  @Input() isLocalFile: boolean = false; // Flag to indicate if this is a local file
  @Input() filePath: string = ''; // Path used to save the file in filesystem
  @Input() backendParams?: {
    folder: string;
    messageNumber: number;
    filename: string;
    userName: string;
    apiUrl: string;
  }; // Backend parameters for direct URL construction
  @Output() closePreview = new EventEmitter<void>();

  // Image zoom/pan properties
  zoom: number = 1;
  panX: number = 0;
  panY: number = 0;
  isDragging: boolean = false;
  lastX: number = 0;
  lastY: number = 0;

  // File type detection
  isImageFile: boolean = false;
  isPdfFile: boolean = false;
  isTextFile: boolean = false;
  isVideoFile: boolean = false;
  isAudioFile: boolean = false;
  isDocumentFile: boolean = false; // For .doc, .docx, .xls, .xlsx, etc.

  // State
  isLoading: boolean = true;
  hasError: boolean = false;
  pdfError: boolean = false;
  textContent: string = '';
  safeFileUrl: SafeResourceUrl = '';
  pdfViewerUrl: SafeResourceUrl = '';
  cleanupBlobUrl: string | null = null; // To store blob URL for cleanup

  constructor(
    private modalController: ModalController,
    private sanitizer: DomSanitizer
  ) {
    // Register all the icons used in this component
    addIcons({
      'remove-outline': removeOutline,
      'refresh-outline': refreshOutline,
      'add-outline': addOutline,
      'close-outline': closeOutline,
      'document-text-outline': documentTextOutline,
      open: open,
      'download-outline': downloadOutline,
      'alert-circle-outline': alertCircleOutline,
      'musical-notes-outline': musicalNotesOutline,
      'image-outline': imageOutline,
      'code-slash-outline': codeSlashOutline,
      'code-outline': codeOutline,
      'terminal-outline': terminalOutline,
      'server-outline': serverOutline,
      'analytics-outline': analyticsOutline,
      'settings-outline': settingsOutline,
      'archive-outline': archiveOutline,
      'videocam-outline': videocamOutline,
      'easel-outline': easelOutline,
      'grid-outline': gridOutline,
    });
  }

  // Platform detection
  get isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  get isMobile(): boolean {
    // Check if we're in mobile simulation mode in dev tools
    const isMobileSimulation =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

    return this.isNative || isMobileSimulation;
  }

  get isDesktop(): boolean {
    return !this.isMobile;
  }

  ngOnInit() {
    console.log(
      'FilePreviewComponent ngOnInit - fileName:',
      this.fileName,
      'fileUrl:',
      this.fileUrl,
      'isLocalFile:',
      this.isLocalFile,
      'filePath:',
      this.filePath,
      'isNative:',
      this.isNative,
      'isMobile:',
      this.isMobile
    );
    this.detectFileType();

    // Handle local files on mobile platforms
    if (this.isLocalFile && this.isNative) {
      console.log(
        'Calling handleLocalFileOnMobile - isLocalFile and isNative are true'
      );
      this.handleLocalFileOnMobile();
    } else if (this.isLocalFile && !this.isNative && this.isMobile) {
      // For mobile simulation in browser with local files
      console.log(
        'Mobile simulation with local file detected, using standard handling'
      );
      this.safeFileUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
        this.fileUrl
      );
    } else {
      console.log(
        'Using standard file URL handling - isLocalFile:',
        this.isLocalFile,
        'isNative:',
        this.isNative,
        'isMobile:',
        this.isMobile
      );
      this.safeFileUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
        this.fileUrl
      );
    }

    // Start loading timeout as fallback
    this.startLoadingTimeout();

    // For PDFs, set up PDF.js viewer
    if (this.isPdfFile) {
      this.setupPdfViewer();
    }

    // For text files, load content immediately
    if (this.isTextFile) {
      this.loadTextContent();
    }
    // For non-image files, set loading to false after a short delay
    // since they don't have load events that fire reliably
    else if (!this.isImageFile && !this.isVideoFile && !this.isAudioFile) {
      setTimeout(() => {
        if (this.isLoading) {
          console.log(
            'Setting loading to false for non-media file:',
            this.fileName
          );
          this.isLoading = false;
        }
      }, 1000);
    }
  }

  private async handleLocalFileOnMobile() {
    try {
      console.log('Handling local file on mobile:', this.fileUrl);

      // Guard: Only proceed if this is actually a local file
      if (!this.isLocalFile) {
        console.log(
          'handleLocalFileOnMobile called but isLocalFile is false, using standard handling'
        );
        this.safeFileUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
          this.fileUrl
        );
        return;
      }

      // This method should only be called for native mobile with local files
      // Mobile simulation is handled in ngOnInit

      // Import Filesystem here to avoid circular dependency issues
      const { Filesystem, Directory } = await import('@capacitor/filesystem');

      // Try to read the file as base64
      const pathToRead =
        this.filePath ||
        this.fileUrl.replace('file://', '').replace('content://', '');
      console.log('Attempting to read file from path:', pathToRead);

      const result = await Filesystem.readFile({
        path: pathToRead,
        directory: Directory.Cache,
      });

      // Convert base64 to blob URL
      const base64Data = result.data as string;
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: this.getMimeType() });
      const blobUrl = URL.createObjectURL(blob);

      console.log('Created blob URL for local file:', blobUrl);
      this.safeFileUrl = this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl);

      // Clean up blob URL when component is destroyed
      this.cleanupBlobUrl = blobUrl;
    } catch (error) {
      console.error('Error handling local file on mobile:', error);

      // Fallback: try to use the original URL directly
      console.log('Falling back to original URL');
      this.safeFileUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
        this.fileUrl
      );
    }
  }

  private getMimeType(): string {
    const extension = this.fileName
      .toLowerCase()
      .substring(this.fileName.lastIndexOf('.'));
    const mimeTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
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
    };
    return mimeTypes[extension] || 'application/octet-stream';
  }

  private setupPdfViewer() {
    try {
      // For PDFs, we show options instead of direct preview
      console.log('Setting up PDF viewer options for:', this.fileName);

      // Set loading to false immediately since we're showing options
      this.isLoading = false;

      // Log platform info for debugging
      console.log(
        'PDF setup - isNative:',
        this.isNative,
        'isLocalFile:',
        this.isLocalFile,
        'filePath:',
        this.filePath
      );
    } catch (error) {
      console.error('Error setting up PDF viewer:', error);
      this.pdfError = true;
      this.isLoading = false;
    }
  }

  private async createPdfDataUrl() {
    try {
      console.log('Creating PDF data URL for:', this.fileName);

      // Fetch the PDF data
      const response = await fetch(this.fileUrl);
      const blob = await response.blob();

      // Convert to data URL
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        this.pdfViewerUrl =
          this.sanitizer.bypassSecurityTrustResourceUrl(dataUrl);
        console.log('PDF data URL created successfully');
      };

      reader.onerror = () => {
        console.error('Error creating PDF data URL');
        this.pdfError = true;
        this.isLoading = false;
      };

      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Error creating PDF data URL:', error);
      this.pdfError = true;
      this.isLoading = false;
    }
  }

  detectFileType() {
    const lastDotIndex = this.fileName.lastIndexOf('.');
    if (lastDotIndex === -1) {
      // No extension found, set all to false
      this.isImageFile = false;
      this.isPdfFile = false;
      this.isTextFile = false;
      this.isVideoFile = false;
      this.isAudioFile = false;
      return;
    }

    const extension: string = this.fileName
      .toLowerCase()
      .substring(lastDotIndex);

    console.log(
      'Detecting file type for:',
      this.fileName,
      'Extension:',
      extension
    );

    // Reset all flags first
    this.isImageFile = false;
    this.isPdfFile = false;
    this.isVideoFile = false;
    this.isAudioFile = false;
    this.isTextFile = false;
    this.isDocumentFile = false;

    // Check file types using switch statement
    switch (extension) {
      // Image files
      case '.jpg':
      case '.jpeg':
      case '.png':
      case '.gif':
      case '.bmp':
      case '.webp':
      case '.svg':
      case '.ico':
      case '.tiff':
      case '.tif':
      case '.heic':
      case '.heif':
      case '.avif':
      case '.jxl':
      case '.raw':
      case '.cr2':
      case '.nef':
      case '.arw':
        this.isImageFile = true;
        break;

      // PDF files
      case '.pdf':
        this.isPdfFile = true;
        break;

      // Video files
      case '.mp4':
      case '.avi':
      case '.mov':
      case '.wmv':
      case '.flv':
      case '.webm':
      case '.mkv':
      case '.m4v':
      case '.3gp':
      case '.ogv':
        this.isVideoFile = true;
        break;

      // Audio files
      case '.mp3':
      case '.wav':
      case '.flac':
      case '.aac':
      case '.ogg':
      case '.wma':
      case '.m4a':
      case '.opus':
      case '.amr':
        this.isAudioFile = true;
        break;
      // Document files (Office, etc.)
      case '.doc':
      case '.docx':
      case '.odt':
      case '.xls':
      case '.xlsx':
      case '.ods':
      case '.ppt':
      case '.pptx':
      case '.odp':
        this.isDocumentFile = true;
        break;

      // Text files
      case '.txt':
      case '.md':
      case '.markdown':
      case '.rst':
      case '.tex':
      case '.rtf':
      // Code files
      case '.js':
      case '.ts':
      case '.jsx':
      case '.tsx':
      case '.html':
      case '.htm':
      case '.css':
      case '.scss':
      case '.sass':
      case '.less':
      case '.xml':
      case '.json':
      case '.yaml':
      case '.yml':
      case '.toml':
      case '.ini':
      case '.cfg':
      case '.conf':
      case '.config':
      case '.py':
      case '.pyw':
      case '.java':
      case '.c':
      case '.cpp':
      case '.cc':
      case '.cxx':
      case '.h':
      case '.hpp':
      case '.cs':
      case '.php':
      case '.rb':
      case '.go':
      case '.rs':
      case '.swift':
      case '.kt':
      case '.scala':
      case '.pl':
      case '.sh':
      case '.bash':
      case '.zsh':
      case '.ps1':
      case '.bat':
      case '.cmd':
      case '.sql':
      case '.r':
      case '.m':
      case '.matlab':
      case '.dart':
      case '.lua':
      case '.vbs':
      // Data files
      case '.csv':
      case '.tsv':
      case '.log':
      case '.out':
      case '.err':
      case '.debug':
      case '.trace':
      // Documentation
      case '.readme':
      case '.license':
      case '.changelog':
      case '.version':
      case '.gitignore':
      case '.gitattributes':
      // Web
      case '.sitemap':
      case '.robots':
      case '.htaccess':
      case '.htpasswd':
      case '.manifest':
      case '.webmanifest':
      // Config
      case '.env':
      case '.env.local':
      case '.env.production':
      case '.env.development':
      case '.dockerfile':
      case '.dockerignore':
      case '.gitmodules':
      case '.editorconfig':
        this.isTextFile = true;
        break;
    }

    console.log('File type detection results:', {
      fileName: this.fileName,
      extension: extension,
      isImageFile: this.isImageFile,
      isPdfFile: this.isPdfFile,
      isTextFile: this.isTextFile,
      isVideoFile: this.isVideoFile,
      isAudioFile: this.isAudioFile,
    });
  }

  getFileIcon(): string {
    const lastDotIndex = this.fileName.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return 'document-outline'; // Default icon for files without extension
    }

    const extension: string = this.fileName
      .toLowerCase()
      .substring(lastDotIndex);

    switch (extension) {
      // Documents
      case '.pdf':
        return 'document-text-outline';

      case '.doc':
      case '.docx':
      case '.odt':
      case '.rtf':
        return 'document-outline';

      case '.xls':
      case '.xlsx':
      case '.ods':
      case '.csv':
        return 'grid-outline';

      case '.ppt':
      case '.pptx':
      case '.odp':
        return 'easel-outline';

      // Archives
      case '.zip':
      case '.rar':
      case '.7z':
      case '.tar':
      case '.gz':
      case '.bz2':
      case '.xz':
        return 'archive-outline';

      // Audio
      case '.mp3':
      case '.wav':
      case '.flac':
      case '.aac':
      case '.ogg':
      case '.wma':
      case '.m4a':
        return 'musical-notes-outline';

      // Video
      case '.mp4':
      case '.avi':
      case '.mov':
      case '.wmv':
      case '.flv':
      case '.webm':
      case '.mkv':
      case '.m4v':
        return 'videocam-outline';

      // Images
      case '.jpg':
      case '.jpeg':
      case '.png':
      case '.gif':
      case '.bmp':
      case '.webp':
      case '.svg':
      case '.ico':
      case '.tiff':
      case '.tif':
        return 'image-outline';

      // Code files
      case '.js':
      case '.ts':
      case '.jsx':
      case '.tsx':
      case '.html':
      case '.htm':
      case '.css':
      case '.scss':
      case '.sass':
      case '.less':
      case '.xml':
      case '.json':
      case '.yaml':
      case '.yml':
        return 'code-slash-outline';

      case '.py':
      case '.java':
      case '.c':
      case '.cpp':
      case '.cc':
      case '.cxx':
      case '.cs':
      case '.php':
      case '.rb':
      case '.go':
      case '.rs':
      case '.swift':
      case '.kt':
      case '.scala':
        return 'code-outline';

      case '.sh':
      case '.bash':
      case '.zsh':
      case '.ps1':
      case '.bat':
      case '.cmd':
        return 'terminal-outline';

      case '.sql':
        return 'server-outline';

      // Data files
      case '.tsv':
      case '.log':
      case '.out':
      case '.err':
        return 'analytics-outline';

      // Configuration
      case '.ini':
      case '.cfg':
      case '.conf':
      case '.config':
      case '.env':
      case '.gitignore':
      case '.dockerfile':
        return 'settings-outline';

      // Text files
      case '.txt':
      case '.md':
      case '.markdown':
      case '.readme':
      case '.license':
        return 'document-text-outline';

      default:
        return 'document-outline';
    }
  }

  async onFileLoad() {
    console.log('File load event fired for:', this.fileName);

    // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      this.isLoading = false;
      this.hasError = false;
    }, 0);

    // For text files, try to read the content
    if (this.isTextFile) {
      await this.loadTextContent();
    }
  }

  private async loadTextContent() {
    try {
      console.log('Loading text content for:', this.fileName);

      // For local files on mobile, we need to handle differently
      if (this.isLocalFile && this.isNative) {
        // Read directly from filesystem for mobile
        await this.loadTextFromFilesystem();
      } else {
        // For web or blob URLs, use fetch
        const response = await fetch(this.fileUrl);
        const text = await response.text();
        // Limit text content to prevent memory issues
        this.textContent =
          text.length > 10000
            ? text.substring(0, 10000) + '\n\n... (content truncated)'
            : text;
        this.isLoading = false;
        this.hasError = false;
        console.log('Text content loaded successfully for:', this.fileName);
      }
    } catch (error) {
      console.error('Error reading text file:', error);
      this.textContent = 'Unable to read file content.';
      this.isLoading = false;
      this.hasError = true;
    }
  }

  private async loadTextFromFilesystem() {
    try {
      console.log('Loading text from filesystem for:', this.fileName);

      // Import Filesystem here to avoid circular dependency issues
      const { Filesystem, Directory } = await import('@capacitor/filesystem');

      // Read the file from cache
      const result = await Filesystem.readFile({
        path: this.filePath,
        directory: Directory.Cache,
      });

      // Convert base64 to text
      const base64Data = result.data as string;
      const text = atob(base64Data);

      // Limit text content to prevent memory issues
      this.textContent =
        text.length > 10000
          ? text.substring(0, 10000) + '\n\n... (content truncated)'
          : text;
      this.isLoading = false;
      this.hasError = false;
      console.log(
        'Text content loaded from filesystem successfully for:',
        this.fileName
      );
    } catch (error) {
      console.error('Error reading text from filesystem:', error);
      this.textContent = 'Unable to read file content from filesystem.';
      this.isLoading = false;
      this.hasError = true;
    }
  }

  // Add a timeout fallback for loading
  private startLoadingTimeout() {
    setTimeout(() => {
      if (this.isLoading) {
        console.log('Loading timeout reached, setting loading to false');
        this.isLoading = false;
        // If we have a safeFileUrl but still loading, try to force load
        if (this.safeFileUrl && this.isImageFile) {
          console.log('Forcing image load completion');
          this.onFileLoad();
        }
      }
    }, 3000); // Reduced to 3 second timeout
  }

  onFileError() {
    console.log('File error event fired for:', this.fileName);

    // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      this.isLoading = false;
      this.hasError = true;
    }, 0);
  }

  onPdfError() {
    console.log('PDF error event fired for:', this.fileName);
    this.pdfError = true;
    this.isLoading = false;

    // Try alternative method if iframe failed
    if (this.pdfViewerUrl) {
      console.log('Trying alternative PDF viewing method');
      this.pdfViewerUrl = '' as SafeResourceUrl; // Clear iframe URL to trigger object tag
    }
  }

  // Image zoom/pan methods
  onWheel(event: WheelEvent) {
    if (this.isImageFile) {
      event.preventDefault();
      const delta = event.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.max(0.1, Math.min(5, this.zoom + delta));
      this.zoom = newZoom;
    }
  }

  onMouseDown(event: MouseEvent) {
    if (this.isImageFile) {
      this.isDragging = true;
      this.lastX = event.clientX;
      this.lastY = event.clientY;
    }
  }

  onMouseMove(event: MouseEvent) {
    if (this.isImageFile && this.isDragging) {
      const deltaX = event.clientX - this.lastX;
      const deltaY = event.clientY - this.lastY;

      this.panX += deltaX / this.zoom;
      this.panY += deltaY / this.zoom;

      this.lastX = event.clientX;
      this.lastY = event.clientY;
    }
  }

  onMouseUp(event: MouseEvent) {
    this.isDragging = false;
  }

  zoomIn() {
    this.zoom = Math.min(5, this.zoom + 0.2);
  }

  zoomOut() {
    this.zoom = Math.max(0.1, this.zoom - 0.2);
  }

  resetZoom() {
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
  }

  async downloadFile() {
    try {
      console.log(
        'Download file called for:',
        this.fileName,
        'isNative:',
        this.isNative,
        'isLocalFile:',
        this.isLocalFile
      );

      if (this.isNative) {
        // For native mobile, we need to use the Filesystem API to save to downloads
        if (this.isLocalFile) {
          // File is already saved locally, copy it to downloads
          await this.copyFileToDownloads();
        } else {
          // Need to download the file first, then save to downloads
          await this.downloadAndSaveToDownloads();
        }
      } else {
        // For web, use the standard download method
        const a = document.createElement('a');
        a.href = this.fileUrl;
        a.download = this.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      // Show error message to user
      this.showErrorToast('Failed to download file');
    }
  }

  private async copyFileToDownloads() {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');

      // Read the file from cache
      const result = await Filesystem.readFile({
        path: this.filePath,
        directory: Directory.Cache,
      });

      // Save to downloads directory
      const downloadPath = `Download/${this.fileName}`;
      await Filesystem.writeFile({
        path: downloadPath,
        data: result.data,
        directory: Directory.Documents,
        recursive: true,
      });

      console.log('File copied to downloads:', downloadPath);
      this.showSuccessToast('File saved to Downloads');
    } catch (error) {
      console.error('Error copying file to downloads:', error);
      throw error;
    }
  }

  private async downloadAndSaveToDownloads() {
    try {
      // Fetch the file data
      const response = await fetch(this.fileUrl);
      const blob = await response.blob();

      // Convert to base64
      const base64Data = await this.blobToBase64(blob);

      // Save to downloads
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const downloadPath = `Download/${this.fileName}`;

      await Filesystem.writeFile({
        path: downloadPath,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true,
      });

      console.log('File downloaded and saved to downloads:', downloadPath);
      this.showSuccessToast('File saved to Downloads');
    } catch (error) {
      console.error('Error downloading and saving file:', error);
      throw error;
    }
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private async showSuccessToast(message: string) {
    try {
      const { ToastController } = await import('@ionic/angular');
      const toastController = new ToastController();
      const toast = await toastController.create({
        message: message,
        duration: 2000,
        position: 'bottom',
        color: 'success',
      });
      await toast.present();
    } catch (error) {
      console.log('Toast not available, using console:', message);
    }
  }

  private async showErrorToast(message: string) {
    try {
      const { ToastController } = await import('@ionic/angular');
      const toastController = new ToastController();
      const toast = await toastController.create({
        message: message,
        duration: 3000,
        position: 'bottom',
        color: 'danger',
      });
      await toast.present();
    } catch (error) {
      console.error('Error showing toast:', message);
    }
  }

  async openInBrowser() {
    try {
      console.log(
        'Opening in browser:',
        this.fileName,
        'URL:',
        this.fileUrl,
        'isLocalFile:',
        this.isLocalFile,
        'isNative:',
        this.isNative
      );

      // Special handling for document files
      if (this.isDocumentFile) {
        await this.openDocumentInBrowser();
        return;
      }

      // Special handling for PDF files
      if (this.isPdfFile) {
        await this.openPdfInNewTab();
        return;
      }

      // For blob URLs, we can't open them directly in browser
      if (this.fileUrl.startsWith('blob:')) {
        console.log('Blob URL detected, downloading file instead');
        await this.downloadFile();
        this.showSuccessToast(
          'File downloaded. Blob URLs cannot be opened directly in browser.'
        );
        return;
      }

      if (this.isNative) {
        // For native mobile, we need to handle differently
        if (this.isLocalFile) {
          // For local files, download them first
          await this.downloadFile();
          this.showSuccessToast(
            'File downloaded. You can now open it with an external app.'
          );
        } else {
          // For remote URLs, try to open in browser
          await Browser.open({ url: this.fileUrl });
        }
      } else {
        // For web (desktop or mobile simulation), use standard methods
        if (this.isLocalFile) {
          // Local files in web - try to open directly
          window.open(this.fileUrl, '_blank');
        } else {
          // Remote URLs in web - use Capacitor Browser
          await Browser.open({ url: this.fileUrl });
        }
      }
    } catch (error) {
      console.error('Error opening in browser:', error);
      this.showErrorToast('Failed to open file in browser');
    }
  }

  private async openPdfInNewTab() {
    try {
      console.log(
        'Opening PDF in new tab:',
        this.fileName,
        'isMobile:',
        this.isMobile,
        'isNative:',
        this.isNative
      );

      // Special handling for mobile
      if (this.isMobile) {
        await this.openPdfInNewTabMobile();
        return;
      }

      // Desktop handling
      if (this.fileUrl.startsWith('blob:')) {
        // For blob URLs, create an object URL that can be opened in new tab
        console.log('Creating object URL for PDF to open in new tab');
        await this.openPdfBlobInNewTab();
      } else if (this.isLocalFile) {
        // For local files, try to open directly
        window.open(this.fileUrl, '_blank');
      } else {
        // For remote URLs, open directly
        window.open(this.fileUrl, '_blank');
      }
    } catch (error) {
      console.error('Error opening PDF in new tab:', error);
      // Fallback to download
      await this.downloadFile();
      this.showSuccessToast('File downloaded. Could not open PDF in new tab.');
    }
  }

  private async openPdfInNewTabMobile() {
    try {
      console.log('Opening PDF in new tab on mobile:', this.fileName);

      if (this.fileUrl.startsWith('blob:')) {
        // For blob URLs on mobile, try to open directly first
        console.log('Blob URL on mobile, trying to open directly');
        await this.tryOpenPdfBlobMobile();
      } else if (this.isLocalFile) {
        // For local files on mobile, try to open with system app (no download needed)
        console.log('Local file on mobile, opening with system app');
        await this.openLocalFileWithExternalApp();
      } else {
        // For remote URLs on mobile, try to open in browser
        console.log('Remote URL on mobile, opening in browser');
        await Browser.open({ url: this.fileUrl });
      }
    } catch (error) {
      console.error('Error opening PDF in new tab on mobile:', error);
      this.showErrorToast('Could not open PDF. Try downloading it instead.');
    }
  }

  private async tryOpenPdfBlobMobile() {
    try {
      console.log(
        'Trying to open PDF blob on mobile without download:',
        this.fileName
      );

      if (this.isNative) {
        // For native mobile, try to open with native PDF viewer
        console.log('Native mobile: trying to open with native PDF viewer');
        await this.openNativePdfViewer();
      } else {
        // For mobile browser, try to open in new tab first
        console.log('Mobile browser: trying to open in new tab');
        const newWindow = window.open(this.fileUrl, '_blank');

        if (newWindow) {
          this.showSuccessToast('PDF opened in new tab');
        } else {
          // If popup blocked or failed, show error
          throw new Error('Could not open PDF in new tab');
        }
      }
    } catch (error) {
      console.error('Failed to open PDF blob on mobile:', error);

      // Show user-friendly error message
      if (this.isNative) {
        this.showErrorToast('Could not open PDF. Try downloading it instead.');
      } else {
        this.showErrorToast(
          'Could not open PDF in new tab. Try downloading it instead.'
        );
      }
    }
  }

  private async openPdfBlobInNewTab() {
    try {
      console.log('Opening PDF blob in new tab using object URL');

      // Fetch the blob data
      const response = await fetch(this.fileUrl);
      const blob = await response.blob();

      // Create an object URL instead of data URL
      const objectUrl = URL.createObjectURL(blob);
      console.log('Created object URL for PDF:', objectUrl);

      // Open the object URL in a new tab
      const newWindow = window.open(objectUrl, '_blank');

      if (newWindow) {
        this.showSuccessToast('PDF opened in new tab');

        // Clean up the object URL after a delay
        setTimeout(() => {
          URL.revokeObjectURL(objectUrl);
          console.log('Cleaned up object URL');
        }, 5000);
      } else {
        // If popup was blocked, fallback to download
        URL.revokeObjectURL(objectUrl);
        await this.downloadFile();
        this.showSuccessToast('Popup blocked. File downloaded instead.');
      }
    } catch (error) {
      console.error('Error opening PDF blob in new tab:', error);
      // Fallback to download
      await this.downloadFile();
      this.showSuccessToast('File downloaded. Could not open PDF in new tab.');
    }
  }

  private async openDocumentInBrowser() {
    try {
      console.log('Opening document in browser:', this.fileName);

      if (this.isNative) {
        // For mobile, try to open with Google Docs Viewer or similar online service
        await this.openDocumentWithOnlineViewer();
      } else {
        // For web, try to open directly in browser (not Google Docs Viewer)
        await this.openDocumentDirectlyInBrowser();
      }
    } catch (error) {
      console.error('Error opening document in browser:', error);
      this.showErrorToast('Failed to open document in browser');
    }
  }

  private async openDocumentDirectlyInBrowser() {
    try {
      console.log('Opening document with system default app:', this.fileName);

      // For blob URLs, try to open directly with system app
      if (this.fileUrl.startsWith('blob:')) {
        console.log('Blob URL detected, trying to open with system app');
        await this.openBlobWithSystemApp();
        return;
      }

      // For local files, try to open with system default app
      if (this.isLocalFile) {
        // Try to open with system default application
        await this.openLocalFileWithSystemApp();
        return;
      }

      // For remote files, try to open directly first, fallback to download
      await this.openRemoteFileWithSystemApp();
    } catch (error) {
      console.error('Error opening document with system app:', error);
      // Fallback to download
      await this.downloadFile();
      this.showSuccessToast(
        "File downloaded. You can open it with your system's default application."
      );
    }
  }

  private async openLocalFileWithSystemApp() {
    try {
      console.log('Opening local file with system app:', this.filePath);

      // Create a temporary link element to trigger the system's default app
      const link = document.createElement('a');
      link.href = this.fileUrl;
      link.download = this.fileName;
      link.target = '_blank';

      // Set the MIME type to help the system choose the right app
      const mimeType = this.getMimeType();
      if (mimeType) {
        link.type = mimeType;
      }

      // Trigger the click
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      this.showSuccessToast('Opening file with system default application...');
    } catch (error) {
      console.error('Error opening local file with system app:', error);
      throw error;
    }
  }

  private async downloadAndOpenWithSystemApp() {
    try {
      console.log('Downloading and opening with system app:', this.fileName);

      // Download the file first
      await this.downloadFile();

      // Show success message with instructions
      this.showSuccessToast(
        "File downloaded. You can now open it with your system's default application from the downloads folder."
      );
    } catch (error) {
      console.error('Error downloading and opening with system app:', error);
      throw error;
    }
  }

  private async openBlobWithSystemApp() {
    try {
      console.log('Opening blob with system app:', this.fileName);

      // Fetch the blob data
      const response = await fetch(this.fileUrl);
      const blob = await response.blob();

      // Create a data URL
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        console.log('Created data URL, opening with system app');

        // Create a temporary link element to trigger the system's default app
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = this.fileName;
        link.target = '_blank';

        // Set the MIME type to help the system choose the right app
        const mimeType = this.getMimeType();
        if (mimeType) {
          link.type = mimeType;
        }

        // Trigger the click
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showSuccessToast(
          'Opening file with system default application...'
        );
      };

      reader.onerror = (error) => {
        console.error('Error creating data URL:', error);
        // Fallback to download
        this.downloadFile();
      };

      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Error opening blob with system app:', error);
      // Fallback to download
      await this.downloadFile();
    }
  }

  private async openRemoteFileWithSystemApp() {
    try {
      console.log('Opening remote file with system app:', this.fileName);

      // Try to open directly first
      const link = document.createElement('a');
      link.href = this.fileUrl;
      link.download = this.fileName;
      link.target = '_blank';

      // Set the MIME type to help the system choose the right app
      const mimeType = this.getMimeType();
      if (mimeType) {
        link.type = mimeType;
      }

      // Trigger the click
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      this.showSuccessToast('Opening file with system default application...');
    } catch (error) {
      console.error('Error opening remote file with system app:', error);
      // Fallback to download
      await this.downloadFile();
      this.showSuccessToast(
        "File downloaded. You can now open it with your system's default application from the downloads folder."
      );
    }
  }

  private async openDocumentWithOnlineViewer() {
    try {
      console.log('Opening document with online viewer:', this.fileName);

      // For mobile, we need to upload the file to a service or use Google Docs Viewer
      // Since we can't directly upload from mobile, we'll download and provide instructions
      await this.downloadFile();

      // Show instructions for opening with online viewer
      this.showSuccessToast(
        'File downloaded. You can upload it to Google Docs, Office Online, or similar online viewers.'
      );

      // Optionally, try to open Google Docs in browser
      try {
        await Browser.open({ url: 'https://docs.google.com' });
      } catch (browserError) {
        console.log('Could not open Google Docs in browser');
      }
    } catch (error) {
      console.error('Error opening document with online viewer:', error);
      throw error;
    }
  }

  async openDocumentInViewer() {
    try {
      console.log('Opening document in viewer:', this.fileName);

      if (this.isNative) {
        // For native mobile, try to open with external app
        await this.openDocumentWithExternalApp();
      } else {
        // For web, try to display in app or use online viewer
        await this.openDocumentInWeb();
      }
    } catch (error) {
      console.error('Error opening document in viewer:', error);
      this.showErrorToast('Failed to open document');
    }
  }

  private async openDocumentInWeb() {
    try {
      console.log('Opening document in web:', this.fileName);

      // Check if it's a .docx file that we can convert
      if (this.fileName.toLowerCase().endsWith('.docx')) {
        await this.convertAndDisplayDocx();
        return;
      }

      // For other document types, try Google Docs Viewer
      await this.openInGoogleDocsViewer();
    } catch (error) {
      console.error('Error opening document in web:', error);
      throw error;
    }
  }

  private async openDocumentWithExternalApp() {
    try {
      console.log('Opening document with external app:', this.fileName);

      // Check if it's a .docx file that we can convert
      if (this.fileName.toLowerCase().endsWith('.docx')) {
        await this.convertAndDisplayDocx();
        return;
      }

      // For other document types, try to open with system default app
      if (this.isLocalFile && this.filePath) {
        // Use the local file path
        await this.openLocalFileWithExternalApp();
      } else {
        // Download first, then try to open
        await this.downloadAndOpenWithExternalApp();
      }
    } catch (error) {
      console.error('Error opening document with external app:', error);
      // Fallback to download
      await this.downloadFile();
      this.showSuccessToast(
        'File downloaded. You can open it with an external app.'
      );
    }
  }

  private async convertAndDisplayDocx() {
    try {
      console.log('Converting DOCX to HTML for display');

      // Import mammoth for DOCX conversion
      const mammoth = await import('mammoth');

      let docxData: string;

      if (this.isLocalFile && this.filePath) {
        // Read from filesystem
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        const result = await Filesystem.readFile({
          path: this.filePath,
          directory: Directory.Cache,
        });
        docxData = result.data as string;
      } else {
        // Fetch from blob URL
        const response = await fetch(this.fileUrl);
        const arrayBuffer = await response.arrayBuffer();
        docxData = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      }

      // Convert base64 to array buffer
      const binaryString = atob(docxData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const arrayBuffer = bytes.buffer;

      // Convert DOCX to HTML
      const result = await mammoth.default.convertToHtml({ arrayBuffer });
      const html = result.value;

      // Display the HTML content
      this.textContent = html;
      this.isTextFile = true;
      this.isDocumentFile = false;

      console.log('DOCX converted and displayed successfully');
      this.showSuccessToast('Document converted and displayed');
    } catch (error) {
      console.error('Error converting DOCX:', error);
      // Fallback to download
      await this.downloadFile();
      this.showSuccessToast(
        'File downloaded. You can open it with Microsoft Word or compatible app.'
      );
    }
  }

  private async openLocalFileWithExternalApp() {
    try {
      console.log('Opening local file with external app:', this.filePath);

      // Get the full URI for the file
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const result = await Filesystem.getUri({
        path: this.filePath,
        directory: Directory.Cache,
      });

      console.log('File URI for external app:', result.uri);

      // Try to open with system default app using Capacitor Browser
      // Note: This might not work on all devices, but it's worth trying
      await Browser.open({ url: result.uri });
    } catch (error) {
      console.error('Error opening local file with external app:', error);
      throw error;
    }
  }

  private async downloadAndOpenWithExternalApp() {
    try {
      console.log(
        'Downloading and opening document with external app:',
        this.fileName
      );

      // Download the file first
      await this.downloadFile();

      // Show success message
      this.showSuccessToast(
        'File downloaded. You can open it with an external app from your downloads folder.'
      );
    } catch (error) {
      console.error('Error downloading and opening with external app:', error);
      throw error;
    }
  }

  private async openInGoogleDocsViewer() {
    try {
      // For blob URLs, we need to create a data URL first
      if (this.fileUrl.startsWith('blob:')) {
        console.log(
          'Blob URL detected, creating data URL for Google Docs Viewer'
        );
        await this.openBlobInGoogleDocsViewer();
        return;
      }

      // Create a Google Docs Viewer URL
      const encodedUrl = encodeURIComponent(this.fileUrl);
      const googleDocsUrl = `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`;

      console.log('Opening in Google Docs Viewer:', googleDocsUrl);

      if (this.isMobile) {
        // Use Capacitor Browser for mobile
        await Browser.open({ url: googleDocsUrl });
      } else {
        // Use window.open for desktop with popup blocker handling
        const newWindow = window.open(googleDocsUrl, '_blank');

        // Check if popup was blocked
        if (
          !newWindow ||
          newWindow.closed ||
          typeof newWindow.closed === 'undefined'
        ) {
          console.log('Popup blocked, trying alternative approach');
          this.handlePopupBlocked(googleDocsUrl);
        } else {
          console.log('Google Docs Viewer opened successfully');
        }
      }
    } catch (error) {
      console.error('Error opening in Google Docs Viewer:', error);
      // Fallback to download
      await this.downloadFile();
    }
  }

  private async openBlobInGoogleDocsViewer() {
    try {
      console.log('Using alternative approach for document viewing');

      // The backend URL requires authentication, so Google Docs Viewer cannot access it directly
      // We'll use a different approach based on file type

      if (this.fileName.toLowerCase().endsWith('.docx')) {
        // For .docx files, convert and display in the app
        console.log('Converting DOCX to HTML for display');
        await this.convertAndDisplayDocx();
        return;
      }

      // For other document types, download and provide instructions
      console.log('Downloading document and providing viewing instructions');
      await this.downloadFile();

      // Show success message with instructions
      this.showSuccessToast(
        'File downloaded. You can open it with Microsoft Word, Google Docs, or other compatible applications.'
      );

      // Also try to open Google Docs in a new tab for easy upload
      try {
        const googleDocsUrl = 'https://docs.google.com';
        const newWindow = window.open(googleDocsUrl, '_blank');

        if (newWindow) {
          this.showSuccessToast(
            'Opened Google Docs. You can upload the downloaded file there.'
          );
        } else {
          this.showSuccessToast(
            'File downloaded. Open Google Docs manually to upload the file.'
          );
        }
      } catch (error) {
        console.log('Could not open Google Docs:', error);
        this.showSuccessToast(
          'File downloaded. Open Google Docs manually to upload the file.'
        );
      }
    } catch (error) {
      console.error('Error with alternative viewer:', error);
      // Fallback to simple download
      await this.downloadFile();
      this.showSuccessToast('File downloaded successfully.');
    }
  }

  private async constructDirectBackendUrl(): Promise<string | null> {
    try {
      console.log('Constructing direct backend URL for:', this.fileName);

      // Check if we have backend parameters
      if (!this.backendParams) {
        console.log('No backend parameters available');
        return null;
      }

      // Construct the direct backend URL
      const { folder, messageNumber, filename, userName, apiUrl } =
        this.backendParams;

      // Create the direct backend URL
      const directUrl = `${apiUrl}attachment?folder=${encodeURIComponent(
        folder
      )}&messageNumber=${messageNumber}&filename=${encodeURIComponent(
        filename
      )}&userName=${encodeURIComponent(userName)}`;

      console.log('Constructed direct backend URL:', directUrl);

      return directUrl;
    } catch (error) {
      console.error('Error constructing direct backend URL:', error);
      return null;
    }
  }

  private handlePopupBlocked(url: string) {
    console.log('Popup blocked, providing user with options');

    // Show user-friendly message about popup blocker
    this.showErrorToast(
      'Popup blocked. Please allow popups for this site or click the link below.'
    );

    // Create a visible link that user can click manually
    const linkContainer = document.createElement('div');
    linkContainer.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border: 2px solid #007bff;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      text-align: center;
      max-width: 400px;
    `;

    linkContainer.innerHTML = `
      <h3 style="margin: 0 0 15px 0; color: #333;">Document Viewer</h3>
      <p style="margin: 0 0 15px 0; color: #666;">
        Your browser blocked the popup. Click the link below to open the document:
      </p>
      <a href="${url}" target="_blank" style="
        display: inline-block;
        background: #007bff;
        color: white;
        padding: 10px 20px;
        text-decoration: none;
        border-radius: 4px;
        margin: 0 10px;
      ">Open Document</a>
      <button onclick="this.parentElement.remove()" style="
        background: #6c757d;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 4px;
        cursor: pointer;
        margin: 0 10px;
      ">Close</button>
    `;

    document.body.appendChild(linkContainer);

    // Auto-remove after 30 seconds
    setTimeout(() => {
      if (document.body.contains(linkContainer)) {
        document.body.removeChild(linkContainer);
      }
    }, 30000);
  }

  async openPdfJsViewer() {
    try {
      console.log(
        'Opening PDF viewer:',
        this.fileName,
        'isNative:',
        this.isNative,
        'isMobile:',
        this.isMobile,
        'isLocalFile:',
        this.isLocalFile
      );

      if (this.isNative) {
        // Use native PDF viewer on mobile
        await this.openNativePdfViewer();
      } else {
        if (this.isMobile) {
          // For mobile web, try to open directly first
          await this.openPdfViewerMobile();
        } else {
          // For desktop, try to open directly first
          await this.openPdfViewerDesktop();
        }
      }
    } catch (error) {
      console.error('Error opening PDF viewer:', error);
      this.showErrorToast(
        'Could not open PDF viewer. Try downloading it instead.'
      );
    }
  }

  private async openPdfViewerMobile() {
    try {
      console.log('Opening PDF viewer on mobile web:', this.fileName);

      if (this.isLocalFile) {
        // For local files, open directly in browser
        await Browser.open({ url: this.fileUrl });
        this.showSuccessToast('PDF opened in browser');
      } else if (this.fileUrl.startsWith('blob:')) {
        // For blob URLs, use in-app PDF viewer (like desktop)
        await this.openPdfInApp();
      } else {
        // For remote URLs, try to open with PDF.js viewer
        await this.openPdfJsViewerOnline();
      }
    } catch (error) {
      console.error('Error opening PDF viewer on mobile web:', error);
      this.showErrorToast(
        'Could not open PDF viewer. Try downloading it instead.'
      );
    }
  }

  private async openPdfViewerDesktop() {
    try {
      console.log('Opening PDF viewer on desktop:', this.fileName);

      if (this.isLocalFile) {
        // For local files, open directly in browser
        window.open(this.fileUrl, '_blank');
        this.showSuccessToast('PDF opened in browser');
      } else if (this.fileUrl.startsWith('blob:')) {
        // For blob URLs, use in-app PDF viewer
        await this.openPdfInApp();
      } else {
        // For remote URLs, try to open with online PDF.js viewer
        await this.openPdfJsViewerOnline();
      }
    } catch (error) {
      console.error('Error opening PDF viewer on desktop:', error);
      this.showErrorToast(
        'Could not open PDF viewer. Try downloading it instead.'
      );
    }
  }

  private async openPdfInApp() {
    try {
      console.log('Opening PDF in-app on desktop:', this.fileName);

      if (this.fileUrl.startsWith('blob:')) {
        // For blob URLs, create object URL for in-app viewing
        const response = await fetch(this.fileUrl);
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);

        // Set the PDF viewer URL for in-app display
        this.pdfViewerUrl =
          this.sanitizer.bypassSecurityTrustResourceUrl(objectUrl);

        // Show the PDF in the current modal instead of new tab
        this.showSuccessToast('PDF opened in viewer');

        // Clean up object URL when component is destroyed
        this.cleanupBlobUrl = objectUrl;
      } else {
        // For remote URLs, use directly
        this.pdfViewerUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
          this.fileUrl
        );
        this.showSuccessToast('PDF opened in viewer');
      }
    } catch (error) {
      console.error('Error opening PDF in-app:', error);
      throw error;
    }
  }

  private async openPdfJsViewerOnline() {
    try {
      console.log('Opening PDF with online PDF.js viewer:', this.fileName);

      // Check if it's a blob URL (which won't work with external PDF.js)
      if (this.fileUrl.startsWith('blob:')) {
        console.log('Blob URL detected, cannot use external PDF.js viewer');
        throw new Error(
          'Blob URLs cannot be accessed by external PDF.js viewer'
        );
      }

      // Use PDF.js viewer for both desktop and mobile
      const pdfJsViewerUrl = 'https://mozilla.github.io/pdf.js/web/viewer.html';
      const encodedUrl = encodeURIComponent(this.fileUrl);
      const fullViewerUrl = `${pdfJsViewerUrl}?file=${encodedUrl}`;

      if (this.isDesktop) {
        // For desktop, open in new tab
        window.open(fullViewerUrl, '_blank');
        this.showSuccessToast('PDF opened in online viewer');
      } else {
        // For mobile, use Capacitor Browser
        await Browser.open({ url: fullViewerUrl });
        this.showSuccessToast('PDF opened in online viewer');
      }
    } catch (error) {
      console.error('Error opening PDF.js viewer:', error);
      throw error;
    }
  }

  private async tryOpenPdfDirectly() {
    try {
      console.log('Trying to open PDF directly on desktop:', this.fileName);

      if (this.fileUrl.startsWith('blob:')) {
        // For blob URLs, create object URL and open
        const response = await fetch(this.fileUrl);
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);

        const newWindow = window.open(objectUrl, '_blank');

        if (newWindow) {
          this.showSuccessToast('PDF opened in browser');

          // Clean up object URL after delay
          setTimeout(() => {
            URL.revokeObjectURL(objectUrl);
          }, 5000);
        } else {
          throw new Error('Could not open PDF in new window');
        }
      } else {
        // For remote URLs, try to open directly
        window.open(this.fileUrl, '_blank');
        this.showSuccessToast('PDF opened in browser');
      }
    } catch (error) {
      console.error('Error opening PDF directly:', error);
      throw error;
    }
  }

  private async downloadAndOpenPdf() {
    try {
      console.log('Downloading PDF for desktop viewing:', this.fileName);

      // Download the PDF file
      const response = await fetch(this.fileUrl);
      const blob = await response.blob();

      // Create a data URL instead of blob URL for better compatibility
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        console.log('Created data URL for PDF, opening in new tab');

        // Open the data URL directly in a new tab
        window.open(dataUrl, '_blank');
      };

      reader.onerror = (error) => {
        console.error('Error creating data URL:', error);
        // Fallback to direct browser opening
        window.open(this.fileUrl, '_blank');
      };

      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Error downloading PDF for desktop viewing:', error);
      // Fallback to direct browser opening
      window.open(this.fileUrl, '_blank');
    }
  }

  async openNativePdfViewer() {
    try {
      console.log(
        'Opening native PDF viewer for:',
        this.fileName,
        'URL:',
        this.fileUrl,
        'isLocalFile:',
        this.isLocalFile,
        'filePath:',
        this.filePath
      );

      // For mobile, we need to use the filesystem path
      if (this.isLocalFile && this.filePath) {
        // Use the local file path directly
        console.log('Using local file path for PDF viewer:', this.filePath);

        // Create a file:// URL from the filesystem path
        const { Filesystem, Directory } = await import('@capacitor/filesystem');

        // Get the full URI for the file
        const result = await Filesystem.getUri({
          path: this.filePath,
          directory: Directory.Cache,
        });

        console.log('PDF file URI:', result.uri);

        await PDFViewer.open({
          url: result.uri,
          title: this.fileName,
        });

        this.showSuccessToast('PDF opened in native viewer');
      } else {
        // For non-local files, try to open directly first
        console.log('Trying to open PDF directly with native viewer');
        await this.tryOpenPdfNativeDirectly();
      }
    } catch (error) {
      console.error('Error opening native PDF viewer:', error);
      // Show more specific error message
      if (error instanceof Error && error.message?.includes('corrupted')) {
        console.error('PDF appears to be corrupted or invalid');
      }
      this.showErrorToast(
        'Could not open PDF in native viewer. Try downloading it instead.'
      );
    }
  }

  private async tryOpenPdfNativeDirectly() {
    try {
      console.log(
        'Trying to open PDF directly with native viewer:',
        this.fileName
      );

      if (this.fileUrl.startsWith('blob:')) {
        // For blob URLs, try to open directly with native viewer
        console.log('Blob URL detected, trying to open directly');
        await PDFViewer.open({
          url: this.fileUrl,
          title: this.fileName,
        });
        this.showSuccessToast('PDF opened in native viewer');
      } else {
        // For remote URLs, try to open directly
        console.log('Remote URL detected, trying to open directly');
        await PDFViewer.open({
          url: this.fileUrl,
          title: this.fileName,
        });
        this.showSuccessToast('PDF opened in native viewer');
      }
    } catch (error) {
      console.error('Failed to open PDF directly with native viewer:', error);

      // Only download if direct opening fails
      console.log('Direct opening failed, downloading for native viewer');
      await this.downloadAndOpenPdfNative();
    }
  }

  private async downloadAndOpenPdfNative() {
    try {
      console.log('Downloading PDF for native viewing:', this.fileName);

      // Download the PDF file
      const response = await fetch(this.fileUrl);
      const blob = await response.blob();

      // Convert to base64
      const base64Data = await this.blobToBase64(blob);

      // Save to cache directory
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const pdfPath = `pdf_${Date.now()}_${this.fileName.replace(
        /[^a-zA-Z0-9.\-_]/g,
        '_'
      )}`;

      await Filesystem.writeFile({
        path: pdfPath,
        data: base64Data,
        directory: Directory.Cache,
        recursive: true,
      });

      // Get the URI and open with PDF viewer
      const result = await Filesystem.getUri({
        path: pdfPath,
        directory: Directory.Cache,
      });

      console.log(
        'PDF saved to cache, opening with native viewer:',
        result.uri
      );

      await PDFViewer.open({
        url: result.uri,
        title: this.fileName,
      });

      // Clean up the temporary file after a delay
      setTimeout(async () => {
        try {
          await Filesystem.deleteFile({
            path: pdfPath,
            directory: Directory.Cache,
          });
          console.log('Temporary PDF file cleaned up:', pdfPath);
        } catch (cleanupError) {
          console.warn('Could not clean up temporary PDF file:', cleanupError);
        }
      }, 30000); // Clean up after 30 seconds
    } catch (error) {
      console.error('Error downloading and opening PDF natively:', error);
      throw error;
    }
  }

  getFileTypeDescription(): string {
    const lastDotIndex = this.fileName.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return 'This file type cannot be previewed directly. Download to open with appropriate application.';
    }

    const extension: string = this.fileName
      .toLowerCase()
      .substring(lastDotIndex);

    switch (extension) {
      // Documents
      case '.doc':
      case '.docx':
      case '.odt':
        return 'Microsoft Word document. Open with Word or compatible application.';

      case '.xls':
      case '.xlsx':
      case '.ods':
        return 'Spreadsheet file. Open with Excel or compatible application.';

      case '.ppt':
      case '.pptx':
      case '.odp':
        return 'Presentation file. Open with PowerPoint or compatible application.';

      // Archives
      case '.zip':
      case '.rar':
      case '.7z':
      case '.tar':
      case '.gz':
        return 'Compressed archive file. Extract to view contents.';

      // Audio
      case '.mp3':
      case '.wav':
      case '.flac':
      case '.aac':
      case '.ogg':
        return 'Audio file. Play with media player application.';

      // Video
      case '.mp4':
      case '.avi':
      case '.mov':
      case '.wmv':
      case '.flv':
      case '.webm':
      case '.mkv':
        return 'Video file. Play with media player application.';

      // Executables
      case '.exe':
      case '.msi':
      case '.dmg':
      case '.pkg':
      case '.deb':
      case '.rpm':
        return 'Executable file. Run with appropriate permissions.';

      // Database
      case '.db':
      case '.sqlite':
      case '.mdb':
      case '.accdb':
        return 'Database file. Open with database management application.';

      // CAD/Design
      case '.dwg':
      case '.dxf':
      case '.skp':
      case '.blend':
      case '.max':
      case '.ma':
      case '.mb':
        return 'CAD/Design file. Open with specialized design software.';

      // Fonts
      case '.ttf':
      case '.otf':
      case '.woff':
      case '.woff2':
      case '.eot':
        return 'Font file. Install to use in applications.';

      // 3D/Modeling
      case '.obj':
      case '.fbx':
      case '.dae':
      case '.3ds':
      case '.stl':
        return '3D model file. Open with 3D modeling software.';

      // GIS/Maps
      case '.shp':
      case '.kml':
      case '.kmz':
      case '.gpx':
        return 'Geographic data file. Open with GIS or mapping application.';

      // Virtual Machines
      case '.vmdk':
      case '.vdi':
      case '.vhd':
      case '.ova':
      case '.ovf':
        return 'Virtual machine file. Open with virtualization software.';

      // Disk Images
      case '.iso':
      case '.img':
        // case '.dmg':
        return 'Disk image file. Mount or burn to media.';

      default:
        return 'This file type cannot be previewed directly. Download to open with appropriate application.';
    }
  }

  ngOnDestroy() {
    // Clean up blob URL if it exists
    if (this.cleanupBlobUrl) {
      URL.revokeObjectURL(this.cleanupBlobUrl);
      this.cleanupBlobUrl = null;
    }
  }

  close() {
    this.closePreview.emit();
    this.modalController.dismiss();
    // Clean up blob URL if it exists
    if (this.cleanupBlobUrl) {
      URL.revokeObjectURL(this.cleanupBlobUrl);
      this.cleanupBlobUrl = null;
    }
  }

  closePdfViewer() {
    // Clear the PDF viewer URL to show options again
    this.pdfViewerUrl = '';

    // Clean up blob URL if it exists
    if (this.cleanupBlobUrl) {
      URL.revokeObjectURL(this.cleanupBlobUrl);
      this.cleanupBlobUrl = null;
    }

    this.showSuccessToast('PDF viewer closed');
  }
}
