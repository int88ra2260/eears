// scripts/generate-jwt-secret.js
// 生成強度足夠的 JWT 密鑰

const crypto = require('crypto');

function generateJWTSecret() {
  // 生成 64 字元的隨機字串（32 bytes = 64 hex characters）
  const randomBytes = crypto.randomBytes(32);
  const secret = randomBytes.toString('hex');
  
  // 為了滿足強度要求（包含特殊字符），我們可以添加一些特殊字符
  // 但為了安全，我們使用 base64 編碼，它包含大小寫、數字和特殊字符
  const base64Secret = randomBytes.toString('base64');
  
  console.log('\n✅ JWT 密鑰已生成（Hex 格式）：');
  console.log(`JWT_SECRET=${secret}\n`);
  
  console.log('✅ JWT 密鑰已生成（Base64 格式，推薦）：');
  console.log(`JWT_SECRET=${base64Secret}\n`);
  
  console.log('📝 請將其中一個值添加到 .env 檔案中：');
  console.log('   1. 打開 .env 檔案');
  console.log('   2. 設定 JWT_SECRET=<上面的值>');
  console.log('   3. 保存檔案\n');
  
  console.log('⚠️  重要提醒：');
  console.log('   - 不要將此密鑰分享給任何人');
  console.log('   - 不要將此密鑰提交到版本控制系統');
  console.log('   - 如果密鑰洩露，請立即生成新的密鑰並更新所有 token\n');
  
  return { hex: secret, base64: base64Secret };
}

// 如果直接執行此腳本
if (require.main === module) {
  generateJWTSecret();
}

module.exports = { generateJWTSecret };
