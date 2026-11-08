import {spawnSync} from 'node:child_process';
const result=spawnSync(process.execPath,['node_modules/next/dist/bin/next','build','--webpack'],{stdio:'inherit',env:{...process.env,GITHUB_PAGES:'true',NEXT_PUBLIC_BASE_PATH:'/statoz-next-sports-web',NEXT_TELEMETRY_DISABLED:'1'}});process.exitCode=result.status??1;
