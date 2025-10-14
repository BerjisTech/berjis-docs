import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-home',
  imports: [CommonModule],
  template: `<p class="text-gray-700">Docs home. Create or open a document from the editor demo link.</p>`
})
export class HomePageComponent {}

