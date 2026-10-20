const $ = selector => document.querySelector(selector);
const profileUrl = 'https://www.xiaohongshu.com/user/profile/556b22b967bc65522ef3fc8a';
const menuToggle = $('.menu-toggle');
const mobileNav = $('#mobile-nav');
let activeOpener = null;
let projectsPromise;

function closeMenu(restoreFocus=false) {
  menuToggle.setAttribute('aria-expanded','false');
  menuToggle.setAttribute('aria-label','打开导航');
  mobileNav.hidden = true;
  if (restoreFocus) menuToggle.focus();
}
menuToggle.addEventListener('click', () => {
  const opening = mobileNav.hidden;
  mobileNav.hidden = !opening;
  menuToggle.setAttribute('aria-expanded',String(opening));
  menuToggle.setAttribute('aria-label',opening ? '关闭导航' : '打开导航');
});
mobileNav.addEventListener('click', event => {if (event.target.closest('a,button')) closeMenu();});
document.addEventListener('pointerdown', event => {if (!event.target.closest('.site-header')) closeMenu();});
document.addEventListener('keydown', event => {if (event.key === 'Escape' && !mobileNav.hidden) closeMenu(true);});
matchMedia('(min-width:761px)').addEventListener('change',event => {if (event.matches) closeMenu();});

function showDialog(dialog, opener) {
  closeMenu();
  activeOpener = opener;
  // Close an open source-access popover before entering the native modal focus trap.
  document.querySelector('source-access')?.hide?.();
  document.body.classList.add('has-dialog');
  dialog.showModal();
}
for (const dialog of document.querySelectorAll('dialog')) {
  dialog.querySelector('[data-close]').addEventListener('click',() => dialog.close());
  dialog.addEventListener('click',event => {
    if (event.target !== dialog) return;
    const bounds=dialog.getBoundingClientRect();
    if (event.clientX<bounds.left || event.clientX>bounds.right || event.clientY<bounds.top || event.clientY>bounds.bottom) dialog.close();
  });
  dialog.addEventListener('close',() => {
    document.body.classList.remove('has-dialog');
    if (dialog.id==='contact-dialog') {
      $('#brief-form').reset();
      $('#brief-feedback').textContent='';
    }
    activeOpener?.focus({preventScroll:true});
    activeOpener=null;
  });
}

document.addEventListener('click',event => {
  const consult=event.target.closest('[data-consult]');
  if (consult) {
    $('#service-choice').value=consult.dataset.consult;
    $('#brief-feedback').textContent='';
    showDialog($('#contact-dialog'),consult);
  }
  const source=event.target.closest('[data-source]');
  if (source) {
    $('#source-choice').value=source.dataset.source;
    showDialog($('#source-dialog'),source);
    updateSourceChoice();
  }
});

async function copyText(text,status,success) {
  try {
    await navigator.clipboard.writeText(text);
    status.textContent=success;
  } catch {
    // Keep a selectable fallback in-page when clipboard access is unavailable.
    status.textContent=`暂时无法复制，请手动选中以下内容：\n${text}`;
    status.style.whiteSpace='pre-wrap';
    status.tabIndex=0;
    status.focus();
  }
}
$('#brief-form').addEventListener('submit',event => {
  event.preventDefault();
  const choice=$('#service-choice').value;
  const message=$('#brief-message').value.trim();
  const text=`你好，我从 Long4Craft 网站来，想了解「${choice}」。\n${message ? `我的需求：${message}` : '想先和你聊聊需求与实现方案。'}`;
  copyText(text,$('#brief-feedback'),'需求已复制。点击下方「打开小红书主页」，在私信中粘贴并发送即可。');
});

async function getProjects() {
  if (!projectsPromise) projectsPromise=fetch('/content/projects.json').then(response => {
    if (!response.ok) throw Error('source guide unavailable');
    return response.json();
  }).catch(error => {projectsPromise=undefined;throw error;});
  return projectsPromise;
}
async function updateSourceChoice() {
  const choice=$('#source-choice').value;
  $('#source-feedback').textContent='';
  $('#source-keyword').textContent='…';
  $('#copy-keyword').disabled=true;
  $('#source-note-link').href=profileUrl;
  $('#source-note-link').firstChild.textContent='去小红书找对应笔记 ';
  try {
    const projects=await getProjects();
    if ($('#source-choice').value!==choice) return;
    const meta=projects[choice];
    if (!meta) throw Error('Unknown project');
    $('#source-keyword').textContent=meta.keyword;
    $('#copy-keyword').disabled=false;
    const noteUrl=meta.note_url ? new URL(meta.note_url) : null;
    const verifiedNote=noteUrl?.protocol==='https:' && noteUrl.hostname==='www.xiaohongshu.com' && noteUrl.pathname.startsWith('/explore/');
    $('#source-note-link').href=verifiedNote ? noteUrl.href : profileUrl;
    $('#source-note-link').firstChild.textContent=verifiedNote ? '打开对应小红书笔记 ' : '去小红书找对应笔记 ';
    $('#source-note-help').textContent=verifiedNote ? '已为你准备好这个作品的笔记，打开后评论上面的关键词。' : `到我的小红书主页，找到「${$('#source-choice').selectedOptions[0].textContent}」对应的项目笔记。`;
  } catch {
    if ($('#source-choice').value!==choice) return;
    $('#source-keyword').textContent='请到主页查看';
    $('#source-note-help').textContent='项目领取说明暂时无法读取，请到小红书主页查看对应笔记。';
  }
}
$('#source-choice').addEventListener('change',updateSourceChoice);
$('#copy-keyword').addEventListener('click',() => copyText($('#source-keyword').textContent,$('#source-feedback'),'项目关键词已复制，在对应笔记下评论即可。'));

if ('IntersectionObserver' in window) {
  const links=[...document.querySelectorAll('.desktop-nav a')];
  const visible=new Set();
  const observer=new IntersectionObserver(entries => {
    for (const entry of entries) entry.isIntersecting ? visible.add(entry.target.id) : visible.delete(entry.target.id);
    const active=links.find(link => visible.has(link.hash.slice(1)));
    for (const link of links) {
      if (link===active) link.setAttribute('aria-current','location');
      else link.removeAttribute('aria-current');
    }
  },{rootMargin:'-15% 0px -45% 0px',threshold:0});
  for (const link of links) observer.observe(document.querySelector(link.hash));
}
