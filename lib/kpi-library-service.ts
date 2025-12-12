// lib/kpi-library-service.ts
import type { 
  KpiLibraryEntry, 
  KpiLibraryUpload, 
  KpiLibraryChangeRequest,
  User 
} from './types';
import { authService } from './auth-service';

/**
 * KPI Library Service
 * Manages KPI library entries, uploads, and change requests
 */
class KpiLibraryService {
  private readonly STORAGE_KEY_ENTRIES = 'kpi_library_entries';
  private readonly STORAGE_KEY_UPLOADS = 'kpi_library_uploads';
  private readonly STORAGE_KEY_REQUESTS = 'kpi_library_change_requests';

  // Helper to check if localStorage is available
  private isClient(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  // Safe localStorage getter
  private getFromStorage(key: string): string {
    if (!this.isClient()) return '[]';
    return localStorage.getItem(key) || '[]';
  }

  // Safe localStorage setter
  private setToStorage(key: string, value: string): void {
    if (this.isClient()) {
      localStorage.setItem(key, value);
    }
  }

  /**
   * ========================
   * KPI LIBRARY ENTRIES
   * ========================
   */

  /**
   * Get all KPI library entries with optional filtering
   */
  getEntries(filters?: {
    department?: string;
    jobTitle?: string;
    kpiType?: string;
    status?: 'ACTIVE' | 'INACTIVE' | 'PENDING_APPROVAL';
    isTemplate?: boolean;
  }): KpiLibraryEntry[] {
    let entries: KpiLibraryEntry[] = JSON.parse(
      this.getFromStorage(this.STORAGE_KEY_ENTRIES)
    );

    if (filters) {
      if (filters.department) {
        entries = entries.filter(e => 
          e.department.toLowerCase().includes(filters.department!.toLowerCase())
        );
      }
      if (filters.jobTitle) {
        entries = entries.filter(e => 
          e.jobTitle.toLowerCase().includes(filters.jobTitle!.toLowerCase())
        );
      }
      if (filters.kpiType) {
        entries = entries.filter(e => e.kpiType === filters.kpiType);
      }
      if (filters.status) {
        entries = entries.filter(e => e.status === filters.status);
      }
      if (filters.isTemplate !== undefined) {
        entries = entries.filter(e => e.isTemplate === filters.isTemplate);
      }
    }

    return entries.sort((a, b) => a.stt - b.stt);
  }

  /**
   * Get single entry by ID
   */
  getEntryById(id: string): KpiLibraryEntry | undefined {
    const entries = this.getEntries();
    return entries.find(e => e.id === id);
  }

  /**
   * Add new entry
   */
  addEntry(entry: {
    stt: number;
    ogsmTarget: string;
    department: string;
    jobTitle: string;
    kpiName: string;
    kpiType: 'I' | 'II' | 'III' | 'IV';
    unit: string;
    dataSource: string;
    yearlyTarget?: number | string;
    quarterlyTarget?: number | string;
    status: 'ACTIVE' | 'INACTIVE' | 'PENDING_APPROVAL';
    isTemplate: boolean;
  }): KpiLibraryEntry {
    const user = authService.getCurrentUser();
    if (!user || !['ADMIN', 'HR'].includes(user.role)) {
      throw new Error('Insufficient permissions');
    }

    const entries = this.getEntries();
    const newEntry: KpiLibraryEntry = {
      ...entry,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      uploadedBy: user.id
    };

    entries.push(newEntry);
    this.setToStorage(this.STORAGE_KEY_ENTRIES, JSON.stringify(entries));

    return newEntry;
  }

  /**
   * Update existing entry
   */
  updateEntry(id: string, updates: Partial<KpiLibraryEntry>): KpiLibraryEntry {
    const user = authService.getCurrentUser();
    if (!user || !['ADMIN', 'HR'].includes(user.role)) {
      throw new Error('Insufficient permissions');
    }

    const entries = this.getEntries();
    const index = entries.findIndex(e => e.id === id);
    
    if (index === -1) {
      throw new Error('Entry not found');
    }

    entries[index] = {
      ...entries[index],
      ...updates,
      updatedAt: new Date().toISOString(),
      version: entries[index].version + 1
    };

    this.setToStorage(this.STORAGE_KEY_ENTRIES, JSON.stringify(entries));
    return entries[index];
  }

  /**
   * Delete entry
   */
  deleteEntry(id: string): void {
    const user = authService.getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      throw new Error('Admin access required');
    }

    const entries = this.getEntries();
    const filtered = entries.filter(e => e.id !== id);
    localStorage.setItem(this.STORAGE_KEY_ENTRIES, JSON.stringify(filtered));
  }

  /**
   * ========================
   * UPLOAD MANAGEMENT
   * ========================
   */

  /**
   * Create upload record
   */
  createUpload(data: {
    fileName: string;
    entries: Array<{
      stt: number;
      ogsmTarget: string;
      department: string;
      jobTitle: string;
      kpiName: string;
      kpiType: 'I' | 'II' | 'III' | 'IV';
      unit: string;
      dataSource: string;
      yearlyTarget?: number | string;
      quarterlyTarget?: number | string;
    }>;
  }): KpiLibraryUpload {
    const user = authService.getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      throw new Error('Admin access required');
    }

    const upload: KpiLibraryUpload = {
      id: this.generateId(),
      fileName: data.fileName,
      uploadedBy: user.id,
      uploadedAt: new Date().toISOString(),
      totalEntries: data.entries.length,
      status: 'PENDING'
    };

    const uploads = this.getUploads();
    uploads.push(upload);
    this.setToStorage(this.STORAGE_KEY_UPLOADS, JSON.stringify(uploads));

    // Store entries as pending with all required fields
    data.entries.forEach(entry => {
      this.addEntry({
        ...entry,
        status: 'PENDING_APPROVAL',
        isTemplate: true
      });
    });

    return upload;
  }

  /**
   * Get all uploads
   */
  getUploads(): KpiLibraryUpload[] {
    return JSON.parse(this.getFromStorage(this.STORAGE_KEY_UPLOADS));
  }

  /**
   * Approve upload
   */
  approveUpload(uploadId: string, comment?: string): void {
    const user = authService.getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      throw new Error('Admin access required');
    }

    const uploads = this.getUploads();
    const upload = uploads.find(u => u.id === uploadId);
    
    if (!upload) {
      throw new Error('Upload not found');
    }

    upload.status = 'APPROVED';
    upload.approvedBy = user.id;
    upload.approvedAt = new Date().toISOString();

    this.setToStorage(this.STORAGE_KEY_UPLOADS, JSON.stringify(uploads));

    // Activate all pending entries from this upload
    const entries = this.getEntries({ status: 'PENDING_APPROVAL' });
    entries.forEach(entry => {
      if (entry.uploadedBy === upload.uploadedBy && 
          entry.createdAt === upload.uploadedAt) {
        this.updateEntry(entry.id, { status: 'ACTIVE' });
      }
    });
  }

  /**
   * Reject upload
   */
  rejectUpload(uploadId: string, reason: string): void {
    const user = authService.getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      throw new Error('Admin access required');
    }

    const uploads = this.getUploads();
    const upload = uploads.find(u => u.id === uploadId);
    
    if (!upload) {
      throw new Error('Upload not found');
    }

    upload.status = 'REJECTED';
    upload.approvedBy = user.id;
    upload.approvedAt = new Date().toISOString();
    upload.rejectionReason = reason;

    this.setToStorage(this.STORAGE_KEY_UPLOADS, JSON.stringify(uploads));

    // Delete all pending entries from this upload
    const entries = this.getEntries({ status: 'PENDING_APPROVAL' });
    entries.forEach(entry => {
      if (entry.uploadedBy === upload.uploadedBy && 
          entry.createdAt === upload.uploadedAt) {
        this.deleteEntry(entry.id);
      }
    });
  }

  /**
   * ========================
   * CHANGE REQUESTS
   * ========================
   */

  /**
   * Create change request
   */
  createChangeRequest(data: {
    requestType: 'ADD' | 'EDIT' | 'DELETE';
    department: string;
    currentEntry?: KpiLibraryEntry;
    proposedEntry: Partial<KpiLibraryEntry>;
    reason: string;
  }): KpiLibraryChangeRequest {
    const user = authService.getCurrentUser();
    if (!user) {
      throw new Error('Authentication required');
    }

    const request: KpiLibraryChangeRequest = {
      id: this.generateId(),
      requestType: data.requestType,
      requestedBy: user.id,
      requestedAt: new Date().toISOString(),
      department: data.department,
      currentEntry: data.currentEntry,
      proposedEntry: data.proposedEntry,
      reason: data.reason,
      status: 'PENDING'
    };

    const requests = this.getChangeRequests();
    requests.push(request);
    this.setToStorage(this.STORAGE_KEY_REQUESTS, JSON.stringify(requests));

    return request;
  }

  /**
   * Get all change requests
   */
  getChangeRequests(filters?: {
    status?: 'PENDING' | 'APPROVED' | 'REJECTED';
    department?: string;
    requestType?: 'ADD' | 'EDIT' | 'DELETE';
  }): KpiLibraryChangeRequest[] {
    let requests: KpiLibraryChangeRequest[] = JSON.parse(
      this.getFromStorage(this.STORAGE_KEY_REQUESTS)
    );

    if (filters) {
      if (filters.status) {
        requests = requests.filter(r => r.status === filters.status);
      }
      if (filters.department) {
        requests = requests.filter(r => 
          r.department.toLowerCase().includes(filters.department!.toLowerCase())
        );
      }
      if (filters.requestType) {
        requests = requests.filter(r => r.requestType === filters.requestType);
      }
    }

    return requests.sort((a, b) => 
      new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
    );
  }

  /**
   * Approve change request
   */
  approveChangeRequest(requestId: string, comment?: string): void {
    const user = authService.getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      throw new Error('Admin access required');
    }

    const requests = this.getChangeRequests();
    const request = requests.find(r => r.id === requestId);
    
    if (!request) {
      throw new Error('Change request not found');
    }

    if (request.status !== 'PENDING') {
      throw new Error('Change request already processed');
    }

    request.status = 'APPROVED';
    request.reviewedBy = user.id;
    request.reviewedAt = new Date().toISOString();
    request.reviewComment = comment;

    this.setToStorage(this.STORAGE_KEY_REQUESTS, JSON.stringify(requests));

    // Apply the change
    switch (request.requestType) {
      case 'ADD':
        this.addEntry({
          ...request.proposedEntry as any,
          status: 'ACTIVE'
        });
        break;

      case 'EDIT':
        if (request.currentEntry) {
          this.updateEntry(request.currentEntry.id, {
            ...request.proposedEntry,
            status: 'ACTIVE'
          });
        }
        break;

      case 'DELETE':
        if (request.currentEntry) {
          this.updateEntry(request.currentEntry.id, {
            status: 'INACTIVE'
          });
        }
        break;
    }
  }

  /**
   * Reject change request
   */
  rejectChangeRequest(requestId: string, reason: string): void {
    const user = authService.getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      throw new Error('Admin access required');
    }

    const requests = this.getChangeRequests();
    const request = requests.find(r => r.id === requestId);
    
    if (!request) {
      throw new Error('Change request not found');
    }

    if (request.status !== 'PENDING') {
      throw new Error('Change request already processed');
    }

    request.status = 'REJECTED';
    request.reviewedBy = user.id;
    request.reviewedAt = new Date().toISOString();
    request.reviewComment = reason;

    this.setToStorage(this.STORAGE_KEY_REQUESTS, JSON.stringify(requests));
  }

  /**
   * ========================
   * HELPER METHODS
   * ========================
   */

  /**
   * Parse Excel file to KPI entries
   */
  parseExcelFile(data: any[][]): Array<{
    stt: number;
    ogsmTarget: string;
    department: string;
    jobTitle: string;
    kpiName: string;
    kpiType: 'I' | 'II' | 'III' | 'IV';
    unit: string;
    dataSource: string;
    yearlyTarget?: number | string;
    quarterlyTarget?: number | string;
  }> {
    const entries: Array<{
      stt: number;
      ogsmTarget: string;
      department: string;
      jobTitle: string;
      kpiName: string;
      kpiType: 'I' | 'II' | 'III' | 'IV';
      unit: string;
      dataSource: string;
      yearlyTarget?: number | string;
      quarterlyTarget?: number | string;
    }> = [];
    let sttCounter = 1;

    // Skip header rows (first 6 rows)
    for (let i = 6; i < data.length; i++) {
      const row = data[i];
      
      // Skip empty rows
      if (!row[4] || !row[4].toString().trim()) {
        continue;
      }

      const entry = {
        stt: row[0] || sttCounter++,
        ogsmTarget: (row[1] || '').toString().trim(),
        department: (row[2] || '').toString().trim(),
        jobTitle: (row[3] || '').toString().trim(),
        kpiName: (row[4] || '').toString().trim(),
        kpiType: this.mapKpiType((row[5] || '').toString().trim()),
        unit: (row[6] || '').toString().trim(),
        dataSource: (row[7] || '').toString().trim(),
        yearlyTarget: this.parseTarget(row[8]),
        quarterlyTarget: this.parseTarget(row[9])
      };

      entries.push(entry);
    }

    return entries;
  }

  /**
   * Map KPI Type from Excel (I, II, III, IV) to system type
   */
  private mapKpiType(excelType: string): 'I' | 'II' | 'III' | 'IV' {
    const type = excelType.toUpperCase().trim();
    if (['I', 'II', 'III', 'IV'].includes(type)) {
      return type as 'I' | 'II' | 'III' | 'IV';
    }
    return 'I'; // Default
  }

  /**
   * Parse target value
   */
  private parseTarget(value: any): number | string {
    if (value === null || value === undefined || value === '') {
      return '';
    }
    
    const num = Number(value);
    if (!isNaN(num)) {
      return num;
    }
    
    return value.toString();
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `kpi-lib-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const entries = this.getEntries();
    const uploads = this.getUploads();
    const requests = this.getChangeRequests();

    return {
      totalEntries: entries.length,
      activeEntries: entries.filter(e => e.status === 'ACTIVE').length,
      pendingEntries: entries.filter(e => e.status === 'PENDING_APPROVAL').length,
      totalUploads: uploads.length,
      pendingUploads: uploads.filter(u => u.status === 'PENDING').length,
      totalChangeRequests: requests.length,
      pendingChangeRequests: requests.filter(r => r.status === 'PENDING').length,
      byDepartment: this.getEntriesByDepartment(entries),
      byKpiType: this.getEntriesByKpiType(entries)
    };
  }

  private getEntriesByDepartment(entries: KpiLibraryEntry[]) {
    const result: Record<string, number> = {};
    entries.forEach(entry => {
      if (entry.department) {
        result[entry.department] = (result[entry.department] || 0) + 1;
      }
    });
    return result;
  }

  private getEntriesByKpiType(entries: KpiLibraryEntry[]) {
    const result: Record<string, number> = {};
    entries.forEach(entry => {
      result[entry.kpiType] = (result[entry.kpiType] || 0) + 1;
    });
    return result;
  }
}

export const kpiLibraryService = new KpiLibraryService();