import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../api.service';
import { DocsService, Doc } from '../../docs.service';

@Component({
  standalone: true,
  selector: 'app-home',
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html'
})
export class HomePageComponent {
  get syncMode() { return this.docs.syncMode; }
  get isSaving() { return this.docs.isSaving; }
  get lastSavedAt() { return this.docs.lastSavedAt; }
  get lastError() { return this.docs.lastError; }
  authed: boolean | null = null;
  recents: Doc[] = [];
  trash: Doc[] = [];
  constructor(private api: ApiService, private docs: DocsService) { this.init(); }
  async init() {
    try {
      const res = await this.api.ensureAuth();
      this.authed = !!res?.data?.valid;
      if (this.authed) {
        this.recents = await this.docs.list(['active']);
        this.trash = await this.docs.listTrashRecent();
      }
    } catch { this.authed = false; }
  }

  async restore(d: Doc){ await this.docs.restore(d.id); this.recents = await this.docs.list(['active']); this.trash = await this.docs.listTrashRecent(); }
}
