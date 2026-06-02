import { NgModule } from '@angular/core';
import { LUCIDE_ICONS, LucideIconProvider, icons } from 'lucide-angular';

@NgModule({
  providers: [
    {
      provide: LUCIDE_ICONS,
      useValue: new LucideIconProvider(icons)
    }
  ]
})
export class LucideAngularModule {}
