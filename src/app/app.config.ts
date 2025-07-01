import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { HttpClientJsonpModule, HttpClientModule, HttpClientXsrfModule } from '@angular/common/http';
import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { HttpErrorHandler } from './http-error-handler.service';
import { MessageService } from './message.service';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { HammerGestureConfig, HAMMER_GESTURE_CONFIG, HammerModule } from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
	  provideRouter(routes), 
	  provideAnimationsAsync(),
    provideIonicAngular({}),
	  importProvidersFrom(HttpClientModule),
    importProvidersFrom(HammerModule),
	  importProvidersFrom(HttpClientJsonpModule),
	  importProvidersFrom(
        HttpClientXsrfModule.withOptions({
        cookieName: 'My-Xsrf-Cookie',
        headerName: 'My-Xsrf-Header',
      })
    ),
    { provide: HAMMER_GESTURE_CONFIG, useClass: HammerGestureConfig },
	  HttpErrorHandler,
	  MessageService,
	  ]
};


