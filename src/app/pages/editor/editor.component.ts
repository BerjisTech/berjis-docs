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
  hTicks = Array.from({ length: 21 }); // 0..210mm every 10mm
  vTicks = Array.from({ length: 30 }); // 0..297mm approx every 10mm
  showRuler = true;
  scale = 1;
  openModal = false;
  openQuery = '';
  openRows: Doc[] = [];
  openFiltered: Doc[] = [];
  renameModal = false;
  renameTitle = '';
  linkModal = false;
  linkUrl = '';
  contextMenus: { name: string, menus: { icon: string, name: string, action: string }[] }[] = [
    { name: 'File', menus: [
      { icon: '', name: 'New', action: 'new' },
      { icon: '', name: 'Open', action: 'open' },
      { icon: '', name: 'Rename', action: 'rename' },
      { icon: '', name: 'Make a copy', action: 'copy' },
      { icon: '', name: 'Download (.html)', action: 'download' },
      { icon: '', name: 'Page setup', action: 'pageSetup' },
      { icon: '', name: 'Print', action: 'print' }
    ]},
    { name: 'Edit', menus: [
      { icon: '', name: 'Undo', action: 'undo' },
      { icon: '', name: 'Redo', action: 'redo' }
    ]},
    { name: 'View', menus: [
      { icon: '', name: 'Toggle ruler', action: 'toggleRuler' },
      { icon: '', name: 'Zoom 100%', action: 'zoom100' }
    ]},
    { name: 'Insert', menus: [
      { icon: '', name: 'Image', action: 'insertImage' },
      { icon: '', name: 'Table', action: 'insertTable' }
    ]},
    { name: 'Help', menus: [
      { icon: '', name: 'Docs help', action: 'help' }
    ]},
  ]

  onMenu(action: string) {
    switch (action) {
      case 'new': this.router.navigate(['/editor', 'new']); break;
      case 'open': this.showOpen(); break;
      case 'copy': this.makeCopy(); break;
      case 'download': this.downloadHtml(); break;
      case 'print': window.print(); break;
      case 'rename': this.showRename(); break;
      case 'undo': document.execCommand('undo'); break;
      case 'redo': document.execCommand('redo'); break;
      case 'toggleRuler': this.showRuler = !this.showRuler; break;
      case 'zoom100': this.scale = 1; break;
      case 'insertImage': this.insertImage(); break;
      case 'insertTable': this.insertTable(); break;
      case 'insertLink': this.showLink(); break;
      default: break;
    }
  }

  private async makeCopy() {
    if (!this.doc) return;
    const created = await this.docs.create({ title: (this.doc.title || 'Untitled') + ' (Copy)', content: this.doc.content });
    this.doc = created; this.router.navigate(['/editor', created.id]);
  }
  private downloadHtml() {
    if (!this.doc) return;
    const title = (this.doc.title || 'document').replace(/\s+/g, '-').slice(0,80);
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${this.doc.title||'Document'}</title></head><body>${this.doc.content||''}</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${title}.html`; a.click(); URL.revokeObjectURL(a.href);
  }

  private async showOpen(){
    this.openModal = true;
    try { this.openRows = await this.docs.list(['active']); } catch { this.openRows = Object.values(this.openRows||{}); }
    this.openQuery = '';
    this.openFiltered = [...this.openRows];
  }
  onOpenQueryChange(){
    const q = (this.openQuery||'').toLowerCase().trim();
    if (!q) { this.openFiltered = [...this.openRows]; return; }
    this.openFiltered = this.openRows.filter(d =>
      (d.title||'').toLowerCase().includes(q) || (stripTags(d.content||'').toLowerCase().includes(q))
    );
  }
  openDoc(d: Doc){ this.openModal = false; this.router.navigate(['/editor', d.id]); }
  cancelOpen(){ this.openModal = false; }
  private insertTable(){
    const html = '<table border="1" cellpadding="4" cellspacing="0"><tr><td>Cell</td><td>Cell</td></tr><tr><td>Cell</td><td>Cell</td></tr></table>';
    document.execCommand('insertHTML', false, html); this.onEditorInput();
  }
  private insertImage(){
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files && input.files[0]; if (!file) return;
      const reader = new FileReader(); reader.onload = () => {
        const src = String(reader.result||'');
        document.execCommand('insertImage', false, src); this.onEditorInput();
      }; reader.readAsDataURL(file);
    }; input.click();
  }
  private showLink(){ this.linkUrl = ''; this.linkModal = true; }
  confirmLink(){ if (!this.linkUrl) { this.linkModal = false; return; } document.execCommand('createLink', false, this.linkUrl); this.linkModal = false; this.onEditorInput(); }
  cancelLink(){ this.linkModal = false; }

  private showRename(){ this.renameTitle = (this.doc?.title||''); this.renameModal = true; }
  confirmRename(){ if (!this.doc) { this.renameModal=false; return; } this.doc.title = (this.renameTitle||'').trim(); this.renameModal=false; this.onTitleChange(); }
  cancelRename(){ this.renameModal = false; }

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

function stripTags(html: string): string { return html.replace(/<[^>]*>/g, ' '); }
