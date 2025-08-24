import { useEffect, useRef, useState, useCallback } from 'react';
import { performanceOptimizer, PerformanceMetrics } from '@/lib/utils/performanceOptimizer';

export interface PerformanceMonitorConfig {
  enabled?: boolean;
  targetFPS?: number;
  warningThreshold?: number;
  criticalThreshold?: number;
  sampleSize?: number;
}

export interface PerformanceAlert {
  type: 'warning' | 'critical';
  message: string;
  suggestions: string[];
  timestamp: number;
}

export interface PerformanceMonitorResult {
  metrics: PerformanceMetrics;
  status: 'good' | 'warning' | 'critical';
  alerts: PerformanceAlert[];
  startMeasurement: () => void;
  endMeasurement: (additionalData?: Partial<PerformanceMetrics>) => PerformanceMetrics;
  reset: () => void;
  isEnabled: boolean;
}

const DEFAULT_CONFIG: Required<PerformanceMonitorConfig> = {
  enabled: true,
  targetFPS: 60,
  warningThreshold: 45,
  criticalThreshold: 30,
  sampleSize: 30,
};

export function usePerformanceMonitor(
  config: PerformanceMonitorConfig = {}
): PerformanceMonitorResult {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    frameTime: 16.67,
    renderTime: 0,
    visibleShapes: 0,
    totalShapes: 0,
    culledShapes: 0,
    fps: 60,
  });
  
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [status, setStatus] = useState<'good' | 'warning' | 'critical'>('good');
  
  const alertHistoryRef = useRef<PerformanceAlert[]>([]);
  const lastAlertTimeRef = useRef<number>(0);
  const measurementInProgressRef = useRef<boolean>(false);

  // Configure performance optimizer
  useEffect(() => {
    if (finalConfig.enabled) {
      performanceOptimizer.setTargetFPS(finalConfig.targetFPS);
    }
  }, [finalConfig.enabled, finalConfig.targetFPS]);

  // Start performance measurement
  const startMeasurement = useCallback(() => {
    if (!finalConfig.enabled) return;
    
    measurementInProgressRef.current = true;
    performanceOptimizer.startRenderMeasurement();
  }, [finalConfig.enabled]);

  // End performance measurement and update metrics
  const endMeasurement = useCallback((
    additionalData: Partial<PerformanceMetrics> = {}
  ): PerformanceMetrics => {
    if (!finalConfig.enabled || !measurementInProgressRef.current) {
      return metrics;
    }

    measurementInProgressRef.current = false;
    const newMetrics = performanceOptimizer.endRenderMeasurement();
    
    // Merge additional data
    const finalMetrics = { ...newMetrics, ...additionalData };
    
    setMetrics(finalMetrics);
    
    // Analyze performance and update status
    const analysis = performanceOptimizer.analyzePerformance(finalMetrics);
    setStatus(analysis.status);
    
    // Generate alerts if performance is poor
    generateAlerts(finalMetrics, analysis);
    
    return finalMetrics;
  }, [finalConfig.enabled, metrics]);

  // Generate performance alerts
  const generateAlerts = useCallback((
    currentMetrics: PerformanceMetrics,
    analysis: { status: 'good' | 'warning' | 'critical'; suggestions: string[] }
  ) => {
    const now = Date.now();
    
    // Don't spam alerts - minimum 5 seconds between similar alerts
    if (now - lastAlertTimeRef.current < 5000) {
      return;
    }

    if (analysis.status === 'critical' && currentMetrics.fps < finalConfig.criticalThreshold) {
      const alert: PerformanceAlert = {
        type: 'critical',
        message: `Critical performance issue: FPS dropped to ${currentMetrics.fps.toFixed(1)}`,
        suggestions: analysis.suggestions,
        timestamp: now,
      };
      
      addAlert(alert);
      lastAlertTimeRef.current = now;
    } else if (analysis.status === 'warning' && currentMetrics.fps < finalConfig.warningThreshold) {
      const alert: PerformanceAlert = {
        type: 'warning',
        message: `Performance warning: FPS is ${currentMetrics.fps.toFixed(1)}`,
        suggestions: analysis.suggestions,
        timestamp: now,
      };
      
      addAlert(alert);
      lastAlertTimeRef.current = now;
    }
  }, [finalConfig.criticalThreshold, finalConfig.warningThreshold]);

  // Add alert to history and current alerts
  const addAlert = useCallback((alert: PerformanceAlert) => {
    alertHistoryRef.current.push(alert);
    
    // Keep only recent alerts in the active list
    setAlerts(prev => {
      const filtered = prev.filter(a => Date.now() - a.timestamp < 30000); // 30 seconds
      return [...filtered, alert].slice(-5); // Keep max 5 alerts
    });
    
    // Log to console for debugging
    console.warn(`Performance ${alert.type}:`, alert.message, alert.suggestions);
  }, []);

  // Reset performance monitoring
  const reset = useCallback(() => {
    if (!finalConfig.enabled) return;
    
    performanceOptimizer.reset();
    setMetrics({
      frameTime: 16.67,
      renderTime: 0,
      visibleShapes: 0,
      totalShapes: 0,
      culledShapes: 0,
      fps: 60,
    });
    setAlerts([]);
    setStatus('good');
    alertHistoryRef.current = [];
    lastAlertTimeRef.current = 0;
    measurementInProgressRef.current = false;
  }, [finalConfig.enabled]);

  // Clean up old alerts periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setAlerts(prev => prev.filter(alert => Date.now() - alert.timestamp < 30000));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Auto-reset if disabled
  useEffect(() => {
    if (!finalConfig.enabled) {
      reset();
    }
  }, [finalConfig.enabled, reset]);

  return {
    metrics,
    status,
    alerts,
    startMeasurement,
    endMeasurement,
    reset,
    isEnabled: finalConfig.enabled,
  };
}

// Hook for monitoring specific operations
export function useOperationPerformance(operationName: string) {
  const monitor = usePerformanceMonitor();
  
  const measureOperation = useCallback(async <T>(
    operation: () => Promise<T> | T
  ): Promise<T> => {
    if (!monitor.isEnabled) {
      return await operation();
    }

    const startTime = performance.now();
    monitor.startMeasurement();
    
    try {
      const result = await operation();
      const endTime = performance.now();
      
      monitor.endMeasurement({
        renderTime: endTime - startTime,
      });
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      
      monitor.endMeasurement({
        renderTime: endTime - startTime,
      });
      
      throw error;
    }
  }, [monitor, operationName]);

  return {
    ...monitor,
    measureOperation,
  };
}

// Hook for monitoring canvas rendering specifically
export function useCanvasPerformanceMonitor() {
  const monitor = usePerformanceMonitor({
    enabled: true,
    targetFPS: 60,
    warningThreshold: 45,
    criticalThreshold: 30,
  });

  const measureRender = useCallback((
    renderFunction: () => void,
    shapeCount: number,
    visibleShapeCount: number
  ) => {
    if (!monitor.isEnabled) {
      renderFunction();
      return;
    }

    monitor.startMeasurement();
    renderFunction();
    
    monitor.endMeasurement({
      totalShapes: shapeCount,
      visibleShapes: visibleShapeCount,
      culledShapes: shapeCount - visibleShapeCount,
    });
  }, [monitor]);

  return {
    ...monitor,
    measureRender,
  };
}

// Performance context for debugging
export function usePerformanceDebugInfo() {
  const monitor = usePerformanceMonitor();
  
  const getDebugInfo = useCallback(() => {
    const performanceStatus = performanceOptimizer.getPerformanceStatus();
    
    return {
      currentMetrics: monitor.metrics,
      status: monitor.status,
      recentAlerts: monitor.alerts,
      frameTimeHistory: performanceStatus.frameTimeHistory,
      averageFPS: performanceStatus.averageFPS,
      isPerformanceGood: performanceStatus.isPerformanceGood,
    };
  }, [monitor]);

  return {
    getDebugInfo,
    isEnabled: monitor.isEnabled,
  };
}