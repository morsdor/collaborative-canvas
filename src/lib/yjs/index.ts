import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { Shape } from '@/types';

export class YjsDocument {
  public doc: Y.Doc;
  public shapesMap: Y.Map<Y.Map<unknown>>;
  public metaMap: Y.Map<unknown>;
  private provider: WebsocketProvider | null = null;

  constructor() {
    this.doc = new Y.Doc();
    this.shapesMap = this.doc.getMap('shapes');
    this.metaMap = this.doc.getMap('meta');
  }

  connect(wsUrl: string, roomName: string) {
    if (this.provider) {
      this.provider.destroy();
    }

    this.provider = new WebsocketProvider(wsUrl, roomName, this.doc);
    return this.provider;
  }

  disconnect() {
    if (this.provider) {
      this.provider.destroy();
      this.provider = null;
    }
  }

  addShape(shape: Shape) {
    const shapeMap = new Y.Map();
    shapeMap.set('type', shape.type);
    shapeMap.set('position', shape.position);
    shapeMap.set('dimensions', shape.dimensions);
    shapeMap.set('style', shape.style);

    if (shape.content) {
      shapeMap.set('content', shape.content);
    }

    if (shape.groupId) {
      shapeMap.set('groupId', shape.groupId);
    }

    this.shapesMap.set(shape.id, shapeMap);
  }

  updateShape(id: string, updates: Partial<Shape>) {
    const shapeMap = this.shapesMap.get(id);
    if (shapeMap) {
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          shapeMap.set(key, value);
        }
      });
    }
  }

  deleteShape(id: string) {
    this.shapesMap.delete(id);
  }

  getShape(id: string): Shape | null {
    const shapeMap = this.shapesMap.get(id);
    if (!shapeMap) return null;

    return {
      id,
      type: shapeMap.get('type'),
      position: shapeMap.get('position'),
      dimensions: shapeMap.get('dimensions'),
      style: shapeMap.get('style'),
      content: shapeMap.get('content'),
      groupId: shapeMap.get('groupId'),
    };
  }

  getAllShapes(): Shape[] {
    const shapes: Shape[] = [];
    this.shapesMap.forEach((shapeMap, id) => {
      const shape = this.getShape(id);
      if (shape) {
        shapes.push(shape);
      }
    });
    return shapes;
  }

  onShapesChange(callback: (shapes: Shape[]) => void) {
    const observer = () => {
      callback(this.getAllShapes());
    };

    this.shapesMap.observe(observer);

    // Return cleanup function
    return () => {
      this.shapesMap.unobserve(observer);
    };
  }

  destroy() {
    this.disconnect();
    this.doc.destroy();
  }
}

// Singleton instance for the application
let yjsDocumentInstance: YjsDocument | null = null;

export const getYjsDocument = (): YjsDocument => {
  if (!yjsDocumentInstance) {
    yjsDocumentInstance = new YjsDocument();
  }
  return yjsDocumentInstance;
};

export const destroyYjsDocument = () => {
  if (yjsDocumentInstance) {
    yjsDocumentInstance.destroy();
    yjsDocumentInstance = null;
  }
};
