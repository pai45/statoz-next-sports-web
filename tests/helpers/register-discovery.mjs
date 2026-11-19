import {register} from 'node:module';
import {fileURLToPath} from 'node:url';
process.env.TSX_TSCONFIG_PATH = fileURLToPath(new URL('../tsconfig.discovery.json', import.meta.url));
register('./picks-ui-loader.mjs', import.meta.url);
await import('tsx');
