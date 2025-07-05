import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';  

@Component({
  selector: 'app-file-display',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-display.component.html',
  styleUrl: './file-display.component.css'
})
export class FileDisplayComponent {
	
	@Input() files!: Array<string | { fileName: string, contentType?: string, size?: number }>;
    
	getFileName(file: any): string {
		return (file && typeof file === 'object' && file.fileName) ? file.fileName : String(file);
	}
}
