// scripts/verify-basepath.mjs
// 驗證前端 basePath 設定

import { readFileSync } from 'fs';
import { join } from 'path';

const basePath = process.argv[2] || '/EEARS';

console.log(`🔍 檢查 basePath 設定: ${basePath}\n`);

// 檢查前端 package.json
try {
  const frontendPackagePath = join(process.cwd(), '..', 'frontend', 'package.json');
  const frontendPackage = JSON.parse(readFileSync(frontendPackagePath, 'utf-8'));
  
  console.log('前端 package.json 檢查:');
  console.log(`  名稱: ${frontendPackage.name}`);
  console.log(`  版本: ${frontendPackage.version}`);
  
  // 檢查 vite.config.js 或類似的設定檔
  const viteConfigPath = join(process.cwd(), '..', 'frontend', 'vite.config.js');
  try {
    const viteConfig = readFileSync(viteConfigPath, 'utf-8');
    if (viteConfig.includes(basePath)) {
      console.log(`  ✅ vite.config.js 包含 basePath: ${basePath}`);
    } else {
      console.log(`  ⚠️  vite.config.js 可能未設定 basePath`);
    }
  } catch (e) {
    console.log(`  ⚠️  無法讀取 vite.config.js: ${e.message}`);
  }
} catch (error) {
  console.log(`  ⚠️  無法讀取前端 package.json: ${error.message}`);
}

// 檢查後端 server.js 的靜態檔案路徑
try {
  const serverPath = join(process.cwd(), 'server.js');
  const serverContent = readFileSync(serverPath, 'utf-8');
  
  if (serverContent.includes('express.static')) {
    console.log('\n後端 server.js 檢查:');
    console.log(`  ✅ 已設定 express.static`);
  }
} catch (error) {
  console.log(`  ⚠️  無法讀取 server.js: ${error.message}`);
}

console.log('\n✅ BasePath 檢查完成');
process.exit(0);

