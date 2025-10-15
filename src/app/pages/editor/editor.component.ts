import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DocsService, Doc } from '../../docs.service';

@Component({
  standalone: true,
  selector: 'app-editor',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './editor.component.html'
})
export class EditorPageComponent implements OnInit {
  @ViewChild('editor', { static: true }) editorRef!: ElementRef<HTMLDivElement>;
  doc: Doc | null = null;
  pendingSave?: any;
  contextMenus: { name: string, menus: { icon: string, name: string, action: string }[] }[] = [
    {
      name: 'File',
      menus: [
        { icon: '', name: 'New', action: '' },
        { icon: '', name: 'Open', action: '' },
        { icon: '', name: 'Duplicate', action: '' },
        { icon: '', name: 'Share', action: '' },
        { icon: '', name: 'Email', action: '' },
        { icon: '', name: 'Export', action: '' }
      ]
    },
    {
      name: 'Edit',
      menus: [
        { icon: '', name: '', action: '' }
      ]
    },
    {
      name: 'View',
      menus: [
        { icon: '', name: '', action: '' }
      ]
    },
    {
      name: 'Insert',
      menus: [
        { icon: '', name: '', action: '' }
      ]
    },
    {
      name: 'Format',
      menus: [
        { icon: '', name: '', action: '' }
      ]
    },
    {
      name: 'Tools',
      menus: [
        { icon: '', name: '', action: '' }
      ]
    },
    {
      name: 'Extensions',
      menus: [
        { icon: '', name: '', action: '' }
      ]
    },
    {
      name: 'Help',
      menus: [
        { icon: '', name: '', action: '' }
      ]
    },
  ]

  constructor(private route: ActivatedRoute, public docs: DocsService, private router: Router) { }

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') || 'new';
    this.doc = { id, title: '', content: '', status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    if (id !== 'new') {
      const existing = this.docs.get(id) || await this.docs.fetch(id);
      if (existing) this.doc = existing; else { this.router.navigate(['/']); return; }
    }
    setTimeout(() => { if (this.editorRef && this.doc) this.editorRef.nativeElement.innerHTML = this.doc.content || ''; });
  }

  onTitleChange() { this.queueSave(); }
  onEditorInput() { if (!this.doc) return; this.doc.content = this.editorRef.nativeElement.innerHTML; this.queueSave(); }

  private queueSave() {
    if (!this.doc) return;
    if (this.pendingSave) clearTimeout(this.pendingSave);
    this.pendingSave = setTimeout(() => this.save(), 400);
  }
  private async ensureCreatedId() {
    if (this.doc && this.doc.id === 'new') {
      const hasTitle = !!this.doc.title && this.doc.title.trim().length > 0;
      const hasContent = !!this.doc.content && this.doc.content.replace(/<[^>]*>/g, '').trim().length > 0;
      if (hasTitle || hasContent) {
        const created = await this.docs.create({ title: this.doc.title, content: this.doc.content });
        this.doc = created; this.router.navigate(['/editor', created.id], { replaceUrl: true });
      }
    }
  }
  private async save() { if (!this.doc) return; await this.ensureCreatedId(); if (!this.doc) return; await this.docs.save(this.doc); }

  exec(cmd: string, value?: string) { document.execCommand(cmd, false, value); this.onEditorInput(); }
  applyBlock(tag: string) { document.execCommand('formatBlock', false, tag); this.onEditorInput(); }
  insertLink() { const url = prompt('Enter URL'); if (url) this.exec('createLink', url); }
  unlink() { this.exec('unlink'); }
  resetFormatting() { this.exec('removeFormat'); }
}
