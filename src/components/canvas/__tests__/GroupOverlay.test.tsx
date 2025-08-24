import React from 'react';
import { render, screen } from '@testing-library/react';
import { GroupOverlay } from '../GroupOverlay';
import { Group } from '@/types';

describe('GroupOverlay', () => {
  const mockGroups: Group[] = [
    {
      id: 'group-1',
      shapeIds: ['shape-1', 'shape-2'],
      bounds: { x: 100, y: 100, width: 200, height: 150 },
      locked: false,
    },
    {
      id: 'group-2',
      shapeIds: ['shape-3', 'shape-4', 'shape-5'],
      bounds: { x: 400, y: 200, width: 300, height: 200 },
      locked: true,
    },
  ];

  const defaultProps = {
    groups: mockGroups,
    selectedGroup: null,
    zoom: 1,
    panOffset: { x: 0, y: 0 },
  };

  it('should render nothing when no group is selected', () => {
    const { container } = render(<GroupOverlay {...defaultProps} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render group overlay when a group is selected', () => {
    const selectedGroup = mockGroups[0];
    render(<GroupOverlay {...defaultProps} selectedGroup={selectedGroup} />);

    // Check if the overlay is rendered with correct dimensions
    const overlay = document.querySelector('.border-purple-500');
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveStyle({
      left: '100px',
      top: '100px',
      width: '200px',
      height: '150px',
    });
  });

  it('should display group information in the label', () => {
    const selectedGroup = mockGroups[0];
    render(<GroupOverlay {...defaultProps} selectedGroup={selectedGroup} />);

    expect(screen.getByText('Group (2 shapes)')).toBeInTheDocument();
  });

  it('should show lock indicator for locked groups', () => {
    const lockedGroup = mockGroups[1];
    render(<GroupOverlay {...defaultProps} selectedGroup={lockedGroup} />);

    expect(screen.getByText('Group (3 shapes) 🔒')).toBeInTheDocument();
  });

  it('should render resize handles for unlocked groups', () => {
    const unlockedGroup = mockGroups[0];
    render(<GroupOverlay {...defaultProps} selectedGroup={unlockedGroup} />);

    // Check for resize handles (excluding the label)
    const handles = document.querySelectorAll('.w-2.h-2.bg-purple-500');
    expect(handles).toHaveLength(8); // 4 corners + 4 edges
  });

  it('should not render resize handles for locked groups', () => {
    const lockedGroup = mockGroups[1];
    render(<GroupOverlay {...defaultProps} selectedGroup={lockedGroup} />);

    // Only the label should have bg-purple-500, no resize handles
    const handles = document.querySelectorAll('.w-2.h-2.bg-purple-500');
    expect(handles).toHaveLength(0); // No resize handles for locked groups
  });

  it('should apply zoom and pan transformations', () => {
    const selectedGroup = mockGroups[0];
    const props = {
      ...defaultProps,
      selectedGroup,
      zoom: 2,
      panOffset: { x: 50, y: 30 },
    };

    render(<GroupOverlay {...props} />);

    const overlay = document.querySelector('.border-purple-500');
    expect(overlay).toHaveStyle({
      transform: 'scale(2) translate(-50px, -30px)',
    });
  });

  it('should scale the label inversely to zoom to maintain readable size', () => {
    const selectedGroup = mockGroups[0];
    const props = {
      ...defaultProps,
      selectedGroup,
      zoom: 2,
    };

    render(<GroupOverlay {...props} />);

    // Find the label div by its class and content
    const labelDiv = document.querySelector('.bg-purple-500.text-white');
    expect(labelDiv).toHaveAttribute('style', 
      expect.stringContaining('transform: scale(0.5)')
    );
    expect(labelDiv).toHaveAttribute('style', 
      expect.stringContaining('transform-origin: left bottom')
    );
  });

  it('should handle edge case with zero dimensions', () => {
    const zeroSizeGroup: Group = {
      id: 'zero-group',
      shapeIds: ['shape-1'],
      bounds: { x: 100, y: 100, width: 0, height: 0 },
      locked: false,
    };

    render(<GroupOverlay {...defaultProps} selectedGroup={zeroSizeGroup} />);

    const overlay = document.querySelector('.border-purple-500');
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveStyle({
      width: '0px',
      height: '0px',
    });
  });

  it('should handle negative coordinates', () => {
    const negativeGroup: Group = {
      id: 'negative-group',
      shapeIds: ['shape-1', 'shape-2'],
      bounds: { x: -50, y: -30, width: 100, height: 80 },
      locked: false,
    };

    render(<GroupOverlay {...defaultProps} selectedGroup={negativeGroup} />);

    const overlay = document.querySelector('.border-purple-500');
    expect(overlay).toHaveStyle({
      left: '-50px',
      top: '-30px',
    });
  });

  it('should handle very large zoom values', () => {
    const selectedGroup = mockGroups[0];
    const props = {
      ...defaultProps,
      selectedGroup,
      zoom: 10,
    };

    render(<GroupOverlay {...props} />);

    const labelDiv = document.querySelector('.bg-purple-500.text-white');
    expect(labelDiv).toHaveAttribute('style', 
      expect.stringContaining('transform: scale(0.1)')
    );
  });

  it('should handle very small zoom values', () => {
    const selectedGroup = mockGroups[0];
    const props = {
      ...defaultProps,
      selectedGroup,
      zoom: 0.1,
    };

    render(<GroupOverlay {...props} />);

    const labelDiv = document.querySelector('.bg-purple-500.text-white');
    expect(labelDiv).toHaveAttribute('style', 
      expect.stringContaining('transform: scale(10)')
    );
  });
});