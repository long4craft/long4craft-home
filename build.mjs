import {mkdir, copyFile, cp, rm, readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {seo, structuredData, serializeStructuredData, sitemap, robots} from './seo.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const file = name => path.join(root, name);
const catalog = JSON.parse(await readFile(file('public/catalog/websites.json'), 'utf8'));
const presentation = JSON.parse(await readFile(file('content/projects.json'), 'utf8'));
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
const arrow = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14"/></svg>';
const seen = new Set();
const projects = catalog.sites.filter(site => site.url !== catalog.root_url).map((site, index) => {
  if (!/^[a-z][a-z0-9-]*$/.test(site.slug) || seen.has(site.slug)) throw Error('目录 slug 无效或重复');
  seen.add(site.slug);
  const url = new URL(site.url);
  if (url.protocol !== 'https:' || url.hostname !== `${site.slug}.long4craft.com` || url.pathname !== '/') throw Error('作品地址超出子域名范围');
  const meta = presentation[site.slug];
  if (!meta) throw Error(`请先为 ${site.slug} 添加真实截图和展示信息`);
  return {site, meta, index};
});
const cards = projects.map(({site, meta, index}) => `<article class="project-card" id="project-${escape(site.slug)}">
  <a class="project-preview ${escape(site.slug)}" href="${escape(site.url)}" target="_blank" rel="noopener noreferrer" aria-label="访问 ${escape(site.name)}，在新窗口打开">
    <div class="browser-frame"><div class="browser-toolbar"><span class="browser-dots"><i></i><i></i><i></i></span><span>${escape(urlHost(site.url))}</span><span class="browser-toolbar-icon">↗</span></div><img src="/assets/${escape(site.slug)}.webp" alt="${escape(site.name)}真实网站首页截图" width="1440" height="1000" loading="lazy" decoding="async"></div>
    <span class="preview-visit">探索这个网站 ${arrow}</span>
  </a>
  <div class="project-heading"><div><span class="project-category">${escape(meta.category)}</span><h3>${escape(site.name)}</h3></div><a class="round-link" href="${escape(site.url)}" target="_blank" rel="noopener noreferrer" aria-label="访问 ${escape(site.name)}">${arrow}</a></div>
  <p class="project-description">${escape(site.description)}</p>
  <div class="project-bottom"><div class="tags">${site.tags.slice(0,3).map(tag => `<span>${escape(tag)}</span>`).join('')}</div><button type="button" class="text-link" data-source="${escape(site.slug)}" aria-label="获取 ${escape(site.name)} 源码">获取源码 <span aria-hidden="true">↗</span></button></div>
</article>`).join('\n');
const options = projects.map(({site}) => `<option value="${escape(site.slug)}">${escape(site.name)}</option>`).join('');
let html = await readFile(file('index.html'), 'utf8');
html = html.replace('<!-- PROJECT_CARDS -->',cards).replace('<!-- PROJECT_OPTIONS -->',options).replaceAll('{{SITE_COUNT}}',String(projects.length));
for (const key of ['title', 'description', 'canonical', 'image', 'imageAlt', 'name']) {
  html = html.replaceAll(`{{SEO_${key.toUpperCase()}}}`, escape(seo[key]));
}
const graph = structuredData(projects, html);
html = html.replace('<!-- STRUCTURED_DATA -->', `<script type="application/ld+json">${serializeStructuredData(graph)}</script>`);
if (/<!-- PROJECT_|\{\{SITE_COUNT\}\}/.test(html)) throw Error('页面模板尚未完成');
if (/\{\{SEO_|<!-- STRUCTURED_DATA -->/.test(html)) throw Error('SEO信息尚未完整生成');
await rm(file('dist'), {recursive:true, force:true});
await mkdir(file('dist'), {recursive:true});
await writeFile(file('dist/index.html'),html);
for (const asset of ['styles.css','services.css','brand.css','app.js']) await copyFile(file(asset),file(`dist/${asset}`));
await cp(file('public'),file('dist'),{recursive:true});
await cp(file('content'),file('dist/content'),{recursive:true});
await writeFile(file('dist/robots.txt'), robots());
await writeFile(file('dist/sitemap.xml'), sitemap());
console.log(`Long4Craft built → dist/ · ${projects.length} verified catalog entries`);
function urlHost(url) { return new URL(url).host; }
