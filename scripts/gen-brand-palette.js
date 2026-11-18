// Generates app/brand-palette.css: FITT brand scales + remap of Tailwind's default palette names onto them.
const fs = require('fs');
const out = process.argv[2];

const scales = {
  azure:   { 50:'#E6F5FC',100:'#CCEAF8',200:'#99D6F1',300:'#66C1E9',400:'#33ADE2',500:'#0098DB',600:'#007AAF',700:'#005B83',800:'#003D58',900:'#002E42',950:'#001E2C' },
  green:   { 50:'#F4F9E9',100:'#EAF3D2',200:'#D5E6A5',300:'#BFDA79',400:'#AACD4C',500:'#95C11F',600:'#779A19',700:'#597413',800:'#3C4D0C',900:'#2D3A09',950:'#1E2706' },
  fuchsia: { 50:'#FCE6F2',100:'#FACCE5',200:'#F599CB',300:'#F066B1',400:'#EB3398',500:'#E6007E',600:'#B80065',700:'#8A004C',800:'#5C0032',900:'#450026',950:'#2E0019' },
  neutral: { 50:'#F6F7F7',100:'#EEEFEF',200:'#E1E2E3',300:'#C6C7C8',400:'#A2A4A3',500:'#6C6F70',600:'#5A5D5E',700:'#46494A',800:'#2F3132',900:'#1C1E1F',950:'#101214' },
};

// Tailwind palette names -> FITT scale. amber/yellow/orange stay as the functional "warning" colour.
const remap = {
  azure:   ['indigo', 'blue', 'violet', 'purple', 'sky', 'cyan'],
  green:   ['emerald', 'green', 'lime'],
  fuchsia: ['red', 'rose', 'pink', 'fuchsia'],
  neutral: ['slate', 'zinc', 'gray', 'neutral', 'stone'],
};

let css = '/* Generated from the FITT brand palette (see fitt-brand). Do not edit by hand: run `node scripts/gen-brand-palette.js app/brand-palette.css`.\n' +
  '   Brand anchors at 500: Azzurro #0098DB, Verde #95C11F, Fucsia #E6007E; neutrals from the FITT greys. */\n@theme {\n';

for (const [name, shades] of Object.entries(scales)) {
  css += `  /* ${name} */\n`;
  for (const [k, v] of Object.entries(shades)) css += `  --color-${name}-${k}: ${v};\n`;
}
for (const [scale, names] of Object.entries(remap)) {
  for (const n of names) {
    // A Tailwind name that is also a brand scale name (green, fuchsia, neutral) is already defined above:
    // aliasing it to itself would create a circular variable and make the colour invalid.
    if (n === scale) continue;
    css += `  /* ${n} -> ${scale} */\n`;
    for (const k of Object.keys(scales[scale])) css += `  --color-${n}-${k}: var(--color-${scale}-${k});\n`;
  }
}
css += '}\n';
fs.writeFileSync(out, css);
console.log('written', out, css.split('\n').length, 'lines');
