import * as Y from 'yjs';
import { LeveldbPersistence } from 'y-leveldb';
import { config } from '../config/index.js';

export class YjsService {
  private persistence: LeveldbPersistence | null = null;
  private documents: Map<string, Y.Doc> = new Map();

  constructor() {
    this.initializePersistence();
  }

  private initializePersistence() {
    if (config.persistenceType === 'leveldb') {
      try {
        this.persistence = new LeveldbPersistence(config.dbPath);
        console.log(`✅ Yjs persistence initialized with LevelDB at ${config.dbPath}`);
      } catch (error) {
        console.warn('⚠️  Failed to initialize LevelDB persistence, falling back to memory:', error);
        this.persistence = null;
      }
    } else {
      console.log('✅ Yjs persistence initialized with in-memory storage');
    }
  }

  async getDocument(roomName: string): Promise<Y.Doc> {
    let doc = this.documents.get(roomName);
    
    if (!doc) {
      doc = new Y.Doc();
      this.documents.set(roomName, doc);

      // Load persisted state if available
      if (this.persistence) {
        try {
          const persistedState = await this.persistence.getYDoc(roomName);
          if (persistedState) {
            Y.applyUpdate(doc, persistedState);
          }
        } catch (error) {
          console.error(`Failed to load persisted state for room ${roomName}:`, error);
        }
      }

      // Set up persistence for future updates
      if (this.persistence) {
        doc.on('update', (update: Uint8Array) => {
          this.persistence?.storeUpdate(roomName, update);
        });
      }

      console.log(`📄 Document created/loaded for room: ${roomName}`);
    }

    return doc;
  }

  removeDocument(roomName: string) {
    const doc = this.documents.get(roomName);
    if (doc) {
      doc.destroy();
      this.documents.delete(roomName);
      console.log(`🗑️  Document removed for room: ${roomName}`);
    }
  }

  getAllRooms(): string[] {
    return Array.from(this.documents.keys());
  }

  getRoomStats(roomName: string) {
    const doc = this.documents.get(roomName);
    if (!doc) return null;

    const shapesMap = doc.getMap('shapes');
    const metaMap = doc.getMap('meta');

    return {
      roomName,
      shapeCount: shapesMap.size,
      hasMetadata: metaMap.size > 0,
      clientCount: doc.conns?.size || 0,
    };
  }

  async cleanup() {
    // Clean up all documents
    for (const [roomName, doc] of this.documents) {
      doc.destroy();
    }
    this.documents.clear();

    // Close persistence if available
    if (this.persistence) {
      await this.persistence.destroy();
    }

    console.log('🧹 YjsService cleanup completed');
  }
}

// Singleton instance
export const yjsService = new YjsService();