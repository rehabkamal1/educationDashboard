import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';
import { routes } from './app.routes';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';
import { numericIdInterceptor } from './core/interceptors/numeric-id.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([numericIdInterceptor, loadingInterceptor])),
    provideAnimations(),
    {
      provide: LUCIDE_ICONS,
      useValue: new LucideIconProvider(icons)
    }
  ]
};


