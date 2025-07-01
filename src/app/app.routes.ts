import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';
import { LoginComponent } from './login/login.component';
import { MessageListComponent } from './message-list/message-list.component';

export 

const routes: Routes = [
  {
    path: '',
    component: LoginComponent,

  },
  {
    path: 'app',
    component: LayoutComponent,

    children: [
      {
        path: '',
        component: MessageListComponent
      },
      {
        path: ':id',
        component: MessageListComponent
      },
    ]
  }
  
];
