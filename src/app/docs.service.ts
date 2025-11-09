import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../environments/environment';

export type DocStatus = 'active' | 'archived' | 'deleted';
export interface Doc {
  id: string;
  title?: string;
  content?: string;
  status: DocStatus;
  createdAt: string;
  updatedAt: string;
}

const API_BASE = normalizeBase(environment.docsApiBase || 'https://docs-api.berjis.tech');
const STORAGE_KEY = 'berjis-docs';

@Injectable({ providedIn: 'root' })
export class DocsService {
  private cache: Record<string, Doc> = {};
  private preferRemote = true;
  syncMode: 'remote' | 'local' = 'remote';
  isSaving = false;
  lastSavedAt: string | null = null;
  lastError: string | null = null;

  constructor(private http: HttpClient) { this.load(); }

  private load() { try { const raw = localStorage.getItem(STORAGE_KEY); this.cache = raw ? JSON.parse(raw) : {}; } catch { this.cache = {}; } }
  private persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.cache)); }
  private now() { return new Date().toISOString(); }

  async list(status: DocStatus[] = ['active'], opts?: { includeExpiredDeleted?: boolean }): Promise<Doc[]> {
    if (this.preferRemote) {
      try {
        const res = await firstValueFrom(this.http.get<any>(`${API_BASE}/v1/docs`, { params: { status: status.join(',') }, withCredentials: true }));
        let rows: Doc[] = res?.data || [];
        rows = this.filterDeleted(rows, status, !!opts?.includeExpiredDeleted);
        for (const d of rows) this.cache[d.id] = d; this.persist();
        this.preferRemote = true; this.syncMode = 'remote'; this.lastError = null;
        return rows;
      } catch (e) { this.switchToLocal(e); }
    }
    let rows = Object.values(this.cache).filter(d => status.includes(d.status));
    rows = this.filterDeleted(rows, status, !!opts?.includeExpiredDeleted);
    return rows.sort((a,b)=> (b.updatedAt||'').localeCompare(a.updatedAt||''));
  }

  private filterDeleted(rows: Doc[], status: DocStatus[], includeExpired: boolean): Doc[] {
    if (!status.includes('deleted') || includeExpired) return rows;
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    return rows.filter(d => d.status !== 'deleted' || (now - Date.parse(d.updatedAt || d.createdAt)) <= THIRTY_DAYS);
  }

  async listTrashRecent(): Promise<Doc[]> { return this.list(['deleted']); }

  get(id: string) { return this.cache[id]; }

  async fetch(id: string): Promise<Doc | undefined> {
    if (this.preferRemote) {
      try {
        const res = await firstValueFrom(this.http.get<any>(`${API_BASE}/v1/docs/${id}`, { withCredentials: true }));
        const d: Doc = res?.data; if (d) { this.cache[d.id] = d; this.persist(); }
        this.preferRemote = true; this.syncMode = 'remote'; this.lastError = null; return d;
      } catch (e) { this.switchToLocal(e); }
    }
    return this.cache[id];
  }

  async create(initial?: Partial<Doc>): Promise<Doc> {
    const tmp: Doc = { id: this.uuid(), title: initial?.title?.trim() || '', content: initial?.content || '', status: 'active', createdAt: this.now(), updatedAt: this.now() };
    if (this.preferRemote) {
      try {
        this.beginSave();
        const res = await firstValueFrom(this.http.post<any>(`${API_BASE}/v1/docs`, { title: tmp.title || undefined, content: tmp.content || undefined }, { withCredentials: true }));
        const d: Doc = res.data; this.cache[d.id] = d; this.persist(); this.endSave(); this.syncMode='remote'; return d;
      } catch (e) { this.endSave(e); this.switchToLocal(e); }
    }
    this.cache[tmp.id] = tmp; this.persist(); return tmp;
  }

  async save(d: Doc): Promise<Doc | undefined> {
    const hasTitle = !!d.title && d.title.trim().length > 0;
    const hasContent = !!d.content && d.content.replace(/<[^>]*>/g, '').trim().length > 0;
    if (!hasTitle && !hasContent) return undefined;
    if (this.preferRemote) {
      try {
        this.beginSave();
        const res = await firstValueFrom(this.http.put<any>(`${API_BASE}/v1/docs/${d.id}`, { title: d.title || undefined, content: d.content || undefined }, { withCredentials: true }));
        const out: Doc = res.data; this.cache[out.id] = out; this.persist(); this.endSave(); this.syncMode='remote'; return out;
      } catch (e) { this.endSave(e); this.switchToLocal(e); }
    }
    d.updatedAt = this.now(); this.cache[d.id] = { ...d }; this.persist(); return d;
  }

  async archive(id: string) { if (this.preferRemote) { try { this.beginSave(); await firstValueFrom(this.http.post(`${API_BASE}/v1/docs/${id}/archive`, {}, { withCredentials: true })); this.endSave(); } catch (e) { this.endSave(e); this.switchToLocal(e); } } const d=this.cache[id]; if (d) { d.status='archived'; d.updatedAt=this.now(); this.persist(); } }
  async restore(id: string) { if (this.preferRemote) { try { this.beginSave(); await firstValueFrom(this.http.post(`${API_BASE}/v1/docs/${id}/restore`, {}, { withCredentials: true })); this.endSave(); } catch (e) { this.endSave(e); this.switchToLocal(e); } } const d=this.cache[id]; if (d) { d.status='active'; d.updatedAt=this.now(); this.persist(); } }
  async softDelete(id: string) { if (this.preferRemote) { try { this.beginSave(); await firstValueFrom(this.http.delete(`${API_BASE}/v1/docs/${id}`, { withCredentials: true })); this.endSave(); } catch (e) { this.endSave(e); this.switchToLocal(e); } } const d=this.cache[id]; if (d) { d.status='deleted'; d.updatedAt=this.now(); this.persist(); } }

  private beginSave() { this.isSaving = true; this.lastError = null; }
  private endSave(err?: any) { this.isSaving = false; if (err) this.lastError = err?.message || 'sync error'; else this.lastSavedAt = this.now(); }
  private switchToLocal(e?: any) { this.preferRemote = false; this.syncMode = 'local'; this.lastError = e?.message || 'offline, saving locally'; }
  private uuid(): string { return 'd_' + Math.random().toString(36).slice(2) + Date.now().toString(36); }
}

function normalizeBase(base: string): string {
  if (!base) return '';
  return base.replace(/\/+$/, '');
}
