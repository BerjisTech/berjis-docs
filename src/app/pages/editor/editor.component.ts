import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
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
  // Ruler ticks (10mm spacing), computed from current page size
  hTicks = Array.from({ length: 21 });
  vTicks = Array.from({ length: 30 });
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
  // Find & Replace
  findModal = false; findQuery = ''; replaceQuery = ''; findCase = false; findWhole = false;
  // Format painter
  formatPainterActive = false; private painterStyle: Partial<CSSStyleDeclaration> = {};
  // Image options
  imageOptionsModal = false; private selectedImage: HTMLImageElement | null = null; imgWidth = ''; imgAlign: 'inline'|'left'|'center'|'right' = 'inline';
  // UI state
  showAlign = false;
  openMenuIndex: number | null = null;
  // Menu placeholder structure
  docsToolBar: any = [
    {
      name: 'Menu Bar',
      items: [
        {
          name: 'File',
          children: [
            { name: 'New document' },
            { name: 'New', children: [ { name: 'From template gallery' } ] },
            { name: 'Open' },
            { name: 'Make a copy' },
            { name: 'Share', children: [ { name: 'Share with others' }, { name: 'Publish to web' } ] },
            { name: 'Email', children: [ { name: 'Email as attachment' }, { name: 'Email collaborators' } ] },
            { name: 'Download', children: [
              { name: 'Microsoft Word (.docx)' },
              { name: 'OpenDocument Format (.odt)' },
              { name: 'Rich Text Format (.rtf)' },
              { name: 'PDF Document (.pdf)' },
              { name: 'Plain Text (.txt)' },
              { name: 'Web Page (.html, zipped)' },
              { name: 'EPUB Publication (.epub)' }
            ]},
            { name: 'Rename' },
            { name: 'Move' },
            { name: 'Add shortcut to Drive' },
            { name: 'Move to trash' },
            { name: 'Version history', children: [ { name: 'Name current version' }, { name: 'See version history' } ] },
            { name: 'Make available offline' },
            { name: 'Details' },
            { name: 'Language' },
            { name: 'Page setup' },
            { name: 'Print' }
          ]
        },
        {
          name: 'Edit',
          children: [
            { name: 'Undo' },
            { name: 'Redo' },
            { name: 'Cut' },
            { name: 'Copy' },
            { name: 'Paste' },
            { name: 'Paste without formatting' },
            { name: 'Select all' },
            { name: 'Delete' },
            { name: 'Find and replace' },
            { name: 'Select more', children: [ { name: 'Select all matching text' }, { name: 'Select all matching images' } ] }
          ]
        },
        {
          name: 'View',
          children: [
            { name: 'Mode', children: [ { name: 'Editing' }, { name: 'Suggesting' }, { name: 'Viewing' } ] },
            { name: 'Show print layout' },
            { name: 'Show outline' },
            { name: 'Show document outline' },
            { name: 'Show ruler' },
            { name: 'Show equation toolbar' },
            { name: 'Show section breaks' },
            { name: 'Show non-printing characters' },
            { name: 'Full screen' }
          ]
        },
        {
          name: 'Insert',
          children: [
            { name: 'Image', children: [
              { name: 'Upload from computer' }, { name: 'Search the web' }, { name: 'Drive' }, { name: 'Photos' }, { name: 'By URL' }, { name: 'Camera' }
            ]},
            { name: 'Table' },
            { name: 'Drawing', children: [ { name: 'New' }, { name: 'From Drive' } ] },
            { name: 'Chart', children: [ { name: 'Bar' }, { name: 'Column' }, { name: 'Line' }, { name: 'Pie' }, { name: 'From Sheets' } ] },
            { name: 'Horizontal line' },
            { name: 'Emoji' },
            { name: 'Smart chips', children: [ { name: 'People' }, { name: 'File' }, { name: 'Calendar event' }, { name: 'Date' }, { name: 'Dropdown' } ] },
            { name: 'Footnote' },
            { name: 'Building blocks', children: [
              { name: 'Equation' }, { name: 'Table of contents' }, { name: 'Header' }, { name: 'Footer' }, { name: 'Page number' }, { name: 'Page count' },
              { name: 'Page break' }, { name: 'Section break (next page)' }, { name: 'Section break (continuous)' }, { name: 'Column break' }
            ]},
            { name: 'Link' }, { name: 'Comment' }, { name: 'Bookmark' }, { name: 'Watermark' }
          ]
        },
        {
          name: 'Format',
          children: [
            { name: 'Text', children: [
              { name: 'Bold' }, { name: 'Italic' }, { name: 'Underline' }, { name: 'Strikethrough' }, { name: 'Superscript' }, { name: 'Subscript' }, { name: 'Font size' },
              { name: 'Capitalization', children: [ { name: 'lowercase' }, { name: 'UPPERCASE' }, { name: 'Title Case' } ] }
            ]},
            { name: 'Paragraph styles', children: [
              { name: 'Normal text' }, { name: 'Title' }, { name: 'Subtitle' }, { name: 'Heading 1' }, { name: 'Heading 2' }, { name: 'Heading 3' }, { name: 'Heading 4' }, { name: 'Heading 5' }, { name: 'Heading 6' },
              { name: "Apply 'style'" }, { name: "Update 'style' to match" }, { name: 'Options', children: [ { name: 'Save as my default styles' }, { name: 'Use my default styles' }, { name: 'Reset styles' } ] }
            ]},
            { name: 'Align & indent', children: [
              { name: 'Left' }, { name: 'Center' }, { name: 'Right' }, { name: 'Justified' }, { name: 'Increase indent' }, { name: 'Decrease indent' }, { name: 'Indentation options' }
            ]},
            { name: 'Line & paragraph spacing', children: [
              { name: 'Single' }, { name: '1.15' }, { name: '1.5' }, { name: 'Double' }, { name: 'Custom spacing' }, { name: 'Add space before paragraph' }, { name: 'Add space after paragraph' }
            ]},
            { name: 'Columns' },
            { name: 'Bullets & numbering', children: [
              { name: 'List options', children: [ { name: 'Restart numbering' }, { name: 'Continue previous numbering' } ] },
              { name: 'More bullets' }, { name: 'Numbered list' }, { name: 'Bulleted list' }, { name: 'Checklist' }
            ]},
            { name: 'Borders & lines' }, { name: 'Headers & footers' }, { name: 'Page numbers' }, { name: 'Page orientation' },
            { name: 'Table', children: [
              { name: 'Table properties' }, { name: 'Insert row above' }, { name: 'Insert row below' }, { name: 'Insert column left' }, { name: 'Insert column right' },
              { name: 'Delete row' }, { name: 'Delete column' }, { name: 'Delete table' }, { name: 'Distribute rows' }, { name: 'Distribute columns' }, { name: 'Merge cells' }, { name: 'Unmerge cells' }, { name: 'Pin header rows' }
            ]},
            { name: 'Image', children: [ { name: 'Inline' }, { name: 'Wrap text' }, { name: 'Break text' }, { name: 'Image options' }, { name: 'Reset image' }, { name: 'Alt text' } ] },
            { name: 'Clear formatting' }
          ]
        },
        {
          name: 'Tools',
          children: [
            { name: 'Spelling and grammar', children: [ { name: 'Show spelling suggestions' }, { name: 'Show grammar suggestions' }, { name: 'Personal dictionary' } ] },
            { name: 'Word count' }, { name: 'Review suggested edits' }, { name: 'Compare documents' },
            { name: 'Citations', children: [ { name: 'Add citation source' }, { name: 'Manage citations' } ] },
            { name: 'Explore' }, { name: 'Dictionary' }, { name: 'Translate document' }, { name: 'Voice typing' }, { name: 'Linked objects' }, { name: 'Preferences' }
          ]
        },
        {
          name: 'Extensions',
          children: [ { name: 'Add-ons', children: [ { name: 'Get add-ons' }, { name: 'Manage add-ons' } ] }, { name: 'Apps Script' } ]
        },
        {
          name: 'Help',
          children: [
            { name: 'Search the menus' }, { name: 'Docs Help' }, { name: 'Training' }, { name: 'Updates' }, { name: 'Help Docs improve' }, { name: 'Report abuse' }, { name: 'Privacy Policy' }, { name: 'Terms of Service' }, { name: 'Keyboard shortcuts' }
          ]
        }
      ]
    },
    {
      name: 'Formatting Toolbar',
      items: [
        { name: 'Undo' }, { name: 'Redo' }, { name: 'Print' }, { name: 'Spelling and grammar check' }, { name: 'Paint format' }, { name: 'Zoom' },
        { name: 'Styles dropdown', children: [ { name: 'Normal text' }, { name: 'Title' }, { name: 'Subtitle' }, { name: 'Heading 1' }, { name: 'Heading 2' }, { name: 'Heading 3' }, { name: 'Heading 4' }, { name: 'Heading 5' }, { name: 'Heading 6' } ] },
        { name: 'Font family' }, { name: 'Font size' }, { name: 'Bold' }, { name: 'Italic' }, { name: 'Underline' }, { name: 'Text color' }, { name: 'Text highlight color' }, { name: 'Insert link' }, { name: 'Add comment' }, { name: 'Insert image' },
        { name: 'Align', children: [ { name: 'Left align' }, { name: 'Center align' }, { name: 'Right align' }, { name: 'Justify' } ] },
        { name: 'Line spacing', children: [ { name: 'Single' }, { name: '1.15' }, { name: '1.5' }, { name: 'Double' }, { name: 'Custom spacing' } ] },
        { name: 'Checklist' }, { name: 'Bulleted list' }, { name: 'Numbered list' }, { name: 'Decrease indent' }, { name: 'Increase indent' }, { name: 'Clear formatting' },
        { name: 'Editing mode selector', children: [ { name: 'Editing' }, { name: 'Suggesting' }, { name: 'Viewing' } ] }
      ]
    }
  ];
  // Page settings
  pagePreset: 'A4' | 'Letter' | 'Legal' | 'A3' = 'A4';
  orientation: 'portrait' | 'landscape' = 'portrait';
  marginPreset: 'narrow' | 'normal' | 'wide' | 'custom' = 'normal';
  pageSetupModal = false;
  // Effective page size in mm (after orientation applied)
  pageWidthMm = 210;
  pageHeightMm = 297;
  // Margin values in mm (top,right,bottom,left)
  margins = { top: 25.4, right: 25.4, bottom: 25.4, left: 25.4 };
  // Rulers
  @ViewChild('horizontalScale', { static: false }) horizontalScaleRef?: ElementRef<HTMLElement>;
  @ViewChild('verticalScale', { static: false }) verticalScaleRef?: ElementRef<HTMLElement>;
  @ViewChild('hRuler', { static: false }) hRulerRef?: ElementRef<HTMLElement>;
  @ViewChild('vRuler', { static: false }) vRulerRef?: ElementRef<HTMLElement>;
  // Drag state
  private dragging: null | 'left' | 'right' | 'top' | 'bottom' = null;
  private dragMove?: (e: MouseEvent) => void;
  private dragUp?: (e: MouseEvent) => void;
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
    { name: 'Format', menus: [
      { icon: '', name: 'Bold', action: 'fmt:bold' },
      { icon: '', name: 'Italic', action: 'fmt:italic' },
      { icon: '', name: 'Underline', action: 'fmt:underline' },
      { icon: '', name: 'Strikethrough', action: 'fmt:strike' },
      { icon: '', name: 'Text color…', action: 'fmt:foreColor' },
      { icon: '', name: 'Highlight color…', action: 'fmt:hiliteColor' },
      { icon: '', name: 'Normal text', action: 'fmt:h:p' },
      { icon: '', name: 'Heading 1', action: 'fmt:h:h1' },
      { icon: '', name: 'Heading 2', action: 'fmt:h:h2' },
      { icon: '', name: 'Heading 3', action: 'fmt:h:h3' },
      { icon: '', name: 'Clear formatting', action: 'fmt:clear' },
      { icon: '', name: 'Superscript', action: 'fmt:sup' },
      { icon: '', name: 'Subscript', action: 'fmt:sub' },
      { icon: '', name: 'Format painter', action: 'fmt:painter' }
    ]},
    { name: 'Page', menus: [
      { icon: '', name: 'A4', action: 'size:A4' },
      { icon: '', name: 'Letter', action: 'size:Letter' },
      { icon: '', name: 'Legal', action: 'size:Legal' },
      { icon: '', name: 'A3', action: 'size:A3' },
      { icon: '', name: 'Portrait', action: 'orient:portrait' },
      { icon: '', name: 'Landscape', action: 'orient:landscape' },
      { icon: '', name: 'Margins: Narrow', action: 'margins:narrow' },
      { icon: '', name: 'Margins: Normal', action: 'margins:normal' },
      { icon: '', name: 'Margins: Wide', action: 'margins:wide' },
      { icon: '', name: 'Page setup…', action: 'pageSetup' },
    ]},
    { name: 'Insert', menus: [
      { icon: '', name: 'Image', action: 'insertImage' },
      { icon: '', name: 'Table', action: 'insertTable' },
      { icon: '', name: 'Page break', action: 'pageBreak' },
      { icon: '', name: 'Image options…', action: 'imageOptions' }
    ]},
    { name: 'Tools', menus: [
      { icon: '', name: 'Word count', action: 'tools:wordCount' },
      { icon: '', name: 'Spellcheck: Toggle', action: 'tools:toggleSpell' },
      { icon: '', name: 'Paste (keep formatting, sanitized)', action: 'tools:pasteSanitized' },
      { icon: '', name: 'Find and replace…', action: 'tools:find' }
    ]},
    { name: 'Table', menus: [
      { icon: '', name: 'Insert row above', action: 'table:rowAbove' },
      { icon: '', name: 'Insert row below', action: 'table:rowBelow' },
      { icon: '', name: 'Insert column left', action: 'table:colLeft' },
      { icon: '', name: 'Insert column right', action: 'table:colRight' },
      { icon: '', name: 'Delete row', action: 'table:delRow' },
      { icon: '', name: 'Delete column', action: 'table:delCol' },
      { icon: '', name: 'Delete table', action: 'table:delTable' }
    ]},
    { name: 'Extensions', menus: [
      { icon: '', name: 'Coming soon', action: 'noop' }
    ]},
    { name: 'Help', menus: [
      { icon: '', name: 'Docs help', action: 'help' }
    ]},
  ]

  onMenu(action: string) {
    if (action.startsWith('size:')) { this.setPageSize(action.split(':')[1] as any); return; }
    if (action.startsWith('orient:')) { this.setOrientation(action.split(':')[1] as any); return; }
    if (action.startsWith('margins:')) { this.setMargins(action.split(':')[1] as any); return; }
    if (action.startsWith('fmt:ls:')) { this.setLineSpacing(action.split(':')[2]); return; }
    if (action === 'fmt:bold') { this.exec('bold'); return; }
    if (action === 'fmt:italic') { this.exec('italic'); return; }
    if (action === 'fmt:underline') { this.exec('underline'); return; }
    if (action === 'fmt:strike') { this.exec('strikeThrough'); return; }
    if (action === 'fmt:alignLeft') { this.exec('justifyLeft'); return; }
    if (action === 'fmt:alignCenter') { this.exec('justifyCenter'); return; }
    if (action === 'fmt:alignRight') { this.exec('justifyRight'); return; }
    if (action === 'fmt:alignJustify') { this.exec('justifyFull'); return; }
    if (action.startsWith('fmt:h:')) { this.applyHeading(action.split(':')[2] as any); return; }
    if (action === 'fmt:clear') { this.resetFormatting(); return; }
    if (action.startsWith('fmt:dir:')) { this.setDirection(action.split(':')[2] as any); return; }
    if (action === 'fmt:sup') { this.exec('superscript'); return; }
    if (action === 'fmt:sub') { this.exec('subscript'); return; }
    if (action.startsWith('fmt:case:')) { this.changeCase(action.split(':')[2] as any); return; }
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
      case 'pageBreak': this.insertPageBreak(); break;
      case 'insertLink': this.showLink(); break;
      case 'imageOptions': this.openImageOptions(); break;
      case 'pageSetup': this.openPageSetup(); break;
      case 'tools:wordCount': this.showWordCount(); break;
      case 'tools:toggleSpell': this.toggleSpellcheck(); break;
      case 'tools:pasteSanitized': this.requestSanitizedPaste(); break;
      case 'tools:find': this.openFind(); break;
      case 'table:rowAbove': this.modifyTable('rowAbove'); break;
      case 'table:rowBelow': this.modifyTable('rowBelow'); break;
      case 'table:colLeft': this.modifyTable('colLeft'); break;
      case 'table:colRight': this.modifyTable('colRight'); break;
      case 'table:delRow': this.modifyTable('delRow'); break;
      case 'table:delCol': this.modifyTable('delCol'); break;
      case 'table:delTable': this.modifyTable('delTable'); break;
      case 'fmt:foreColor': { const c = prompt('Text color (CSS color)'); if (c) this.setTextColor(c); break; }
      case 'fmt:hiliteColor': { const c = prompt('Highlight color (CSS color)'); if (c) this.setHighlightColor(c); break; }
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
  private modifyTable(action: 'rowAbove'|'rowBelow'|'colLeft'|'colRight'|'delRow'|'delCol'|'delTable'){
    const sel = document.getSelection(); if (!sel || sel.rangeCount === 0) return;
    let node: Node | null = sel.getRangeAt(0).startContainer;
    const cell = (node as any).parentElement?.closest('td,th') as HTMLTableCellElement | null; if (!cell) { alert('Place caret inside a table cell.'); return; }
    const row = cell.parentElement as HTMLTableRowElement; const table = row.closest('table') as HTMLTableElement; if (!row || !table) return;
    const rowIndex = (row.sectionRowIndex ?? row.rowIndex);
    const cellIndex = cell.cellIndex;
    if (action === 'delTable') { table.remove(); this.onEditorInput(); return; }
    if (action === 'rowAbove' || action === 'rowBelow') {
      const ref = row;
      const newRow = row.cloneNode(true) as HTMLTableRowElement; // clone structure
      for (const td of Array.from(newRow.cells)) td.innerHTML = '';
      if (action === 'rowAbove') ref.parentElement?.insertBefore(newRow, ref); else ref.parentElement?.insertBefore(newRow, ref.nextSibling);
    } else if (action === 'delRow') {
      row.remove();
    } else if (action === 'colLeft' || action === 'colRight') {
      for (const r of Array.from(table.rows)) {
        const newCell = r.insertCell(action === 'colLeft' ? cellIndex : cellIndex + 1); newCell.innerHTML = '';
      }
    } else if (action === 'delCol') {
      for (const r of Array.from(table.rows)) { if (r.cells.length > 1) r.deleteCell(cellIndex); }
    }
    this.onEditorInput();
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
    this.route.paramMap.subscribe(async (pm) => {
      const id = pm.get('id') || 'new';
      await this.loadDoc(id);
    });
  }

  private async loadDoc(id: string) {
    if (this.pagesContainerRef) this.pagesContainerRef.nativeElement.innerHTML = '';
    this.doc = { id, title: '', content: '', status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    if (id !== 'new') {
      const existing = this.docs.get(id) || await this.docs.fetch(id);
      if (existing) this.doc = existing; else { this.router.navigate(['/']); return; }
    }
    setTimeout(() => this.renderCurrentDoc());
  }

  private renderCurrentDoc() {
    if (!this.doc || !this.pagesContainerRef) return;
    const el = this.pagesContainerRef.nativeElement;
    const content = this.doc.content || '';
    el.innerHTML = content || '';
    this.ensurePageStructure();
    this.applyPageStyles();
    this.updateRulerTicks();
    this.updatePrintCss();
    this.paginate();
  }

  onTitleChange() { this.queueSave(); }
  onEditorInput() {
    if (!this.doc) return;
    this.ensurePageStructure();
    this.normalizeAllPages();
    this.paginate();
    this.applyPageStyles(); // keep styles consistent if new pages were added
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

  onEditorKeydown(e: KeyboardEvent) {
    const sel = document.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    let node: Node | null = range.startContainer;
    if (!node) return;
    let el: HTMLElement | null = (node.nodeType === Node.ELEMENT_NODE ? node as HTMLElement : (node.parentElement as HTMLElement));
    const page = el ? (el.closest('.page') as HTMLElement | null) : null;
    if (!page) return;

    // Enter: allow default, then let paginate move overflow into the next page
    if (e.key === 'Enter') {
      setTimeout(() => { this.paginate(); this.onEditorInput(); }, 0);
      return;
    }

    if (e.key === 'Backspace') {
      if (!range.collapsed) return; // let default delete selection
      // Determine if caret is at start of the page's first block
      const firstBlock = this.findFirstBlock(page);
      if (!firstBlock) return;
      const startRange = document.createRange();
      startRange.selectNodeContents(firstBlock);
      startRange.collapse(true);
      const atStart = range.compareBoundaryPoints(Range.START_TO_START, startRange) === 0;
      if (!atStart) return;
      // At very start of page. If previous page exists, move caret there.
      const prev = (page.previousElementSibling as HTMLElement) && (page.previousElementSibling as HTMLElement).classList.contains('page')
        ? (page.previousElementSibling as HTMLElement)
        : null;
      if (!prev) return; // first page: do nothing
      e.preventDefault();
      // Place caret at end of previous page's last block
      let lastBlock = this.findLastBlock(prev) as HTMLElement | null;
      if (!lastBlock) {
        lastBlock = document.createElement('div');
        lastBlock.appendChild(document.createElement('br'));
        prev.appendChild(lastBlock);
      }
      const newRange = document.createRange();
      newRange.selectNodeContents(lastBlock);
      newRange.collapse(false);
      sel.removeAllRanges(); sel.addRange(newRange);
      this.paginate();
      // no onEditorInput here since content didn't change
    }
  }
  onEditorMouseup(_e: MouseEvent) { this.applyPainterAtSelection(); }

  onEditorPaste(e: ClipboardEvent) {
    // Default to plain text paste to avoid huge external HTML trees causing hangs
    e.preventDefault();
    const html = e.clipboardData?.getData('text/html') || '';
    const text = e.clipboardData?.getData('text/plain') || '';
    if (this.allowSanitizedPaste && html) {
      const safe = this.sanitizeHtml(html);
      document.execCommand('insertHTML', false, safe);
      this.allowSanitizedPaste = false;
    } else if (text) {
      try { document.execCommand('insertText', false, text); }
      catch { const sel = document.getSelection(); if (!sel || sel.rangeCount === 0) return; const range = sel.getRangeAt(0); range.deleteContents(); range.insertNode(document.createTextNode(text)); }
    } else if (html) {
      const stripped = stripTags(html);
      try { document.execCommand('insertText', false, stripped); }
      catch { const sel = document.getSelection(); if (!sel || sel.rangeCount === 0) return; const range = sel.getRangeAt(0); range.deleteContents(); range.insertNode(document.createTextNode(stripped)); }
    }
    this.onEditorInput();
  }

  // Toolbar helpers
  applyHeading(tag: 'p'|'h1'|'h2'|'h3') { this.applyBlock(tag); }
  setTextColor(color: string) { document.execCommand('foreColor', false, color); this.onEditorInput(); }
  setHighlightColor(color: string) { document.execCommand('hiliteColor', false, color); this.onEditorInput(); }
  setLineSpacing(value: string) {
    if (!value) return;
    const sel = document.getSelection(); if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    let node: Node | null = range.startContainer;
    let block = (node.nodeType === Node.ELEMENT_NODE ? node as HTMLElement : (node?.parentElement as HTMLElement));
    block = block?.closest('.page > *') as HTMLElement;
    if (block) { (block as HTMLElement).style.lineHeight = value; this.onEditorInput(); }
  }
  toggleChecklist() {
    // Simple checklist: create a UL if not in list; otherwise toggle checkbox at start of current LI
    const sel = document.getSelection(); if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    let el = (range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer as HTMLElement : range.startContainer.parentElement as HTMLElement) || null;
    const li = el?.closest('li') as HTMLElement | null;
    if (!li) {
      // wrap current block into a UL with an LI + checkbox
      let block = el?.closest('.page > *') as HTMLElement | null;
      if (!block) return;
      const ul = document.createElement('ul'); ul.style.listStyle = 'none'; ul.style.paddingLeft = '1.2em';
      const liNew = document.createElement('li');
      const cb = document.createElement('input'); cb.type = 'checkbox'; cb.style.marginRight = '0.5em';
      liNew.appendChild(cb);
      // move block into li
      liNew.appendChild(block.cloneNode(true));
      block.replaceWith(ul);
      ul.appendChild(liNew);
    } else {
      // toggle existing checkbox or insert if missing
      let cb = li.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
      if (!cb) { cb = document.createElement('input'); cb.type = 'checkbox'; cb.style.marginRight = '0.5em'; li.insertBefore(cb, li.firstChild); }
      else { cb.checked = !cb.checked; }
    }
    this.onEditorInput();
  }
  setDirection(dir: 'ltr'|'rtl') { const sel = document.getSelection(); if (!sel || sel.rangeCount === 0) return; const range = sel.getRangeAt(0); let el = (range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer as HTMLElement : range.startContainer.parentElement as HTMLElement) || null; let block = el?.closest('.page > *') as HTMLElement | null; if (block) { block.dir = dir; this.onEditorInput(); } }
  setZoom(val: string) { const f = parseFloat(val); if (!isNaN(f) && f > 0) this.scale = f; }
  onAlignChange(val: string) {
    switch (val) {
      case 'left': this.exec('justifyLeft'); break;
      case 'center': this.exec('justifyCenter'); break;
      case 'right': this.exec('justifyRight'); break;
      case 'justify': this.exec('justifyFull'); break;
      default: break;
    }
  }
  @HostListener('document:click') onDocClick() { this.openMenuIndex = null; }

  // Menu bar handler by item name
  onDocsMenuClick(name: string) {
    const n = (name || '').toLowerCase();
    // File
    if (n === 'new document') { this.router.navigate(['/editor', 'new']); return; }
    if (n === 'open') { this.showOpen(); return; }
    if (n === 'make a copy') { this.makeCopy(); return; }
    if (n === 'rename') { this.showRename(); return; }
    if (n === 'page setup') { this.openPageSetup(); return; }
    if (n === 'print') { window.print(); return; }
    if (n === 'share with others') { this.shareDoc(); return; }
    if (n === 'publish to web') { this.downloadAs('html'); return; }
    if (n === 'email as attachment') { this.emailDoc('attach'); return; }
    if (n === 'email collaborators') { this.emailDoc('collab'); return; }
    if (n.includes('pdf document')) { this.downloadAs('pdf'); return; }
    if (n.includes('plain text')) { this.downloadAs('txt'); return; }
    if (n.includes('web page')) { this.downloadAs('html'); return; }
    if (n.includes('rich text format')) { this.downloadAs('rtf'); return; }
    if (n.includes('microsoft word')) { this.downloadAs('docx'); return; }
    if (n.includes('opendocument')) { this.downloadAs('odt'); return; }
    if (n.includes('epub')) { this.downloadAs('epub'); return; }
    if (n === 'move') { this.moveDocPrompt(); return; }
    if (n === 'add shortcut to drive') { this.addShortcutPrompt(); return; }
    if (n === 'move to trash') { this.trashDoc(); return; }
    if (n === 'version history' || n === 'name current version' || n === 'see version history') { this.showVersionHistory(); return; }
    if (n === 'make available offline') { alert('Offline is automatic: saves locally when server unreachable.'); return; }
    if (n === 'details') { this.showDetails(); return; }
    if (n === 'language') { this.languagePrompt(); return; }

    // Edit
    if (n === 'undo') { document.execCommand('undo'); return; }
    if (n === 'redo') { document.execCommand('redo'); return; }
    if (n === 'cut') { document.execCommand('cut'); return; }
    if (n === 'copy') { document.execCommand('copy'); return; }
    if (n === 'paste') { alert('Press Ctrl+V to paste.'); return; }
    if (n === 'paste without formatting') { alert('Paste plain text: Press Ctrl+V now.'); return; }
    if (n === 'select all') { document.execCommand('selectAll'); return; }
    if (n === 'delete') { this.deleteSelection(); return; }
    if (n === 'find and replace') { this.openFind(); return; }
    if (n === 'select all matching text') { this.selectMatching('text'); return; }
    if (n === 'select all matching images') { this.selectMatching('images'); return; }

    // View
    if (n === 'editing') { this.setMode('editing'); return; }
    if (n === 'suggesting') { this.setMode('suggesting'); return; }
    if (n === 'viewing') { this.setMode('viewing'); return; }
    if (n === 'show print layout') { this.togglePrintLayout(); return; }
    if (n === 'show ruler') { this.showRuler = !this.showRuler; return; }
    if (n === 'show outline' || n === 'show document outline') { this.toggleOutline(); return; }
    if (n === 'show equation toolbar') { alert('Equation toolbar not implemented.'); return; }
    if (n === 'show section breaks') { this.toggleSectionBreaks(); return; }
    if (n === 'show non-printing characters') { this.toggleNonPrinting(); return; }
    if (n === 'full screen') { this.enterFullscreen(); return; }

    // Insert
    if (n === 'upload from computer') { this.insertImage(); return; }
    if (n === 'by url') { this.insertImageByUrl(); return; }
    if (n === 'search the web') { this.openWebSearch(); return; }
    if (n === 'drive' || n === 'photos' || n === 'camera') { this.insertImage(); return; }
    if (n === 'table') { this.insertTable(); return; }
    if (n === 'horizontal line') { document.execCommand('insertHorizontalRule'); this.onEditorInput(); return; }
    if (n === 'link') { this.showLink(); return; }
    if (n === 'page break') { this.insertPageBreak(); return; }
    if (n === 'drawing' || n === 'new' || n === 'from drive') { this.insertPlaceholder('Drawing'); return; }
    if (n === 'chart' || n === 'bar' || n === 'column' || n === 'line' || n === 'pie' || n === 'from sheets') { this.insertPlaceholder('Chart'); return; }
    if (n === 'emoji') { this.insertPlaceholder('🙂 Emoji'); return; }
    if (n === 'people') { this.insertChip('people'); return; }
    if (n === 'file') { this.insertChip('file'); return; }
    if (n === 'calendar event') { this.insertChip('calendar'); return; }
    if (n === 'date') { this.insertChip('date'); return; }
    if (n === 'dropdown') { this.insertChip('dropdown'); return; }
    if (n === 'footnote') { this.insertPlaceholder('Footnote'); return; }
    if (n === 'building blocks' || n === 'equation' || n === 'section break (next page)' || n === 'section break (continuous)' || n === 'column break') { this.insertPlaceholder(name); return; }
    if (n === 'table of contents') { this.insertTableOfContents(); return; }
    if (n === 'header') { this.insertPlaceholder('Header'); return; }
    if (n === 'footer') { this.insertPlaceholder('Footer'); return; }
    if (n === 'page number') { this.insertPlaceholder('[Page Number]'); return; }
    if (n === 'page count') { this.insertPlaceholder('[Page Count]'); return; }
    if (n === 'column break') { document.execCommand('insertHTML', false, '<br style="break-after: column;">'); this.onEditorInput(); return; }

    // Format > Text
    if (n === 'bold') { this.exec('bold'); return; }
    if (n === 'italic') { this.exec('italic'); return; }
    if (n === 'underline') { this.exec('underline'); return; }
    if (n === 'strikethrough') { this.exec('strikeThrough'); return; }
    if (n === 'superscript') { this.exec('superscript'); return; }
    if (n === 'subscript') { this.exec('subscript'); return; }
    if (n === 'lowercase') { this.changeCase('lower'); return; }
    if (n === 'uppercase') { this.changeCase('upper'); return; }
    if (n === 'title case') { this.changeCase('title'); return; }

    // Format > Paragraph styles
    if (n === 'normal text') { this.applyHeading('p'); return; }
    if (n === 'title') { this.applyHeading('h1'); return; }
    if (n === 'subtitle') { this.applyHeading('h2'); return; }
    if (n === 'heading 1') { this.applyHeading('h1'); return; }
    if (n === 'heading 2') { this.applyHeading('h2'); return; }
    if (n === 'heading 3') { this.applyHeading('h3'); return; }

    // Format > Align & indent
    if (n === 'left' || n === 'left align') { this.exec('justifyLeft'); return; }
    if (n === 'center' || n === 'center align') { this.exec('justifyCenter'); return; }
    if (n === 'right' || n === 'right align') { this.exec('justifyRight'); return; }
    if (n === 'justified' || n === 'justify') { this.exec('justifyFull'); return; }
    if (n === 'increase indent') { this.exec('indent'); return; }
    if (n === 'decrease indent') { this.exec('outdent'); return; }

    // Format > Line & paragraph spacing
    if (n === 'single') { this.setLineSpacing('1'); return; }
    if (n === '1.15') { this.setLineSpacing('1.15'); return; }
    if (n === '1.5') { this.setLineSpacing('1.5'); return; }
    if (n === 'double') { this.setLineSpacing('2'); return; }

    // Format > Bullets & numbering
    if (n === 'numbered list') { this.exec('insertOrderedList'); return; }
    if (n === 'bulleted list') { this.exec('insertUnorderedList'); return; }
    if (n === 'checklist') { this.toggleChecklist(); return; }

    // Format > Columns
    if (n === 'columns') { this.toggleColumns(); return; }

    // Format > Borders & lines (stub)
    if (n === 'borders & lines') { this.toggleBlockBorder(); return; }

    // Format > Table
    if (n === 'insert row above') { this.modifyTable('rowAbove'); return; }
    if (n === 'insert row below') { this.modifyTable('rowBelow'); return; }
    if (n === 'insert column left') { this.modifyTable('colLeft'); return; }
    if (n === 'insert column right') { this.modifyTable('colRight'); return; }
    if (n === 'delete row') { this.modifyTable('delRow'); return; }
    if (n === 'delete column') { this.modifyTable('delCol'); return; }
    if (n === 'delete table') { this.modifyTable('delTable'); return; }

    // Format > Image
    if (n === 'image options') { this.openImageOptions(); return; }
    if (n === 'reset image') { this.resetSelectedImage(); return; }
    if (n === 'alt text') { this.setAltTextSelectedImage(); return; }

    // Tools
    if (n === 'word count') { this.showWordCount(); return; }
    if (n === 'show spelling suggestions') { this.toggleSpellcheck(); return; }
    if (n === 'find and replace') { this.openFind(); return; }
    if (n === 'compare documents') { this.compareDocuments(); return; }
    if (n === 'review suggested edits') { this.insertPlaceholder('Suggestions panel'); return; }
    if (n === 'citations') { this.insertPlaceholder('Citations'); return; }
    if (n === 'explore') { this.exploreSelection(); return; }
    if (n === 'dictionary' || n === 'personal dictionary') { this.lookupDictionary(); return; }
    if (n === 'translate document') { this.translateSelection(); return; }
    if (n === 'voice typing') { this.insertPlaceholder('Voice typing'); return; }
    if (n === 'linked objects') { this.insertPlaceholder('Linked objects'); return; }
    if (n === 'preferences') { this.togglePreference(); return; }

    // Default: insert a labeled placeholder so it "does something"
    this.insertPlaceholder(name);
  }

  // Edit helpers
  private selectMatching(kind: 'text'|'images') {
    // Clear previous temporary highlights
    const container = this.pagesContainerRef.nativeElement;
    container.querySelectorAll('[data-temp-highlight]')
      .forEach(el => { const node = el as HTMLElement; const parent = node.parentNode; while (node.firstChild) parent?.insertBefore(node.firstChild, node); parent?.removeChild(node); });
    if (kind === 'images') {
      const imgs = container.querySelectorAll('img');
      imgs.forEach(img => { (img as HTMLElement).setAttribute('data-temp-highlight','1'); (img as HTMLElement).style.outline = '2px solid #ef4444'; });
      setTimeout(() => imgs.forEach(img => (img as HTMLElement).style.outline = ''), 1500);
      alert(`${imgs.length} image(s) highlighted`);
      return;
    }
    const sel = document.getSelection(); if (!sel || !sel.toString()) { alert('Select some text first'); return; }
    const q = sel.toString();
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const ranges: Range[] = [];
    let node: Node | null;
    while (node = walker.nextNode()) {
      const text = node.textContent || '';
      let idx = 0;
      while (q && (idx = (text.toLowerCase()).indexOf(q.toLowerCase(), idx)) !== -1) {
        const r = document.createRange(); r.setStart(node, idx); r.setEnd(node, idx + q.length); ranges.push(r); idx += q.length;
      }
    }
    ranges.forEach(r => {
      const span = document.createElement('span'); span.style.background = '#fde68a'; span.setAttribute('data-temp-highlight','1'); r.surroundContents(span);
    });
    setTimeout(() => {
      container.querySelectorAll('[data-temp-highlight]')
        .forEach(el => { const node = el as HTMLElement; const parent = node.parentNode; while (node.firstChild) parent?.insertBefore(node.firstChild, node); parent?.removeChild(node); });
    }, 1500);
    alert(`${ranges.length} match(es) highlighted`);
  }

  private insertTableOfContents() {
    const container = this.pagesContainerRef.nativeElement;
    const headings = container.querySelectorAll('h1,h2,h3,h4,h5,h6');
    const ol = document.createElement('ol'); ol.style.paddingLeft = '1.25em';
    headings.forEach((h, i) => {
      const id = (h as HTMLElement).id || `h_${i}_${Date.now()}`; (h as HTMLElement).id = id;
      const li = document.createElement('li'); const a = document.createElement('a'); a.textContent = (h as HTMLElement).innerText || h.tagName; a.href = `#${id}`; li.appendChild(a); ol.appendChild(li);
    });
    document.execCommand('insertHTML', false, `<div style="border:1px solid #e2e8f0;padding:8px;border-radius:6px"><div style="font-weight:600;margin-bottom:4px">Table of contents</div>${ol.outerHTML}</div>`);
    this.onEditorInput();
  }

  // File helpers
  private async trashDoc() { if (!this.doc) return; await this.docs.softDelete(this.doc.id); alert('Moved to trash'); this.router.navigate(['/']); }
  private shareDoc() { alert('Sharing UI not implemented.'); }
  private emailDoc(which: 'attach'|'collab') {
    const subject = encodeURIComponent(this.doc?.title || 'Document');
    const body = encodeURIComponent(which === 'attach' ? 'See attached document.' : 'Please review this document.');
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }
  private showVersionHistory() { const d=this.doc; alert(`Created: ${d?.createdAt}\nUpdated: ${d?.updatedAt}`); }
  private showDetails() { const d=this.doc; alert(`ID: ${d?.id}\nStatus: ${d?.status}\nCreated: ${d?.createdAt}\nUpdated: ${d?.updatedAt}`); }

  // View helpers
  mode: 'editing'|'suggesting'|'viewing' = 'editing';
  @ViewChild('editorMainPane', { static: false }) editorMainPaneRef?: ElementRef<HTMLDivElement>;
  private applyContentEditable() {
    const editable = this.mode !== 'viewing';
    for (const page of this.getPages()) page.setAttribute('contenteditable', editable ? 'true' : 'false');
  }
  setMode(m: 'editing'|'suggesting'|'viewing') { this.mode = m; this.applyContentEditable(); }
  private printLayout = true;
  togglePrintLayout() { this.printLayout = !this.printLayout; for (const p of this.getPages()) p.style.boxShadow = this.printLayout ? '' : 'none'; }
  private outlineVisible = false; toggleOutline(){ this.outlineVisible = !this.outlineVisible; alert('Outline placeholder'); }
  private sectionBreaksVisible = false; toggleSectionBreaks(){ this.sectionBreaksVisible = !this.sectionBreaksVisible; alert('Section breaks placeholder'); }
  private nonPrintingVisible = false; toggleNonPrinting(){ this.nonPrintingVisible = !this.nonPrintingVisible; alert('Non-printing characters placeholder'); }
  enterFullscreen(){ const el = this.editorMainPaneRef?.nativeElement || document.documentElement; if ((el as any).requestFullscreen) (el as any).requestFullscreen(); }

  // Insert helpers
  private insertPlaceholder(label: string) {
    const html = `<div style=\"border:1px dashed #94a3b8; padding:8px; border-radius:6px; color:#334155; background:#f8fafc; font-size:12px; display:inline-block\">${label} placeholder</div>`;
    document.execCommand('insertHTML', false, html); this.onEditorInput();
  }

  private insertImageByUrl() {
    const url = prompt('Image URL'); if (!url) return; document.execCommand('insertImage', false, url); this.onEditorInput();
  }
  private openWebSearch() {
    const sel = document.getSelection(); const q = encodeURIComponent(sel?.toString() || ''); window.open(`https://www.google.com/search?q=${q}&tbm=isch`, '_blank');
  }
  private insertChip(kind: 'people'|'file'|'calendar'|'date'|'dropdown') {
    const map: any = { people: '👤', file: '📄', calendar: '📅', date: new Date().toLocaleDateString(), dropdown: '▾' };
    const html = `<span contenteditable="false" style="display:inline-flex;align-items:center;gap:6px;padding:2px 6px;border-radius:9999px;border:1px solid #cbd5e1;background:#f8fafc;color:#334155;">${map[kind]||'•'} <span style="font-size:12px">${kind}</span></span>&nbsp;`;
    document.execCommand('insertHTML', false, html); this.onEditorInput();
  }
  private insertTemplateSample() {
    const sample = `<div><h1 style="margin:0 0 8px">Sample Report</h1><h3 style="margin:0 0 16px;color:#475569">Subtitle</h3><p>Intro paragraph with some <b>bold</b> and <i>italic</i> text.</p><h2>Section One</h2><p>Content...</p><h2>Section Two</h2><p>More content...</p></div>`;
    if (this.pagesContainerRef) { this.pagesContainerRef.nativeElement.innerHTML = sample; this.onEditorInput(); this.renderCurrentDoc(); }
  }
  private moveDocPrompt(){ const label = prompt('Move to (label/folder)'); if (!label || !this.doc) return; try{ const raw = localStorage.getItem('doc_labels')||'{}'; const obj = JSON.parse(raw); obj[this.doc.id]=label; localStorage.setItem('doc_labels', JSON.stringify(obj)); alert('Labeled as: '+label);}catch{}}
  private addShortcutPrompt(){ alert('Shortcut created (placeholder).'); }
  private languagePrompt(){ alert('Language set (placeholder).'); }

  private compareDocuments(){ alert('Comparison placeholder. Select text and use Tools → Compare documents for a future diff view.'); }
  private exploreSelection(){ const sel = document.getSelection()?.toString()||''; const q = encodeURIComponent(sel||'document'); window.open(`https://www.google.com/search?q=${q}`,'_blank'); }
  private lookupDictionary(){ const sel = document.getSelection()?.toString()||''; const q = encodeURIComponent(sel||''); if (q) window.open(`https://www.dictionary.com/browse/${q}`,'_blank'); else alert('Select a word first.'); }
  private translateSelection(){ const sel = document.getSelection()?.toString()||''; const q = encodeURIComponent(sel||''); window.open(`https://translate.google.com/?sl=auto&tl=en&text=${q}&op=translate`,'_blank'); }
  private togglePreference(){ const key='docs_pref_plain_paste'; const val = localStorage.getItem(key)==='true'? 'false':'true'; localStorage.setItem(key,val); alert(`Plain-text paste default: ${val==='true'?'ON':'OFF'}`); }

  // Format helpers
  private toggleColumns() {
    const sel = document.getSelection(); if (!sel || sel.rangeCount === 0) return; const range = sel.getRangeAt(0);
    let el = (range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer as HTMLElement : range.startContainer.parentElement as HTMLElement) || null;
    const block = el?.closest('.page > *') as HTMLElement | null; if (!block) return;
    const current = block.style.columnCount; block.style.columnCount = current && current !== '1' ? '1' : '2'; block.style.columnGap = '16px'; this.onEditorInput();
  }
  private toggleBlockBorder() {
    const sel = document.getSelection(); if (!sel || sel.rangeCount === 0) return; const range = sel.getRangeAt(0);
    let el = (range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer as HTMLElement : range.startContainer.parentElement as HTMLElement) || null;
    const block = el?.closest('.page > *') as HTMLElement | null; if (!block) return;
    block.style.border = block.style.border ? '' : '1px solid #cbd5e1'; block.style.padding = block.style.border ? '8px' : ''; this.onEditorInput();
  }

  private resetSelectedImage() {
    const img = this.getSelectedImage(); if (!img) { alert('Select an image'); return; }
    img.removeAttribute('style'); this.onEditorInput();
  }
  private setAltTextSelectedImage() {
    const img = this.getSelectedImage(); if (!img) { alert('Select an image'); return; }
    const alt = prompt('Alt text', img.alt || ''); if (alt !== null) { img.alt = alt; this.onEditorInput(); }
  }
  private getSelectedImage(): HTMLImageElement | null {
    const sel = document.getSelection(); if (!sel || sel.rangeCount === 0) return null;
    let node: Node | null = sel.getRangeAt(0).startContainer;
    return (node instanceof HTMLImageElement) ? node : (node && (node as any).parentElement?.closest('img'));
  }

  private deleteSelection() {
    const sel = document.getSelection(); if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0); if (!sel.toString()) return;
    range.deleteContents(); this.onEditorInput();
  }

  private downloadAs(fmt: 'pdf'|'txt'|'html'|'rtf'|'docx'|'odt'|'epub') {
    // Minimal exports without external libs: txt, html. Others stub with instructions.
    if (!this.doc) return;
    const title = (this.doc.title || 'document').replace(/\s+/g, '-').slice(0,80);
    const html = this.pagesContainerRef?.nativeElement?.innerHTML || '';
    if (fmt === 'txt') {
      const text = stripTags(html).trim();
      const blob = new Blob([text], { type: 'text/plain' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${title}.txt`; a.click(); URL.revokeObjectURL(a.href); return;
    }
    if (fmt === 'html') {
      const full = `<!doctype html><html><head><meta charset="utf-8"><title>${this.doc.title||'Document'}</title></head><body>${html}</body></html>`;
      const blob = new Blob([full], { type: 'text/html' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${title}.html`; a.click(); URL.revokeObjectURL(a.href); return;
    }
    if (fmt === 'pdf') { alert('Use File → Print and select “Save as PDF”.'); return; }
    if (fmt === 'rtf' || fmt === 'docx' || fmt === 'odt' || fmt === 'epub') { alert(`Export to ${fmt.toUpperCase()} not implemented. We can add a converter next.`); return; }
  }

  // Edit menu: next paste uses sanitized HTML
  allowSanitizedPaste = false;
  requestSanitizedPaste() { this.allowSanitizedPaste = true; alert('Next paste will keep formatting (sanitized). Press Ctrl+V now.'); }

  private sanitizeHtml(html: string): string {
    const allowed = new Set(['P','BR','B','STRONG','I','EM','U','S','A','UL','OL','LI','H1','H2','H3','BLOCKQUOTE','CODE','PRE','SPAN','TABLE','THEAD','TBODY','TR','TH','TD','IMG']);
    const temp = document.createElement('div'); temp.innerHTML = html;
    const walker = (node: Node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (!allowed.has(el.tagName)) { const parent = el.parentNode; while (el.firstChild) parent?.insertBefore(el.firstChild, el); parent?.removeChild(el); return; }
        // scrub attributes
        Array.from(el.attributes).forEach(attr => {
          const name = attr.name.toLowerCase();
          if (el.tagName === 'A' && name === 'href') return;
          if (el.tagName === 'IMG' && (name === 'src' || name === 'alt')) return;
          if (name === 'style') { el.setAttribute('style', this.scrubStyle(el.getAttribute('style')||'')); return; }
          el.removeAttribute(attr.name);
        });
      }
      let child = node.firstChild; while (child) { const next = child.nextSibling; walker(child); child = next; }
    };
    walker(temp);
    return temp.innerHTML;
  }
  private scrubStyle(style: string): string {
    // whitelist a few text styles
    const safe: string[] = [];
    style.split(';').forEach(rule => {
      const [rawK, rawV] = rule.split(':'); if (!rawK || !rawV) return;
      const k = rawK.trim().toLowerCase(); const v = rawV.trim();
      if (['font-weight','font-style','text-decoration','color','background-color','font-size','font-family','line-height','text-align','direction'].includes(k)) safe.push(`${k}: ${v}`);
    });
    return safe.join('; ');
  }

  // Case change
  changeCase(which: 'upper'|'lower'|'title') {
    const sel = document.getSelection(); if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const text = sel.toString(); if (!text) return;
    let out = text;
    if (which === 'upper') out = text.toUpperCase();
    else if (which === 'lower') out = text.toLowerCase();
    else out = text.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
    range.deleteContents(); range.insertNode(document.createTextNode(out));
    this.onEditorInput();
  }

  // Format painter
  toggleFormatPainter() {
    this.formatPainterActive = !this.formatPainterActive;
    if (this.formatPainterActive) {
      const sel = document.getSelection(); if (!sel || sel.rangeCount === 0) { this.formatPainterActive = false; return; }
      const range = sel.getRangeAt(0);
      let el = (range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer as HTMLElement : range.startContainer.parentElement as HTMLElement) || null;
      const block = el?.closest('.page > *') as HTMLElement | null; if (!block) { this.formatPainterActive = false; return; }
      const cs = window.getComputedStyle(block);
      const keys = ['fontWeight','fontStyle','textDecoration','color','backgroundColor','fontSize','fontFamily','lineHeight','textAlign','direction'] as const;
      const st: any = {}; keys.forEach(k => st[k] = (cs as any)[k]); this.painterStyle = st;
    } else { this.painterStyle = {}; }
  }
  private applyPainterAtSelection() {
    if (!this.formatPainterActive || !this.painterStyle) return;
    const sel = document.getSelection(); if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    let el = (range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer as HTMLElement : range.startContainer.parentElement as HTMLElement) || null;
    const block = el?.closest('.page > *') as HTMLElement | null; if (!block) return;
    Object.assign(block.style, this.painterStyle);
    this.formatPainterActive = false; this.painterStyle = {}; this.onEditorInput();
  }

  // Image options
  openImageOptions() {
    const sel = document.getSelection(); if (!sel || sel.rangeCount === 0) { alert('Select an image first'); return; }
    let node: Node | null = sel.getRangeAt(0).startContainer;
    const img = (node instanceof HTMLImageElement) ? node : (node && (node as any).parentElement?.closest('img'));
    if (!img) { alert('Place the caret on an image to edit its options.'); return; }
    this.selectedImage = img as HTMLImageElement;
    this.imgWidth = this.selectedImage.style.width || '';
    const cs = window.getComputedStyle(this.selectedImage);
    if (cs.display === 'block' && cs.marginLeft === 'auto' && cs.marginRight === 'auto') this.imgAlign = 'center';
    else if (cs.cssFloat === 'left') this.imgAlign = 'left';
    else if (cs.cssFloat === 'right') this.imgAlign = 'right';
    else this.imgAlign = 'inline';
    this.imageOptionsModal = true;
  }
  closeImageOptions(){ this.imageOptionsModal = false; this.selectedImage = null; }
  applyImageOptions() {
    if (!this.selectedImage) return;
    this.selectedImage.style.width = this.imgWidth || '';
    this.selectedImage.style.maxWidth = '100%';
    this.selectedImage.style.height = 'auto';
    // reset alignment
    this.selectedImage.style.cssFloat = '';
    (this.selectedImage.style as any).float = '';
    this.selectedImage.style.display = '';
    this.selectedImage.style.margin = '';
    if (this.imgAlign === 'left') { (this.selectedImage.style as any).float = 'left'; }
    else if (this.imgAlign === 'right') { (this.selectedImage.style as any).float = 'right'; }
    else if (this.imgAlign === 'center') { this.selectedImage.style.display = 'block'; this.selectedImage.style.margin = '0 auto'; }
    this.imageOptionsModal = false; this.onEditorInput();
  }

  // Find & Replace
  openFind(){ this.findModal = true; }
  closeFind(){ this.findModal = false; }
  private textNodesUnder(el: HTMLElement): Text[] { const out: Text[] = []; const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n: Node | null; while (n = walker.nextNode()) { out.push(n as Text); } return out; }
  private matchAt(text: string, idx: number, q: string, whole: boolean, cs: boolean): boolean {
    const slice = text.substr(idx, q.length); if ((cs ? slice : slice.toLowerCase()) !== (cs ? q : q.toLowerCase())) return false;
    if (!whole) return true;
    const isWord = (c: string) => /[\w\p{L}]/u.test(c);
    const prev = text[idx - 1]; const next = text[idx + q.length];
    return (!prev || !isWord(prev)) && (!next || !isWord(next));
  }
  findNext() {
    const q = this.findQuery || ''; if (!q) return;
    const nodes = this.textNodesUnder(this.pagesContainerRef.nativeElement);
    const sel = document.getSelection(); const startNode = sel && sel.rangeCount ? sel.getRangeAt(0).endContainer : null;
    let started = !startNode;
    for (const n of nodes) {
      if (!started) { started = (n === startNode); continue; }
      const text = String(n.textContent || '');
      for (let i = 0; i <= text.length - q.length; i++) {
        if (this.matchAt(text, i, q, this.findWhole, this.findCase)) {
          const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + q.length);
          const sel2 = document.getSelection(); sel2?.removeAllRanges(); sel2?.addRange(r);
          (r.commonAncestorContainer as Element)?.parentElement?.scrollIntoView({ block: 'center', behavior: 'smooth' });
          return;
        }
      }
    }
    // wrap around
    if (nodes.length) { const n = nodes[0]; const r = document.createRange(); r.setStart(n, 0); r.collapse(true); const sel2 = document.getSelection(); sel2?.removeAllRanges(); sel2?.addRange(r); this.findNext(); }
  }
  findPrev() {
    const q = this.findQuery || ''; if (!q) return;
    const nodes = this.textNodesUnder(this.pagesContainerRef.nativeElement);
    const sel = document.getSelection(); const startNode = sel && sel.rangeCount ? sel.getRangeAt(0).startContainer : null;
    let idx = startNode ? nodes.indexOf(startNode as Text) : nodes.length - 1;
    for (let ni = idx; ni >= 0; ni--) {
      const n = nodes[ni]; const text = String(n.textContent || '');
      for (let i = text.length - q.length; i >= 0; i--) {
        if (this.matchAt(text, i, q, this.findWhole, this.findCase)) {
          const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + q.length);
          const sel2 = document.getSelection(); sel2?.removeAllRanges(); sel2?.addRange(r);
          (r.commonAncestorContainer as Element)?.parentElement?.scrollIntoView({ block: 'center', behavior: 'smooth' });
          return;
        }
      }
    }
  }
  replaceOne() {
    const sel = document.getSelection(); if (!sel || sel.rangeCount === 0) return; const range = sel.getRangeAt(0);
    const q = this.findQuery || ''; const repl = this.replaceQuery || '';
    if (!q) return;
    if (sel.toString() && (!this.findWhole || new RegExp(`^${q}$`).test(sel.toString()))) {
      range.deleteContents(); range.insertNode(document.createTextNode(repl));
      this.onEditorInput();
      this.findNext();
    }
  }
  replaceAll() {
    const q = this.findQuery || ''; const repl = this.replaceQuery || '';
    if (!q) return;
    const nodes = this.textNodesUnder(this.pagesContainerRef.nativeElement);
    for (const n of nodes) {
      const text = String(n.textContent || '');
      const cs = this.findCase; const whole = this.findWhole;
      if (!text) continue;
      let i = 0; let out = '';
      while (i <= text.length - q.length) {
        if (this.matchAt(text, i, q, whole, cs)) { out += repl; i += q.length; }
        else { out += text[i]; i++; }
      }
      out += text.slice(i);
      if (out !== text) n.textContent = out;
    }
    this.onEditorInput();
  }

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
        // If the last block is too tall to ever fit, try to split it
        const lastTop = last.getBoundingClientRect().top;
        const pageTop = page.getBoundingClientRect().top;
        const available = page.clientHeight - (lastTop - pageTop);
        if (last.offsetHeight > available && this.canSplitBlock(last)) {
          const split = this.splitBlock(last as HTMLElement, available);
          if (split) {
            next.insertBefore(split, next.firstChild);
          } else {
            next.insertBefore(last, next.firstChild);
          }
        } else {
          next.insertBefore(last, next.firstChild);
        }
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
        // Do not pull back an explicit page-start marker paragraph
        if (first.hasAttribute && (first as HTMLElement).hasAttribute('data-page-start')) break;
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

  private canSplitBlock(el: Element): boolean {
    const tag = (el.tagName || '').toUpperCase();
    return tag === 'DIV' || tag === 'P' || tag === 'BLOCKQUOTE' || tag === 'LI';
  }

  private splitBlock(block: HTMLElement, availablePx: number): HTMLElement | null {
    // Clone a new block with same class/style, move trailing children/text until the original fits available space
    const clone = document.createElement(block.tagName.toLowerCase());
    clone.className = block.className;
    clone.setAttribute('style', block.getAttribute('style') || '');
    // Move nodes from the end to the clone until the block fits into availablePx
    let safety = 0;
    const fits = () => block.getBoundingClientRect().height <= availablePx + 1;

    // If single large text node, binary split by characters
    if (block.childNodes.length === 1 && block.firstChild?.nodeType === Node.TEXT_NODE) {
      const textNode = block.firstChild as Text;
      const full = textNode.textContent || '';
      let lo = 0, hi = full.length;
      // Ensure a <br> at end to preserve line
      if (!block.lastChild || block.lastChild.nodeName !== 'BR') { block.appendChild(document.createElement('br')); }
      // Find largest head that fits
      while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        textNode.textContent = full.slice(0, mid);
        if (fits()) lo = mid; else hi = mid - 1;
      }
      textNode.textContent = full.slice(0, lo);
      const tailText = full.slice(lo);
      if (tailText.length === 0) return null;
      clone.textContent = tailText;
      return clone;
    }

    while (!fits() && block.childNodes.length > 0 && safety++ < 2000) {
      const child = block.lastChild as Node;
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent || '';
        if (text.length <= 1) { clone.insertBefore(child, clone.firstChild); continue; }
        // Move entire text node to clone and continue
        clone.insertBefore(child, clone.firstChild);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const ce = child as HTMLElement;
        clone.insertBefore(ce, clone.firstChild);
      } else {
        clone.insertBefore(child, clone.firstChild);
      }
    }
    // If nothing moved, give up
    if (clone.childNodes.length === 0) return null;
    return clone;
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

  // Page controls
  private sizePresets: Record<string, { w: number, h: number }> = {
    A4: { w: 210, h: 297 },
    Letter: { w: 216, h: 279 },
    Legal: { w: 216, h: 356 },
    A3: { w: 297, h: 420 },
  };
  private marginPresets: Record<'narrow'|'normal'|'wide', number> = {
    narrow: 12.7,
    normal: 25.4,
    wide: 31.75,
  };

  private effectiveSizeMm() {
    const s = this.sizePresets[this.pagePreset];
    if (!s) return { w: this.pageWidthMm, h: this.pageHeightMm };
    return this.orientation === 'portrait' ? { w: s.w, h: s.h } : { w: s.h, h: s.w };
  }

  private applyPageStyles() {
    const { w, h } = this.effectiveSizeMm();
    this.pageWidthMm = w; this.pageHeightMm = h;
    const pad = `${this.margins.top}mm ${this.margins.right}mm ${this.margins.bottom}mm ${this.margins.left}mm`;
    for (const page of this.getPages()) {
      page.style.width = `${w}mm`;
      page.style.height = `${h}mm`;
      page.style.padding = pad;
    }
  }

  private updateRulerTicks() {
    const { w, h } = this.effectiveSizeMm();
    this.hTicks = Array.from({ length: Math.ceil(w / 10) + 1 });
    this.vTicks = Array.from({ length: Math.ceil(h / 10) + 1 });
  }

  private getXRulerRect() {
    const el = this.hRulerRef?.nativeElement || this.horizontalScaleRef?.nativeElement;
    return el?.getBoundingClientRect();
  }
  private getYRulerRect() {
    const el = this.vRulerRef?.nativeElement || this.verticalScaleRef?.nativeElement;
    return el?.getBoundingClientRect();
  }
  pageWidthPx(): number { const r = this.getXRulerRect(); return r ? r.width : this.pageWidthMm * 3.78; }
  pageHeightPx(): number { const r = this.getYRulerRect(); return r ? r.height : this.pageHeightMm * 3.78; }
  marginLeftPx(): number { return this.margins.left * (this.pageWidthPx() / this.pageWidthMm); }
  marginRightPx(): number { return this.margins.right * (this.pageWidthPx() / this.pageWidthMm); }
  marginTopPx(): number { return this.margins.top * (this.pageHeightPx() / this.pageHeightMm); }
  marginBottomPx(): number { return this.margins.bottom * (this.pageHeightPx() / this.pageHeightMm); }

  onMarginDragStart(which: 'left'|'right'|'top'|'bottom', ev: MouseEvent) {
    ev.preventDefault(); ev.stopPropagation();
    this.dragging = which; this.marginPreset = 'custom';
    this.dragMove = (e: MouseEvent) => this.onMarginDragMove(e);
    this.dragUp = (e: MouseEvent) => this.onMarginDragEnd(e);
    window.addEventListener('mousemove', this.dragMove!);
    window.addEventListener('mouseup', this.dragUp!);
  }
  private onMarginDragMove(e: MouseEvent) {
    if (!this.dragging) return;
    const minContent = 10; // mm
    if (this.dragging === 'left' || this.dragging === 'right') {
      const rect = this.getXRulerRect(); if (!rect) return;
      const ratio = this.pageWidthMm / rect.width;
      const mmFromLeft = (e.clientX - rect.left) * ratio;
      if (this.dragging === 'left') {
        const max = Math.max(0, this.pageWidthMm - this.margins.right - minContent);
        this.margins.left = Math.min(Math.max(0, mmFromLeft), max);
      } else {
        const mmFromRight = this.pageWidthMm - mmFromLeft;
        const max = Math.max(0, this.pageWidthMm - this.margins.left - minContent);
        this.margins.right = Math.min(Math.max(0, mmFromRight), max);
      }
    } else {
      const rect = this.getYRulerRect(); if (!rect) return;
      const ratio = this.pageHeightMm / rect.height;
      const mmFromTop = (e.clientY - rect.top) * ratio;
      if (this.dragging === 'top') {
        const max = Math.max(0, this.pageHeightMm - this.margins.bottom - minContent);
        this.margins.top = Math.min(Math.max(0, mmFromTop), max);
      } else {
        const mmFromBottom = this.pageHeightMm - mmFromTop;
        const max = Math.max(0, this.pageHeightMm - this.margins.top - minContent);
        this.margins.bottom = Math.min(Math.max(0, mmFromBottom), max);
      }
    }
    this.applyPageStyles();
    this.paginate();
  }
  private onMarginDragEnd(_e: MouseEvent) {
    window.removeEventListener('mousemove', this.dragMove!);
    window.removeEventListener('mouseup', this.dragUp!);
    this.dragging = null; this.dragMove = undefined; this.dragUp = undefined;
    this.onEditorInput(); // persist document HTML with updated page padding
  }

  private updatePrintCss() {
    const { w, h } = this.effectiveSizeMm();
    const id = 'print-page-size';
    let styleEl = document.getElementById(id) as HTMLStyleElement | null;
    const css = `@media print{ @page{ size: ${w}mm ${h}mm; margin:0; } }`;
    if (!styleEl) {
      styleEl = document.createElement('style'); styleEl.id = id; styleEl.type = 'text/css'; styleEl.textContent = css; document.head.appendChild(styleEl);
    } else { styleEl.textContent = css; }
  }

  setPageSize(preset: 'A4'|'Letter'|'Legal'|'A3') {
    this.pagePreset = preset;
    this.applyPageStyles();
    this.updateRulerTicks();
    this.updatePrintCss();
    this.paginate();
    this.onEditorInput();
  }
  setOrientation(o: 'portrait'|'landscape') {
    this.orientation = o;
    this.applyPageStyles();
    this.updateRulerTicks();
    this.updatePrintCss();
    this.paginate();
    this.onEditorInput();
  }
  setMargins(preset: 'narrow'|'normal'|'wide') {
    this.marginPreset = preset;
    const v = this.marginPresets[preset];
    this.margins = { top: v, right: v, bottom: v, left: v };
    this.applyPageStyles();
    this.paginate();
    this.onEditorInput();
  }

  openPageSetup() { this.pageSetupModal = true; }
  closePageSetup() { this.pageSetupModal = false; }
  confirmPageSetup() {
    this.applyPageStyles();
    this.updateRulerTicks();
    this.updatePrintCss();
    this.paginate();
    this.pageSetupModal = false;
    this.onEditorInput();
  }

  private insertPageBreak() {
    const sel = document.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    // Find the block element containing the caret
    let node: Node | null = range.startContainer;
    while (node && node.nodeType === Node.TEXT_NODE) node = node.parentElement as HTMLElement;
    let block = node as HTMLElement | null;
    while (block && block.parentElement && !block.parentElement.classList.contains('page')) block = block.parentElement;
    const currentPage = block?.closest('.page') as HTMLElement | null;
    if (!currentPage) return;
    const container = this.pagesContainerRef.nativeElement;
    const newPage = this.createPage();
    container.insertBefore(newPage, currentPage.nextSibling);
    // Move following siblings after the block into the new page
    if (block && block.parentElement === currentPage) {
      let mover = block.nextSibling;
      const items: Node[] = [];
      while (mover) { const next = mover.nextSibling; items.push(mover); mover = next; }
      for (const it of items) newPage.appendChild(it);
    }
    this.applyPageStyles();
    this.paginate();
    this.onEditorInput();
  }

  private showWordCount() {
    const text = stripTags(this.pagesContainerRef?.nativeElement.innerHTML || '').trim();
    const words = text ? text.split(/\s+/).length : 0;
    const chars = text.replace(/\s/g, '').length;
    alert(`Words: ${words}\nCharacters (no spaces): ${chars}`);
  }
  private toggleSpellcheck() {
    for (const page of this.getPages()) page.setAttribute('spellcheck', page.getAttribute('spellcheck') === 'true' ? 'false' : 'true');
  }
}

function stripTags(html: string): string { return html.replace(/<[^>]*>/g, ' '); }
