import { execSync } from 'child_process';

const newOrigin = 'https://leads-jet-one.vercel.app';
const newRedirect = `${newOrigin}/api/v1/oauth/google/callback`;

try {
  execSync('npx vercel env rm WEB_ORIGIN production -y');
} catch (e) {}
try {
  execSync('npx vercel env rm GOOGLE_REDIRECT_URI production -y');
} catch (e) {}

execSync(`npx vercel env add WEB_ORIGIN production`, {
  input: newOrigin,
  stdio: ['pipe', 'inherit', 'inherit']
});

execSync(`npx vercel env add GOOGLE_REDIRECT_URI production`, {
  input: newRedirect,
  stdio: ['pipe', 'inherit', 'inherit']
});
