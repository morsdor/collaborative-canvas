// Jest globals are available without import
import { ShapeValidator } from '../index';
import { Point, Size, ShapeStyle } from '@/types';

describe('ShapeValidator', () => {
  describe('validatePosition', () => {
    it('should validate correct positions', () => {
      const validPosition: Point = { x: 10, y: 20 };
      expect(ShapeValidator.validatePosition(validPosition)).toBe(true);
    });

    it('should reject invalid positions', () => {
      expect(ShapeValidator.validatePosition({ x: NaN, y: 10 })).toBe(false);
      expect(ShapeValidator.validatePosition({ x: 10, y: Infinity })).toBe(
        false
      );
    });
  });

  describe('validateDimensions', () => {
    it('should validate correct dimensions', () => {
      const validDimensions: Size = { width: 100, height: 50 };
      expect(ShapeValidator.validateDimensions(validDimensions)).toBe(true);
    });

    it('should reject invalid dimensions', () => {
      expect(ShapeValidator.validateDimensions({ width: 0, height: 50 })).toBe(
        false
      );
      expect(
        ShapeValidator.validateDimensions({ width: -10, height: 50 })
      ).toBe(false);
    });
  });

  describe('isValidColor', () => {
    it('should validate hex colors', () => {
      expect(ShapeValidator.isValidColor('#ff0000')).toBe(true);
      expect(ShapeValidator.isValidColor('#f00')).toBe(true);
    });

    it('should validate rgb colors', () => {
      expect(ShapeValidator.isValidColor('rgb(255, 0, 0)')).toBe(true);
      expect(ShapeValidator.isValidColor('rgba(255, 0, 0, 0.5)')).toBe(true);
    });

    it('should validate named colors', () => {
      expect(ShapeValidator.isValidColor('red')).toBe(true);
      expect(ShapeValidator.isValidColor('blue')).toBe(true);
    });
  });

  describe('validateStyle', () => {
    it('should validate correct styles', () => {
      const validStyle: ShapeStyle = {
        fill: '#ff0000',
        stroke: '#000000',
        strokeWidth: 2,
        opacity: 0.8,
      };
      expect(ShapeValidator.validateStyle(validStyle)).toBe(true);
    });

    it('should reject invalid styles', () => {
      const invalidStyle: ShapeStyle = {
        fill: 'invalid-color',
        stroke: '#000000',
        strokeWidth: -1,
        opacity: 2,
      };
      expect(ShapeValidator.validateStyle(invalidStyle)).toBe(false);
    });
  });
});
