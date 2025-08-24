import { Shape, Rectangle, Point } from '@/types';
import { isShapeVisible, rectanglesIntersect } from '@/utils/viewport';

/**
 * Performance optimization utilities for canvas rendering
 */

export interface PerformanceMetrics {
  frameTime: number;
  renderTime: number;
  visibleShapes: number;
  totalShapes: number;
  culledShapes: number;
  fps: number;
}

export interface LevelOfDetail {
  minZoom: number;
  maxZoom: number;
  renderMode: 'full' | 'simplified' | 'placeholder';
}

export class PerformanceOptimizer {
  private frameTimeHistory: number[] = [];
  private lastFrameTime = 0;
  private renderStartTime = 0;
  private targetFPS = 60;
  private maxFrameTimeHistory = 30;
  
  // Level of detail configuration
  private lodLevels: LevelOfDetail[] = [
    { minZoom: 0, maxZoom: 0.25, renderMode: 'placeholder' },
    { minZoom: 0.25, maxZoom: 0.5, renderMode: 'simplified' },
    { minZoom: 0.5, maxZoom: Infinity, renderMode: 'full' },
  ];

  // Performance thresholds
  private readonly PERFORMANCE_THRESHOLDS = {
    CRITICAL_FPS: 30,
    WARNING_FPS: 45,
    MAX_VISIBLE_SHAPES: 1000,
    CULLING_PADDING: 100,
    SIMPLIFIED_RENDERING_THRESHOLD: 500,
  };

  /**
   * Start measuring render performance
   */
  startRenderMeasurement(): void {
    this.renderStartTime = performance.now();
  }

  /**
   * End measuring render performance and update metrics
   */
  endRenderMeasurement(): PerformanceMetrics {
    const renderTime = performance.now() - this.renderStartTime;
    const currentTime = performance.now();
    const frameTime = currentTime - this.lastFrameTime;
    
    this.frameTimeHistory.push(frameTime);
    if (this.frameTimeHistory.length > this.maxFrameTimeHistory) {
      this.frameTimeHistory.shift();
    }
    
    this.lastFrameTime = currentTime;
    
    const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
    const fps = 1000 / avgFrameTime;
    
    return {
      frameTime: avgFrameTime,
      renderTime,
      visibleShapes: 0, // Will be set by caller
      totalShapes: 0, // Will be set by caller
      culledShapes: 0, // Will be set by caller
      fps,
    };
  }

  /**
   * Cull shapes that are not visible in the viewport
   */
  cullShapes(
    shapes: Shape[],
    viewport: Rectangle,
    zoom: number,
    padding: number = this.PERFORMANCE_THRESHOLDS.CULLING_PADDING
  ): {
    visibleShapes: Shape[];
    culledShapes: Shape[];
    metrics: { visible: number; culled: number; total: number };
  } {
    const visibleShapes: Shape[] = [];
    const culledShapes: Shape[] = [];

    // Expand viewport with padding for smoother scrolling
    const expandedViewport: Rectangle = {
      x: viewport.x - padding,
      y: viewport.y - padding,
      width: viewport.width + padding * 2,
      height: viewport.height + padding * 2,
    };

    for (const shape of shapes) {
      if (isShapeVisible(shape.position, shape.dimensions, expandedViewport)) {
        visibleShapes.push(shape);
      } else {
        culledShapes.push(shape);
      }
    }

    return {
      visibleShapes,
      culledShapes,
      metrics: {
        visible: visibleShapes.length,
        culled: culledShapes.length,
        total: shapes.length,
      },
    };
  }

  /**
   * Apply level-of-detail rendering based on zoom level and performance
   */
  applyLevelOfDetail(
    shapes: Shape[],
    zoom: number,
    currentFPS: number
  ): {
    fullDetailShapes: Shape[];
    simplifiedShapes: Shape[];
    placeholderShapes: Shape[];
  } {
    const fullDetailShapes: Shape[] = [];
    const simplifiedShapes: Shape[] = [];
    const placeholderShapes: Shape[] = [];

    // Determine if we need to force simplified rendering due to performance
    const forceSimplified = currentFPS < this.PERFORMANCE_THRESHOLDS.WARNING_FPS ||
                           shapes.length > this.PERFORMANCE_THRESHOLDS.SIMPLIFIED_RENDERING_THRESHOLD;

    for (const shape of shapes) {
      const lodLevel = this.getLevelOfDetail(zoom);
      
      if (forceSimplified && lodLevel.renderMode === 'full') {
        simplifiedShapes.push(shape);
      } else {
        switch (lodLevel.renderMode) {
          case 'full':
            fullDetailShapes.push(shape);
            break;
          case 'simplified':
            simplifiedShapes.push(shape);
            break;
          case 'placeholder':
            placeholderShapes.push(shape);
            break;
        }
      }
    }

    return {
      fullDetailShapes,
      simplifiedShapes,
      placeholderShapes,
    };
  }

  /**
   * Get the appropriate level of detail for the current zoom level
   */
  private getLevelOfDetail(zoom: number): LevelOfDetail {
    for (const level of this.lodLevels) {
      if (zoom >= level.minZoom && zoom < level.maxZoom) {
        return level;
      }
    }
    return this.lodLevels[this.lodLevels.length - 1]; // Default to highest detail
  }

  /**
   * Spatial partitioning using a simple grid-based approach
   */
  createSpatialIndex(
    shapes: Shape[],
    gridSize: number = 500
  ): Map<string, Shape[]> {
    const spatialIndex = new Map<string, Shape[]>();

    for (const shape of shapes) {
      const gridKeys = this.getGridKeys(shape, gridSize);
      
      for (const key of gridKeys) {
        if (!spatialIndex.has(key)) {
          spatialIndex.set(key, []);
        }
        spatialIndex.get(key)!.push(shape);
      }
    }

    return spatialIndex;
  }

  /**
   * Get grid keys that a shape occupies
   */
  private getGridKeys(shape: Shape, gridSize: number): string[] {
    const keys: string[] = [];
    
    const startX = Math.floor(shape.position.x / gridSize);
    const endX = Math.floor((shape.position.x + shape.dimensions.width) / gridSize);
    const startY = Math.floor(shape.position.y / gridSize);
    const endY = Math.floor((shape.position.y + shape.dimensions.height) / gridSize);

    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        keys.push(`${x},${y}`);
      }
    }

    return keys;
  }

  /**
   * Query shapes in a specific area using spatial index
   */
  queryShapesInArea(
    spatialIndex: Map<string, Shape[]>,
    area: Rectangle,
    gridSize: number = 500
  ): Shape[] {
    const foundShapes = new Set<Shape>();
    
    const startX = Math.floor(area.x / gridSize);
    const endX = Math.floor((area.x + area.width) / gridSize);
    const startY = Math.floor(area.y / gridSize);
    const endY = Math.floor((area.y + area.height) / gridSize);

    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        const key = `${x},${y}`;
        const shapesInGrid = spatialIndex.get(key);
        
        if (shapesInGrid) {
          for (const shape of shapesInGrid) {
            // Double-check that the shape actually intersects with the area
            if (isShapeVisible(shape.position, shape.dimensions, area)) {
              foundShapes.add(shape);
            }
          }
        }
      }
    }

    return Array.from(foundShapes);
  }

  /**
   * Check if performance is degraded and suggest optimizations
   */
  analyzePerformance(metrics: PerformanceMetrics): {
    status: 'good' | 'warning' | 'critical';
    suggestions: string[];
  } {
    const suggestions: string[] = [];
    let status: 'good' | 'warning' | 'critical' = 'good';

    if (metrics.fps < this.PERFORMANCE_THRESHOLDS.CRITICAL_FPS) {
      status = 'critical';
      suggestions.push('Consider reducing the number of visible shapes');
      suggestions.push('Enable aggressive shape culling');
      suggestions.push('Use simplified rendering for all shapes');
    } else if (metrics.fps < this.PERFORMANCE_THRESHOLDS.WARNING_FPS) {
      status = 'warning';
      suggestions.push('Consider enabling simplified rendering for distant shapes');
      suggestions.push('Increase culling padding to reduce shape count');
    }

    if (metrics.visibleShapes > this.PERFORMANCE_THRESHOLDS.MAX_VISIBLE_SHAPES) {
      suggestions.push(`Too many visible shapes (${metrics.visibleShapes}). Consider zooming out or using spatial partitioning.`);
    }

    if (metrics.renderTime > 16) { // 16ms = 60fps threshold
      suggestions.push('Render time is too high. Consider optimizing shape rendering.');
    }

    return { status, suggestions };
  }

  /**
   * Get current performance status
   */
  getPerformanceStatus(): {
    averageFPS: number;
    isPerformanceGood: boolean;
    frameTimeHistory: number[];
  } {
    const avgFrameTime = this.frameTimeHistory.length > 0
      ? this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length
      : 16.67; // Default to 60fps

    const averageFPS = 1000 / avgFrameTime;
    const isPerformanceGood = averageFPS >= this.PERFORMANCE_THRESHOLDS.WARNING_FPS;

    return {
      averageFPS,
      isPerformanceGood,
      frameTimeHistory: [...this.frameTimeHistory],
    };
  }

  /**
   * Reset performance metrics
   */
  reset(): void {
    this.frameTimeHistory = [];
    this.lastFrameTime = 0;
    this.renderStartTime = 0;
  }

  /**
   * Configure level of detail settings
   */
  configureLOD(levels: LevelOfDetail[]): void {
    this.lodLevels = levels.sort((a, b) => a.minZoom - b.minZoom);
  }

  /**
   * Set target FPS for performance monitoring
   */
  setTargetFPS(fps: number): void {
    this.targetFPS = fps;
  }
}

// Singleton instance for global use
export const performanceOptimizer = new PerformanceOptimizer();