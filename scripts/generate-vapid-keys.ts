import webpush from 'web-push';

const keys = webpush.generateVAPIDKeys();

console.log('\nCopy these values into your .env file:\n');
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log('\nThe private key must stay secret — never commit it to version control.');
console.log('Keep the same keys for all future sends; generate once and reuse.\n');
