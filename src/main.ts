import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import 'hammerjs';

// Configure passive event listeners globally to reduce console violations
const originalAddEventListener = EventTarget.prototype.addEventListener;
EventTarget.prototype.addEventListener = function (type, listener, options) {
  if (type === 'touchstart' || type === 'touchmove' || type === 'scroll') {
    if (options === undefined) {
      options = {};
    }
    if (typeof options === 'object') {
      options.passive = true;
    }
  }
  return originalAddEventListener.call(this, type, listener, options);
};

bootstrapApplication(AppComponent, appConfig).catch((err) =>
  console.error(err)
);
