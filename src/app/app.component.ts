import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterOutlet } from '@angular/router';
import { DocsService } from './docs.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  templateUrl: './app.component.html'
})
export class AppComponent {
  constructor(public docs: DocsService) {}
  get syncMode() { return this.docs.syncMode; }
  get isSaving() { return this.docs.isSaving; }
  get lastSavedAt() { return this.docs.lastSavedAt; }
  get lastError() { return this.docs.lastError; }
}
