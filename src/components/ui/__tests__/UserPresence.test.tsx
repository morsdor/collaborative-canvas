import React from 'react';
import { render, screen } from '@testing-library/react';
import { UserCursor, UserPresenceList, UserAvatar, UserSelectionOverlay } from '../UserPresence';
import { UserPresence } from '@/types';

const mockUsers: UserPresence[] = [
  {
    userId: 'user-1',
    name: 'John Doe',
    cursor: { x: 100, y: 200 },
    selection: ['shape-1'],
    isActive: true,
  },
  {
    userId: 'user-2',
    name: 'Jane Smith',
    cursor: { x: 300, y: 400 },
    selection: [],
    isActive: true,
  },
  {
    userId: 'user-3',
    name: 'Bob Johnson',
    cursor: { x: 500, y: 600 },
    selection: ['shape-2', 'shape-3'],
    isActive: false,
  },
];

describe('UserCursor', () => {
  it('should render cursor for other users', () => {
    render(<UserCursor user={mockUsers[0]} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should not render cursor for current user', () => {
    render(<UserCursor user={mockUsers[0]} isCurrentUser />);
    
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
  });

  it('should not render cursor for inactive users', () => {
    render(<UserCursor user={mockUsers[2]} />);
    
    expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument();
  });

  it('should position cursor correctly', () => {
    const { container } = render(<UserCursor user={mockUsers[0]} />);
    
    const cursorElement = container.firstChild as HTMLElement;
    expect(cursorElement).toHaveStyle({
      left: '100px',
      top: '200px',
    });
  });
});

describe('UserPresenceList', () => {
  it('should render list of active users', () => {
    render(<UserPresenceList users={mockUsers} currentUserId="current-user" />);
    
    expect(screen.getByText('Online:')).toBeInTheDocument();
    // Should show John Doe and Jane Smith (active users, excluding current user)
    expect(screen.getByTitle('John Doe')).toBeInTheDocument();
    expect(screen.getByTitle('Jane Smith')).toBeInTheDocument();
  });

  it('should exclude current user from list', () => {
    render(<UserPresenceList users={mockUsers} currentUserId="user-1" />);
    
    // Should not show John Doe since he's the current user
    expect(screen.queryByTitle('John Doe')).not.toBeInTheDocument();
    expect(screen.getByTitle('Jane Smith')).toBeInTheDocument();
  });

  it('should not render when no active users', () => {
    const inactiveUsers = mockUsers.map(user => ({ ...user, isActive: false }));
    render(<UserPresenceList users={inactiveUsers} currentUserId="current-user" />);
    
    expect(screen.queryByText('Online:')).not.toBeInTheDocument();
  });

  it('should show overflow indicator for many users', () => {
    const manyUsers = Array.from({ length: 7 }, (_, i) => ({
      userId: `user-${i}`,
      name: `User ${i}`,
      cursor: { x: 0, y: 0 },
      selection: [],
      isActive: true,
    }));

    render(<UserPresenceList users={manyUsers} currentUserId="current-user" />);
    
    expect(screen.getByText('+2')).toBeInTheDocument();
  });
});

describe('UserAvatar', () => {
  it('should render user initials when no avatar', () => {
    render(<UserAvatar user={mockUsers[0]} />);
    
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('should render avatar image when provided', () => {
    const userWithAvatar = {
      ...mockUsers[0],
      avatar: 'https://example.com/avatar.jpg',
    };
    
    render(<UserAvatar user={userWithAvatar} />);
    
    const img = screen.getByAltText('John Doe');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it('should render different sizes correctly', () => {
    const { rerender } = render(<UserAvatar user={mockUsers[0]} size="sm" />);
    expect(screen.getByText('JD')).toHaveClass('w-6', 'h-6', 'text-xs');

    rerender(<UserAvatar user={mockUsers[0]} size="md" />);
    expect(screen.getByText('JD')).toHaveClass('w-8', 'h-8', 'text-sm');

    rerender(<UserAvatar user={mockUsers[0]} size="lg" />);
    expect(screen.getByText('JD')).toHaveClass('w-10', 'h-10', 'text-base');
  });

  it('should show name when showName is true', () => {
    render(<UserAvatar user={mockUsers[0]} showName />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});

describe('UserSelectionOverlay', () => {
  it('should render selection indicators for users with selections', () => {
    render(<UserSelectionOverlay users={mockUsers} currentUserId="current-user" />);
    
    // John Doe has selection
    expect(screen.getByText('John Doe selected')).toBeInTheDocument();
    
    // Jane Smith has no selection, should not appear
    expect(screen.queryByText('Jane Smith selected')).not.toBeInTheDocument();
    
    // Bob Johnson is inactive, should not appear
    expect(screen.queryByText('Bob Johnson selected')).not.toBeInTheDocument();
  });

  it('should not render selection for current user', () => {
    render(<UserSelectionOverlay users={mockUsers} currentUserId="user-1" />);
    
    expect(screen.queryByText('John Doe selected')).not.toBeInTheDocument();
  });

  it('should render multiple selections for single user', () => {
    const userWithMultipleSelections = [
      {
        ...mockUsers[0],
        selection: ['shape-1', 'shape-2'],
      },
    ];

    render(<UserSelectionOverlay users={userWithMultipleSelections} currentUserId="current-user" />);
    
    // Should render selection indicator for each selected shape
    const selectionIndicators = screen.getAllByText('John Doe selected');
    expect(selectionIndicators).toHaveLength(2);
  });
});

describe('Utility functions', () => {
  it('should generate consistent colors for same user ID', () => {
    // This test verifies that the getUserColor function is deterministic
    // We can't directly test the function since it's not exported, but we can test
    // that the same user gets the same color by checking avatar styles
    const { rerender } = render(<UserAvatar user={mockUsers[0]} />);
    const firstRender = screen.getByText('JD').style.backgroundColor;

    rerender(<UserAvatar user={mockUsers[0]} />);
    const secondRender = screen.getByText('JD').style.backgroundColor;

    expect(firstRender).toBe(secondRender);
  });

  it('should generate different colors for different users', () => {
    const { rerender } = render(<UserAvatar user={mockUsers[0]} />);
    const firstUserColor = screen.getByText('JD').style.backgroundColor;

    rerender(<UserAvatar user={mockUsers[1]} />);
    const secondUserColor = screen.getByText('JS').style.backgroundColor;

    expect(firstUserColor).not.toBe(secondUserColor);
  });
});