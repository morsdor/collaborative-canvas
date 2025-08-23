import { MockShape, MockShapeType, MockPoint, MockSize, MockShapeStyle } from '../types.js';

export class ShapeGenerator {
  private static colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];

  private static textSamples = [
    'Hello World', 'Design', 'Prototype', 'Collaborate', 'Create',
    'Innovation', 'Team Work', 'Ideas', 'Brainstorm', 'Solution'
  ];

  static generateId(): string {
    return `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static randomPosition(canvasWidth = 2000, canvasHeight = 2000): MockPoint {
    return {
      x: Math.random() * canvasWidth,
      y: Math.random() * canvasHeight,
    };
  }

  static randomSize(minSize = 50, maxSize = 200): MockSize {
    return {
      width: minSize + Math.random() * (maxSize - minSize),
      height: minSize + Math.random() * (maxSize - minSize),
    };
  }

  static randomStyle(): MockShapeStyle {
    const fillColor = this.colors[Math.floor(Math.random() * this.colors.length)];
    const strokeColor = Math.random() > 0.7 ? '#000000' : fillColor;
    
    return {
      fill: fillColor,
      stroke: strokeColor,
      strokeWidth: Math.random() > 0.5 ? Math.floor(Math.random() * 5) + 1 : 0,
      opacity: 0.7 + Math.random() * 0.3, // 0.7 to 1.0
    };
  }

  static randomShapeType(): MockShapeType {
    const types: MockShapeType[] = ['rectangle', 'circle', 'text', 'line'];
    return types[Math.floor(Math.random() * types.length)];
  }

  static generateShape(
    type?: MockShapeType,
    position?: MockPoint,
    size?: MockSize
  ): MockShape {
    const shapeType = type || this.randomShapeType();
    const now = Date.now();
    
    const shape: MockShape = {
      id: this.generateId(),
      type: shapeType,
      position: position || this.randomPosition(),
      dimensions: size || this.randomSize(),
      style: this.randomStyle(),
      createdAt: now,
      updatedAt: now,
    };

    // Add content for text shapes
    if (shapeType === 'text') {
      shape.content = this.textSamples[Math.floor(Math.random() * this.textSamples.length)];
    }

    return shape;
  }

  static generateShapes(count: number): MockShape[] {
    return Array.from({ length: count }, () => this.generateShape());
  }

  static generateShapeCluster(
    centerPosition: MockPoint,
    count: number,
    radius = 300
  ): MockShape[] {
    return Array.from({ length: count }, () => {
      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.random() * radius;
      
      const position: MockPoint = {
        x: centerPosition.x + Math.cos(angle) * distance,
        y: centerPosition.y + Math.sin(angle) * distance,
      };

      return this.generateShape(undefined, position);
    });
  }

  static generateGrid(
    rows: number,
    cols: number,
    spacing = 150,
    startPosition: MockPoint = { x: 100, y: 100 }
  ): MockShape[] {
    const shapes: MockShape[] = [];
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const position: MockPoint = {
          x: startPosition.x + col * spacing,
          y: startPosition.y + row * spacing,
        };
        
        shapes.push(this.generateShape('rectangle', position, { width: 100, height: 80 }));
      }
    }
    
    return shapes;
  }

  static generateConnectedShapes(count: number): MockShape[] {
    const shapes: MockShape[] = [];
    let currentPosition: MockPoint = { x: 200, y: 200 };
    
    for (let i = 0; i < count; i++) {
      shapes.push(this.generateShape('rectangle', { ...currentPosition }));
      
      // Move to next position (creating a connected flow)
      currentPosition.x += 150 + Math.random() * 100;
      if (i % 4 === 3) {
        currentPosition.y += 120;
        currentPosition.x = 200;
      }
    }
    
    return shapes;
  }

  static generateStressTestShapes(count: number): MockShape[] {
    const shapes: MockShape[] = [];
    
    // Generate shapes in different patterns for stress testing
    const patterns = [
      () => this.generateShapes(Math.floor(count * 0.4)), // Random shapes
      () => this.generateGrid(10, 10), // Grid pattern
      () => this.generateShapeCluster({ x: 1000, y: 500 }, Math.floor(count * 0.3)), // Cluster
      () => this.generateConnectedShapes(Math.floor(count * 0.3)), // Connected flow
    ];
    
    patterns.forEach(pattern => {
      shapes.push(...pattern());
    });
    
    return shapes.slice(0, count); // Ensure we don't exceed the requested count
  }
}