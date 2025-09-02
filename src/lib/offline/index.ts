import { Shape, Group } from '@/types';

export interface OfflineChange {
  id: string;
  type: 'shape' | 'group';
  operation: 'add' | 'update' | 'delete';
  data: any;
  timestamp: number;
  userId: string;
}

export interface OfflineState {
  isOffline: boolean;
  pendingChanges: OfflineChange[];
  lastSyncTimestamp: number;
  queueSize: number;
}

export interface ReconnectionConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export class OfflineManager {
  private isOffline: boolean = false;
  private pendingChanges: OfflineChange[] = [];
  private lastSyncTimestamp: number = Date.now();
  private listeners: ((state: OfflineState) => void)[] = [];
  private storageKey = 'collaborative-canvas-offline-changes';
  private maxQueueSize = 1000; // Prevent memory issues

  constructor() {
    this.loadPendingChanges();
    this.setupOnlineDetection();
  }

  private setupOnlineDetection() {
    // Browser online/offline detection
    window.addEventListener('online', () => {
      this.setOfflineStatus(false);
    });

    window.addEventListener('offline', () => {
      this.setOfflineStatus(true);
    });

    // Initial state
    this.setOfflineStatus(!navigator.onLine);
  }

  private setOfflineStatus(offline: boolean) {
    if (this.isOffline !== offline) {
      this.isOffline = offline;
      this.notifyListeners();
    }
  }

  private loadPendingChanges() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.pendingChanges = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load pending changes from localStorage:', error);
      this.pendingChanges = [];
    }
  }

  private savePendingChanges() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.pendingChanges));
    } catch (error) {
      console.error('Failed to save pending changes to localStorage:', error);
    }
  }

  private notifyListeners() {
    const state: OfflineState = {
      isOffline: this.isOffline,
      pendingChanges: [...this.pendingChanges],
      lastSyncTimestamp: this.lastSyncTimestamp,
      queueSize: this.pendingChanges.length,
    };

    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('Error in offline state listener:', error);
      }
    });
  }

  queueChange(change: Omit<OfflineChange, 'id' | 'timestamp'>) {
    // Prevent queue from growing too large
    if (this.pendingChanges.length >= this.maxQueueSize) {
      console.warn('Offline queue is full, removing oldest changes');
      this.pendingChanges = this.pendingChanges.slice(-this.maxQueueSize + 100);
    }

    const fullChange: OfflineChange = {
      ...change,
      id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    this.pendingChanges.push(fullChange);
    this.savePendingChanges();
    this.notifyListeners();
  }

  getPendingChanges(): OfflineChange[] {
    return [...this.pendingChanges];
  }

  clearPendingChanges() {
    this.pendingChanges = [];
    this.lastSyncTimestamp = Date.now();
    this.savePendingChanges();
    this.notifyListeners();
  }

  removePendingChange(changeId: string) {
    const index = this.pendingChanges.findIndex(change => change.id === changeId);
    if (index >= 0) {
      this.pendingChanges.splice(index, 1);
      this.savePendingChanges();
      this.notifyListeners();
    }
  }

  getOfflineState(): OfflineState {
    return {
      isOffline: this.isOffline,
      pendingChanges: [...this.pendingChanges],
      lastSyncTimestamp: this.lastSyncTimestamp,
      queueSize: this.pendingChanges.length,
    };
  }

  onStateChange(listener: (state: OfflineState) => void): () => void {
    this.listeners.push(listener);

    // Return cleanup function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Force offline mode for testing
  setOfflineMode(offline: boolean) {
    this.setOfflineStatus(offline);
  }

  destroy() {
    this.listeners = [];
    window.removeEventListener('online', () => this.setOfflineStatus(false));
    window.removeEventListener('offline', () => this.setOfflineStatus(true));
  }
}

export class ReconnectionManager {
  private config: ReconnectionConfig;
  private retryCount: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isReconnecting: boolean = false;
  private listeners: ((attempt: number, delay: number) => void)[] = [];

  constructor(config: Partial<ReconnectionConfig> = {}) {
    this.config = {
      maxRetries: 10,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      ...config,
    };
  }

  async attemptReconnection(reconnectFn: () => Promise<boolean>): Promise<boolean> {
    if (this.isReconnecting) {
      return false;
    }

    this.isReconnecting = true;

    try {
      const success = await reconnectFn();
      if (success) {
        this.reset();
        return true;
      }

      this.scheduleNextAttempt(reconnectFn);
      return false;
    } catch (error) {
      console.error('Reconnection attempt failed:', error);
      this.scheduleNextAttempt(reconnectFn);
      return false;
    } finally {
      this.isReconnecting = false;
    }
  }

  private scheduleNextAttempt(reconnectFn: () => Promise<boolean>) {
    if (this.retryCount >= this.config.maxRetries) {
      console.warn('Max reconnection attempts reached');
      return;
    }

    this.retryCount++;
    
    // Exponential backoff with jitter
    const baseDelay = Math.min(
      this.config.baseDelay * Math.pow(this.config.backoffMultiplier, this.retryCount - 1),
      this.config.maxDelay
    );
    
    // Add jitter (±25% of base delay)
    const jitter = baseDelay * 0.25 * (Math.random() * 2 - 1);
    const delay = Math.max(baseDelay + jitter, 1000);

    console.log(`Scheduling reconnection attempt ${this.retryCount} in ${Math.round(delay)}ms`);

    this.notifyListeners(this.retryCount, delay);

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      await this.attemptReconnection(reconnectFn);
    }, delay);
  }

  private notifyListeners(attempt: number, delay: number) {
    this.listeners.forEach(listener => {
      try {
        listener(attempt, delay);
      } catch (error) {
        console.error('Error in reconnection listener:', error);
      }
    });
  }

  onReconnectionAttempt(listener: (attempt: number, delay: number) => void): () => void {
    this.listeners.push(listener);

    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) {
        this.listeners.splice(index, 1);
      }
    };
  }

  reset() {
    this.retryCount = 0;
    this.isReconnecting = false;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  stop() {
    this.reset();
  }

  getRetryCount(): number {
    return this.retryCount;
  }

  isAttempting(): boolean {
    return this.isReconnecting;
  }

  destroy() {
    this.stop();
    this.listeners = [];
  }
}

// Singleton instances
let offlineManagerInstance: OfflineManager | null = null;
let reconnectionManagerInstance: ReconnectionManager | null = null;

export const getOfflineManager = (): OfflineManager => {
  if (!offlineManagerInstance) {
    offlineManagerInstance = new OfflineManager();
  }
  return offlineManagerInstance;
};

export const getReconnectionManager = (config?: Partial<ReconnectionConfig>): ReconnectionManager => {
  if (!reconnectionManagerInstance) {
    reconnectionManagerInstance = new ReconnectionManager(config);
  }
  return reconnectionManagerInstance;
};

export const destroyOfflineManager = () => {
  if (offlineManagerInstance) {
    offlineManagerInstance.destroy();
    offlineManagerInstance = null;
  }
};

export const destroyReconnectionManager = () => {
  if (reconnectionManagerInstance) {
    reconnectionManagerInstance.destroy();
    reconnectionManagerInstance = null;
  }
};