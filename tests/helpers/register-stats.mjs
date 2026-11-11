import {register} from 'node:module';
import {fileURLToPath} from 'node:url';

process.env.TSX_TSCONFIG_PATH = fileURLToPath(new URL('../tsconfig.stats.json', import.meta.url));
register('./css-modules-loader.mjs', import.meta.url);
await import('tsx');
