import { MockUser } from '../types.js';

export class UserGenerator {
  private static names = [
    'Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry',
    'Ivy', 'Jack', 'Kate', 'Liam', 'Maya', 'Noah', 'Olivia', 'Paul',
    'Quinn', 'Ruby', 'Sam', 'Tara', 'Uma', 'Victor', 'Wendy', 'Xander',
    'Yara', 'Zoe'
  ];

  private static colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F8C471', '#82E0AA', '#AED6F1', '#E8DAEF', '#FADBD8'
  ];

  private static avatars = [
    '👨‍💻', '👩‍💻', '👨‍🎨', '👩‍🎨', '👨‍💼', '👩‍💼',
    '🧑‍🎓', '👨‍🔬', '👩‍🔬', '👨‍🏫', '👩‍🏫', '🧑‍💻'
  ];

  static generateId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static generateUser(name?: string, isActive = true): MockUser {
    const userName = name || this.names[Math.floor(Math.random() * this.names.length)];
    const userColor = this.colors[Math.floor(Math.random() * this.colors.length)];
    const avatar = this.avatars[Math.floor(Math.random() * this.avatars.length)];
    
    return {
      id: this.generateId(),
      name: userName,
      avatar,
      color: userColor,
      joinedAt: Date.now(),
      isActive,
    };
  }

  static generateUsers(count: number): MockUser[] {
    const users: MockUser[] = [];
    const usedNames = new Set<string>();
    
    for (let i = 0; i < count; i++) {
      let name: string;
      let attempts = 0;
      
      // Ensure unique names
      do {
        name = this.names[Math.floor(Math.random() * this.names.length)];
        attempts++;
        
        // If we've tried too many times, add a number suffix
        if (attempts > 10) {
          name = `${name}${i + 1}`;
          break;
        }
      } while (usedNames.has(name));
      
      usedNames.add(name);
      users.push(this.generateUser(name));
    }
    
    return users;
  }

  static generateTeam(teamSize: number, teamName?: string): MockUser[] {
    const team = this.generateUsers(teamSize);
    
    if (teamName) {
      team.forEach((user, index) => {
        user.name = `${teamName}_${user.name}`;
      });
    }
    
    return team;
  }

  static generateUserWithBehavior(
    name?: string,
    behaviorType: 'active' | 'moderate' | 'passive' = 'moderate'
  ): MockUser {
    const user = this.generateUser(name);
    
    // Adjust user properties based on behavior type
    switch (behaviorType) {
      case 'active':
        // Active users are always online and engaged
        user.isActive = true;
        break;
      case 'passive':
        // Passive users might be idle or less active
        user.isActive = Math.random() > 0.3;
        break;
      case 'moderate':
      default:
        user.isActive = Math.random() > 0.1;
        break;
    }
    
    return user;
  }

  static generateMixedUsers(count: number): MockUser[] {
    const users: MockUser[] = [];
    const behaviorTypes: Array<'active' | 'moderate' | 'passive'> = ['active', 'moderate', 'passive'];
    
    for (let i = 0; i < count; i++) {
      const behaviorType = behaviorTypes[i % behaviorTypes.length];
      users.push(this.generateUserWithBehavior(undefined, behaviorType));
    }
    
    return users;
  }

  static simulateUserJoinLeave(users: MockUser[], sessionDuration: number): MockUser[] {
    const timeline = users.map(user => ({ ...user }));
    
    timeline.forEach(user => {
      // Simulate join time (some users join later)
      if (Math.random() > 0.7) {
        user.joinedAt = Date.now() + Math.random() * sessionDuration * 0.3;
      }
      
      // Simulate activity patterns
      if (Math.random() > 0.8) {
        user.isActive = false; // Some users go inactive
      }
    });
    
    return timeline;
  }
}