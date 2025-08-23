#!/usr/bin/env node

import { config } from './config/index.js';

console.log('🧪 Testing server configuration...');
console.log('Configuration:', {
  port: config.port,
  wsPort: config.wsPort,
  nodeEnv: config.nodeEnv,
  corsOrigin: config.corsOrigin,
  persistenceType: config.persistenceType,
});

console.log('✅ Server configuration test passed!');