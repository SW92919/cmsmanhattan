import {
  AfterViewInit,
  Component,
  EventEmitter,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import {
  MatTableModule,
  MatTable,
  MatTableDataSource,
} from '@angular/material/table';
import {
  MatPaginatorModule,
  MatPaginator,
  PageEvent,
} from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import {
  MessageListDataSource,
  MessageListItem,
} from './message-list-datasource';
import { MatCardModule } from '@angular/material/card';

import { MatCheckboxModule } from '@angular/material/checkbox';
import { SelectionModel } from '@angular/cdk/collections';

import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

import { MailMessageComponent } from '../mail-message/mail-message.component';
import { ActivatedRoute } from '@angular/router';
import { MessageListApiService } from '../messageListService/message-list-api.service';
import {
  DeleteMessageRequest,
  MessageListRequest,
  MoveMessageRequest,
  SearchMessageRequest,
} from '../messageListService/message-list-api-request';
import { FormControl } from '@angular/forms';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DialogMoveMessagesComponent } from '../dialog-move-messages/dialog-move-messages.component';
import { UtilsApiService } from '../utilsService/utils-api.service';
import {
  IonicModule,
  IonInfiniteScroll,
  IonItemSliding,
  ToastController,
} from '@ionic/angular';

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
  imports: [
    IonicModule,
    DialogMoveMessagesComponent,
    CommonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatCardModule,
    MatCheckboxModule,
    MatTabsModule,
    MatButtonToggleModule,
    MailMessageComponent,
    MatDividerModule,
  ],
})
export class MessageListComponent implements AfterViewInit {
  @Output() selectionChange = new EventEmitter<{
    isActive: boolean;
    count: number;
  }>();
  @Output() activeMessageSubject = new EventEmitter<string | null>();
  @Output() composeModeChange = new EventEmitter<boolean>();
  @Output() exitComposeMode = new EventEmitter<void>();
  @Output() mailMessageModeChange = new EventEmitter<{
    isComposing: boolean;
    isReplyMode: boolean;
    isForwardMode: boolean;
  }>();
  selectionMode = false;
  selectedMessages = new Set<number>();

  currentFolder: string = '';
  currentMsgId: number = 0;
  tabs = [''];
  selected = new FormControl(0);
  tabInex: number = 0;

  constructor(
    private route: ActivatedRoute,
    private messageListApiService: MessageListApiService,
    private utilsApiService: UtilsApiService,
    private router: Router,
    private toastController: ToastController
  ) {}

  @ViewChild(IonInfiniteScroll) infiniteScroll!: IonInfiniteScroll;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatTable) table!: MatTable<MessageListItem>;
  dataSource = new MessageListDataSource();

  /** Columns displayed in the table. Columns IDs can be added, removed, or reordered. */
  displayedColumns: string[] = [
    'id',
    'name',
    'receivedDate',
    'size',
    'attachment',
  ];
  //dataSource = new MatTableDataSource<PeriodicElement>(ELEMENT_DATA);
  selection = new SelectionModel<PeriodicElement>(true, []);

  length = 50;
  pageSize = 20;
  pageIndex = 0;
  pageSizeOptions = [20, 40, 60];
  userName: string = '';

  // Avatar color palette
  private readonly AVATAR_COLORS: string[] = [
    '#F44336',
    '#E91E63',
    '#9C27B0',
    '#673AB7',
    '#3F51B5',
    '#2196F3',
    '#03A9F4',
    '#00BCD4',
    '#009688',
    '#4CAF50',
    '#8BC34A',
    '#CDDC39',
    '#FFEB3B',
    '#FFC107',
    '#FF9800',
    '#FF5722',
    '#14B8C9',
    '#795548',
    '#607D8B',
  ];

  // Hash function to map email to a number
  private hashStringToNumber(str: string, max: number): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % max;
  }
  // This is for mobile view
  // Public method to get avatar color for an email
  public getAvatarColor(email: string): string {
    const index = this.hashStringToNumber(email, this.AVATAR_COLORS.length);
    return this.AVATAR_COLORS[index];
  }

  // This is for mobile view
  // Public method to get the appropriate field for avatar display based on folder
  public getAvatarField(message: MessageListItem): string {
    if (this.currentFolder && this.currentFolder.toUpperCase() === 'INBOX') {
      return message.from || 'Unknown';
    } else if (
      this.currentFolder &&
      this.currentFolder.toUpperCase() === 'ARCHIVE'
    ) {
      // For Archive folder, we need to determine if this was originally from Inbox or Sent
      // If the message has a 'from' field that matches the current user, it was likely sent by the user
      // If not, it was likely received (from Inbox)
      const currentUser = sessionStorage.getItem('userName') || '';
      if (
        message.from &&
        message.from.toLowerCase().includes(currentUser.toLowerCase())
      ) {
        // This was likely a sent message, so show the recipient
        return message.to || 'Unknown';
      } else {
        // This was likely a received message, so show the sender
        return message.from || 'Unknown';
      }
    } else {
      return message.to || 'Unknown';
    }
  }

  // This is for mobile view
  // Public method to get the first letter for avatar display based on folder
  public getAvatarLetter(message: MessageListItem): string {
    const field = this.getAvatarField(message);
    return field.charAt(0) ? field.charAt(0).toUpperCase() : 'I';
  }

  ngAfterViewInit(): void {
    // Remove any message loading logic here to prevent duplicate loads
  }
  // This is for desktop view
  handlePageEvent(event: PageEvent) {
    this.length = event.length;
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;

    let lastMsgNumber = this.length - this.pageIndex * this.pageSize;
    let startMsgNumber = lastMsgNumber - this.pageSize + 1;
    if (lastMsgNumber >= this.length) lastMsgNumber = this.length;
    this.messageListApiService
      .listMessages({
        startMsgNumber: startMsgNumber,
        lastMsgNumber: lastMsgNumber,
        folder: this.currentFolder,
      })
      .subscribe((messageListResponse) => {
        this.dataSource.data = [];
        if (
          messageListResponse &&
          Array.isArray(messageListResponse.messageList)
        ) {
          for (let i = 0; i < messageListResponse.messageList.length; i++) {
            // console.log(messageListResponse.messageList[i]);
            this.dataSource.data.push({
              id: Number(messageListResponse.messageList[i].messageNumber),
              from: messageListResponse.messageList[i].from,
              to: messageListResponse.messageList[i].to,
              name: messageListResponse.messageList[i].subject,
              receivedDate: messageListResponse.messageList[i].receivedDate,
              attachment:
                messageListResponse.messageList[i].attachment != null &&
                messageListResponse.messageList[i].attachment.length > 0,
              size: messageListResponse.messageList[i].size,
              status: messageListResponse.messageList[i].status,
              starred: false, // default to not starred
            });
          }

          this.dataSource.sort = this.sort;
          this.dataSource.paginator = this.paginator;
          this.table.dataSource = this.dataSource;
        } else {
          this.dataSource.data = [];
          this.showErrorToast(
            'Failed to load messages. Please try again later.'
          );
        }
      });
  }
  // This is for desktop view
  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }

  // This is for desktop view
  /** Selects all rows if they are not all selected; otherwise clear selection. */
  toggleAllRows() {
    if (this.isAllSelected()) {
      this.selection.clear();
      return;
    }
    //this.selection.select(...this.dataSource.data); //?
  }

  // This is for desktop view
  /** The label for the checkbox on the passed row */
  checkboxLabel(row?: PeriodicElement): string {
    if (!row) {
      return `${this.isAllSelected() ? 'deselect' : 'select'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${
      row.position + 1
    }`;
  }

  /*  addTab(selectAfterAdding: boolean, tabName: string ) {
    this.tabs.push(tabName);
    if (selectAfterAdding) {
    this.selected.setValue(this.tabs.length - 1);
    }
  }*/

  addNewTab(tabName: string) {
    this.currentMsgId = 0;
    this.tabs.push(tabName);
    const newIndex = this.tabs.length - 1;
    this.selected.setValue(newIndex);
    // this.currentMsgId = 0 ;
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

  // This is for mobile view
  onArchive(message: MessageListItem, slidingItem: IonItemSliding) {
    const moveRequest: MoveMessageRequest = {
      folder: this.currentFolder,
      message: [String(message.id)],
      destination: 'Archive',
    };

    this.messageListApiService
      .moveMessage(moveRequest)
      .subscribe((response) => {
        console.log('Archive response:', response);
        // Visually remove the item from the list immediately
        this.dataSource.data = this.dataSource.data.filter(
          (item) => item.id !== message.id
        );

        // Refresh the list from server to ensure consistency
        this.refreshMessagesAfterSend();
      });

    slidingItem.close();
  }

  // This is for mobile view
  onDelete(message: MessageListItem, slidingItem: IonItemSliding) {
    const deleteRequest: DeleteMessageRequest = {
      folder: this.currentFolder,
      message: [String(message.id)],
    };

    this.messageListApiService
      .deleteMessage(deleteRequest)
      .subscribe((response) => {
        // console.log('Delete response:', response);
        // Visually remove the item from the list immediately
        this.dataSource.data = this.dataSource.data.filter(
          (item) => item.id !== message.id
        );

        // Refresh the list from server to ensure consistency
        this.refreshMessagesAfterSend();
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

    switch (this.currentFolder) {
      case 'SENT':
        this.currentFolder = 'Sent';
        break;
      case 'DRAFT':
        this.currentFolder = 'Draft';
        break;
      case 'ARCHIVE':
        this.currentFolder = 'Archive';
        break;
      case 'OUTBOX':
        this.currentFolder = 'Outbox';
        break;
      case 'SPAM':
        this.currentFolder = 'Spam';
        break;
    }
    this.pageIndex++;
    let lastMsgNumber = this.length - this.pageIndex * this.pageSize;
    let startMsgNumber = lastMsgNumber - this.pageSize + 1;
    if (lastMsgNumber < this.pageSize) {
      startMsgNumber = 1;
    }

    this.messageListApiService
      .listMessages({
        startMsgNumber: startMsgNumber,
        lastMsgNumber: lastMsgNumber,
        folder: this.currentFolder,
      })
      .subscribe((messageListResponse) => {
        if (
          messageListResponse &&
          Array.isArray(messageListResponse.messageList)
        ) {
          for (let i = 0; i < messageListResponse.messageList.length; i++) {
            this.dataSource.data.push({
              id: Number(messageListResponse.messageList[i].messageNumber),
              from: messageListResponse.messageList[i].from,
              to: messageListResponse.messageList[i].to,
              name: messageListResponse.messageList[i].subject,
              receivedDate: messageListResponse.messageList[i].receivedDate,
              attachment:
                messageListResponse.messageList[i].attachment != null &&
                messageListResponse.messageList[i].attachment.length > 0,
              size: messageListResponse.messageList[i].size,
              status: messageListResponse.messageList[i].status,
              starred: false, // default to not starred
            });
          }
          // Important: We need to create a new array reference for change detection to work
          this.dataSource.data = [...this.dataSource.data];
          ev.target.complete();
          // Disable the infinite scroll if we've loaded all the messages
          if (this.dataSource.data.length >= this.length) {
            ev.target.disabled = true;
          }
        } else {
          this.dataSource.data = [];
          this.showErrorToast(
            'Failed to load messages. Please try again later.'
          );
        }
      });
  }

  // This is for mobile view
  isSelected(message: MessageListItem): boolean {
    return this.selectedMessages.has(message.id);
  }

  private clickTimeout: any;
  // This is for mobile view
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

  // This is for mobile view
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
    this.selectionChange.emit({
      isActive: this.selectionMode,
      count: this.selectedMessages.size,
    });
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
      this.dataSource.data.forEach((message) =>
        this.selectedMessages.add(message.id)
      );
    }
    // Notify the parent component of the change so the count updates
    this.selectionChange.emit({
      isActive: this.selectionMode,
      count: this.selectedMessages.size,
    });
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
      folder: this.currentFolder,
      message: selectedIds,
      destination: 'Archive',
    };

    this.messageListApiService.moveMessage(moveRequest).subscribe(() => {
      // Remove from local data source immediately for UI responsiveness
      this.dataSource.data = this.dataSource.data.filter(
        (item) => !this.selectedMessages.has(item.id)
      );
      this.clearSelectionMode();

      // Refresh the list from server to ensure consistency
      this.refreshMessagesAfterSend();
    });
  }

  public deleteSelectedMessages(): void {
    const selectedIds = Array.from(this.selectedMessages).map(String);
    const deleteRequest: DeleteMessageRequest = {
      folder: this.currentFolder,
      message: selectedIds,
    };

    this.messageListApiService.deleteMessage(deleteRequest).subscribe(() => {
      // Remove from local data source immediately for UI responsiveness
      this.dataSource.data = this.dataSource.data.filter(
        (item) => !this.selectedMessages.has(item.id)
      );
      this.clearSelectionMode();

      // Refresh the list from server to ensure consistency
      this.refreshMessagesAfterSend();
    });
  }

  // This is for mobile view
  isMessageOpen(): boolean {
    return this.selected.value !== null && this.selected.value > 0;
  }

  private resetInfiniteScroll(): void {
    if (this.infiniteScroll) {
      this.infiniteScroll.disabled = false;
    }
  }
  // For mobile view
  refreshMessages(event: any) {
    let folder = this.currentFolder || 'INBOX';
    switch (folder) {
      case 'SENT':
        folder = 'Sent';
        break;
      case 'ARCHIVE':
        folder = 'Archive';
        break;
      case 'DRAFT':
        folder = 'Draft';
        break;
      case 'OUTBOX':
        folder = 'Outbox';
        break;
      case 'SPAM':
        folder = 'Spam';
        break;
    }

    // console.log('🔍 MessageList - Refreshing messages for folder:', folder);
    this.pageIndex = 0;
    this.dataSource.data = [];
    // Reset infinite scroll state
    this.resetInfiniteScroll();
    this.utilsApiService.getMessageCount(folder).subscribe(
      (response: any) => {
        this.length = Number(response);
        // console.log('🔍 MessageList - Refresh: Message count for folder:', folder, 'is:', this.length);
        let startMsgNumber = this.length - this.pageSize + 1;
        let lastMsgNumber = this.length;
        if (lastMsgNumber < this.pageSize) {
          lastMsgNumber = this.length;
          startMsgNumber = 1;
        }
        this.messageListApiService
          .listMessages({
            startMsgNumber: startMsgNumber,
            lastMsgNumber: lastMsgNumber,
            folder: folder,
          })
          .subscribe(
            (messageListResponse) => {
              // console.log('🔍 MessageList - Refresh: Received', messageListResponse.messageList, 'messages for folder:', folder);
              if (
                messageListResponse &&
                Array.isArray(messageListResponse.messageList)
              ) {
                this.dataSource.data = messageListResponse.messageList.map(
                  (msg) => ({
                    id: Number(msg.messageNumber),
                    from: msg.from,
                    to: msg.to,
                    name: msg.subject,
                    receivedDate: msg.receivedDate,
                    attachment:
                      msg.attachment != null && msg.attachment.length > 0,
                    size: msg.size,
                    status: msg.status,
                    starred: false, // default to not starred
                  })
                );
              } else {
                this.dataSource.data = [];
                this.showErrorToast(
                  'Failed to load messages. Please try again later.'
                );
              }
              event.target.complete();
              if (this.infiniteScroll) {
                this.infiniteScroll.disabled = false;
              }
            },
            () => {
              this.dataSource.data = [];
              this.showErrorToast(
                'A server error occurred. Please try again later.'
              );
              event.target.complete();
              if (this.infiniteScroll) {
                this.infiniteScroll.disabled = false;
              }
            }
          );
      },
      () => {
        this.dataSource.data = [];
        this.showErrorToast('A server error occurred. Please try again later.');
        event.target.complete();
        if (this.infiniteScroll) {
          this.infiniteScroll.disabled = false;
        }
      }
    );
  }

  // Public method to refresh messages (can be called from other components)
  public refreshMessagesAfterSend() {
    console.log(
      '🔍 MessageList - refreshMessagesAfterSend called for folder:',
      this.currentFolder
    );
    let folder = this.currentFolder || 'INBOX';
    switch (folder) {
      case 'SENT':
        folder = 'Sent';
        break;
      case 'DRAFT':
        folder = 'Draft';
        break;
      case 'ARCHIVE':
        folder = 'Archive';
        break;
      case 'OUTBOX':
        folder = 'Outbox';
        break;
      case 'SPAM':
        folder = 'Spam';
        break;
    }

    console.log('🔍 MessageList - Normalized folder name:', folder);

    this.pageIndex = 0;
    this.dataSource.data = [];
    // Reset infinite scroll state
    this.resetInfiniteScroll();

    console.log('🔍 MessageList - Calling getMessageCount for folder:', folder);
    this.utilsApiService.getMessageCount(folder).subscribe({
      next: (response: any) => {
        this.length = Number(response);
        console.log('🔍 MessageList - getMessageCount response:', response);
        console.log(
          '🔍 MessageList - Message count for folder:',
          folder,
          'is:',
          this.length
        );

        let startMsgNumber = this.length - this.pageSize + 1;
        let lastMsgNumber = this.length;
        if (lastMsgNumber < this.pageSize) {
          lastMsgNumber = this.length;
          startMsgNumber = 1;
        }

        console.log('🔍 MessageList - Calling listMessages with:', {
          startMsgNumber: startMsgNumber,
          lastMsgNumber: lastMsgNumber,
          folder: folder,
        });

        this.messageListApiService
          .listMessages({
            startMsgNumber: startMsgNumber,
            lastMsgNumber: lastMsgNumber,
            folder: folder,
          })
          .subscribe({
            next: (messageListResponse) => {
              console.log(
                '🔍 MessageList - listMessages response:',
                messageListResponse
              );
              console.log(
                '🔍 MessageList - Message list length:',
                messageListResponse?.messageList?.length
              );

              if (
                messageListResponse &&
                Array.isArray(messageListResponse.messageList)
              ) {
                this.dataSource.data = messageListResponse.messageList.map(
                  (msg) => ({
                    id: Number(msg.messageNumber),
                    from: msg.from,
                    to: msg.to,
                    name: msg.subject,
                    receivedDate: msg.receivedDate,
                    attachment:
                      msg.attachment != null && msg.attachment.length > 0,
                    size: msg.size,
                    status: msg.status,
                    starred: false, // default to not starred
                  })
                );
                console.log(
                  '🔍 MessageList - Updated dataSource with',
                  this.dataSource.data.length,
                  'messages'
                );
                // Re-enable infinite scroll
                if (this.infiniteScroll) {
                  this.infiniteScroll.disabled = false;
                }
              } else {
                this.dataSource.data = [];
                console.log(
                  '🔍 MessageList - No messages found or invalid response'
                );
                this.showErrorToast(
                  'Failed to load messages. Please try again later.'
                );
              }
            },
            error: (error) => {
              console.error('🔍 MessageList - listMessages error:', error);
              this.dataSource.data = [];
              this.showErrorToast(
                'Failed to load messages. Please try again later.'
              );
            },
          });
      },
      error: (error) => {
        console.error('🔍 MessageList - getMessageCount error:', error);
        this.dataSource.data = [];
        this.showErrorToast('Failed to load messages. Please try again later.');
      },
    });
  }

  ngOnInit(): void {
    // Subscribe to route parameter changes to detect folder changes
    this.route.queryParamMap.subscribe((params) => {
      let folder = params.get('folder');
      // Ensure folder is set to 'INBOX' on first load if not specified
      if (!folder || folder.trim() === '') {
        folder = 'INBOX';
      }
      console.log(
        '🔍 MessageList - ngOnInit - Route change detected, folder:',
        folder
      );
      this.currentFolder = folder;
      // Reset infinite scroll state when folder changes
      this.resetInfiniteScroll();
      // Refresh messages for the new folder
      this.refreshMessagesAfterSend();
    });
  }

  public resetCurrentMessage() {
    this.currentMsgId = 0;
  }

  public onMessageSent(): void {
    console.log('🔍 MessageList - onMessageSent called');
    // Do nothing - let the navigation handle the refresh
    // This prevents duplicate API calls when sending messages
  }

  public onNavigateToSent(): void {
    console.log('🔍 MessageList - onNavigateToSent called');
    this.router.navigate(['/app'], { queryParams: { folder: 'SENT' } });
    this.selected.setValue(0);
    this.currentMsgId = 0;
    this.closeCurrentMessage();
    this.selectionMode = false;
    this.exitComposeMode.emit();
    this.activeMessageSubject.emit(null);
    this.composeModeChange.emit(false);

    // Force refresh for SENT folder since route subscription might not trigger
    setTimeout(() => {
      console.log(
        '🔍 MessageList - onNavigateToSent - Force refresh for SENT folder'
      );
      this.currentFolder = 'SENT';
      this.refreshMessagesAfterSend();
    }, 100);
  }

  public onMailMessageModeChange(mode: {
    isComposing: boolean;
    isReplyMode: boolean;
    isForwardMode: boolean;
  }): void {
    this.mailMessageModeChange.emit(mode);
  }

  private async showErrorToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color: 'danger',
      position: 'bottom',
    });
    await toast.present();
  }

  public isMobileView(): boolean {
    return window.innerWidth <= 768;
  }

  // Toggle the starred state for a message
  public toggleStar(message: MessageListItem): void {
    message.starred = !message.starred;
  }
}
