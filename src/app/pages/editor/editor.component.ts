import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-editor',
  imports: [CommonModule],
  template: `<div class="border rounded p-4">Docs editor placeholder (collab-ready slot)</div>`
})
export class EditorPageComponent {}

