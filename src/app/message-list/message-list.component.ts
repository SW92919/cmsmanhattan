import { AfterViewInit, Component, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { MatTableModule, MatTable , MatTableDataSource} from '@angular/material/table';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MessageListDataSource, MessageListItem } from './message-list-datasource';
import {MatCardModule} from '@angular/material/card';

import { MatCheckboxModule} from '@angular/material/checkbox';
import { SelectionModel} from '@angular/cdk/collections';

import { MatTabsModule} from '@angular/material/tabs';
import { MatButtonToggleModule} from '@angular/material/button-toggle';

import { MailMessageComponent } from '../mail-message/mail-message.component';
import { ActivatedRoute } from '@angular/router';
import { MessageListApiService } from '../messageListService/message-list-api.service';
import { DeleteMessageRequest, MessageListRequest, MoveMessageRequest, SearchMessageRequest } from '../messageListService/message-list-api-request';
import { FormControl } from '@angular/forms';
import { MatDividerModule} from '@angular/material/divider';
import { MatIconModule} from '@angular/material/icon';
import {Router} from '@angular/router';
import { CommonModule } from '@angular/common';  
import { DialogMoveMessagesComponent } from '../dialog-move-messages/dialog-move-messages.component';
import { UtilsApiService } from '../utilsService/utils-api.service';
import { IonicModule, IonInfiniteScroll, IonItemSliding } from '@ionic/angular';

export interface PeriodicElement {
  name: string;
  position: number;
  weight: number;
  symbol: string;
}



@Component({
  selector: 'app-message-list',
  templateUrl: './message-list.component.html',
  styleUrl: './message-list.component.css',
  standalone: true,
  imports: [IonicModule, DialogMoveMessagesComponent,CommonModule,MatIconModule ,MatTableModule, MatPaginatorModule, MatSortModule,MatCardModule,MatCheckboxModule,MatTabsModule,MatButtonToggleModule,MailMessageComponent,MatDividerModule]
})
export class MessageListComponent implements AfterViewInit   {
	
  @Output() selectionChange = new EventEmitter<{isActive: boolean, count: number}>();
  @Output() activeMessageSubject = new EventEmitter<string | null>();
  @Output() composeModeChange = new EventEmitter<boolean>();
  selectionMode = false;
  selectedMessages = new Set<number>();
	
  currentFolder:string = '' ;
  currentMsgId:number = 0 ;
  tabs = [''];
  selected = new FormControl(0); 
  tabInex:number = 0 ;

  	
   constructor(private route: ActivatedRoute , private messageListApiService: MessageListApiService , private  utilsApiService: UtilsApiService , private router: Router){
   }
   
  
 

  @ViewChild(IonInfiniteScroll) infiniteScroll!: IonInfiniteScroll;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatTable) table!: MatTable<MessageListItem>;
  dataSource = new MessageListDataSource();

  /** Columns displayed in the table. Columns IDs can be added, removed, or reordered. */
  displayedColumns: string[] = ['id', 'name','receivedDate','size','attachment'];
  //dataSource = new MatTableDataSource<PeriodicElement>(ELEMENT_DATA);
  selection = new SelectionModel<PeriodicElement>(true, []);
  
  length = 50;
  pageSize = 20;
  pageIndex = 0;
  pageSizeOptions = [20, 40, 60];
  
  // Avatar color palette
  private readonly AVATAR_COLORS: string[] = [
    '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
    '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50',
    '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800',
    '#FF5722', '#14B8C9', '#795548','#607D8B'
  ];

  // Hash function to map email to a number
  private hashStringToNumber(str: string, max: number): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % max;
  }

  // Public method to get avatar color for an email
  public getAvatarColor(email: string): string {
    const index = this.hashStringToNumber(email, this.AVATAR_COLORS.length);
    return this.AVATAR_COLORS[index];
  }
  
  ngAfterViewInit(): void {
    
     let folder = this.route.snapshot.queryParamMap.get('folder');
     if(folder === '' || folder == null ) folder = 'Inbox' ;
     this.currentFolder = folder as string ;
    //  console.log('🔍 MessageList - Initial folder from route:', folder);
    //  console.log('🔍 MessageList - Current folder set to:', this.currentFolder);
     this.dataSource.data = [] ;
     this.pageIndex = 0; // Reset page index for initial load
     this.messageListApiService.setSortOrder('1').subscribe(() => {
       this.utilsApiService.getMessageCount(folder).subscribe(response => {
         this.length = Number(response);
        //  console.log('🔍 MessageList - Message count for folder:', folder, 'is:', this.length);
         let startMsgNumber = (this.pageIndex * this.pageSize) + 1 ; 
         let lastMsgNumber = (this.pageIndex * this.pageSize)  + this.pageSize  ;
         if ( lastMsgNumber > this.length ) lastMsgNumber = this.length ;
        //  console.log('🔍 MessageList - Fetching messages from', startMsgNumber, 'to', lastMsgNumber, 'for folder:', folder);
         this.messageListApiService.listMessages(
           {
             startMsgNumber:startMsgNumber , 
             lastMsgNumber:lastMsgNumber ,
             folder:""+folder
           }
         ).subscribe(messageListResponse => {
          //  console.log('🔍 MessageList - Received', messageListResponse.messageList.length, 'messages for folder:', folder);
           for (let i = 0; i < messageListResponse.messageList.length; i++) {
            //  console.log('🔍 MessageList - Message', i+1, ':', {
            //    id: messageListResponse.messageList[i].messageNumber,
            //    from: messageListResponse.messageList[i].from,
            //    subject: messageListResponse.messageList[i].subject,
            //    folder: folder
            //  });
             this.dataSource.data.push({
               id:  Number(messageListResponse.messageList[i].messageNumber),
               from: messageListResponse.messageList[i].from,
               name:  messageListResponse.messageList[i].subject,
               receivedDate:  messageListResponse.messageList[i].receivedDate,
               attachment:  messageListResponse.messageList[i].attachment != null && messageListResponse.messageList[i].attachment.length > 0  ,
               size:  messageListResponse.messageList[i].size,
               status:messageListResponse.messageList[i].status,
               priority:'nornal'
             })
           }
           
           this.dataSource.sort = this.sort;
           this.dataSource.paginator = this.paginator;
           this.table.dataSource = this.dataSource;
         })
       })
     })
  }
  
  handlePageEvent(event: PageEvent) {
    this.length = event.length;
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    
		 let startMsgNumber = (this.pageIndex * this.pageSize) + 1 ; 
		 let lastMsgNumber = (this.pageIndex * this.pageSize)  + this.pageSize  ;
		 if ( lastMsgNumber > this.length ) lastMsgNumber = this.length ;
		 this.messageListApiService.listMessages(
			{
				startMsgNumber:startMsgNumber , 
				lastMsgNumber:lastMsgNumber ,
				folder:this.currentFolder
			}
			).subscribe(messageListResponse => {
				this.dataSource.data = [] ;	
				for (let i = 0; i < messageListResponse.messageList.length; i++) {
					  // console.log(messageListResponse.messageList[i]);
					  this.dataSource.data.push({
					      id:  Number(messageListResponse.messageList[i].messageNumber),
					      from: messageListResponse.messageList[i].from,
					      name:  messageListResponse.messageList[i].subject,
					      receivedDate:  messageListResponse.messageList[i].receivedDate,
					      attachment:  messageListResponse.messageList[i].attachment != null && messageListResponse.messageList[i].attachment.length > 0  ,
					      size:  messageListResponse.messageList[i].size,
					      status:messageListResponse.messageList[i].status,
					      priority:'nornal'
					    })
					}
					 this.dataSource.sort = this.sort;
					 this.dataSource.paginator = this.paginator;
					 this.table.dataSource = this.dataSource;
		      })
      
  }
  
  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  toggleAllRows() {
    if (this.isAllSelected()) {
      this.selection.clear();
      return;
    }

   //this.selection.select(...this.dataSource.data); //?
  }

  /** The label for the checkbox on the passed row */
  checkboxLabel(row?: PeriodicElement): string {
    if (!row) {
      return `${this.isAllSelected() ? 'deselect' : 'select'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${row.position + 1}`;
  }
  
  
  
/*  addTab(selectAfterAdding: boolean, tabName: string ) {
    this.tabs.push(tabName);
    if (selectAfterAdding) {
    this.selected.setValue(this.tabs.length - 1);
    }
  }*/

 addNewTab(tabName: string ) {
	this.currentMsgId = 0 ; 
    this.tabs.push(tabName);
    const newIndex = this.tabs.length - 1;
    this.selected.setValue(newIndex);
    this.currentMsgId = 0 ;
    this.onTabChange(newIndex); // Manually trigger event for header update
  }

  addTab(currentMsgId: number, tabName: string) {
    if (this.currentMsgId === currentMsgId) {
      return; // Already open, do nothing
    }
    this.currentMsgId = currentMsgId;
    this.tabs.push(tabName);
    const newIndex = this.tabs.length - 1;
    this.selected.setValue(newIndex);
    this.onTabChange(newIndex); // Manually trigger event for header update
  }

  removeTab(index: number) {
    this.tabs.splice(index, 1);
    this.selected.setValue(0);
    this.onTabChange(0); // Manually trigger the event to update the header
  }

  onTabChange(index: number) {
    if (index > 0) {
      this.activeMessageSubject.emit(this.tabs[index]);
      this.composeModeChange.emit(true);
    } else {
      this.activeMessageSubject.emit(null);
      this.composeModeChange.emit(false);
    }
  }

  public closeCurrentMessage() {
    if (this.selected.value !== null && this.selected.value > 0) {
      this.removeTab(this.selected.value);
    }
  }
  
  rowClicked(row: any) {
    this.addTab(row.id, row.name);
  }

  onArchive(message: MessageListItem, slidingItem: IonItemSliding) {
    const moveRequest: MoveMessageRequest = {
      name: this.currentFolder,
      message: [String(message.id)],
      destination: 'Archive' // We assume a folder named 'Archive' exists.
    };
    
    this.messageListApiService.moveMessage(moveRequest).subscribe(response => {
      // console.log('Archive response:', response);
      // Visually remove the item from the list
      this.dataSource.data = this.dataSource.data.filter(item => item.id !== message.id);
    });
    
    slidingItem.close();
  }

  onDelete(message: MessageListItem, slidingItem: IonItemSliding) {
    const deleteRequest: DeleteMessageRequest = {
      folder: this.currentFolder,
      message: [String(message.id)]
    };
    
    this.messageListApiService.deleteMessage(deleteRequest).subscribe(response => {
      // console.log('Delete response:', response);
      // Visually remove the item from the list
      this.dataSource.data = this.dataSource.data.filter(item => item.id !== message.id);
    });

    slidingItem.close();
  }

  onIonInfinite(ev: any) {
    // If all messages are already loaded, disable the scroll and stop.
    if (this.dataSource.data.length >= this.length) {
      ev.target.complete();
      ev.target.disabled = true;
      return;
    }

    this.pageIndex++;
    let startMsgNumber = (this.pageIndex * this.pageSize) + 1 ; 
		let lastMsgNumber = (this.pageIndex * this.pageSize)  + this.pageSize  ;
		if ( lastMsgNumber > this.length ) lastMsgNumber = this.length ;
		
    this.messageListApiService.setSortOrder('1').subscribe(() => {
      this.messageListApiService.listMessages(
        {
          startMsgNumber:startMsgNumber , 
          lastMsgNumber:lastMsgNumber ,
          folder:this.currentFolder
        }
      ).subscribe(messageListResponse => {
        for (let i = 0; i < messageListResponse.messageList.length; i++) {
          this.dataSource.data.push({
            id:  Number(messageListResponse.messageList[i].messageNumber),
            from: messageListResponse.messageList[i].from,
            name:  messageListResponse.messageList[i].subject,
            receivedDate:  messageListResponse.messageList[i].receivedDate,
            attachment:  messageListResponse.messageList[i].attachment != null && messageListResponse.messageList[i].attachment.length > 0  ,
            size:  messageListResponse.messageList[i].size,
            status:messageListResponse.messageList[i].status,
            priority:'nornal'
          })
        }
        // Important: We need to create a new array reference for change detection to work
        this.dataSource.data = [...this.dataSource.data];
        ev.target.complete();
        // Disable the infinite scroll if we've loaded all the messages
        if (this.dataSource.data.length >= this.length) {
          ev.target.disabled = true;
        }
      })
    });
  }

  isSelected(message: MessageListItem): boolean {
    return this.selectedMessages.has(message.id);
  }

  private clickTimeout: any;

  onItemClick(message: MessageListItem): void {
    if (this.selectionMode) {
      this.toggleSelection(message);
    } else {
      // Debounce to prevent rapid double clicks
      if (this.clickTimeout) {
        clearTimeout(this.clickTimeout);
      }
      this.clickTimeout = setTimeout(() => {
        // console.log('onItemClick called for message id:', message.id);
        this.rowClicked(message);
      }, 150); // 150ms debounce
    }
  }

  onLongPress(message: MessageListItem): void {
    this.selectionMode = true;
    this.toggleSelection(message);
  }

  private toggleSelection(message: MessageListItem): void {
    if (this.selectedMessages.has(message.id)) {
      this.selectedMessages.delete(message.id);
    } else {
      this.selectedMessages.add(message.id);
    }

    // If the last item is deselected, exit selection mode
    if (this.selectedMessages.size === 0) {
      this.selectionMode = false;
    }
    
    // Notify the parent component of the change
    this.selectionChange.emit({ isActive: this.selectionMode, count: this.selectedMessages.size });
  }

  public areAllMessagesSelected(): boolean {
    if (!this.dataSource.data || this.dataSource.data.length === 0) {
      return false;
    }
    return this.selectedMessages.size === this.dataSource.data.length;
  }

  public toggleSelectAll(): void {
    const allSelected = this.areAllMessagesSelected();
    if (allSelected) {
      this.selectedMessages.clear(); // Deselect all
    } else {
      // Select all currently loaded messages
      this.dataSource.data.forEach(message => this.selectedMessages.add(message.id));
    }
    // Notify the parent component of the change so the count updates
    this.selectionChange.emit({ isActive: this.selectionMode, count: this.selectedMessages.size });
  }

  //-- Public methods for Layout Component to call --//

  public clearSelectionMode(): void {
    this.selectionMode = false;
    this.selectedMessages.clear();
    this.selectionChange.emit({ isActive: false, count: 0 });
  }

  public archiveSelectedMessages(): void {
    const selectedIds = Array.from(this.selectedMessages).map(String);
    const moveRequest: MoveMessageRequest = {
      name: this.currentFolder,
      message: selectedIds,
      destination: 'Archive'
    };

    this.messageListApiService.moveMessage(moveRequest).subscribe(() => {
      this.dataSource.data = this.dataSource.data.filter(
        (item) => !this.selectedMessages.has(item.id)
      );
      this.clearSelectionMode();
    });
  }

  public deleteSelectedMessages(): void {
    const selectedIds = Array.from(this.selectedMessages).map(String);
    const deleteRequest: DeleteMessageRequest = {
      folder: this.currentFolder,
      message: selectedIds,
    };

    this.messageListApiService.deleteMessage(deleteRequest).subscribe(() => {
      this.dataSource.data = this.dataSource.data.filter(
        (item) => !this.selectedMessages.has(item.id)
      );
      this.clearSelectionMode();
    });
  }

  isMessageOpen(): boolean {
    return this.selected.value !== null && this.selected.value > 0;
  }

  refreshMessages(event: any) {
    let folder = this.currentFolder || 'Inbox';
    // console.log('🔍 MessageList - Refreshing messages for folder:', folder);
    this.pageIndex = 0;
    this.dataSource.data = [];
    this.messageListApiService.setSortOrder('1').subscribe(() => {
      this.utilsApiService.getMessageCount(folder).subscribe(response => {
        this.length = Number(response);
        // console.log('🔍 MessageList - Refresh: Message count for folder:', folder, 'is:', this.length);
        let startMsgNumber = 1;
        let lastMsgNumber = this.pageSize;
        if (lastMsgNumber > this.length) lastMsgNumber = this.length;
        this.messageListApiService.listMessages({
          startMsgNumber: startMsgNumber,
          lastMsgNumber: lastMsgNumber,
          folder: '' + folder
        }).subscribe(messageListResponse => {
          // console.log('🔍 MessageList - Refresh: Received', messageListResponse.messageList.length, 'messages for folder:', folder);
          this.dataSource.data = messageListResponse.messageList.map(msg => ({
            id: Number(msg.messageNumber),
            from: msg.from,
            name: msg.subject,
            receivedDate: msg.receivedDate,
            attachment: msg.attachment != null && msg.attachment.length > 0,
            size: msg.size,
            status: msg.status,
            priority: 'nornal'
          }));
          event.target.complete();
          if (this.infiniteScroll) {
            this.infiniteScroll.disabled = false;
          }
        }, () => {
          event.target.complete();
          if (this.infiniteScroll) {
            this.infiniteScroll.disabled = false;
          }
        });
      }, () => {
        event.target.complete();
        if (this.infiniteScroll) {
          this.infiniteScroll.disabled = false;
        }
      });
    });
  }

  // Public method to refresh messages (can be called from other components)
  public refreshMessagesAfterSend() {
    // console.log('🔍 MessageList - Refreshing messages after send for folder:', this.currentFolder);
    let folder = this.currentFolder || 'Inbox';
    this.pageIndex = 0;
    this.dataSource.data = [];
    this.messageListApiService.setSortOrder('1').subscribe(() => {
      this.utilsApiService.getMessageCount(folder).subscribe(response => {
        this.length = Number(response);
        // console.log('🔍 MessageList - After send: Message count for folder:', folder, 'is:', this.length);
        let startMsgNumber = 1;
        let lastMsgNumber = this.pageSize;
        if (lastMsgNumber > this.length) lastMsgNumber = this.length;
        this.messageListApiService.listMessages({
          startMsgNumber: startMsgNumber,
          lastMsgNumber: lastMsgNumber,
          folder: '' + folder
        }).subscribe(messageListResponse => {
          // console.log('🔍 MessageList - After send: Received', messageListResponse.messageList.length, 'messages for folder:', folder);
          this.dataSource.data = messageListResponse.messageList.map(msg => ({
            id: Number(msg.messageNumber),
            from: msg.from,
            name: msg.subject,
            receivedDate: msg.receivedDate,
            attachment: msg.attachment != null && msg.attachment.length > 0,
            size: msg.size,
            status: msg.status,
            priority: 'nornal'
          }));
          // Re-enable infinite scroll
          if (this.infiniteScroll) {
            this.infiniteScroll.disabled = false;
          }
        });
      });
    });
  }

  ngOnInit(): void {
    // Subscribe to route parameter changes to detect folder changes
    this.route.queryParamMap.subscribe(params => {
      const folder = params.get('folder');
      // console.log('🔍 MessageList - Route parameter changed. New folder:', folder);
      if (folder && folder !== this.currentFolder) {
        // console.log('🔍 MessageList - Folder changed from', this.currentFolder, 'to', folder);
        this.currentFolder = folder;
        // Refresh messages for the new folder
        this.refreshMessagesAfterSend();
      }
    });
  }

  public resetCurrentMessage() {
    this.currentMsgId = 0;
  }
}

