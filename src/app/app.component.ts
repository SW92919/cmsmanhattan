import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';
import { addIcons } from 'ionicons';
import { 
  archive, trash, createOutline, checkmarkCircleOutline, archiveOutline, trashOutline, closeOutline, arrowBackOutline,
  mailOutline, sendOutline, documentTextOutline, alertCircleOutline, arrowUpOutline, attachOutline, saveOutline,
  arrowUndoOutline, arrowRedoOutline, logOutOutline, logOut, eyeOutline, eyeOffOutline, downloadOutline, documentOutline,
  chevronUpOutline, chevronDownOutline, contrastOutline, star, starOutline
} from 'ionicons/icons';
import { ThemeService } from './theme.service';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet,LayoutComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'webmail';

  constructor(private themeService: ThemeService) {
    addIcons({ 
      archive, trash, createOutline, checkmarkCircleOutline, archiveOutline, trashOutline, closeOutline, arrowBackOutline,
      mailOutline, sendOutline, documentTextOutline, alertCircleOutline, arrowUpOutline, attachOutline, saveOutline,
      arrowUndoOutline, arrowRedoOutline, logOutOutline, logOut, eyeOutline, eyeOffOutline, downloadOutline, documentOutline,
      chevronUpOutline, chevronDownOutline, contrastOutline, star, starOutline
    });
  }
}
