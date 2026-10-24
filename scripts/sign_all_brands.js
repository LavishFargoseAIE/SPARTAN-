const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const brandsSeedPath = path.resolve(__dirname, '../registry/brands_seed.json');
const brandsDestPath = path.resolve(__dirname, '../registry/brands.json');
const brands = JSON.parse(fs.readFileSync(brandsSeedPath, 'utf8'));

// Generate / retrieve keypair
const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const rawPub32 = publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('base64');

console.log(`Signing ${brands.length} brands with Ed25519...`);
for (const b of brands) {
  const filtered = {};
  for (const k of Object.keys(b).sort()) {
    if (k !== 'signature') {
      filtered[k] = b[k];
    }
  }
  const canonicalBytes = Buffer.from(JSON.stringify(filtered));
  const sig = crypto.sign(null, canonicalBytes, privateKey);
  b.signature = sig.toString('base64');
}

fs.writeFileSync(brandsDestPath, JSON.stringify(brands, null, 2) + '\n');
console.log(`Successfully written signed entries to ${brandsDestPath}`);
