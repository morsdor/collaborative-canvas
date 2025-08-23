import viewportReducer, {
  setZoom,
  setPanOffset,
  setCanvasSize,
  zoomToFit,
  zoomIn,
  zoomOut,
  resetViewport,
  ViewportState,
} from '../slices/viewportSlice';

describe('viewportSlice', () => {
  const initialState: ViewportState = {
    zoom: 1,
    panOffset: { x: 0, y: 0 },
    canvasSize: { width: 1920, height: 1080 },
    visibleBounds: { x: 0, y: 0, width: 1920, height: 1080 },
  };

  it('should return the initial state', () => {
    expect(viewportReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  describe('setZoom', () => {
    it('should set zoom level and update visible bounds', () => {
      const newZoom = 2;
      const actual = viewportReducer(initialState, setZoom(newZoom));
      
      expect(actual.zoom).toBe(newZoom);
      expect(actual.visibleBounds.width).toBe(1920 / newZoom);
      expect(actual.visibleBounds.height).toBe(1080 / newZoom);
    });

    it('should clamp zoom to minimum value', () => {
      const actual = viewportReducer(initialState, setZoom(0.05));
      expect(actual.zoom).toBe(0.1);
    });

    it('should clamp zoom to maximum value', () => {
      const actual = viewportReducer(initialState, setZoom(10));
      expect(actual.zoom).toBe(5);
    });
  });

  describe('setPanOffset', () => {
    it('should set pan offset and update visible bounds', () => {
      const newOffset = { x: 100, y: 200 };
      const actual = viewportReducer(initialState, setPanOffset(newOffset));
      
      expect(actual.panOffset).toEqual(newOffset);
      expect(actual.visibleBounds.x).toBe(newOffset.x);
      expect(actual.visibleBounds.y).toBe(newOffset.y);
    });
  });

  describe('setCanvasSize', () => {
    it('should set canvas size and update visible bounds', () => {
      const newSize = { width: 1600, height: 900 };
      const actual = viewportReducer(initialState, setCanvasSize(newSize));
      
      expect(actual.canvasSize).toEqual(newSize);
      expect(actual.visibleBounds.width).toBe(newSize.width);
      expect(actual.visibleBounds.height).toBe(newSize.height);
    });
  });

  describe('zoomToFit', () => {
    it('should zoom to fit content with padding', () => {
      const content = { x: 100, y: 100, width: 400, height: 300 };
      const actual = viewportReducer(initialState, zoomToFit(content));
      
      // Should calculate zoom to fit content with padding
      expect(actual.zoom).toBeGreaterThan(0);
      expect(actual.zoom).toBeLessThanOrEqual(1);
    });

    it('should not zoom beyond 100%', () => {
      const smallContent = { x: 500, y: 400, width: 100, height: 100 };
      const actual = viewportReducer(initialState, zoomToFit(smallContent));
      
      expect(actual.zoom).toBeLessThanOrEqual(1);
    });
  });

  describe('zoomIn', () => {
    it('should zoom in by factor of 1.2', () => {
      const actual = viewportReducer(initialState, zoomIn());
      expect(actual.zoom).toBe(1.2);
    });

    it('should zoom towards specified center point', () => {
      const center = { x: 960, y: 540 }; // Canvas center
      const actual = viewportReducer(initialState, zoomIn(center));
      
      expect(actual.zoom).toBe(1.2);
      // When zooming in at center, pan offset should adjust to keep center in view
      expect(actual.panOffset.x).toBeCloseTo(160, 1);
      expect(actual.panOffset.y).toBeCloseTo(90, 1);
    });

    it('should not zoom beyond maximum', () => {
      const maxZoomedState = { ...initialState, zoom: 5 };
      const actual = viewportReducer(maxZoomedState, zoomIn());
      expect(actual.zoom).toBe(5);
    });
  });

  describe('zoomOut', () => {
    it('should zoom out by factor of 1.2', () => {
      const zoomedState = { ...initialState, zoom: 2.4 };
      const actual = viewportReducer(zoomedState, zoomOut());
      expect(actual.zoom).toBe(2);
    });

    it('should not zoom below minimum', () => {
      const minZoomedState = { ...initialState, zoom: 0.1 };
      const actual = viewportReducer(minZoomedState, zoomOut());
      expect(actual.zoom).toBe(0.1);
    });
  });

  describe('resetViewport', () => {
    it('should reset viewport to initial state', () => {
      const modifiedState: ViewportState = {
        zoom: 2,
        panOffset: { x: 100, y: 200 },
        canvasSize: { width: 1600, height: 900 },
        visibleBounds: { x: 100, y: 200, width: 800, height: 450 },
      };
      
      const actual = viewportReducer(modifiedState, resetViewport());
      
      expect(actual.zoom).toBe(1);
      expect(actual.panOffset).toEqual({ x: 0, y: 0 });
      expect(actual.visibleBounds).toEqual({
        x: 0,
        y: 0,
        width: modifiedState.canvasSize.width,
        height: modifiedState.canvasSize.height,
      });
    });
  });
});