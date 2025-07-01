import {Component, OnInit, Output, EventEmitter} from '@angular/core';
import {MatDividerModule} from '@angular/material/divider';
import {MatIconModule} from '@angular/material/icon';
import {DatePipe} from '@angular/common';
import {MatListModule} from '@angular/material/list';
import {MatBadgeModule} from '@angular/material/badge';
import {FoldersApiService } from '../folderService/folders-api.service';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {CommonModule } from '@angular/common';  
import { ActivatedRoute } from '@angular/router';
import { Router , NavigationExtras } from '@angular/router';
import { RouterModule } from '@angular/router';
import { LoginApiService } from '../logicService/login-api.service';
import { IonicModule } from '@ionic/angular';
import { ThemeService } from '../theme.service';

export interface Section {
  name: string;
  updated: Date;
}

@Component({
  selector: 'app-folders',
  styleUrl: './folders.component.css',
  templateUrl: './folders.component.html',
  standalone: true,
  imports: [CommonModule, IonicModule, MatListModule, MatIconModule, MatDividerModule, DatePipe,MatBadgeModule,MatButtonToggleModule,RouterModule],

  
})
export class FoldersComponent implements OnInit{
    
    currentFolder:string = 'Inbox' ;

    folders: Section[] = [] ;
    @Output() logout = new EventEmitter<void>();
    
	constructor(
		private foldersApiService: FoldersApiService, 
		private loginApiService: LoginApiService, 
		private route: ActivatedRoute,   
		private router: Router,
		public themeService: ThemeService
	) { 
		
	}
    ngOnInit(): void {
		let folder = this.route.snapshot.queryParamMap.get('folder');
		if(folder === '' || folder == null ) {
      this.currentFolder = 'Inbox';
    } else {
      this.currentFolder = folder.charAt(0).toUpperCase() + folder.slice(1).toLowerCase();
    }
		
		this.foldersApiService.getAllFolderList().subscribe(folderResponse => {
      this.folders = []; // Clear the array before repopulating
		  for (let i = 0; i < folderResponse.length; i++) {
        const originalName = folderResponse[i].name;
        // Format the name to Title Case
        const formattedName = originalName.charAt(0).toUpperCase() + originalName.slice(1).toLowerCase();
			  this.folders.push({
			      name: formattedName,
			      updated: new Date(),
			    })
			}
      })
  }

  notes: Section[] = [
    {
      name: 'Vacation Itinerary',
      updated: new Date('2/20/16'),
    },
    {
      name: 'Kitchen Remodel',
      updated: new Date('1/18/16'),
    },
  ];
  
  getUserName(): string {
  	return this.loginApiService.getUserName() ;
  }
  
  getFolderName(): string {
		return this.currentFolder;
	}

  setFolderName(folderName: string) {
		// console.log('🔍 Folders - Setting folder to:', folderName);
		this.currentFolder = folderName;
		// console.log('🔍 Folders - Navigating to /app with folder param:', folderName.toUpperCase());
		this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
			this.router.navigate(
			    ['/app'],
          // Convert to uppercase for the backend API
			    { queryParams: { folder: folderName.toUpperCase() } }
			  )
		});
	}

  getIconForFolder(folderName: string): string {
    const lowerCaseName = folderName.toLowerCase();
    switch (lowerCaseName) {
      case 'inbox':
        return 'mail-outline';
      case 'sent':
        return 'send-outline';
      case 'drafts':
        return 'document-text-outline';
      case 'outbox':
        return 'arrow-up-outline';
      case 'spam':
        return 'alert-circle-outline';
      case 'archive':
        return 'archive-outline';
      case 'trash':
        return 'trash-outline';
      default:
        return 'folder-outline'; // A fallback icon
    }
  }

  applyDarkMode(isDark: boolean) {
    if (isDark) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }

}
