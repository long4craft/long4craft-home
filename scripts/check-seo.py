#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Check the actual static build, metadata, linked files and structured content."""
import json
import re
import struct
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tags = []
        self.ids = []
        self.title = ''
        self.in_title = False
        self.script_type = None
        self.scripts = []
        self.script_text = ''
        self.text = []
        self.services = []
        self.current_service = None
        self.service_field = None

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        self.tags.append((tag, attrs))
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        if tag == 'title':
            self.in_title = True
        if tag == 'script':
            self.script_type = attrs.get('type', 'javascript')
            self.script_text = ''
        if tag == 'article' and 'service-card' in attrs.get('class', '').split():
            self.current_service = {'id': attrs.get('id'), 'name': '', 'description': '', 'keywords': ''}
        if self.current_service is not None:
            if tag == 'h3':
                self.service_field = 'name'
            elif tag == 'p' and attrs.get('class') in ('service-tagline', 'service-keywords'):
                self.service_field = {'service-tagline': 'description', 'service-keywords': 'keywords'}[attrs['class']]

    def handle_endtag(self, tag):
        if tag == 'title':
            self.in_title = False
        if tag == 'script':
            if self.script_type == 'application/ld+json':
                self.scripts.append(self.script_text)
            self.script_type = None
        if tag in ('h3', 'p'):
            self.service_field = None
        if tag == 'article' and self.current_service is not None:
            self.services.append(self.current_service)
            self.current_service = None

    def handle_data(self, text):
        if self.in_title:
            self.title += text
        if self.script_type is not None:
            self.script_text += text
        else:
            self.text.append(text)
        if self.current_service is not None and self.service_field:
            self.current_service[self.service_field] += text

    def meta(self, name):
        values = [attrs.get('content') for tag, attrs in self.tags if tag == 'meta' and (attrs.get('name') == name or attrs.get('property') == name)]
        assert len(values) == 1 and values[0], f'Missing or duplicate meta: {name}'
        return values[0]


def read_page(name):
    text = (DIST / name).read_text()
    assert not re.search(r'\{\{(?:SEO_|SITE_COUNT)|<!-- (?:PROJECT_|STRUCTURED_DATA)', text), 'Unresolved build template'
    page = Page()
    page.feed(text)
    return page


def check():
    page = read_page('index.html')
    canonical_links = [attrs['href'] for tag, attrs in page.tags if tag == 'link' and attrs.get('rel') == 'canonical']
    assert canonical_links == ['https://long4craft.com/'], 'Canonical URL must be the intended root HTTPS URL'
    canonical = canonical_links[0]
    assert page.title.count('Long4Craft') == 1 and '网站建设' in page.title and 'AI 应用' in page.title
    description = page.meta('description')
    assert description == page.meta('og:description') == page.meta('twitter:description')
    assert page.title == page.meta('og:title') == page.meta('twitter:title')
    assert page.meta('og:url') == canonical and page.meta('og:site_name') == 'Long4Craft'
    assert page.meta('og:locale') == 'zh_CN' and page.meta('twitter:card') == 'summary_large_image'
    assert 'noindex' not in page.meta('robots') and 'index' in page.meta('robots')
    assert any(tag == 'html' and attrs.get('lang') == 'zh-CN' for tag, attrs in page.tags)
    page.meta('viewport')
    assert sum(tag == 'h1' for tag, _ in page.tags) == 1, 'Exactly one main heading required'
    assert len(page.ids) == len(set(page.ids)), 'Duplicate DOM anchors'

    for tag, attrs in page.tags:
        if tag == 'img':
            assert attrs.get('alt') and attrs.get('width') and attrs.get('height'), 'Images need a description and intrinsic dimensions'
        for field in ('href', 'src'):
            value = attrs.get(field, '')
            if value.startswith('#'):
                assert value[1:] in page.ids, f'Broken local anchor: {value}'
            elif value.startswith('/') and not value.startswith('//'):
                file_path = DIST / urlsplit(value).path.lstrip('/')
                assert file_path.is_file() or file_path == DIST, f'Missing local asset: {value}'

    image = page.meta('og:image')
    assert image == page.meta('twitter:image')
    parsed = urlsplit(image)
    assert parsed.scheme == 'https' and parsed.netloc == 'long4craft.com'
    image_file = DIST / parsed.path.lstrip('/')
    assert image_file.read_bytes()[:8] == b'\x89PNG\r\n\x1a\n'
    width, height = struct.unpack('>II', image_file.read_bytes()[16:24])
    assert (width, height) == (int(page.meta('og:image:width')), int(page.meta('og:image:height'))) == (1200, 630)
    assert page.meta('og:image:alt') == page.meta('twitter:image:alt')

    assert len(page.scripts) == 1, 'One build-time structured data graph required'
    graph = json.loads(page.scripts[0])
    assert graph['@context'] == 'https://schema.org'
    nodes = graph['@graph']
    ids = [node['@id'] for node in nodes]
    assert len(ids) == len(set(ids)), 'Duplicate schema identities'
    assert len([node for node in nodes if node['@type'] == 'WebSite']) == 1
    assert next(node for node in nodes if node['@type'] == 'WebSite')['url'] == canonical
    schema_services = [node for node in nodes if node['@type'] == 'Service']
    assert len(schema_services) == len(page.services) == 6
    for visible, data in zip(page.services, schema_services):
        assert visible['name'] == data['name'], 'Structured service name differs from actual page'
        assert visible['description'] in data['description'] and visible['keywords'] in data['description']
        assert data['url'] == canonical + '#' + visible['id']
    catalog = json.loads((DIST / 'catalog/websites.json').read_text())
    sites = [site for site in catalog['sites'] if site['url'].rstrip('/') != canonical.rstrip('/')]
    works = next(node for node in nodes if node['@id'] == canonical + '#work')
    assert works['numberOfItems'] == len(works['itemListElement']) == len(sites)
    for site, entry in zip(sites, works['itemListElement']):
        assert entry['item']['name'] == site['name'] and entry['item']['url'] == site['url']

    def check_references(value):
        if isinstance(value, dict):
            if set(value) == {'@id'}:
                assert value['@id'] in ids, 'Broken structured data reference'
            for child in value.values():
                check_references(child)
        elif isinstance(value, list):
            for child in value:
                check_references(child)
    check_references(graph)

    sitemap = ET.fromstring((DIST / 'sitemap.xml').read_text())
    urls = [element.text for element in sitemap.findall('{*}url/{*}loc')]
    assert urls == [canonical], 'Sitemap must only list real canonical pages on this host'
    assert all(not urlsplit(url).fragment for url in urls), 'Anchors are not separate sitemap pages'
    robots = (DIST / 'robots.txt').read_text()
    assert 'User-agent: *' in robots and 'Allow: /' in robots
    assert f'Sitemap: {canonical}sitemap.xml' in robots
    assert 'Disallow:' not in robots, 'Public page assets must remain crawlable'
    error_page = read_page('404.html')
    assert 'noindex' in error_page.meta('robots'), 'Error document should not be indexed'
    print(json.dumps({
        'passed': True, 'title': page.title, 'description': description,
        'canonical': canonical, 'structured_types': dict(Counter(node['@type'] for node in nodes)),
        'works': len(sites), 'services': len(page.services), 'share_image': [width, height],
        'sitemap_urls': urls,
        'checks': ['标题与摘要一致', 'Canonical与分享信息', '静态HTML与图片资源', '结构化数据与可见内容一致', '站点地图与robots', '404页面noindex']
    }, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    check()
