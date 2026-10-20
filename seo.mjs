// One metadata source; structured content comes from the actual visible page.
export const seo = Object.freeze({
  name: 'Long4Craft',
  canonical: 'https://long4craft.com/',
  title: 'Long4Craft｜网站建设、软件开发与 AI 应用',
  description: 'Long4Craft 展示独立网站作品，免费分享项目源码，提供网站建设、小程序与 App 开发、业务管理系统、AI 应用、流程自动化及改版维护服务。欢迎通过小红书私信交流需求。',
  image: 'https://long4craft.com/assets/social-cover.png',
  imageAlt: 'Long4Craft 网站首页，展示网站建设、软件开发与 AI 应用作品',
  profile: 'https://www.xiaohongshu.com/user/profile/556b22b967bc65522ef3fc8a'
});

const plainText = value => value.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();

export function readVisibleServices(html) {
  const services = [...html.matchAll(/<article class="service-card[^\"]*" id="([^\"]+)">([\s\S]*?)<\/article>/g)].map(([, id, card]) => {
    const field = pattern => {
      const match = card.match(pattern);
      if (!match) throw Error(`服务 ${id} 缺少可见内容`);
      return plainText(match[1]);
    };
    return {
      id,
      name: field(/<h3>([\s\S]*?)<\/h3>/),
      description: field(/<p class="service-tagline">([\s\S]*?)<\/p>/),
      keywords: field(/<p class="service-keywords">([\s\S]*?)<\/p>/)
    };
  });
  if (services.length !== 6 || new Set(services.map(item => item.id)).size !== services.length) throw Error('需要六类可见且有独立锚点的服务');
  return services;
}

export function structuredData(projects, html) {
  const services = readVisibleServices(html);
  const url = seo.canonical;
  const ref = id => ({'@id': `${url}#${id}`});
  const graph = [
    {
      '@type': 'Person', '@id': `${url}#creator`, name: '数码暴龙AI',
      url: `${url}#about`, sameAs: [seo.profile],
      description: '大厂程序员，喜欢设计与数码。用代码和 AI，把想法做成好用的作品。'
    },
    {
      '@type': 'WebSite', '@id': `${url}#website`, url, name: seo.name,
      description: seo.description, inLanguage: 'zh-CN', publisher: ref('creator')
    },
    {
      '@type': 'WebPage', '@id': `${url}#webpage`, url, name: seo.title,
      description: seo.description, inLanguage: 'zh-CN', isPartOf: ref('website'),
      author: ref('creator'), primaryImageOfPage: ref('cover'),
      mainEntity: [ref('work'), ref('services')]
    },
    {
      '@type': 'ImageObject', '@id': `${url}#cover`, url: seo.image,
      width: 1200, height: 630, caption: seo.imageAlt
    },
    {
      '@type': 'ItemList', '@id': `${url}#work`, url: `${url}#work`, name: '网站作品',
      numberOfItems: projects.length,
      itemListElement: projects.map(({site}, index) => ({
        '@type': 'ListItem', position: index + 1,
        item: {'@type': 'CreativeWork', name: site.name, url: site.url, description: site.description, creator: ref('creator')}
      }))
    },
    {
      '@type': 'ItemList', '@id': `${url}#services`, url: `${url}#services`, name: '开发服务',
      numberOfItems: services.length,
      itemListElement: services.map((service, index) => ({'@type': 'ListItem', position: index + 1, item: ref(service.id)}))
    },
    ...services.map(service => ({
      '@type': 'Service', '@id': `${url}#${service.id}`, url: `${url}#${service.id}`,
      name: service.name, serviceType: service.name,
      description: `${service.description}${service.keywords}。`, provider: ref('creator')
    }))
  ];
  return {'@context': 'https://schema.org', '@graph': graph};
}

export function serializeStructuredData(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

export function sitemap() {
  // Only canonical URLs on this host. Anchors and independently hosted works are not pages here.
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${seo.canonical}</loc></url>\n</urlset>\n`;
}

export function robots() {
  return `User-agent: *\nAllow: /\n\nSitemap: ${seo.canonical}sitemap.xml\n`;
}
