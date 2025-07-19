import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
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
export class FilePreviewComponent implements OnInit {
  @Input() fileUrl: string = '';
  @Input() fileName: string = '';
  @Input() isLocalFile: boolean = false; // Flag to indicate if this is a local file
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

  // State
  isLoading: boolean = true;
  hasError: boolean = false;
  pdfError: boolean = false;
  textContent: string = '';
  safeFileUrl: SafeResourceUrl = '';
  pdfViewerUrl: SafeResourceUrl = '';

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
    return (
      this.isNative ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      )
    );
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
      this.isLocalFile
    );
    this.detectFileType();
    this.safeFileUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      this.fileUrl
    );

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

  private setupPdfViewer() {
    try {
      // For PDFs, skip iframe attempt and go straight to options
      console.log('Setting up PDF viewer options for:', this.fileName);
      this.isLoading = false;
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
    this.isLoading = false;
    this.hasError = false;

    // For text files, try to read the content
    if (this.isTextFile) {
      await this.loadTextContent();
    }
  }

  private async loadTextContent() {
    try {
      console.log('Loading text content for:', this.fileName);
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
    } catch (error) {
      console.error('Error reading text file:', error);
      this.textContent = 'Unable to read file content.';
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
      }
    }, 5000); // 5 second timeout
  }

  onFileError() {
    console.log('File error event fired for:', this.fileName);
    this.isLoading = false;
    this.hasError = true;
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

  downloadFile() {
    if (this.isLocalFile) {
      // For local files, we need to handle differently on mobile
      if (this.isNative) {
        // On native platforms, the file is already saved, just show a message
        console.log('File is already saved locally:', this.fileUrl);
        // You could implement a share functionality here
      } else {
        // For web, try to download the local file
        const a = document.createElement('a');
        a.href = this.fileUrl;
        a.download = this.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } else {
      // For blob URLs, use the standard download method
      const a = document.createElement('a');
      a.href = this.fileUrl;
      a.download = this.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
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
        this.isLocalFile
      );

      if (this.isNative || this.isMobile) {
        // Use Capacitor Browser for mobile
        await Browser.open({ url: this.fileUrl });
      } else {
        // Use native browser for desktop
        window.open(this.fileUrl, '_blank');
      }
    } catch (error) {
      console.error('Error opening in browser:', error);
      // Fallback to window.open
      window.open(this.fileUrl, '_blank');
    }
  }

  async openPdfJsViewer() {
    try {
      const isNativePlatform = this.isNative;
      const isMobilePlatform = this.isMobile;
      const isLocalFileFlag = this.isLocalFile;

      if (isNativePlatform) {
        // Use native PDF viewer on mobile
        await this.openNativePdfViewer();
      } else {
        if (isMobilePlatform) {
          // For mobile web, if it's a local file, open directly
          if (isLocalFileFlag) {
            await Browser.open({ url: this.fileUrl });
          } else {
            // Use Capacitor Browser for mobile web with PDF.js
            const pdfJsViewerUrl =
              'https://mozilla.github.io/pdf.js/web/viewer.html';
            const encodedUrl = encodeURIComponent(this.fileUrl);
            const fullViewerUrl = `${pdfJsViewerUrl}?file=${encodedUrl}`;
            await Browser.open({ url: fullViewerUrl });
          }
        } else {
          // For desktop, handle both local and remote files
          if (isLocalFileFlag) {
            // For local files, open directly in browser
            window.open(this.fileUrl, '_blank');
          } else {
            // For remote files, download first then open
            await this.downloadAndOpenPdf();
          }
        }
      }
    } catch (error) {
      console.error('Error opening PDF viewer:', error);
      // Fallback to browser
      this.openInBrowser();
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
        this.isLocalFile
      );

      // If it's already a local file, use it directly
      if (this.isLocalFile) {
        await PDFViewer.open({
          url: this.fileUrl,
          title: this.fileName,
        });
      } else {
        // Download the PDF first to get a local path
        const response = await fetch(this.fileUrl);
        const blob = await response.blob();

        // Create a temporary file URL
        const fileUrl = URL.createObjectURL(blob);

        // Open with native PDF viewer
        await PDFViewer.open({
          url: fileUrl,
          title: this.fileName,
        });
      }
    } catch (error) {
      console.error('Error opening native PDF viewer:', error);
      // Show more specific error message
      if (error instanceof Error && error.message?.includes('corrupted')) {
        console.error('PDF appears to be corrupted or invalid');
      }
      // Fallback to browser
      this.openInBrowser();
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
      case '.dmg':
        return 'Disk image file. Mount or burn to media.';

      default:
        return 'This file type cannot be previewed directly. Download to open with appropriate application.';
    }
  }

  close() {
    this.closePreview.emit();
    this.modalController.dismiss();
  }
}
