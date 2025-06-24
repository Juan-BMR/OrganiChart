import fs from 'fs';
import path from 'path';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n🔐 Firebase Service Account Key Converter\n');
console.log('This script will help you convert your service account JSON to a single line.\n');

rl.question('Enter the path to your service account JSON file: ', (filePath) => {
  try {
    // Expand ~ to home directory
    if (filePath.startsWith('~/')) {
      filePath = path.join(process.env.HOME || process.env.USERPROFILE, filePath.slice(2));
    }
    
    // Read the JSON file
    const jsonContent = fs.readFileSync(filePath, 'utf8');
    
    // Parse to validate it's valid JSON
    const parsed = JSON.parse(jsonContent);
    
    // Convert to single line
    const singleLine = JSON.stringify(parsed);
    
    // Read existing .env
    let envContent = '';
    if (fs.existsSync('.env')) {
      envContent = fs.readFileSync('.env', 'utf8');
    }
    
    // Check if FIREBASE_SERVICE_ACCOUNT_KEY already exists
    if (envContent.includes('FIREBASE_SERVICE_ACCOUNT_KEY=')) {
      console.log('\n⚠️  FIREBASE_SERVICE_ACCOUNT_KEY already exists in .env');
      rl.question('Do you want to replace it? (y/n): ', (answer) => {
        if (answer.toLowerCase() === 'y') {
          // Replace existing
          envContent = envContent.replace(
            /FIREBASE_SERVICE_ACCOUNT_KEY=.*/,
            `FIREBASE_SERVICE_ACCOUNT_KEY='${singleLine}'`
          );
          fs.writeFileSync('.env', envContent);
          console.log('\n✅ Service account key updated in .env file!');
        } else {
          console.log('\n❌ Cancelled. No changes made.');
        }
        rl.close();
      });
    } else {
      // Add new
      const newLine = envContent.endsWith('\n') ? '' : '\n';
      envContent += `${newLine}FIREBASE_SERVICE_ACCOUNT_KEY='${singleLine}'\n`;
      fs.writeFileSync('.env', envContent);
      console.log('\n✅ Service account key added to .env file!');
      rl.close();
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code === 'ENOENT') {
      console.error('   File not found. Please check the path and try again.');
    } else if (error instanceof SyntaxError) {
      console.error('   Invalid JSON file. Please check the file content.');
    }
    rl.close();
  }
});

rl.on('close', () => {
  console.log('\n👋 Goodbye!\n');
  process.exit(0);
});