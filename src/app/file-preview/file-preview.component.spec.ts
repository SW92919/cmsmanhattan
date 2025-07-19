import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FilePreviewComponent } from './file-preview.component';

describe('FilePreviewComponent', () => {
  let component: FilePreviewComponent;
  let fixture: ComponentFixture<FilePreviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FilePreviewComponent,
        IonicModule.forRoot(),
        MatIconModule,
        MatButtonModule,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FilePreviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should detect image files correctly', () => {
    component.fileName = 'test.png';
    component.detectFileType();
    expect(component.isImageFile).toBe(true);
    expect(component.isPdfFile).toBe(false);
  });

  it('should detect PDF files correctly', () => {
    component.fileName = 'document.pdf';
    component.detectFileType();
    expect(component.isPdfFile).toBe(true);
    expect(component.isImageFile).toBe(false);
  });

  it('should get correct file icon for PDF', () => {
    component.fileName = 'document.pdf';
    const icon = component.getFileIcon();
    expect(icon).toBe('document-text-outline');
  });

  it('should get correct file icon for image', () => {
    component.fileName = 'image.jpg';
    const icon = component.getFileIcon();
    expect(icon).toBe('image-outline');
  });

  it('should detect platform correctly', () => {
    expect(component.isNative).toBeDefined();
    expect(component.isMobile).toBeDefined();
    expect(component.isDesktop).toBeDefined();
  });

  it('should handle zoom controls', () => {
    component.zoom = 1;
    component.zoomIn();
    expect(component.zoom).toBe(1.1);

    component.zoomOut();
    expect(component.zoom).toBe(1);

    component.resetZoom();
    expect(component.zoom).toBe(1);
    expect(component.panX).toBe(0);
    expect(component.panY).toBe(0);
  });
});
