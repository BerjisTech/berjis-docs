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
  @ViewChild('pagesContainer', { static: true }) pagesContainerRef!: ElementRef<HTMLDivElement>;
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
    setTimeout(() => {
      if (!this.doc) return;
      if (this.pagesContainerRef) {
        const el = this.pagesContainerRef.nativeElement;
        const content = this.doc.content || '';
        if (content && content.trim().length > 0) {
          // Load saved HTML (may be raw blocks without page wrappers)
          el.innerHTML = content;
        }
        // Ensure there is at least one page and move any orphan nodes into it
        this.ensurePageStructure();
        this.paginate();
      }
    });
  }

  onTitleChange() { this.queueSave(); }
  onEditorInput() {
    if (!this.doc) return;
    this.ensurePageStructure();
    this.normalizeAllPages();
    this.paginate();
    this.doc.content = this.pagesContainerRef.nativeElement.innerHTML;
    this.queueSave();
  }

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

  private createPage(): HTMLDivElement {
    const page = document.createElement('div');
    page.className = 'page bg-white outline-none w-[210mm] h-[297mm] p-8 overflow-hidden shadow';
    page.setAttribute('contenteditable', 'true');
    page.setAttribute('spellcheck', 'true');
    return page;
  }

  private getPages(): HTMLDivElement[] {
    if (!this.pagesContainerRef) return [];
    return Array.from(this.pagesContainerRef.nativeElement.querySelectorAll<HTMLDivElement>('.page'));
  }

  private normalizeBlocks(el: HTMLElement) {
    const nodes = Array.from(el.childNodes);
    for (const n of nodes) {
      if (n.nodeType === Node.TEXT_NODE) {
        const txt = (n.textContent || '').replace(/\u00A0/g, ' ');
        if (txt.trim().length > 0) {
          const wrapper = document.createElement('div');
          wrapper.textContent = txt;
          el.insertBefore(wrapper, n);
        }
        el.removeChild(n);
      } else if (n.nodeType === Node.ELEMENT_NODE) {
        // keep as is
      }
    }
  }

  private normalizeAllPages() {
    for (const page of this.getPages()) this.normalizeBlocks(page);
  }

  private paginate() {
    const container = this.pagesContainerRef?.nativeElement; if (!container) return;
    let pages = this.getPages();
    if (pages.length === 0) { container.appendChild(this.createPage()); pages = this.getPages(); }

    // Forward pass: push overflow to next pages
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      this.normalizeBlocks(page);
      let guard = 0;
      while (page.scrollHeight > page.clientHeight && guard++ < 1000) {
        let next = pages[i + 1];
        if (!next) { next = this.createPage(); container.appendChild(next); pages = this.getPages(); }
        const last = this.findLastBlock(page);
        if (!last) break;
        next.insertBefore(last, next.firstChild);
      }
    }

    // Backward pass: pull up items if there is space and remove empty trailing pages
    for (let i = pages.length - 1; i > 0; i--) {
      const page = pages[i];
      const prev = pages[i - 1];
      let moved = true; let safety = 0;
      while (moved && safety++ < 1000) {
        moved = false;
        const first = this.findFirstBlock(page);
        if (!first) break;
        prev.appendChild(first);
        if (prev.scrollHeight > prev.clientHeight + 1) { // overflowed, undo
          page.insertBefore(first, page.firstChild);
          break;
        }
        moved = true;
      }
      // Remove empty trailing page
      if (!page.textContent || page.textContent.trim().length === 0) {
        if (page.children.length === 0 || (page.children.length === 1 && (page.firstElementChild as HTMLElement)?.innerText?.trim().length === 0)) {
          if (pages.length > 1) { container.removeChild(page); pages = this.getPages(); }
        }
      }
    }
  }

  private findLastBlock(page: HTMLElement): HTMLElement | null {
    for (let i = page.children.length - 1; i >= 0; i--) {
      const el = page.children[i] as HTMLElement;
      if (this.isIgnorable(el)) { page.removeChild(el); continue; }
      return el;
    }
    return null;
  }
  private findFirstBlock(page: HTMLElement): HTMLElement | null {
    for (let i = 0; i < page.children.length; i++) {
      const el = page.children[i] as HTMLElement;
      if (this.isIgnorable(el)) { page.removeChild(el); i--; continue; }
      return el;
    }
    return null;
  }
  private isIgnorable(el: HTMLElement): boolean {
    const txt = (el.innerText || '').trim();
    return txt.length === 0 && el.children.length === 0;
  }

  private ensurePageStructure() {
    const container = this.pagesContainerRef?.nativeElement; if (!container) return;
    let pages = this.getPages();
    if (pages.length === 0) {
      const page = this.createPage();
      container.appendChild(page);
      pages = [page];
    }
    const first = pages[0];
    const children = Array.from(container.childNodes);
    for (const n of children) {
      if (n === first) continue;
      if (n.nodeType === Node.ELEMENT_NODE) {
        const el = n as HTMLElement;
        if (el.classList.contains('page')) continue; // leave page nodes where they are
      }
      // Move any non-page node into the first page
      first.appendChild(n);
    }
  }
}

function stripTags(html: string): string { return html.replace(/<[^>]*>/g, ' '); }
