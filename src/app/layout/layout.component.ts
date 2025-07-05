import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {MatGridListModule} from '@angular/material/grid-list';
import { BannerComponent } from '../banner/banner.component';
import { FoldersComponent } from '../folders/folders.component';
import { MessageListComponent } from '../message-list/message-list.component';
import { ActivatedRoute, RouterOutlet } from '@angular/router';
import {DomSanitizer} from '@angular/platform-browser';
import {MatIconRegistry, MatIconModule} from '@angular/material/icon';
import { IonicModule } from '@ionic/angular';
import { MailMessageComponent } from '../mail-message/mail-message.component';
import { MessageActionService } from '../mail-message/message-action.service';
import { LoginApiService } from '../logicService/login-api.service';
import { Router } from '@angular/router';

const EXIT_ICON =  
'<svg class="w-[20px] h-[20px] text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">' +
  ' <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" d="M18 14v4.833A1.166 1.166 0 0 1 16.833 20H5.167A1.167 1.167 0 0 1 4 18.833V7.167A1.166 1.166 0 0 1 5.167 6h4.618m4.447-2H20v5.768m-7.889 2.121 7.778-7.778"/>' + 
'</svg>';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, IonicModule, MatIconModule,MatGridListModule,FoldersComponent ,MessageListComponent ,BannerComponent,RouterOutlet],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css',
})
export class LayoutComponent implements OnInit {
	
  title = 'Inbox';
  isComposing = false;
  currentMessageSubject: string | null = null;
  selectionModeActive = false;
  selectionCount = 0;
  private messageListComponent: MessageListComponent | undefined;
  @ViewChild(MailMessageComponent) mailMessageComponent?: MailMessageComponent;

	constructor(
    private route: ActivatedRoute,
    private iconRegistry: MatIconRegistry, 
    private sanitizer: DomSanitizer,
    private messageActionService: MessageActionService,
    private loginApiService: LoginApiService,
    private router: Router
  ) {
    // Note that we provide the icon here as a string literal here due to a limitation in
    // Stackblitz. If you want to provide the icon from a URL, you can use:
    // `iconRegistry.addSvgIcon('thumbs-up', sanitizer.bypassSecurityTrustResourceUrl('icon.svg'));`
    //iconRegistry.addSvgIconLiteral('thumbs-up', sanitizer.bypassSecurityTrustHtml(THUMBUP_ICON));
    iconRegistry.addSvgIconLiteral('exit', sanitizer.bypassSecurityTrustHtml(EXIT_ICON));
  }

  ngOnInit() {
    this.route.queryParamMap.subscribe(params => {
      const folder = params.get('folder');
      if (folder) {
        // Capitalize the first letter and make the rest lowercase
        this.title = folder.charAt(0).toUpperCase() + folder.slice(1).toLowerCase();
      } else {
        this.title = 'Inbox'; // Default title
      }
    });
  }

  onActivate(component: any) {
    if (component instanceof MessageListComponent) {
      this.messageListComponent = component;
      // Subscribe to selection changes
      this.messageListComponent.selectionChange.subscribe(
        ({ isActive, count }) => {
          this.selectionModeActive = isActive;
          this.selectionCount = count;
        }
      );
      // Subscribe to active message subject changes
      this.messageListComponent.activeMessageSubject.subscribe(subject => {
        // console.log('🔍 Layout - onActivate - Active message subject:', subject);
        this.currentMessageSubject = subject;
      });
      // Subscribe to compose mode changes
      this.messageListComponent.composeModeChange.subscribe(isComposing => {
        this.isComposing = isComposing;
      });
    }
  }

  onComposeClick() {
    if (this.messageListComponent) {
      this.messageListComponent.addNewTab('New Message');
    }
  }

  onMenuWillOpen() {
    const focusedElement = document.activeElement as HTMLElement;
    if (focusedElement) {
      focusedElement.blur();
    }
  }

  closeMessageView() {
    if (this.messageListComponent) {
      this.messageListComponent.closeCurrentMessage();
      this.messageListComponent.resetCurrentMessage();
    }
  }

  //-- Selection Mode Methods --//

  toggleSelectAll() {
    if (this.messageListComponent) {
      this.messageListComponent.toggleSelectAll();
    }
  }

  areAllMessagesSelected() {
    if (this.messageListComponent) {
      return this.messageListComponent.areAllMessagesSelected();
    }
    return false;
  }

  clearSelectionMode() {
    if (this.messageListComponent) {
      // We will create this method in the message-list component next
      this.messageListComponent.clearSelectionMode();
    }
  }

  archiveSelected() {
    if (this.messageListComponent) {
      // We will create this method in the message-list component next
      this.messageListComponent.archiveSelectedMessages();
    }
  }

  deleteSelected() {
    if (this.messageListComponent) {
      // We will create this method in the message-list component next
      this.messageListComponent.deleteSelectedMessages();
    }
  }


  deleteCurrentMessage() {
    if (this.messageListComponent) {
      const messageId = this.messageListComponent.currentMsgId;
      if (messageId) {
        this.messageListComponent.selectedMessages.clear();
        this.messageListComponent.selectedMessages.add(messageId);
        this.messageListComponent.deleteSelectedMessages();
        this.closeMessageView(); // Return to the list view after deletion
      }
    }
  }

  saveMessage() {
    this.messageActionService.triggerSave();
  }

  logOut() {
    this.loginApiService.logout().subscribe({
      next: (response) => {
        sessionStorage.clear();
        this.router.navigate(['/']);
      },
      error: (err) => {
        sessionStorage.clear();
        this.router.navigate(['/']);
      }
    });
  }

}
