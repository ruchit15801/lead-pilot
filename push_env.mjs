import { execSync } from 'child_process';
import fs from 'fs';
import dotenv from 'dotenv';

const envVars = dotenv.parse(fs.readFileSync('.env', 'utf-8'));

for (const [key, value] of Object.entries(envVars)) {
  if (!value) continue;
  try {
    console.log(`Pushing ${key}...`);
    execSync(`npx vercel env add ${key} production`, {
      input: value,
      stdio: ['pipe', 'inherit', 'inherit']
    });
  } catch (err) {
    console.error(`Failed to push ${key}`);
  }
}
