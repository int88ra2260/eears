// tests/setup.js
// Jest 測試環境設定

// 設定測試環境變數
process.env.NODE_ENV = 'test';

// 全域 mock 設定
global.console = {
  ...console,
  // 在測試中隱藏 console.log
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};








