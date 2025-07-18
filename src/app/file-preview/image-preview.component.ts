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
      this.fileUrl
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
    const extension = this.fileName
      .toLowerCase()
      .substring(this.fileName.lastIndexOf('.'));

    console.log(
      'Detecting file type for:',
      this.fileName,
      'Extension:',
      extension
    );

    // Image files - comprehensive list
    const imageExtensions = [
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.bmp',
      '.webp',
      '.svg',
      '.ico',
      '.tiff',
      '.tif',
      '.heic',
      '.heif',
      '.avif',
      '.jxl',
      '.raw',
      '.cr2',
      '.nef',
      '.arw',
    ];
    this.isImageFile = imageExtensions.includes(extension);

    // PDF files
    this.isPdfFile = extension === '.pdf';

    // Video files
    const videoExtensions = [
      '.mp4',
      '.avi',
      '.mov',
      '.wmv',
      '.flv',
      '.webm',
      '.mkv',
      '.m4v',
      '.3gp',
      '.ogv',
    ];
    this.isVideoFile = videoExtensions.includes(extension);

    // Audio files
    const audioExtensions = [
      '.mp3',
      '.wav',
      '.flac',
      '.aac',
      '.ogg',
      '.wma',
      '.m4a',
      '.opus',
      '.amr',
    ];
    this.isAudioFile = audioExtensions.includes(extension);

    // Text files - comprehensive list
    const textExtensions = [
      // Plain text
      '.txt',
      '.md',
      '.markdown',
      '.rst',
      '.tex',
      '.rtf',
      // Code files
      '.js',
      '.ts',
      '.jsx',
      '.tsx',
      '.html',
      '.htm',
      '.css',
      '.scss',
      '.sass',
      '.less',
      '.xml',
      '.json',
      '.yaml',
      '.yml',
      '.toml',
      '.ini',
      '.cfg',
      '.conf',
      '.config',
      '.py',
      '.pyw',
      '.java',
      '.c',
      '.cpp',
      '.cc',
      '.cxx',
      '.h',
      '.hpp',
      '.cs',
      '.php',
      '.rb',
      '.go',
      '.rs',
      '.swift',
      '.kt',
      '.scala',
      '.pl',
      '.sh',
      '.bash',
      '.zsh',
      '.ps1',
      '.bat',
      '.cmd',
      '.sql',
      '.r',
      '.m',
      '.matlab',
      '.dart',
      '.lua',
      '.vbs',
      // Data files
      '.csv',
      '.tsv',
      '.log',
      '.out',
      '.err',
      '.debug',
      '.trace',
      // Documentation
      '.readme',
      '.license',
      '.changelog',
      '.version',
      '.gitignore',
      '.gitattributes',
      // Web
      '.sitemap',
      '.robots',
      '.htaccess',
      '.htpasswd',
      '.manifest',
      '.webmanifest',
      // Config
      '.env',
      '.env.local',
      '.env.production',
      '.env.development',
      '.dockerfile',
      '.dockerignore',
      '.gitmodules',
      '.editorconfig',
    ];
    this.isTextFile = textExtensions.includes(extension);

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
    const extension = this.fileName
      .toLowerCase()
      .substring(this.fileName.lastIndexOf('.'));

    // Documents
    if (['.pdf'].includes(extension)) return 'document-text-outline';
    if (['.doc', '.docx', '.odt', '.rtf'].includes(extension))
      return 'document-outline';
    if (['.xls', '.xlsx', '.ods', '.csv'].includes(extension))
      return 'grid-outline';
    if (['.ppt', '.pptx', '.odp'].includes(extension)) return 'easel-outline';

    // Archives
    if (
      ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz'].includes(extension)
    )
      return 'archive-outline';

    // Audio
    if (
      ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a'].includes(
        extension
      )
    )
      return 'musical-notes-outline';

    // Video
    if (
      [
        '.mp4',
        '.avi',
        '.mov',
        '.wmv',
        '.flv',
        '.webm',
        '.mkv',
        '.m4v',
      ].includes(extension)
    )
      return 'videocam-outline';

    // Images
    if (
      [
        '.jpg',
        '.jpeg',
        '.png',
        '.gif',
        '.bmp',
        '.webp',
        '.svg',
        '.ico',
        '.tiff',
        '.tif',
      ].includes(extension)
    )
      return 'image-outline';

    // Code files
    if (
      [
        '.js',
        '.ts',
        '.jsx',
        '.tsx',
        '.html',
        '.htm',
        '.css',
        '.scss',
        '.sass',
        '.less',
        '.xml',
        '.json',
        '.yaml',
        '.yml',
      ].includes(extension)
    )
      return 'code-slash-outline';
    if (
      [
        '.py',
        '.java',
        '.c',
        '.cpp',
        '.cc',
        '.cxx',
        '.cs',
        '.php',
        '.rb',
        '.go',
        '.rs',
        '.swift',
        '.kt',
        '.scala',
      ].includes(extension)
    )
      return 'code-outline';
    if (['.sh', '.bash', '.zsh', '.ps1', '.bat', '.cmd'].includes(extension))
      return 'terminal-outline';
    if (['.sql'].includes(extension)) return 'server-outline';

    // Data files
    if (['.csv', '.tsv', '.log', '.out', '.err'].includes(extension))
      return 'analytics-outline';

    // Configuration
    if (
      [
        '.ini',
        '.cfg',
        '.conf',
        '.config',
        '.env',
        '.gitignore',
        '.dockerfile',
      ].includes(extension)
    )
      return 'settings-outline';

    // Text files
    if (['.txt', '.md', '.markdown', '.readme', '.license'].includes(extension))
      return 'document-text-outline';

    return 'document-outline';
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
    if (!this.isImageFile) return;
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max(0.1, Math.min(5, this.zoom + delta));
    this.zoom = newZoom;
  }

  onMouseDown(event: MouseEvent) {
    if (!this.isImageFile) return;
    this.isDragging = true;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
  }

  onMouseMove(event: MouseEvent) {
    if (!this.isImageFile || !this.isDragging) return;

    const deltaX = event.clientX - this.lastX;
    const deltaY = event.clientY - this.lastY;

    this.panX += deltaX / this.zoom;
    this.panY += deltaY / this.zoom;

    this.lastX = event.clientX;
    this.lastY = event.clientY;
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
    const a = document.createElement('a');
    a.href = this.fileUrl;
    a.download = this.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async openInBrowser() {
    try {
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
      if (this.isNative) {
        // Use native PDF viewer on mobile
        await this.openNativePdfViewer();
      } else if (this.isMobile) {
        // Use Capacitor Browser for mobile web
        const pdfJsViewerUrl =
          'https://mozilla.github.io/pdf.js/web/viewer.html';
        const encodedUrl = encodeURIComponent(this.fileUrl);
        const fullViewerUrl = `${pdfJsViewerUrl}?file=${encodedUrl}`;
        await Browser.open({ url: fullViewerUrl });
      } else {
        // Use native browser for desktop
        const pdfJsViewerUrl =
          'https://mozilla.github.io/pdf.js/web/viewer.html';
        const encodedUrl = encodeURIComponent(this.fileUrl);
        const fullViewerUrl = `${pdfJsViewerUrl}?file=${encodedUrl}`;
        window.open(fullViewerUrl, '_blank');
      }
    } catch (error) {
      console.error('Error opening PDF viewer:', error);
      // Fallback to browser
      this.openInBrowser();
    }
  }

  async openNativePdfViewer() {
    try {
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
    } catch (error) {
      console.error('Error opening native PDF viewer:', error);
      // Fallback to browser
      this.openInBrowser();
    }
  }

  getFileTypeDescription(): string {
    const extension = this.fileName
      .toLowerCase()
      .substring(this.fileName.lastIndexOf('.'));

    // Documents
    if (['.doc', '.docx', '.odt'].includes(extension))
      return 'Microsoft Word document. Open with Word or compatible application.';
    if (['.xls', '.xlsx', '.ods'].includes(extension))
      return 'Spreadsheet file. Open with Excel or compatible application.';
    if (['.ppt', '.pptx', '.odp'].includes(extension))
      return 'Presentation file. Open with PowerPoint or compatible application.';

    // Archives
    if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(extension))
      return 'Compressed archive file. Extract to view contents.';

    // Audio
    if (['.mp3', '.wav', '.flac', '.aac', '.ogg'].includes(extension))
      return 'Audio file. Play with media player application.';

    // Video
    if (
      ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'].includes(
        extension
      )
    )
      return 'Video file. Play with media player application.';

    // Executables
    if (['.exe', '.msi', '.dmg', '.pkg', '.deb', '.rpm'].includes(extension))
      return 'Executable file. Run with appropriate permissions.';

    // Database
    if (['.db', '.sqlite', '.mdb', '.accdb'].includes(extension))
      return 'Database file. Open with database management application.';

    // CAD/Design
    if (
      ['.dwg', '.dxf', '.skp', '.blend', '.max', '.ma', '.mb'].includes(
        extension
      )
    )
      return 'CAD/Design file. Open with specialized design software.';

    // Fonts
    if (['.ttf', '.otf', '.woff', '.woff2', '.eot'].includes(extension))
      return 'Font file. Install to use in applications.';

    // 3D/Modeling
    if (['.obj', '.fbx', '.dae', '.3ds', '.stl'].includes(extension))
      return '3D model file. Open with 3D modeling software.';

    // GIS/Maps
    if (['.shp', '.kml', '.kmz', '.gpx'].includes(extension))
      return 'Geographic data file. Open with GIS or mapping application.';

    // Virtual Machines
    if (['.vmdk', '.vdi', '.vhd', '.ova', '.ovf'].includes(extension))
      return 'Virtual machine file. Open with virtualization software.';

    // Disk Images
    if (['.iso', '.img', '.dmg'].includes(extension))
      return 'Disk image file. Mount or burn to media.';

    return 'This file type cannot be previewed directly. Download to open with appropriate application.';
  }

  close() {
    this.closePreview.emit();
    this.modalController.dismiss();
  }
}
