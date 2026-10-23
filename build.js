const fs=require('fs'),path=require('path');
const matter=require('gray-matter'),{marked}=require('marked');
const J=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const siteCfg=J('content/settings/site.json');const SITE=siteCfg.site_name||'USA Viral 24N',URL='https://usaviral24n.com';
const cats=J('content/settings/categories.json').categories;
const ads=J('content/settings/ads.json'),pages=J('content/settings/pages.json');
const catName=s=>(cats.find(c=>c.slug===s)||{name:s}).name;
const esc=s=>String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
const ad=k=>ads[k]?`<div class="ad">${ads[k]}</div>`:'';
const out=(p,h)=>{const f=path.join('dist',p,'index.html');fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,h)};

const posts=fs.readdirSync('content/posts').filter(f=>f.endsWith('.md')).map(f=>{
  const {data,content}=matter(fs.readFileSync('content/posts/'+f,'utf8'));
  return {...data,slug:data.slug||f.replace(/\.md$/,''),date:new Date(data.date||0),body:content};
}).sort((a,b)=>b.date-a.date);

const layout=({title,desc,body,canon,social,image})=>`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}"><link rel="canonical" href="${URL}${canon}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${URL}${canon}">${image?`<meta property="og:image" content="${image.startsWith('http')?image:URL+image}">`:''}
<link rel="stylesheet" href="/style.css">${ads.verify_code||''}${ads.extra_network_code||''}</head><body>
<header><a class="logo" href="/">${siteCfg.logo?`<img src="${siteCfg.logo}" alt="${esc(SITE)}" style="height:40px;width:auto;vertical-align:middle">`:SITE}</a><nav>${cats.map(c=>`<a href="/category/${c.slug}/">${c.name}</a>`).join('')}</nav></header>
<main>${ad('top_banner')}${body}</main>
<footer>${Object.entries(pages).map(([k,p])=>`<a href="/${slugOf(k)}/">${p.title}</a>`).join(' · ')}<br>© ${new Date().getFullYear()} ${SITE}</footer>
${social?ad('social_bar').replace('class="ad"','class="ad social"'):''}</body></html>`;
const slugOf=k=>({about:'about-us',contact:'contact-us',privacy:'privacy-policy',disclaimer:'disclaimer'})[k];
const card=p=>`<a class="card" href="/${p.slug}/"><b>${esc(p.title)}</b><span>${catName(p.category)} · ${p.date.toDateString()}</span></a>`;

function render(p){
  let html=marked.parse(p.body),toc=[];
  html=html.replace(/<h([23])>(.*?)<\/h\1>/g,(m,l,t)=>{const id=t.replace(/<[^>]+>/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');toc.push({l,id,t});return `<h${l} id="${id}">${t}</h${l}>`});
  const tocHtml=p.toc!==false&&toc.length?`<nav class="toc"><b>Table of Contents</b><ul>${toc.map(x=>`<li style="margin-left:${x.l==3?16:0}px"><a href="#${x.id}">${x.t}</a></li>`).join('')}</ul></nav>`:'';
  let n=0;html=html.replace(/<\/p>/g,m=>{n++;return m+(n===1?ad('below_p1'):n===2?ad('below_p2')+tocHtml:'')});if(n<2)html+=tocHtml;
  const related=posts.filter(x=>x.slug!==p.slug&&x.category===p.category).slice(0,4);
  const trending=posts.filter(x=>x.slug!==p.slug&&(x.trending||x.category==='trending')).slice(0,4);
  const img=p.image?`<img src="${p.image}" alt="${esc(p.image_alt)}" title="${esc(p.image_title)}">${ad('below_image')}`:'';
  const body=`<article><h1>${esc(p.title)}</h1><div class="meta">${catName(p.category)} · ${p.date.toDateString()}</div>${ad('below_title')}${img}${html}</article>
  ${related.length?`<h2>Related Posts</h2>${ad('related_click')}${related.map(card).join('')}`:''}
  ${trending.length?`<h2>Trending Posts</h2>${trending.map(card).join('')}`:''}${ad('extra_slot')}`;
  out(p.slug,layout({title:p.seo_title||p.title,desc:p.description,body,canon:'/'+p.slug+'/',social:1,image:p.image}));
}
posts.forEach(render);
const PER=10;
function list(items,base,title,desc,h1,extra){
  const total=Math.max(1,Math.ceil(items.length/PER));
  const href=n=>n===1?base+'/':`${base}/page/${n}/`;
  for(let i=1;i<=total;i++){
    const nav=total>1?`<p class="meta">${i>1?`<a href="${href(i-1)}">Newer posts</a> · `:''}Page ${i} of ${total}${i<total?` · <a href="${href(i+1)}">Older posts</a>`:''}</p>`:'';
    const body=`<h1>${h1}</h1>${items.slice((i-1)*PER,i*PER).map(card).join('')||'<p>No posts yet.</p>'}${nav}${extra||''}`;
    out(href(i).slice(1),layout({title:i>1?`${title} - Page ${i}`:title,desc,body,canon:href(i),social:base===''}));
  }
}
list(posts,'',SITE,'Latest viral news, entertainment, lifestyle and sports.','Latest',ad('extra_slot'));
cats.forEach(c=>list(posts.filter(p=>p.category===c.slug),'/category/'+c.slug,c.name+' - '+SITE,c.name+' posts',c.name));
Object.entries(pages).forEach(([k,p])=>out(slugOf(k),layout({title:p.title+' - '+SITE,desc:p.title,canon:'/'+slugOf(k)+'/',body:`<h1>${esc(p.title)}</h1>${marked.parse(p.body||'')}`})));

fs.cpSync('static','dist',{recursive:true});fs.cpSync('admin','dist/admin',{recursive:true});
fs.writeFileSync('dist/ads.txt',(ads.ads_txt||'')+'\n');
fs.writeFileSync('dist/sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${URL}/</loc></url>${posts.map(p=>`<url><loc>${URL}/${p.slug}/</loc></url>`).join('')}</urlset>`);
fs.writeFileSync('dist/robots.txt',`User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: ${URL}/sitemap.xml\n`);
console.log('Built',posts.length,'posts');
