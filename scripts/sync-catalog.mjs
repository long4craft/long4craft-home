import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const input=process.argv[2];
if (!input) throw Error('请提供公开 catalog/websites.json 的文件路径');
const source=JSON.parse(await readFile(input,'utf8'));
if (source.schema_version!==1 || source.root_url!=='https://long4craft.com' || !Array.isArray(source.sites)) throw Error('公开目录格式不正确');
const fields=['name','slug','description','tags','url','repository_url','completed_at','updated_at','xiaohongshu_status','xiaohongshu_url'];
const clean={schema_version:1,root_url:source.root_url,updated_at:source.updated_at,sites:source.sites.map(site=>Object.fromEntries(fields.filter(key=>Object.hasOwn(site,key)).map(key=>[key,site[key]])))};
const target=fileURLToPath(new URL('../public/catalog/websites.json',import.meta.url));
await mkdir(path.dirname(target),{recursive:true});
await writeFile(target,JSON.stringify(clean,null,2)+'\n');
console.log(`已同步 ${clean.sites.length} 个项目的公开目录；请构建并预览后发布。`);
