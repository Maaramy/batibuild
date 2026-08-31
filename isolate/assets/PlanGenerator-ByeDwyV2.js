import{j as Y,r as vm}from"./vendor-ui-bxMfuv3z.js";import{a as Hn,r as bm,h as Rg,c as Cg}from"./vendor-core-CWZ9XUn2.js";import{c as nd,e as Pg,d as Dg,L as Mm,m as ym,I as Ig,B as of,C as Sm,k as Em,a as _a,l as Lg,n as Ng}from"./index-BTLEJKty.js";import{i as Fg,p as Ug}from"./projectTypes-DW1hcw0y.js";import{B as Tm}from"./badge-NxdnySsE.js";import{P as Og}from"./progress-8epDTmMw.js";import{T as Bg,a as kg,b as tp}from"./tabs-C2nxS8Z1.js";import{D as zg,a as Hg,c as Gg}from"./dialog-DYYPjsJ6.js";import{u as Vg}from"./use-page-seo-BbMSnO9e.js";import{E as wm,a as Wg}from"./jspdf.plugin.autotable-BtPSN7iZ.js";import{d as Xg}from"./pdfLogo-WnEx0KwT.js";import{A as Yg}from"./arrow-left-Cl5jJ6rl.js";import{S as Zg}from"./sparkles-ClZ-0Uk-.js";import{B as Kg}from"./building-2-DZw-n26h.js";import{R as Am}from"./ruler-CShfBacQ.js";import{L as Jg}from"./layers-BY9Nr_fx.js";import{C as Qg}from"./compass-syN89kVA.js";import{B as qg}from"./badge-check-Cz8kAs0S.js";import{D as jg}from"./download-jgHVtdBH.js";import{C as $g}from"./chevron-down-DQsolpYk.js";import{L as e0}from"./lightbulb-2jjyASKn.js";import"./x-CLrwUWqP.js";const t0=[["path",{d:"M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z",key:"lc1i9w"}],["path",{d:"m7 16.5-4.74-2.85",key:"1o9zyk"}],["path",{d:"m7 16.5 5-3",key:"va8pkn"}],["path",{d:"M7 16.5v5.17",key:"jnp8gn"}],["path",{d:"M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z",key:"8zsnat"}],["path",{d:"m17 16.5-5-3",key:"8arw3v"}],["path",{d:"m17 16.5 4.74-2.85",key:"8rfmw"}],["path",{d:"M17 16.5v5.17",key:"k6z78m"}],["path",{d:"M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z",key:"1xygjf"}],["path",{d:"M12 8 7.26 5.15",key:"1vbdud"}],["path",{d:"m12 8 4.74-2.85",key:"3rx089"}],["path",{d:"M12 13.5V8",key:"1io7kd"}]],n0=nd("boxes",t0);const i0=[["path",{d:"M15 3h6v6",key:"1q9fwt"}],["path",{d:"m21 3-7 7",key:"1l2asr"}],["path",{d:"m3 21 7-7",key:"tjx5ai"}],["path",{d:"M9 21H3v-6",key:"wtvkvv"}]],r0=nd("maximize-2",i0);const a0=[["path",{d:"M3 7V5a2 2 0 0 1 2-2h2",key:"aa7l1z"}],["path",{d:"M17 3h2a2 2 0 0 1 2 2v2",key:"4qcy5o"}],["path",{d:"M21 17v2a2 2 0 0 1-2 2h-2",key:"6vwrx8"}],["path",{d:"M7 21H5a2 2 0 0 1-2-2v-2",key:"ioqczr"}],["path",{d:"M7 12h10",key:"b7w52i"}]],Rm=nd("scan-line",a0);function s0(n){let e=n>>>0;return function(){e|=0,e=e+1831565813|0;let t=Math.imul(e^e>>>15,1|e);return t=t+Math.imul(t^t>>>7,61|t)^t,((t^t>>>14)>>>0)/4294967296}}const np=1e-6;function Cm(n){switch(n){case"local_commercial":case"bureau":case"residence_touristique":return"commercial";case"entrepot":return"logistics";case"cafe":case"restaurant":return"restoration";default:return"residential"}}function o0(n,e,t){const i=e,r=n.bedrooms&&n.bedrooms>0?n.bedrooms:Math.max(1,Math.min(6,Math.round(i/32))),c=n.bathrooms&&n.bathrooms>0?n.bathrooms:Math.max(1,Math.round(r/2)),u=n.kitchens&&n.kitchens>0?n.kitchens:1,d=n.livingRooms&&n.livingRooms>0?n.livingRooms:1,m=n.wcs&&n.wcs>0?n.wcs:Math.max(1,c),p=M=>({kind:"chambre",label:M===0?"Chambre principale":`Chambre ${M+1}`,target:M===0?16:13,min:8.5,priority:10-M,habitable:!0}),g=Array.from({length:t},()=>[]);let b=0;for(let M=0;t>1&&M<r;M++){const A=t-1-M%Math.max(1,t-1);g[Math.max(1,Math.min(t-1,A))].push(b++)}t===1&&(g[0]=Array.from({length:r},(M,A)=>A));const x=[];for(let M=0;M<t;M++){const A=[];if(M===0){A.push({kind:"sejour",label:d>1?"Séjour double":"Séjour",target:Math.max(24,i*.26),min:16,priority:20,habitable:!0,unique:!0});for(let C=0;C<u;C++)A.push({kind:"cuisine",label:C===0?"Cuisine":`Cuisine ${C+1}`,target:14,min:7,priority:15,habitable:!0});if(A.push({kind:"wc",label:"WC invités",target:2.5,min:1.5,priority:5}),t===1){for(const C of g[0])A.push(p(C));for(let C=0;C<c;C++)A.push({kind:"sdb",label:C===0?"Salle de bain":`SDB ${C+1}`,target:6.5,min:4,priority:9});for(let C=1;C<m;C++)A.push({kind:"wc",label:`WC ${C+1}`,target:2.5,min:1.5,priority:4})}}else{for(const C of g[M]??[])A.push(p(C));A.push({kind:"sdb",label:"Salle de bain",target:6.5,min:4,priority:12,unique:!0}),(g[M]?.length??0)>2&&A.push({kind:"wc",label:"WC étage",target:2.5,min:1.5,priority:4}),M===t-1&&t>2&&A.push({kind:"polyvalent",label:"Terrasse / buanderie",target:8,min:5,priority:6,habitable:!0})}x.push({level:M,items:A})}return x}function l0(n){const e=Math.max(1,Math.min(5,Math.floor(n/38))),t=[{kind:"reception",label:"Accueil / Réception",target:Math.max(12,n*.12),min:8,priority:18,habitable:!0,unique:!0},{kind:"openspace",label:"Espace de travail ouvert",target:Math.max(20,n*.34),min:14,priority:17,habitable:!0,unique:!0}];for(let i=0;i<e;i++)t.push({kind:"bureau",label:i===0?"Bureau direction":`Bureau ${i+1}`,target:13,min:8,priority:10,habitable:!0});return t.push({kind:"reunion",label:"Salle de réunion",target:16,min:9,priority:11,habitable:!0}),t.push({kind:"sanitaire",label:"Sanitaires",target:6,min:3.5,priority:6}),t.push({kind:"cuisine",label:"Cuisine personnel",target:8,min:5,priority:5}),t}function c0(n){const e=[{kind:"stockage",label:"Hall de stockage principal",target:Math.max(40,n*.58),min:30,priority:20,unique:!0},{kind:"logistique",label:"Zone chargement / logistique",target:Math.max(20,n*.18),min:14,priority:15}],t=Math.max(1,Math.min(3,Math.floor(n/120)));for(let i=0;i<t;i++)e.push({kind:"bureau",label:i===0?"Bureau exploitation":`Bureau ${i+1}`,target:13,min:8,priority:9,habitable:!0});return e.push({kind:"vestiaire",label:"Vestiaires",target:8,min:5,priority:6}),e.push({kind:"sanitaire",label:"Sanitaires",target:5,min:3,priority:6}),e}function u0(n,e){const t=e==="cafe"?.38:.35,i=.42,r=.08,c=.12,u=n*t,d=n*i,m=n*r,p=n*c,g=[];return g.push({kind:"salle_client",label:e==="cafe"?"Salle café":"Salle de restauration",target:u*.65,min:18,priority:20,habitable:!0,unique:!0}),g.push({kind:"comptoir",label:e==="cafe"?"Comptoir café":"Bar / Comptoir",target:u*.25,min:6,priority:18,habitable:!0,unique:!0}),g.push({kind:"attente",label:"Zone d'accueil",target:u*.1,min:4,priority:14,habitable:!0}),g.push({kind:"cuisine_pro",label:"Cuisine professionnelle",target:d*.4,min:12,priority:19,habitable:!0,unique:!0}),g.push({kind:"plonge",label:"Plonge",target:d*.12,min:4,priority:13}),g.push({kind:"chambre_froide",label:"Stockage / Frigos",target:d*.18,min:5,priority:12}),g.push({kind:"stockage",label:"Stockage sec",target:d*.12,min:4,priority:10}),g.push({kind:"vestiaire",label:"Vestiaires personnel",target:d*.1,min:4,priority:8}),g.push({kind:"couloir",label:"Couloir service",target:m,min:3,priority:7}),g.push({kind:"sanitaire",label:"Sanitaires Hommes",target:p*.35,min:3,priority:11}),g.push({kind:"sanitaire",label:"Sanitaires Femmes",target:p*.35,min:3,priority:11}),g.push({kind:"wc",label:"WC PMR",target:p*.3,min:2.5,priority:11}),g}function js(n,e){if(e.length===0)return[];if(e.length===1)return[{item:e[0],rect:{...n}}];const t=e.reduce((g,b)=>g+b.target,0),i=[...e].sort((g,b)=>b.target-g.target),r=[],c=[];let u=0,d=0;for(const g of i)u<=d?(r.push(g),u+=g.target):(c.push(g),d+=g.target);const m=Math.min(.85,Math.max(.15,u/t));if(n.w>=n.h){const g=Cn(Math.round(n.w*m*1e3)/1e3);return[...js({x:n.x,y:n.y,w:g,h:n.h},r),...js({x:Cn(n.x+g),y:n.y,w:Cn(n.w-g),h:n.h},c)]}const p=Cn(Math.round(n.h*m*1e3)/1e3);return[...js({x:n.x,y:n.y,w:n.w,h:p},r),...js({x:n.x,y:Cn(n.y+p),w:n.w,h:Cn(n.h-p)},c)]}function bh(n,e){let t=[...n];for(let c=0;c<50;c++){const u=t.reduce((b,x)=>b+x.target,0),d=e/u;if(t.reduce((b,x)=>x.target*d<b.target*d?x:b),!t.some(b=>b.target*d<b.min))break;const g=t.filter(b=>b.target*d<b.min).reduce((b,x)=>x.priority<b.priority?x:b);if(t.length<=2||g.priority>=18)break;t=t.filter(b=>b!==g)}const i=t.reduce((c,u)=>c+u.target,0),r=e/i;return t.map(c=>({...c,target:Math.max(c.min,c.target*r)}))}const Nr=.002;function h0(n,e,t){const i=n.rooms;for(const r of i){let c=null;for(const d of i){if(d===r)continue;const m=Math.abs(r.x+r.w-d.x)<Nr||Math.abs(d.x+d.w-r.x)<Nr,p=Math.abs(r.y+r.h-d.y)<Nr||Math.abs(d.y+d.h-r.y)<Nr;if(m){const g=Math.max(r.y,d.y),b=Math.min(r.y+r.h,d.y+d.h),x=b-g;x>=.9&&(!c||x>c.len)&&(c={side:Math.abs(d.x+d.w-r.x)<Nr?"W":"E",position:(g+b)/2-r.y,len:x})}if(p){const g=Math.max(r.x,d.x),b=Math.min(r.x+r.w,d.x+d.w),x=b-g;x>=.9&&(!c||x>c.len)&&(c={side:Math.abs(d.y+d.h-r.y)<Nr?"N":"S",position:(g+b)/2-r.x,len:x})}}const u=.9;c&&r.doors.push({wall:c.side,position:Math.max(u/2+.1,Math.min(c.len-u/2-.1,c.position)),width:u})}if(e){const r=["reception","sejour","hall","openspace"];let c;for(const d of r)if(c=i.find(m=>m.kind===d),c)break;c||(c=[...i].sort((d,m)=>m.area-d.area)[0]);const u=Math.max(.8,Math.min(c.w-.8,c.w*.5));c.doors.push({wall:"S",position:u,width:1.1,isEntry:!0})}for(const r of i){if(!(r.kind==="chambre"||r.kind==="sejour"||r.kind==="cuisine"||r.kind==="bureau"||r.kind==="openspace"||r.kind==="reunion"||r.kind==="reception"||r.kind==="polyvalent"))continue;const u=[{side:"N",exterior:Math.abs(r.y)<Nr,span:r.w,origin:r.x},{side:"S",exterior:Math.abs(r.y+r.h-n.width)<Nr,span:r.w,origin:r.x},{side:"W",exterior:Math.abs(r.x)<Nr,span:r.h,origin:r.y},{side:"E",exterior:Math.abs(r.x+r.w-n.length)<Nr,span:r.h,origin:r.y}];let d=0;for(const m of u){if(!m.exterior||d>=2||m.span<1.6)continue;const p=Math.min(1.4,m.span-.4);r.windows.push({wall:m.side,position:Math.max(.3,m.origin+m.span/2-p/2),width:p}),d++}}}function Mh(n,e,t,i,r,c){const u={level:n,length:t,width:i,rooms:[],area:t*i},d=e>1,m=Cn(Math.min(2.5,t*.32)),p=Cn(Math.min(4.2,i*.38)),g=d&&t>=4&&i>=3,b=()=>`L${n}-R${u.rooms.length}`,x=[];if(g){u.rooms.push(yh(b(),"escalier","Escalier",0,0,m,p)),x.push({x:m,y:0,w:t-m,h:p}),x.push({x:0,y:p,w:t,h:i-p});const M=x[0].w*x[0].h,A=x[1].w*x[1].h,C=M+A,T=[...r].sort((U,W)=>W.target-U.target),S=[],B=[];let G=0;for(const U of T)G<M/C*T.reduce((w,F)=>w+F.target,0)?(S.push(U),G+=U.target):B.push(U);const D=js(x[0],bh(S,M)),z=js(x[1],bh(B,A));for(const U of[...D,...z])u.rooms.push(yh(b(),U.item.kind,U.item.label,U.rect.x,U.rect.y,U.rect.w,U.rect.h,U.item.habitable))}else{const M=js({x:0,y:0,w:t,h:i},bh(r,t*i));for(const A of M)u.rooms.push(yh(b(),A.item.kind,A.item.label,A.rect.x,A.rect.y,A.rect.w,A.rect.h,A.item.habitable))}h0(u,n===0);for(const M of u.rooms)M.x=Cn(Math.max(0,M.x)),M.y=Cn(Math.max(0,M.y)),M.x+M.w>t&&(M.w=Cn(t-M.x)),M.y+M.h>i&&(M.h=Cn(i-M.y)),M.area=Cn(M.w*M.h);return u}function yh(n,e,t,i,r,c,u,d){return{id:n,kind:e,label:t,x:Cn(i),y:Cn(r),w:Cn(c),h:Cn(u),area:Cn(c*u),doors:[],windows:[]}}function Cn(n){return Math.round(n*1e3)/1e3}function f0(n,e){const t=[];let i=100;const r=.002;function c(T,S){return T.x+T.w>S.x+r&&S.x+S.w>T.x+r&&T.y+T.h>S.y+r&&S.y+S.h>T.y+r}const u=n.floors.length,d=e.surface/u,m=Math.abs(n.footprint.length*n.footprint.width-d)/d,p=m<=.06;p||t.push(`Emprise au sol écartée de ${(m*100).toFixed(1)} % de la cible`);let g=!0;for(const T of n.floors)for(let S=0;S<T.rooms.length;S++){for(let G=S+1;G<T.rooms.length;G++)c(T.rooms[S],T.rooms[G])&&(g=!1,t.push(`Chevauchement détecté (${T.rooms[S].label} / ${T.rooms[G].label}, niveau ${T.level+1})`));const B=T.rooms[S];(B.x<-r||B.y<-r||B.x+B.w>T.length+r||B.y+B.h>T.width+r)&&(g=!1,t.push(`Pièce hors emprise : ${B.label}`))}g||(i-=20);let b=!0;for(const T of n.floors){const S=T.rooms.reduce((B,G)=>B+G.area,0);Math.abs(S-T.area)/T.area>.02&&(b=!1,t.push(`Somme des surfaces ≠ surface du niveau ${T.level+1}`))}b||(i-=10);const x=new Set(["couloir","escalier"]);let M=!0;for(const T of n.floors){for(const S of T.rooms)x.has(S.kind)||S.doors.length===0&&(M=!1,t.push(`Pièce sans accès : ${S.label} (niveau ${T.level+1})`));T.level===0&&!T.rooms.some(S=>S.doors.some(B=>B.isEntry))&&(M=!1,t.push("Porte d'entrée manquante au rez-de-chaussée"))}M||(i-=12);let A=!0;if(u>1){const T=n.floors[0],S=T.rooms.find(B=>B.kind==="escalier");for(const B of n.floors.slice(1)){(Math.abs(B.length-T.length)>np||Math.abs(B.width-T.width)>np)&&(A=!1,t.push(`Emprise discontinue au niveau ${B.level+1}`));const G=B.rooms.find(D=>D.kind==="escalier");!G||!S?(A=!1,t.push(`Gaine d'escalier absente au niveau ${B.level+1}`)):(Math.abs(G.x-S.x)>.01||Math.abs(G.y-S.y)>.01||Math.abs(G.w-S.w)>.01||Math.abs(G.h-S.h)>.01)&&(A=!1,t.push(`Gaine d'escalier désalignée au niveau ${B.level+1}`))}}A||(i-=15);const C=["chambre","sejour","cuisine","bureau","openspace","reception"];for(const T of n.floors)for(const S of T.rooms)C.includes(S.kind)&&S.windows.length===0&&(i-=5,t.push(`Pièce habitable sans fenêtre : ${S.label} (niveau ${T.level+1})`));return{dimensionsOk:p,noOverlap:g,areasOk:b,circulationOk:M,structureOk:A,score:Math.max(40,Math.min(100,Math.round(i))),issues:[...new Set(t)].slice(0,8)}}function d0(n,e,t,i){const r=Cm(e.category),c=t.footprint.length/t.footprint.width,u=c>1.5?"un volume allongé qui privilégie les façades percées et la lumière traversante":c>1.15?"un volume rectangulaire efficace aux circulations resserrées":"un volume quasi carré qui limite les déperditions et rationalise la structure",d=e.category==="cafe"||e.category==="restaurant",m=r==="residential"?"Le rez-de-chaussée regroupe les espaces de vie ouverts sur l'entrée, tandis que les chambres occupent les niveaux supérieurs autour de la cage d'escalier.":r==="commercial"?"L'accueil filtre naturellement les flux vers l'espace de travail ouvert et les bureaux fermés, avec les salles de réunion en profondeur.":d?"La zone client "+(e.category==="cafe"?"salle café + comptoir":"salle de restauration + bar")+" occupe la façade principale, séparée de la cuisine professionnelle par un couloir de service respectant la marche en avant. Les sanitaires H/F/PMR sont accessibles depuis la salle client sans croiser la zone de production.":"Le hall de stockage occupe le cœur du bâtiment, desservi directement par la zone logistique et les locaux d'exploitation.",p=["absence totale de chevauchement entre pièces","surfaces ventilées conformes aux minima d'habitabilité","continuité structurelle assurée par une gaine d'escalier alignée sur tous les niveaux","éclairement naturel maximalisé par un double exposition des pièces principales","respect strict de la marche en avant entre zones de production et de service","circulation client séparée des flux de service et livraison","conformité ERP avec sorties de secours et largeurs minimales de 1,20 m","sanitaires accessibles PMR sans croisement avec la zone de cuisine"],g=new Set;for(;g.size<2&&g.size<p.length;)g.add(p[Math.floor(i()*p.length)]);const b=[...g].join(", "),x=t.floors.length>1?`${t.floors.length} niveaux d'une emprise de ${t.footprint.length.toFixed(1)} × ${t.footprint.width.toFixed(1)} m`:`une emprise unique de ${t.footprint.length.toFixed(1)} × ${t.footprint.width.toFixed(1)} m`;return`Variante « ${n} » : ${x}. ${u.charAt(0).toUpperCase()+u.slice(1)}. ${m} Points forts : ${b}.`}const lf=[{style:"Optimisée",ratio:1},{style:"Traversante",ratio:1.22},{style:"Compacte",ratio:.86},{style:"Parallélépipédique",ratio:1.38},{style:"Horizontale",ratio:1.62},{style:"Carrée pure",ratio:1.04},{style:"Allongée",ratio:1.82},{style:"Équilibrée",ratio:1.14},{style:"Modulaire",ratio:1.3},{style:"Rationnelle",ratio:1.48}],p0=lf.length;function m0(n){const e=Math.max(18,n.surface||90),t=Math.max(1,Math.min(4,Math.round(n.floors||1))),i=Cm(n.category),r=e/t,c=1337+n.category.length*31+Math.round(e)*17+t*101,u=[];for(let d=0;d<lf.length;d++){const{style:m,ratio:p}=lf[d],g=s0(c+d*977);let b=Math.sqrt(r*p),x=Math.sqrt(r/p);b=Math.min(Math.max(b,5),60),x=Math.min(Math.max(x,4),40),b=Cn(b),x=Cn(x);const M=[];if(i==="residential"){const C=o0(n,r,t);for(const T of C)M.push(Mh(T.level,t,b,x,T.items))}else if(i==="restoration"){const C=n.category==="restaurant",T=u0(r,C?"restaurant":"cafe");for(let S=0;S<t;S++)M.push(Mh(S,t,b,x,T.map(B=>({...B}))))}else{const C=i==="commercial"?l0(r):c0(r);for(let T=0;T<t;T++)M.push(Mh(T,t,b,x,C.map(S=>({...S}))))}const A={id:`plan-v${d+1}`,name:`Variante ${d+1} · ${m}`,style:m,footprint:{length:b,width:x},floors:M,totalArea:Cn(M.reduce((C,T)=>C+T.rooms.reduce((S,B)=>S+B.area,0),0)),conceptNote:"",validation:{dimensionsOk:!0,noOverlap:!0,areasOk:!0,circulationOk:!0,structureOk:!0,score:100,issues:[]}};A.conceptNote=d0(m,n,A,g),A.validation=f0(A,{...n,surface:e}),u.push(A)}return u}function Pm(n){const e=n.rooms.reduce((t,i)=>t+i.area,0)||1;return n.rooms.map(t=>({label:t.label,kind:t.kind,area:t.area,sharePct:Math.round(t.area/e*1e3)/10})).sort((t,i)=>i.area-t.area)}const to=(n,e={})=>({t:"r",...n,...e}),bi=(n,e,t,i={})=>({t:"c",x:n,y:e,r:t,...i}),di=(n,e,t,i)=>({t:"l",x1:n,y1:e,x2:t,y2:i});function Qi(n,e){return e==="N"||e==="S"?n.w:n.h}function Dm(n){if(!n.length)return[];const e=[...n].sort((i,r)=>i.a-r.a),t=[{...e[0]}];for(const i of e.slice(1)){const r=t[t.length-1];i.a<=r.b?r.b=Math.max(r.b,i.b):t.push({...i})}return t}function ip(n,e,t){const i=[];for(const r of n.doors){if(r.wall!==e)continue;const c=t.swing===!1?.08:r.width*1.05;i.push({a:r.position-.12,b:r.position+r.width+c})}if(t.win)for(const r of n.windows)r.wall===e&&i.push({a:r.position-.08,b:r.position+r.width+.08});return i}function ii(n,e,t,i={}){const c=(Dm(ip(n,e,i)).length?g0(Qi(n,e),ip(n,e,i)):[{a:0,b:Qi(n,e)}]).filter(u=>u.b-u.a>=t);return c.length?c.reduce((u,d)=>d.b-d.a>u.b-u.a?d:u):null}function g0(n,e){const t=Dm(e.filter(c=>c.a<n&&c.b>0)),i=[];let r=0;for(const c of t)c.a>r&&i.push({a:r,b:Math.min(c.a,n)}),r=Math.max(r,c.b);return r<n&&i.push({a:r,b:n}),i.filter(c=>c.b-c.a>.05)}function pn(n,e,t,i,r,c){const u=e==="N"||e==="S",d=u?n.x+t-c/2:e==="W"?n.x+i:n.x+n.w-i-r,m=u?e==="N"?n.y+i:n.y+n.h-i-r:n.y+t-c/2;return{x:d,y:m,w:u?c:r,h:u?r:c}}function id(n,e){return e.x>=n.x-.01&&e.y>=n.y-.01&&e.x+e.w<=n.x+n.w+.01&&e.y+e.h<=n.y+n.h+.01}function jt(n,e,t,i={}){return t.w<.15||t.h<.15||!id(n,t)?null:(e.push(to(t,i)),t)}function va(n){return["N","S","W","E"].sort((e,t)=>Qi(n,t)-Qi(n,e))}function bc(n,e,t){return n.a<t-n.b?n.a+e/2:n.b-e/2}function _0(n,e){const t=Math.min(n.w,n.h)>=2.9,i=t?1.6:1,r=t?2:1.9;let c=null,u=null;for(const d of va(n)){const m=ii(n,d,i+.9);if(!m)continue;const p=(m.a+m.b)/2,g=pn(n,d,p,.05,i,r);if(!jt(n,e,g,{m:"fabric",ht:.5,rx:.06}))continue;c=d,u=g;const b=d==="N"||d==="S",x=.32,M=.05+.06;if(t)for(const A of[-1,1]){const C=p+A*(i/4+.01);jt(n,e,pn(n,d,C,M,x,i/2-.08),{m:"white",ht:.18,rx:.07})}else jt(n,e,pn(n,d,p,M,x,i-.16),{m:"white",ht:.18,rx:.07});if(u&&b){const A=d==="N"?u.y+r*.34:u.y+u.h-r*.34;e.push(di(u.x+.04,A,u.x+u.w-.04,A))}else if(u){const A=d==="W"?u.x+r*.34:u.x+u.w-r*.34;e.push(di(A,u.y+.04,A,u.y+u.h-.04))}for(const A of[-1,1]){const C=p+A*(i/2+.26);jt(n,e,pn(n,d,C,.05,.38,.38),{m:"wood",ht:.5})}break}if(c){for(const d of va(n)){if(d===c)continue;const m=ii(n,d,1.1,{win:!0});if(!m)continue;const p=Math.min(m.b-m.a-.12,2.2),g=pn(n,d,(m.a+m.b)/2,.03,.62,p);if(jt(n,e,g,{m:"wood",ht:2.1})){if(d==="N"||d==="S"){const b=g.y+g.h/2;e.push(di(g.x+.08,b,g.x+g.w-.08,b))}else e.push(di(g.x+g.w/2,g.y+.08,g.x+g.w/2,g.y+g.h-.08));break}}if(n.area>=13)for(const d of va(n)){if(d===c)continue;const m=ii(n,d,1.45,{win:!0});if(!m)continue;const p=pn(n,d,(m.a+m.b)/2,.04,.55,1.3);if(!jt(n,e,p,{m:"wood",ht:.73}))continue;const g=d==="N"||d==="S",b=(m.a+m.b)/2,x=g?n.x+b:d==="W"?p.x+p.w+.32:p.x-.32,M=g?d==="N"?p.y+p.h+.32:p.y-.32:n.y+b;e.push(bi(x,M,.21,{m:"fabric",ht:.45}));break}}}function x0(n,e){const i=va(n)[0],r=ii(n,i,1.6);if(!r)return;const c=r.b-r.a-.2,u=Math.min(Math.max(c*.55,1.6),3),d=(r.a+r.b)/2,m=pn(n,i,d,.05,.88,u);if(!jt(n,e,m,{m:"fabric",ht:.75,rx:.09}))return;if(u>=2){const b=i==="N"||i==="S";for(const x of[-1,1]){const M=d+x*(u/2-.11);jt(n,e,pn(n,i,M,.05,.88,.2),{m:"fabric",ht:.55,rx:.06})}if(b){const x=i==="N"?m.y+.18:m.y+m.h-.18;e.push(di(m.x+.22,x,m.x+m.w-.22,x))}else{const x=i==="W"?m.x+.18:m.x+m.w-.18;e.push(di(x,m.y+.22,x,m.y+m.h-.22))}}jt(n,e,pn(n,i,d,1,Math.min(1.35,n.h/3),u+.5),{dash:!0,noFill:!0,flat:!0}),jt(n,e,pn(n,i,d,.05+.88+.38,.55,Math.min(u*.65,1.15)),{m:"wood",ht:.4,rx:.04});const p=i==="N"?"S":i==="S"?"N":i==="W"?"E":"W",g=ii(n,p,1.2,{win:!0})??ii(n,p,1.2);if(g&&jt(n,e,pn(n,p,(g.a+g.b)/2,.03,.38,Math.min(g.b-g.a-.12,1.8)),{m:"wood",ht:.5}),n.area>=20){const b=i==="N"||i==="S",x=b?n.x+r.a+u+.55:i==="W"?n.x+1.35:n.x+n.w-1.35,M=b?i==="N"?n.y+1.75:n.y+n.h-1.75:n.y+r.a+u+.55;e.push(bi(x,M,.38,{m:"fabric",ht:.7}))}}function v0(n,e){const r=va(n)[0],c=r==="N"||r==="S"?["W","E"]:["N","S"],u=D=>n.doors.filter(z=>z.wall===D).length,d=[...c].sort((D,z)=>u(D)-u(z))[0],m=ii(n,r,1.4);if(!m)return;const p=r==="N"||r==="S"?d==="W":d==="N",g=m.b-m.a-.04,b=pn(n,r,(m.a+m.b)/2,.02,.6,g);if(!jt(n,e,b,{m:"white",ht:.92}))return;const x=p?m.b-g*.3:m.a+g*.3,M=pn(n,r,x,.02+(.6-.48)/2,.48,.82);jt(n,e,M,{m:"metal",ht:.92,rx:.05}),M.w>=M.h?e.push(di(M.x+M.w/2,M.y+.05,M.x+M.w/2,M.y+M.h-.05)):e.push(di(M.x+.05,M.y+M.h/2,M.x+M.w-.05,M.y+M.h/2));const A=p?m.a+.38:m.b-.38,C=pn(n,r,A,.02,.66,.72);jt(n,e,C,{m:"metal",ht:1.85}),Qi(n,d);const T=.6+.08,S=G(d,r)?T:.06,B=ii(n,d,.8);if(B){const D=Math.max(S,B.a+.04),z=Math.min(1.7,B.b-.04-D);if(z>=.8){const U=D+z/2,W=pn(n,d,U,.02,.6,z);jt(n,e,W,{m:"white",ht:.92});const w=pn(n,d,U,.02+(.6-.52)/2,.52,.52);jt(n,e,w,{m:"metal",ht:.92});const F=w.x+w.w/2,Z=w.y+w.h/2;for(const X of[-.125,.125])for(const ne of[-.125,.125])e.push(bi(F+X,Z+ne,.082,{flat:!0,noFill:!0}))}}function G(D,z){return D==="N"||D==="S"?z==="W":z==="N"}if(n.area>=12){const U=r==="W"?1.15:r==="E"?-1.15:0,W=r==="N"?.6+.55:r==="S"?-1.15:0,w=n.x+n.w/2+U,F=n.y+n.h/2+W,Z={x:w-1.15/2,y:F-.75/2,w:1.15,h:.75};id(n,Z)&&(e.push(to(Z,{m:"wood",ht:.74,rx:.04})),e.push(bi(w-1.15/2-.28,F,.2,{m:"wood",ht:.45})),e.push(bi(w+1.15/2+.28,F,.2,{m:"wood",ht:.45})))}}function b0(n,e){const t=va(n),i=new Set,r=Math.min(n.w,n.h)>=1.55&&Math.max(n.w,n.h)>=2.35;let c=!1;if(r)for(const u of t){const d=ii(n,u,1.75);if(!d)continue;const m=bc(d,1.72,Qi(n,u)),p=pn(n,u,m,.03,.74,1.68);if(jt(n,e,p,{m:"white",ht:.56,rx:.12})){jt(n,e,{x:p.x+.11,y:p.y+.11,w:p.w-.22,h:p.h-.22},{m:"white",ht:.5,rx:.14}),e.push(bi(p.x+p.w/2,p.y+p.h/2,.045,{flat:!0,noFill:!0})),i.add(u),c=!0;break}}if(!c)for(const u of t){const d=ii(n,u,.95);if(!d)continue;const m=bc(d,.9,Qi(n,u)),p=pn(n,u,m,.03,.88,.88);if(jt(n,e,p,{m:"white",ht:.12,rx:.05})){e.push(di(p.x,p.y,p.x+p.w,p.y+p.h)),e.push(di(p.x+p.w,p.y,p.x,p.y+p.h)),e.push(bi(p.x+p.w/2,p.y+p.h/2,.05,{flat:!0,noFill:!0})),i.add(u);break}}for(const u of t){if(i.has(u))continue;const d=ii(n,u,.62,{win:!0});if(!d)continue;const m=pn(n,u,(d.a+d.b)/2,.03,.44,.58);if(jt(n,e,m,{m:"white",ht:.85,rx:.1})){e.push(bi(m.x+m.w/2,m.y+m.h/2,.035,{flat:!0,noFill:!0})),i.add(u);break}}for(const u of t){if(i.has(u))continue;const d=ii(n,u,.85);if(!d)continue;const m=bc(d,.42,Qi(n,u)),p=pn(n,u,m,.02,.2,.42);if(!jt(n,e,p,{m:"white",ht:.75}))continue;const b=u==="N"||u==="S"?{x:p.x+p.w/2-.19,y:u==="N"?p.y+p.h:p.y-.5,w:.38,h:.5}:{x:u==="W"?p.x+p.h:p.x-.5,y:p.y+p.h/2-.19,w:.5,h:.38};jt(n,e,b,{m:"white",ht:.4,rx:.17});break}}function M0(n,e){y0(n,e)}function y0(n,e){const t=va(n);for(const i of t){const r=ii(n,i,.85);if(!r)continue;const c=bc(r,.42,Qi(n,i)),u=pn(n,i,c,.02,.2,.42);if(!jt(n,e,u,{m:"white",ht:.75}))continue;const m=i==="N"||i==="S"?{x:u.x+u.w/2-.19,y:i==="N"?u.y+u.h:u.y-.5,w:.38,h:.5}:{x:i==="W"?u.x+u.h:u.x-.5,y:u.y+u.h/2-.19,w:.5,h:.38};jt(n,e,m,{m:"white",ht:.4,rx:.17});break}if(n.area>=2)for(const i of t){const r=ii(n,i,.5);if(r){jt(n,e,pn(n,i,(r.a+r.b)/2,.03,.32,.42),{m:"white",ht:.8,rx:.08});break}}}function S0(n,e){const t=va(n);for(const i of t){const r=ii(n,i,1.5);if(!r)continue;const c=(r.a+r.b)/2,u=pn(n,i,c,.04,.62,1.4);if(!jt(n,e,u,{m:"wood",ht:.73}))continue;const d=i==="N"||i==="S",m=d?n.x+c:i==="W"?u.x+u.w+.33:u.x-.33,p=d?i==="N"?u.y+u.h+.33:u.y-.33:n.y+c;e.push(bi(m,p,.22,{m:"fabric",ht:.46})),jt(n,e,pn(n,i,c,.14,.06,.6),{m:"metal",ht:.42});break}for(const i of t){const r=ii(n,i,.8,{win:!0});if(r){jt(n,e,pn(n,i,(r.a+r.b)/2,.03,.3,Math.min(r.b-r.a-.12,1.8)),{m:"wood",ht:1.9});break}}}function E0(n,e){const t=n.w>=n.h,i=t?n.w:n.h,r=t?n.h:n.w,c=r>=5.2?2:1,u=Math.min(4.4,i-.7),d=Math.min(1.78,r/c-.55);if(!(u<2.6||d<1.2))for(let m=0;m<c;m++){const p=n.y+r*(m+1)/(c+1),g=n.x+i/2,b=t?{x:g-u/2,y:p-d/2,w:u,h:d}:{x:p-d/2,y:g-u/2,w:d,h:u};e.push(to(b,{m:"metal",ht:.85,rx:.4})),t?(e.push(di(b.x+u*.24,b.y+.08,b.x+u*.24,b.y+b.h-.08)),e.push(di(b.x+u*.76,b.y+.08,b.x+u*.76,b.y+b.h-.08))):(e.push(di(b.x+.08,b.y+u*.24,b.x+b.w-.08,b.y+u*.24)),e.push(di(b.x+.08,b.y+u*.76,b.x+b.w-.08,b.y+u*.76)))}}function T0(n,e){const i=va(n)[0],r=ii(n,i,2.2);if(r){const c=bc(r,2.2,Qi(n,i)),u=pn(n,i,c,.03,.65,2.2);jt(n,e,u,{m:"wood",ht:1.05});const m=i==="N"||i==="S"?{x:c>Qi(n,i)/2?u.x-.62:u.x+u.w,y:i==="N"?u.y:u.y+u.h-.62,w:.62,h:.62}:{x:i==="W"?u.x:u.x+u.w-.62,y:c>Qi(n,i)/2?u.y-.62:u.y+u.h,w:.62,h:.62};jt(n,e,m,{m:"wood",ht:1.05})}for(let c=0;c<3;c++){const u=n.x+n.w/2+(c-1)*.72,d=i==="N"?n.y+n.h-.75:n.y+.75,m=i==="W"?n.x+n.w-.75:i==="E"?n.x+.75:u,p=i==="N"||i==="S"?d:n.y+n.h/2+(c-1)*.72;m>n.x+.3&&p>n.y+.3&&e.push(bi(m,p,.25,{m:"fabric",ht:.45}))}}function w0(n,e){const t=Math.max(1,Math.floor((n.w-.7)/1.75)),i=Math.max(1,Math.floor((n.h-.9)/1.9)),r=Math.min(t*i,10),c=n.w/t,u=n.h/i;let d=0;for(let m=0;m<i&&d<r;m++)for(let p=0;p<t&&d<r;p++){const g=n.x+c*(p+.5),b=n.y+u*(m+.5),x={x:g-.68,y:b-.5,w:1.36,h:.66};e.push(to(x,{m:"wood",ht:.73})),e.push(bi(g,b+.5+.22,.2,{m:"fabric",ht:.45})),e.push(to({x:g-.3,y:b-.44,w:.6,h:.06},{m:"metal",ht:.42})),d++}}function A0(n,e){const t=Math.min(n.w*.52,3.2),i=Math.min(n.h*.36,1.25),r=n.x+n.w/2,c=n.y+n.h/2;e.push(to({x:r-t/2,y:c-i/2,w:t,h:i},{m:"wood",ht:.74,rx:.08}));const u=Math.min(Math.floor(t/.78),4);for(let d=0;d<u;d++){const m=r-t/2+t*(d+.5)/u;e.push(bi(m,c-i/2-.32,.21,{m:"fabric",ht:.45})),e.push(bi(m,c+i/2+.32,.21,{m:"fabric",ht:.45}))}t>2&&(e.push(bi(r-t/2-.32,c,.21,{m:"fabric",ht:.45})),e.push(bi(r+t/2+.32,c,.21,{m:"fabric",ht:.45})))}function R0(n,e){const t=n.w>=n.h,i=t?n.w:n.h,r=t?n.h:n.w,c=1.05,d=Math.min(Math.floor((r-.35)/(c+1.25))+1,4);if(d<1)return;const m=Math.min(i-.5,6);for(let p=0;p<d;p++){const g=r*(p+.85)/(d+.7),b=t?{x:n.x+(i-m)/2,y:n.y+g-c/2,w:m,h:c}:{x:n.x+g-c/2,y:n.y+(i-m)/2,w:c,h:m};id(n,b)&&(e.push(to(b,{m:"metal",ht:2})),t?e.push(di(b.x+.1,b.y+c/2,b.x+b.w-.1,b.y+c/2)):e.push(di(b.x+c/2,b.y+.1,b.x+c/2,b.y+b.h-.1)))}}function Im(n){const e=[];switch(n.kind){case"chambre":_0(n,e);break;case"sejour":x0(n,e);break;case"cuisine":v0(n,e);break;case"sdb":case"sanitaire":b0(n,e);break;case"wc":M0(n,e);break;case"bureau":S0(n,e);break;case"garage":E0(n,e);break;case"reception":T0(n,e);break;case"openspace":w0(n,e);break;case"reunion":A0(n,e);break;case"stockage":case"logistique":R0(n,e);break}return e}const Sh="#44403c",rp={wood:"#faf3e2",fabric:"#eef2fb",white:"#ffffff",metal:"#eef1f4"};function C0({plan:n,S:e}){return Y.jsx("g",{children:n.rooms.map(t=>Im(t).map((i,r)=>Y.jsx(P0,{p:i,S:e},`${t.id}-f${r}`)))})}function P0({p:n,S:e}){switch(n.t){case"r":return Y.jsx("rect",{x:n.x*e,y:n.y*e,width:n.w*e,height:n.h*e,rx:(n.rx??0)*e,fill:n.noFill?"none":rp[n.m??"wood"],stroke:Sh,strokeWidth:n.dash?.7:.8,strokeDasharray:n.dash?"3 2.5":void 0,strokeLinejoin:"round"});case"c":return Y.jsx("circle",{cx:n.x*e,cy:n.y*e,r:n.r*e,fill:n.noFill?"none":rp[n.m??"wood"],stroke:Sh,strokeWidth:.7});case"l":return Y.jsx("line",{x1:n.x1*e,y1:n.y1*e,x2:n.x2*e,y2:n.y2*e,stroke:Sh,strokeWidth:.6})}}const es="#1c1917",Mc="#fdfdfb",D0="#e7e5e4",ol="#78716c",ap={sejour:"#f59e0b",cuisine:"#ef4444",chambre:"#3b82f6",sdb:"#06b6d4",wc:"#6366f1",couloir:"#a1a1aa",escalier:"#c026d3",bureau:"#22c55e",garage:"#6b7280",reception:"#ca8a04",openspace:"#10b981",reunion:"#ec4899",sanitaire:"#06b6d4",hall:"#a1a1aa",stockage:"#f97316",logistique:"#ea580c",vestiaire:"#8b5cf6",polyvalent:"#94a3b8"};function cf({plan:n}){const e=Hn.useId(),t=Hn.useId(),i=Hn.useMemo(()=>Math.max(14,Math.min(44,640/n.length)),[n.length]),r=n.length*i,c=n.width*i,u=46,d=Math.max(4.5,.2*i),m=Math.max(2.5,.08*i),p=Hn.useMemo(()=>n.rooms,[n]);return Y.jsxs("svg",{viewBox:`${-u} ${-u} ${r+u*2} ${c+u*2}`,className:"w-full h-auto select-none",role:"img","aria-label":`Plan 2D — ${n.rooms.length} pièces`,style:{fontFamily:"inherit"},children:[Y.jsx("rect",{x:-u/2,y:-u/2,width:r+u,height:c+u,rx:3,fill:Mc}),Y.jsx("clipPath",{id:e,children:Y.jsx("rect",{x:0,y:0,width:r,height:c})}),Y.jsx("pattern",{id:t,width:i,height:i,patternUnits:"userSpaceOnUse",children:Y.jsx("path",{d:`M ${i} 0 L 0 0 0 ${i}`,fill:"none",stroke:D0,strokeWidth:.6})}),Y.jsx("rect",{x:0,y:0,width:r,height:c,fill:`url(#${t})`}),Y.jsxs("g",{clipPath:`url(#${e})`,children:[p.map(g=>Y.jsx("rect",{x:g.x*i,y:g.y*i,width:g.w*i,height:g.h*i,fill:ap[g.kind]??ap.polyvalent,opacity:.13},`f-${g.id}`)),p.filter(g=>g.kind==="escalier").map(g=>{const b=g.x*i,x=g.y*i,M=g.w*i,A=g.h*i,C=Math.max(4,Math.floor((g.w>g.h?M:A)/7)),T=M>=A;return Y.jsxs("g",{stroke:"#a855f7",strokeWidth:1,opacity:.65,children:[Array.from({length:C-1},(S,B)=>{const G=(B+1)/C;return T?Y.jsx("line",{x1:b+M*G,y1:x,x2:b+M*G,y2:x+A},B):Y.jsx("line",{x1:b,y1:x+A*G,x2:b+M,y2:x+A*G},B)}),Y.jsx("line",{x1:b+M*.15,y1:x+A*.75,x2:b+M*.85,y2:x+A*.25,strokeWidth:1.2}),Y.jsx("path",{d:`M ${b+M*.85} ${x+A*.25} l -5 1 l 3 4 z`,fill:"#a855f7",stroke:"none"})]},`st-${g.id}`)})]}),Y.jsx("g",{clipPath:`url(#${e})`,children:Y.jsx(C0,{plan:n,S:i})}),Y.jsx("g",{clipPath:`url(#${e})`,children:p.map(g=>Y.jsx("rect",{x:g.x*i,y:g.y*i,width:g.w*i,height:g.h*i,fill:"none",stroke:es,strokeWidth:m},`w-${g.id}`))}),Y.jsx("rect",{x:0,y:0,width:r,height:c,fill:"none",stroke:es,strokeWidth:d}),Y.jsx("g",{clipPath:`url(#${e})`,children:p.map(g=>{const b=g.x*i,x=g.y*i,M=g.w*i,A=g.h*i;return Y.jsxs("g",{children:[g.windows.map((C,T)=>Y.jsx(I0,{wall:C.wall,p1:(C.wall==="N"||C.wall==="S"?g.x+C.position:g.y+C.position)*i,len:C.width*i,line:C.wall==="N"?x:C.wall==="S"?x+A:C.wall==="W"?b:b+M,band:sp(C.wall==="N"?g.y:C.wall==="S"?g.y+g.h-n.width:C.wall==="W"?g.x:g.x+g.w-n.length)?d:m,inward:C.wall==="N"?1:C.wall==="S"?-1:C.wall==="W"?1:-1,vertical:C.wall==="W"||C.wall==="E"},`wi-${T}`)),g.doors.map((C,T)=>Y.jsx(L0,{wall:C.wall,p1:(C.wall==="N"||C.wall==="S"?g.x+C.position:g.y+C.position)*i,len:C.width*i,line:C.wall==="N"?x:C.wall==="S"?x+A:C.wall==="W"?b:b+M,band:sp(C.wall==="N"?g.y:C.wall==="S"?g.y+g.h-n.width:C.wall==="W"?g.x:g.x+g.w-n.length)?d:m,inward:C.wall==="N"?1:C.wall==="S"?-1:C.wall==="W"?1:-1,vertical:C.wall==="W"||C.wall==="E",isEntry:!!C.isEntry},`do-${T}`))]},`o-${g.id}`)})}),Y.jsx("g",{clipPath:`url(#${e})`,children:p.map(g=>{const b=(g.x+g.w/2)*i,x=(g.y+g.h/2)*i,M=g.w*i>58&&g.h*i>36,A=g.w*i>34&&g.h*i>22,C=Math.max(7.5,Math.min(11,i*.32));return A?Y.jsxs("g",{textAnchor:"middle",children:[Y.jsx("text",{x:b,y:M?x-2:x+3,fontSize:C,fontWeight:700,letterSpacing:.8,fill:"#292524",children:g.label.toUpperCase()}),M&&Y.jsxs(Y.Fragment,{children:[Y.jsxs("text",{x:b,y:x+C+4,fontSize:C-1.5,fill:"#57534e",children:[g.area.toFixed(2)," m²"]}),g.w*i>86&&g.h*i>52&&Y.jsxs("text",{x:b,y:x+C+15,fontSize:C-2.5,fill:"#79716b",children:[g.w.toFixed(2)," × ",g.h.toFixed(2)," m"]})]})]},`l-${g.id}`):null})}),Y.jsx(op,{from:0,to:r,at:-d/2-14,label:`${n.length.toFixed(2)} m`}),Y.jsx(op,{vertical:!0,from:0,to:c,at:-d/2-14,label:`${n.width.toFixed(2)} m`}),Y.jsx(N0,{cx:r+u*.55,cy:-u*.45,r:11}),p.map(g=>g.doors.filter(b=>b.isEntry).map((b,x)=>{const M=(b.wall==="N"||b.wall==="S"?g.x+b.position+b.width/2:b.wall==="W"?g.x:g.x+g.w)*i,A=(b.wall==="N"?g.y:b.wall==="S"?g.y+g.h:g.y+b.position+b.width/2)*i;return Y.jsxs("g",{children:[Y.jsx("line",{x1:M,y1:A+16,x2:M,y2:A+5,stroke:es,strokeWidth:1.2}),Y.jsx("path",{d:`M ${M} ${A+3} l -3 6 l 6 0 z`,fill:es}),Y.jsx("text",{x:M,y:A+26,textAnchor:"middle",fontSize:7.5,fontWeight:600,letterSpacing:1,fill:ol,children:"ENTRÉE"})]},`e-${g.id}-${x}`)}))]})}function sp(n){return Math.abs(n)<.01}function I0({wall:n,p1:e,len:t,line:i,band:r,inward:c,vertical:u}){const d=r/2+1.5,m=u?Y.jsx("rect",{x:i-d,y:e-1,width:d*2,height:t+2,fill:Mc}):Y.jsx("rect",{x:e-1,y:i-d,width:t+2,height:d*2,fill:Mc}),g=[-r/4,0,r/4].map((b,x)=>u?Y.jsx("line",{x1:i+b,y1:e,x2:i+b,y2:e+t,stroke:es,strokeWidth:.9},x):Y.jsx("line",{x1:e,y1:i+b,x2:e+t,y2:i+b,stroke:es,strokeWidth:.9},x));return Y.jsxs("g",{children:[m,g]})}function L0({p1:n,len:e,line:t,band:i,inward:r,vertical:c,isEntry:u}){const d=i/2+1.5,m=c?Y.jsx("rect",{x:t-d,y:n-1,width:d*2,height:e+2,fill:Mc}):Y.jsx("rect",{x:n-1,y:t-d,width:e+2,height:d*2,fill:Mc}),p=c?t:n,g=c?n:t,b=c?t+r*e:n+e,x=c?n+e:t+r*e,M=c?t:n+e,A=c?n+e:t+r*e,C=r>0?0:1;return Y.jsxs("g",{children:[m,Y.jsx("line",{x1:p,y1:g,x2:b,y2:x,stroke:u?"#15803d":es,strokeWidth:1.3}),Y.jsx("path",{d:`M ${b} ${x} A ${e} ${e} 0 0 ${C} ${M} ${A}`,fill:"none",stroke:u?"#15803d":ol,strokeWidth:.9,strokeDasharray:u?void 0:"3 2.5"}),Y.jsx("line",{x1:c?t:n,y1:c?n:t,x2:c?t:n+e,y2:c?n+e:t,stroke:u?"#15803d":"#d6d3d1",strokeWidth:Math.max(1,i*.5)})]})}function op({from:n,to:e,at:t,label:i,vertical:r}){const u=(n+e)/2;return Y.jsxs("g",{stroke:ol,strokeWidth:.8,children:[r?Y.jsx("line",{x1:t,y1:n,x2:t,y2:e}):Y.jsx("line",{x1:n,y1:t,x2:e,y2:t}),[n,e].map((d,m)=>r?Y.jsx("line",{x1:t-4,y1:d+4,x2:t+4,y2:d-4,strokeWidth:1.1},m):Y.jsx("line",{x1:d-4,y1:t+4,x2:d+4,y2:t-4,strokeWidth:1.1},m)),Y.jsx("text",{x:r?t-5:u,y:r?u:t-5,textAnchor:"middle",fontSize:8.5,fontWeight:500,fill:ol,stroke:"none",transform:r?`rotate(-90 ${t-5} ${u})`:void 0,children:i})]})}function N0({cx:n,cy:e,r:t}){return Y.jsxs("g",{children:[Y.jsx("circle",{cx:n,cy:e,r:t,fill:"none",stroke:ol,strokeWidth:1}),Y.jsx("path",{d:`M ${n} ${e-t+1.5} L ${n-4} ${e+t*.55} L ${n} ${e+t*.2} L ${n+4} ${e+t*.55} Z`,fill:es}),Y.jsx("text",{x:n,y:e+t+9,textAnchor:"middle",fontSize:8,fontWeight:700,fill:ol,children:"N"})]})}const rd="185",il={ROTATE:0,DOLLY:1,PAN:2},nl={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},F0=0,lp=1,U0=2,Du=1,Lm=2,_c=3,is=0,Ii=1,ga=2,ba=0,rl=1,cp=2,up=3,hp=4,O0=5,Qs=100,B0=101,k0=102,z0=103,H0=104,G0=200,V0=201,W0=202,X0=203,uf=204,hf=205,Y0=206,Z0=207,K0=208,J0=209,Q0=210,q0=211,j0=212,$0=213,e_=214,ff=0,df=1,pf=2,ll=3,mf=4,gf=5,_f=6,xf=7,Nm=0,t_=1,n_=2,zr=0,Fm=1,Um=2,Om=3,ad=4,Bm=5,km=6,zm=7,Hm=300,no=301,cl=302,Eh=303,Th=304,Vu=306,vf=1e3,xa=1001,bf=1002,ri=1003,i_=1004,ru=1005,pi=1006,wh=1007,$s=1008,ki=1009,Gm=1010,Vm=1011,yc=1012,sd=1013,Vr=1014,Br=1015,ya=1016,od=1017,ld=1018,Sc=1020,Wm=35902,Xm=35899,Ym=1021,Zm=1022,gr=1023,Sa=1026,eo=1027,Km=1028,cd=1029,io=1030,ud=1031,hd=1033,Iu=33776,Lu=33777,Nu=33778,Fu=33779,Mf=35840,yf=35841,Sf=35842,Ef=35843,Tf=36196,wf=37492,Af=37496,Rf=37488,Cf=37489,Bu=37490,Pf=37491,Df=37808,If=37809,Lf=37810,Nf=37811,Ff=37812,Uf=37813,Of=37814,Bf=37815,kf=37816,zf=37817,Hf=37818,Gf=37819,Vf=37820,Wf=37821,Xf=36492,Yf=36494,Zf=36495,Kf=36283,Jf=36284,ku=36285,Qf=36286,r_=3200,qf=0,a_=1,$a="",Ki="srgb",zu="srgb-linear",Hu="linear",nn="srgb",Go=7680,fp=519,s_=512,o_=513,l_=514,fd=515,c_=516,u_=517,dd=518,h_=519,dp=35044,pp="300 es",kr=2e3,Ec=2001;function f_(n){for(let e=n.length-1;e>=0;--e)if(n[e]>=65535)return!0;return!1}function Gu(n){return document.createElementNS("http://www.w3.org/1999/xhtml",n)}function d_(){const n=Gu("canvas");return n.style.display="block",n}const mp={};function gp(...n){const e="THREE."+n.shift();console.log(e,...n)}function Jm(n){const e=n[0];if(typeof e=="string"&&e.startsWith("TSL:")){const t=n[1];t&&t.isStackTrace?n[0]+=" "+t.getLocation():n[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return n}function ft(...n){n=Jm(n);const e="THREE."+n.shift();{const t=n[0];t&&t.isStackTrace?console.warn(t.getError(e)):console.warn(e,...n)}}function Xt(...n){n=Jm(n);const e="THREE."+n.shift();{const t=n[0];t&&t.isStackTrace?console.error(t.getError(e)):console.error(e,...n)}}function al(...n){const e=n.join(" ");e in mp||(mp[e]=!0,ft(...n))}function p_(n,e,t){return new Promise(function(i,r){function c(){switch(n.clientWaitSync(e,n.SYNC_FLUSH_COMMANDS_BIT,0)){case n.WAIT_FAILED:r();break;case n.TIMEOUT_EXPIRED:setTimeout(c,t);break;default:i()}}setTimeout(c,t)})}const m_={[ff]:df,[pf]:_f,[mf]:xf,[ll]:gf,[df]:ff,[_f]:pf,[xf]:mf,[gf]:ll};class ss{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const i=this._listeners;i[e]===void 0&&(i[e]=[]),i[e].indexOf(t)===-1&&i[e].push(t)}hasEventListener(e,t){const i=this._listeners;return i===void 0?!1:i[e]!==void 0&&i[e].indexOf(t)!==-1}removeEventListener(e,t){const i=this._listeners;if(i===void 0)return;const r=i[e];if(r!==void 0){const c=r.indexOf(t);c!==-1&&r.splice(c,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const i=t[e.type];if(i!==void 0){e.target=this;const r=i.slice(0);for(let c=0,u=r.length;c<u;c++)r[c].call(this,e);e.target=null}}}const ui=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],Uu=Math.PI/180,jf=180/Math.PI;function Tc(){const n=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,i=Math.random()*4294967295|0;return(ui[n&255]+ui[n>>8&255]+ui[n>>16&255]+ui[n>>24&255]+"-"+ui[e&255]+ui[e>>8&255]+"-"+ui[e>>16&15|64]+ui[e>>24&255]+"-"+ui[t&63|128]+ui[t>>8&255]+"-"+ui[t>>16&255]+ui[t>>24&255]+ui[i&255]+ui[i>>8&255]+ui[i>>16&255]+ui[i>>24&255]).toLowerCase()}function Rt(n,e,t){return Math.max(e,Math.min(t,n))}function g_(n,e){return(n%e+e)%e}function Ah(n,e,t){return(1-t)*n+t*e}function cc(n,e){switch(e.constructor){case Float32Array:return n;case Uint32Array:return n/4294967295;case Uint16Array:return n/65535;case Uint8Array:return n/255;case Int32Array:return Math.max(n/2147483647,-1);case Int16Array:return Math.max(n/32767,-1);case Int8Array:return Math.max(n/127,-1);default:throw new Error("THREE.MathUtils: Invalid component type.")}}function Pi(n,e){switch(e.constructor){case Float32Array:return n;case Uint32Array:return Math.round(n*4294967295);case Uint16Array:return Math.round(n*65535);case Uint8Array:return Math.round(n*255);case Int32Array:return Math.round(n*2147483647);case Int16Array:return Math.round(n*32767);case Int8Array:return Math.round(n*127);default:throw new Error("THREE.MathUtils: Invalid component type.")}}const __={DEG2RAD:Uu};class pt{static{pt.prototype.isVector2=!0}constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("THREE.Vector2: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,i=this.y,r=e.elements;return this.x=r[0]*t+r[3]*i+r[6],this.y=r[1]*t+r[4]*i+r[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Rt(this.x,e.x,t.x),this.y=Rt(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=Rt(this.x,e,t),this.y=Rt(this.y,e,t),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Rt(i,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const i=this.dot(e)/t;return Math.acos(Rt(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,i=this.y-e.y;return t*t+i*i}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const i=Math.cos(t),r=Math.sin(t),c=this.x-e.x,u=this.y-e.y;return this.x=c*i-u*r+e.x,this.y=c*r+u*i+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class rs{constructor(e=0,t=0,i=0,r=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=i,this._w=r}static slerpFlat(e,t,i,r,c,u,d){let m=i[r+0],p=i[r+1],g=i[r+2],b=i[r+3],x=c[u+0],M=c[u+1],A=c[u+2],C=c[u+3];if(b!==C||m!==x||p!==M||g!==A){let T=m*x+p*M+g*A+b*C;T<0&&(x=-x,M=-M,A=-A,C=-C,T=-T);let S=1-d;if(T<.9995){const B=Math.acos(T),G=Math.sin(B);S=Math.sin(S*B)/G,d=Math.sin(d*B)/G,m=m*S+x*d,p=p*S+M*d,g=g*S+A*d,b=b*S+C*d}else{m=m*S+x*d,p=p*S+M*d,g=g*S+A*d,b=b*S+C*d;const B=1/Math.sqrt(m*m+p*p+g*g+b*b);m*=B,p*=B,g*=B,b*=B}}e[t]=m,e[t+1]=p,e[t+2]=g,e[t+3]=b}static multiplyQuaternionsFlat(e,t,i,r,c,u){const d=i[r],m=i[r+1],p=i[r+2],g=i[r+3],b=c[u],x=c[u+1],M=c[u+2],A=c[u+3];return e[t]=d*A+g*b+m*M-p*x,e[t+1]=m*A+g*x+p*b-d*M,e[t+2]=p*A+g*M+d*x-m*b,e[t+3]=g*A-d*b-m*x-p*M,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,i,r){return this._x=e,this._y=t,this._z=i,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const i=e._x,r=e._y,c=e._z,u=e._order,d=Math.cos,m=Math.sin,p=d(i/2),g=d(r/2),b=d(c/2),x=m(i/2),M=m(r/2),A=m(c/2);switch(u){case"XYZ":this._x=x*g*b+p*M*A,this._y=p*M*b-x*g*A,this._z=p*g*A+x*M*b,this._w=p*g*b-x*M*A;break;case"YXZ":this._x=x*g*b+p*M*A,this._y=p*M*b-x*g*A,this._z=p*g*A-x*M*b,this._w=p*g*b+x*M*A;break;case"ZXY":this._x=x*g*b-p*M*A,this._y=p*M*b+x*g*A,this._z=p*g*A+x*M*b,this._w=p*g*b-x*M*A;break;case"ZYX":this._x=x*g*b-p*M*A,this._y=p*M*b+x*g*A,this._z=p*g*A-x*M*b,this._w=p*g*b+x*M*A;break;case"YZX":this._x=x*g*b+p*M*A,this._y=p*M*b+x*g*A,this._z=p*g*A-x*M*b,this._w=p*g*b-x*M*A;break;case"XZY":this._x=x*g*b-p*M*A,this._y=p*M*b-x*g*A,this._z=p*g*A+x*M*b,this._w=p*g*b+x*M*A;break;default:ft("Quaternion: .setFromEuler() encountered an unknown order: "+u)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const i=t/2,r=Math.sin(i);return this._x=e.x*r,this._y=e.y*r,this._z=e.z*r,this._w=Math.cos(i),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,i=t[0],r=t[4],c=t[8],u=t[1],d=t[5],m=t[9],p=t[2],g=t[6],b=t[10],x=i+d+b;if(x>0){const M=.5/Math.sqrt(x+1);this._w=.25/M,this._x=(g-m)*M,this._y=(c-p)*M,this._z=(u-r)*M}else if(i>d&&i>b){const M=2*Math.sqrt(1+i-d-b);this._w=(g-m)/M,this._x=.25*M,this._y=(r+u)/M,this._z=(c+p)/M}else if(d>b){const M=2*Math.sqrt(1+d-i-b);this._w=(c-p)/M,this._x=(r+u)/M,this._y=.25*M,this._z=(m+g)/M}else{const M=2*Math.sqrt(1+b-i-d);this._w=(u-r)/M,this._x=(c+p)/M,this._y=(m+g)/M,this._z=.25*M}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let i=e.dot(t)+1;return i<1e-8?(i=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=i):(this._x=0,this._y=-e.z,this._z=e.y,this._w=i)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=i),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(Rt(this.dot(e),-1,1)))}rotateTowards(e,t){const i=this.angleTo(e);if(i===0)return this;const r=Math.min(1,t/i);return this.slerp(e,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const i=e._x,r=e._y,c=e._z,u=e._w,d=t._x,m=t._y,p=t._z,g=t._w;return this._x=i*g+u*d+r*p-c*m,this._y=r*g+u*m+c*d-i*p,this._z=c*g+u*p+i*m-r*d,this._w=u*g-i*d-r*m-c*p,this._onChangeCallback(),this}slerp(e,t){let i=e._x,r=e._y,c=e._z,u=e._w,d=this.dot(e);d<0&&(i=-i,r=-r,c=-c,u=-u,d=-d);let m=1-t;if(d<.9995){const p=Math.acos(d),g=Math.sin(p);m=Math.sin(m*p)/g,t=Math.sin(t*p)/g,this._x=this._x*m+i*t,this._y=this._y*m+r*t,this._z=this._z*m+c*t,this._w=this._w*m+u*t,this._onChangeCallback()}else this._x=this._x*m+i*t,this._y=this._y*m+r*t,this._z=this._z*m+c*t,this._w=this._w*m+u*t,this.normalize();return this}slerpQuaternions(e,t,i){return this.copy(e).slerp(t,i)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),i=Math.random(),r=Math.sqrt(1-i),c=Math.sqrt(i);return this.set(r*Math.sin(e),r*Math.cos(e),c*Math.sin(t),c*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class se{static{se.prototype.isVector3=!0}constructor(e=0,t=0,i=0){this.x=e,this.y=t,this.z=i}set(e,t,i){return i===void 0&&(i=this.z),this.x=e,this.y=t,this.z=i,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("THREE.Vector3: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(_p.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(_p.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,i=this.y,r=this.z,c=e.elements;return this.x=c[0]*t+c[3]*i+c[6]*r,this.y=c[1]*t+c[4]*i+c[7]*r,this.z=c[2]*t+c[5]*i+c[8]*r,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,i=this.y,r=this.z,c=e.elements,u=1/(c[3]*t+c[7]*i+c[11]*r+c[15]);return this.x=(c[0]*t+c[4]*i+c[8]*r+c[12])*u,this.y=(c[1]*t+c[5]*i+c[9]*r+c[13])*u,this.z=(c[2]*t+c[6]*i+c[10]*r+c[14])*u,this}applyQuaternion(e){const t=this.x,i=this.y,r=this.z,c=e.x,u=e.y,d=e.z,m=e.w,p=2*(u*r-d*i),g=2*(d*t-c*r),b=2*(c*i-u*t);return this.x=t+m*p+u*b-d*g,this.y=i+m*g+d*p-c*b,this.z=r+m*b+c*g-u*p,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,i=this.y,r=this.z,c=e.elements;return this.x=c[0]*t+c[4]*i+c[8]*r,this.y=c[1]*t+c[5]*i+c[9]*r,this.z=c[2]*t+c[6]*i+c[10]*r,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Rt(this.x,e.x,t.x),this.y=Rt(this.y,e.y,t.y),this.z=Rt(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=Rt(this.x,e,t),this.y=Rt(this.y,e,t),this.z=Rt(this.z,e,t),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Rt(i,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const i=e.x,r=e.y,c=e.z,u=t.x,d=t.y,m=t.z;return this.x=r*m-c*d,this.y=c*u-i*m,this.z=i*d-r*u,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const i=e.dot(this)/t;return this.copy(e).multiplyScalar(i)}projectOnPlane(e){return Rh.copy(this).projectOnVector(e),this.sub(Rh)}reflect(e){return this.sub(Rh.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const i=this.dot(e)/t;return Math.acos(Rt(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,i=this.y-e.y,r=this.z-e.z;return t*t+i*i+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,i){const r=Math.sin(t)*e;return this.x=r*Math.sin(i),this.y=Math.cos(t)*e,this.z=r*Math.cos(i),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,i){return this.x=e*Math.sin(t),this.y=i,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),i=this.setFromMatrixColumn(e,1).length(),r=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=i,this.z=r,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,i=Math.sqrt(1-t*t);return this.x=i*Math.cos(e),this.y=t,this.z=i*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const Rh=new se,_p=new rs;class xt{static{xt.prototype.isMatrix3=!0}constructor(e,t,i,r,c,u,d,m,p){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,i,r,c,u,d,m,p)}set(e,t,i,r,c,u,d,m,p){const g=this.elements;return g[0]=e,g[1]=r,g[2]=d,g[3]=t,g[4]=c,g[5]=m,g[6]=i,g[7]=u,g[8]=p,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],this}extractBasis(e,t,i){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),i.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const i=e.elements,r=t.elements,c=this.elements,u=i[0],d=i[3],m=i[6],p=i[1],g=i[4],b=i[7],x=i[2],M=i[5],A=i[8],C=r[0],T=r[3],S=r[6],B=r[1],G=r[4],D=r[7],z=r[2],U=r[5],W=r[8];return c[0]=u*C+d*B+m*z,c[3]=u*T+d*G+m*U,c[6]=u*S+d*D+m*W,c[1]=p*C+g*B+b*z,c[4]=p*T+g*G+b*U,c[7]=p*S+g*D+b*W,c[2]=x*C+M*B+A*z,c[5]=x*T+M*G+A*U,c[8]=x*S+M*D+A*W,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],i=e[1],r=e[2],c=e[3],u=e[4],d=e[5],m=e[6],p=e[7],g=e[8];return t*u*g-t*d*p-i*c*g+i*d*m+r*c*p-r*u*m}invert(){const e=this.elements,t=e[0],i=e[1],r=e[2],c=e[3],u=e[4],d=e[5],m=e[6],p=e[7],g=e[8],b=g*u-d*p,x=d*m-g*c,M=p*c-u*m,A=t*b+i*x+r*M;if(A===0)return this.set(0,0,0,0,0,0,0,0,0);const C=1/A;return e[0]=b*C,e[1]=(r*p-g*i)*C,e[2]=(d*i-r*u)*C,e[3]=x*C,e[4]=(g*t-r*m)*C,e[5]=(r*c-d*t)*C,e[6]=M*C,e[7]=(i*m-p*t)*C,e[8]=(u*t-i*c)*C,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,i,r,c,u,d){const m=Math.cos(c),p=Math.sin(c);return this.set(i*m,i*p,-i*(m*u+p*d)+u+e,-r*p,r*m,-r*(-p*u+m*d)+d+t,0,0,1),this}scale(e,t){return al("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(Ch.makeScale(e,t)),this}rotate(e){return al("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(Ch.makeRotation(-e)),this}translate(e,t){return al("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(Ch.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,i,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,i=e.elements;for(let r=0;r<9;r++)if(t[r]!==i[r])return!1;return!0}fromArray(e,t=0){for(let i=0;i<9;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){const i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e}clone(){return new this.constructor().fromArray(this.elements)}}const Ch=new xt,xp=new xt().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),vp=new xt().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function x_(){const n={enabled:!0,workingColorSpace:zu,spaces:{},convert:function(r,c,u){return this.enabled===!1||c===u||!c||!u||(this.spaces[c].transfer===nn&&(r.r=Ma(r.r),r.g=Ma(r.g),r.b=Ma(r.b)),this.spaces[c].primaries!==this.spaces[u].primaries&&(r.applyMatrix3(this.spaces[c].toXYZ),r.applyMatrix3(this.spaces[u].fromXYZ)),this.spaces[u].transfer===nn&&(r.r=sl(r.r),r.g=sl(r.g),r.b=sl(r.b))),r},workingToColorSpace:function(r,c){return this.convert(r,this.workingColorSpace,c)},colorSpaceToWorking:function(r,c){return this.convert(r,c,this.workingColorSpace)},getPrimaries:function(r){return this.spaces[r].primaries},getTransfer:function(r){return r===$a?Hu:this.spaces[r].transfer},getToneMappingMode:function(r){return this.spaces[r].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(r,c=this.workingColorSpace){return r.fromArray(this.spaces[c].luminanceCoefficients)},define:function(r){Object.assign(this.spaces,r)},_getMatrix:function(r,c,u){return r.copy(this.spaces[c].toXYZ).multiply(this.spaces[u].fromXYZ)},_getDrawingBufferColorSpace:function(r){return this.spaces[r].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(r=this.workingColorSpace){return this.spaces[r].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(r,c){return al("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),n.workingToColorSpace(r,c)},toWorkingColorSpace:function(r,c){return al("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),n.colorSpaceToWorking(r,c)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],i=[.3127,.329];return n.define({[zu]:{primaries:e,whitePoint:i,transfer:Hu,toXYZ:xp,fromXYZ:vp,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:Ki},outputColorSpaceConfig:{drawingBufferColorSpace:Ki}},[Ki]:{primaries:e,whitePoint:i,transfer:nn,toXYZ:xp,fromXYZ:vp,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:Ki}}}),n}const Gt=x_();function Ma(n){return n<.04045?n*.0773993808:Math.pow(n*.9478672986+.0521327014,2.4)}function sl(n){return n<.0031308?n*12.92:1.055*Math.pow(n,.41666)-.055}let Vo;class v_{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let i;if(e instanceof HTMLCanvasElement)i=e;else{Vo===void 0&&(Vo=Gu("canvas")),Vo.width=e.width,Vo.height=e.height;const r=Vo.getContext("2d");e instanceof ImageData?r.putImageData(e,0,0):r.drawImage(e,0,0,e.width,e.height),i=Vo}return i.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=Gu("canvas");t.width=e.width,t.height=e.height;const i=t.getContext("2d");i.drawImage(e,0,0,e.width,e.height);const r=i.getImageData(0,0,e.width,e.height),c=r.data;for(let u=0;u<c.length;u++)c[u]=Ma(c[u]/255)*255;return i.putImageData(r,0,0),t}else if(e.data){const t=e.data.slice(0);for(let i=0;i<t.length;i++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[i]=Math.floor(Ma(t[i]/255)*255):t[i]=Ma(t[i]);return{data:t,width:e.width,height:e.height}}else return ft("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let b_=0;class pd{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:b_++}),this.uuid=Tc(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){const t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<"u"&&t instanceof VideoFrame?e.set(t.displayWidth,t.displayHeight,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const i={uuid:this.uuid,url:""},r=this.data;if(r!==null){let c;if(Array.isArray(r)){c=[];for(let u=0,d=r.length;u<d;u++)r[u].isDataTexture?c.push(Ph(r[u].image)):c.push(Ph(r[u]))}else c=Ph(r);i.url=c}return t||(e.images[this.uuid]=i),i}}function Ph(n){return typeof HTMLImageElement<"u"&&n instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&n instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&n instanceof ImageBitmap?v_.getDataURL(n):n.data?{data:Array.from(n.data),width:n.width,height:n.height,type:n.data.constructor.name}:(ft("Texture: Unable to serialize Texture."),{})}let M_=0;const Dh=new se;class mi extends ss{constructor(e=mi.DEFAULT_IMAGE,t=mi.DEFAULT_MAPPING,i=xa,r=xa,c=pi,u=$s,d=gr,m=ki,p=mi.DEFAULT_ANISOTROPY,g=$a){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:M_++}),this.uuid=Tc(),this.name="",this.source=new pd(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=i,this.wrapT=r,this.magFilter=c,this.minFilter=u,this.anisotropy=p,this.format=d,this.internalFormat=null,this.type=m,this.offset=new pt(0,0),this.repeat=new pt(1,1),this.center=new pt(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new xt,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=g,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(Dh).x}get height(){return this.source.getSize(Dh).y}get depth(){return this.source.getSize(Dh).z}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.normalized=e.normalized,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(const t in e){const i=e[t];if(i===void 0){ft(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}const r=this[t];if(r===void 0){ft(`Texture.setValues(): property '${t}' does not exist.`);continue}r&&i&&r.isVector2&&i.isVector2||r&&i&&r.isVector3&&i.isVector3||r&&i&&r.isMatrix3&&i.isMatrix3?r.copy(i):this[t]=i}}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const i={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(i.userData=this.userData),t||(e.textures[this.uuid]=i),i}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==Hm)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case vf:e.x=e.x-Math.floor(e.x);break;case xa:e.x=e.x<0?0:1;break;case bf:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case vf:e.y=e.y-Math.floor(e.y);break;case xa:e.y=e.y<0?0:1;break;case bf:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}mi.DEFAULT_IMAGE=null;mi.DEFAULT_MAPPING=Hm;mi.DEFAULT_ANISOTROPY=1;class yn{static{yn.prototype.isVector4=!0}constructor(e=0,t=0,i=0,r=1){this.x=e,this.y=t,this.z=i,this.w=r}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,i,r){return this.x=e,this.y=t,this.z=i,this.w=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("THREE.Vector4: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,i=this.y,r=this.z,c=this.w,u=e.elements;return this.x=u[0]*t+u[4]*i+u[8]*r+u[12]*c,this.y=u[1]*t+u[5]*i+u[9]*r+u[13]*c,this.z=u[2]*t+u[6]*i+u[10]*r+u[14]*c,this.w=u[3]*t+u[7]*i+u[11]*r+u[15]*c,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,i,r,c;const m=e.elements,p=m[0],g=m[4],b=m[8],x=m[1],M=m[5],A=m[9],C=m[2],T=m[6],S=m[10];if(Math.abs(g-x)<.01&&Math.abs(b-C)<.01&&Math.abs(A-T)<.01){if(Math.abs(g+x)<.1&&Math.abs(b+C)<.1&&Math.abs(A+T)<.1&&Math.abs(p+M+S-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const G=(p+1)/2,D=(M+1)/2,z=(S+1)/2,U=(g+x)/4,W=(b+C)/4,w=(A+T)/4;return G>D&&G>z?G<.01?(i=0,r=.707106781,c=.707106781):(i=Math.sqrt(G),r=U/i,c=W/i):D>z?D<.01?(i=.707106781,r=0,c=.707106781):(r=Math.sqrt(D),i=U/r,c=w/r):z<.01?(i=.707106781,r=.707106781,c=0):(c=Math.sqrt(z),i=W/c,r=w/c),this.set(i,r,c,t),this}let B=Math.sqrt((T-A)*(T-A)+(b-C)*(b-C)+(x-g)*(x-g));return Math.abs(B)<.001&&(B=1),this.x=(T-A)/B,this.y=(b-C)/B,this.z=(x-g)/B,this.w=Math.acos((p+M+S-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Rt(this.x,e.x,t.x),this.y=Rt(this.y,e.y,t.y),this.z=Rt(this.z,e.z,t.z),this.w=Rt(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=Rt(this.x,e,t),this.y=Rt(this.y,e,t),this.z=Rt(this.z,e,t),this.w=Rt(this.w,e,t),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Rt(i,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this.w=e.w+(t.w-e.w)*i,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class y_ extends ss{constructor(e=1,t=1,i={}){super(),i=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:pi,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},i),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=i.depth,this.scissor=new yn(0,0,e,t),this.scissorTest=!1,this.viewport=new yn(0,0,e,t),this.textures=[];const r={width:e,height:t,depth:i.depth},c=new mi(r),u=i.count;for(let d=0;d<u;d++)this.textures[d]=c.clone(),this.textures[d].isRenderTargetTexture=!0,this.textures[d].renderTarget=this;this._setTextureOptions(i),this.depthBuffer=i.depthBuffer,this.stencilBuffer=i.stencilBuffer,this.resolveDepthBuffer=i.resolveDepthBuffer,this.resolveStencilBuffer=i.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=i.depthTexture,this.samples=i.samples,this.multiview=i.multiview,this.useArrayDepthTexture=i.useArrayDepthTexture}_setTextureOptions(e={}){const t={minFilter:pi,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let i=0;i<this.textures.length;i++)this.textures[i].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,i=1){if(this.width!==e||this.height!==t||this.depth!==i){this.width=e,this.height=t,this.depth=i;for(let r=0,c=this.textures.length;r<c;r++)this.textures[r].image.width=e,this.textures[r].image.height=t,this.textures[r].image.depth=i,this.textures[r].isData3DTexture!==!0&&(this.textures[r].isArrayTexture=this.textures[r].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,i=e.textures.length;t<i;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;const r=Object.assign({},e.textures[t].image);this.textures[t].source=new pd(r)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this.multiview=e.multiview,this.useArrayDepthTexture=e.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}}class Hr extends y_{constructor(e=1,t=1,i={}){super(e,t,i),this.isWebGLRenderTarget=!0}}class Qm extends mi{constructor(e=null,t=1,i=1,r=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:i,depth:r},this.magFilter=ri,this.minFilter=ri,this.wrapR=xa,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class S_ extends mi{constructor(e=null,t=1,i=1,r=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:i,depth:r},this.magFilter=ri,this.minFilter=ri,this.wrapR=xa,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class Sn{static{Sn.prototype.isMatrix4=!0}constructor(e,t,i,r,c,u,d,m,p,g,b,x,M,A,C,T){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,i,r,c,u,d,m,p,g,b,x,M,A,C,T)}set(e,t,i,r,c,u,d,m,p,g,b,x,M,A,C,T){const S=this.elements;return S[0]=e,S[4]=t,S[8]=i,S[12]=r,S[1]=c,S[5]=u,S[9]=d,S[13]=m,S[2]=p,S[6]=g,S[10]=b,S[14]=x,S[3]=M,S[7]=A,S[11]=C,S[15]=T,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new Sn().fromArray(this.elements)}copy(e){const t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],t[9]=i[9],t[10]=i[10],t[11]=i[11],t[12]=i[12],t[13]=i[13],t[14]=i[14],t[15]=i[15],this}copyPosition(e){const t=this.elements,i=e.elements;return t[12]=i[12],t[13]=i[13],t[14]=i[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,i){return this.determinantAffine()===0?(e.set(1,0,0),t.set(0,1,0),i.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),i.setFromMatrixColumn(this,2),this)}makeBasis(e,t,i){return this.set(e.x,t.x,i.x,0,e.y,t.y,i.y,0,e.z,t.z,i.z,0,0,0,0,1),this}extractRotation(e){if(e.determinantAffine()===0)return this.identity();const t=this.elements,i=e.elements,r=1/Wo.setFromMatrixColumn(e,0).length(),c=1/Wo.setFromMatrixColumn(e,1).length(),u=1/Wo.setFromMatrixColumn(e,2).length();return t[0]=i[0]*r,t[1]=i[1]*r,t[2]=i[2]*r,t[3]=0,t[4]=i[4]*c,t[5]=i[5]*c,t[6]=i[6]*c,t[7]=0,t[8]=i[8]*u,t[9]=i[9]*u,t[10]=i[10]*u,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,i=e.x,r=e.y,c=e.z,u=Math.cos(i),d=Math.sin(i),m=Math.cos(r),p=Math.sin(r),g=Math.cos(c),b=Math.sin(c);if(e.order==="XYZ"){const x=u*g,M=u*b,A=d*g,C=d*b;t[0]=m*g,t[4]=-m*b,t[8]=p,t[1]=M+A*p,t[5]=x-C*p,t[9]=-d*m,t[2]=C-x*p,t[6]=A+M*p,t[10]=u*m}else if(e.order==="YXZ"){const x=m*g,M=m*b,A=p*g,C=p*b;t[0]=x+C*d,t[4]=A*d-M,t[8]=u*p,t[1]=u*b,t[5]=u*g,t[9]=-d,t[2]=M*d-A,t[6]=C+x*d,t[10]=u*m}else if(e.order==="ZXY"){const x=m*g,M=m*b,A=p*g,C=p*b;t[0]=x-C*d,t[4]=-u*b,t[8]=A+M*d,t[1]=M+A*d,t[5]=u*g,t[9]=C-x*d,t[2]=-u*p,t[6]=d,t[10]=u*m}else if(e.order==="ZYX"){const x=u*g,M=u*b,A=d*g,C=d*b;t[0]=m*g,t[4]=A*p-M,t[8]=x*p+C,t[1]=m*b,t[5]=C*p+x,t[9]=M*p-A,t[2]=-p,t[6]=d*m,t[10]=u*m}else if(e.order==="YZX"){const x=u*m,M=u*p,A=d*m,C=d*p;t[0]=m*g,t[4]=C-x*b,t[8]=A*b+M,t[1]=b,t[5]=u*g,t[9]=-d*g,t[2]=-p*g,t[6]=M*b+A,t[10]=x-C*b}else if(e.order==="XZY"){const x=u*m,M=u*p,A=d*m,C=d*p;t[0]=m*g,t[4]=-b,t[8]=p*g,t[1]=x*b+C,t[5]=u*g,t[9]=M*b-A,t[2]=A*b-M,t[6]=d*g,t[10]=C*b+x}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(E_,e,T_)}lookAt(e,t,i){const r=this.elements;return Oi.subVectors(e,t),Oi.lengthSq()===0&&(Oi.z=1),Oi.normalize(),Ya.crossVectors(i,Oi),Ya.lengthSq()===0&&(Math.abs(i.z)===1?Oi.x+=1e-4:Oi.z+=1e-4,Oi.normalize(),Ya.crossVectors(i,Oi)),Ya.normalize(),au.crossVectors(Oi,Ya),r[0]=Ya.x,r[4]=au.x,r[8]=Oi.x,r[1]=Ya.y,r[5]=au.y,r[9]=Oi.y,r[2]=Ya.z,r[6]=au.z,r[10]=Oi.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const i=e.elements,r=t.elements,c=this.elements,u=i[0],d=i[4],m=i[8],p=i[12],g=i[1],b=i[5],x=i[9],M=i[13],A=i[2],C=i[6],T=i[10],S=i[14],B=i[3],G=i[7],D=i[11],z=i[15],U=r[0],W=r[4],w=r[8],F=r[12],Z=r[1],X=r[5],ne=r[9],pe=r[13],_e=r[2],re=r[6],H=r[10],j=r[14],Ee=r[3],Ce=r[7],ce=r[11],K=r[15];return c[0]=u*U+d*Z+m*_e+p*Ee,c[4]=u*W+d*X+m*re+p*Ce,c[8]=u*w+d*ne+m*H+p*ce,c[12]=u*F+d*pe+m*j+p*K,c[1]=g*U+b*Z+x*_e+M*Ee,c[5]=g*W+b*X+x*re+M*Ce,c[9]=g*w+b*ne+x*H+M*ce,c[13]=g*F+b*pe+x*j+M*K,c[2]=A*U+C*Z+T*_e+S*Ee,c[6]=A*W+C*X+T*re+S*Ce,c[10]=A*w+C*ne+T*H+S*ce,c[14]=A*F+C*pe+T*j+S*K,c[3]=B*U+G*Z+D*_e+z*Ee,c[7]=B*W+G*X+D*re+z*Ce,c[11]=B*w+G*ne+D*H+z*ce,c[15]=B*F+G*pe+D*j+z*K,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],i=e[4],r=e[8],c=e[12],u=e[1],d=e[5],m=e[9],p=e[13],g=e[2],b=e[6],x=e[10],M=e[14],A=e[3],C=e[7],T=e[11],S=e[15],B=m*M-p*x,G=d*M-p*b,D=d*x-m*b,z=u*M-p*g,U=u*x-m*g,W=u*b-d*g;return t*(C*B-T*G+S*D)-i*(A*B-T*z+S*U)+r*(A*G-C*z+S*W)-c*(A*D-C*U+T*W)}determinantAffine(){const e=this.elements,t=e[0],i=e[4],r=e[8],c=e[1],u=e[5],d=e[9],m=e[2],p=e[6],g=e[10];return t*(u*g-d*p)-i*(c*g-d*m)+r*(c*p-u*m)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,i){const r=this.elements;return e.isVector3?(r[12]=e.x,r[13]=e.y,r[14]=e.z):(r[12]=e,r[13]=t,r[14]=i),this}invert(){const e=this.elements,t=e[0],i=e[1],r=e[2],c=e[3],u=e[4],d=e[5],m=e[6],p=e[7],g=e[8],b=e[9],x=e[10],M=e[11],A=e[12],C=e[13],T=e[14],S=e[15],B=t*d-i*u,G=t*m-r*u,D=t*p-c*u,z=i*m-r*d,U=i*p-c*d,W=r*p-c*m,w=g*C-b*A,F=g*T-x*A,Z=g*S-M*A,X=b*T-x*C,ne=b*S-M*C,pe=x*S-M*T,_e=B*pe-G*ne+D*X+z*Z-U*F+W*w;if(_e===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const re=1/_e;return e[0]=(d*pe-m*ne+p*X)*re,e[1]=(r*ne-i*pe-c*X)*re,e[2]=(C*W-T*U+S*z)*re,e[3]=(x*U-b*W-M*z)*re,e[4]=(m*Z-u*pe-p*F)*re,e[5]=(t*pe-r*Z+c*F)*re,e[6]=(T*D-A*W-S*G)*re,e[7]=(g*W-x*D+M*G)*re,e[8]=(u*ne-d*Z+p*w)*re,e[9]=(i*Z-t*ne-c*w)*re,e[10]=(A*U-C*D+S*B)*re,e[11]=(b*D-g*U-M*B)*re,e[12]=(d*F-u*X-m*w)*re,e[13]=(t*X-i*F+r*w)*re,e[14]=(C*G-A*z-T*B)*re,e[15]=(g*z-b*G+x*B)*re,this}scale(e){const t=this.elements,i=e.x,r=e.y,c=e.z;return t[0]*=i,t[4]*=r,t[8]*=c,t[1]*=i,t[5]*=r,t[9]*=c,t[2]*=i,t[6]*=r,t[10]*=c,t[3]*=i,t[7]*=r,t[11]*=c,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],i=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],r=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,i,r))}makeTranslation(e,t,i){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,i,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),i=Math.sin(e);return this.set(1,0,0,0,0,t,-i,0,0,i,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,0,i,0,0,1,0,0,-i,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,0,i,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const i=Math.cos(t),r=Math.sin(t),c=1-i,u=e.x,d=e.y,m=e.z,p=c*u,g=c*d;return this.set(p*u+i,p*d-r*m,p*m+r*d,0,p*d+r*m,g*d+i,g*m-r*u,0,p*m-r*d,g*m+r*u,c*m*m+i,0,0,0,0,1),this}makeScale(e,t,i){return this.set(e,0,0,0,0,t,0,0,0,0,i,0,0,0,0,1),this}makeShear(e,t,i,r,c,u){return this.set(1,i,c,0,e,1,u,0,t,r,1,0,0,0,0,1),this}compose(e,t,i){const r=this.elements,c=t._x,u=t._y,d=t._z,m=t._w,p=c+c,g=u+u,b=d+d,x=c*p,M=c*g,A=c*b,C=u*g,T=u*b,S=d*b,B=m*p,G=m*g,D=m*b,z=i.x,U=i.y,W=i.z;return r[0]=(1-(C+S))*z,r[1]=(M+D)*z,r[2]=(A-G)*z,r[3]=0,r[4]=(M-D)*U,r[5]=(1-(x+S))*U,r[6]=(T+B)*U,r[7]=0,r[8]=(A+G)*W,r[9]=(T-B)*W,r[10]=(1-(x+C))*W,r[11]=0,r[12]=e.x,r[13]=e.y,r[14]=e.z,r[15]=1,this}decompose(e,t,i){const r=this.elements;e.x=r[12],e.y=r[13],e.z=r[14];const c=this.determinantAffine();if(c===0)return i.set(1,1,1),t.identity(),this;let u=Wo.set(r[0],r[1],r[2]).length();const d=Wo.set(r[4],r[5],r[6]).length(),m=Wo.set(r[8],r[9],r[10]).length();c<0&&(u=-u),hr.copy(this);const p=1/u,g=1/d,b=1/m;return hr.elements[0]*=p,hr.elements[1]*=p,hr.elements[2]*=p,hr.elements[4]*=g,hr.elements[5]*=g,hr.elements[6]*=g,hr.elements[8]*=b,hr.elements[9]*=b,hr.elements[10]*=b,t.setFromRotationMatrix(hr),i.x=u,i.y=d,i.z=m,this}makePerspective(e,t,i,r,c,u,d=kr,m=!1){const p=this.elements,g=2*c/(t-e),b=2*c/(i-r),x=(t+e)/(t-e),M=(i+r)/(i-r);let A,C;if(m)A=c/(u-c),C=u*c/(u-c);else if(d===kr)A=-(u+c)/(u-c),C=-2*u*c/(u-c);else if(d===Ec)A=-u/(u-c),C=-u*c/(u-c);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+d);return p[0]=g,p[4]=0,p[8]=x,p[12]=0,p[1]=0,p[5]=b,p[9]=M,p[13]=0,p[2]=0,p[6]=0,p[10]=A,p[14]=C,p[3]=0,p[7]=0,p[11]=-1,p[15]=0,this}makeOrthographic(e,t,i,r,c,u,d=kr,m=!1){const p=this.elements,g=2/(t-e),b=2/(i-r),x=-(t+e)/(t-e),M=-(i+r)/(i-r);let A,C;if(m)A=1/(u-c),C=u/(u-c);else if(d===kr)A=-2/(u-c),C=-(u+c)/(u-c);else if(d===Ec)A=-1/(u-c),C=-c/(u-c);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+d);return p[0]=g,p[4]=0,p[8]=0,p[12]=x,p[1]=0,p[5]=b,p[9]=0,p[13]=M,p[2]=0,p[6]=0,p[10]=A,p[14]=C,p[3]=0,p[7]=0,p[11]=0,p[15]=1,this}equals(e){const t=this.elements,i=e.elements;for(let r=0;r<16;r++)if(t[r]!==i[r])return!1;return!0}fromArray(e,t=0){for(let i=0;i<16;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){const i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e[t+9]=i[9],e[t+10]=i[10],e[t+11]=i[11],e[t+12]=i[12],e[t+13]=i[13],e[t+14]=i[14],e[t+15]=i[15],e}}const Wo=new se,hr=new Sn,E_=new se(0,0,0),T_=new se(1,1,1),Ya=new se,au=new se,Oi=new se,bp=new Sn,Mp=new rs;class as{constructor(e=0,t=0,i=0,r=as.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=i,this._order=r}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,i,r=this._order){return this._x=e,this._y=t,this._z=i,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,i=!0){const r=e.elements,c=r[0],u=r[4],d=r[8],m=r[1],p=r[5],g=r[9],b=r[2],x=r[6],M=r[10];switch(t){case"XYZ":this._y=Math.asin(Rt(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(-g,M),this._z=Math.atan2(-u,c)):(this._x=Math.atan2(x,p),this._z=0);break;case"YXZ":this._x=Math.asin(-Rt(g,-1,1)),Math.abs(g)<.9999999?(this._y=Math.atan2(d,M),this._z=Math.atan2(m,p)):(this._y=Math.atan2(-b,c),this._z=0);break;case"ZXY":this._x=Math.asin(Rt(x,-1,1)),Math.abs(x)<.9999999?(this._y=Math.atan2(-b,M),this._z=Math.atan2(-u,p)):(this._y=0,this._z=Math.atan2(m,c));break;case"ZYX":this._y=Math.asin(-Rt(b,-1,1)),Math.abs(b)<.9999999?(this._x=Math.atan2(x,M),this._z=Math.atan2(m,c)):(this._x=0,this._z=Math.atan2(-u,p));break;case"YZX":this._z=Math.asin(Rt(m,-1,1)),Math.abs(m)<.9999999?(this._x=Math.atan2(-g,p),this._y=Math.atan2(-b,c)):(this._x=0,this._y=Math.atan2(d,M));break;case"XZY":this._z=Math.asin(-Rt(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(x,p),this._y=Math.atan2(d,c)):(this._x=Math.atan2(-g,M),this._y=0);break;default:ft("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,i===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,i){return bp.makeRotationFromQuaternion(e),this.setFromRotationMatrix(bp,t,i)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return Mp.setFromEuler(this),this.setFromQuaternion(Mp,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}as.DEFAULT_ORDER="XYZ";class qm{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let w_=0;const yp=new se,Xo=new rs,ua=new Sn,su=new se,uc=new se,A_=new se,R_=new rs,Sp=new se(1,0,0),Ep=new se(0,1,0),Tp=new se(0,0,1),wp={type:"added"},C_={type:"removed"},Yo={type:"childadded",child:null},Ih={type:"childremoved",child:null};class ai extends ss{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:w_++}),this.uuid=Tc(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=ai.DEFAULT_UP.clone();const e=new se,t=new as,i=new rs,r=new se(1,1,1);function c(){i.setFromEuler(t,!1)}function u(){t.setFromQuaternion(i,void 0,!1)}t._onChange(c),i._onChange(u),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:i},scale:{configurable:!0,enumerable:!0,value:r},modelViewMatrix:{value:new Sn},normalMatrix:{value:new xt}}),this.matrix=new Sn,this.matrixWorld=new Sn,this.matrixAutoUpdate=ai.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=ai.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new qm,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return Xo.setFromAxisAngle(e,t),this.quaternion.multiply(Xo),this}rotateOnWorldAxis(e,t){return Xo.setFromAxisAngle(e,t),this.quaternion.premultiply(Xo),this}rotateX(e){return this.rotateOnAxis(Sp,e)}rotateY(e){return this.rotateOnAxis(Ep,e)}rotateZ(e){return this.rotateOnAxis(Tp,e)}translateOnAxis(e,t){return yp.copy(e).applyQuaternion(this.quaternion),this.position.add(yp.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(Sp,e)}translateY(e){return this.translateOnAxis(Ep,e)}translateZ(e){return this.translateOnAxis(Tp,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(ua.copy(this.matrixWorld).invert())}lookAt(e,t,i){e.isVector3?su.copy(e):su.set(e,t,i);const r=this.parent;this.updateWorldMatrix(!0,!1),uc.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?ua.lookAt(uc,su,this.up):ua.lookAt(su,uc,this.up),this.quaternion.setFromRotationMatrix(ua),r&&(ua.extractRotation(r.matrixWorld),Xo.setFromRotationMatrix(ua),this.quaternion.premultiply(Xo.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(Xt("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(wp),Yo.child=e,this.dispatchEvent(Yo),Yo.child=null):Xt("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let i=0;i<arguments.length;i++)this.remove(arguments[i]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(C_),Ih.child=e,this.dispatchEvent(Ih),Ih.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),ua.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),ua.multiply(e.parent.matrixWorld)),e.applyMatrix4(ua),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(wp),Yo.child=e,this.dispatchEvent(Yo),Yo.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let i=0,r=this.children.length;i<r;i++){const u=this.children[i].getObjectByProperty(e,t);if(u!==void 0)return u}}getObjectsByProperty(e,t,i=[]){this[e]===t&&i.push(this);const r=this.children;for(let c=0,u=r.length;c<u;c++)r[c].getObjectsByProperty(e,t,i);return i}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(uc,e,A_),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(uc,R_,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let i=0,r=t.length;i<r;i++)t[i].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let i=0,r=t.length;i<r;i++)t[i].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);const e=this.pivot;if(e!==null){const t=e.x,i=e.y,r=e.z,c=this.matrix.elements;c[12]+=t-c[0]*t-c[4]*i-c[8]*r,c[13]+=i-c[1]*t-c[5]*i-c[9]*r,c[14]+=r-c[2]*t-c[6]*i-c[10]*r}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let i=0,r=t.length;i<r;i++)t[i].updateMatrixWorld(e)}updateWorldMatrix(e,t,i=!1){const r=this.parent;if(e===!0&&r!==null&&r.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||i)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,i=!0),t===!0){const c=this.children;for(let u=0,d=c.length;u<d;u++)c[u].updateWorldMatrix(!1,!0,i)}}toJSON(e){const t=e===void 0||typeof e=="string",i={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},i.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const r={};r.uuid=this.uuid,r.type=this.type,this.name!==""&&(r.name=this.name),this.castShadow===!0&&(r.castShadow=!0),this.receiveShadow===!0&&(r.receiveShadow=!0),this.visible===!1&&(r.visible=!1),this.frustumCulled===!1&&(r.frustumCulled=!1),this.renderOrder!==0&&(r.renderOrder=this.renderOrder),this.static!==!1&&(r.static=this.static),Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.pivot!==null&&(r.pivot=this.pivot.toArray()),this.matrixAutoUpdate===!1&&(r.matrixAutoUpdate=!1),this.morphTargetDictionary!==void 0&&(r.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(r.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(r.type="InstancedMesh",r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type="BatchedMesh",r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.geometryInfo=this._geometryInfo.map(d=>({...d,boundingBox:d.boundingBox?d.boundingBox.toJSON():void 0,boundingSphere:d.boundingSphere?d.boundingSphere.toJSON():void 0})),r.instanceInfo=this._instanceInfo.map(d=>({...d})),r.availableInstanceIds=this._availableInstanceIds.slice(),r.availableGeometryIds=this._availableGeometryIds.slice(),r.nextIndexStart=this._nextIndexStart,r.nextVertexStart=this._nextVertexStart,r.geometryCount=this._geometryCount,r.maxInstanceCount=this._maxInstanceCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.matricesTexture=this._matricesTexture.toJSON(e),r.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(r.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(r.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(r.boundingBox=this.boundingBox.toJSON()));function c(d,m){return d[m.uuid]===void 0&&(d[m.uuid]=m.toJSON(e)),m.uuid}if(this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=c(e.geometries,this.geometry);const d=this.geometry.parameters;if(d!==void 0&&d.shapes!==void 0){const m=d.shapes;if(Array.isArray(m))for(let p=0,g=m.length;p<g;p++){const b=m[p];c(e.shapes,b)}else c(e.shapes,m)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(c(e.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const d=[];for(let m=0,p=this.material.length;m<p;m++)d.push(c(e.materials,this.material[m]));r.material=d}else r.material=c(e.materials,this.material);if(this.children.length>0){r.children=[];for(let d=0;d<this.children.length;d++)r.children.push(this.children[d].toJSON(e).object)}if(this.animations.length>0){r.animations=[];for(let d=0;d<this.animations.length;d++){const m=this.animations[d];r.animations.push(c(e.animations,m))}}if(t){const d=u(e.geometries),m=u(e.materials),p=u(e.textures),g=u(e.images),b=u(e.shapes),x=u(e.skeletons),M=u(e.animations),A=u(e.nodes);d.length>0&&(i.geometries=d),m.length>0&&(i.materials=m),p.length>0&&(i.textures=p),g.length>0&&(i.images=g),b.length>0&&(i.shapes=b),x.length>0&&(i.skeletons=x),M.length>0&&(i.animations=M),A.length>0&&(i.nodes=A)}return i.object=r,i;function u(d){const m=[];for(const p in d){const g=d[p];delete g.metadata,m.push(g)}return m}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.pivot=e.pivot!==null?e.pivot.clone():null,this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let i=0;i<e.children.length;i++){const r=e.children[i];this.add(r.clone())}return this}}ai.DEFAULT_UP=new se(0,1,0);ai.DEFAULT_MATRIX_AUTO_UPDATE=!0;ai.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;class xc extends ai{constructor(){super(),this.isGroup=!0,this.type="Group"}}const P_={type:"move"};class Lh{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new xc,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new xc,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new se,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new se),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new xc,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new se,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new se,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const i of e.hand.values())this._getHandJoint(t,i)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,i){let r=null,c=null,u=null;const d=this._targetRay,m=this._grip,p=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(p&&e.hand){u=!0;for(const C of e.hand.values()){const T=t.getJointPose(C,i),S=this._getHandJoint(p,C);T!==null&&(S.matrix.fromArray(T.transform.matrix),S.matrix.decompose(S.position,S.rotation,S.scale),S.matrixWorldNeedsUpdate=!0,S.jointRadius=T.radius),S.visible=T!==null}const g=p.joints["index-finger-tip"],b=p.joints["thumb-tip"],x=g.position.distanceTo(b.position),M=.02,A=.005;p.inputState.pinching&&x>M+A?(p.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!p.inputState.pinching&&x<=M-A&&(p.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else m!==null&&e.gripSpace&&(c=t.getPose(e.gripSpace,i),c!==null&&(m.matrix.fromArray(c.transform.matrix),m.matrix.decompose(m.position,m.rotation,m.scale),m.matrixWorldNeedsUpdate=!0,c.linearVelocity?(m.hasLinearVelocity=!0,m.linearVelocity.copy(c.linearVelocity)):m.hasLinearVelocity=!1,c.angularVelocity?(m.hasAngularVelocity=!0,m.angularVelocity.copy(c.angularVelocity)):m.hasAngularVelocity=!1,m.eventsEnabled&&m.dispatchEvent({type:"gripUpdated",data:e,target:this})));d!==null&&(r=t.getPose(e.targetRaySpace,i),r===null&&c!==null&&(r=c),r!==null&&(d.matrix.fromArray(r.transform.matrix),d.matrix.decompose(d.position,d.rotation,d.scale),d.matrixWorldNeedsUpdate=!0,r.linearVelocity?(d.hasLinearVelocity=!0,d.linearVelocity.copy(r.linearVelocity)):d.hasLinearVelocity=!1,r.angularVelocity?(d.hasAngularVelocity=!0,d.angularVelocity.copy(r.angularVelocity)):d.hasAngularVelocity=!1,this.dispatchEvent(P_)))}return d!==null&&(d.visible=r!==null),m!==null&&(m.visible=c!==null),p!==null&&(p.visible=u!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const i=new xc;i.matrixAutoUpdate=!1,i.visible=!1,e.joints[t.jointName]=i,e.add(i)}return e.joints[t.jointName]}}const jm={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Za={h:0,s:0,l:0},ou={h:0,s:0,l:0};function Nh(n,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?n+(e-n)*6*t:t<1/2?e:t<2/3?n+(e-n)*6*(2/3-t):n}class It{constructor(e,t,i){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,i)}set(e,t,i){if(t===void 0&&i===void 0){const r=e;r&&r.isColor?this.copy(r):typeof r=="number"?this.setHex(r):typeof r=="string"&&this.setStyle(r)}else this.setRGB(e,t,i);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Ki){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,Gt.colorSpaceToWorking(this,t),this}setRGB(e,t,i,r=Gt.workingColorSpace){return this.r=e,this.g=t,this.b=i,Gt.colorSpaceToWorking(this,r),this}setHSL(e,t,i,r=Gt.workingColorSpace){if(e=g_(e,1),t=Rt(t,0,1),i=Rt(i,0,1),t===0)this.r=this.g=this.b=i;else{const c=i<=.5?i*(1+t):i+t-i*t,u=2*i-c;this.r=Nh(u,c,e+1/3),this.g=Nh(u,c,e),this.b=Nh(u,c,e-1/3)}return Gt.colorSpaceToWorking(this,r),this}setStyle(e,t=Ki){function i(c){c!==void 0&&parseFloat(c)<1&&ft("Color: Alpha component of "+e+" will be ignored.")}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(e)){let c;const u=r[1],d=r[2];switch(u){case"rgb":case"rgba":if(c=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(d))return i(c[4]),this.setRGB(Math.min(255,parseInt(c[1],10))/255,Math.min(255,parseInt(c[2],10))/255,Math.min(255,parseInt(c[3],10))/255,t);if(c=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(d))return i(c[4]),this.setRGB(Math.min(100,parseInt(c[1],10))/100,Math.min(100,parseInt(c[2],10))/100,Math.min(100,parseInt(c[3],10))/100,t);break;case"hsl":case"hsla":if(c=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(d))return i(c[4]),this.setHSL(parseFloat(c[1])/360,parseFloat(c[2])/100,parseFloat(c[3])/100,t);break;default:ft("Color: Unknown color model "+e)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(e)){const c=r[1],u=c.length;if(u===3)return this.setRGB(parseInt(c.charAt(0),16)/15,parseInt(c.charAt(1),16)/15,parseInt(c.charAt(2),16)/15,t);if(u===6)return this.setHex(parseInt(c,16),t);ft("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Ki){const i=jm[e.toLowerCase()];return i!==void 0?this.setHex(i,t):ft("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=Ma(e.r),this.g=Ma(e.g),this.b=Ma(e.b),this}copyLinearToSRGB(e){return this.r=sl(e.r),this.g=sl(e.g),this.b=sl(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Ki){return Gt.workingToColorSpace(hi.copy(this),e),Math.round(Rt(hi.r*255,0,255))*65536+Math.round(Rt(hi.g*255,0,255))*256+Math.round(Rt(hi.b*255,0,255))}getHexString(e=Ki){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=Gt.workingColorSpace){Gt.workingToColorSpace(hi.copy(this),t);const i=hi.r,r=hi.g,c=hi.b,u=Math.max(i,r,c),d=Math.min(i,r,c);let m,p;const g=(d+u)/2;if(d===u)m=0,p=0;else{const b=u-d;switch(p=g<=.5?b/(u+d):b/(2-u-d),u){case i:m=(r-c)/b+(r<c?6:0);break;case r:m=(c-i)/b+2;break;case c:m=(i-r)/b+4;break}m/=6}return e.h=m,e.s=p,e.l=g,e}getRGB(e,t=Gt.workingColorSpace){return Gt.workingToColorSpace(hi.copy(this),t),e.r=hi.r,e.g=hi.g,e.b=hi.b,e}getStyle(e=Ki){Gt.workingToColorSpace(hi.copy(this),e);const t=hi.r,i=hi.g,r=hi.b;return e!==Ki?`color(${e} ${t.toFixed(3)} ${i.toFixed(3)} ${r.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(i*255)},${Math.round(r*255)})`}offsetHSL(e,t,i){return this.getHSL(Za),this.setHSL(Za.h+e,Za.s+t,Za.l+i)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,i){return this.r=e.r+(t.r-e.r)*i,this.g=e.g+(t.g-e.g)*i,this.b=e.b+(t.b-e.b)*i,this}lerpHSL(e,t){this.getHSL(Za),e.getHSL(ou);const i=Ah(Za.h,ou.h,t),r=Ah(Za.s,ou.s,t),c=Ah(Za.l,ou.l,t);return this.setHSL(i,r,c),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,i=this.g,r=this.b,c=e.elements;return this.r=c[0]*t+c[3]*i+c[6]*r,this.g=c[1]*t+c[4]*i+c[7]*r,this.b=c[2]*t+c[5]*i+c[8]*r,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const hi=new It;It.NAMES=jm;class D_ extends ai{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new as,this.environmentIntensity=1,this.environmentRotation=new as,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}const fr=new se,ha=new se,Fh=new se,fa=new se,Zo=new se,Ko=new se,Ap=new se,Uh=new se,Oh=new se,Bh=new se,kh=new yn,zh=new yn,Hh=new yn;class mr{constructor(e=new se,t=new se,i=new se){this.a=e,this.b=t,this.c=i}static getNormal(e,t,i,r){r.subVectors(i,t),fr.subVectors(e,t),r.cross(fr);const c=r.lengthSq();return c>0?r.multiplyScalar(1/Math.sqrt(c)):r.set(0,0,0)}static getBarycoord(e,t,i,r,c){fr.subVectors(r,t),ha.subVectors(i,t),Fh.subVectors(e,t);const u=fr.dot(fr),d=fr.dot(ha),m=fr.dot(Fh),p=ha.dot(ha),g=ha.dot(Fh),b=u*p-d*d;if(b===0)return c.set(0,0,0),null;const x=1/b,M=(p*m-d*g)*x,A=(u*g-d*m)*x;return c.set(1-M-A,A,M)}static containsPoint(e,t,i,r){return this.getBarycoord(e,t,i,r,fa)===null?!1:fa.x>=0&&fa.y>=0&&fa.x+fa.y<=1}static getInterpolation(e,t,i,r,c,u,d,m){return this.getBarycoord(e,t,i,r,fa)===null?(m.x=0,m.y=0,"z"in m&&(m.z=0),"w"in m&&(m.w=0),null):(m.setScalar(0),m.addScaledVector(c,fa.x),m.addScaledVector(u,fa.y),m.addScaledVector(d,fa.z),m)}static getInterpolatedAttribute(e,t,i,r,c,u){return kh.setScalar(0),zh.setScalar(0),Hh.setScalar(0),kh.fromBufferAttribute(e,t),zh.fromBufferAttribute(e,i),Hh.fromBufferAttribute(e,r),u.setScalar(0),u.addScaledVector(kh,c.x),u.addScaledVector(zh,c.y),u.addScaledVector(Hh,c.z),u}static isFrontFacing(e,t,i,r){return fr.subVectors(i,t),ha.subVectors(e,t),fr.cross(ha).dot(r)<0}set(e,t,i){return this.a.copy(e),this.b.copy(t),this.c.copy(i),this}setFromPointsAndIndices(e,t,i,r){return this.a.copy(e[t]),this.b.copy(e[i]),this.c.copy(e[r]),this}setFromAttributeAndIndices(e,t,i,r){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,i),this.c.fromBufferAttribute(e,r),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return fr.subVectors(this.c,this.b),ha.subVectors(this.a,this.b),fr.cross(ha).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return mr.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return mr.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,i,r,c){return mr.getInterpolation(e,this.a,this.b,this.c,t,i,r,c)}containsPoint(e){return mr.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return mr.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const i=this.a,r=this.b,c=this.c;let u,d;Zo.subVectors(r,i),Ko.subVectors(c,i),Uh.subVectors(e,i);const m=Zo.dot(Uh),p=Ko.dot(Uh);if(m<=0&&p<=0)return t.copy(i);Oh.subVectors(e,r);const g=Zo.dot(Oh),b=Ko.dot(Oh);if(g>=0&&b<=g)return t.copy(r);const x=m*b-g*p;if(x<=0&&m>=0&&g<=0)return u=m/(m-g),t.copy(i).addScaledVector(Zo,u);Bh.subVectors(e,c);const M=Zo.dot(Bh),A=Ko.dot(Bh);if(A>=0&&M<=A)return t.copy(c);const C=M*p-m*A;if(C<=0&&p>=0&&A<=0)return d=p/(p-A),t.copy(i).addScaledVector(Ko,d);const T=g*A-M*b;if(T<=0&&b-g>=0&&M-A>=0)return Ap.subVectors(c,r),d=(b-g)/(b-g+(M-A)),t.copy(r).addScaledVector(Ap,d);const S=1/(T+C+x);return u=C*S,d=x*S,t.copy(i).addScaledVector(Zo,u).addScaledVector(Ko,d)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}class wc{constructor(e=new se(1/0,1/0,1/0),t=new se(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t+=3)this.expandByPoint(dr.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,i=e.count;t<i;t++)this.expandByPoint(dr.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const i=dr.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(i),this.max.copy(e).add(i),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const i=e.geometry;if(i!==void 0){const c=i.getAttribute("position");if(t===!0&&c!==void 0&&e.isInstancedMesh!==!0)for(let u=0,d=c.count;u<d;u++)e.isMesh===!0?e.getVertexPosition(u,dr):dr.fromBufferAttribute(c,u),dr.applyMatrix4(e.matrixWorld),this.expandByPoint(dr);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),lu.copy(e.boundingBox)):(i.boundingBox===null&&i.computeBoundingBox(),lu.copy(i.boundingBox)),lu.applyMatrix4(e.matrixWorld),this.union(lu)}const r=e.children;for(let c=0,u=r.length;c<u;c++)this.expandByObject(r[c],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,dr),dr.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,i;return e.normal.x>0?(t=e.normal.x*this.min.x,i=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,i=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,i+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,i+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,i+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,i+=e.normal.z*this.min.z),t<=-e.constant&&i>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(hc),cu.subVectors(this.max,hc),Jo.subVectors(e.a,hc),Qo.subVectors(e.b,hc),qo.subVectors(e.c,hc),Ka.subVectors(Qo,Jo),Ja.subVectors(qo,Qo),Gs.subVectors(Jo,qo);let t=[0,-Ka.z,Ka.y,0,-Ja.z,Ja.y,0,-Gs.z,Gs.y,Ka.z,0,-Ka.x,Ja.z,0,-Ja.x,Gs.z,0,-Gs.x,-Ka.y,Ka.x,0,-Ja.y,Ja.x,0,-Gs.y,Gs.x,0];return!Gh(t,Jo,Qo,qo,cu)||(t=[1,0,0,0,1,0,0,0,1],!Gh(t,Jo,Qo,qo,cu))?!1:(uu.crossVectors(Ka,Ja),t=[uu.x,uu.y,uu.z],Gh(t,Jo,Qo,qo,cu))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,dr).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(dr).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(da[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),da[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),da[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),da[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),da[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),da[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),da[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),da[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(da),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}}const da=[new se,new se,new se,new se,new se,new se,new se,new se],dr=new se,lu=new wc,Jo=new se,Qo=new se,qo=new se,Ka=new se,Ja=new se,Gs=new se,hc=new se,cu=new se,uu=new se,Vs=new se;function Gh(n,e,t,i,r){for(let c=0,u=n.length-3;c<=u;c+=3){Vs.fromArray(n,c);const d=r.x*Math.abs(Vs.x)+r.y*Math.abs(Vs.y)+r.z*Math.abs(Vs.z),m=e.dot(Vs),p=t.dot(Vs),g=i.dot(Vs);if(Math.max(-Math.max(m,p,g),Math.min(m,p,g))>d)return!1}return!0}const In=new se,hu=new pt;let I_=0;class Gr extends ss{constructor(e,t,i=!1){if(super(),Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:I_++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=i,this.usage=dp,this.updateRanges=[],this.gpuType=Br,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,i){e*=this.itemSize,i*=t.itemSize;for(let r=0,c=this.itemSize;r<c;r++)this.array[e+r]=t.array[i+r];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,i=this.count;t<i;t++)hu.fromBufferAttribute(this,t),hu.applyMatrix3(e),this.setXY(t,hu.x,hu.y);else if(this.itemSize===3)for(let t=0,i=this.count;t<i;t++)In.fromBufferAttribute(this,t),In.applyMatrix3(e),this.setXYZ(t,In.x,In.y,In.z);return this}applyMatrix4(e){for(let t=0,i=this.count;t<i;t++)In.fromBufferAttribute(this,t),In.applyMatrix4(e),this.setXYZ(t,In.x,In.y,In.z);return this}applyNormalMatrix(e){for(let t=0,i=this.count;t<i;t++)In.fromBufferAttribute(this,t),In.applyNormalMatrix(e),this.setXYZ(t,In.x,In.y,In.z);return this}transformDirection(e){for(let t=0,i=this.count;t<i;t++)In.fromBufferAttribute(this,t),In.transformDirection(e),this.setXYZ(t,In.x,In.y,In.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let i=this.array[e*this.itemSize+t];return this.normalized&&(i=cc(i,this.array)),i}setComponent(e,t,i){return this.normalized&&(i=Pi(i,this.array)),this.array[e*this.itemSize+t]=i,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=cc(t,this.array)),t}setX(e,t){return this.normalized&&(t=Pi(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=cc(t,this.array)),t}setY(e,t){return this.normalized&&(t=Pi(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=cc(t,this.array)),t}setZ(e,t){return this.normalized&&(t=Pi(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=cc(t,this.array)),t}setW(e,t){return this.normalized&&(t=Pi(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,i){return e*=this.itemSize,this.normalized&&(t=Pi(t,this.array),i=Pi(i,this.array)),this.array[e+0]=t,this.array[e+1]=i,this}setXYZ(e,t,i,r){return e*=this.itemSize,this.normalized&&(t=Pi(t,this.array),i=Pi(i,this.array),r=Pi(r,this.array)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=r,this}setXYZW(e,t,i,r,c){return e*=this.itemSize,this.normalized&&(t=Pi(t,this.array),i=Pi(i,this.array),r=Pi(r,this.array),c=Pi(c,this.array)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=r,this.array[e+3]=c,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==dp&&(e.usage=this.usage),e}dispose(){this.dispatchEvent({type:"dispose"})}}class $m extends Gr{constructor(e,t,i){super(new Uint16Array(e),t,i)}}class eg extends Gr{constructor(e,t,i){super(new Uint32Array(e),t,i)}}class Mi extends Gr{constructor(e,t,i){super(new Float32Array(e),t,i)}}const L_=new wc,fc=new se,Vh=new se;class md{constructor(e=new se,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const i=this.center;t!==void 0?i.copy(t):L_.setFromPoints(e).getCenter(i);let r=0;for(let c=0,u=e.length;c<u;c++)r=Math.max(r,i.distanceToSquared(e[c]));return this.radius=Math.sqrt(r),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const i=this.center.distanceToSquared(e);return t.copy(e),i>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;fc.subVectors(e,this.center);const t=fc.lengthSq();if(t>this.radius*this.radius){const i=Math.sqrt(t),r=(i-this.radius)*.5;this.center.addScaledVector(fc,r/i),this.radius+=r}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(Vh.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(fc.copy(e.center).add(Vh)),this.expandByPoint(fc.copy(e.center).sub(Vh))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}}let N_=0;const Zi=new Sn,Wh=new ai,jo=new se,Bi=new wc,dc=new wc,jn=new se;class _r extends ss{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:N_++}),this.uuid=Tc(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(f_(e)?eg:$m)(e,1):this.index=e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,i=0){this.groups.push({start:e,count:t,materialIndex:i})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const i=this.attributes.normal;if(i!==void 0){const c=new xt().getNormalMatrix(e);i.applyNormalMatrix(c),i.needsUpdate=!0}const r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(e),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(e){return Zi.makeRotationFromQuaternion(e),this.applyMatrix4(Zi),this}rotateX(e){return Zi.makeRotationX(e),this.applyMatrix4(Zi),this}rotateY(e){return Zi.makeRotationY(e),this.applyMatrix4(Zi),this}rotateZ(e){return Zi.makeRotationZ(e),this.applyMatrix4(Zi),this}translate(e,t,i){return Zi.makeTranslation(e,t,i),this.applyMatrix4(Zi),this}scale(e,t,i){return Zi.makeScale(e,t,i),this.applyMatrix4(Zi),this}lookAt(e){return Wh.lookAt(e),Wh.updateMatrix(),this.applyMatrix4(Wh.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(jo).negate(),this.translate(jo.x,jo.y,jo.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const i=[];for(let r=0,c=e.length;r<c;r++){const u=e[r];i.push(u.x,u.y,u.z||0)}this.setAttribute("position",new Mi(i,3))}else{const i=Math.min(e.length,t.count);for(let r=0;r<i;r++){const c=e[r];t.setXYZ(r,c.x,c.y,c.z||0)}e.length>t.count&&ft("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new wc);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Xt("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new se(-1/0,-1/0,-1/0),new se(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let i=0,r=t.length;i<r;i++){const c=t[i];Bi.setFromBufferAttribute(c),this.morphTargetsRelative?(jn.addVectors(this.boundingBox.min,Bi.min),this.boundingBox.expandByPoint(jn),jn.addVectors(this.boundingBox.max,Bi.max),this.boundingBox.expandByPoint(jn)):(this.boundingBox.expandByPoint(Bi.min),this.boundingBox.expandByPoint(Bi.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&Xt('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new md);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Xt("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new se,1/0);return}if(e){const i=this.boundingSphere.center;if(Bi.setFromBufferAttribute(e),t)for(let c=0,u=t.length;c<u;c++){const d=t[c];dc.setFromBufferAttribute(d),this.morphTargetsRelative?(jn.addVectors(Bi.min,dc.min),Bi.expandByPoint(jn),jn.addVectors(Bi.max,dc.max),Bi.expandByPoint(jn)):(Bi.expandByPoint(dc.min),Bi.expandByPoint(dc.max))}Bi.getCenter(i);let r=0;for(let c=0,u=e.count;c<u;c++)jn.fromBufferAttribute(e,c),r=Math.max(r,i.distanceToSquared(jn));if(t)for(let c=0,u=t.length;c<u;c++){const d=t[c],m=this.morphTargetsRelative;for(let p=0,g=d.count;p<g;p++)jn.fromBufferAttribute(d,p),m&&(jo.fromBufferAttribute(e,p),jn.add(jo)),r=Math.max(r,i.distanceToSquared(jn))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&Xt('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){Xt("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const i=t.position,r=t.normal,c=t.uv;let u=this.getAttribute("tangent");(u===void 0||u.count!==i.count)&&(u=new Gr(new Float32Array(4*i.count),4),this.setAttribute("tangent",u));const d=[],m=[];for(let w=0;w<i.count;w++)d[w]=new se,m[w]=new se;const p=new se,g=new se,b=new se,x=new pt,M=new pt,A=new pt,C=new se,T=new se;function S(w,F,Z){p.fromBufferAttribute(i,w),g.fromBufferAttribute(i,F),b.fromBufferAttribute(i,Z),x.fromBufferAttribute(c,w),M.fromBufferAttribute(c,F),A.fromBufferAttribute(c,Z),g.sub(p),b.sub(p),M.sub(x),A.sub(x);const X=1/(M.x*A.y-A.x*M.y);isFinite(X)&&(C.copy(g).multiplyScalar(A.y).addScaledVector(b,-M.y).multiplyScalar(X),T.copy(b).multiplyScalar(M.x).addScaledVector(g,-A.x).multiplyScalar(X),d[w].add(C),d[F].add(C),d[Z].add(C),m[w].add(T),m[F].add(T),m[Z].add(T))}let B=this.groups;B.length===0&&(B=[{start:0,count:e.count}]);for(let w=0,F=B.length;w<F;++w){const Z=B[w],X=Z.start,ne=Z.count;for(let pe=X,_e=X+ne;pe<_e;pe+=3)S(e.getX(pe+0),e.getX(pe+1),e.getX(pe+2))}const G=new se,D=new se,z=new se,U=new se;function W(w){z.fromBufferAttribute(r,w),U.copy(z);const F=d[w];G.copy(F),G.sub(z.multiplyScalar(z.dot(F))).normalize(),D.crossVectors(U,F);const X=D.dot(m[w])<0?-1:1;u.setXYZW(w,G.x,G.y,G.z,X)}for(let w=0,F=B.length;w<F;++w){const Z=B[w],X=Z.start,ne=Z.count;for(let pe=X,_e=X+ne;pe<_e;pe+=3)W(e.getX(pe+0)),W(e.getX(pe+1)),W(e.getX(pe+2))}this._transformed=!0}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let i=this.getAttribute("normal");if(i===void 0||i.count!==t.count)i=new Gr(new Float32Array(t.count*3),3),this.setAttribute("normal",i);else for(let x=0,M=i.count;x<M;x++)i.setXYZ(x,0,0,0);const r=new se,c=new se,u=new se,d=new se,m=new se,p=new se,g=new se,b=new se;if(e)for(let x=0,M=e.count;x<M;x+=3){const A=e.getX(x+0),C=e.getX(x+1),T=e.getX(x+2);r.fromBufferAttribute(t,A),c.fromBufferAttribute(t,C),u.fromBufferAttribute(t,T),g.subVectors(u,c),b.subVectors(r,c),g.cross(b),d.fromBufferAttribute(i,A),m.fromBufferAttribute(i,C),p.fromBufferAttribute(i,T),d.add(g),m.add(g),p.add(g),i.setXYZ(A,d.x,d.y,d.z),i.setXYZ(C,m.x,m.y,m.z),i.setXYZ(T,p.x,p.y,p.z)}else for(let x=0,M=t.count;x<M;x+=3)r.fromBufferAttribute(t,x+0),c.fromBufferAttribute(t,x+1),u.fromBufferAttribute(t,x+2),g.subVectors(u,c),b.subVectors(r,c),g.cross(b),i.setXYZ(x+0,g.x,g.y,g.z),i.setXYZ(x+1,g.x,g.y,g.z),i.setXYZ(x+2,g.x,g.y,g.z);this.normalizeNormals(),i.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,i=e.count;t<i;t++)jn.fromBufferAttribute(e,t),jn.normalize(),e.setXYZ(t,jn.x,jn.y,jn.z)}toNonIndexed(){function e(d,m){const p=d.array,g=d.itemSize,b=d.normalized,x=new p.constructor(m.length*g);let M=0,A=0;for(let C=0,T=m.length;C<T;C++){d.isInterleavedBufferAttribute?M=m[C]*d.data.stride+d.offset:M=m[C]*g;for(let S=0;S<g;S++)x[A++]=p[M++]}return new Gr(x,g,b)}if(this.index===null)return ft("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new _r,i=this.index.array,r=this.attributes;for(const d in r){const m=r[d],p=e(m,i);t.setAttribute(d,p)}const c=this.morphAttributes;for(const d in c){const m=[],p=c[d];for(let g=0,b=p.length;g<b;g++){const x=p[g],M=e(x,i);m.push(M)}t.morphAttributes[d]=m}t.morphTargetsRelative=this.morphTargetsRelative;const u=this.groups;for(let d=0,m=u.length;d<m;d++){const p=u[d];t.addGroup(p.start,p.count,p.materialIndex)}return t}toJSON(){const e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){const m=this.parameters;for(const p in m)m[p]!==void 0&&(e[p]=m[p]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const i=this.attributes;for(const m in i){const p=i[m];e.data.attributes[m]=p.toJSON(e.data)}const r={};let c=!1;for(const m in this.morphAttributes){const p=this.morphAttributes[m],g=[];for(let b=0,x=p.length;b<x;b++){const M=p[b];g.push(M.toJSON(e.data))}g.length>0&&(r[m]=g,c=!0)}c&&(e.data.morphAttributes=r,e.data.morphTargetsRelative=this.morphTargetsRelative);const u=this.groups;u.length>0&&(e.data.groups=JSON.parse(JSON.stringify(u)));const d=this.boundingSphere;return d!==null&&(e.data.boundingSphere=d.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const i=e.index;i!==null&&this.setIndex(i.clone());const r=e.attributes;for(const p in r){const g=r[p];this.setAttribute(p,g.clone(t))}const c=e.morphAttributes;for(const p in c){const g=[],b=c[p];for(let x=0,M=b.length;x<M;x++)g.push(b[x].clone(t));this.morphAttributes[p]=g}this.morphTargetsRelative=e.morphTargetsRelative;const u=e.groups;for(let p=0,g=u.length;p<g;p++){const b=u[p];this.addGroup(b.start,b.count,b.materialIndex)}const d=e.boundingBox;d!==null&&(this.boundingBox=d.clone());const m=e.boundingSphere;return m!==null&&(this.boundingSphere=m.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this._transformed=e._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}}let F_=0;class Ac extends ss{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:F_++}),this.uuid=Tc(),this.name="",this.type="Material",this.blending=rl,this.side=is,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=uf,this.blendDst=hf,this.blendEquation=Qs,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new It(0,0,0),this.blendAlpha=0,this.depthFunc=ll,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=fp,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Go,this.stencilZFail=Go,this.stencilZPass=Go,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const i=e[t];if(i===void 0){ft(`Material: parameter '${t}' has value of undefined.`);continue}const r=this[t];if(r===void 0){ft(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}r&&r.isColor?r.set(i):r&&r.isVector2&&i&&i.isVector2||r&&r.isEuler&&i&&i.isEuler||r&&r.isVector3&&i&&i.isVector3?r.copy(i):this[t]=i}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const i={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.color&&this.color.isColor&&(i.color=this.color.getHex()),this.roughness!==void 0&&(i.roughness=this.roughness),this.metalness!==void 0&&(i.metalness=this.metalness),this.sheen!==void 0&&(i.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(i.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(i.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(i.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(i.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(i.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(i.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(i.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(i.shininess=this.shininess),this.clearcoat!==void 0&&(i.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(i.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(i.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(i.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(i.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,i.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(i.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(i.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(i.dispersion=this.dispersion),this.iridescence!==void 0&&(i.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(i.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(i.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(i.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(i.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(i.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(i.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(i.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(i.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(i.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(i.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(i.lightMap=this.lightMap.toJSON(e).uuid,i.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(i.aoMap=this.aoMap.toJSON(e).uuid,i.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(i.bumpMap=this.bumpMap.toJSON(e).uuid,i.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(i.normalMap=this.normalMap.toJSON(e).uuid,i.normalMapType=this.normalMapType,i.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(i.displacementMap=this.displacementMap.toJSON(e).uuid,i.displacementScale=this.displacementScale,i.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(i.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(i.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(i.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(i.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(i.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(i.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(i.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(i.combine=this.combine)),this.envMapRotation!==void 0&&(i.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(i.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(i.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(i.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(i.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(i.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(i.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(i.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(i.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(i.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(i.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(i.size=this.size),this.shadowSide!==null&&(i.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(i.sizeAttenuation=this.sizeAttenuation),this.blending!==rl&&(i.blending=this.blending),this.side!==is&&(i.side=this.side),this.vertexColors===!0&&(i.vertexColors=!0),this.opacity<1&&(i.opacity=this.opacity),this.transparent===!0&&(i.transparent=!0),this.blendSrc!==uf&&(i.blendSrc=this.blendSrc),this.blendDst!==hf&&(i.blendDst=this.blendDst),this.blendEquation!==Qs&&(i.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(i.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(i.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(i.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(i.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(i.blendAlpha=this.blendAlpha),this.depthFunc!==ll&&(i.depthFunc=this.depthFunc),this.depthTest===!1&&(i.depthTest=this.depthTest),this.depthWrite===!1&&(i.depthWrite=this.depthWrite),this.colorWrite===!1&&(i.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(i.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==fp&&(i.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(i.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(i.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Go&&(i.stencilFail=this.stencilFail),this.stencilZFail!==Go&&(i.stencilZFail=this.stencilZFail),this.stencilZPass!==Go&&(i.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(i.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(i.rotation=this.rotation),this.polygonOffset===!0&&(i.polygonOffset=!0),this.polygonOffsetFactor!==0&&(i.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(i.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(i.linewidth=this.linewidth),this.dashSize!==void 0&&(i.dashSize=this.dashSize),this.gapSize!==void 0&&(i.gapSize=this.gapSize),this.scale!==void 0&&(i.scale=this.scale),this.dithering===!0&&(i.dithering=!0),this.alphaTest>0&&(i.alphaTest=this.alphaTest),this.alphaHash===!0&&(i.alphaHash=!0),this.alphaToCoverage===!0&&(i.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(i.premultipliedAlpha=!0),this.forceSinglePass===!0&&(i.forceSinglePass=!0),this.allowOverride===!1&&(i.allowOverride=!1),this.wireframe===!0&&(i.wireframe=!0),this.wireframeLinewidth>1&&(i.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(i.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(i.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(i.flatShading=!0),this.visible===!1&&(i.visible=!1),this.toneMapped===!1&&(i.toneMapped=!1),this.fog===!1&&(i.fog=!1),Object.keys(this.userData).length>0&&(i.userData=this.userData);function r(c){const u=[];for(const d in c){const m=c[d];delete m.metadata,u.push(m)}return u}if(t){const c=r(e.textures),u=r(e.images);c.length>0&&(i.textures=c),u.length>0&&(i.images=u)}return i}fromJSON(e,t){if(e.uuid!==void 0&&(this.uuid=e.uuid),e.name!==void 0&&(this.name=e.name),e.color!==void 0&&this.color!==void 0&&this.color.setHex(e.color),e.roughness!==void 0&&(this.roughness=e.roughness),e.metalness!==void 0&&(this.metalness=e.metalness),e.sheen!==void 0&&(this.sheen=e.sheen),e.sheenColor!==void 0&&(this.sheenColor=new It().setHex(e.sheenColor)),e.sheenRoughness!==void 0&&(this.sheenRoughness=e.sheenRoughness),e.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(e.emissive),e.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(e.specular),e.specularIntensity!==void 0&&(this.specularIntensity=e.specularIntensity),e.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(e.specularColor),e.shininess!==void 0&&(this.shininess=e.shininess),e.clearcoat!==void 0&&(this.clearcoat=e.clearcoat),e.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=e.clearcoatRoughness),e.dispersion!==void 0&&(this.dispersion=e.dispersion),e.iridescence!==void 0&&(this.iridescence=e.iridescence),e.iridescenceIOR!==void 0&&(this.iridescenceIOR=e.iridescenceIOR),e.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=e.iridescenceThicknessRange),e.transmission!==void 0&&(this.transmission=e.transmission),e.thickness!==void 0&&(this.thickness=e.thickness),e.attenuationDistance!==void 0&&(this.attenuationDistance=e.attenuationDistance),e.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(e.attenuationColor),e.anisotropy!==void 0&&(this.anisotropy=e.anisotropy),e.anisotropyRotation!==void 0&&(this.anisotropyRotation=e.anisotropyRotation),e.fog!==void 0&&(this.fog=e.fog),e.flatShading!==void 0&&(this.flatShading=e.flatShading),e.blending!==void 0&&(this.blending=e.blending),e.combine!==void 0&&(this.combine=e.combine),e.side!==void 0&&(this.side=e.side),e.shadowSide!==void 0&&(this.shadowSide=e.shadowSide),e.opacity!==void 0&&(this.opacity=e.opacity),e.transparent!==void 0&&(this.transparent=e.transparent),e.alphaTest!==void 0&&(this.alphaTest=e.alphaTest),e.alphaHash!==void 0&&(this.alphaHash=e.alphaHash),e.depthFunc!==void 0&&(this.depthFunc=e.depthFunc),e.depthTest!==void 0&&(this.depthTest=e.depthTest),e.depthWrite!==void 0&&(this.depthWrite=e.depthWrite),e.colorWrite!==void 0&&(this.colorWrite=e.colorWrite),e.blendSrc!==void 0&&(this.blendSrc=e.blendSrc),e.blendDst!==void 0&&(this.blendDst=e.blendDst),e.blendEquation!==void 0&&(this.blendEquation=e.blendEquation),e.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=e.blendSrcAlpha),e.blendDstAlpha!==void 0&&(this.blendDstAlpha=e.blendDstAlpha),e.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=e.blendEquationAlpha),e.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(e.blendColor),e.blendAlpha!==void 0&&(this.blendAlpha=e.blendAlpha),e.stencilWriteMask!==void 0&&(this.stencilWriteMask=e.stencilWriteMask),e.stencilFunc!==void 0&&(this.stencilFunc=e.stencilFunc),e.stencilRef!==void 0&&(this.stencilRef=e.stencilRef),e.stencilFuncMask!==void 0&&(this.stencilFuncMask=e.stencilFuncMask),e.stencilFail!==void 0&&(this.stencilFail=e.stencilFail),e.stencilZFail!==void 0&&(this.stencilZFail=e.stencilZFail),e.stencilZPass!==void 0&&(this.stencilZPass=e.stencilZPass),e.stencilWrite!==void 0&&(this.stencilWrite=e.stencilWrite),e.wireframe!==void 0&&(this.wireframe=e.wireframe),e.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=e.wireframeLinewidth),e.wireframeLinecap!==void 0&&(this.wireframeLinecap=e.wireframeLinecap),e.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=e.wireframeLinejoin),e.rotation!==void 0&&(this.rotation=e.rotation),e.linewidth!==void 0&&(this.linewidth=e.linewidth),e.dashSize!==void 0&&(this.dashSize=e.dashSize),e.gapSize!==void 0&&(this.gapSize=e.gapSize),e.scale!==void 0&&(this.scale=e.scale),e.polygonOffset!==void 0&&(this.polygonOffset=e.polygonOffset),e.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=e.polygonOffsetFactor),e.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=e.polygonOffsetUnits),e.dithering!==void 0&&(this.dithering=e.dithering),e.alphaToCoverage!==void 0&&(this.alphaToCoverage=e.alphaToCoverage),e.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=e.premultipliedAlpha),e.forceSinglePass!==void 0&&(this.forceSinglePass=e.forceSinglePass),e.allowOverride!==void 0&&(this.allowOverride=e.allowOverride),e.visible!==void 0&&(this.visible=e.visible),e.toneMapped!==void 0&&(this.toneMapped=e.toneMapped),e.userData!==void 0&&(this.userData=e.userData),e.vertexColors!==void 0&&(typeof e.vertexColors=="number"?this.vertexColors=e.vertexColors>0:this.vertexColors=e.vertexColors),e.size!==void 0&&(this.size=e.size),e.sizeAttenuation!==void 0&&(this.sizeAttenuation=e.sizeAttenuation),e.map!==void 0&&(this.map=t[e.map]||null),e.matcap!==void 0&&(this.matcap=t[e.matcap]||null),e.alphaMap!==void 0&&(this.alphaMap=t[e.alphaMap]||null),e.bumpMap!==void 0&&(this.bumpMap=t[e.bumpMap]||null),e.bumpScale!==void 0&&(this.bumpScale=e.bumpScale),e.normalMap!==void 0&&(this.normalMap=t[e.normalMap]||null),e.normalMapType!==void 0&&(this.normalMapType=e.normalMapType),e.normalScale!==void 0){let i=e.normalScale;Array.isArray(i)===!1&&(i=[i,i]),this.normalScale=new pt().fromArray(i)}return e.displacementMap!==void 0&&(this.displacementMap=t[e.displacementMap]||null),e.displacementScale!==void 0&&(this.displacementScale=e.displacementScale),e.displacementBias!==void 0&&(this.displacementBias=e.displacementBias),e.roughnessMap!==void 0&&(this.roughnessMap=t[e.roughnessMap]||null),e.metalnessMap!==void 0&&(this.metalnessMap=t[e.metalnessMap]||null),e.emissiveMap!==void 0&&(this.emissiveMap=t[e.emissiveMap]||null),e.emissiveIntensity!==void 0&&(this.emissiveIntensity=e.emissiveIntensity),e.specularMap!==void 0&&(this.specularMap=t[e.specularMap]||null),e.specularIntensityMap!==void 0&&(this.specularIntensityMap=t[e.specularIntensityMap]||null),e.specularColorMap!==void 0&&(this.specularColorMap=t[e.specularColorMap]||null),e.envMap!==void 0&&(this.envMap=t[e.envMap]||null),e.envMapRotation!==void 0&&this.envMapRotation.fromArray(e.envMapRotation),e.envMapIntensity!==void 0&&(this.envMapIntensity=e.envMapIntensity),e.reflectivity!==void 0&&(this.reflectivity=e.reflectivity),e.refractionRatio!==void 0&&(this.refractionRatio=e.refractionRatio),e.lightMap!==void 0&&(this.lightMap=t[e.lightMap]||null),e.lightMapIntensity!==void 0&&(this.lightMapIntensity=e.lightMapIntensity),e.aoMap!==void 0&&(this.aoMap=t[e.aoMap]||null),e.aoMapIntensity!==void 0&&(this.aoMapIntensity=e.aoMapIntensity),e.gradientMap!==void 0&&(this.gradientMap=t[e.gradientMap]||null),e.clearcoatMap!==void 0&&(this.clearcoatMap=t[e.clearcoatMap]||null),e.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=t[e.clearcoatRoughnessMap]||null),e.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=t[e.clearcoatNormalMap]||null),e.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new pt().fromArray(e.clearcoatNormalScale)),e.iridescenceMap!==void 0&&(this.iridescenceMap=t[e.iridescenceMap]||null),e.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=t[e.iridescenceThicknessMap]||null),e.transmissionMap!==void 0&&(this.transmissionMap=t[e.transmissionMap]||null),e.thicknessMap!==void 0&&(this.thicknessMap=t[e.thicknessMap]||null),e.anisotropyMap!==void 0&&(this.anisotropyMap=t[e.anisotropyMap]||null),e.sheenColorMap!==void 0&&(this.sheenColorMap=t[e.sheenColorMap]||null),e.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=t[e.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let i=null;if(t!==null){const r=t.length;i=new Array(r);for(let c=0;c!==r;++c)i[c]=t[c].clone()}return this.clippingPlanes=i,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}const pa=new se,Xh=new se,fu=new se,Qa=new se,Yh=new se,du=new se,Zh=new se;class tg{constructor(e=new se,t=new se(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,pa)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const i=t.dot(this.direction);return i<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,i)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=pa.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(pa.copy(this.origin).addScaledVector(this.direction,t),pa.distanceToSquared(e))}distanceSqToSegment(e,t,i,r){Xh.copy(e).add(t).multiplyScalar(.5),fu.copy(t).sub(e).normalize(),Qa.copy(this.origin).sub(Xh);const c=e.distanceTo(t)*.5,u=-this.direction.dot(fu),d=Qa.dot(this.direction),m=-Qa.dot(fu),p=Qa.lengthSq(),g=Math.abs(1-u*u);let b,x,M,A;if(g>0)if(b=u*m-d,x=u*d-m,A=c*g,b>=0)if(x>=-A)if(x<=A){const C=1/g;b*=C,x*=C,M=b*(b+u*x+2*d)+x*(u*b+x+2*m)+p}else x=c,b=Math.max(0,-(u*x+d)),M=-b*b+x*(x+2*m)+p;else x=-c,b=Math.max(0,-(u*x+d)),M=-b*b+x*(x+2*m)+p;else x<=-A?(b=Math.max(0,-(-u*c+d)),x=b>0?-c:Math.min(Math.max(-c,-m),c),M=-b*b+x*(x+2*m)+p):x<=A?(b=0,x=Math.min(Math.max(-c,-m),c),M=x*(x+2*m)+p):(b=Math.max(0,-(u*c+d)),x=b>0?c:Math.min(Math.max(-c,-m),c),M=-b*b+x*(x+2*m)+p);else x=u>0?-c:c,b=Math.max(0,-(u*x+d)),M=-b*b+x*(x+2*m)+p;return i&&i.copy(this.origin).addScaledVector(this.direction,b),r&&r.copy(Xh).addScaledVector(fu,x),M}intersectSphere(e,t){pa.subVectors(e.center,this.origin);const i=pa.dot(this.direction),r=pa.dot(pa)-i*i,c=e.radius*e.radius;if(r>c)return null;const u=Math.sqrt(c-r),d=i-u,m=i+u;return m<0?null:d<0?this.at(m,t):this.at(d,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const i=-(this.origin.dot(e.normal)+e.constant)/t;return i>=0?i:null}intersectPlane(e,t){const i=this.distanceToPlane(e);return i===null?null:this.at(i,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let i,r,c,u,d,m;const p=1/this.direction.x,g=1/this.direction.y,b=1/this.direction.z,x=this.origin;return p>=0?(i=(e.min.x-x.x)*p,r=(e.max.x-x.x)*p):(i=(e.max.x-x.x)*p,r=(e.min.x-x.x)*p),g>=0?(c=(e.min.y-x.y)*g,u=(e.max.y-x.y)*g):(c=(e.max.y-x.y)*g,u=(e.min.y-x.y)*g),i>u||c>r||((c>i||isNaN(i))&&(i=c),(u<r||isNaN(r))&&(r=u),b>=0?(d=(e.min.z-x.z)*b,m=(e.max.z-x.z)*b):(d=(e.max.z-x.z)*b,m=(e.min.z-x.z)*b),i>m||d>r)||((d>i||i!==i)&&(i=d),(m<r||r!==r)&&(r=m),r<0)?null:this.at(i>=0?i:r,t)}intersectsBox(e){return this.intersectBox(e,pa)!==null}intersectTriangle(e,t,i,r,c){Yh.subVectors(t,e),du.subVectors(i,e),Zh.crossVectors(Yh,du);let u=this.direction.dot(Zh),d;if(u>0){if(r)return null;d=1}else if(u<0)d=-1,u=-u;else return null;Qa.subVectors(this.origin,e);const m=d*this.direction.dot(du.crossVectors(Qa,du));if(m<0)return null;const p=d*this.direction.dot(Yh.cross(Qa));if(p<0||m+p>u)return null;const g=-d*Qa.dot(Zh);return g<0?null:this.at(g/u,c)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class gd extends Ac{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new It(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new as,this.combine=Nm,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const Rp=new Sn,Ws=new tg,pu=new md,Cp=new se,mu=new se,gu=new se,_u=new se,Kh=new se,xu=new se,Pp=new se,vu=new se;class fi extends ai{constructor(e=new _r,t=new gd){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,i=Object.keys(t);if(i.length>0){const r=t[i[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let c=0,u=r.length;c<u;c++){const d=r[c].name||String(c);this.morphTargetInfluences.push(0),this.morphTargetDictionary[d]=c}}}}getVertexPosition(e,t){const i=this.geometry,r=i.attributes.position,c=i.morphAttributes.position,u=i.morphTargetsRelative;t.fromBufferAttribute(r,e);const d=this.morphTargetInfluences;if(c&&d){xu.set(0,0,0);for(let m=0,p=c.length;m<p;m++){const g=d[m],b=c[m];g!==0&&(Kh.fromBufferAttribute(b,e),u?xu.addScaledVector(Kh,g):xu.addScaledVector(Kh.sub(t),g))}t.add(xu)}return t}raycast(e,t){const i=this.geometry,r=this.material,c=this.matrixWorld;r!==void 0&&(i.boundingSphere===null&&i.computeBoundingSphere(),pu.copy(i.boundingSphere),pu.applyMatrix4(c),Ws.copy(e.ray).recast(e.near),!(pu.containsPoint(Ws.origin)===!1&&(Ws.intersectSphere(pu,Cp)===null||Ws.origin.distanceToSquared(Cp)>(e.far-e.near)**2))&&(Rp.copy(c).invert(),Ws.copy(e.ray).applyMatrix4(Rp),!(i.boundingBox!==null&&Ws.intersectsBox(i.boundingBox)===!1)&&this._computeIntersections(e,t,Ws)))}_computeIntersections(e,t,i){let r;const c=this.geometry,u=this.material,d=c.index,m=c.attributes.position,p=c.attributes.uv,g=c.attributes.uv1,b=c.attributes.normal,x=c.groups,M=c.drawRange;if(d!==null)if(Array.isArray(u))for(let A=0,C=x.length;A<C;A++){const T=x[A],S=u[T.materialIndex],B=Math.max(T.start,M.start),G=Math.min(d.count,Math.min(T.start+T.count,M.start+M.count));for(let D=B,z=G;D<z;D+=3){const U=d.getX(D),W=d.getX(D+1),w=d.getX(D+2);r=bu(this,S,e,i,p,g,b,U,W,w),r&&(r.faceIndex=Math.floor(D/3),r.face.materialIndex=T.materialIndex,t.push(r))}}else{const A=Math.max(0,M.start),C=Math.min(d.count,M.start+M.count);for(let T=A,S=C;T<S;T+=3){const B=d.getX(T),G=d.getX(T+1),D=d.getX(T+2);r=bu(this,u,e,i,p,g,b,B,G,D),r&&(r.faceIndex=Math.floor(T/3),t.push(r))}}else if(m!==void 0)if(Array.isArray(u))for(let A=0,C=x.length;A<C;A++){const T=x[A],S=u[T.materialIndex],B=Math.max(T.start,M.start),G=Math.min(m.count,Math.min(T.start+T.count,M.start+M.count));for(let D=B,z=G;D<z;D+=3){const U=D,W=D+1,w=D+2;r=bu(this,S,e,i,p,g,b,U,W,w),r&&(r.faceIndex=Math.floor(D/3),r.face.materialIndex=T.materialIndex,t.push(r))}}else{const A=Math.max(0,M.start),C=Math.min(m.count,M.start+M.count);for(let T=A,S=C;T<S;T+=3){const B=T,G=T+1,D=T+2;r=bu(this,u,e,i,p,g,b,B,G,D),r&&(r.faceIndex=Math.floor(T/3),t.push(r))}}}}function U_(n,e,t,i,r,c,u,d){let m;if(e.side===Ii?m=i.intersectTriangle(u,c,r,!0,d):m=i.intersectTriangle(r,c,u,e.side===is,d),m===null)return null;vu.copy(d),vu.applyMatrix4(n.matrixWorld);const p=t.ray.origin.distanceTo(vu);return p<t.near||p>t.far?null:{distance:p,point:vu.clone(),object:n}}function bu(n,e,t,i,r,c,u,d,m,p){n.getVertexPosition(d,mu),n.getVertexPosition(m,gu),n.getVertexPosition(p,_u);const g=U_(n,e,t,i,mu,gu,_u,Pp);if(g){const b=new se;mr.getBarycoord(Pp,mu,gu,_u,b),r&&(g.uv=mr.getInterpolatedAttribute(r,d,m,p,b,new pt)),c&&(g.uv1=mr.getInterpolatedAttribute(c,d,m,p,b,new pt)),u&&(g.normal=mr.getInterpolatedAttribute(u,d,m,p,b,new se),g.normal.dot(i.direction)>0&&g.normal.multiplyScalar(-1));const x={a:d,b:m,c:p,normal:new se,materialIndex:0};mr.getNormal(mu,gu,_u,x.normal),g.face=x,g.barycoord=b}return g}class O_ extends mi{constructor(e=null,t=1,i=1,r,c,u,d,m,p=ri,g=ri,b,x){super(null,u,d,m,p,g,r,c,b,x),this.isDataTexture=!0,this.image={data:e,width:t,height:i},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const Jh=new se,B_=new se,k_=new xt;class ja{constructor(e=new se(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,i,r){return this.normal.set(e,t,i),this.constant=r,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,i){const r=Jh.subVectors(i,t).cross(B_.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(r,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t,i=!0){const r=e.delta(Jh),c=this.normal.dot(r);if(c===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const u=-(e.start.dot(this.normal)+this.constant)/c;return i===!0&&(u<0||u>1)?null:t.copy(e.start).addScaledVector(r,u)}intersectsLine(e){const t=this.distanceToPoint(e.start),i=this.distanceToPoint(e.end);return t<0&&i>0||i<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const i=t||k_.getNormalMatrix(e),r=this.coplanarPoint(Jh).applyMatrix4(e),c=this.normal.applyMatrix3(i).normalize();return this.constant=-r.dot(c),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const Xs=new md,z_=new pt(.5,.5),Mu=new se;class _d{constructor(e=new ja,t=new ja,i=new ja,r=new ja,c=new ja,u=new ja){this.planes=[e,t,i,r,c,u]}set(e,t,i,r,c,u){const d=this.planes;return d[0].copy(e),d[1].copy(t),d[2].copy(i),d[3].copy(r),d[4].copy(c),d[5].copy(u),this}copy(e){const t=this.planes;for(let i=0;i<6;i++)t[i].copy(e.planes[i]);return this}setFromProjectionMatrix(e,t=kr,i=!1){const r=this.planes,c=e.elements,u=c[0],d=c[1],m=c[2],p=c[3],g=c[4],b=c[5],x=c[6],M=c[7],A=c[8],C=c[9],T=c[10],S=c[11],B=c[12],G=c[13],D=c[14],z=c[15];if(r[0].setComponents(p-u,M-g,S-A,z-B).normalize(),r[1].setComponents(p+u,M+g,S+A,z+B).normalize(),r[2].setComponents(p+d,M+b,S+C,z+G).normalize(),r[3].setComponents(p-d,M-b,S-C,z-G).normalize(),i)r[4].setComponents(m,x,T,D).normalize(),r[5].setComponents(p-m,M-x,S-T,z-D).normalize();else if(r[4].setComponents(p-m,M-x,S-T,z-D).normalize(),t===kr)r[5].setComponents(p+m,M+x,S+T,z+D).normalize();else if(t===Ec)r[5].setComponents(m,x,T,D).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Xs.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Xs.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Xs)}intersectsSprite(e){Xs.center.set(0,0,0);const t=z_.distanceTo(e.center);return Xs.radius=.7071067811865476+t,Xs.applyMatrix4(e.matrixWorld),this.intersectsSphere(Xs)}intersectsSphere(e){const t=this.planes,i=e.center,r=-e.radius;for(let c=0;c<6;c++)if(t[c].distanceToPoint(i)<r)return!1;return!0}intersectsBox(e){const t=this.planes;for(let i=0;i<6;i++){const r=t[i];if(Mu.x=r.normal.x>0?e.max.x:e.min.x,Mu.y=r.normal.y>0?e.max.y:e.min.y,Mu.z=r.normal.z>0?e.max.z:e.min.z,r.distanceToPoint(Mu)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let i=0;i<6;i++)if(t[i].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class ng extends mi{constructor(e=[],t=no,i,r,c,u,d,m,p,g){super(e,t,i,r,c,u,d,m,p,g),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class H_ extends mi{constructor(e,t,i,r,c,u,d,m,p){super(e,t,i,r,c,u,d,m,p),this.isCanvasTexture=!0,this.needsUpdate=!0}}class ul extends mi{constructor(e,t,i=Vr,r,c,u,d=ri,m=ri,p,g=Sa,b=1){if(g!==Sa&&g!==eo)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const x={width:e,height:t,depth:b};super(x,r,c,u,d,m,g,i,p),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new pd(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}class G_ extends ul{constructor(e,t=Vr,i=no,r,c,u=ri,d=ri,m,p=Sa){const g={width:e,height:e,depth:1},b=[g,g,g,g,g,g];super(e,e,t,i,r,c,u,d,m,p),this.image=b,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}}class ig extends mi{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}}class ns extends _r{constructor(e=1,t=1,i=1,r=1,c=1,u=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:i,widthSegments:r,heightSegments:c,depthSegments:u};const d=this;r=Math.floor(r),c=Math.floor(c),u=Math.floor(u);const m=[],p=[],g=[],b=[];let x=0,M=0;A("z","y","x",-1,-1,i,t,e,u,c,0),A("z","y","x",1,-1,i,t,-e,u,c,1),A("x","z","y",1,1,e,i,t,r,u,2),A("x","z","y",1,-1,e,i,-t,r,u,3),A("x","y","z",1,-1,e,t,i,r,c,4),A("x","y","z",-1,-1,e,t,-i,r,c,5),this.setIndex(m),this.setAttribute("position",new Mi(p,3)),this.setAttribute("normal",new Mi(g,3)),this.setAttribute("uv",new Mi(b,2));function A(C,T,S,B,G,D,z,U,W,w,F){const Z=D/W,X=z/w,ne=D/2,pe=z/2,_e=U/2,re=W+1,H=w+1;let j=0,Ee=0;const Ce=new se;for(let ce=0;ce<H;ce++){const K=ce*X-pe;for(let ue=0;ue<re;ue++){const Pe=ue*Z-ne;Ce[C]=Pe*B,Ce[T]=K*G,Ce[S]=_e,p.push(Ce.x,Ce.y,Ce.z),Ce[C]=0,Ce[T]=0,Ce[S]=U>0?1:-1,g.push(Ce.x,Ce.y,Ce.z),b.push(ue/W),b.push(1-ce/w),j+=1}}for(let ce=0;ce<w;ce++)for(let K=0;K<W;K++){const ue=x+K+re*ce,Pe=x+K+re*(ce+1),tt=x+(K+1)+re*(ce+1),De=x+(K+1)+re*ce;m.push(ue,Pe,De),m.push(Pe,tt,De),Ee+=6}d.addGroup(M,Ee,F),M+=Ee,x+=j}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new ns(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}class xd extends _r{constructor(e=1,t=1,i=1,r=32,c=1,u=!1,d=0,m=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:t,height:i,radialSegments:r,heightSegments:c,openEnded:u,thetaStart:d,thetaLength:m};const p=this;r=Math.floor(r),c=Math.floor(c);const g=[],b=[],x=[],M=[];let A=0;const C=[],T=i/2;let S=0;B(),u===!1&&(e>0&&G(!0),t>0&&G(!1)),this.setIndex(g),this.setAttribute("position",new Mi(b,3)),this.setAttribute("normal",new Mi(x,3)),this.setAttribute("uv",new Mi(M,2));function B(){const D=new se,z=new se;let U=0;const W=(t-e)/i;for(let w=0;w<=c;w++){const F=[],Z=w/c,X=Z*(t-e)+e;for(let ne=0;ne<=r;ne++){const pe=ne/r,_e=pe*m+d,re=Math.sin(_e),H=Math.cos(_e);z.x=X*re,z.y=-Z*i+T,z.z=X*H,b.push(z.x,z.y,z.z),D.set(re,W,H).normalize(),x.push(D.x,D.y,D.z),M.push(pe,1-Z),F.push(A++)}C.push(F)}for(let w=0;w<r;w++)for(let F=0;F<c;F++){const Z=C[F][w],X=C[F+1][w],ne=C[F+1][w+1],pe=C[F][w+1];(e>0||F!==0)&&(g.push(Z,X,pe),U+=3),(t>0||F!==c-1)&&(g.push(X,ne,pe),U+=3)}p.addGroup(S,U,0),S+=U}function G(D){const z=A,U=new pt,W=new se;let w=0;const F=D===!0?e:t,Z=D===!0?1:-1;for(let ne=1;ne<=r;ne++)b.push(0,T*Z,0),x.push(0,Z,0),M.push(.5,.5),A++;const X=A;for(let ne=0;ne<=r;ne++){const _e=ne/r*m+d,re=Math.cos(_e),H=Math.sin(_e);W.x=F*H,W.y=T*Z,W.z=F*re,b.push(W.x,W.y,W.z),x.push(0,Z,0),U.x=re*.5+.5,U.y=H*.5*Z+.5,M.push(U.x,U.y),A++}for(let ne=0;ne<r;ne++){const pe=z+ne,_e=X+ne;D===!0?g.push(_e,_e+1,pe):g.push(_e+1,_e,pe),w+=3}p.addGroup(S,w,D===!0?1:2),S+=w}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new xd(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}}class hl extends _r{constructor(e=1,t=1,i=1,r=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:i,heightSegments:r};const c=e/2,u=t/2,d=Math.floor(i),m=Math.floor(r),p=d+1,g=m+1,b=e/d,x=t/m,M=[],A=[],C=[],T=[];for(let S=0;S<g;S++){const B=S*x-u;for(let G=0;G<p;G++){const D=G*b-c;A.push(D,-B,0),C.push(0,0,1),T.push(G/d),T.push(1-S/m)}}for(let S=0;S<m;S++)for(let B=0;B<d;B++){const G=B+p*S,D=B+p*(S+1),z=B+1+p*(S+1),U=B+1+p*S;M.push(G,D,U),M.push(D,z,U)}this.setIndex(M),this.setAttribute("position",new Mi(A,3)),this.setAttribute("normal",new Mi(C,3)),this.setAttribute("uv",new Mi(T,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new hl(e.width,e.height,e.widthSegments,e.heightSegments)}}class vd extends _r{constructor(e=1,t=32,i=16,r=0,c=Math.PI*2,u=0,d=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:i,phiStart:r,phiLength:c,thetaStart:u,thetaLength:d},t=Math.max(3,Math.floor(t)),i=Math.max(2,Math.floor(i));const m=Math.min(u+d,Math.PI);let p=0;const g=[],b=new se,x=new se,M=[],A=[],C=[],T=[];for(let S=0;S<=i;S++){const B=[],G=S/i,D=u+G*d,z=e*Math.cos(D),U=Math.sqrt(e*e-z*z);let W=0;S===0&&u===0?W=.5/t:S===i&&m===Math.PI&&(W=-.5/t);for(let w=0;w<=t;w++){const F=w/t,Z=r+F*c;b.x=-U*Math.cos(Z),b.y=z,b.z=U*Math.sin(Z),A.push(b.x,b.y,b.z),x.copy(b).normalize(),C.push(x.x,x.y,x.z),T.push(F+W,1-G),B.push(p++)}g.push(B)}for(let S=0;S<i;S++)for(let B=0;B<t;B++){const G=g[S][B+1],D=g[S][B],z=g[S+1][B],U=g[S+1][B+1];(S!==0||u>0)&&M.push(G,D,U),(S!==i-1||m<Math.PI)&&M.push(D,z,U)}this.setIndex(M),this.setAttribute("position",new Mi(A,3)),this.setAttribute("normal",new Mi(C,3)),this.setAttribute("uv",new Mi(T,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new vd(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}}function fl(n){const e={};for(const t in n){e[t]={};for(const i in n[t]){const r=n[t][i];if(Dp(r))r.isRenderTargetTexture?(ft("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][i]=null):e[t][i]=r.clone();else if(Array.isArray(r))if(Dp(r[0])){const c=[];for(let u=0,d=r.length;u<d;u++)c[u]=r[u].clone();e[t][i]=c}else e[t][i]=r.slice();else e[t][i]=r}}return e}function vi(n){const e={};for(let t=0;t<n.length;t++){const i=fl(n[t]);for(const r in i)e[r]=i[r]}return e}function Dp(n){return n&&(n.isColor||n.isMatrix3||n.isMatrix4||n.isVector2||n.isVector3||n.isVector4||n.isTexture||n.isQuaternion)}function V_(n){const e=[];for(let t=0;t<n.length;t++)e.push(n[t].clone());return e}function rg(n){const e=n.getRenderTarget();return e===null?n.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:Gt.workingColorSpace}const W_={clone:fl,merge:vi};var X_=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Y_=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Wr extends Ac{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=X_,this.fragmentShader=Y_,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=fl(e.uniforms),this.uniformsGroups=V_(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const r in this.uniforms){const u=this.uniforms[r].value;u&&u.isTexture?t.uniforms[r]={type:"t",value:u.toJSON(e).uuid}:u&&u.isColor?t.uniforms[r]={type:"c",value:u.getHex()}:u&&u.isVector2?t.uniforms[r]={type:"v2",value:u.toArray()}:u&&u.isVector3?t.uniforms[r]={type:"v3",value:u.toArray()}:u&&u.isVector4?t.uniforms[r]={type:"v4",value:u.toArray()}:u&&u.isMatrix3?t.uniforms[r]={type:"m3",value:u.toArray()}:u&&u.isMatrix4?t.uniforms[r]={type:"m4",value:u.toArray()}:t.uniforms[r]={value:u}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const i={};for(const r in this.extensions)this.extensions[r]===!0&&(i[r]=!0);return Object.keys(i).length>0&&(t.extensions=i),t}fromJSON(e,t){if(super.fromJSON(e,t),e.uniforms!==void 0)for(const i in e.uniforms){const r=e.uniforms[i];switch(this.uniforms[i]={},r.type){case"t":this.uniforms[i].value=t[r.value]||null;break;case"c":this.uniforms[i].value=new It().setHex(r.value);break;case"v2":this.uniforms[i].value=new pt().fromArray(r.value);break;case"v3":this.uniforms[i].value=new se().fromArray(r.value);break;case"v4":this.uniforms[i].value=new yn().fromArray(r.value);break;case"m3":this.uniforms[i].value=new xt().fromArray(r.value);break;case"m4":this.uniforms[i].value=new Sn().fromArray(r.value);break;default:this.uniforms[i].value=r.value}}if(e.defines!==void 0&&(this.defines=e.defines),e.vertexShader!==void 0&&(this.vertexShader=e.vertexShader),e.fragmentShader!==void 0&&(this.fragmentShader=e.fragmentShader),e.glslVersion!==void 0&&(this.glslVersion=e.glslVersion),e.extensions!==void 0)for(const i in e.extensions)this.extensions[i]=e.extensions[i];return e.lights!==void 0&&(this.lights=e.lights),e.clipping!==void 0&&(this.clipping=e.clipping),this}}class Z_ extends Wr{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}}class ma extends Ac{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new It(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new It(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=qf,this.normalScale=new pt(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new as,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class K_ extends ma{constructor(e){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new pt(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return Rt(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(t){this.ior=(1+.4*t)/(1-.4*t)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new It(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new It(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new It(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._sheen=0,this._transmission=0,this.setValues(e)}get anisotropy(){return this._anisotropy}set anisotropy(e){this._anisotropy>0!=e>0&&this.version++,this._anisotropy=e}get clearcoat(){return this._clearcoat}set clearcoat(e){this._clearcoat>0!=e>0&&this.version++,this._clearcoat=e}get iridescence(){return this._iridescence}set iridescence(e){this._iridescence>0!=e>0&&this.version++,this._iridescence=e}get dispersion(){return this._dispersion}set dispersion(e){this._dispersion>0!=e>0&&this.version++,this._dispersion=e}get sheen(){return this._sheen}set sheen(e){this._sheen>0!=e>0&&this.version++,this._sheen=e}get transmission(){return this._transmission}set transmission(e){this._transmission>0!=e>0&&this.version++,this._transmission=e}copy(e){return super.copy(e),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=e.anisotropy,this.anisotropyRotation=e.anisotropyRotation,this.anisotropyMap=e.anisotropyMap,this.clearcoat=e.clearcoat,this.clearcoatMap=e.clearcoatMap,this.clearcoatRoughness=e.clearcoatRoughness,this.clearcoatRoughnessMap=e.clearcoatRoughnessMap,this.clearcoatNormalMap=e.clearcoatNormalMap,this.clearcoatNormalScale.copy(e.clearcoatNormalScale),this.dispersion=e.dispersion,this.ior=e.ior,this.iridescence=e.iridescence,this.iridescenceMap=e.iridescenceMap,this.iridescenceIOR=e.iridescenceIOR,this.iridescenceThicknessRange=[...e.iridescenceThicknessRange],this.iridescenceThicknessMap=e.iridescenceThicknessMap,this.sheen=e.sheen,this.sheenColor.copy(e.sheenColor),this.sheenColorMap=e.sheenColorMap,this.sheenRoughness=e.sheenRoughness,this.sheenRoughnessMap=e.sheenRoughnessMap,this.transmission=e.transmission,this.transmissionMap=e.transmissionMap,this.thickness=e.thickness,this.thicknessMap=e.thicknessMap,this.attenuationDistance=e.attenuationDistance,this.attenuationColor.copy(e.attenuationColor),this.specularIntensity=e.specularIntensity,this.specularIntensityMap=e.specularIntensityMap,this.specularColor.copy(e.specularColor),this.specularColorMap=e.specularColorMap,this}}class J_ extends Ac{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=r_,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class Q_ extends Ac{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}class ag extends ai{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new It(e),this.intensity=t}dispose(){this.dispatchEvent({type:"dispose"})}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,t}}class q_ extends ag{constructor(e,t,i){super(e,i),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(ai.DEFAULT_UP),this.updateMatrix(),this.groundColor=new It(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}toJSON(e){const t=super.toJSON(e);return t.object.groundColor=this.groundColor.getHex(),t}}const Qh=new Sn,Ip=new se,Lp=new se;class j_{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new pt(512,512),this.mapType=ki,this.map=null,this.mapPass=null,this.matrix=new Sn,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new _d,this._frameExtents=new pt(1,1),this._viewportCount=1,this._viewports=[new yn(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){const t=this.camera,i=this.matrix;Ip.setFromMatrixPosition(e.matrixWorld),t.position.copy(Ip),Lp.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(Lp),t.updateMatrixWorld(),Qh.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Qh,t.coordinateSystem,t.reversedDepth),t.coordinateSystem===Ec||t.reversedDepth?i.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):i.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),i.multiply(Qh)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this.biasNode=e.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}const yu=new se,Su=new rs,Fr=new se;class sg extends ai{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new Sn,this.projectionMatrix=new Sn,this.projectionMatrixInverse=new Sn,this.coordinateSystem=kr,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(yu,Su,Fr),Fr.x===1&&Fr.y===1&&Fr.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(yu,Su,Fr.set(1,1,1)).invert()}updateWorldMatrix(e,t,i=!1){super.updateWorldMatrix(e,t,i),this.matrixWorld.decompose(yu,Su,Fr),Fr.x===1&&Fr.y===1&&Fr.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(yu,Su,Fr.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}}const qa=new se,Np=new pt,Fp=new pt;class Ji extends sg{constructor(e=50,t=1,i=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=i,this.far=r,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=jf*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(Uu*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return jf*2*Math.atan(Math.tan(Uu*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,i){qa.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(qa.x,qa.y).multiplyScalar(-e/qa.z),qa.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),i.set(qa.x,qa.y).multiplyScalar(-e/qa.z)}getViewSize(e,t){return this.getViewBounds(e,Np,Fp),t.subVectors(Fp,Np)}setViewOffset(e,t,i,r,c,u){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=r,this.view.width=c,this.view.height=u,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(Uu*.5*this.fov)/this.zoom,i=2*t,r=this.aspect*i,c=-.5*r;const u=this.view;if(this.view!==null&&this.view.enabled){const m=u.fullWidth,p=u.fullHeight;c+=u.offsetX*r/m,t-=u.offsetY*i/p,r*=u.width/m,i*=u.height/p}const d=this.filmOffset;d!==0&&(c+=e*d/this.getFilmWidth()),this.projectionMatrix.makePerspective(c,c+r,t,t-i,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}class bd extends sg{constructor(e=-1,t=1,i=1,r=-1,c=.1,u=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=i,this.bottom=r,this.near=c,this.far=u,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,i,r,c,u){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=r,this.view.width=c,this.view.height=u,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),i=(this.right+this.left)/2,r=(this.top+this.bottom)/2;let c=i-e,u=i+e,d=r+t,m=r-t;if(this.view!==null&&this.view.enabled){const p=(this.right-this.left)/this.view.fullWidth/this.zoom,g=(this.top-this.bottom)/this.view.fullHeight/this.zoom;c+=p*this.view.offsetX,u=c+p*this.view.width,d-=g*this.view.offsetY,m=d-g*this.view.height}this.projectionMatrix.makeOrthographic(c,u,d,m,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}class $_ extends j_{constructor(){super(new bd(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class Up extends ag{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(ai.DEFAULT_UP),this.updateMatrix(),this.target=new ai,this.shadow=new $_}dispose(){super.dispose(),this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}toJSON(e){const t=super.toJSON(e);return t.object.shadow=this.shadow.toJSON(),t.object.target=this.target.uuid,t}}const $o=-90,el=1;class ex extends ai{constructor(e,t,i){super(),this.type="CubeCamera",this.renderTarget=i,this.coordinateSystem=null,this.activeMipmapLevel=0;const r=new Ji($o,el,e,t);r.layers=this.layers,this.add(r);const c=new Ji($o,el,e,t);c.layers=this.layers,this.add(c);const u=new Ji($o,el,e,t);u.layers=this.layers,this.add(u);const d=new Ji($o,el,e,t);d.layers=this.layers,this.add(d);const m=new Ji($o,el,e,t);m.layers=this.layers,this.add(m);const p=new Ji($o,el,e,t);p.layers=this.layers,this.add(p)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[i,r,c,u,d,m]=t;for(const p of t)this.remove(p);if(e===kr)i.up.set(0,1,0),i.lookAt(1,0,0),r.up.set(0,1,0),r.lookAt(-1,0,0),c.up.set(0,0,-1),c.lookAt(0,1,0),u.up.set(0,0,1),u.lookAt(0,-1,0),d.up.set(0,1,0),d.lookAt(0,0,1),m.up.set(0,1,0),m.lookAt(0,0,-1);else if(e===Ec)i.up.set(0,-1,0),i.lookAt(-1,0,0),r.up.set(0,-1,0),r.lookAt(1,0,0),c.up.set(0,0,1),c.lookAt(0,1,0),u.up.set(0,0,-1),u.lookAt(0,-1,0),d.up.set(0,-1,0),d.lookAt(0,0,1),m.up.set(0,-1,0),m.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const p of t)this.add(p),p.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:i,activeMipmapLevel:r}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[c,u,d,m,p,g]=this.children,b=e.getRenderTarget(),x=e.getActiveCubeFace(),M=e.getActiveMipmapLevel(),A=e.xr.enabled;e.xr.enabled=!1;const C=i.texture.generateMipmaps;i.texture.generateMipmaps=!1;let T=!1;e.isWebGLRenderer===!0?T=e.state.buffers.depth.getReversed():T=e.reversedDepthBuffer,e.setRenderTarget(i,0,r),T&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),e.setRenderTarget(i,1,r),T&&e.autoClear===!1&&e.clearDepth(),e.render(t,u),e.setRenderTarget(i,2,r),T&&e.autoClear===!1&&e.clearDepth(),e.render(t,d),e.setRenderTarget(i,3,r),T&&e.autoClear===!1&&e.clearDepth(),e.render(t,m),e.setRenderTarget(i,4,r),T&&e.autoClear===!1&&e.clearDepth(),e.render(t,p),i.texture.generateMipmaps=C,e.setRenderTarget(i,5,r),T&&e.autoClear===!1&&e.clearDepth(),e.render(t,g),e.setRenderTarget(b,x,M),e.xr.enabled=A,i.texture.needsPMREMUpdate=!0}}class tx extends Ji{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}}class Op{constructor(e=1,t=0,i=0){this.radius=e,this.phi=t,this.theta=i}set(e,t,i){return this.radius=e,this.phi=t,this.theta=i,this}copy(e){return this.radius=e.radius,this.phi=e.phi,this.theta=e.theta,this}makeSafe(){return this.phi=Rt(this.phi,1e-6,Math.PI-1e-6),this}setFromVector3(e){return this.setFromCartesianCoords(e.x,e.y,e.z)}setFromCartesianCoords(e,t,i){return this.radius=Math.sqrt(e*e+t*t+i*i),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(e,i),this.phi=Math.acos(Rt(t/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}}class og{static{og.prototype.isMatrix2=!0}constructor(e,t,i,r){this.elements=[1,0,0,1],e!==void 0&&this.set(e,t,i,r)}identity(){return this.set(1,0,0,1),this}fromArray(e,t=0){for(let i=0;i<4;i++)this.elements[i]=e[i+t];return this}set(e,t,i,r){const c=this.elements;return c[0]=e,c[2]=t,c[1]=i,c[3]=r,this}}class nx extends ss{constructor(e,t=null){super(),this.object=e,this.domElement=t,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(e){if(e===void 0){ft("Controls: connect() now requires an element.");return}this.domElement!==null&&this.disconnect(),this.domElement=e}disconnect(){}dispose(){}update(){}}function Bp(n,e,t,i){const r=ix(i);switch(t){case Ym:return n*e;case Km:return n*e/r.components*r.byteLength;case cd:return n*e/r.components*r.byteLength;case io:return n*e*2/r.components*r.byteLength;case ud:return n*e*2/r.components*r.byteLength;case Zm:return n*e*3/r.components*r.byteLength;case gr:return n*e*4/r.components*r.byteLength;case hd:return n*e*4/r.components*r.byteLength;case Iu:case Lu:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*8;case Nu:case Fu:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*16;case yf:case Ef:return Math.max(n,16)*Math.max(e,8)/4;case Mf:case Sf:return Math.max(n,8)*Math.max(e,8)/2;case Tf:case wf:case Rf:case Cf:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*8;case Af:case Bu:case Pf:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*16;case Df:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*16;case If:return Math.floor((n+4)/5)*Math.floor((e+3)/4)*16;case Lf:return Math.floor((n+4)/5)*Math.floor((e+4)/5)*16;case Nf:return Math.floor((n+5)/6)*Math.floor((e+4)/5)*16;case Ff:return Math.floor((n+5)/6)*Math.floor((e+5)/6)*16;case Uf:return Math.floor((n+7)/8)*Math.floor((e+4)/5)*16;case Of:return Math.floor((n+7)/8)*Math.floor((e+5)/6)*16;case Bf:return Math.floor((n+7)/8)*Math.floor((e+7)/8)*16;case kf:return Math.floor((n+9)/10)*Math.floor((e+4)/5)*16;case zf:return Math.floor((n+9)/10)*Math.floor((e+5)/6)*16;case Hf:return Math.floor((n+9)/10)*Math.floor((e+7)/8)*16;case Gf:return Math.floor((n+9)/10)*Math.floor((e+9)/10)*16;case Vf:return Math.floor((n+11)/12)*Math.floor((e+9)/10)*16;case Wf:return Math.floor((n+11)/12)*Math.floor((e+11)/12)*16;case Xf:case Yf:case Zf:return Math.ceil(n/4)*Math.ceil(e/4)*16;case Kf:case Jf:return Math.ceil(n/4)*Math.ceil(e/4)*8;case ku:case Qf:return Math.ceil(n/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function ix(n){switch(n){case ki:case Gm:return{byteLength:1,components:1};case yc:case Vm:case ya:return{byteLength:2,components:1};case od:case ld:return{byteLength:2,components:4};case Vr:case sd:case Br:return{byteLength:4,components:1};case Wm:case Xm:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${n}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:rd}}));typeof window<"u"&&(window.__THREE__?ft("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=rd);function lg(){let n=null,e=!1,t=null,i=null;function r(c,u){t(c,u),i=n.requestAnimationFrame(r)}return{start:function(){e!==!0&&t!==null&&n!==null&&(i=n.requestAnimationFrame(r),e=!0)},stop:function(){n!==null&&n.cancelAnimationFrame(i),e=!1},setAnimationLoop:function(c){t=c},setContext:function(c){n=c}}}function rx(n){const e=new WeakMap;function t(d,m){const p=d.array,g=d.usage,b=p.byteLength,x=n.createBuffer();n.bindBuffer(m,x),n.bufferData(m,p,g),d.onUploadCallback();let M;if(p instanceof Float32Array)M=n.FLOAT;else if(typeof Float16Array<"u"&&p instanceof Float16Array)M=n.HALF_FLOAT;else if(p instanceof Uint16Array)d.isFloat16BufferAttribute?M=n.HALF_FLOAT:M=n.UNSIGNED_SHORT;else if(p instanceof Int16Array)M=n.SHORT;else if(p instanceof Uint32Array)M=n.UNSIGNED_INT;else if(p instanceof Int32Array)M=n.INT;else if(p instanceof Int8Array)M=n.BYTE;else if(p instanceof Uint8Array)M=n.UNSIGNED_BYTE;else if(p instanceof Uint8ClampedArray)M=n.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+p);return{buffer:x,type:M,bytesPerElement:p.BYTES_PER_ELEMENT,version:d.version,size:b}}function i(d,m,p){const g=m.array,b=m.updateRanges;if(n.bindBuffer(p,d),b.length===0)n.bufferSubData(p,0,g);else{b.sort((M,A)=>M.start-A.start);let x=0;for(let M=1;M<b.length;M++){const A=b[x],C=b[M];C.start<=A.start+A.count+1?A.count=Math.max(A.count,C.start+C.count-A.start):(++x,b[x]=C)}b.length=x+1;for(let M=0,A=b.length;M<A;M++){const C=b[M];n.bufferSubData(p,C.start*g.BYTES_PER_ELEMENT,g,C.start,C.count)}m.clearUpdateRanges()}m.onUploadCallback()}function r(d){return d.isInterleavedBufferAttribute&&(d=d.data),e.get(d)}function c(d){d.isInterleavedBufferAttribute&&(d=d.data);const m=e.get(d);m&&(n.deleteBuffer(m.buffer),e.delete(d))}function u(d,m){if(d.isInterleavedBufferAttribute&&(d=d.data),d.isGLBufferAttribute){const g=e.get(d);(!g||g.version<d.version)&&e.set(d,{buffer:d.buffer,type:d.type,bytesPerElement:d.elementSize,version:d.version});return}const p=e.get(d);if(p===void 0)e.set(d,t(d,m));else if(p.version<d.version){if(p.size!==d.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");i(p.buffer,d,m),p.version=d.version}}return{get:r,remove:c,update:u}}var ax=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,sx=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,ox=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,lx=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,cx=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,ux=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,hx=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,fx=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,dx=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,px=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,mx=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,gx=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,_x=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,xx=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,vx=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,bx=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,Mx=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,yx=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Sx=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Ex=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,Tx=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,wx=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,Ax=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,Rx=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,Cx=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,Px=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,Dx=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Ix=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Lx=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Nx=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Fx="gl_FragColor = linearToOutputTexel( gl_FragColor );",Ux=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,Ox=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,Bx=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,kx=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,zx=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Hx=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,Gx=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Vx=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Wx=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Xx=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Yx=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,Zx=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,Kx=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Jx=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Qx=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,qx=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,jx=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,$x=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,ev=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,tv=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,nv=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,iv=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
		vec3 iridescenceFresnelDielectric;
		vec3 iridescenceFresnelMetallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
vec3 BRDF_GGX_Multiscatter( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 singleScatter = BRDF_GGX( lightDir, viewDir, normal, material );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 dfgV = texture2D( dfgLUT, vec2( material.roughness, dotNV ) ).rg;
	vec2 dfgL = texture2D( dfgLUT, vec2( material.roughness, dotNL ) ).rg;
	vec3 FssEss_V = material.specularColorBlended * dfgV.x + material.specularF90 * dfgV.y;
	vec3 FssEss_L = material.specularColorBlended * dfgL.x + material.specularF90 * dfgL.y;
	float Ess_V = dfgV.x + dfgV.y;
	float Ess_L = dfgL.x + dfgL.y;
	float Ems_V = 1.0 - Ess_V;
	float Ems_L = 1.0 - Ess_L;
	vec3 Favg = material.specularColorBlended + ( 1.0 - material.specularColorBlended ) * 0.047619;
	vec3 Fms = FssEss_V * FssEss_L * Favg / ( 1.0 - Ems_V * Ems_L * Favg + EPSILON );
	float compensationFactor = Ems_V * Ems_L;
	vec3 multiScatter = Fms * compensationFactor;
	return singleScatter + multiScatter;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX_Multiscatter( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnelDielectric, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceFresnelMetallic, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,rv=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( material.iridescenceFresnelDielectric, material.iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#ifdef USE_LIGHT_PROBES_GRID
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		irradiance += getLightProbeGridIrradiance( probeWorldPos, probeWorldNormal );
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,av=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,sv=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,ov=`#ifdef USE_LIGHT_PROBES_GRID
uniform highp sampler3D probesSH;
uniform vec3 probesMin;
uniform vec3 probesMax;
uniform vec3 probesResolution;
vec3 getLightProbeGridIrradiance( vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 resMinusOne = res - 1.0;
	vec3 probeSpacing = gridRange / resMinusOne;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.0, 1.0 );
	uvw = uvw * resMinusOne / res + 0.5 / res;
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,lv=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,cv=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,uv=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,hv=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,fv=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,dv=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,pv=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,mv=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,gv=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,_v=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,xv=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,vv=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,bv=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Mv=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,yv=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Sv=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,Ev=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,Tv=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,wv=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Av=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,Rv=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,Cv=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Pv=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,Dv=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Iv=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Lv=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Nv=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,Fv=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,Uv=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Ov=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Bv=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,kv=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,zv=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Hv=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,Gv=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,Vv=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,Wv=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,Xv=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Yv=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,Zv=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,Kv=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,Jv=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Qv=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,qv=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,jv=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,$v=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,eb=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,tb=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,nb=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,ib=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,rb=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const ab=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,sb=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,ob=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,lb=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,cb=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,ub=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,hb=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,fb=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,db=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,pb=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,mb=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,gb=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,_b=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,xb=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,vb=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,bb=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Mb=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,yb=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Sb=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,Eb=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Tb=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,wb=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,Ab=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Rb=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Cb=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,Pb=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Db=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Ib=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Lb=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,Nb=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Fb=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Ub=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Ob=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Bb=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,St={alphahash_fragment:ax,alphahash_pars_fragment:sx,alphamap_fragment:ox,alphamap_pars_fragment:lx,alphatest_fragment:cx,alphatest_pars_fragment:ux,aomap_fragment:hx,aomap_pars_fragment:fx,batching_pars_vertex:dx,batching_vertex:px,begin_vertex:mx,beginnormal_vertex:gx,bsdfs:_x,iridescence_fragment:xx,bumpmap_pars_fragment:vx,clipping_planes_fragment:bx,clipping_planes_pars_fragment:Mx,clipping_planes_pars_vertex:yx,clipping_planes_vertex:Sx,color_fragment:Ex,color_pars_fragment:Tx,color_pars_vertex:wx,color_vertex:Ax,common:Rx,cube_uv_reflection_fragment:Cx,defaultnormal_vertex:Px,displacementmap_pars_vertex:Dx,displacementmap_vertex:Ix,emissivemap_fragment:Lx,emissivemap_pars_fragment:Nx,colorspace_fragment:Fx,colorspace_pars_fragment:Ux,envmap_fragment:Ox,envmap_common_pars_fragment:Bx,envmap_pars_fragment:kx,envmap_pars_vertex:zx,envmap_physical_pars_fragment:qx,envmap_vertex:Hx,fog_vertex:Gx,fog_pars_vertex:Vx,fog_fragment:Wx,fog_pars_fragment:Xx,gradientmap_pars_fragment:Yx,lightmap_pars_fragment:Zx,lights_lambert_fragment:Kx,lights_lambert_pars_fragment:Jx,lights_pars_begin:Qx,lights_toon_fragment:jx,lights_toon_pars_fragment:$x,lights_phong_fragment:ev,lights_phong_pars_fragment:tv,lights_physical_fragment:nv,lights_physical_pars_fragment:iv,lights_fragment_begin:rv,lights_fragment_maps:av,lights_fragment_end:sv,lightprobes_pars_fragment:ov,logdepthbuf_fragment:lv,logdepthbuf_pars_fragment:cv,logdepthbuf_pars_vertex:uv,logdepthbuf_vertex:hv,map_fragment:fv,map_pars_fragment:dv,map_particle_fragment:pv,map_particle_pars_fragment:mv,metalnessmap_fragment:gv,metalnessmap_pars_fragment:_v,morphinstance_vertex:xv,morphcolor_vertex:vv,morphnormal_vertex:bv,morphtarget_pars_vertex:Mv,morphtarget_vertex:yv,normal_fragment_begin:Sv,normal_fragment_maps:Ev,normal_pars_fragment:Tv,normal_pars_vertex:wv,normal_vertex:Av,normalmap_pars_fragment:Rv,clearcoat_normal_fragment_begin:Cv,clearcoat_normal_fragment_maps:Pv,clearcoat_pars_fragment:Dv,iridescence_pars_fragment:Iv,opaque_fragment:Lv,packing:Nv,premultiplied_alpha_fragment:Fv,project_vertex:Uv,dithering_fragment:Ov,dithering_pars_fragment:Bv,roughnessmap_fragment:kv,roughnessmap_pars_fragment:zv,shadowmap_pars_fragment:Hv,shadowmap_pars_vertex:Gv,shadowmap_vertex:Vv,shadowmask_pars_fragment:Wv,skinbase_vertex:Xv,skinning_pars_vertex:Yv,skinning_vertex:Zv,skinnormal_vertex:Kv,specularmap_fragment:Jv,specularmap_pars_fragment:Qv,tonemapping_fragment:qv,tonemapping_pars_fragment:jv,transmission_fragment:$v,transmission_pars_fragment:eb,uv_pars_fragment:tb,uv_pars_vertex:nb,uv_vertex:ib,worldpos_vertex:rb,background_vert:ab,background_frag:sb,backgroundCube_vert:ob,backgroundCube_frag:lb,cube_vert:cb,cube_frag:ub,depth_vert:hb,depth_frag:fb,distance_vert:db,distance_frag:pb,equirect_vert:mb,equirect_frag:gb,linedashed_vert:_b,linedashed_frag:xb,meshbasic_vert:vb,meshbasic_frag:bb,meshlambert_vert:Mb,meshlambert_frag:yb,meshmatcap_vert:Sb,meshmatcap_frag:Eb,meshnormal_vert:Tb,meshnormal_frag:wb,meshphong_vert:Ab,meshphong_frag:Rb,meshphysical_vert:Cb,meshphysical_frag:Pb,meshtoon_vert:Db,meshtoon_frag:Ib,points_vert:Lb,points_frag:Nb,shadow_vert:Fb,shadow_frag:Ub,sprite_vert:Ob,sprite_frag:Bb},Qe={common:{diffuse:{value:new It(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new xt},alphaMap:{value:null},alphaMapTransform:{value:new xt},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new xt}},envmap:{envMap:{value:null},envMapRotation:{value:new xt},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new xt}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new xt}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new xt},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new xt},normalScale:{value:new pt(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new xt},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new xt}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new xt}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new xt}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new It(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new se},probesMax:{value:new se},probesResolution:{value:new se}},points:{diffuse:{value:new It(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new xt},alphaTest:{value:0},uvTransform:{value:new xt}},sprite:{diffuse:{value:new It(16777215)},opacity:{value:1},center:{value:new pt(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new xt},alphaMap:{value:null},alphaMapTransform:{value:new xt},alphaTest:{value:0}}},Or={basic:{uniforms:vi([Qe.common,Qe.specularmap,Qe.envmap,Qe.aomap,Qe.lightmap,Qe.fog]),vertexShader:St.meshbasic_vert,fragmentShader:St.meshbasic_frag},lambert:{uniforms:vi([Qe.common,Qe.specularmap,Qe.envmap,Qe.aomap,Qe.lightmap,Qe.emissivemap,Qe.bumpmap,Qe.normalmap,Qe.displacementmap,Qe.fog,Qe.lights,{emissive:{value:new It(0)},envMapIntensity:{value:1}}]),vertexShader:St.meshlambert_vert,fragmentShader:St.meshlambert_frag},phong:{uniforms:vi([Qe.common,Qe.specularmap,Qe.envmap,Qe.aomap,Qe.lightmap,Qe.emissivemap,Qe.bumpmap,Qe.normalmap,Qe.displacementmap,Qe.fog,Qe.lights,{emissive:{value:new It(0)},specular:{value:new It(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:St.meshphong_vert,fragmentShader:St.meshphong_frag},standard:{uniforms:vi([Qe.common,Qe.envmap,Qe.aomap,Qe.lightmap,Qe.emissivemap,Qe.bumpmap,Qe.normalmap,Qe.displacementmap,Qe.roughnessmap,Qe.metalnessmap,Qe.fog,Qe.lights,{emissive:{value:new It(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:St.meshphysical_vert,fragmentShader:St.meshphysical_frag},toon:{uniforms:vi([Qe.common,Qe.aomap,Qe.lightmap,Qe.emissivemap,Qe.bumpmap,Qe.normalmap,Qe.displacementmap,Qe.gradientmap,Qe.fog,Qe.lights,{emissive:{value:new It(0)}}]),vertexShader:St.meshtoon_vert,fragmentShader:St.meshtoon_frag},matcap:{uniforms:vi([Qe.common,Qe.bumpmap,Qe.normalmap,Qe.displacementmap,Qe.fog,{matcap:{value:null}}]),vertexShader:St.meshmatcap_vert,fragmentShader:St.meshmatcap_frag},points:{uniforms:vi([Qe.points,Qe.fog]),vertexShader:St.points_vert,fragmentShader:St.points_frag},dashed:{uniforms:vi([Qe.common,Qe.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:St.linedashed_vert,fragmentShader:St.linedashed_frag},depth:{uniforms:vi([Qe.common,Qe.displacementmap]),vertexShader:St.depth_vert,fragmentShader:St.depth_frag},normal:{uniforms:vi([Qe.common,Qe.bumpmap,Qe.normalmap,Qe.displacementmap,{opacity:{value:1}}]),vertexShader:St.meshnormal_vert,fragmentShader:St.meshnormal_frag},sprite:{uniforms:vi([Qe.sprite,Qe.fog]),vertexShader:St.sprite_vert,fragmentShader:St.sprite_frag},background:{uniforms:{uvTransform:{value:new xt},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:St.background_vert,fragmentShader:St.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new xt}},vertexShader:St.backgroundCube_vert,fragmentShader:St.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:St.cube_vert,fragmentShader:St.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:St.equirect_vert,fragmentShader:St.equirect_frag},distance:{uniforms:vi([Qe.common,Qe.displacementmap,{referencePosition:{value:new se},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:St.distance_vert,fragmentShader:St.distance_frag},shadow:{uniforms:vi([Qe.lights,Qe.fog,{color:{value:new It(0)},opacity:{value:1}}]),vertexShader:St.shadow_vert,fragmentShader:St.shadow_frag}};Or.physical={uniforms:vi([Or.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new xt},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new xt},clearcoatNormalScale:{value:new pt(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new xt},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new xt},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new xt},sheen:{value:0},sheenColor:{value:new It(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new xt},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new xt},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new xt},transmissionSamplerSize:{value:new pt},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new xt},attenuationDistance:{value:0},attenuationColor:{value:new It(0)},specularColor:{value:new It(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new xt},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new xt},anisotropyVector:{value:new pt},anisotropyMap:{value:null},anisotropyMapTransform:{value:new xt}}]),vertexShader:St.meshphysical_vert,fragmentShader:St.meshphysical_frag};const Eu={r:0,b:0,g:0},kb=new Sn,cg=new xt;cg.set(-1,0,0,0,1,0,0,0,1);function zb(n,e,t,i,r,c){const u=new It(0);let d=r===!0?0:1,m,p,g=null,b=0,x=null;function M(B){let G=B.isScene===!0?B.background:null;if(G&&G.isTexture){const D=B.backgroundBlurriness>0;G=e.get(G,D)}return G}function A(B){let G=!1;const D=M(B);D===null?T(u,d):D&&D.isColor&&(T(D,1),G=!0);const z=n.xr.getEnvironmentBlendMode();z==="additive"?t.buffers.color.setClear(0,0,0,1,c):z==="alpha-blend"&&t.buffers.color.setClear(0,0,0,0,c),(n.autoClear||G)&&(t.buffers.depth.setTest(!0),t.buffers.depth.setMask(!0),t.buffers.color.setMask(!0),n.clear(n.autoClearColor,n.autoClearDepth,n.autoClearStencil))}function C(B,G){const D=M(G);D&&(D.isCubeTexture||D.mapping===Vu)?(p===void 0&&(p=new fi(new ns(1,1,1),new Wr({name:"BackgroundCubeMaterial",uniforms:fl(Or.backgroundCube.uniforms),vertexShader:Or.backgroundCube.vertexShader,fragmentShader:Or.backgroundCube.fragmentShader,side:Ii,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),p.geometry.deleteAttribute("normal"),p.geometry.deleteAttribute("uv"),p.onBeforeRender=function(z,U,W){this.matrixWorld.copyPosition(W.matrixWorld)},Object.defineProperty(p.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),i.update(p)),p.material.uniforms.envMap.value=D,p.material.uniforms.backgroundBlurriness.value=G.backgroundBlurriness,p.material.uniforms.backgroundIntensity.value=G.backgroundIntensity,p.material.uniforms.backgroundRotation.value.setFromMatrix4(kb.makeRotationFromEuler(G.backgroundRotation)).transpose(),D.isCubeTexture&&D.isRenderTargetTexture===!1&&p.material.uniforms.backgroundRotation.value.premultiply(cg),p.material.toneMapped=Gt.getTransfer(D.colorSpace)!==nn,(g!==D||b!==D.version||x!==n.toneMapping)&&(p.material.needsUpdate=!0,g=D,b=D.version,x=n.toneMapping),p.layers.enableAll(),B.unshift(p,p.geometry,p.material,0,0,null)):D&&D.isTexture&&(m===void 0&&(m=new fi(new hl(2,2),new Wr({name:"BackgroundMaterial",uniforms:fl(Or.background.uniforms),vertexShader:Or.background.vertexShader,fragmentShader:Or.background.fragmentShader,side:is,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),m.geometry.deleteAttribute("normal"),Object.defineProperty(m.material,"map",{get:function(){return this.uniforms.t2D.value}}),i.update(m)),m.material.uniforms.t2D.value=D,m.material.uniforms.backgroundIntensity.value=G.backgroundIntensity,m.material.toneMapped=Gt.getTransfer(D.colorSpace)!==nn,D.matrixAutoUpdate===!0&&D.updateMatrix(),m.material.uniforms.uvTransform.value.copy(D.matrix),(g!==D||b!==D.version||x!==n.toneMapping)&&(m.material.needsUpdate=!0,g=D,b=D.version,x=n.toneMapping),m.layers.enableAll(),B.unshift(m,m.geometry,m.material,0,0,null))}function T(B,G){B.getRGB(Eu,rg(n)),t.buffers.color.setClear(Eu.r,Eu.g,Eu.b,G,c)}function S(){p!==void 0&&(p.geometry.dispose(),p.material.dispose(),p=void 0),m!==void 0&&(m.geometry.dispose(),m.material.dispose(),m=void 0)}return{getClearColor:function(){return u},setClearColor:function(B,G=1){u.set(B),d=G,T(u,d)},getClearAlpha:function(){return d},setClearAlpha:function(B){d=B,T(u,d)},render:A,addToRenderList:C,dispose:S}}function Hb(n,e){const t=n.getParameter(n.MAX_VERTEX_ATTRIBS),i={},r=x(null);let c=r,u=!1;function d(X,ne,pe,_e,re){let H=!1;const j=b(X,_e,pe,ne);c!==j&&(c=j,p(c.object)),H=M(X,_e,pe,re),H&&A(X,_e,pe,re),re!==null&&e.update(re,n.ELEMENT_ARRAY_BUFFER),(H||u)&&(u=!1,D(X,ne,pe,_e),re!==null&&n.bindBuffer(n.ELEMENT_ARRAY_BUFFER,e.get(re).buffer))}function m(){return n.createVertexArray()}function p(X){return n.bindVertexArray(X)}function g(X){return n.deleteVertexArray(X)}function b(X,ne,pe,_e){const re=_e.wireframe===!0;let H=i[ne.id];H===void 0&&(H={},i[ne.id]=H);const j=X.isInstancedMesh===!0?X.id:0;let Ee=H[j];Ee===void 0&&(Ee={},H[j]=Ee);let Ce=Ee[pe.id];Ce===void 0&&(Ce={},Ee[pe.id]=Ce);let ce=Ce[re];return ce===void 0&&(ce=x(m()),Ce[re]=ce),ce}function x(X){const ne=[],pe=[],_e=[];for(let re=0;re<t;re++)ne[re]=0,pe[re]=0,_e[re]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:ne,enabledAttributes:pe,attributeDivisors:_e,object:X,attributes:{},index:null}}function M(X,ne,pe,_e){const re=c.attributes,H=ne.attributes;let j=0;const Ee=pe.getAttributes();for(const Ce in Ee)if(Ee[Ce].location>=0){const K=re[Ce];let ue=H[Ce];if(ue===void 0&&(Ce==="instanceMatrix"&&X.instanceMatrix&&(ue=X.instanceMatrix),Ce==="instanceColor"&&X.instanceColor&&(ue=X.instanceColor)),K===void 0||K.attribute!==ue||ue&&K.data!==ue.data)return!0;j++}return c.attributesNum!==j||c.index!==_e}function A(X,ne,pe,_e){const re={},H=ne.attributes;let j=0;const Ee=pe.getAttributes();for(const Ce in Ee)if(Ee[Ce].location>=0){let K=H[Ce];K===void 0&&(Ce==="instanceMatrix"&&X.instanceMatrix&&(K=X.instanceMatrix),Ce==="instanceColor"&&X.instanceColor&&(K=X.instanceColor));const ue={};ue.attribute=K,K&&K.data&&(ue.data=K.data),re[Ce]=ue,j++}c.attributes=re,c.attributesNum=j,c.index=_e}function C(){const X=c.newAttributes;for(let ne=0,pe=X.length;ne<pe;ne++)X[ne]=0}function T(X){S(X,0)}function S(X,ne){const pe=c.newAttributes,_e=c.enabledAttributes,re=c.attributeDivisors;pe[X]=1,_e[X]===0&&(n.enableVertexAttribArray(X),_e[X]=1),re[X]!==ne&&(n.vertexAttribDivisor(X,ne),re[X]=ne)}function B(){const X=c.newAttributes,ne=c.enabledAttributes;for(let pe=0,_e=ne.length;pe<_e;pe++)ne[pe]!==X[pe]&&(n.disableVertexAttribArray(pe),ne[pe]=0)}function G(X,ne,pe,_e,re,H,j){j===!0?n.vertexAttribIPointer(X,ne,pe,re,H):n.vertexAttribPointer(X,ne,pe,_e,re,H)}function D(X,ne,pe,_e){C();const re=_e.attributes,H=pe.getAttributes(),j=ne.defaultAttributeValues;for(const Ee in H){const Ce=H[Ee];if(Ce.location>=0){let ce=re[Ee];if(ce===void 0&&(Ee==="instanceMatrix"&&X.instanceMatrix&&(ce=X.instanceMatrix),Ee==="instanceColor"&&X.instanceColor&&(ce=X.instanceColor)),ce!==void 0){const K=ce.normalized,ue=ce.itemSize,Pe=e.get(ce);if(Pe===void 0)continue;const tt=Pe.buffer,De=Pe.type,me=Pe.bytesPerElement,he=De===n.INT||De===n.UNSIGNED_INT||ce.gpuType===sd;if(ce.isInterleavedBufferAttribute){const we=ce.data,Ve=we.stride,Ke=ce.offset;if(we.isInstancedInterleavedBuffer){for(let Je=0;Je<Ce.locationSize;Je++)S(Ce.location+Je,we.meshPerAttribute);X.isInstancedMesh!==!0&&_e._maxInstanceCount===void 0&&(_e._maxInstanceCount=we.meshPerAttribute*we.count)}else for(let Je=0;Je<Ce.locationSize;Je++)T(Ce.location+Je);n.bindBuffer(n.ARRAY_BUFFER,tt);for(let Je=0;Je<Ce.locationSize;Je++)G(Ce.location+Je,ue/Ce.locationSize,De,K,Ve*me,(Ke+ue/Ce.locationSize*Je)*me,he)}else{if(ce.isInstancedBufferAttribute){for(let we=0;we<Ce.locationSize;we++)S(Ce.location+we,ce.meshPerAttribute);X.isInstancedMesh!==!0&&_e._maxInstanceCount===void 0&&(_e._maxInstanceCount=ce.meshPerAttribute*ce.count)}else for(let we=0;we<Ce.locationSize;we++)T(Ce.location+we);n.bindBuffer(n.ARRAY_BUFFER,tt);for(let we=0;we<Ce.locationSize;we++)G(Ce.location+we,ue/Ce.locationSize,De,K,ue*me,ue/Ce.locationSize*we*me,he)}}else if(j!==void 0){const K=j[Ee];if(K!==void 0)switch(K.length){case 2:n.vertexAttrib2fv(Ce.location,K);break;case 3:n.vertexAttrib3fv(Ce.location,K);break;case 4:n.vertexAttrib4fv(Ce.location,K);break;default:n.vertexAttrib1fv(Ce.location,K)}}}}B()}function z(){F();for(const X in i){const ne=i[X];for(const pe in ne){const _e=ne[pe];for(const re in _e){const H=_e[re];for(const j in H)g(H[j].object),delete H[j];delete _e[re]}}delete i[X]}}function U(X){if(i[X.id]===void 0)return;const ne=i[X.id];for(const pe in ne){const _e=ne[pe];for(const re in _e){const H=_e[re];for(const j in H)g(H[j].object),delete H[j];delete _e[re]}}delete i[X.id]}function W(X){for(const ne in i){const pe=i[ne];for(const _e in pe){const re=pe[_e];if(re[X.id]===void 0)continue;const H=re[X.id];for(const j in H)g(H[j].object),delete H[j];delete re[X.id]}}}function w(X){for(const ne in i){const pe=i[ne],_e=X.isInstancedMesh===!0?X.id:0,re=pe[_e];if(re!==void 0){for(const H in re){const j=re[H];for(const Ee in j)g(j[Ee].object),delete j[Ee];delete re[H]}delete pe[_e],Object.keys(pe).length===0&&delete i[ne]}}}function F(){Z(),u=!0,c!==r&&(c=r,p(c.object))}function Z(){r.geometry=null,r.program=null,r.wireframe=!1}return{setup:d,reset:F,resetDefaultState:Z,dispose:z,releaseStatesOfGeometry:U,releaseStatesOfObject:w,releaseStatesOfProgram:W,initAttributes:C,enableAttribute:T,disableUnusedAttributes:B}}function Gb(n,e,t){let i;function r(m){i=m}function c(m,p){n.drawArrays(i,m,p),t.update(p,i,1)}function u(m,p,g){g!==0&&(n.drawArraysInstanced(i,m,p,g),t.update(p,i,g))}function d(m,p,g){if(g===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(i,m,0,p,0,g);let x=0;for(let M=0;M<g;M++)x+=p[M];t.update(x,i,1)}this.setMode=r,this.render=c,this.renderInstances=u,this.renderMultiDraw=d}function Vb(n,e,t,i){let r;function c(){if(r!==void 0)return r;if(e.has("EXT_texture_filter_anisotropic")===!0){const W=e.get("EXT_texture_filter_anisotropic");r=n.getParameter(W.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else r=0;return r}function u(W){return!(W!==gr&&i.convert(W)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_FORMAT))}function d(W){const w=W===ya&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(W!==ki&&i.convert(W)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_TYPE)&&W!==Br&&!w)}function m(W){if(W==="highp"){if(n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.HIGH_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.HIGH_FLOAT).precision>0)return"highp";W="mediump"}return W==="mediump"&&n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.MEDIUM_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let p=t.precision!==void 0?t.precision:"highp";const g=m(p);g!==p&&(ft("WebGLRenderer:",p,"not supported, using",g,"instead."),p=g);const b=t.logarithmicDepthBuffer===!0,x=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control");t.reversedDepthBuffer===!0&&x===!1&&ft("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");const M=n.getParameter(n.MAX_TEXTURE_IMAGE_UNITS),A=n.getParameter(n.MAX_VERTEX_TEXTURE_IMAGE_UNITS),C=n.getParameter(n.MAX_TEXTURE_SIZE),T=n.getParameter(n.MAX_CUBE_MAP_TEXTURE_SIZE),S=n.getParameter(n.MAX_VERTEX_ATTRIBS),B=n.getParameter(n.MAX_VERTEX_UNIFORM_VECTORS),G=n.getParameter(n.MAX_VARYING_VECTORS),D=n.getParameter(n.MAX_FRAGMENT_UNIFORM_VECTORS),z=n.getParameter(n.MAX_SAMPLES),U=n.getParameter(n.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:c,getMaxPrecision:m,textureFormatReadable:u,textureTypeReadable:d,precision:p,logarithmicDepthBuffer:b,reversedDepthBuffer:x,maxTextures:M,maxVertexTextures:A,maxTextureSize:C,maxCubemapSize:T,maxAttributes:S,maxVertexUniforms:B,maxVaryings:G,maxFragmentUniforms:D,maxSamples:z,samples:U}}function Wb(n){const e=this;let t=null,i=0,r=!1,c=!1;const u=new ja,d=new xt,m={value:null,needsUpdate:!1};this.uniform=m,this.numPlanes=0,this.numIntersection=0,this.init=function(b,x){const M=b.length!==0||x||i!==0||r;return r=x,i=b.length,M},this.beginShadows=function(){c=!0,g(null)},this.endShadows=function(){c=!1},this.setGlobalState=function(b,x){t=g(b,x,0)},this.setState=function(b,x,M){const A=b.clippingPlanes,C=b.clipIntersection,T=b.clipShadows,S=n.get(b);if(!r||A===null||A.length===0||c&&!T)c?g(null):p();else{const B=c?0:i,G=B*4;let D=S.clippingState||null;m.value=D,D=g(A,x,G,M);for(let z=0;z!==G;++z)D[z]=t[z];S.clippingState=D,this.numIntersection=C?this.numPlanes:0,this.numPlanes+=B}};function p(){m.value!==t&&(m.value=t,m.needsUpdate=i>0),e.numPlanes=i,e.numIntersection=0}function g(b,x,M,A){const C=b!==null?b.length:0;let T=null;if(C!==0){if(T=m.value,A!==!0||T===null){const S=M+C*4,B=x.matrixWorldInverse;d.getNormalMatrix(B),(T===null||T.length<S)&&(T=new Float32Array(S));for(let G=0,D=M;G!==C;++G,D+=4)u.copy(b[G]).applyMatrix4(B,d),u.normal.toArray(T,D),T[D+3]=u.constant}m.value=T,m.needsUpdate=!0}return e.numPlanes=C,e.numIntersection=0,T}}const ts=4,kp=[.125,.215,.35,.446,.526,.582],qs=20,Xb=256,pc=new bd,zp=new It;let qh=null,jh=0,$h=0,ef=!1;const Yb=new se;class Hp{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,i=.1,r=100,c={}){const{size:u=256,position:d=Yb}=c;qh=this._renderer.getRenderTarget(),jh=this._renderer.getActiveCubeFace(),$h=this._renderer.getActiveMipmapLevel(),ef=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(u);const m=this._allocateTargets();return m.depthBuffer=!0,this._sceneToCubeUV(e,i,r,m,d),t>0&&this._blur(m,0,0,t),this._applyPMREM(m),this._cleanup(m),m}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Wp(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Vp(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(qh,jh,$h),this._renderer.xr.enabled=ef,e.scissorTest=!1,tl(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===no||e.mapping===cl?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),qh=this._renderer.getRenderTarget(),jh=this._renderer.getActiveCubeFace(),$h=this._renderer.getActiveMipmapLevel(),ef=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const i=t||this._allocateTargets();return this._textureToCubeUV(e,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,i={magFilter:pi,minFilter:pi,generateMipmaps:!1,type:ya,format:gr,colorSpace:zu,depthBuffer:!1},r=Gp(e,t,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Gp(e,t,i);const{_lodMax:c}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=Zb(c)),this._blurMaterial=Jb(c,e,t),this._ggxMaterial=Kb(c,e,t)}return r}_compileMaterial(e){const t=new fi(new _r,e);this._renderer.compile(t,pc)}_sceneToCubeUV(e,t,i,r,c){const m=new Ji(90,1,t,i),p=[1,-1,1,1,1,1],g=[1,1,1,-1,-1,-1],b=this._renderer,x=b.autoClear,M=b.toneMapping;b.getClearColor(zp),b.toneMapping=zr,b.autoClear=!1,b.state.buffers.depth.getReversed()&&(b.setRenderTarget(r),b.clearDepth(),b.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new fi(new ns,new gd({name:"PMREM.Background",side:Ii,depthWrite:!1,depthTest:!1})));const C=this._backgroundBox,T=C.material;let S=!1;const B=e.background;B?B.isColor&&(T.color.copy(B),e.background=null,S=!0):(T.color.copy(zp),S=!0);for(let G=0;G<6;G++){const D=G%3;D===0?(m.up.set(0,p[G],0),m.position.set(c.x,c.y,c.z),m.lookAt(c.x+g[G],c.y,c.z)):D===1?(m.up.set(0,0,p[G]),m.position.set(c.x,c.y,c.z),m.lookAt(c.x,c.y+g[G],c.z)):(m.up.set(0,p[G],0),m.position.set(c.x,c.y,c.z),m.lookAt(c.x,c.y,c.z+g[G]));const z=this._cubeSize;tl(r,D*z,G>2?z:0,z,z),b.setRenderTarget(r),S&&b.render(C,m),b.render(e,m)}b.toneMapping=M,b.autoClear=x,e.background=B}_textureToCubeUV(e,t){const i=this._renderer,r=e.mapping===no||e.mapping===cl;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=Wp()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Vp());const c=r?this._cubemapMaterial:this._equirectMaterial,u=this._lodMeshes[0];u.material=c;const d=c.uniforms;d.envMap.value=e;const m=this._cubeSize;tl(t,0,0,3*m,2*m),i.setRenderTarget(t),i.render(u,pc)}_applyPMREM(e){const t=this._renderer,i=t.autoClear;t.autoClear=!1;const r=this._lodMeshes.length;for(let c=1;c<r;c++)this._applyGGXFilter(e,c-1,c);t.autoClear=i}_applyGGXFilter(e,t,i){const r=this._renderer,c=this._pingPongRenderTarget,u=this._ggxMaterial,d=this._lodMeshes[i];d.material=u;const m=u.uniforms,p=i/(this._lodMeshes.length-1),g=t/(this._lodMeshes.length-1),b=Math.sqrt(p*p-g*g),x=0+p*1.25,M=b*x,{_lodMax:A}=this,C=this._sizeLods[i],T=3*C*(i>A-ts?i-A+ts:0),S=4*(this._cubeSize-C);m.envMap.value=e.texture,m.roughness.value=M,m.mipInt.value=A-t,tl(c,T,S,3*C,2*C),r.setRenderTarget(c),r.render(d,pc),m.envMap.value=c.texture,m.roughness.value=0,m.mipInt.value=A-i,tl(e,T,S,3*C,2*C),r.setRenderTarget(e),r.render(d,pc)}_blur(e,t,i,r,c){const u=this._pingPongRenderTarget;this._halfBlur(e,u,t,i,r,"latitudinal",c),this._halfBlur(u,e,i,i,r,"longitudinal",c)}_halfBlur(e,t,i,r,c,u,d){const m=this._renderer,p=this._blurMaterial;u!=="latitudinal"&&u!=="longitudinal"&&Xt("blur direction must be either latitudinal or longitudinal!");const g=3,b=this._lodMeshes[r];b.material=p;const x=p.uniforms,M=this._sizeLods[i]-1,A=isFinite(c)?Math.PI/(2*M):2*Math.PI/(2*qs-1),C=c/A,T=isFinite(c)?1+Math.floor(g*C):qs;T>qs&&ft(`sigmaRadians, ${c}, is too large and will clip, as it requested ${T} samples when the maximum is set to ${qs}`);const S=[];let B=0;for(let W=0;W<qs;++W){const w=W/C,F=Math.exp(-w*w/2);S.push(F),W===0?B+=F:W<T&&(B+=2*F)}for(let W=0;W<S.length;W++)S[W]=S[W]/B;x.envMap.value=e.texture,x.samples.value=T,x.weights.value=S,x.latitudinal.value=u==="latitudinal",d&&(x.poleAxis.value=d);const{_lodMax:G}=this;x.dTheta.value=A,x.mipInt.value=G-i;const D=this._sizeLods[r],z=3*D*(r>G-ts?r-G+ts:0),U=4*(this._cubeSize-D);tl(t,z,U,3*D,2*D),m.setRenderTarget(t),m.render(b,pc)}}function Zb(n){const e=[],t=[],i=[];let r=n;const c=n-ts+1+kp.length;for(let u=0;u<c;u++){const d=Math.pow(2,r);e.push(d);let m=1/d;u>n-ts?m=kp[u-n+ts-1]:u===0&&(m=0),t.push(m);const p=1/(d-2),g=-p,b=1+p,x=[g,g,b,g,b,b,g,g,b,b,g,b],M=6,A=6,C=3,T=2,S=1,B=new Float32Array(C*A*M),G=new Float32Array(T*A*M),D=new Float32Array(S*A*M);for(let U=0;U<M;U++){const W=U%3*2/3-1,w=U>2?0:-1,F=[W,w,0,W+2/3,w,0,W+2/3,w+1,0,W,w,0,W+2/3,w+1,0,W,w+1,0];B.set(F,C*A*U),G.set(x,T*A*U);const Z=[U,U,U,U,U,U];D.set(Z,S*A*U)}const z=new _r;z.setAttribute("position",new Gr(B,C)),z.setAttribute("uv",new Gr(G,T)),z.setAttribute("faceIndex",new Gr(D,S)),i.push(new fi(z,null)),r>ts&&r--}return{lodMeshes:i,sizeLods:e,sigmas:t}}function Gp(n,e,t){const i=new Hr(n,e,t);return i.texture.mapping=Vu,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function tl(n,e,t,i,r){n.viewport.set(e,t,i,r),n.scissor.set(e,t,i,r)}function Kb(n,e,t){return new Wr({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:Xb,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${n}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:Wu(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 4.1: Orthonormal basis
				vec3 T1 = vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(V, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + V.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:ba,depthTest:!1,depthWrite:!1})}function Jb(n,e,t){const i=new Float32Array(qs),r=new se(0,1,0);return new Wr({name:"SphericalGaussianBlur",defines:{n:qs,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${n}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:i},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:r}},vertexShader:Wu(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:ba,depthTest:!1,depthWrite:!1})}function Vp(){return new Wr({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Wu(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:ba,depthTest:!1,depthWrite:!1})}function Wp(){return new Wr({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Wu(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:ba,depthTest:!1,depthWrite:!1})}function Wu(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}class ug extends Hr{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const i={width:e,height:e,depth:1},r=[i,i,i,i,i,i];this.texture=new ng(r),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const i={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},r=new ns(5,5,5),c=new Wr({name:"CubemapFromEquirect",uniforms:fl(i.uniforms),vertexShader:i.vertexShader,fragmentShader:i.fragmentShader,side:Ii,blending:ba});c.uniforms.tEquirect.value=t;const u=new fi(r,c),d=t.minFilter;return t.minFilter===$s&&(t.minFilter=pi),new ex(1,10,this).update(e,u),t.minFilter=d,u.geometry.dispose(),u.material.dispose(),this}clear(e,t=!0,i=!0,r=!0){const c=e.getRenderTarget();for(let u=0;u<6;u++)e.setRenderTarget(this,u),e.clear(t,i,r);e.setRenderTarget(c)}}function Qb(n){let e=new WeakMap,t=new WeakMap,i=null;function r(x,M=!1){return x==null?null:M?u(x):c(x)}function c(x){if(x&&x.isTexture){const M=x.mapping;if(M===Eh||M===Th)if(e.has(x)){const A=e.get(x).texture;return d(A,x.mapping)}else{const A=x.image;if(A&&A.height>0){const C=new ug(A.height);return C.fromEquirectangularTexture(n,x),e.set(x,C),x.addEventListener("dispose",p),d(C.texture,x.mapping)}else return null}}return x}function u(x){if(x&&x.isTexture){const M=x.mapping,A=M===Eh||M===Th,C=M===no||M===cl;if(A||C){let T=t.get(x);const S=T!==void 0?T.texture.pmremVersion:0;if(x.isRenderTargetTexture&&x.pmremVersion!==S)return i===null&&(i=new Hp(n)),T=A?i.fromEquirectangular(x,T):i.fromCubemap(x,T),T.texture.pmremVersion=x.pmremVersion,t.set(x,T),T.texture;if(T!==void 0)return T.texture;{const B=x.image;return A&&B&&B.height>0||C&&B&&m(B)?(i===null&&(i=new Hp(n)),T=A?i.fromEquirectangular(x):i.fromCubemap(x),T.texture.pmremVersion=x.pmremVersion,t.set(x,T),x.addEventListener("dispose",g),T.texture):null}}}return x}function d(x,M){return M===Eh?x.mapping=no:M===Th&&(x.mapping=cl),x}function m(x){let M=0;const A=6;for(let C=0;C<A;C++)x[C]!==void 0&&M++;return M===A}function p(x){const M=x.target;M.removeEventListener("dispose",p);const A=e.get(M);A!==void 0&&(e.delete(M),A.dispose())}function g(x){const M=x.target;M.removeEventListener("dispose",g);const A=t.get(M);A!==void 0&&(t.delete(M),A.dispose())}function b(){e=new WeakMap,t=new WeakMap,i!==null&&(i.dispose(),i=null)}return{get:r,dispose:b}}function qb(n){const e={};function t(i){if(e[i]!==void 0)return e[i];const r=n.getExtension(i);return e[i]=r,r}return{has:function(i){return t(i)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(i){const r=t(i);return r===null&&al("WebGLRenderer: "+i+" extension not supported."),r}}}function jb(n,e,t,i){const r={},c=new WeakMap;function u(b){const x=b.target;x.index!==null&&e.remove(x.index);for(const A in x.attributes)e.remove(x.attributes[A]);x.removeEventListener("dispose",u),delete r[x.id];const M=c.get(x);M&&(e.remove(M),c.delete(x)),i.releaseStatesOfGeometry(x),x.isInstancedBufferGeometry===!0&&delete x._maxInstanceCount,t.memory.geometries--}function d(b,x){return r[x.id]===!0||(x.addEventListener("dispose",u),r[x.id]=!0,t.memory.geometries++),x}function m(b){const x=b.attributes;for(const M in x)e.update(x[M],n.ARRAY_BUFFER)}function p(b){const x=[],M=b.index,A=b.attributes.position;let C=0;if(A===void 0)return;if(M!==null){const B=M.array;C=M.version;for(let G=0,D=B.length;G<D;G+=3){const z=B[G+0],U=B[G+1],W=B[G+2];x.push(z,U,U,W,W,z)}}else{const B=A.array;C=A.version;for(let G=0,D=B.length/3-1;G<D;G+=3){const z=G+0,U=G+1,W=G+2;x.push(z,U,U,W,W,z)}}const T=new(A.count>=65535?eg:$m)(x,1);T.version=C;const S=c.get(b);S&&e.remove(S),c.set(b,T)}function g(b){const x=c.get(b);if(x){const M=b.index;M!==null&&x.version<M.version&&p(b)}else p(b);return c.get(b)}return{get:d,update:m,getWireframeAttribute:g}}function $b(n,e,t){let i;function r(b){i=b}let c,u;function d(b){c=b.type,u=b.bytesPerElement}function m(b,x){n.drawElements(i,x,c,b*u),t.update(x,i,1)}function p(b,x,M){M!==0&&(n.drawElementsInstanced(i,x,c,b*u,M),t.update(x,i,M))}function g(b,x,M){if(M===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(i,x,0,c,b,0,M);let C=0;for(let T=0;T<M;T++)C+=x[T];t.update(C,i,1)}this.setMode=r,this.setIndex=d,this.render=m,this.renderInstances=p,this.renderMultiDraw=g}function eM(n){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function i(c,u,d){switch(t.calls++,u){case n.TRIANGLES:t.triangles+=d*(c/3);break;case n.LINES:t.lines+=d*(c/2);break;case n.LINE_STRIP:t.lines+=d*(c-1);break;case n.LINE_LOOP:t.lines+=d*c;break;case n.POINTS:t.points+=d*c;break;default:Xt("WebGLInfo: Unknown draw mode:",u);break}}function r(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:r,update:i}}function tM(n,e,t){const i=new WeakMap,r=new yn;function c(u,d,m){const p=u.morphTargetInfluences,g=d.morphAttributes.position||d.morphAttributes.normal||d.morphAttributes.color,b=g!==void 0?g.length:0;let x=i.get(d);if(x===void 0||x.count!==b){let F=function(){W.dispose(),i.delete(d),d.removeEventListener("dispose",F)};x!==void 0&&x.texture.dispose();const M=d.morphAttributes.position!==void 0,A=d.morphAttributes.normal!==void 0,C=d.morphAttributes.color!==void 0,T=d.morphAttributes.position||[],S=d.morphAttributes.normal||[],B=d.morphAttributes.color||[];let G=0;M===!0&&(G=1),A===!0&&(G=2),C===!0&&(G=3);let D=d.attributes.position.count*G,z=1;D>e.maxTextureSize&&(z=Math.ceil(D/e.maxTextureSize),D=e.maxTextureSize);const U=new Float32Array(D*z*4*b),W=new Qm(U,D,z,b);W.type=Br,W.needsUpdate=!0;const w=G*4;for(let Z=0;Z<b;Z++){const X=T[Z],ne=S[Z],pe=B[Z],_e=D*z*4*Z;for(let re=0;re<X.count;re++){const H=re*w;M===!0&&(r.fromBufferAttribute(X,re),U[_e+H+0]=r.x,U[_e+H+1]=r.y,U[_e+H+2]=r.z,U[_e+H+3]=0),A===!0&&(r.fromBufferAttribute(ne,re),U[_e+H+4]=r.x,U[_e+H+5]=r.y,U[_e+H+6]=r.z,U[_e+H+7]=0),C===!0&&(r.fromBufferAttribute(pe,re),U[_e+H+8]=r.x,U[_e+H+9]=r.y,U[_e+H+10]=r.z,U[_e+H+11]=pe.itemSize===4?r.w:1)}}x={count:b,texture:W,size:new pt(D,z)},i.set(d,x),d.addEventListener("dispose",F)}if(u.isInstancedMesh===!0&&u.morphTexture!==null)m.getUniforms().setValue(n,"morphTexture",u.morphTexture,t);else{let M=0;for(let C=0;C<p.length;C++)M+=p[C];const A=d.morphTargetsRelative?1:1-M;m.getUniforms().setValue(n,"morphTargetBaseInfluence",A),m.getUniforms().setValue(n,"morphTargetInfluences",p)}m.getUniforms().setValue(n,"morphTargetsTexture",x.texture,t),m.getUniforms().setValue(n,"morphTargetsTextureSize",x.size)}return{update:c}}function nM(n,e,t,i,r){let c=new WeakMap;function u(p){const g=r.render.frame,b=p.geometry,x=e.get(p,b);if(c.get(x)!==g&&(e.update(x),c.set(x,g)),p.isInstancedMesh&&(p.hasEventListener("dispose",m)===!1&&p.addEventListener("dispose",m),c.get(p)!==g&&(t.update(p.instanceMatrix,n.ARRAY_BUFFER),p.instanceColor!==null&&t.update(p.instanceColor,n.ARRAY_BUFFER),c.set(p,g))),p.isSkinnedMesh){const M=p.skeleton;c.get(M)!==g&&(M.update(),c.set(M,g))}return x}function d(){c=new WeakMap}function m(p){const g=p.target;g.removeEventListener("dispose",m),i.releaseStatesOfObject(g),t.remove(g.instanceMatrix),g.instanceColor!==null&&t.remove(g.instanceColor)}return{update:u,dispose:d}}const iM={[Fm]:"LINEAR_TONE_MAPPING",[Um]:"REINHARD_TONE_MAPPING",[Om]:"CINEON_TONE_MAPPING",[ad]:"ACES_FILMIC_TONE_MAPPING",[km]:"AGX_TONE_MAPPING",[zm]:"NEUTRAL_TONE_MAPPING",[Bm]:"CUSTOM_TONE_MAPPING"};function rM(n,e,t,i,r,c){const u=new Hr(e,t,{type:n,depthBuffer:r,stencilBuffer:c,samples:i?4:0,depthTexture:r?new ul(e,t):void 0}),d=new Hr(e,t,{type:ya,depthBuffer:!1,stencilBuffer:!1}),m=new _r;m.setAttribute("position",new Mi([-1,3,0,-1,-1,0,3,-1,0],3)),m.setAttribute("uv",new Mi([0,2,0,0,2,0],2));const p=new Z_({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),g=new fi(m,p),b=new bd(-1,1,1,-1,0,1);let x=null,M=null,A=!1,C,T=null,S=[],B=!1;this.setSize=function(G,D){u.setSize(G,D),d.setSize(G,D);for(let z=0;z<S.length;z++){const U=S[z];U.setSize&&U.setSize(G,D)}},this.setEffects=function(G){S=G,B=S.length>0&&S[0].isRenderPass===!0;const D=u.width,z=u.height;for(let U=0;U<S.length;U++){const W=S[U];W.setSize&&W.setSize(D,z)}},this.begin=function(G,D){if(A||G.toneMapping===zr&&S.length===0)return!1;if(T=D,D!==null){const z=D.width,U=D.height;(u.width!==z||u.height!==U)&&this.setSize(z,U)}return B===!1&&G.setRenderTarget(u),C=G.toneMapping,G.toneMapping=zr,!0},this.hasRenderPass=function(){return B},this.end=function(G,D){G.toneMapping=C,A=!0;let z=u,U=d;for(let W=0;W<S.length;W++){const w=S[W];if(w.enabled!==!1&&(w.render(G,U,z,D),w.needsSwap!==!1)){const F=z;z=U,U=F}}if(x!==G.outputColorSpace||M!==G.toneMapping){x=G.outputColorSpace,M=G.toneMapping,p.defines={},Gt.getTransfer(x)===nn&&(p.defines.SRGB_TRANSFER="");const W=iM[M];W&&(p.defines[W]=""),p.needsUpdate=!0}p.uniforms.tDiffuse.value=z.texture,G.setRenderTarget(T),G.render(g,b),T=null,A=!1},this.isCompositing=function(){return A},this.dispose=function(){u.depthTexture&&u.depthTexture.dispose(),u.dispose(),d.dispose(),m.dispose(),p.dispose()}}const hg=new mi,$f=new ul(1,1),fg=new Qm,dg=new S_,pg=new ng,Xp=[],Yp=[],Zp=new Float32Array(16),Kp=new Float32Array(9),Jp=new Float32Array(4);function dl(n,e,t){const i=n[0];if(i<=0||i>0)return n;const r=e*t;let c=Xp[r];if(c===void 0&&(c=new Float32Array(r),Xp[r]=c),e!==0){i.toArray(c,0);for(let u=1,d=0;u!==e;++u)d+=t,n[u].toArray(c,d)}return c}function Gn(n,e){if(n.length!==e.length)return!1;for(let t=0,i=n.length;t<i;t++)if(n[t]!==e[t])return!1;return!0}function Vn(n,e){for(let t=0,i=e.length;t<i;t++)n[t]=e[t]}function Xu(n,e){let t=Yp[e];t===void 0&&(t=new Int32Array(e),Yp[e]=t);for(let i=0;i!==e;++i)t[i]=n.allocateTextureUnit();return t}function aM(n,e){const t=this.cache;t[0]!==e&&(n.uniform1f(this.addr,e),t[0]=e)}function sM(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Gn(t,e))return;n.uniform2fv(this.addr,e),Vn(t,e)}}function oM(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(n.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(Gn(t,e))return;n.uniform3fv(this.addr,e),Vn(t,e)}}function lM(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Gn(t,e))return;n.uniform4fv(this.addr,e),Vn(t,e)}}function cM(n,e){const t=this.cache,i=e.elements;if(i===void 0){if(Gn(t,e))return;n.uniformMatrix2fv(this.addr,!1,e),Vn(t,e)}else{if(Gn(t,i))return;Jp.set(i),n.uniformMatrix2fv(this.addr,!1,Jp),Vn(t,i)}}function uM(n,e){const t=this.cache,i=e.elements;if(i===void 0){if(Gn(t,e))return;n.uniformMatrix3fv(this.addr,!1,e),Vn(t,e)}else{if(Gn(t,i))return;Kp.set(i),n.uniformMatrix3fv(this.addr,!1,Kp),Vn(t,i)}}function hM(n,e){const t=this.cache,i=e.elements;if(i===void 0){if(Gn(t,e))return;n.uniformMatrix4fv(this.addr,!1,e),Vn(t,e)}else{if(Gn(t,i))return;Zp.set(i),n.uniformMatrix4fv(this.addr,!1,Zp),Vn(t,i)}}function fM(n,e){const t=this.cache;t[0]!==e&&(n.uniform1i(this.addr,e),t[0]=e)}function dM(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Gn(t,e))return;n.uniform2iv(this.addr,e),Vn(t,e)}}function pM(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Gn(t,e))return;n.uniform3iv(this.addr,e),Vn(t,e)}}function mM(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Gn(t,e))return;n.uniform4iv(this.addr,e),Vn(t,e)}}function gM(n,e){const t=this.cache;t[0]!==e&&(n.uniform1ui(this.addr,e),t[0]=e)}function _M(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Gn(t,e))return;n.uniform2uiv(this.addr,e),Vn(t,e)}}function xM(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Gn(t,e))return;n.uniform3uiv(this.addr,e),Vn(t,e)}}function vM(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Gn(t,e))return;n.uniform4uiv(this.addr,e),Vn(t,e)}}function bM(n,e,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r);let c;this.type===n.SAMPLER_2D_SHADOW?($f.compareFunction=t.isReversedDepthBuffer()?dd:fd,c=$f):c=hg,t.setTexture2D(e||c,r)}function MM(n,e,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r),t.setTexture3D(e||dg,r)}function yM(n,e,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r),t.setTextureCube(e||pg,r)}function SM(n,e,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r),t.setTexture2DArray(e||fg,r)}function EM(n){switch(n){case 5126:return aM;case 35664:return sM;case 35665:return oM;case 35666:return lM;case 35674:return cM;case 35675:return uM;case 35676:return hM;case 5124:case 35670:return fM;case 35667:case 35671:return dM;case 35668:case 35672:return pM;case 35669:case 35673:return mM;case 5125:return gM;case 36294:return _M;case 36295:return xM;case 36296:return vM;case 35678:case 36198:case 36298:case 36306:case 35682:return bM;case 35679:case 36299:case 36307:return MM;case 35680:case 36300:case 36308:case 36293:return yM;case 36289:case 36303:case 36311:case 36292:return SM}}function TM(n,e){n.uniform1fv(this.addr,e)}function wM(n,e){const t=dl(e,this.size,2);n.uniform2fv(this.addr,t)}function AM(n,e){const t=dl(e,this.size,3);n.uniform3fv(this.addr,t)}function RM(n,e){const t=dl(e,this.size,4);n.uniform4fv(this.addr,t)}function CM(n,e){const t=dl(e,this.size,4);n.uniformMatrix2fv(this.addr,!1,t)}function PM(n,e){const t=dl(e,this.size,9);n.uniformMatrix3fv(this.addr,!1,t)}function DM(n,e){const t=dl(e,this.size,16);n.uniformMatrix4fv(this.addr,!1,t)}function IM(n,e){n.uniform1iv(this.addr,e)}function LM(n,e){n.uniform2iv(this.addr,e)}function NM(n,e){n.uniform3iv(this.addr,e)}function FM(n,e){n.uniform4iv(this.addr,e)}function UM(n,e){n.uniform1uiv(this.addr,e)}function OM(n,e){n.uniform2uiv(this.addr,e)}function BM(n,e){n.uniform3uiv(this.addr,e)}function kM(n,e){n.uniform4uiv(this.addr,e)}function zM(n,e,t){const i=this.cache,r=e.length,c=Xu(t,r);Gn(i,c)||(n.uniform1iv(this.addr,c),Vn(i,c));let u;this.type===n.SAMPLER_2D_SHADOW?u=$f:u=hg;for(let d=0;d!==r;++d)t.setTexture2D(e[d]||u,c[d])}function HM(n,e,t){const i=this.cache,r=e.length,c=Xu(t,r);Gn(i,c)||(n.uniform1iv(this.addr,c),Vn(i,c));for(let u=0;u!==r;++u)t.setTexture3D(e[u]||dg,c[u])}function GM(n,e,t){const i=this.cache,r=e.length,c=Xu(t,r);Gn(i,c)||(n.uniform1iv(this.addr,c),Vn(i,c));for(let u=0;u!==r;++u)t.setTextureCube(e[u]||pg,c[u])}function VM(n,e,t){const i=this.cache,r=e.length,c=Xu(t,r);Gn(i,c)||(n.uniform1iv(this.addr,c),Vn(i,c));for(let u=0;u!==r;++u)t.setTexture2DArray(e[u]||fg,c[u])}function WM(n){switch(n){case 5126:return TM;case 35664:return wM;case 35665:return AM;case 35666:return RM;case 35674:return CM;case 35675:return PM;case 35676:return DM;case 5124:case 35670:return IM;case 35667:case 35671:return LM;case 35668:case 35672:return NM;case 35669:case 35673:return FM;case 5125:return UM;case 36294:return OM;case 36295:return BM;case 36296:return kM;case 35678:case 36198:case 36298:case 36306:case 35682:return zM;case 35679:case 36299:case 36307:return HM;case 35680:case 36300:case 36308:case 36293:return GM;case 36289:case 36303:case 36311:case 36292:return VM}}class XM{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.setValue=EM(t.type)}}class YM{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=WM(t.type)}}class ZM{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,i){const r=this.seq;for(let c=0,u=r.length;c!==u;++c){const d=r[c];d.setValue(e,t[d.id],i)}}}const tf=/(\w+)(\])?(\[|\.)?/g;function Qp(n,e){n.seq.push(e),n.map[e.id]=e}function KM(n,e,t){const i=n.name,r=i.length;for(tf.lastIndex=0;;){const c=tf.exec(i),u=tf.lastIndex;let d=c[1];const m=c[2]==="]",p=c[3];if(m&&(d=d|0),p===void 0||p==="["&&u+2===r){Qp(t,p===void 0?new XM(d,n,e):new YM(d,n,e));break}else{let b=t.map[d];b===void 0&&(b=new ZM(d),Qp(t,b)),t=b}}}class Ou{constructor(e,t){this.seq=[],this.map={};const i=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let u=0;u<i;++u){const d=e.getActiveUniform(t,u),m=e.getUniformLocation(t,d.name);KM(d,m,this)}const r=[],c=[];for(const u of this.seq)u.type===e.SAMPLER_2D_SHADOW||u.type===e.SAMPLER_CUBE_SHADOW||u.type===e.SAMPLER_2D_ARRAY_SHADOW?r.push(u):c.push(u);r.length>0&&(this.seq=r.concat(c))}setValue(e,t,i,r){const c=this.map[t];c!==void 0&&c.setValue(e,i,r)}setOptional(e,t,i){const r=t[i];r!==void 0&&this.setValue(e,i,r)}static upload(e,t,i,r){for(let c=0,u=t.length;c!==u;++c){const d=t[c],m=i[d.id];m.needsUpdate!==!1&&d.setValue(e,m.value,r)}}static seqWithValue(e,t){const i=[];for(let r=0,c=e.length;r!==c;++r){const u=e[r];u.id in t&&i.push(u)}return i}}function qp(n,e,t){const i=n.createShader(e);return n.shaderSource(i,t),n.compileShader(i),i}const JM=37297;let QM=0;function qM(n,e){const t=n.split(`
`),i=[],r=Math.max(e-6,0),c=Math.min(e+6,t.length);for(let u=r;u<c;u++){const d=u+1;i.push(`${d===e?">":" "} ${d}: ${t[u]}`)}return i.join(`
`)}const jp=new xt;function jM(n){Gt._getMatrix(jp,Gt.workingColorSpace,n);const e=`mat3( ${jp.elements.map(t=>t.toFixed(4))} )`;switch(Gt.getTransfer(n)){case Hu:return[e,"LinearTransferOETF"];case nn:return[e,"sRGBTransferOETF"];default:return ft("WebGLProgram: Unsupported color space: ",n),[e,"LinearTransferOETF"]}}function $p(n,e,t){const i=n.getShaderParameter(e,n.COMPILE_STATUS),c=(n.getShaderInfoLog(e)||"").trim();if(i&&c==="")return"";const u=/ERROR: 0:(\d+)/.exec(c);if(u){const d=parseInt(u[1]);return t.toUpperCase()+`

`+c+`

`+qM(n.getShaderSource(e),d)}else return c}function $M(n,e){const t=jM(e);return[`vec4 ${n}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}const ey={[Fm]:"Linear",[Um]:"Reinhard",[Om]:"Cineon",[ad]:"ACESFilmic",[km]:"AgX",[zm]:"Neutral",[Bm]:"Custom"};function ty(n,e){const t=ey[e];return t===void 0?(ft("WebGLProgram: Unsupported toneMapping:",e),"vec3 "+n+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+n+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const Tu=new se;function ny(){Gt.getLuminanceCoefficients(Tu);const n=Tu.x.toFixed(4),e=Tu.y.toFixed(4),t=Tu.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${n}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function iy(n){return[n.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",n.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(vc).join(`
`)}function ry(n){const e=[];for(const t in n){const i=n[t];i!==!1&&e.push("#define "+t+" "+i)}return e.join(`
`)}function ay(n,e){const t={},i=n.getProgramParameter(e,n.ACTIVE_ATTRIBUTES);for(let r=0;r<i;r++){const c=n.getActiveAttrib(e,r),u=c.name;let d=1;c.type===n.FLOAT_MAT2&&(d=2),c.type===n.FLOAT_MAT3&&(d=3),c.type===n.FLOAT_MAT4&&(d=4),t[u]={type:c.type,location:n.getAttribLocation(e,u),locationSize:d}}return t}function vc(n){return n!==""}function em(n,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return n.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function tm(n,e){return n.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const sy=/^[ \t]*#include +<([\w\d./]+)>/gm;function ed(n){return n.replace(sy,ly)}const oy=new Map;function ly(n,e){let t=St[e];if(t===void 0){const i=oy.get(e);if(i!==void 0)t=St[i],ft('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,i);else throw new Error("THREE.WebGLProgram: Can not resolve #include <"+e+">")}return ed(t)}const cy=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function nm(n){return n.replace(cy,uy)}function uy(n,e,t,i){let r="";for(let c=parseInt(e);c<parseInt(t);c++)r+=i.replace(/\[\s*i\s*\]/g,"[ "+c+" ]").replace(/UNROLLED_LOOP_INDEX/g,c);return r}function im(n){let e=`precision ${n.precision} float;
	precision ${n.precision} int;
	precision ${n.precision} sampler2D;
	precision ${n.precision} samplerCube;
	precision ${n.precision} sampler3D;
	precision ${n.precision} sampler2DArray;
	precision ${n.precision} sampler2DShadow;
	precision ${n.precision} samplerCubeShadow;
	precision ${n.precision} sampler2DArrayShadow;
	precision ${n.precision} isampler2D;
	precision ${n.precision} isampler3D;
	precision ${n.precision} isamplerCube;
	precision ${n.precision} isampler2DArray;
	precision ${n.precision} usampler2D;
	precision ${n.precision} usampler3D;
	precision ${n.precision} usamplerCube;
	precision ${n.precision} usampler2DArray;
	`;return n.precision==="highp"?e+=`
#define HIGH_PRECISION`:n.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:n.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}const hy={[Du]:"SHADOWMAP_TYPE_PCF",[_c]:"SHADOWMAP_TYPE_VSM"};function fy(n){return hy[n.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}const dy={[no]:"ENVMAP_TYPE_CUBE",[cl]:"ENVMAP_TYPE_CUBE",[Vu]:"ENVMAP_TYPE_CUBE_UV"};function py(n){return n.envMap===!1?"ENVMAP_TYPE_CUBE":dy[n.envMapMode]||"ENVMAP_TYPE_CUBE"}const my={[cl]:"ENVMAP_MODE_REFRACTION"};function gy(n){return n.envMap===!1?"ENVMAP_MODE_REFLECTION":my[n.envMapMode]||"ENVMAP_MODE_REFLECTION"}const _y={[Nm]:"ENVMAP_BLENDING_MULTIPLY",[t_]:"ENVMAP_BLENDING_MIX",[n_]:"ENVMAP_BLENDING_ADD"};function xy(n){return n.envMap===!1?"ENVMAP_BLENDING_NONE":_y[n.combine]||"ENVMAP_BLENDING_NONE"}function vy(n){const e=n.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,i=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:i,maxMip:t}}function by(n,e,t,i){const r=n.getContext(),c=t.defines;let u=t.vertexShader,d=t.fragmentShader;const m=fy(t),p=py(t),g=gy(t),b=xy(t),x=vy(t),M=iy(t),A=ry(c),C=r.createProgram();let T,S,B=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(T=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,A].filter(vc).join(`
`),T.length>0&&(T+=`
`),S=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,A].filter(vc).join(`
`),S.length>0&&(S+=`
`)):(T=[im(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,A,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+g:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexNormals?"#define HAS_NORMAL":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+m:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(vc).join(`
`),S=[im(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,A,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+p:"",t.envMap?"#define "+g:"",t.envMap?"#define "+b:"",x?"#define CUBEUV_TEXEL_WIDTH "+x.texelWidth:"",x?"#define CUBEUV_TEXEL_HEIGHT "+x.texelHeight:"",x?"#define CUBEUV_MAX_MIP "+x.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas||t.batchingColor?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+m:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==zr?"#define TONE_MAPPING":"",t.toneMapping!==zr?St.tonemapping_pars_fragment:"",t.toneMapping!==zr?ty("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",St.colorspace_pars_fragment,$M("linearToOutputTexel",t.outputColorSpace),ny(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(vc).join(`
`)),u=ed(u),u=em(u,t),u=tm(u,t),d=ed(d),d=em(d,t),d=tm(d,t),u=nm(u),d=nm(d),t.isRawShaderMaterial!==!0&&(B=`#version 300 es
`,T=[M,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+T,S=["#define varying in",t.glslVersion===pp?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===pp?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+S);const G=B+T+u,D=B+S+d,z=qp(r,r.VERTEX_SHADER,G),U=qp(r,r.FRAGMENT_SHADER,D);r.attachShader(C,z),r.attachShader(C,U),t.index0AttributeName!==void 0?r.bindAttribLocation(C,0,t.index0AttributeName):t.hasPositionAttribute===!0&&r.bindAttribLocation(C,0,"position"),r.linkProgram(C);function W(X){if(n.debug.checkShaderErrors){const ne=r.getProgramInfoLog(C)||"",pe=r.getShaderInfoLog(z)||"",_e=r.getShaderInfoLog(U)||"",re=ne.trim(),H=pe.trim(),j=_e.trim();let Ee=!0,Ce=!0;if(r.getProgramParameter(C,r.LINK_STATUS)===!1)if(Ee=!1,typeof n.debug.onShaderError=="function")n.debug.onShaderError(r,C,z,U);else{const ce=$p(r,z,"vertex"),K=$p(r,U,"fragment");Xt("WebGLProgram: Shader Error "+r.getError()+" - VALIDATE_STATUS "+r.getProgramParameter(C,r.VALIDATE_STATUS)+`

Material Name: `+X.name+`
Material Type: `+X.type+`

Program Info Log: `+re+`
`+ce+`
`+K)}else re!==""?ft("WebGLProgram: Program Info Log:",re):(H===""||j==="")&&(Ce=!1);Ce&&(X.diagnostics={runnable:Ee,programLog:re,vertexShader:{log:H,prefix:T},fragmentShader:{log:j,prefix:S}})}r.deleteShader(z),r.deleteShader(U),w=new Ou(r,C),F=ay(r,C)}let w;this.getUniforms=function(){return w===void 0&&W(this),w};let F;this.getAttributes=function(){return F===void 0&&W(this),F};let Z=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return Z===!1&&(Z=r.getProgramParameter(C,JM)),Z},this.destroy=function(){i.releaseStatesOfProgram(this),r.deleteProgram(C),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=QM++,this.cacheKey=e,this.usedTimes=1,this.program=C,this.vertexShader=z,this.fragmentShader=U,this}let My=0;class yy{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e,t,i){const r=this._getShaderCacheForMaterial(e);return r.has(t)===!1&&(r.add(t),t.usedTimes++),r.has(i)===!1&&(r.add(i),i.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const i of t)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(e),this}getVertexShaderStage(e){return this._getShaderStage(e.vertexShader)}getFragmentShaderStage(e){return this._getShaderStage(e.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let i=t.get(e);return i===void 0&&(i=new Set,t.set(e,i)),i}_getShaderStage(e){const t=this.shaderCache;let i=t.get(e);return i===void 0&&(i=new Sy(e),t.set(e,i)),i}}class Sy{constructor(e){this.id=My++,this.code=e,this.usedTimes=0}}function Ey(n){return n===io||n===Bu||n===ku}function Ty(n,e,t,i,r,c){const u=new qm,d=new yy,m=new Set,p=[],g=new Map,b=i.logarithmicDepthBuffer;let x=i.precision;const M={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function A(w){return m.add(w),w===0?"uv":`uv${w}`}function C(w,F,Z,X,ne,pe){const _e=X.fog,re=ne.geometry,H=w.isMeshStandardMaterial||w.isMeshLambertMaterial||w.isMeshPhongMaterial?X.environment:null,j=w.isMeshStandardMaterial||w.isMeshLambertMaterial&&!w.envMap||w.isMeshPhongMaterial&&!w.envMap,Ee=e.get(w.envMap||H,j),Ce=Ee&&Ee.mapping===Vu?Ee.image.height:null,ce=M[w.type];w.precision!==null&&(x=i.getMaxPrecision(w.precision),x!==w.precision&&ft("WebGLProgram.getParameters:",w.precision,"not supported, using",x,"instead."));const K=re.morphAttributes.position||re.morphAttributes.normal||re.morphAttributes.color,ue=K!==void 0?K.length:0;let Pe=0;re.morphAttributes.position!==void 0&&(Pe=1),re.morphAttributes.normal!==void 0&&(Pe=2),re.morphAttributes.color!==void 0&&(Pe=3);let tt,De,me,he;if(ce){const nt=Or[ce];tt=nt.vertexShader,De=nt.fragmentShader}else{tt=w.vertexShader,De=w.fragmentShader;const nt=d.getVertexShaderStage(w),ln=d.getFragmentShaderStage(w);d.update(w,nt,ln),me=nt.id,he=ln.id}const we=n.getRenderTarget(),Ve=n.state.buffers.depth.getReversed(),Ke=ne.isInstancedMesh===!0,Je=ne.isBatchedMesh===!0,Lt=!!w.map,Le=!!w.matcap,kt=!!Ee,mt=!!w.aoMap,Tt=!!w.lightMap,$t=!!w.bumpMap&&w.wireframe===!1,Kt=!!w.normalMap,wt=!!w.displacementMap,En=!!w.emissiveMap,Nt=!!w.metalnessMap,Ft=!!w.roughnessMap,$=w.anisotropy>0,Ln=w.clearcoat>0,it=w.dispersion>0,O=w.iridescence>0,R=w.sheen>0,ie=w.transmission>0,ae=$&&!!w.anisotropyMap,be=Ln&&!!w.clearcoatMap,Ie=Ln&&!!w.clearcoatNormalMap,Ne=Ln&&!!w.clearcoatRoughnessMap,Me=O&&!!w.iridescenceMap,ye=O&&!!w.iridescenceThicknessMap,ze=R&&!!w.sheenColorMap,rt=R&&!!w.sheenRoughnessMap,Ge=!!w.specularMap,He=!!w.specularColorMap,We=!!w.specularIntensityMap,je=ie&&!!w.transmissionMap,ht=ie&&!!w.thicknessMap,J=!!w.gradientMap,Ue=!!w.alphaMap,Te=w.alphaTest>0,Oe=!!w.alphaHash,Fe=!!w.extensions;let Re=zr;w.toneMapped&&(we===null||we.isXRRenderTarget===!0)&&(Re=n.toneMapping);const st={shaderID:ce,shaderType:w.type,shaderName:w.name,vertexShader:tt,fragmentShader:De,defines:w.defines,customVertexShaderID:me,customFragmentShaderID:he,isRawShaderMaterial:w.isRawShaderMaterial===!0,glslVersion:w.glslVersion,precision:x,batching:Je,batchingColor:Je&&ne._colorsTexture!==null,instancing:Ke,instancingColor:Ke&&ne.instanceColor!==null,instancingMorph:Ke&&ne.morphTexture!==null,outputColorSpace:we===null?n.outputColorSpace:we.isXRRenderTarget===!0?we.texture.colorSpace:Gt.workingColorSpace,alphaToCoverage:!!w.alphaToCoverage,map:Lt,matcap:Le,envMap:kt,envMapMode:kt&&Ee.mapping,envMapCubeUVHeight:Ce,aoMap:mt,lightMap:Tt,bumpMap:$t,normalMap:Kt,displacementMap:wt,emissiveMap:En,normalMapObjectSpace:Kt&&w.normalMapType===a_,normalMapTangentSpace:Kt&&w.normalMapType===qf,packedNormalMap:Kt&&w.normalMapType===qf&&Ey(w.normalMap.format),metalnessMap:Nt,roughnessMap:Ft,anisotropy:$,anisotropyMap:ae,clearcoat:Ln,clearcoatMap:be,clearcoatNormalMap:Ie,clearcoatRoughnessMap:Ne,dispersion:it,iridescence:O,iridescenceMap:Me,iridescenceThicknessMap:ye,sheen:R,sheenColorMap:ze,sheenRoughnessMap:rt,specularMap:Ge,specularColorMap:He,specularIntensityMap:We,transmission:ie,transmissionMap:je,thicknessMap:ht,gradientMap:J,opaque:w.transparent===!1&&w.blending===rl&&w.alphaToCoverage===!1,alphaMap:Ue,alphaTest:Te,alphaHash:Oe,combine:w.combine,mapUv:Lt&&A(w.map.channel),aoMapUv:mt&&A(w.aoMap.channel),lightMapUv:Tt&&A(w.lightMap.channel),bumpMapUv:$t&&A(w.bumpMap.channel),normalMapUv:Kt&&A(w.normalMap.channel),displacementMapUv:wt&&A(w.displacementMap.channel),emissiveMapUv:En&&A(w.emissiveMap.channel),metalnessMapUv:Nt&&A(w.metalnessMap.channel),roughnessMapUv:Ft&&A(w.roughnessMap.channel),anisotropyMapUv:ae&&A(w.anisotropyMap.channel),clearcoatMapUv:be&&A(w.clearcoatMap.channel),clearcoatNormalMapUv:Ie&&A(w.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Ne&&A(w.clearcoatRoughnessMap.channel),iridescenceMapUv:Me&&A(w.iridescenceMap.channel),iridescenceThicknessMapUv:ye&&A(w.iridescenceThicknessMap.channel),sheenColorMapUv:ze&&A(w.sheenColorMap.channel),sheenRoughnessMapUv:rt&&A(w.sheenRoughnessMap.channel),specularMapUv:Ge&&A(w.specularMap.channel),specularColorMapUv:He&&A(w.specularColorMap.channel),specularIntensityMapUv:We&&A(w.specularIntensityMap.channel),transmissionMapUv:je&&A(w.transmissionMap.channel),thicknessMapUv:ht&&A(w.thicknessMap.channel),alphaMapUv:Ue&&A(w.alphaMap.channel),vertexTangents:!!re.attributes.tangent&&(Kt||$),vertexNormals:!!re.attributes.normal,vertexColors:w.vertexColors,vertexAlphas:w.vertexColors===!0&&!!re.attributes.color&&re.attributes.color.itemSize===4,pointsUvs:ne.isPoints===!0&&!!re.attributes.uv&&(Lt||Ue),fog:!!_e,useFog:w.fog===!0,fogExp2:!!_e&&_e.isFogExp2,flatShading:w.wireframe===!1&&(w.flatShading===!0||re.attributes.normal===void 0&&Kt===!1&&(w.isMeshLambertMaterial||w.isMeshPhongMaterial||w.isMeshStandardMaterial||w.isMeshPhysicalMaterial)),sizeAttenuation:w.sizeAttenuation===!0,logarithmicDepthBuffer:b,reversedDepthBuffer:Ve,skinning:ne.isSkinnedMesh===!0,hasPositionAttribute:re.attributes.position!==void 0,morphTargets:re.morphAttributes.position!==void 0,morphNormals:re.morphAttributes.normal!==void 0,morphColors:re.morphAttributes.color!==void 0,morphTargetsCount:ue,morphTextureStride:Pe,numDirLights:F.directional.length,numPointLights:F.point.length,numSpotLights:F.spot.length,numSpotLightMaps:F.spotLightMap.length,numRectAreaLights:F.rectArea.length,numHemiLights:F.hemi.length,numDirLightShadows:F.directionalShadowMap.length,numPointLightShadows:F.pointShadowMap.length,numSpotLightShadows:F.spotShadowMap.length,numSpotLightShadowsWithMaps:F.numSpotLightShadowsWithMaps,numLightProbes:F.numLightProbes,numLightProbeGrids:pe.length,numClippingPlanes:c.numPlanes,numClipIntersection:c.numIntersection,dithering:w.dithering,shadowMapEnabled:n.shadowMap.enabled&&Z.length>0,shadowMapType:n.shadowMap.type,toneMapping:Re,decodeVideoTexture:Lt&&w.map.isVideoTexture===!0&&Gt.getTransfer(w.map.colorSpace)===nn,decodeVideoTextureEmissive:En&&w.emissiveMap.isVideoTexture===!0&&Gt.getTransfer(w.emissiveMap.colorSpace)===nn,premultipliedAlpha:w.premultipliedAlpha,doubleSided:w.side===ga,flipSided:w.side===Ii,useDepthPacking:w.depthPacking>=0,depthPacking:w.depthPacking||0,index0AttributeName:w.index0AttributeName,extensionClipCullDistance:Fe&&w.extensions.clipCullDistance===!0&&t.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Fe&&w.extensions.multiDraw===!0||Je)&&t.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:t.has("KHR_parallel_shader_compile"),customProgramCacheKey:w.customProgramCacheKey()};return st.vertexUv1s=m.has(1),st.vertexUv2s=m.has(2),st.vertexUv3s=m.has(3),m.clear(),st}function T(w){const F=[];if(w.shaderID?F.push(w.shaderID):(F.push(w.customVertexShaderID),F.push(w.customFragmentShaderID)),w.defines!==void 0)for(const Z in w.defines)F.push(Z),F.push(w.defines[Z]);return w.isRawShaderMaterial===!1&&(S(F,w),B(F,w),F.push(n.outputColorSpace)),F.push(w.customProgramCacheKey),F.join()}function S(w,F){w.push(F.precision),w.push(F.outputColorSpace),w.push(F.envMapMode),w.push(F.envMapCubeUVHeight),w.push(F.mapUv),w.push(F.alphaMapUv),w.push(F.lightMapUv),w.push(F.aoMapUv),w.push(F.bumpMapUv),w.push(F.normalMapUv),w.push(F.displacementMapUv),w.push(F.emissiveMapUv),w.push(F.metalnessMapUv),w.push(F.roughnessMapUv),w.push(F.anisotropyMapUv),w.push(F.clearcoatMapUv),w.push(F.clearcoatNormalMapUv),w.push(F.clearcoatRoughnessMapUv),w.push(F.iridescenceMapUv),w.push(F.iridescenceThicknessMapUv),w.push(F.sheenColorMapUv),w.push(F.sheenRoughnessMapUv),w.push(F.specularMapUv),w.push(F.specularColorMapUv),w.push(F.specularIntensityMapUv),w.push(F.transmissionMapUv),w.push(F.thicknessMapUv),w.push(F.combine),w.push(F.fogExp2),w.push(F.sizeAttenuation),w.push(F.morphTargetsCount),w.push(F.morphAttributeCount),w.push(F.numDirLights),w.push(F.numPointLights),w.push(F.numSpotLights),w.push(F.numSpotLightMaps),w.push(F.numHemiLights),w.push(F.numRectAreaLights),w.push(F.numDirLightShadows),w.push(F.numPointLightShadows),w.push(F.numSpotLightShadows),w.push(F.numSpotLightShadowsWithMaps),w.push(F.numLightProbes),w.push(F.shadowMapType),w.push(F.toneMapping),w.push(F.numClippingPlanes),w.push(F.numClipIntersection),w.push(F.depthPacking)}function B(w,F){u.disableAll(),F.instancing&&u.enable(0),F.instancingColor&&u.enable(1),F.instancingMorph&&u.enable(2),F.matcap&&u.enable(3),F.envMap&&u.enable(4),F.normalMapObjectSpace&&u.enable(5),F.normalMapTangentSpace&&u.enable(6),F.clearcoat&&u.enable(7),F.iridescence&&u.enable(8),F.alphaTest&&u.enable(9),F.vertexColors&&u.enable(10),F.vertexAlphas&&u.enable(11),F.vertexUv1s&&u.enable(12),F.vertexUv2s&&u.enable(13),F.vertexUv3s&&u.enable(14),F.vertexTangents&&u.enable(15),F.anisotropy&&u.enable(16),F.alphaHash&&u.enable(17),F.batching&&u.enable(18),F.dispersion&&u.enable(19),F.batchingColor&&u.enable(20),F.gradientMap&&u.enable(21),F.packedNormalMap&&u.enable(22),F.vertexNormals&&u.enable(23),w.push(u.mask),u.disableAll(),F.fog&&u.enable(0),F.useFog&&u.enable(1),F.flatShading&&u.enable(2),F.logarithmicDepthBuffer&&u.enable(3),F.reversedDepthBuffer&&u.enable(4),F.skinning&&u.enable(5),F.morphTargets&&u.enable(6),F.morphNormals&&u.enable(7),F.morphColors&&u.enable(8),F.premultipliedAlpha&&u.enable(9),F.shadowMapEnabled&&u.enable(10),F.doubleSided&&u.enable(11),F.flipSided&&u.enable(12),F.useDepthPacking&&u.enable(13),F.dithering&&u.enable(14),F.transmission&&u.enable(15),F.sheen&&u.enable(16),F.opaque&&u.enable(17),F.pointsUvs&&u.enable(18),F.decodeVideoTexture&&u.enable(19),F.decodeVideoTextureEmissive&&u.enable(20),F.alphaToCoverage&&u.enable(21),F.numLightProbeGrids>0&&u.enable(22),F.hasPositionAttribute&&u.enable(23),w.push(u.mask)}function G(w){const F=M[w.type];let Z;if(F){const X=Or[F];Z=W_.clone(X.uniforms)}else Z=w.uniforms;return Z}function D(w,F){let Z=g.get(F);return Z!==void 0?++Z.usedTimes:(Z=new by(n,F,w,r),p.push(Z),g.set(F,Z)),Z}function z(w){if(--w.usedTimes===0){const F=p.indexOf(w);p[F]=p[p.length-1],p.pop(),g.delete(w.cacheKey),w.destroy()}}function U(w){d.remove(w)}function W(){d.dispose()}return{getParameters:C,getProgramCacheKey:T,getUniforms:G,acquireProgram:D,releaseProgram:z,releaseShaderCache:U,programs:p,dispose:W}}function wy(){let n=new WeakMap;function e(u){return n.has(u)}function t(u){let d=n.get(u);return d===void 0&&(d={},n.set(u,d)),d}function i(u){n.delete(u)}function r(u,d,m){n.get(u)[d]=m}function c(){n=new WeakMap}return{has:e,get:t,remove:i,update:r,dispose:c}}function Ay(n,e){return n.groupOrder!==e.groupOrder?n.groupOrder-e.groupOrder:n.renderOrder!==e.renderOrder?n.renderOrder-e.renderOrder:n.material.id!==e.material.id?n.material.id-e.material.id:n.materialVariant!==e.materialVariant?n.materialVariant-e.materialVariant:n.z!==e.z?n.z-e.z:n.id-e.id}function rm(n,e){return n.groupOrder!==e.groupOrder?n.groupOrder-e.groupOrder:n.renderOrder!==e.renderOrder?n.renderOrder-e.renderOrder:n.z!==e.z?e.z-n.z:n.id-e.id}function am(){const n=[];let e=0;const t=[],i=[],r=[];function c(){e=0,t.length=0,i.length=0,r.length=0}function u(x){let M=0;return x.isInstancedMesh&&(M+=2),x.isSkinnedMesh&&(M+=1),M}function d(x,M,A,C,T,S){let B=n[e];return B===void 0?(B={id:x.id,object:x,geometry:M,material:A,materialVariant:u(x),groupOrder:C,renderOrder:x.renderOrder,z:T,group:S},n[e]=B):(B.id=x.id,B.object=x,B.geometry=M,B.material=A,B.materialVariant=u(x),B.groupOrder=C,B.renderOrder=x.renderOrder,B.z=T,B.group=S),e++,B}function m(x,M,A,C,T,S){const B=d(x,M,A,C,T,S);A.transmission>0?i.push(B):A.transparent===!0?r.push(B):t.push(B)}function p(x,M,A,C,T,S){const B=d(x,M,A,C,T,S);A.transmission>0?i.unshift(B):A.transparent===!0?r.unshift(B):t.unshift(B)}function g(x,M,A){t.length>1&&t.sort(x||Ay),i.length>1&&i.sort(M||rm),r.length>1&&r.sort(M||rm),A&&(t.reverse(),i.reverse(),r.reverse())}function b(){for(let x=e,M=n.length;x<M;x++){const A=n[x];if(A.id===null)break;A.id=null,A.object=null,A.geometry=null,A.material=null,A.group=null}}return{opaque:t,transmissive:i,transparent:r,init:c,push:m,unshift:p,finish:b,sort:g}}function Ry(){let n=new WeakMap;function e(i,r){const c=n.get(i);let u;return c===void 0?(u=new am,n.set(i,[u])):r>=c.length?(u=new am,c.push(u)):u=c[r],u}function t(){n=new WeakMap}return{get:e,dispose:t}}function Cy(){const n={};return{get:function(e){if(n[e.id]!==void 0)return n[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new se,color:new It};break;case"SpotLight":t={position:new se,direction:new se,color:new It,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new se,color:new It,distance:0,decay:0};break;case"HemisphereLight":t={direction:new se,skyColor:new It,groundColor:new It};break;case"RectAreaLight":t={color:new It,position:new se,halfWidth:new se,halfHeight:new se};break}return n[e.id]=t,t}}}function Py(){const n={};return{get:function(e){if(n[e.id]!==void 0)return n[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new pt};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new pt};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new pt,shadowCameraNear:1,shadowCameraFar:1e3};break}return n[e.id]=t,t}}}let Dy=0;function Iy(n,e){return(e.castShadow?2:0)-(n.castShadow?2:0)+(e.map?1:0)-(n.map?1:0)}function Ly(n){const e=new Cy,t=Py(),i={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let p=0;p<9;p++)i.probe.push(new se);const r=new se,c=new Sn,u=new Sn;function d(p){let g=0,b=0,x=0;for(let F=0;F<9;F++)i.probe[F].set(0,0,0);let M=0,A=0,C=0,T=0,S=0,B=0,G=0,D=0,z=0,U=0,W=0;p.sort(Iy);for(let F=0,Z=p.length;F<Z;F++){const X=p[F],ne=X.color,pe=X.intensity,_e=X.distance;let re=null;if(X.shadow&&X.shadow.map&&(X.shadow.map.texture.format===io?re=X.shadow.map.texture:re=X.shadow.map.depthTexture||X.shadow.map.texture),X.isAmbientLight)g+=ne.r*pe,b+=ne.g*pe,x+=ne.b*pe;else if(X.isLightProbe){for(let H=0;H<9;H++)i.probe[H].addScaledVector(X.sh.coefficients[H],pe);W++}else if(X.isDirectionalLight){const H=e.get(X);if(H.color.copy(X.color).multiplyScalar(X.intensity),X.castShadow){const j=X.shadow,Ee=t.get(X);Ee.shadowIntensity=j.intensity,Ee.shadowBias=j.bias,Ee.shadowNormalBias=j.normalBias,Ee.shadowRadius=j.radius,Ee.shadowMapSize=j.mapSize,i.directionalShadow[M]=Ee,i.directionalShadowMap[M]=re,i.directionalShadowMatrix[M]=X.shadow.matrix,B++}i.directional[M]=H,M++}else if(X.isSpotLight){const H=e.get(X);H.position.setFromMatrixPosition(X.matrixWorld),H.color.copy(ne).multiplyScalar(pe),H.distance=_e,H.coneCos=Math.cos(X.angle),H.penumbraCos=Math.cos(X.angle*(1-X.penumbra)),H.decay=X.decay,i.spot[C]=H;const j=X.shadow;if(X.map&&(i.spotLightMap[z]=X.map,z++,j.updateMatrices(X),X.castShadow&&U++),i.spotLightMatrix[C]=j.matrix,X.castShadow){const Ee=t.get(X);Ee.shadowIntensity=j.intensity,Ee.shadowBias=j.bias,Ee.shadowNormalBias=j.normalBias,Ee.shadowRadius=j.radius,Ee.shadowMapSize=j.mapSize,i.spotShadow[C]=Ee,i.spotShadowMap[C]=re,D++}C++}else if(X.isRectAreaLight){const H=e.get(X);H.color.copy(ne).multiplyScalar(pe),H.halfWidth.set(X.width*.5,0,0),H.halfHeight.set(0,X.height*.5,0),i.rectArea[T]=H,T++}else if(X.isPointLight){const H=e.get(X);if(H.color.copy(X.color).multiplyScalar(X.intensity),H.distance=X.distance,H.decay=X.decay,X.castShadow){const j=X.shadow,Ee=t.get(X);Ee.shadowIntensity=j.intensity,Ee.shadowBias=j.bias,Ee.shadowNormalBias=j.normalBias,Ee.shadowRadius=j.radius,Ee.shadowMapSize=j.mapSize,Ee.shadowCameraNear=j.camera.near,Ee.shadowCameraFar=j.camera.far,i.pointShadow[A]=Ee,i.pointShadowMap[A]=re,i.pointShadowMatrix[A]=X.shadow.matrix,G++}i.point[A]=H,A++}else if(X.isHemisphereLight){const H=e.get(X);H.skyColor.copy(X.color).multiplyScalar(pe),H.groundColor.copy(X.groundColor).multiplyScalar(pe),i.hemi[S]=H,S++}}T>0&&(n.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=Qe.LTC_FLOAT_1,i.rectAreaLTC2=Qe.LTC_FLOAT_2):(i.rectAreaLTC1=Qe.LTC_HALF_1,i.rectAreaLTC2=Qe.LTC_HALF_2)),i.ambient[0]=g,i.ambient[1]=b,i.ambient[2]=x;const w=i.hash;(w.directionalLength!==M||w.pointLength!==A||w.spotLength!==C||w.rectAreaLength!==T||w.hemiLength!==S||w.numDirectionalShadows!==B||w.numPointShadows!==G||w.numSpotShadows!==D||w.numSpotMaps!==z||w.numLightProbes!==W)&&(i.directional.length=M,i.spot.length=C,i.rectArea.length=T,i.point.length=A,i.hemi.length=S,i.directionalShadow.length=B,i.directionalShadowMap.length=B,i.pointShadow.length=G,i.pointShadowMap.length=G,i.spotShadow.length=D,i.spotShadowMap.length=D,i.directionalShadowMatrix.length=B,i.pointShadowMatrix.length=G,i.spotLightMatrix.length=D+z-U,i.spotLightMap.length=z,i.numSpotLightShadowsWithMaps=U,i.numLightProbes=W,w.directionalLength=M,w.pointLength=A,w.spotLength=C,w.rectAreaLength=T,w.hemiLength=S,w.numDirectionalShadows=B,w.numPointShadows=G,w.numSpotShadows=D,w.numSpotMaps=z,w.numLightProbes=W,i.version=Dy++)}function m(p,g){let b=0,x=0,M=0,A=0,C=0;const T=g.matrixWorldInverse;for(let S=0,B=p.length;S<B;S++){const G=p[S];if(G.isDirectionalLight){const D=i.directional[b];D.direction.setFromMatrixPosition(G.matrixWorld),r.setFromMatrixPosition(G.target.matrixWorld),D.direction.sub(r),D.direction.transformDirection(T),b++}else if(G.isSpotLight){const D=i.spot[M];D.position.setFromMatrixPosition(G.matrixWorld),D.position.applyMatrix4(T),D.direction.setFromMatrixPosition(G.matrixWorld),r.setFromMatrixPosition(G.target.matrixWorld),D.direction.sub(r),D.direction.transformDirection(T),M++}else if(G.isRectAreaLight){const D=i.rectArea[A];D.position.setFromMatrixPosition(G.matrixWorld),D.position.applyMatrix4(T),u.identity(),c.copy(G.matrixWorld),c.premultiply(T),u.extractRotation(c),D.halfWidth.set(G.width*.5,0,0),D.halfHeight.set(0,G.height*.5,0),D.halfWidth.applyMatrix4(u),D.halfHeight.applyMatrix4(u),A++}else if(G.isPointLight){const D=i.point[x];D.position.setFromMatrixPosition(G.matrixWorld),D.position.applyMatrix4(T),x++}else if(G.isHemisphereLight){const D=i.hemi[C];D.direction.setFromMatrixPosition(G.matrixWorld),D.direction.transformDirection(T),C++}}}return{setup:d,setupView:m,state:i}}function sm(n){const e=new Ly(n),t=[],i=[],r=[];function c(x){b.camera=x,t.length=0,i.length=0,r.length=0}function u(x){t.push(x)}function d(x){i.push(x)}function m(x){r.push(x)}function p(){e.setup(t)}function g(x){e.setupView(t,x)}const b={lightsArray:t,shadowsArray:i,lightProbeGridArray:r,camera:null,lights:e,transmissionRenderTarget:{},textureUnits:0};return{init:c,state:b,setupLights:p,setupLightsView:g,pushLight:u,pushShadow:d,pushLightProbeGrid:m}}function Ny(n){let e=new WeakMap;function t(r,c=0){const u=e.get(r);let d;return u===void 0?(d=new sm(n),e.set(r,[d])):c>=u.length?(d=new sm(n),u.push(d)):d=u[c],d}function i(){e=new WeakMap}return{get:t,dispose:i}}const Fy=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Uy=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,Oy=[new se(1,0,0),new se(-1,0,0),new se(0,1,0),new se(0,-1,0),new se(0,0,1),new se(0,0,-1)],By=[new se(0,-1,0),new se(0,-1,0),new se(0,0,1),new se(0,0,-1),new se(0,-1,0),new se(0,-1,0)],om=new Sn,mc=new se,nf=new se;function ky(n,e,t){let i=new _d;const r=new pt,c=new pt,u=new yn,d=new J_,m=new Q_,p={},g=t.maxTextureSize,b={[is]:Ii,[Ii]:is,[ga]:ga},x=new Wr({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new pt},radius:{value:4}},vertexShader:Fy,fragmentShader:Uy}),M=x.clone();M.defines.HORIZONTAL_PASS=1;const A=new _r;A.setAttribute("position",new Gr(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const C=new fi(A,x),T=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Du;let S=this.type;this.render=function(U,W,w){if(T.enabled===!1||T.autoUpdate===!1&&T.needsUpdate===!1||U.length===0)return;this.type===Lm&&(ft("WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead."),this.type=Du);const F=n.getRenderTarget(),Z=n.getActiveCubeFace(),X=n.getActiveMipmapLevel(),ne=n.state;ne.setBlending(ba),ne.buffers.depth.getReversed()===!0?ne.buffers.color.setClear(0,0,0,0):ne.buffers.color.setClear(1,1,1,1),ne.buffers.depth.setTest(!0),ne.setScissorTest(!1);const pe=S!==this.type;pe&&W.traverse(function(_e){_e.material&&(Array.isArray(_e.material)?_e.material.forEach(re=>re.needsUpdate=!0):_e.material.needsUpdate=!0)});for(let _e=0,re=U.length;_e<re;_e++){const H=U[_e],j=H.shadow;if(j===void 0){ft("WebGLShadowMap:",H,"has no shadow.");continue}if(j.autoUpdate===!1&&j.needsUpdate===!1)continue;r.copy(j.mapSize);const Ee=j.getFrameExtents();r.multiply(Ee),c.copy(j.mapSize),(r.x>g||r.y>g)&&(r.x>g&&(c.x=Math.floor(g/Ee.x),r.x=c.x*Ee.x,j.mapSize.x=c.x),r.y>g&&(c.y=Math.floor(g/Ee.y),r.y=c.y*Ee.y,j.mapSize.y=c.y));const Ce=n.state.buffers.depth.getReversed();if(j.camera._reversedDepth=Ce,j.map===null||pe===!0){if(j.map!==null&&(j.map.depthTexture!==null&&(j.map.depthTexture.dispose(),j.map.depthTexture=null),j.map.dispose()),this.type===_c){if(H.isPointLight){ft("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}j.map=new Hr(r.x,r.y,{format:io,type:ya,minFilter:pi,magFilter:pi,generateMipmaps:!1}),j.map.texture.name=H.name+".shadowMap",j.map.depthTexture=new ul(r.x,r.y,Br),j.map.depthTexture.name=H.name+".shadowMapDepth",j.map.depthTexture.format=Sa,j.map.depthTexture.compareFunction=null,j.map.depthTexture.minFilter=ri,j.map.depthTexture.magFilter=ri}else H.isPointLight?(j.map=new ug(r.x),j.map.depthTexture=new G_(r.x,Vr)):(j.map=new Hr(r.x,r.y),j.map.depthTexture=new ul(r.x,r.y,Vr)),j.map.depthTexture.name=H.name+".shadowMap",j.map.depthTexture.format=Sa,this.type===Du?(j.map.depthTexture.compareFunction=Ce?dd:fd,j.map.depthTexture.minFilter=pi,j.map.depthTexture.magFilter=pi):(j.map.depthTexture.compareFunction=null,j.map.depthTexture.minFilter=ri,j.map.depthTexture.magFilter=ri);j.camera.updateProjectionMatrix()}const ce=j.map.isWebGLCubeRenderTarget?6:1;for(let K=0;K<ce;K++){if(j.map.isWebGLCubeRenderTarget)n.setRenderTarget(j.map,K),n.clear();else{K===0&&(n.setRenderTarget(j.map),n.clear());const ue=j.getViewport(K);u.set(c.x*ue.x,c.y*ue.y,c.x*ue.z,c.y*ue.w),ne.viewport(u)}if(H.isPointLight){const ue=j.camera,Pe=j.matrix,tt=H.distance||ue.far;tt!==ue.far&&(ue.far=tt,ue.updateProjectionMatrix()),mc.setFromMatrixPosition(H.matrixWorld),ue.position.copy(mc),nf.copy(ue.position),nf.add(Oy[K]),ue.up.copy(By[K]),ue.lookAt(nf),ue.updateMatrixWorld(),Pe.makeTranslation(-mc.x,-mc.y,-mc.z),om.multiplyMatrices(ue.projectionMatrix,ue.matrixWorldInverse),j._frustum.setFromProjectionMatrix(om,ue.coordinateSystem,ue.reversedDepth)}else j.updateMatrices(H);i=j.getFrustum(),D(W,w,j.camera,H,this.type)}j.isPointLightShadow!==!0&&this.type===_c&&B(j,w),j.needsUpdate=!1}S=this.type,T.needsUpdate=!1,n.setRenderTarget(F,Z,X)};function B(U,W){const w=e.update(C);x.defines.VSM_SAMPLES!==U.blurSamples&&(x.defines.VSM_SAMPLES=U.blurSamples,M.defines.VSM_SAMPLES=U.blurSamples,x.needsUpdate=!0,M.needsUpdate=!0),U.mapPass===null&&(U.mapPass=new Hr(r.x,r.y,{format:io,type:ya})),x.uniforms.shadow_pass.value=U.map.depthTexture,x.uniforms.resolution.value=U.mapSize,x.uniforms.radius.value=U.radius,n.setRenderTarget(U.mapPass),n.clear(),n.renderBufferDirect(W,null,w,x,C,null),M.uniforms.shadow_pass.value=U.mapPass.texture,M.uniforms.resolution.value=U.mapSize,M.uniforms.radius.value=U.radius,n.setRenderTarget(U.map),n.clear(),n.renderBufferDirect(W,null,w,M,C,null)}function G(U,W,w,F){let Z=null;const X=w.isPointLight===!0?U.customDistanceMaterial:U.customDepthMaterial;if(X!==void 0)Z=X;else if(Z=w.isPointLight===!0?m:d,n.localClippingEnabled&&W.clipShadows===!0&&Array.isArray(W.clippingPlanes)&&W.clippingPlanes.length!==0||W.displacementMap&&W.displacementScale!==0||W.alphaMap&&W.alphaTest>0||W.map&&W.alphaTest>0||W.alphaToCoverage===!0){const ne=Z.uuid,pe=W.uuid;let _e=p[ne];_e===void 0&&(_e={},p[ne]=_e);let re=_e[pe];re===void 0&&(re=Z.clone(),_e[pe]=re,W.addEventListener("dispose",z)),Z=re}if(Z.visible=W.visible,Z.wireframe=W.wireframe,F===_c?Z.side=W.shadowSide!==null?W.shadowSide:W.side:Z.side=W.shadowSide!==null?W.shadowSide:b[W.side],Z.alphaMap=W.alphaMap,Z.alphaTest=W.alphaToCoverage===!0?.5:W.alphaTest,Z.map=W.map,Z.clipShadows=W.clipShadows,Z.clippingPlanes=W.clippingPlanes,Z.clipIntersection=W.clipIntersection,Z.displacementMap=W.displacementMap,Z.displacementScale=W.displacementScale,Z.displacementBias=W.displacementBias,Z.wireframeLinewidth=W.wireframeLinewidth,Z.linewidth=W.linewidth,w.isPointLight===!0&&Z.isMeshDistanceMaterial===!0){const ne=n.properties.get(Z);ne.light=w}return Z}function D(U,W,w,F,Z){if(U.visible===!1)return;if(U.layers.test(W.layers)&&(U.isMesh||U.isLine||U.isPoints)&&(U.castShadow||U.receiveShadow&&Z===_c)&&(!U.frustumCulled||i.intersectsObject(U))){U.modelViewMatrix.multiplyMatrices(w.matrixWorldInverse,U.matrixWorld);const pe=e.update(U),_e=U.material;if(Array.isArray(_e)){const re=pe.groups;for(let H=0,j=re.length;H<j;H++){const Ee=re[H],Ce=_e[Ee.materialIndex];if(Ce&&Ce.visible){const ce=G(U,Ce,F,Z);U.onBeforeShadow(n,U,W,w,pe,ce,Ee),n.renderBufferDirect(w,null,pe,ce,U,Ee),U.onAfterShadow(n,U,W,w,pe,ce,Ee)}}}else if(_e.visible){const re=G(U,_e,F,Z);U.onBeforeShadow(n,U,W,w,pe,re,null),n.renderBufferDirect(w,null,pe,re,U,null),U.onAfterShadow(n,U,W,w,pe,re,null)}}const ne=U.children;for(let pe=0,_e=ne.length;pe<_e;pe++)D(ne[pe],W,w,F,Z)}function z(U){U.target.removeEventListener("dispose",z);for(const w in p){const F=p[w],Z=U.target.uuid;Z in F&&(F[Z].dispose(),delete F[Z])}}}function zy(n,e){function t(){let J=!1;const Ue=new yn;let Te=null;const Oe=new yn(0,0,0,0);return{setMask:function(Fe){Te!==Fe&&!J&&(n.colorMask(Fe,Fe,Fe,Fe),Te=Fe)},setLocked:function(Fe){J=Fe},setClear:function(Fe,Re,st,nt,ln){ln===!0&&(Fe*=nt,Re*=nt,st*=nt),Ue.set(Fe,Re,st,nt),Oe.equals(Ue)===!1&&(n.clearColor(Fe,Re,st,nt),Oe.copy(Ue))},reset:function(){J=!1,Te=null,Oe.set(-1,0,0,0)}}}function i(){let J=!1,Ue=!1,Te=null,Oe=null,Fe=null;return{setReversed:function(Re){if(Ue!==Re){const st=e.get("EXT_clip_control");Re?st.clipControlEXT(st.LOWER_LEFT_EXT,st.ZERO_TO_ONE_EXT):st.clipControlEXT(st.LOWER_LEFT_EXT,st.NEGATIVE_ONE_TO_ONE_EXT),Ue=Re;const nt=Fe;Fe=null,this.setClear(nt)}},getReversed:function(){return Ue},setTest:function(Re){Re?we(n.DEPTH_TEST):Ve(n.DEPTH_TEST)},setMask:function(Re){Te!==Re&&!J&&(n.depthMask(Re),Te=Re)},setFunc:function(Re){if(Ue&&(Re=m_[Re]),Oe!==Re){switch(Re){case ff:n.depthFunc(n.NEVER);break;case df:n.depthFunc(n.ALWAYS);break;case pf:n.depthFunc(n.LESS);break;case ll:n.depthFunc(n.LEQUAL);break;case mf:n.depthFunc(n.EQUAL);break;case gf:n.depthFunc(n.GEQUAL);break;case _f:n.depthFunc(n.GREATER);break;case xf:n.depthFunc(n.NOTEQUAL);break;default:n.depthFunc(n.LEQUAL)}Oe=Re}},setLocked:function(Re){J=Re},setClear:function(Re){Fe!==Re&&(Fe=Re,Ue&&(Re=1-Re),n.clearDepth(Re))},reset:function(){J=!1,Te=null,Oe=null,Fe=null,Ue=!1}}}function r(){let J=!1,Ue=null,Te=null,Oe=null,Fe=null,Re=null,st=null,nt=null,ln=null;return{setTest:function(Vt){J||(Vt?we(n.STENCIL_TEST):Ve(n.STENCIL_TEST))},setMask:function(Vt){Ue!==Vt&&!J&&(n.stencilMask(Vt),Ue=Vt)},setFunc:function(Vt,Wn,Jt){(Te!==Vt||Oe!==Wn||Fe!==Jt)&&(n.stencilFunc(Vt,Wn,Jt),Te=Vt,Oe=Wn,Fe=Jt)},setOp:function(Vt,Wn,Jt){(Re!==Vt||st!==Wn||nt!==Jt)&&(n.stencilOp(Vt,Wn,Jt),Re=Vt,st=Wn,nt=Jt)},setLocked:function(Vt){J=Vt},setClear:function(Vt){ln!==Vt&&(n.clearStencil(Vt),ln=Vt)},reset:function(){J=!1,Ue=null,Te=null,Oe=null,Fe=null,Re=null,st=null,nt=null,ln=null}}}const c=new t,u=new i,d=new r,m=new WeakMap,p=new WeakMap;let g={},b={},x={},M=new WeakMap,A=[],C=null,T=!1,S=null,B=null,G=null,D=null,z=null,U=null,W=null,w=new It(0,0,0),F=0,Z=!1,X=null,ne=null,pe=null,_e=null,re=null;const H=n.getParameter(n.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let j=!1,Ee=0;const Ce=n.getParameter(n.VERSION);Ce.indexOf("WebGL")!==-1?(Ee=parseFloat(/^WebGL (\d)/.exec(Ce)[1]),j=Ee>=1):Ce.indexOf("OpenGL ES")!==-1&&(Ee=parseFloat(/^OpenGL ES (\d)/.exec(Ce)[1]),j=Ee>=2);let ce=null,K={};const ue=n.getParameter(n.SCISSOR_BOX),Pe=n.getParameter(n.VIEWPORT),tt=new yn().fromArray(ue),De=new yn().fromArray(Pe);function me(J,Ue,Te,Oe){const Fe=new Uint8Array(4),Re=n.createTexture();n.bindTexture(J,Re),n.texParameteri(J,n.TEXTURE_MIN_FILTER,n.NEAREST),n.texParameteri(J,n.TEXTURE_MAG_FILTER,n.NEAREST);for(let st=0;st<Te;st++)J===n.TEXTURE_3D||J===n.TEXTURE_2D_ARRAY?n.texImage3D(Ue,0,n.RGBA,1,1,Oe,0,n.RGBA,n.UNSIGNED_BYTE,Fe):n.texImage2D(Ue+st,0,n.RGBA,1,1,0,n.RGBA,n.UNSIGNED_BYTE,Fe);return Re}const he={};he[n.TEXTURE_2D]=me(n.TEXTURE_2D,n.TEXTURE_2D,1),he[n.TEXTURE_CUBE_MAP]=me(n.TEXTURE_CUBE_MAP,n.TEXTURE_CUBE_MAP_POSITIVE_X,6),he[n.TEXTURE_2D_ARRAY]=me(n.TEXTURE_2D_ARRAY,n.TEXTURE_2D_ARRAY,1,1),he[n.TEXTURE_3D]=me(n.TEXTURE_3D,n.TEXTURE_3D,1,1),c.setClear(0,0,0,1),u.setClear(1),d.setClear(0),we(n.DEPTH_TEST),u.setFunc(ll),$t(!1),Kt(lp),we(n.CULL_FACE),mt(ba);function we(J){g[J]!==!0&&(n.enable(J),g[J]=!0)}function Ve(J){g[J]!==!1&&(n.disable(J),g[J]=!1)}function Ke(J,Ue){return x[J]!==Ue?(n.bindFramebuffer(J,Ue),x[J]=Ue,J===n.DRAW_FRAMEBUFFER&&(x[n.FRAMEBUFFER]=Ue),J===n.FRAMEBUFFER&&(x[n.DRAW_FRAMEBUFFER]=Ue),!0):!1}function Je(J,Ue){let Te=A,Oe=!1;if(J){Te=M.get(Ue),Te===void 0&&(Te=[],M.set(Ue,Te));const Fe=J.textures;if(Te.length!==Fe.length||Te[0]!==n.COLOR_ATTACHMENT0){for(let Re=0,st=Fe.length;Re<st;Re++)Te[Re]=n.COLOR_ATTACHMENT0+Re;Te.length=Fe.length,Oe=!0}}else Te[0]!==n.BACK&&(Te[0]=n.BACK,Oe=!0);Oe&&n.drawBuffers(Te)}function Lt(J){return C!==J?(n.useProgram(J),C=J,!0):!1}const Le={[Qs]:n.FUNC_ADD,[B0]:n.FUNC_SUBTRACT,[k0]:n.FUNC_REVERSE_SUBTRACT};Le[z0]=n.MIN,Le[H0]=n.MAX;const kt={[G0]:n.ZERO,[V0]:n.ONE,[W0]:n.SRC_COLOR,[uf]:n.SRC_ALPHA,[Q0]:n.SRC_ALPHA_SATURATE,[K0]:n.DST_COLOR,[Y0]:n.DST_ALPHA,[X0]:n.ONE_MINUS_SRC_COLOR,[hf]:n.ONE_MINUS_SRC_ALPHA,[J0]:n.ONE_MINUS_DST_COLOR,[Z0]:n.ONE_MINUS_DST_ALPHA,[q0]:n.CONSTANT_COLOR,[j0]:n.ONE_MINUS_CONSTANT_COLOR,[$0]:n.CONSTANT_ALPHA,[e_]:n.ONE_MINUS_CONSTANT_ALPHA};function mt(J,Ue,Te,Oe,Fe,Re,st,nt,ln,Vt){if(J===ba){T===!0&&(Ve(n.BLEND),T=!1);return}if(T===!1&&(we(n.BLEND),T=!0),J!==O0){if(J!==S||Vt!==Z){if((B!==Qs||z!==Qs)&&(n.blendEquation(n.FUNC_ADD),B=Qs,z=Qs),Vt)switch(J){case rl:n.blendFuncSeparate(n.ONE,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case cp:n.blendFunc(n.ONE,n.ONE);break;case up:n.blendFuncSeparate(n.ZERO,n.ONE_MINUS_SRC_COLOR,n.ZERO,n.ONE);break;case hp:n.blendFuncSeparate(n.DST_COLOR,n.ONE_MINUS_SRC_ALPHA,n.ZERO,n.ONE);break;default:Xt("WebGLState: Invalid blending: ",J);break}else switch(J){case rl:n.blendFuncSeparate(n.SRC_ALPHA,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case cp:n.blendFuncSeparate(n.SRC_ALPHA,n.ONE,n.ONE,n.ONE);break;case up:Xt("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case hp:Xt("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:Xt("WebGLState: Invalid blending: ",J);break}G=null,D=null,U=null,W=null,w.set(0,0,0),F=0,S=J,Z=Vt}return}Fe=Fe||Ue,Re=Re||Te,st=st||Oe,(Ue!==B||Fe!==z)&&(n.blendEquationSeparate(Le[Ue],Le[Fe]),B=Ue,z=Fe),(Te!==G||Oe!==D||Re!==U||st!==W)&&(n.blendFuncSeparate(kt[Te],kt[Oe],kt[Re],kt[st]),G=Te,D=Oe,U=Re,W=st),(nt.equals(w)===!1||ln!==F)&&(n.blendColor(nt.r,nt.g,nt.b,ln),w.copy(nt),F=ln),S=J,Z=!1}function Tt(J,Ue){J.side===ga?Ve(n.CULL_FACE):we(n.CULL_FACE);let Te=J.side===Ii;Ue&&(Te=!Te),$t(Te),J.blending===rl&&J.transparent===!1?mt(ba):mt(J.blending,J.blendEquation,J.blendSrc,J.blendDst,J.blendEquationAlpha,J.blendSrcAlpha,J.blendDstAlpha,J.blendColor,J.blendAlpha,J.premultipliedAlpha),u.setFunc(J.depthFunc),u.setTest(J.depthTest),u.setMask(J.depthWrite),c.setMask(J.colorWrite);const Oe=J.stencilWrite;d.setTest(Oe),Oe&&(d.setMask(J.stencilWriteMask),d.setFunc(J.stencilFunc,J.stencilRef,J.stencilFuncMask),d.setOp(J.stencilFail,J.stencilZFail,J.stencilZPass)),En(J.polygonOffset,J.polygonOffsetFactor,J.polygonOffsetUnits),J.alphaToCoverage===!0?we(n.SAMPLE_ALPHA_TO_COVERAGE):Ve(n.SAMPLE_ALPHA_TO_COVERAGE)}function $t(J){X!==J&&(J?n.frontFace(n.CW):n.frontFace(n.CCW),X=J)}function Kt(J){J!==F0?(we(n.CULL_FACE),J!==ne&&(J===lp?n.cullFace(n.BACK):J===U0?n.cullFace(n.FRONT):n.cullFace(n.FRONT_AND_BACK))):Ve(n.CULL_FACE),ne=J}function wt(J){J!==pe&&(j&&n.lineWidth(J),pe=J)}function En(J,Ue,Te){J?(we(n.POLYGON_OFFSET_FILL),(_e!==Ue||re!==Te)&&(_e=Ue,re=Te,u.getReversed()&&(Ue=-Ue),n.polygonOffset(Ue,Te))):Ve(n.POLYGON_OFFSET_FILL)}function Nt(J){J?we(n.SCISSOR_TEST):Ve(n.SCISSOR_TEST)}function Ft(J){J===void 0&&(J=n.TEXTURE0+H-1),ce!==J&&(n.activeTexture(J),ce=J)}function $(J,Ue,Te){Te===void 0&&(ce===null?Te=n.TEXTURE0+H-1:Te=ce);let Oe=K[Te];Oe===void 0&&(Oe={type:void 0,texture:void 0},K[Te]=Oe),(Oe.type!==J||Oe.texture!==Ue)&&(ce!==Te&&(n.activeTexture(Te),ce=Te),n.bindTexture(J,Ue||he[J]),Oe.type=J,Oe.texture=Ue)}function Ln(){const J=K[ce];J!==void 0&&J.type!==void 0&&(n.bindTexture(J.type,null),J.type=void 0,J.texture=void 0)}function it(){try{n.compressedTexImage2D(...arguments)}catch(J){Xt("WebGLState:",J)}}function O(){try{n.compressedTexImage3D(...arguments)}catch(J){Xt("WebGLState:",J)}}function R(){try{n.texSubImage2D(...arguments)}catch(J){Xt("WebGLState:",J)}}function ie(){try{n.texSubImage3D(...arguments)}catch(J){Xt("WebGLState:",J)}}function ae(){try{n.compressedTexSubImage2D(...arguments)}catch(J){Xt("WebGLState:",J)}}function be(){try{n.compressedTexSubImage3D(...arguments)}catch(J){Xt("WebGLState:",J)}}function Ie(){try{n.texStorage2D(...arguments)}catch(J){Xt("WebGLState:",J)}}function Ne(){try{n.texStorage3D(...arguments)}catch(J){Xt("WebGLState:",J)}}function Me(){try{n.texImage2D(...arguments)}catch(J){Xt("WebGLState:",J)}}function ye(){try{n.texImage3D(...arguments)}catch(J){Xt("WebGLState:",J)}}function ze(J){return b[J]!==void 0?b[J]:n.getParameter(J)}function rt(J,Ue){b[J]!==Ue&&(n.pixelStorei(J,Ue),b[J]=Ue)}function Ge(J){tt.equals(J)===!1&&(n.scissor(J.x,J.y,J.z,J.w),tt.copy(J))}function He(J){De.equals(J)===!1&&(n.viewport(J.x,J.y,J.z,J.w),De.copy(J))}function We(J,Ue){let Te=p.get(Ue);Te===void 0&&(Te=new WeakMap,p.set(Ue,Te));let Oe=Te.get(J);Oe===void 0&&(Oe=n.getUniformBlockIndex(Ue,J.name),Te.set(J,Oe))}function je(J,Ue){const Oe=p.get(Ue).get(J);m.get(Ue)!==Oe&&(n.uniformBlockBinding(Ue,Oe,J.__bindingPointIndex),m.set(Ue,Oe))}function ht(){n.disable(n.BLEND),n.disable(n.CULL_FACE),n.disable(n.DEPTH_TEST),n.disable(n.POLYGON_OFFSET_FILL),n.disable(n.SCISSOR_TEST),n.disable(n.STENCIL_TEST),n.disable(n.SAMPLE_ALPHA_TO_COVERAGE),n.blendEquation(n.FUNC_ADD),n.blendFunc(n.ONE,n.ZERO),n.blendFuncSeparate(n.ONE,n.ZERO,n.ONE,n.ZERO),n.blendColor(0,0,0,0),n.colorMask(!0,!0,!0,!0),n.clearColor(0,0,0,0),n.depthMask(!0),n.depthFunc(n.LESS),u.setReversed(!1),n.clearDepth(1),n.stencilMask(4294967295),n.stencilFunc(n.ALWAYS,0,4294967295),n.stencilOp(n.KEEP,n.KEEP,n.KEEP),n.clearStencil(0),n.cullFace(n.BACK),n.frontFace(n.CCW),n.polygonOffset(0,0),n.activeTexture(n.TEXTURE0),n.bindFramebuffer(n.FRAMEBUFFER,null),n.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),n.bindFramebuffer(n.READ_FRAMEBUFFER,null),n.useProgram(null),n.lineWidth(1),n.scissor(0,0,n.canvas.width,n.canvas.height),n.viewport(0,0,n.canvas.width,n.canvas.height),n.pixelStorei(n.PACK_ALIGNMENT,4),n.pixelStorei(n.UNPACK_ALIGNMENT,4),n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,!1),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,n.BROWSER_DEFAULT_WEBGL),n.pixelStorei(n.PACK_ROW_LENGTH,0),n.pixelStorei(n.PACK_SKIP_PIXELS,0),n.pixelStorei(n.PACK_SKIP_ROWS,0),n.pixelStorei(n.UNPACK_ROW_LENGTH,0),n.pixelStorei(n.UNPACK_IMAGE_HEIGHT,0),n.pixelStorei(n.UNPACK_SKIP_PIXELS,0),n.pixelStorei(n.UNPACK_SKIP_ROWS,0),n.pixelStorei(n.UNPACK_SKIP_IMAGES,0),g={},b={},ce=null,K={},x={},M=new WeakMap,A=[],C=null,T=!1,S=null,B=null,G=null,D=null,z=null,U=null,W=null,w=new It(0,0,0),F=0,Z=!1,X=null,ne=null,pe=null,_e=null,re=null,tt.set(0,0,n.canvas.width,n.canvas.height),De.set(0,0,n.canvas.width,n.canvas.height),c.reset(),u.reset(),d.reset()}return{buffers:{color:c,depth:u,stencil:d},enable:we,disable:Ve,bindFramebuffer:Ke,drawBuffers:Je,useProgram:Lt,setBlending:mt,setMaterial:Tt,setFlipSided:$t,setCullFace:Kt,setLineWidth:wt,setPolygonOffset:En,setScissorTest:Nt,activeTexture:Ft,bindTexture:$,unbindTexture:Ln,compressedTexImage2D:it,compressedTexImage3D:O,texImage2D:Me,texImage3D:ye,pixelStorei:rt,getParameter:ze,updateUBOMapping:We,uniformBlockBinding:je,texStorage2D:Ie,texStorage3D:Ne,texSubImage2D:R,texSubImage3D:ie,compressedTexSubImage2D:ae,compressedTexSubImage3D:be,scissor:Ge,viewport:He,reset:ht}}function Hy(n,e,t,i,r,c,u){const d=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,m=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),p=new pt,g=new WeakMap,b=new Set;let x;const M=new WeakMap;let A=!1;try{A=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function C(O,R){return A?new OffscreenCanvas(O,R):Gu("canvas")}function T(O,R,ie){let ae=1;const be=it(O);if((be.width>ie||be.height>ie)&&(ae=ie/Math.max(be.width,be.height)),ae<1)if(typeof HTMLImageElement<"u"&&O instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&O instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&O instanceof ImageBitmap||typeof VideoFrame<"u"&&O instanceof VideoFrame){const Ie=Math.floor(ae*be.width),Ne=Math.floor(ae*be.height);x===void 0&&(x=C(Ie,Ne));const Me=R?C(Ie,Ne):x;return Me.width=Ie,Me.height=Ne,Me.getContext("2d").drawImage(O,0,0,Ie,Ne),ft("WebGLRenderer: Texture has been resized from ("+be.width+"x"+be.height+") to ("+Ie+"x"+Ne+")."),Me}else return"data"in O&&ft("WebGLRenderer: Image in DataTexture is too big ("+be.width+"x"+be.height+")."),O;return O}function S(O){return O.generateMipmaps}function B(O){n.generateMipmap(O)}function G(O){return O.isWebGLCubeRenderTarget?n.TEXTURE_CUBE_MAP:O.isWebGL3DRenderTarget?n.TEXTURE_3D:O.isWebGLArrayRenderTarget||O.isCompressedArrayTexture?n.TEXTURE_2D_ARRAY:n.TEXTURE_2D}function D(O,R,ie,ae,be,Ie=!1){if(O!==null){if(n[O]!==void 0)return n[O];ft("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+O+"'")}let Ne;ae&&(Ne=e.get("EXT_texture_norm16"),Ne||ft("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let Me=R;if(R===n.RED&&(ie===n.FLOAT&&(Me=n.R32F),ie===n.HALF_FLOAT&&(Me=n.R16F),ie===n.UNSIGNED_BYTE&&(Me=n.R8),ie===n.UNSIGNED_SHORT&&Ne&&(Me=Ne.R16_EXT),ie===n.SHORT&&Ne&&(Me=Ne.R16_SNORM_EXT)),R===n.RED_INTEGER&&(ie===n.UNSIGNED_BYTE&&(Me=n.R8UI),ie===n.UNSIGNED_SHORT&&(Me=n.R16UI),ie===n.UNSIGNED_INT&&(Me=n.R32UI),ie===n.BYTE&&(Me=n.R8I),ie===n.SHORT&&(Me=n.R16I),ie===n.INT&&(Me=n.R32I)),R===n.RG&&(ie===n.FLOAT&&(Me=n.RG32F),ie===n.HALF_FLOAT&&(Me=n.RG16F),ie===n.UNSIGNED_BYTE&&(Me=n.RG8),ie===n.UNSIGNED_SHORT&&Ne&&(Me=Ne.RG16_EXT),ie===n.SHORT&&Ne&&(Me=Ne.RG16_SNORM_EXT)),R===n.RG_INTEGER&&(ie===n.UNSIGNED_BYTE&&(Me=n.RG8UI),ie===n.UNSIGNED_SHORT&&(Me=n.RG16UI),ie===n.UNSIGNED_INT&&(Me=n.RG32UI),ie===n.BYTE&&(Me=n.RG8I),ie===n.SHORT&&(Me=n.RG16I),ie===n.INT&&(Me=n.RG32I)),R===n.RGB_INTEGER&&(ie===n.UNSIGNED_BYTE&&(Me=n.RGB8UI),ie===n.UNSIGNED_SHORT&&(Me=n.RGB16UI),ie===n.UNSIGNED_INT&&(Me=n.RGB32UI),ie===n.BYTE&&(Me=n.RGB8I),ie===n.SHORT&&(Me=n.RGB16I),ie===n.INT&&(Me=n.RGB32I)),R===n.RGBA_INTEGER&&(ie===n.UNSIGNED_BYTE&&(Me=n.RGBA8UI),ie===n.UNSIGNED_SHORT&&(Me=n.RGBA16UI),ie===n.UNSIGNED_INT&&(Me=n.RGBA32UI),ie===n.BYTE&&(Me=n.RGBA8I),ie===n.SHORT&&(Me=n.RGBA16I),ie===n.INT&&(Me=n.RGBA32I)),R===n.RGB&&(ie===n.UNSIGNED_SHORT&&Ne&&(Me=Ne.RGB16_EXT),ie===n.SHORT&&Ne&&(Me=Ne.RGB16_SNORM_EXT),ie===n.UNSIGNED_INT_5_9_9_9_REV&&(Me=n.RGB9_E5),ie===n.UNSIGNED_INT_10F_11F_11F_REV&&(Me=n.R11F_G11F_B10F)),R===n.RGBA){const ye=Ie?Hu:Gt.getTransfer(be);ie===n.FLOAT&&(Me=n.RGBA32F),ie===n.HALF_FLOAT&&(Me=n.RGBA16F),ie===n.UNSIGNED_BYTE&&(Me=ye===nn?n.SRGB8_ALPHA8:n.RGBA8),ie===n.UNSIGNED_SHORT&&Ne&&(Me=Ne.RGBA16_EXT),ie===n.SHORT&&Ne&&(Me=Ne.RGBA16_SNORM_EXT),ie===n.UNSIGNED_SHORT_4_4_4_4&&(Me=n.RGBA4),ie===n.UNSIGNED_SHORT_5_5_5_1&&(Me=n.RGB5_A1)}return(Me===n.R16F||Me===n.R32F||Me===n.RG16F||Me===n.RG32F||Me===n.RGBA16F||Me===n.RGBA32F)&&e.get("EXT_color_buffer_float"),Me}function z(O,R){let ie;return O?R===null||R===Vr||R===Sc?ie=n.DEPTH24_STENCIL8:R===Br?ie=n.DEPTH32F_STENCIL8:R===yc&&(ie=n.DEPTH24_STENCIL8,ft("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):R===null||R===Vr||R===Sc?ie=n.DEPTH_COMPONENT24:R===Br?ie=n.DEPTH_COMPONENT32F:R===yc&&(ie=n.DEPTH_COMPONENT16),ie}function U(O,R){return S(O)===!0||O.isFramebufferTexture&&O.minFilter!==ri&&O.minFilter!==pi?Math.log2(Math.max(R.width,R.height))+1:O.mipmaps!==void 0&&O.mipmaps.length>0?O.mipmaps.length:O.isCompressedTexture&&Array.isArray(O.image)?R.mipmaps.length:1}function W(O){const R=O.target;R.removeEventListener("dispose",W),F(R),R.isVideoTexture&&g.delete(R),R.isHTMLTexture&&b.delete(R)}function w(O){const R=O.target;R.removeEventListener("dispose",w),X(R)}function F(O){const R=i.get(O);if(R.__webglInit===void 0)return;const ie=O.source,ae=M.get(ie);if(ae){const be=ae[R.__cacheKey];be.usedTimes--,be.usedTimes===0&&Z(O),Object.keys(ae).length===0&&M.delete(ie)}i.remove(O)}function Z(O){const R=i.get(O);n.deleteTexture(R.__webglTexture);const ie=O.source,ae=M.get(ie);delete ae[R.__cacheKey],u.memory.textures--}function X(O){const R=i.get(O);if(O.depthTexture&&(O.depthTexture.dispose(),i.remove(O.depthTexture)),O.isWebGLCubeRenderTarget)for(let ae=0;ae<6;ae++){if(Array.isArray(R.__webglFramebuffer[ae]))for(let be=0;be<R.__webglFramebuffer[ae].length;be++)n.deleteFramebuffer(R.__webglFramebuffer[ae][be]);else n.deleteFramebuffer(R.__webglFramebuffer[ae]);R.__webglDepthbuffer&&n.deleteRenderbuffer(R.__webglDepthbuffer[ae])}else{if(Array.isArray(R.__webglFramebuffer))for(let ae=0;ae<R.__webglFramebuffer.length;ae++)n.deleteFramebuffer(R.__webglFramebuffer[ae]);else n.deleteFramebuffer(R.__webglFramebuffer);if(R.__webglDepthbuffer&&n.deleteRenderbuffer(R.__webglDepthbuffer),R.__webglMultisampledFramebuffer&&n.deleteFramebuffer(R.__webglMultisampledFramebuffer),R.__webglColorRenderbuffer)for(let ae=0;ae<R.__webglColorRenderbuffer.length;ae++)R.__webglColorRenderbuffer[ae]&&n.deleteRenderbuffer(R.__webglColorRenderbuffer[ae]);R.__webglDepthRenderbuffer&&n.deleteRenderbuffer(R.__webglDepthRenderbuffer)}const ie=O.textures;for(let ae=0,be=ie.length;ae<be;ae++){const Ie=i.get(ie[ae]);Ie.__webglTexture&&(n.deleteTexture(Ie.__webglTexture),u.memory.textures--),i.remove(ie[ae])}i.remove(O)}let ne=0;function pe(){ne=0}function _e(){return ne}function re(O){ne=O}function H(){const O=ne;return O>=r.maxTextures&&ft("WebGLTextures: Trying to use "+O+" texture units while this GPU supports only "+r.maxTextures),ne+=1,O}function j(O){const R=[];return R.push(O.wrapS),R.push(O.wrapT),R.push(O.wrapR||0),R.push(O.magFilter),R.push(O.minFilter),R.push(O.anisotropy),R.push(O.internalFormat),R.push(O.format),R.push(O.type),R.push(O.generateMipmaps),R.push(O.premultiplyAlpha),R.push(O.flipY),R.push(O.unpackAlignment),R.push(O.colorSpace),R.join()}function Ee(O,R){const ie=i.get(O);if(O.isVideoTexture&&$(O),O.isRenderTargetTexture===!1&&O.isExternalTexture!==!0&&O.version>0&&ie.__version!==O.version){const ae=O.image;if(ae===null)ft("WebGLRenderer: Texture marked for update but no image data found.");else if(ae.complete===!1)ft("WebGLRenderer: Texture marked for update but image is incomplete");else{Ve(ie,O,R);return}}else O.isExternalTexture&&(ie.__webglTexture=O.sourceTexture?O.sourceTexture:null);t.bindTexture(n.TEXTURE_2D,ie.__webglTexture,n.TEXTURE0+R)}function Ce(O,R){const ie=i.get(O);if(O.isRenderTargetTexture===!1&&O.version>0&&ie.__version!==O.version){Ve(ie,O,R);return}else O.isExternalTexture&&(ie.__webglTexture=O.sourceTexture?O.sourceTexture:null);t.bindTexture(n.TEXTURE_2D_ARRAY,ie.__webglTexture,n.TEXTURE0+R)}function ce(O,R){const ie=i.get(O);if(O.isRenderTargetTexture===!1&&O.version>0&&ie.__version!==O.version){Ve(ie,O,R);return}t.bindTexture(n.TEXTURE_3D,ie.__webglTexture,n.TEXTURE0+R)}function K(O,R){const ie=i.get(O);if(O.isCubeDepthTexture!==!0&&O.version>0&&ie.__version!==O.version){Ke(ie,O,R);return}t.bindTexture(n.TEXTURE_CUBE_MAP,ie.__webglTexture,n.TEXTURE0+R)}const ue={[vf]:n.REPEAT,[xa]:n.CLAMP_TO_EDGE,[bf]:n.MIRRORED_REPEAT},Pe={[ri]:n.NEAREST,[i_]:n.NEAREST_MIPMAP_NEAREST,[ru]:n.NEAREST_MIPMAP_LINEAR,[pi]:n.LINEAR,[wh]:n.LINEAR_MIPMAP_NEAREST,[$s]:n.LINEAR_MIPMAP_LINEAR},tt={[s_]:n.NEVER,[h_]:n.ALWAYS,[o_]:n.LESS,[fd]:n.LEQUAL,[l_]:n.EQUAL,[dd]:n.GEQUAL,[c_]:n.GREATER,[u_]:n.NOTEQUAL};function De(O,R){if(R.type===Br&&e.has("OES_texture_float_linear")===!1&&(R.magFilter===pi||R.magFilter===wh||R.magFilter===ru||R.magFilter===$s||R.minFilter===pi||R.minFilter===wh||R.minFilter===ru||R.minFilter===$s)&&ft("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),n.texParameteri(O,n.TEXTURE_WRAP_S,ue[R.wrapS]),n.texParameteri(O,n.TEXTURE_WRAP_T,ue[R.wrapT]),(O===n.TEXTURE_3D||O===n.TEXTURE_2D_ARRAY)&&n.texParameteri(O,n.TEXTURE_WRAP_R,ue[R.wrapR]),n.texParameteri(O,n.TEXTURE_MAG_FILTER,Pe[R.magFilter]),n.texParameteri(O,n.TEXTURE_MIN_FILTER,Pe[R.minFilter]),R.compareFunction&&(n.texParameteri(O,n.TEXTURE_COMPARE_MODE,n.COMPARE_REF_TO_TEXTURE),n.texParameteri(O,n.TEXTURE_COMPARE_FUNC,tt[R.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(R.magFilter===ri||R.minFilter!==ru&&R.minFilter!==$s||R.type===Br&&e.has("OES_texture_float_linear")===!1)return;if(R.anisotropy>1||i.get(R).__currentAnisotropy){const ie=e.get("EXT_texture_filter_anisotropic");n.texParameterf(O,ie.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(R.anisotropy,r.getMaxAnisotropy())),i.get(R).__currentAnisotropy=R.anisotropy}}}function me(O,R){let ie=!1;O.__webglInit===void 0&&(O.__webglInit=!0,R.addEventListener("dispose",W));const ae=R.source;let be=M.get(ae);be===void 0&&(be={},M.set(ae,be));const Ie=j(R);if(Ie!==O.__cacheKey){be[Ie]===void 0&&(be[Ie]={texture:n.createTexture(),usedTimes:0},u.memory.textures++,ie=!0),be[Ie].usedTimes++;const Ne=be[O.__cacheKey];Ne!==void 0&&(be[O.__cacheKey].usedTimes--,Ne.usedTimes===0&&Z(R)),O.__cacheKey=Ie,O.__webglTexture=be[Ie].texture}return ie}function he(O,R,ie){return Math.floor(Math.floor(O/ie)/R)}function we(O,R,ie,ae){const Ie=O.updateRanges;if(Ie.length===0)t.texSubImage2D(n.TEXTURE_2D,0,0,0,R.width,R.height,ie,ae,R.data);else{Ie.sort((rt,Ge)=>rt.start-Ge.start);let Ne=0;for(let rt=1;rt<Ie.length;rt++){const Ge=Ie[Ne],He=Ie[rt],We=Ge.start+Ge.count,je=he(He.start,R.width,4),ht=he(Ge.start,R.width,4);He.start<=We+1&&je===ht&&he(He.start+He.count-1,R.width,4)===je?Ge.count=Math.max(Ge.count,He.start+He.count-Ge.start):(++Ne,Ie[Ne]=He)}Ie.length=Ne+1;const Me=t.getParameter(n.UNPACK_ROW_LENGTH),ye=t.getParameter(n.UNPACK_SKIP_PIXELS),ze=t.getParameter(n.UNPACK_SKIP_ROWS);t.pixelStorei(n.UNPACK_ROW_LENGTH,R.width);for(let rt=0,Ge=Ie.length;rt<Ge;rt++){const He=Ie[rt],We=Math.floor(He.start/4),je=Math.ceil(He.count/4),ht=We%R.width,J=Math.floor(We/R.width),Ue=je,Te=1;t.pixelStorei(n.UNPACK_SKIP_PIXELS,ht),t.pixelStorei(n.UNPACK_SKIP_ROWS,J),t.texSubImage2D(n.TEXTURE_2D,0,ht,J,Ue,Te,ie,ae,R.data)}O.clearUpdateRanges(),t.pixelStorei(n.UNPACK_ROW_LENGTH,Me),t.pixelStorei(n.UNPACK_SKIP_PIXELS,ye),t.pixelStorei(n.UNPACK_SKIP_ROWS,ze)}}function Ve(O,R,ie){let ae=n.TEXTURE_2D;(R.isDataArrayTexture||R.isCompressedArrayTexture)&&(ae=n.TEXTURE_2D_ARRAY),R.isData3DTexture&&(ae=n.TEXTURE_3D);const be=me(O,R),Ie=R.source;t.bindTexture(ae,O.__webglTexture,n.TEXTURE0+ie);const Ne=i.get(Ie);if(Ie.version!==Ne.__version||be===!0){if(t.activeTexture(n.TEXTURE0+ie),(typeof ImageBitmap<"u"&&R.image instanceof ImageBitmap)===!1){const Te=Gt.getPrimaries(Gt.workingColorSpace),Oe=R.colorSpace===$a?null:Gt.getPrimaries(R.colorSpace),Fe=R.colorSpace===$a||Te===Oe?n.NONE:n.BROWSER_DEFAULT_WEBGL;t.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,R.flipY),t.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,R.premultiplyAlpha),t.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,Fe)}t.pixelStorei(n.UNPACK_ALIGNMENT,R.unpackAlignment);let ye=T(R.image,!1,r.maxTextureSize);ye=Ln(R,ye);const ze=c.convert(R.format,R.colorSpace),rt=c.convert(R.type);let Ge=D(R.internalFormat,ze,rt,R.normalized,R.colorSpace,R.isVideoTexture);De(ae,R);let He;const We=R.mipmaps,je=R.isVideoTexture!==!0,ht=Ne.__version===void 0||be===!0,J=Ie.dataReady,Ue=U(R,ye);if(R.isDepthTexture)Ge=z(R.format===eo,R.type),ht&&(je?t.texStorage2D(n.TEXTURE_2D,1,Ge,ye.width,ye.height):t.texImage2D(n.TEXTURE_2D,0,Ge,ye.width,ye.height,0,ze,rt,null));else if(R.isDataTexture)if(We.length>0){je&&ht&&t.texStorage2D(n.TEXTURE_2D,Ue,Ge,We[0].width,We[0].height);for(let Te=0,Oe=We.length;Te<Oe;Te++)He=We[Te],je?J&&t.texSubImage2D(n.TEXTURE_2D,Te,0,0,He.width,He.height,ze,rt,He.data):t.texImage2D(n.TEXTURE_2D,Te,Ge,He.width,He.height,0,ze,rt,He.data);R.generateMipmaps=!1}else je?(ht&&t.texStorage2D(n.TEXTURE_2D,Ue,Ge,ye.width,ye.height),J&&we(R,ye,ze,rt)):t.texImage2D(n.TEXTURE_2D,0,Ge,ye.width,ye.height,0,ze,rt,ye.data);else if(R.isCompressedTexture)if(R.isCompressedArrayTexture){je&&ht&&t.texStorage3D(n.TEXTURE_2D_ARRAY,Ue,Ge,We[0].width,We[0].height,ye.depth);for(let Te=0,Oe=We.length;Te<Oe;Te++)if(He=We[Te],R.format!==gr)if(ze!==null)if(je){if(J)if(R.layerUpdates.size>0){const Fe=Bp(He.width,He.height,R.format,R.type);for(const Re of R.layerUpdates){const st=He.data.subarray(Re*Fe/He.data.BYTES_PER_ELEMENT,(Re+1)*Fe/He.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,Te,0,0,Re,He.width,He.height,1,ze,st)}R.clearLayerUpdates()}else t.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,Te,0,0,0,He.width,He.height,ye.depth,ze,He.data)}else t.compressedTexImage3D(n.TEXTURE_2D_ARRAY,Te,Ge,He.width,He.height,ye.depth,0,He.data,0,0);else ft("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else je?J&&t.texSubImage3D(n.TEXTURE_2D_ARRAY,Te,0,0,0,He.width,He.height,ye.depth,ze,rt,He.data):t.texImage3D(n.TEXTURE_2D_ARRAY,Te,Ge,He.width,He.height,ye.depth,0,ze,rt,He.data)}else{je&&ht&&t.texStorage2D(n.TEXTURE_2D,Ue,Ge,We[0].width,We[0].height);for(let Te=0,Oe=We.length;Te<Oe;Te++)He=We[Te],R.format!==gr?ze!==null?je?J&&t.compressedTexSubImage2D(n.TEXTURE_2D,Te,0,0,He.width,He.height,ze,He.data):t.compressedTexImage2D(n.TEXTURE_2D,Te,Ge,He.width,He.height,0,He.data):ft("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):je?J&&t.texSubImage2D(n.TEXTURE_2D,Te,0,0,He.width,He.height,ze,rt,He.data):t.texImage2D(n.TEXTURE_2D,Te,Ge,He.width,He.height,0,ze,rt,He.data)}else if(R.isDataArrayTexture)if(je){if(ht&&t.texStorage3D(n.TEXTURE_2D_ARRAY,Ue,Ge,ye.width,ye.height,ye.depth),J)if(R.layerUpdates.size>0){const Te=Bp(ye.width,ye.height,R.format,R.type);for(const Oe of R.layerUpdates){const Fe=ye.data.subarray(Oe*Te/ye.data.BYTES_PER_ELEMENT,(Oe+1)*Te/ye.data.BYTES_PER_ELEMENT);t.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,Oe,ye.width,ye.height,1,ze,rt,Fe)}R.clearLayerUpdates()}else t.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,0,ye.width,ye.height,ye.depth,ze,rt,ye.data)}else t.texImage3D(n.TEXTURE_2D_ARRAY,0,Ge,ye.width,ye.height,ye.depth,0,ze,rt,ye.data);else if(R.isData3DTexture)je?(ht&&t.texStorage3D(n.TEXTURE_3D,Ue,Ge,ye.width,ye.height,ye.depth),J&&t.texSubImage3D(n.TEXTURE_3D,0,0,0,0,ye.width,ye.height,ye.depth,ze,rt,ye.data)):t.texImage3D(n.TEXTURE_3D,0,Ge,ye.width,ye.height,ye.depth,0,ze,rt,ye.data);else if(R.isFramebufferTexture){if(ht)if(je)t.texStorage2D(n.TEXTURE_2D,Ue,Ge,ye.width,ye.height);else{let Te=ye.width,Oe=ye.height;for(let Fe=0;Fe<Ue;Fe++)t.texImage2D(n.TEXTURE_2D,Fe,Ge,Te,Oe,0,ze,rt,null),Te>>=1,Oe>>=1}}else if(R.isHTMLTexture){if("texElementImage2D"in n){const Te=n.canvas;if(Te.hasAttribute("layoutsubtree")||Te.setAttribute("layoutsubtree","true"),ye.parentNode!==Te){Te.appendChild(ye),b.add(R),Te.onpaint=Oe=>{const Fe=Oe.changedElements;for(const Re of b)Fe.includes(Re.image)&&(Re.needsUpdate=!0)},Te.requestPaint();return}if(n.texElementImage2D.length===3)n.texElementImage2D(n.TEXTURE_2D,n.RGBA8,ye);else{const Fe=n.RGBA,Re=n.RGBA,st=n.UNSIGNED_BYTE;n.texElementImage2D(n.TEXTURE_2D,0,Fe,Re,st,ye)}n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MIN_FILTER,n.LINEAR),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_S,n.CLAMP_TO_EDGE),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_T,n.CLAMP_TO_EDGE)}}else if(We.length>0){if(je&&ht){const Te=it(We[0]);t.texStorage2D(n.TEXTURE_2D,Ue,Ge,Te.width,Te.height)}for(let Te=0,Oe=We.length;Te<Oe;Te++)He=We[Te],je?J&&t.texSubImage2D(n.TEXTURE_2D,Te,0,0,ze,rt,He):t.texImage2D(n.TEXTURE_2D,Te,Ge,ze,rt,He);R.generateMipmaps=!1}else if(je){if(ht){const Te=it(ye);t.texStorage2D(n.TEXTURE_2D,Ue,Ge,Te.width,Te.height)}J&&t.texSubImage2D(n.TEXTURE_2D,0,0,0,ze,rt,ye)}else t.texImage2D(n.TEXTURE_2D,0,Ge,ze,rt,ye);S(R)&&B(ae),Ne.__version=Ie.version,R.onUpdate&&R.onUpdate(R)}O.__version=R.version}function Ke(O,R,ie){if(R.image.length!==6)return;const ae=me(O,R),be=R.source;t.bindTexture(n.TEXTURE_CUBE_MAP,O.__webglTexture,n.TEXTURE0+ie);const Ie=i.get(be);if(be.version!==Ie.__version||ae===!0){t.activeTexture(n.TEXTURE0+ie);const Ne=Gt.getPrimaries(Gt.workingColorSpace),Me=R.colorSpace===$a?null:Gt.getPrimaries(R.colorSpace),ye=R.colorSpace===$a||Ne===Me?n.NONE:n.BROWSER_DEFAULT_WEBGL;t.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,R.flipY),t.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,R.premultiplyAlpha),t.pixelStorei(n.UNPACK_ALIGNMENT,R.unpackAlignment),t.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,ye);const ze=R.isCompressedTexture||R.image[0].isCompressedTexture,rt=R.image[0]&&R.image[0].isDataTexture,Ge=[];for(let Re=0;Re<6;Re++)!ze&&!rt?Ge[Re]=T(R.image[Re],!0,r.maxCubemapSize):Ge[Re]=rt?R.image[Re].image:R.image[Re],Ge[Re]=Ln(R,Ge[Re]);const He=Ge[0],We=c.convert(R.format,R.colorSpace),je=c.convert(R.type),ht=D(R.internalFormat,We,je,R.normalized,R.colorSpace),J=R.isVideoTexture!==!0,Ue=Ie.__version===void 0||ae===!0,Te=be.dataReady;let Oe=U(R,He);De(n.TEXTURE_CUBE_MAP,R);let Fe;if(ze){J&&Ue&&t.texStorage2D(n.TEXTURE_CUBE_MAP,Oe,ht,He.width,He.height);for(let Re=0;Re<6;Re++){Fe=Ge[Re].mipmaps;for(let st=0;st<Fe.length;st++){const nt=Fe[st];R.format!==gr?We!==null?J?Te&&t.compressedTexSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Re,st,0,0,nt.width,nt.height,We,nt.data):t.compressedTexImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Re,st,ht,nt.width,nt.height,0,nt.data):ft("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):J?Te&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Re,st,0,0,nt.width,nt.height,We,je,nt.data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Re,st,ht,nt.width,nt.height,0,We,je,nt.data)}}}else{if(Fe=R.mipmaps,J&&Ue){Fe.length>0&&Oe++;const Re=it(Ge[0]);t.texStorage2D(n.TEXTURE_CUBE_MAP,Oe,ht,Re.width,Re.height)}for(let Re=0;Re<6;Re++)if(rt){J?Te&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Re,0,0,0,Ge[Re].width,Ge[Re].height,We,je,Ge[Re].data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Re,0,ht,Ge[Re].width,Ge[Re].height,0,We,je,Ge[Re].data);for(let st=0;st<Fe.length;st++){const ln=Fe[st].image[Re].image;J?Te&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Re,st+1,0,0,ln.width,ln.height,We,je,ln.data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Re,st+1,ht,ln.width,ln.height,0,We,je,ln.data)}}else{J?Te&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Re,0,0,0,We,je,Ge[Re]):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Re,0,ht,We,je,Ge[Re]);for(let st=0;st<Fe.length;st++){const nt=Fe[st];J?Te&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Re,st+1,0,0,We,je,nt.image[Re]):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Re,st+1,ht,We,je,nt.image[Re])}}}S(R)&&B(n.TEXTURE_CUBE_MAP),Ie.__version=be.version,R.onUpdate&&R.onUpdate(R)}O.__version=R.version}function Je(O,R,ie,ae,be,Ie){const Ne=c.convert(ie.format,ie.colorSpace),Me=c.convert(ie.type),ye=D(ie.internalFormat,Ne,Me,ie.normalized,ie.colorSpace),ze=i.get(R),rt=i.get(ie);if(rt.__renderTarget=R,!ze.__hasExternalTextures){const Ge=Math.max(1,R.width>>Ie),He=Math.max(1,R.height>>Ie);be===n.TEXTURE_3D||be===n.TEXTURE_2D_ARRAY?t.texImage3D(be,Ie,ye,Ge,He,R.depth,0,Ne,Me,null):t.texImage2D(be,Ie,ye,Ge,He,0,Ne,Me,null)}t.bindFramebuffer(n.FRAMEBUFFER,O),Ft(R)?d.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,ae,be,rt.__webglTexture,0,Nt(R)):(be===n.TEXTURE_2D||be>=n.TEXTURE_CUBE_MAP_POSITIVE_X&&be<=n.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&n.framebufferTexture2D(n.FRAMEBUFFER,ae,be,rt.__webglTexture,Ie),t.bindFramebuffer(n.FRAMEBUFFER,null)}function Lt(O,R,ie){if(n.bindRenderbuffer(n.RENDERBUFFER,O),R.depthBuffer){const ae=R.depthTexture,be=ae&&ae.isDepthTexture?ae.type:null,Ie=z(R.stencilBuffer,be),Ne=R.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;Ft(R)?d.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,Nt(R),Ie,R.width,R.height):ie?n.renderbufferStorageMultisample(n.RENDERBUFFER,Nt(R),Ie,R.width,R.height):n.renderbufferStorage(n.RENDERBUFFER,Ie,R.width,R.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,Ne,n.RENDERBUFFER,O)}else{const ae=R.textures;for(let be=0;be<ae.length;be++){const Ie=ae[be],Ne=c.convert(Ie.format,Ie.colorSpace),Me=c.convert(Ie.type),ye=D(Ie.internalFormat,Ne,Me,Ie.normalized,Ie.colorSpace);Ft(R)?d.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,Nt(R),ye,R.width,R.height):ie?n.renderbufferStorageMultisample(n.RENDERBUFFER,Nt(R),ye,R.width,R.height):n.renderbufferStorage(n.RENDERBUFFER,ye,R.width,R.height)}}n.bindRenderbuffer(n.RENDERBUFFER,null)}function Le(O,R,ie){const ae=R.isWebGLCubeRenderTarget===!0;if(t.bindFramebuffer(n.FRAMEBUFFER,O),!(R.depthTexture&&R.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");const be=i.get(R.depthTexture);if(be.__renderTarget=R,(!be.__webglTexture||R.depthTexture.image.width!==R.width||R.depthTexture.image.height!==R.height)&&(R.depthTexture.image.width=R.width,R.depthTexture.image.height=R.height,R.depthTexture.needsUpdate=!0),ae){if(be.__webglInit===void 0&&(be.__webglInit=!0,R.depthTexture.addEventListener("dispose",W)),be.__webglTexture===void 0){be.__webglTexture=n.createTexture(),t.bindTexture(n.TEXTURE_CUBE_MAP,be.__webglTexture),De(n.TEXTURE_CUBE_MAP,R.depthTexture);const ze=c.convert(R.depthTexture.format),rt=c.convert(R.depthTexture.type);let Ge;R.depthTexture.format===Sa?Ge=n.DEPTH_COMPONENT24:R.depthTexture.format===eo&&(Ge=n.DEPTH24_STENCIL8);for(let He=0;He<6;He++)n.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+He,0,Ge,R.width,R.height,0,ze,rt,null)}}else Ee(R.depthTexture,0);const Ie=be.__webglTexture,Ne=Nt(R),Me=ae?n.TEXTURE_CUBE_MAP_POSITIVE_X+ie:n.TEXTURE_2D,ye=R.depthTexture.format===eo?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;if(R.depthTexture.format===Sa)Ft(R)?d.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,ye,Me,Ie,0,Ne):n.framebufferTexture2D(n.FRAMEBUFFER,ye,Me,Ie,0);else if(R.depthTexture.format===eo)Ft(R)?d.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,ye,Me,Ie,0,Ne):n.framebufferTexture2D(n.FRAMEBUFFER,ye,Me,Ie,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function kt(O){const R=i.get(O),ie=O.isWebGLCubeRenderTarget===!0;if(R.__boundDepthTexture!==O.depthTexture){const ae=O.depthTexture;if(R.__depthDisposeCallback&&R.__depthDisposeCallback(),ae){const be=()=>{delete R.__boundDepthTexture,delete R.__depthDisposeCallback,ae.removeEventListener("dispose",be)};ae.addEventListener("dispose",be),R.__depthDisposeCallback=be}R.__boundDepthTexture=ae}if(O.depthTexture&&!R.__autoAllocateDepthBuffer)if(ie)for(let ae=0;ae<6;ae++)Le(R.__webglFramebuffer[ae],O,ae);else{const ae=O.texture.mipmaps;ae&&ae.length>0?Le(R.__webglFramebuffer[0],O,0):Le(R.__webglFramebuffer,O,0)}else if(ie){R.__webglDepthbuffer=[];for(let ae=0;ae<6;ae++)if(t.bindFramebuffer(n.FRAMEBUFFER,R.__webglFramebuffer[ae]),R.__webglDepthbuffer[ae]===void 0)R.__webglDepthbuffer[ae]=n.createRenderbuffer(),Lt(R.__webglDepthbuffer[ae],O,!1);else{const be=O.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,Ie=R.__webglDepthbuffer[ae];n.bindRenderbuffer(n.RENDERBUFFER,Ie),n.framebufferRenderbuffer(n.FRAMEBUFFER,be,n.RENDERBUFFER,Ie)}}else{const ae=O.texture.mipmaps;if(ae&&ae.length>0?t.bindFramebuffer(n.FRAMEBUFFER,R.__webglFramebuffer[0]):t.bindFramebuffer(n.FRAMEBUFFER,R.__webglFramebuffer),R.__webglDepthbuffer===void 0)R.__webglDepthbuffer=n.createRenderbuffer(),Lt(R.__webglDepthbuffer,O,!1);else{const be=O.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,Ie=R.__webglDepthbuffer;n.bindRenderbuffer(n.RENDERBUFFER,Ie),n.framebufferRenderbuffer(n.FRAMEBUFFER,be,n.RENDERBUFFER,Ie)}}t.bindFramebuffer(n.FRAMEBUFFER,null)}function mt(O,R,ie){const ae=i.get(O);R!==void 0&&Je(ae.__webglFramebuffer,O,O.texture,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,0),ie!==void 0&&kt(O)}function Tt(O){const R=O.texture,ie=i.get(O),ae=i.get(R);O.addEventListener("dispose",w);const be=O.textures,Ie=O.isWebGLCubeRenderTarget===!0,Ne=be.length>1;if(Ne||(ae.__webglTexture===void 0&&(ae.__webglTexture=n.createTexture()),ae.__version=R.version,u.memory.textures++),Ie){ie.__webglFramebuffer=[];for(let Me=0;Me<6;Me++)if(R.mipmaps&&R.mipmaps.length>0){ie.__webglFramebuffer[Me]=[];for(let ye=0;ye<R.mipmaps.length;ye++)ie.__webglFramebuffer[Me][ye]=n.createFramebuffer()}else ie.__webglFramebuffer[Me]=n.createFramebuffer()}else{if(R.mipmaps&&R.mipmaps.length>0){ie.__webglFramebuffer=[];for(let Me=0;Me<R.mipmaps.length;Me++)ie.__webglFramebuffer[Me]=n.createFramebuffer()}else ie.__webglFramebuffer=n.createFramebuffer();if(Ne)for(let Me=0,ye=be.length;Me<ye;Me++){const ze=i.get(be[Me]);ze.__webglTexture===void 0&&(ze.__webglTexture=n.createTexture(),u.memory.textures++)}if(O.samples>0&&Ft(O)===!1){ie.__webglMultisampledFramebuffer=n.createFramebuffer(),ie.__webglColorRenderbuffer=[],t.bindFramebuffer(n.FRAMEBUFFER,ie.__webglMultisampledFramebuffer);for(let Me=0;Me<be.length;Me++){const ye=be[Me];ie.__webglColorRenderbuffer[Me]=n.createRenderbuffer(),n.bindRenderbuffer(n.RENDERBUFFER,ie.__webglColorRenderbuffer[Me]);const ze=c.convert(ye.format,ye.colorSpace),rt=c.convert(ye.type),Ge=D(ye.internalFormat,ze,rt,ye.normalized,ye.colorSpace,O.isXRRenderTarget===!0),He=Nt(O);n.renderbufferStorageMultisample(n.RENDERBUFFER,He,Ge,O.width,O.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+Me,n.RENDERBUFFER,ie.__webglColorRenderbuffer[Me])}n.bindRenderbuffer(n.RENDERBUFFER,null),O.depthBuffer&&(ie.__webglDepthRenderbuffer=n.createRenderbuffer(),Lt(ie.__webglDepthRenderbuffer,O,!0)),t.bindFramebuffer(n.FRAMEBUFFER,null)}}if(Ie){t.bindTexture(n.TEXTURE_CUBE_MAP,ae.__webglTexture),De(n.TEXTURE_CUBE_MAP,R);for(let Me=0;Me<6;Me++)if(R.mipmaps&&R.mipmaps.length>0)for(let ye=0;ye<R.mipmaps.length;ye++)Je(ie.__webglFramebuffer[Me][ye],O,R,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+Me,ye);else Je(ie.__webglFramebuffer[Me],O,R,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+Me,0);S(R)&&B(n.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(Ne){for(let Me=0,ye=be.length;Me<ye;Me++){const ze=be[Me],rt=i.get(ze);let Ge=n.TEXTURE_2D;(O.isWebGL3DRenderTarget||O.isWebGLArrayRenderTarget)&&(Ge=O.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY),t.bindTexture(Ge,rt.__webglTexture),De(Ge,ze),Je(ie.__webglFramebuffer,O,ze,n.COLOR_ATTACHMENT0+Me,Ge,0),S(ze)&&B(Ge)}t.unbindTexture()}else{let Me=n.TEXTURE_2D;if((O.isWebGL3DRenderTarget||O.isWebGLArrayRenderTarget)&&(Me=O.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY),t.bindTexture(Me,ae.__webglTexture),De(Me,R),R.mipmaps&&R.mipmaps.length>0)for(let ye=0;ye<R.mipmaps.length;ye++)Je(ie.__webglFramebuffer[ye],O,R,n.COLOR_ATTACHMENT0,Me,ye);else Je(ie.__webglFramebuffer,O,R,n.COLOR_ATTACHMENT0,Me,0);S(R)&&B(Me),t.unbindTexture()}O.depthBuffer&&kt(O)}function $t(O){const R=O.textures;for(let ie=0,ae=R.length;ie<ae;ie++){const be=R[ie];if(S(be)){const Ie=G(O),Ne=i.get(be).__webglTexture;t.bindTexture(Ie,Ne),B(Ie),t.unbindTexture()}}}const Kt=[],wt=[];function En(O){if(O.samples>0){if(Ft(O)===!1){const R=O.textures,ie=O.width,ae=O.height;let be=n.COLOR_BUFFER_BIT;const Ie=O.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,Ne=i.get(O),Me=R.length>1;if(Me)for(let ze=0;ze<R.length;ze++)t.bindFramebuffer(n.FRAMEBUFFER,Ne.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+ze,n.RENDERBUFFER,null),t.bindFramebuffer(n.FRAMEBUFFER,Ne.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+ze,n.TEXTURE_2D,null,0);t.bindFramebuffer(n.READ_FRAMEBUFFER,Ne.__webglMultisampledFramebuffer);const ye=O.texture.mipmaps;ye&&ye.length>0?t.bindFramebuffer(n.DRAW_FRAMEBUFFER,Ne.__webglFramebuffer[0]):t.bindFramebuffer(n.DRAW_FRAMEBUFFER,Ne.__webglFramebuffer);for(let ze=0;ze<R.length;ze++){if(O.resolveDepthBuffer&&(O.depthBuffer&&(be|=n.DEPTH_BUFFER_BIT),O.stencilBuffer&&O.resolveStencilBuffer&&(be|=n.STENCIL_BUFFER_BIT)),Me){n.framebufferRenderbuffer(n.READ_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.RENDERBUFFER,Ne.__webglColorRenderbuffer[ze]);const rt=i.get(R[ze]).__webglTexture;n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,rt,0)}n.blitFramebuffer(0,0,ie,ae,0,0,ie,ae,be,n.NEAREST),m===!0&&(Kt.length=0,wt.length=0,Kt.push(n.COLOR_ATTACHMENT0+ze),O.depthBuffer&&O.resolveDepthBuffer===!1&&(Kt.push(Ie),wt.push(Ie),n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,wt)),n.invalidateFramebuffer(n.READ_FRAMEBUFFER,Kt))}if(t.bindFramebuffer(n.READ_FRAMEBUFFER,null),t.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),Me)for(let ze=0;ze<R.length;ze++){t.bindFramebuffer(n.FRAMEBUFFER,Ne.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+ze,n.RENDERBUFFER,Ne.__webglColorRenderbuffer[ze]);const rt=i.get(R[ze]).__webglTexture;t.bindFramebuffer(n.FRAMEBUFFER,Ne.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+ze,n.TEXTURE_2D,rt,0)}t.bindFramebuffer(n.DRAW_FRAMEBUFFER,Ne.__webglMultisampledFramebuffer)}else if(O.depthBuffer&&O.resolveDepthBuffer===!1&&m){const R=O.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,[R])}}}function Nt(O){return Math.min(r.maxSamples,O.samples)}function Ft(O){const R=i.get(O);return O.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&R.__useRenderToTexture!==!1}function $(O){const R=u.render.frame;g.get(O)!==R&&(g.set(O,R),O.update())}function Ln(O,R){const ie=O.colorSpace,ae=O.format,be=O.type;return O.isCompressedTexture===!0||O.isVideoTexture===!0||ie!==zu&&ie!==$a&&(Gt.getTransfer(ie)===nn?(ae!==gr||be!==ki)&&ft("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):Xt("WebGLTextures: Unsupported texture color space:",ie)),R}function it(O){return typeof HTMLImageElement<"u"&&O instanceof HTMLImageElement?(p.width=O.naturalWidth||O.width,p.height=O.naturalHeight||O.height):typeof VideoFrame<"u"&&O instanceof VideoFrame?(p.width=O.displayWidth,p.height=O.displayHeight):(p.width=O.width,p.height=O.height),p}this.allocateTextureUnit=H,this.resetTextureUnits=pe,this.getTextureUnits=_e,this.setTextureUnits=re,this.setTexture2D=Ee,this.setTexture2DArray=Ce,this.setTexture3D=ce,this.setTextureCube=K,this.rebindTextures=mt,this.setupRenderTarget=Tt,this.updateRenderTargetMipmap=$t,this.updateMultisampleRenderTarget=En,this.setupDepthRenderbuffer=kt,this.setupFrameBufferTexture=Je,this.useMultisampledRTT=Ft,this.isReversedDepthBuffer=function(){return t.buffers.depth.getReversed()}}function Gy(n,e){function t(i,r=$a){let c;const u=Gt.getTransfer(r);if(i===ki)return n.UNSIGNED_BYTE;if(i===od)return n.UNSIGNED_SHORT_4_4_4_4;if(i===ld)return n.UNSIGNED_SHORT_5_5_5_1;if(i===Wm)return n.UNSIGNED_INT_5_9_9_9_REV;if(i===Xm)return n.UNSIGNED_INT_10F_11F_11F_REV;if(i===Gm)return n.BYTE;if(i===Vm)return n.SHORT;if(i===yc)return n.UNSIGNED_SHORT;if(i===sd)return n.INT;if(i===Vr)return n.UNSIGNED_INT;if(i===Br)return n.FLOAT;if(i===ya)return n.HALF_FLOAT;if(i===Ym)return n.ALPHA;if(i===Zm)return n.RGB;if(i===gr)return n.RGBA;if(i===Sa)return n.DEPTH_COMPONENT;if(i===eo)return n.DEPTH_STENCIL;if(i===Km)return n.RED;if(i===cd)return n.RED_INTEGER;if(i===io)return n.RG;if(i===ud)return n.RG_INTEGER;if(i===hd)return n.RGBA_INTEGER;if(i===Iu||i===Lu||i===Nu||i===Fu)if(u===nn)if(c=e.get("WEBGL_compressed_texture_s3tc_srgb"),c!==null){if(i===Iu)return c.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(i===Lu)return c.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(i===Nu)return c.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(i===Fu)return c.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(c=e.get("WEBGL_compressed_texture_s3tc"),c!==null){if(i===Iu)return c.COMPRESSED_RGB_S3TC_DXT1_EXT;if(i===Lu)return c.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(i===Nu)return c.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(i===Fu)return c.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(i===Mf||i===yf||i===Sf||i===Ef)if(c=e.get("WEBGL_compressed_texture_pvrtc"),c!==null){if(i===Mf)return c.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(i===yf)return c.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(i===Sf)return c.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(i===Ef)return c.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(i===Tf||i===wf||i===Af||i===Rf||i===Cf||i===Bu||i===Pf)if(c=e.get("WEBGL_compressed_texture_etc"),c!==null){if(i===Tf||i===wf)return u===nn?c.COMPRESSED_SRGB8_ETC2:c.COMPRESSED_RGB8_ETC2;if(i===Af)return u===nn?c.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:c.COMPRESSED_RGBA8_ETC2_EAC;if(i===Rf)return c.COMPRESSED_R11_EAC;if(i===Cf)return c.COMPRESSED_SIGNED_R11_EAC;if(i===Bu)return c.COMPRESSED_RG11_EAC;if(i===Pf)return c.COMPRESSED_SIGNED_RG11_EAC}else return null;if(i===Df||i===If||i===Lf||i===Nf||i===Ff||i===Uf||i===Of||i===Bf||i===kf||i===zf||i===Hf||i===Gf||i===Vf||i===Wf)if(c=e.get("WEBGL_compressed_texture_astc"),c!==null){if(i===Df)return u===nn?c.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:c.COMPRESSED_RGBA_ASTC_4x4_KHR;if(i===If)return u===nn?c.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:c.COMPRESSED_RGBA_ASTC_5x4_KHR;if(i===Lf)return u===nn?c.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:c.COMPRESSED_RGBA_ASTC_5x5_KHR;if(i===Nf)return u===nn?c.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:c.COMPRESSED_RGBA_ASTC_6x5_KHR;if(i===Ff)return u===nn?c.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:c.COMPRESSED_RGBA_ASTC_6x6_KHR;if(i===Uf)return u===nn?c.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:c.COMPRESSED_RGBA_ASTC_8x5_KHR;if(i===Of)return u===nn?c.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:c.COMPRESSED_RGBA_ASTC_8x6_KHR;if(i===Bf)return u===nn?c.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:c.COMPRESSED_RGBA_ASTC_8x8_KHR;if(i===kf)return u===nn?c.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:c.COMPRESSED_RGBA_ASTC_10x5_KHR;if(i===zf)return u===nn?c.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:c.COMPRESSED_RGBA_ASTC_10x6_KHR;if(i===Hf)return u===nn?c.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:c.COMPRESSED_RGBA_ASTC_10x8_KHR;if(i===Gf)return u===nn?c.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:c.COMPRESSED_RGBA_ASTC_10x10_KHR;if(i===Vf)return u===nn?c.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:c.COMPRESSED_RGBA_ASTC_12x10_KHR;if(i===Wf)return u===nn?c.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:c.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(i===Xf||i===Yf||i===Zf)if(c=e.get("EXT_texture_compression_bptc"),c!==null){if(i===Xf)return u===nn?c.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:c.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(i===Yf)return c.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(i===Zf)return c.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(i===Kf||i===Jf||i===ku||i===Qf)if(c=e.get("EXT_texture_compression_rgtc"),c!==null){if(i===Kf)return c.COMPRESSED_RED_RGTC1_EXT;if(i===Jf)return c.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(i===ku)return c.COMPRESSED_RED_GREEN_RGTC2_EXT;if(i===Qf)return c.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return i===Sc?n.UNSIGNED_INT_24_8:n[i]!==void 0?n[i]:null}return{convert:t}}const Vy=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,Wy=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class Xy{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){const i=new ig(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=i}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,i=new Wr({vertexShader:Vy,fragmentShader:Wy,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new fi(new hl(20,20),i)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class Yy extends ss{constructor(e,t){super();const i=this;let r=null,c=1,u=null,d="local-floor",m=1,p=null,g=null,b=null,x=null,M=null,A=null;const C=typeof XRWebGLBinding<"u",T=new Xy,S={},B=t.getContextAttributes();let G=null,D=null;const z=[],U=[],W=new pt;let w=null;const F=new Ji;F.viewport=new yn;const Z=new Ji;Z.viewport=new yn;const X=[F,Z],ne=new tx;let pe=null,_e=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(me){let he=z[me];return he===void 0&&(he=new Lh,z[me]=he),he.getTargetRaySpace()},this.getControllerGrip=function(me){let he=z[me];return he===void 0&&(he=new Lh,z[me]=he),he.getGripSpace()},this.getHand=function(me){let he=z[me];return he===void 0&&(he=new Lh,z[me]=he),he.getHandSpace()};function re(me){const he=U.indexOf(me.inputSource);if(he===-1)return;const we=z[he];we!==void 0&&(we.update(me.inputSource,me.frame,p||u),we.dispatchEvent({type:me.type,data:me.inputSource}))}function H(){r.removeEventListener("select",re),r.removeEventListener("selectstart",re),r.removeEventListener("selectend",re),r.removeEventListener("squeeze",re),r.removeEventListener("squeezestart",re),r.removeEventListener("squeezeend",re),r.removeEventListener("end",H),r.removeEventListener("inputsourceschange",j);for(let me=0;me<z.length;me++){const he=U[me];he!==null&&(U[me]=null,z[me].disconnect(he))}pe=null,_e=null,T.reset();for(const me in S)delete S[me];e.setRenderTarget(G),M=null,x=null,b=null,r=null,D=null,De.stop(),i.isPresenting=!1,e.setPixelRatio(w),e.setSize(W.width,W.height,!1),i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(me){c=me,i.isPresenting===!0&&ft("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(me){d=me,i.isPresenting===!0&&ft("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return p||u},this.setReferenceSpace=function(me){p=me},this.getBaseLayer=function(){return x!==null?x:M},this.getBinding=function(){return b===null&&C&&(b=new XRWebGLBinding(r,t)),b},this.getFrame=function(){return A},this.getSession=function(){return r},this.setSession=async function(me){if(r=me,r!==null){if(G=e.getRenderTarget(),r.addEventListener("select",re),r.addEventListener("selectstart",re),r.addEventListener("selectend",re),r.addEventListener("squeeze",re),r.addEventListener("squeezestart",re),r.addEventListener("squeezeend",re),r.addEventListener("end",H),r.addEventListener("inputsourceschange",j),B.xrCompatible!==!0&&await t.makeXRCompatible(),w=e.getPixelRatio(),e.getSize(W),C&&"createProjectionLayer"in XRWebGLBinding.prototype){let we=null,Ve=null,Ke=null;B.depth&&(Ke=B.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,we=B.stencil?eo:Sa,Ve=B.stencil?Sc:Vr);const Je={colorFormat:t.RGBA8,depthFormat:Ke,scaleFactor:c};b=this.getBinding(),x=b.createProjectionLayer(Je),r.updateRenderState({layers:[x]}),e.setPixelRatio(1),e.setSize(x.textureWidth,x.textureHeight,!1),D=new Hr(x.textureWidth,x.textureHeight,{format:gr,type:ki,depthTexture:new ul(x.textureWidth,x.textureHeight,Ve,void 0,void 0,void 0,void 0,void 0,void 0,we),stencilBuffer:B.stencil,colorSpace:e.outputColorSpace,samples:B.antialias?4:0,resolveDepthBuffer:x.ignoreDepthValues===!1,resolveStencilBuffer:x.ignoreDepthValues===!1})}else{const we={antialias:B.antialias,alpha:!0,depth:B.depth,stencil:B.stencil,framebufferScaleFactor:c};M=new XRWebGLLayer(r,t,we),r.updateRenderState({baseLayer:M}),e.setPixelRatio(1),e.setSize(M.framebufferWidth,M.framebufferHeight,!1),D=new Hr(M.framebufferWidth,M.framebufferHeight,{format:gr,type:ki,colorSpace:e.outputColorSpace,stencilBuffer:B.stencil,resolveDepthBuffer:M.ignoreDepthValues===!1,resolveStencilBuffer:M.ignoreDepthValues===!1})}D.isXRRenderTarget=!0,this.setFoveation(m),p=null,u=await r.requestReferenceSpace(d),De.setContext(r),De.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode},this.getDepthTexture=function(){return T.getDepthTexture()};function j(me){for(let he=0;he<me.removed.length;he++){const we=me.removed[he],Ve=U.indexOf(we);Ve>=0&&(U[Ve]=null,z[Ve].disconnect(we))}for(let he=0;he<me.added.length;he++){const we=me.added[he];let Ve=U.indexOf(we);if(Ve===-1){for(let Je=0;Je<z.length;Je++)if(Je>=U.length){U.push(we),Ve=Je;break}else if(U[Je]===null){U[Je]=we,Ve=Je;break}if(Ve===-1)break}const Ke=z[Ve];Ke&&Ke.connect(we)}}const Ee=new se,Ce=new se;function ce(me,he,we){Ee.setFromMatrixPosition(he.matrixWorld),Ce.setFromMatrixPosition(we.matrixWorld);const Ve=Ee.distanceTo(Ce),Ke=he.projectionMatrix.elements,Je=we.projectionMatrix.elements,Lt=Ke[14]/(Ke[10]-1),Le=Ke[14]/(Ke[10]+1),kt=(Ke[9]+1)/Ke[5],mt=(Ke[9]-1)/Ke[5],Tt=(Ke[8]-1)/Ke[0],$t=(Je[8]+1)/Je[0],Kt=Lt*Tt,wt=Lt*$t,En=Ve/(-Tt+$t),Nt=En*-Tt;if(he.matrixWorld.decompose(me.position,me.quaternion,me.scale),me.translateX(Nt),me.translateZ(En),me.matrixWorld.compose(me.position,me.quaternion,me.scale),me.matrixWorldInverse.copy(me.matrixWorld).invert(),Ke[10]===-1)me.projectionMatrix.copy(he.projectionMatrix),me.projectionMatrixInverse.copy(he.projectionMatrixInverse);else{const Ft=Lt+En,$=Le+En,Ln=Kt-Nt,it=wt+(Ve-Nt),O=kt*Le/$*Ft,R=mt*Le/$*Ft;me.projectionMatrix.makePerspective(Ln,it,O,R,Ft,$),me.projectionMatrixInverse.copy(me.projectionMatrix).invert()}}function K(me,he){he===null?me.matrixWorld.copy(me.matrix):me.matrixWorld.multiplyMatrices(he.matrixWorld,me.matrix),me.matrixWorldInverse.copy(me.matrixWorld).invert()}this.updateCamera=function(me){if(r===null)return;let he=me.near,we=me.far;T.texture!==null&&(T.depthNear>0&&(he=T.depthNear),T.depthFar>0&&(we=T.depthFar)),ne.near=Z.near=F.near=he,ne.far=Z.far=F.far=we,(pe!==ne.near||_e!==ne.far)&&(r.updateRenderState({depthNear:ne.near,depthFar:ne.far}),pe=ne.near,_e=ne.far),ne.layers.mask=me.layers.mask|6,F.layers.mask=ne.layers.mask&-5,Z.layers.mask=ne.layers.mask&-3;const Ve=me.parent,Ke=ne.cameras;K(ne,Ve);for(let Je=0;Je<Ke.length;Je++)K(Ke[Je],Ve);Ke.length===2?ce(ne,F,Z):ne.projectionMatrix.copy(F.projectionMatrix),ue(me,ne,Ve)};function ue(me,he,we){we===null?me.matrix.copy(he.matrixWorld):(me.matrix.copy(we.matrixWorld),me.matrix.invert(),me.matrix.multiply(he.matrixWorld)),me.matrix.decompose(me.position,me.quaternion,me.scale),me.updateMatrixWorld(!0),me.projectionMatrix.copy(he.projectionMatrix),me.projectionMatrixInverse.copy(he.projectionMatrixInverse),me.isPerspectiveCamera&&(me.fov=jf*2*Math.atan(1/me.projectionMatrix.elements[5]),me.zoom=1)}this.getCamera=function(){return ne},this.getFoveation=function(){if(!(x===null&&M===null))return m},this.setFoveation=function(me){m=me,x!==null&&(x.fixedFoveation=me),M!==null&&M.fixedFoveation!==void 0&&(M.fixedFoveation=me)},this.hasDepthSensing=function(){return T.texture!==null},this.getDepthSensingMesh=function(){return T.getMesh(ne)},this.getCameraTexture=function(me){return S[me]};let Pe=null;function tt(me,he){if(g=he.getViewerPose(p||u),A=he,g!==null){const we=g.views;M!==null&&(e.setRenderTargetFramebuffer(D,M.framebuffer),e.setRenderTarget(D));let Ve=!1;we.length!==ne.cameras.length&&(ne.cameras.length=0,Ve=!0);for(let Le=0;Le<we.length;Le++){const kt=we[Le];let mt=null;if(M!==null)mt=M.getViewport(kt);else{const $t=b.getViewSubImage(x,kt);mt=$t.viewport,Le===0&&(e.setRenderTargetTextures(D,$t.colorTexture,$t.depthStencilTexture),e.setRenderTarget(D))}let Tt=X[Le];Tt===void 0&&(Tt=new Ji,Tt.layers.enable(Le),Tt.viewport=new yn,X[Le]=Tt),Tt.matrix.fromArray(kt.transform.matrix),Tt.matrix.decompose(Tt.position,Tt.quaternion,Tt.scale),Tt.projectionMatrix.fromArray(kt.projectionMatrix),Tt.projectionMatrixInverse.copy(Tt.projectionMatrix).invert(),Tt.viewport.set(mt.x,mt.y,mt.width,mt.height),Le===0&&(ne.matrix.copy(Tt.matrix),ne.matrix.decompose(ne.position,ne.quaternion,ne.scale)),Ve===!0&&ne.cameras.push(Tt)}const Ke=r.enabledFeatures;if(Ke&&Ke.includes("depth-sensing")&&r.depthUsage=="gpu-optimized"&&C){b=i.getBinding();const Le=b.getDepthInformation(we[0]);Le&&Le.isValid&&Le.texture&&T.init(Le,r.renderState)}if(Ke&&Ke.includes("camera-access")&&C){e.state.unbindTexture(),b=i.getBinding();for(let Le=0;Le<we.length;Le++){const kt=we[Le].camera;if(kt){let mt=S[kt];mt||(mt=new ig,S[kt]=mt);const Tt=b.getCameraImage(kt);mt.sourceTexture=Tt}}}}for(let we=0;we<z.length;we++){const Ve=U[we],Ke=z[we];Ve!==null&&Ke!==void 0&&Ke.update(Ve,he,p||u)}Pe&&Pe(me,he),he.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:he}),A=null}const De=new lg;De.setAnimationLoop(tt),this.setAnimationLoop=function(me){Pe=me},this.dispose=function(){}}}const Zy=new Sn,mg=new xt;mg.set(-1,0,0,0,1,0,0,0,1);function Ky(n,e){function t(T,S){T.matrixAutoUpdate===!0&&T.updateMatrix(),S.value.copy(T.matrix)}function i(T,S){S.color.getRGB(T.fogColor.value,rg(n)),S.isFog?(T.fogNear.value=S.near,T.fogFar.value=S.far):S.isFogExp2&&(T.fogDensity.value=S.density)}function r(T,S,B,G,D){S.isNodeMaterial?S.uniformsNeedUpdate=!1:S.isMeshBasicMaterial?c(T,S):S.isMeshLambertMaterial?(c(T,S),S.envMap&&(T.envMapIntensity.value=S.envMapIntensity)):S.isMeshToonMaterial?(c(T,S),b(T,S)):S.isMeshPhongMaterial?(c(T,S),g(T,S),S.envMap&&(T.envMapIntensity.value=S.envMapIntensity)):S.isMeshStandardMaterial?(c(T,S),x(T,S),S.isMeshPhysicalMaterial&&M(T,S,D)):S.isMeshMatcapMaterial?(c(T,S),A(T,S)):S.isMeshDepthMaterial?c(T,S):S.isMeshDistanceMaterial?(c(T,S),C(T,S)):S.isMeshNormalMaterial?c(T,S):S.isLineBasicMaterial?(u(T,S),S.isLineDashedMaterial&&d(T,S)):S.isPointsMaterial?m(T,S,B,G):S.isSpriteMaterial?p(T,S):S.isShadowMaterial?(T.color.value.copy(S.color),T.opacity.value=S.opacity):S.isShaderMaterial&&(S.uniformsNeedUpdate=!1)}function c(T,S){T.opacity.value=S.opacity,S.color&&T.diffuse.value.copy(S.color),S.emissive&&T.emissive.value.copy(S.emissive).multiplyScalar(S.emissiveIntensity),S.map&&(T.map.value=S.map,t(S.map,T.mapTransform)),S.alphaMap&&(T.alphaMap.value=S.alphaMap,t(S.alphaMap,T.alphaMapTransform)),S.bumpMap&&(T.bumpMap.value=S.bumpMap,t(S.bumpMap,T.bumpMapTransform),T.bumpScale.value=S.bumpScale,S.side===Ii&&(T.bumpScale.value*=-1)),S.normalMap&&(T.normalMap.value=S.normalMap,t(S.normalMap,T.normalMapTransform),T.normalScale.value.copy(S.normalScale),S.side===Ii&&T.normalScale.value.negate()),S.displacementMap&&(T.displacementMap.value=S.displacementMap,t(S.displacementMap,T.displacementMapTransform),T.displacementScale.value=S.displacementScale,T.displacementBias.value=S.displacementBias),S.emissiveMap&&(T.emissiveMap.value=S.emissiveMap,t(S.emissiveMap,T.emissiveMapTransform)),S.specularMap&&(T.specularMap.value=S.specularMap,t(S.specularMap,T.specularMapTransform)),S.alphaTest>0&&(T.alphaTest.value=S.alphaTest);const B=e.get(S),G=B.envMap,D=B.envMapRotation;G&&(T.envMap.value=G,T.envMapRotation.value.setFromMatrix4(Zy.makeRotationFromEuler(D)).transpose(),G.isCubeTexture&&G.isRenderTargetTexture===!1&&T.envMapRotation.value.premultiply(mg),T.reflectivity.value=S.reflectivity,T.ior.value=S.ior,T.refractionRatio.value=S.refractionRatio),S.lightMap&&(T.lightMap.value=S.lightMap,T.lightMapIntensity.value=S.lightMapIntensity,t(S.lightMap,T.lightMapTransform)),S.aoMap&&(T.aoMap.value=S.aoMap,T.aoMapIntensity.value=S.aoMapIntensity,t(S.aoMap,T.aoMapTransform))}function u(T,S){T.diffuse.value.copy(S.color),T.opacity.value=S.opacity,S.map&&(T.map.value=S.map,t(S.map,T.mapTransform))}function d(T,S){T.dashSize.value=S.dashSize,T.totalSize.value=S.dashSize+S.gapSize,T.scale.value=S.scale}function m(T,S,B,G){T.diffuse.value.copy(S.color),T.opacity.value=S.opacity,T.size.value=S.size*B,T.scale.value=G*.5,S.map&&(T.map.value=S.map,t(S.map,T.uvTransform)),S.alphaMap&&(T.alphaMap.value=S.alphaMap,t(S.alphaMap,T.alphaMapTransform)),S.alphaTest>0&&(T.alphaTest.value=S.alphaTest)}function p(T,S){T.diffuse.value.copy(S.color),T.opacity.value=S.opacity,T.rotation.value=S.rotation,S.map&&(T.map.value=S.map,t(S.map,T.mapTransform)),S.alphaMap&&(T.alphaMap.value=S.alphaMap,t(S.alphaMap,T.alphaMapTransform)),S.alphaTest>0&&(T.alphaTest.value=S.alphaTest)}function g(T,S){T.specular.value.copy(S.specular),T.shininess.value=Math.max(S.shininess,1e-4)}function b(T,S){S.gradientMap&&(T.gradientMap.value=S.gradientMap)}function x(T,S){T.metalness.value=S.metalness,S.metalnessMap&&(T.metalnessMap.value=S.metalnessMap,t(S.metalnessMap,T.metalnessMapTransform)),T.roughness.value=S.roughness,S.roughnessMap&&(T.roughnessMap.value=S.roughnessMap,t(S.roughnessMap,T.roughnessMapTransform)),S.envMap&&(T.envMapIntensity.value=S.envMapIntensity)}function M(T,S,B){T.ior.value=S.ior,S.sheen>0&&(T.sheenColor.value.copy(S.sheenColor).multiplyScalar(S.sheen),T.sheenRoughness.value=S.sheenRoughness,S.sheenColorMap&&(T.sheenColorMap.value=S.sheenColorMap,t(S.sheenColorMap,T.sheenColorMapTransform)),S.sheenRoughnessMap&&(T.sheenRoughnessMap.value=S.sheenRoughnessMap,t(S.sheenRoughnessMap,T.sheenRoughnessMapTransform))),S.clearcoat>0&&(T.clearcoat.value=S.clearcoat,T.clearcoatRoughness.value=S.clearcoatRoughness,S.clearcoatMap&&(T.clearcoatMap.value=S.clearcoatMap,t(S.clearcoatMap,T.clearcoatMapTransform)),S.clearcoatRoughnessMap&&(T.clearcoatRoughnessMap.value=S.clearcoatRoughnessMap,t(S.clearcoatRoughnessMap,T.clearcoatRoughnessMapTransform)),S.clearcoatNormalMap&&(T.clearcoatNormalMap.value=S.clearcoatNormalMap,t(S.clearcoatNormalMap,T.clearcoatNormalMapTransform),T.clearcoatNormalScale.value.copy(S.clearcoatNormalScale),S.side===Ii&&T.clearcoatNormalScale.value.negate())),S.dispersion>0&&(T.dispersion.value=S.dispersion),S.iridescence>0&&(T.iridescence.value=S.iridescence,T.iridescenceIOR.value=S.iridescenceIOR,T.iridescenceThicknessMinimum.value=S.iridescenceThicknessRange[0],T.iridescenceThicknessMaximum.value=S.iridescenceThicknessRange[1],S.iridescenceMap&&(T.iridescenceMap.value=S.iridescenceMap,t(S.iridescenceMap,T.iridescenceMapTransform)),S.iridescenceThicknessMap&&(T.iridescenceThicknessMap.value=S.iridescenceThicknessMap,t(S.iridescenceThicknessMap,T.iridescenceThicknessMapTransform))),S.transmission>0&&(T.transmission.value=S.transmission,T.transmissionSamplerMap.value=B.texture,T.transmissionSamplerSize.value.set(B.width,B.height),S.transmissionMap&&(T.transmissionMap.value=S.transmissionMap,t(S.transmissionMap,T.transmissionMapTransform)),T.thickness.value=S.thickness,S.thicknessMap&&(T.thicknessMap.value=S.thicknessMap,t(S.thicknessMap,T.thicknessMapTransform)),T.attenuationDistance.value=S.attenuationDistance,T.attenuationColor.value.copy(S.attenuationColor)),S.anisotropy>0&&(T.anisotropyVector.value.set(S.anisotropy*Math.cos(S.anisotropyRotation),S.anisotropy*Math.sin(S.anisotropyRotation)),S.anisotropyMap&&(T.anisotropyMap.value=S.anisotropyMap,t(S.anisotropyMap,T.anisotropyMapTransform))),T.specularIntensity.value=S.specularIntensity,T.specularColor.value.copy(S.specularColor),S.specularColorMap&&(T.specularColorMap.value=S.specularColorMap,t(S.specularColorMap,T.specularColorMapTransform)),S.specularIntensityMap&&(T.specularIntensityMap.value=S.specularIntensityMap,t(S.specularIntensityMap,T.specularIntensityMapTransform))}function A(T,S){S.matcap&&(T.matcap.value=S.matcap)}function C(T,S){const B=e.get(S).light;T.referencePosition.value.setFromMatrixPosition(B.matrixWorld),T.nearDistance.value=B.shadow.camera.near,T.farDistance.value=B.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:r}}function Jy(n,e,t,i){let r={},c={},u=[];const d=n.getParameter(n.MAX_UNIFORM_BUFFER_BINDINGS);function m(D,z){const U=z.program;i.uniformBlockBinding(D,U)}function p(D,z){let U=r[D.id];U===void 0&&(T(D),U=g(D),r[D.id]=U,D.addEventListener("dispose",B));const W=z.program;i.updateUBOMapping(D,W);const w=e.render.frame;c[D.id]!==w&&(x(D),c[D.id]=w)}function g(D){const z=b();D.__bindingPointIndex=z;const U=n.createBuffer(),W=D.__size,w=D.usage;return n.bindBuffer(n.UNIFORM_BUFFER,U),n.bufferData(n.UNIFORM_BUFFER,W,w),n.bindBuffer(n.UNIFORM_BUFFER,null),n.bindBufferBase(n.UNIFORM_BUFFER,z,U),U}function b(){for(let D=0;D<d;D++)if(u.indexOf(D)===-1)return u.push(D),D;return Xt("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function x(D){const z=r[D.id],U=D.uniforms,W=D.__cache;n.bindBuffer(n.UNIFORM_BUFFER,z);for(let w=0,F=U.length;w<F;w++){const Z=U[w];if(Array.isArray(Z))for(let X=0,ne=Z.length;X<ne;X++)M(Z[X],w,X,W);else M(Z,w,0,W)}n.bindBuffer(n.UNIFORM_BUFFER,null)}function M(D,z,U,W){if(C(D,z,U,W)===!0){const w=D.__offset,F=D.value;if(Array.isArray(F)){let Z=0;for(let X=0;X<F.length;X++){const ne=F[X],pe=S(ne);A(ne,D.__data,Z),typeof ne!="number"&&typeof ne!="boolean"&&!ne.isMatrix3&&!ArrayBuffer.isView(ne)&&(Z+=pe.storage/Float32Array.BYTES_PER_ELEMENT)}}else A(F,D.__data,0);n.bufferSubData(n.UNIFORM_BUFFER,w,D.__data)}}function A(D,z,U){typeof D=="number"||typeof D=="boolean"?z[0]=D:D.isMatrix3?(z[0]=D.elements[0],z[1]=D.elements[1],z[2]=D.elements[2],z[3]=0,z[4]=D.elements[3],z[5]=D.elements[4],z[6]=D.elements[5],z[7]=0,z[8]=D.elements[6],z[9]=D.elements[7],z[10]=D.elements[8],z[11]=0):ArrayBuffer.isView(D)?z.set(new D.constructor(D.buffer,D.byteOffset,z.length)):D.toArray(z,U)}function C(D,z,U,W){const w=D.value,F=z+"_"+U;if(W[F]===void 0)return typeof w=="number"||typeof w=="boolean"?W[F]=w:ArrayBuffer.isView(w)?W[F]=w.slice():W[F]=w.clone(),!0;{const Z=W[F];if(typeof w=="number"||typeof w=="boolean"){if(Z!==w)return W[F]=w,!0}else{if(ArrayBuffer.isView(w))return!0;if(Z.equals(w)===!1)return Z.copy(w),!0}}return!1}function T(D){const z=D.uniforms;let U=0;const W=16;for(let F=0,Z=z.length;F<Z;F++){const X=Array.isArray(z[F])?z[F]:[z[F]];for(let ne=0,pe=X.length;ne<pe;ne++){const _e=X[ne],re=Array.isArray(_e.value)?_e.value:[_e.value];for(let H=0,j=re.length;H<j;H++){const Ee=re[H],Ce=S(Ee),ce=U%W,K=ce%Ce.boundary,ue=ce+K;U+=K,ue!==0&&W-ue<Ce.storage&&(U+=W-ue),_e.__data=new Float32Array(Ce.storage/Float32Array.BYTES_PER_ELEMENT),_e.__offset=U,U+=Ce.storage}}}const w=U%W;return w>0&&(U+=W-w),D.__size=U,D.__cache={},this}function S(D){const z={boundary:0,storage:0};return typeof D=="number"||typeof D=="boolean"?(z.boundary=4,z.storage=4):D.isVector2?(z.boundary=8,z.storage=8):D.isVector3||D.isColor?(z.boundary=16,z.storage=12):D.isVector4?(z.boundary=16,z.storage=16):D.isMatrix3?(z.boundary=48,z.storage=48):D.isMatrix4?(z.boundary=64,z.storage=64):D.isTexture?ft("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(D)?(z.boundary=16,z.storage=D.byteLength):ft("WebGLRenderer: Unsupported uniform value type.",D),z}function B(D){const z=D.target;z.removeEventListener("dispose",B);const U=u.indexOf(z.__bindingPointIndex);u.splice(U,1),n.deleteBuffer(r[z.id]),delete r[z.id],delete c[z.id]}function G(){for(const D in r)n.deleteBuffer(r[D]);u=[],r={},c={}}return{bind:m,update:p,dispose:G}}const Qy=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]);let Ur=null;function qy(){return Ur===null&&(Ur=new O_(Qy,16,16,io,ya),Ur.name="DFG_LUT",Ur.minFilter=pi,Ur.magFilter=pi,Ur.wrapS=xa,Ur.wrapT=xa,Ur.generateMipmaps=!1,Ur.needsUpdate=!0),Ur}class jy{constructor(e={}){const{canvas:t=d_(),context:i=null,depth:r=!0,stencil:c=!1,alpha:u=!1,antialias:d=!1,premultipliedAlpha:m=!0,preserveDrawingBuffer:p=!1,powerPreference:g="default",failIfMajorPerformanceCaveat:b=!1,reversedDepthBuffer:x=!1,outputBufferType:M=ki}=e;this.isWebGLRenderer=!0;let A;if(i!==null){if(typeof WebGLRenderingContext<"u"&&i instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");A=i.getContextAttributes().alpha}else A=u;const C=M,T=new Set([hd,ud,cd]),S=new Set([ki,Vr,yc,Sc,od,ld]),B=new Uint32Array(4),G=new Int32Array(4),D=new se;let z=null,U=null;const W=[],w=[];let F=null;this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=zr,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const Z=this;let X=!1,ne=null,pe=null,_e=null,re=null;this._outputColorSpace=Ki;let H=0,j=0,Ee=null,Ce=-1,ce=null;const K=new yn,ue=new yn;let Pe=null;const tt=new It(0);let De=0,me=t.width,he=t.height,we=1,Ve=null,Ke=null;const Je=new yn(0,0,me,he),Lt=new yn(0,0,me,he);let Le=!1;const kt=new _d;let mt=!1,Tt=!1;const $t=new Sn,Kt=new se,wt=new yn,En={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let Nt=!1;function Ft(){return Ee===null?we:1}let $=i;function Ln(I,Q){return t.getContext(I,Q)}try{const I={alpha:!0,depth:r,stencil:c,antialias:d,premultipliedAlpha:m,preserveDrawingBuffer:p,powerPreference:g,failIfMajorPerformanceCaveat:b};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${rd}`),t.addEventListener("webglcontextlost",ln,!1),t.addEventListener("webglcontextrestored",Vt,!1),t.addEventListener("webglcontextcreationerror",Wn,!1),$===null){const Q="webgl2";if($=Ln(Q,I),$===null)throw Ln(Q)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}}catch(I){throw Xt("WebGLRenderer: "+I.message),I}let it,O,R,ie,ae,be,Ie,Ne,Me,ye,ze,rt,Ge,He,We,je,ht,J,Ue,Te,Oe,Fe,Re;function st(){it=new qb($),it.init(),Oe=new Gy($,it),O=new Vb($,it,e,Oe),R=new zy($,it),O.reversedDepthBuffer&&x&&R.buffers.depth.setReversed(!0),pe=$.createFramebuffer(),_e=$.createFramebuffer(),re=$.createFramebuffer(),ie=new eM($),ae=new wy,be=new Hy($,it,R,ae,O,Oe,ie),Ie=new Qb(Z),Ne=new rx($),Fe=new Hb($,Ne),Me=new jb($,Ne,ie,Fe),ye=new nM($,Me,Ne,Fe,ie),J=new tM($,O,be),We=new Wb(ae),ze=new Ty(Z,Ie,it,O,Fe,We),rt=new Ky(Z,ae),Ge=new Ry,He=new Ny(it),ht=new zb(Z,Ie,R,ye,A,m),je=new ky(Z,ye,O),Re=new Jy($,ie,O,R),Ue=new Gb($,it,ie),Te=new $b($,it,ie),ie.programs=ze.programs,Z.capabilities=O,Z.extensions=it,Z.properties=ae,Z.renderLists=Ge,Z.shadowMap=je,Z.state=R,Z.info=ie}st(),C!==ki&&(F=new rM(C,t.width,t.height,d,r,c));const nt=new Yy(Z,$);this.xr=nt,this.getContext=function(){return $},this.getContextAttributes=function(){return $.getContextAttributes()},this.forceContextLoss=function(){const I=it.get("WEBGL_lose_context");I&&I.loseContext()},this.forceContextRestore=function(){const I=it.get("WEBGL_lose_context");I&&I.restoreContext()},this.getPixelRatio=function(){return we},this.setPixelRatio=function(I){I!==void 0&&(we=I,this.setSize(me,he,!1))},this.getSize=function(I){return I.set(me,he)},this.setSize=function(I,Q,fe=!0){if(nt.isPresenting){ft("WebGLRenderer: Can't change size while VR device is presenting.");return}me=I,he=Q,t.width=Math.floor(I*we),t.height=Math.floor(Q*we),fe===!0&&(t.style.width=I+"px",t.style.height=Q+"px"),F!==null&&F.setSize(t.width,t.height),this.setViewport(0,0,I,Q)},this.getDrawingBufferSize=function(I){return I.set(me*we,he*we).floor()},this.setDrawingBufferSize=function(I,Q,fe){me=I,he=Q,we=fe,t.width=Math.floor(I*fe),t.height=Math.floor(Q*fe),this.setViewport(0,0,I,Q)},this.setEffects=function(I){if(C===ki){Xt("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(I){for(let Q=0;Q<I.length;Q++)if(I[Q].isOutputPass===!0){ft("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}F.setEffects(I||[])},this.getCurrentViewport=function(I){return I.copy(K)},this.getViewport=function(I){return I.copy(Je)},this.setViewport=function(I,Q,fe,le){I.isVector4?Je.set(I.x,I.y,I.z,I.w):Je.set(I,Q,fe,le),R.viewport(K.copy(Je).multiplyScalar(we).round())},this.getScissor=function(I){return I.copy(Lt)},this.setScissor=function(I,Q,fe,le){I.isVector4?Lt.set(I.x,I.y,I.z,I.w):Lt.set(I,Q,fe,le),R.scissor(ue.copy(Lt).multiplyScalar(we).round())},this.getScissorTest=function(){return Le},this.setScissorTest=function(I){R.setScissorTest(Le=I)},this.setOpaqueSort=function(I){Ve=I},this.setTransparentSort=function(I){Ke=I},this.getClearColor=function(I){return I.copy(ht.getClearColor())},this.setClearColor=function(){ht.setClearColor(...arguments)},this.getClearAlpha=function(){return ht.getClearAlpha()},this.setClearAlpha=function(){ht.setClearAlpha(...arguments)},this.clear=function(I=!0,Q=!0,fe=!0){let le=0;if(I){let oe=!1;if(Ee!==null){const Xe=Ee.texture.format;oe=T.has(Xe)}if(oe){const Xe=Ee.texture.type,$e=S.has(Xe),Ze=ht.getClearColor(),et=ht.getClearAlpha(),at=Ze.r,ut=Ze.g,ct=Ze.b;$e?(B[0]=at,B[1]=ut,B[2]=ct,B[3]=et,$.clearBufferuiv($.COLOR,0,B)):(G[0]=at,G[1]=ut,G[2]=ct,G[3]=et,$.clearBufferiv($.COLOR,0,G))}else le|=$.COLOR_BUFFER_BIT}Q&&(le|=$.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),fe&&(le|=$.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),le!==0&&$.clear(le)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(I){I.setRenderer(this),ne=I},this.dispose=function(){t.removeEventListener("webglcontextlost",ln,!1),t.removeEventListener("webglcontextrestored",Vt,!1),t.removeEventListener("webglcontextcreationerror",Wn,!1),ht.dispose(),Ge.dispose(),He.dispose(),ae.dispose(),Ie.dispose(),ye.dispose(),Fe.dispose(),Re.dispose(),ze.dispose(),nt.dispose(),nt.removeEventListener("sessionstart",os),nt.removeEventListener("sessionend",ls),Li.stop()};function ln(I){I.preventDefault(),gp("WebGLRenderer: Context Lost."),X=!0}function Vt(){gp("WebGLRenderer: Context Restored."),X=!1;const I=ie.autoReset,Q=je.enabled,fe=je.autoUpdate,le=je.needsUpdate,oe=je.type;st(),ie.autoReset=I,je.enabled=Q,je.autoUpdate=fe,je.needsUpdate=le,je.type=oe}function Wn(I){Xt("WebGLRenderer: A WebGL context could not be created. Reason: ",I.statusMessage)}function Jt(I){const Q=I.target;Q.removeEventListener("dispose",Jt),si(Q)}function si(I){cn(I),ae.remove(I)}function cn(I){const Q=ae.get(I).programs;Q!==void 0&&(Q.forEach(function(fe){ze.releaseProgram(fe)}),I.isShaderMaterial&&ze.releaseShaderCache(I))}this.renderBufferDirect=function(I,Q,fe,le,oe,Xe){Q===null&&(Q=En);const $e=oe.isMesh&&oe.matrixWorld.determinantAffine()<0,Ze=ao(I,Q,fe,le,oe);R.setMaterial(le,$e);let et=fe.index,at=1;if(le.wireframe===!0){if(et=Me.getWireframeAttribute(fe),et===void 0)return;at=2}const ut=fe.drawRange,ct=fe.attributes.position;let ot=ut.start*at,Yt=(ut.start+ut.count)*at;Xe!==null&&(ot=Math.max(ot,Xe.start*at),Yt=Math.min(Yt,(Xe.start+Xe.count)*at)),et!==null?(ot=Math.max(ot,0),Yt=Math.min(Yt,et.count)):ct!=null&&(ot=Math.max(ot,0),Yt=Math.min(Yt,ct.count));const en=Yt-ot;if(en<0||en===1/0)return;Fe.setup(oe,le,Ze,fe,et);let gt,Ct=Ue;if(et!==null&&(gt=Ne.get(et),Ct=Te,Ct.setIndex(gt)),oe.isMesh)le.wireframe===!0?(R.setLineWidth(le.wireframeLinewidth*Ft()),Ct.setMode($.LINES)):Ct.setMode($.TRIANGLES);else if(oe.isLine){let bn=le.linewidth;bn===void 0&&(bn=1),R.setLineWidth(bn*Ft()),oe.isLineSegments?Ct.setMode($.LINES):oe.isLineLoop?Ct.setMode($.LINE_LOOP):Ct.setMode($.LINE_STRIP)}else oe.isPoints?Ct.setMode($.POINTS):oe.isSprite&&Ct.setMode($.TRIANGLES);if(oe.isBatchedMesh)if(it.get("WEBGL_multi_draw"))Ct.renderMultiDraw(oe._multiDrawStarts,oe._multiDrawCounts,oe._multiDrawCount);else{const bn=oe._multiDrawStarts,qe=oe._multiDrawCounts,gn=oe._multiDrawCount,Et=et?Ne.get(et).bytesPerElement:1,Yn=ae.get(le).currentProgram.getUniforms();for(let wn=0;wn<gn;wn++)Yn.setValue($,"_gl_DrawID",wn),Ct.render(bn[wn]/Et,qe[wn])}else if(oe.isInstancedMesh)Ct.renderInstances(ot,en,oe.count);else if(fe.isInstancedBufferGeometry){const bn=fe._maxInstanceCount!==void 0?fe._maxInstanceCount:1/0,qe=Math.min(fe.instanceCount,bn);Ct.renderInstances(ot,en,qe)}else Ct.render(ot,en)};function Xr(I,Q,fe){I.transparent===!0&&I.side===ga&&I.forceSinglePass===!1?(I.side=Ii,I.needsUpdate=!0,zi(I,Q,fe),I.side=is,I.needsUpdate=!0,zi(I,Q,fe),I.side=ga):zi(I,Q,fe)}this.compile=function(I,Q,fe=null){fe===null&&(fe=I),U=He.get(fe),U.init(Q),w.push(U),fe.traverseVisible(function(oe){oe.isLight&&oe.layers.test(Q.layers)&&(U.pushLight(oe),oe.castShadow&&U.pushShadow(oe))}),I!==fe&&I.traverseVisible(function(oe){oe.isLight&&oe.layers.test(Q.layers)&&(U.pushLight(oe),oe.castShadow&&U.pushShadow(oe))}),U.setupLights();const le=new Set;return I.traverse(function(oe){if(!(oe.isMesh||oe.isPoints||oe.isLine||oe.isSprite))return;const Xe=oe.material;if(Xe)if(Array.isArray(Xe))for(let $e=0;$e<Xe.length;$e++){const Ze=Xe[$e];Xr(Ze,fe,oe),le.add(Ze)}else Xr(Xe,fe,oe),le.add(Xe)}),U=w.pop(),le},this.compileAsync=function(I,Q,fe=null){const le=this.compile(I,Q,fe);return new Promise(oe=>{function Xe(){if(le.forEach(function($e){ae.get($e).currentProgram.isReady()&&le.delete($e)}),le.size===0){oe(I);return}setTimeout(Xe,10)}it.get("KHR_parallel_shader_compile")!==null?Xe():setTimeout(Xe,10)})};let Nn=null;function un(I){Nn&&Nn(I)}function os(){Li.stop()}function ls(){Li.start()}const Li=new lg;Li.setAnimationLoop(un),typeof self<"u"&&Li.setContext(self),this.setAnimationLoop=function(I){Nn=I,nt.setAnimationLoop(I),I===null?Li.stop():Li.start()},nt.addEventListener("sessionstart",os),nt.addEventListener("sessionend",ls),this.render=function(I,Q){if(Q!==void 0&&Q.isCamera!==!0){Xt("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(X===!0)return;ne!==null&&ne.renderStart(I,Q);const fe=nt.enabled===!0&&nt.isPresenting===!0,le=F!==null&&(Ee===null||fe)&&F.begin(Z,Ee);if(I.matrixWorldAutoUpdate===!0&&I.updateMatrixWorld(),Q.parent===null&&Q.matrixWorldAutoUpdate===!0&&Q.updateMatrixWorld(),nt.enabled===!0&&nt.isPresenting===!0&&(F===null||F.isCompositing()===!1)&&(nt.cameraAutoUpdate===!0&&nt.updateCamera(Q),Q=nt.getCamera()),I.isScene===!0&&I.onBeforeRender(Z,I,Q,Ee),U=He.get(I,w.length),U.init(Q),U.state.textureUnits=be.getTextureUnits(),w.push(U),$t.multiplyMatrices(Q.projectionMatrix,Q.matrixWorldInverse),kt.setFromProjectionMatrix($t,kr,Q.reversedDepth),Tt=this.localClippingEnabled,mt=We.init(this.clippingPlanes,Tt),z=Ge.get(I,W.length),z.init(),W.push(z),nt.enabled===!0&&nt.isPresenting===!0){const $e=Z.xr.getDepthSensingMesh();$e!==null&&Ea($e,Q,-1/0,Z.sortObjects)}Ea(I,Q,0,Z.sortObjects),z.finish(),Z.sortObjects===!0&&z.sort(Ve,Ke,Q.reversedDepth),Nt=nt.enabled===!1||nt.isPresenting===!1||nt.hasDepthSensing()===!1,Nt&&ht.addToRenderList(z,I),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),mt===!0&&We.beginShadows();const oe=U.state.shadowsArray;if(je.render(oe,I,Q),mt===!0&&We.endShadows(),(le&&F.hasRenderPass())===!1){const $e=z.opaque,Ze=z.transmissive;if(U.setupLights(),Q.isArrayCamera){const et=Q.cameras;if(Ze.length>0)for(let at=0,ut=et.length;at<ut;at++){const ct=et[at];cs($e,Ze,I,ct)}Nt&&ht.render(I);for(let at=0,ut=et.length;at<ut;at++){const ct=et[at];xr(z,I,ct,ct.viewport)}}else Ze.length>0&&cs($e,Ze,I,Q),Nt&&ht.render(I),xr(z,I,Q)}Ee!==null&&j===0&&(be.updateMultisampleRenderTarget(Ee),be.updateRenderTargetMipmap(Ee)),le&&F.end(Z),I.isScene===!0&&I.onAfterRender(Z,I,Q),Fe.resetDefaultState(),Ce=-1,ce=null,w.pop(),w.length>0?(U=w[w.length-1],be.setTextureUnits(U.state.textureUnits),mt===!0&&We.setGlobalState(Z.clippingPlanes,U.state.camera)):U=null,W.pop(),W.length>0?z=W[W.length-1]:z=null,ne!==null&&ne.renderEnd()};function Ea(I,Q,fe,le){if(I.visible===!1)return;if(I.layers.test(Q.layers)){if(I.isGroup)fe=I.renderOrder;else if(I.isLOD)I.autoUpdate===!0&&I.update(Q);else if(I.isLightProbeGrid)U.pushLightProbeGrid(I);else if(I.isLight)U.pushLight(I),I.castShadow&&U.pushShadow(I);else if(I.isSprite){if(!I.frustumCulled||kt.intersectsSprite(I)){le&&wt.setFromMatrixPosition(I.matrixWorld).applyMatrix4($t);const $e=ye.update(I),Ze=I.material;Ze.visible&&z.push(I,$e,Ze,fe,wt.z,null)}}else if((I.isMesh||I.isLine||I.isPoints)&&(!I.frustumCulled||kt.intersectsObject(I))){const $e=ye.update(I),Ze=I.material;if(le&&(I.boundingSphere!==void 0?(I.boundingSphere===null&&I.computeBoundingSphere(),wt.copy(I.boundingSphere.center)):($e.boundingSphere===null&&$e.computeBoundingSphere(),wt.copy($e.boundingSphere.center)),wt.applyMatrix4(I.matrixWorld).applyMatrix4($t)),Array.isArray(Ze)){const et=$e.groups;for(let at=0,ut=et.length;at<ut;at++){const ct=et[at],ot=Ze[ct.materialIndex];ot&&ot.visible&&z.push(I,$e,ot,fe,wt.z,ct)}}else Ze.visible&&z.push(I,$e,Ze,fe,wt.z,null)}}const Xe=I.children;for(let $e=0,Ze=Xe.length;$e<Ze;$e++)Ea(Xe[$e],Q,fe,le)}function xr(I,Q,fe,le){const{opaque:oe,transmissive:Xe,transparent:$e}=I;U.setupLightsView(fe),mt===!0&&We.setGlobalState(Z.clippingPlanes,fe),le&&R.viewport(K.copy(le)),oe.length>0&&Ut(oe,Q,fe),Xe.length>0&&Ut(Xe,Q,fe),$e.length>0&&Ut($e,Q,fe),R.buffers.depth.setTest(!0),R.buffers.depth.setMask(!0),R.buffers.color.setMask(!0),R.setPolygonOffset(!1)}function cs(I,Q,fe,le){if((fe.isScene===!0?fe.overrideMaterial:null)!==null)return;if(U.state.transmissionRenderTarget[le.id]===void 0){const ot=it.has("EXT_color_buffer_half_float")||it.has("EXT_color_buffer_float");U.state.transmissionRenderTarget[le.id]=new Hr(1,1,{generateMipmaps:!0,type:ot?ya:ki,minFilter:$s,samples:Math.max(4,O.samples),stencilBuffer:c,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:Gt.workingColorSpace})}const Xe=U.state.transmissionRenderTarget[le.id],$e=le.viewport||K;Xe.setSize($e.z*Z.transmissionResolutionScale,$e.w*Z.transmissionResolutionScale);const Ze=Z.getRenderTarget(),et=Z.getActiveCubeFace(),at=Z.getActiveMipmapLevel();Z.setRenderTarget(Xe),Z.getClearColor(tt),De=Z.getClearAlpha(),De<1&&Z.setClearColor(16777215,.5),Z.clear(),Nt&&ht.render(fe);const ut=Z.toneMapping;Z.toneMapping=zr;const ct=le.viewport;if(le.viewport!==void 0&&(le.viewport=void 0),U.setupLightsView(le),mt===!0&&We.setGlobalState(Z.clippingPlanes,le),Ut(I,fe,le),be.updateMultisampleRenderTarget(Xe),be.updateRenderTargetMipmap(Xe),it.has("WEBGL_multisampled_render_to_texture")===!1){let ot=!1;for(let Yt=0,en=Q.length;Yt<en;Yt++){const gt=Q[Yt],{object:Ct,geometry:bn,material:qe,group:gn}=gt;if(qe.side===ga&&Ct.layers.test(le.layers)){const Et=qe.side;qe.side=Ii,qe.needsUpdate=!0,Qt(Ct,fe,le,bn,qe,gn),qe.side=Et,qe.needsUpdate=!0,ot=!0}}ot===!0&&(be.updateMultisampleRenderTarget(Xe),be.updateRenderTargetMipmap(Xe))}Z.setRenderTarget(Ze,et,at),Z.setClearColor(tt,De),ct!==void 0&&(le.viewport=ct),Z.toneMapping=ut}function Ut(I,Q,fe){const le=Q.isScene===!0?Q.overrideMaterial:null;for(let oe=0,Xe=I.length;oe<Xe;oe++){const $e=I[oe],{object:Ze,geometry:et,group:at}=$e;let ut=$e.material;ut.allowOverride===!0&&le!==null&&(ut=le),Ze.layers.test(fe.layers)&&Qt(Ze,Q,fe,et,ut,at)}}function Qt(I,Q,fe,le,oe,Xe){I.onBeforeRender(Z,Q,fe,le,oe,Xe),I.modelViewMatrix.multiplyMatrices(fe.matrixWorldInverse,I.matrixWorld),I.normalMatrix.getNormalMatrix(I.modelViewMatrix),oe.onBeforeRender(Z,Q,fe,le,I,Xe),oe.transparent===!0&&oe.side===ga&&oe.forceSinglePass===!1?(oe.side=Ii,oe.needsUpdate=!0,Z.renderBufferDirect(fe,Q,le,oe,I,Xe),oe.side=is,oe.needsUpdate=!0,Z.renderBufferDirect(fe,Q,le,oe,I,Xe),oe.side=ga):Z.renderBufferDirect(fe,Q,le,oe,I,Xe),I.onAfterRender(Z,Q,fe,le,oe,Xe)}function zi(I,Q,fe){Q.isScene!==!0&&(Q=En);const le=ae.get(I),oe=U.state.lights,Xe=U.state.shadowsArray,$e=oe.state.version,Ze=ze.getParameters(I,oe.state,Xe,Q,fe,U.state.lightProbeGridArray),et=ze.getProgramCacheKey(Ze);let at=le.programs;le.environment=I.isMeshStandardMaterial||I.isMeshLambertMaterial||I.isMeshPhongMaterial?Q.environment:null,le.fog=Q.fog;const ut=I.isMeshStandardMaterial||I.isMeshLambertMaterial&&!I.envMap||I.isMeshPhongMaterial&&!I.envMap;le.envMap=Ie.get(I.envMap||le.environment,ut),le.envMapRotation=le.environment!==null&&I.envMap===null?Q.environmentRotation:I.envMapRotation,at===void 0&&(I.addEventListener("dispose",Jt),at=new Map,le.programs=at);let ct=at.get(et);if(ct!==void 0){if(le.currentProgram===ct&&le.lightsStateVersion===$e)return ro(I,Ze),ct}else Ze.uniforms=ze.getUniforms(I),ne!==null&&I.isNodeMaterial&&ne.build(I,fe,Ze),I.onBeforeCompile(Ze,Z),ct=ze.acquireProgram(Ze,et),at.set(et,ct),le.uniforms=Ze.uniforms;const ot=le.uniforms;return(!I.isShaderMaterial&&!I.isRawShaderMaterial||I.clipping===!0)&&(ot.clippingPlanes=We.uniform),ro(I,Ze),le.needsLights=pl(I),le.lightsStateVersion=$e,le.needsLights&&(ot.ambientLightColor.value=oe.state.ambient,ot.lightProbe.value=oe.state.probe,ot.directionalLights.value=oe.state.directional,ot.directionalLightShadows.value=oe.state.directionalShadow,ot.spotLights.value=oe.state.spot,ot.spotLightShadows.value=oe.state.spotShadow,ot.rectAreaLights.value=oe.state.rectArea,ot.ltc_1.value=oe.state.rectAreaLTC1,ot.ltc_2.value=oe.state.rectAreaLTC2,ot.pointLights.value=oe.state.point,ot.pointLightShadows.value=oe.state.pointShadow,ot.hemisphereLights.value=oe.state.hemi,ot.directionalShadowMatrix.value=oe.state.directionalShadowMatrix,ot.spotLightMatrix.value=oe.state.spotLightMatrix,ot.spotLightMap.value=oe.state.spotLightMap,ot.pointShadowMatrix.value=oe.state.pointShadowMatrix),le.lightProbeGrid=U.state.lightProbeGridArray.length>0,le.currentProgram=ct,le.uniformsList=null,ct}function Xn(I){if(I.uniformsList===null){const Q=I.currentProgram.getUniforms();I.uniformsList=Ou.seqWithValue(Q.seq,I.uniforms)}return I.uniformsList}function ro(I,Q){const fe=ae.get(I);fe.outputColorSpace=Q.outputColorSpace,fe.batching=Q.batching,fe.batchingColor=Q.batchingColor,fe.instancing=Q.instancing,fe.instancingColor=Q.instancingColor,fe.instancingMorph=Q.instancingMorph,fe.skinning=Q.skinning,fe.morphTargets=Q.morphTargets,fe.morphNormals=Q.morphNormals,fe.morphColors=Q.morphColors,fe.morphTargetsCount=Q.morphTargetsCount,fe.numClippingPlanes=Q.numClippingPlanes,fe.numIntersection=Q.numClipIntersection,fe.vertexAlphas=Q.vertexAlphas,fe.vertexTangents=Q.vertexTangents,fe.toneMapping=Q.toneMapping}function us(I,Q){if(I.length===0)return null;if(I.length===1)return I[0].texture!==null?I[0]:null;D.setFromMatrixPosition(Q.matrixWorld);for(let fe=0,le=I.length;fe<le;fe++){const oe=I[fe];if(oe.texture!==null&&oe.boundingBox.containsPoint(D))return oe}return null}function ao(I,Q,fe,le,oe){Q.isScene!==!0&&(Q=En),be.resetTextureUnits();const Xe=Q.fog,$e=le.isMeshStandardMaterial||le.isMeshLambertMaterial||le.isMeshPhongMaterial?Q.environment:null,Ze=Ee===null?Z.outputColorSpace:Ee.isXRRenderTarget===!0?Ee.texture.colorSpace:Gt.workingColorSpace,et=le.isMeshStandardMaterial||le.isMeshLambertMaterial&&!le.envMap||le.isMeshPhongMaterial&&!le.envMap,at=Ie.get(le.envMap||$e,et),ut=le.vertexColors===!0&&!!fe.attributes.color&&fe.attributes.color.itemSize===4,ct=!!fe.attributes.tangent&&(!!le.normalMap||le.anisotropy>0),ot=!!fe.morphAttributes.position,Yt=!!fe.morphAttributes.normal,en=!!fe.morphAttributes.color;let gt=zr;le.toneMapped&&(Ee===null||Ee.isXRRenderTarget===!0)&&(gt=Z.toneMapping);const Ct=fe.morphAttributes.position||fe.morphAttributes.normal||fe.morphAttributes.color,bn=Ct!==void 0?Ct.length:0,qe=ae.get(le),gn=U.state.lights;if(mt===!0&&(Tt===!0||I!==ce)){const qt=I===ce&&le.id===Ce;We.setState(le,I,qt)}let Et=!1;le.version===qe.__version?(qe.needsLights&&qe.lightsStateVersion!==gn.state.version||qe.outputColorSpace!==Ze||oe.isBatchedMesh&&qe.batching===!1||!oe.isBatchedMesh&&qe.batching===!0||oe.isBatchedMesh&&qe.batchingColor===!0&&oe.colorTexture===null||oe.isBatchedMesh&&qe.batchingColor===!1&&oe.colorTexture!==null||oe.isInstancedMesh&&qe.instancing===!1||!oe.isInstancedMesh&&qe.instancing===!0||oe.isSkinnedMesh&&qe.skinning===!1||!oe.isSkinnedMesh&&qe.skinning===!0||oe.isInstancedMesh&&qe.instancingColor===!0&&oe.instanceColor===null||oe.isInstancedMesh&&qe.instancingColor===!1&&oe.instanceColor!==null||oe.isInstancedMesh&&qe.instancingMorph===!0&&oe.morphTexture===null||oe.isInstancedMesh&&qe.instancingMorph===!1&&oe.morphTexture!==null||qe.envMap!==at||le.fog===!0&&qe.fog!==Xe||qe.numClippingPlanes!==void 0&&(qe.numClippingPlanes!==We.numPlanes||qe.numIntersection!==We.numIntersection)||qe.vertexAlphas!==ut||qe.vertexTangents!==ct||qe.morphTargets!==ot||qe.morphNormals!==Yt||qe.morphColors!==en||qe.toneMapping!==gt||qe.morphTargetsCount!==bn||!!qe.lightProbeGrid!=U.state.lightProbeGridArray.length>0)&&(Et=!0):(Et=!0,qe.__version=le.version);let Yn=qe.currentProgram;Et===!0&&(Yn=zi(le,Q,oe),ne&&le.isNodeMaterial&&ne.onUpdateProgram(le,Yn,qe));let wn=!1,Ni=!1,vr=!1;const Pt=Yn.getUniforms(),rn=qe.uniforms;if(R.useProgram(Yn.program)&&(wn=!0,Ni=!0,vr=!0),le.id!==Ce&&(Ce=le.id,Ni=!0),qe.needsLights){const qt=us(U.state.lightProbeGridArray,oe);qe.lightProbeGrid!==qt&&(qe.lightProbeGrid=qt,Ni=!0)}if(wn||ce!==I){R.buffers.depth.getReversed()&&I.reversedDepth!==!0&&(I._reversedDepth=!0,I.updateProjectionMatrix()),Pt.setValue($,"projectionMatrix",I.projectionMatrix),Pt.setValue($,"viewMatrix",I.matrixWorldInverse);const Gi=Pt.map.cameraPosition;Gi!==void 0&&Gi.setValue($,Kt.setFromMatrixPosition(I.matrixWorld)),O.logarithmicDepthBuffer&&Pt.setValue($,"logDepthBufFC",2/(Math.log(I.far+1)/Math.LN2)),(le.isMeshPhongMaterial||le.isMeshToonMaterial||le.isMeshLambertMaterial||le.isMeshBasicMaterial||le.isMeshStandardMaterial||le.isShaderMaterial)&&Pt.setValue($,"isOrthographic",I.isOrthographicCamera===!0),ce!==I&&(ce=I,Ni=!0,vr=!0)}if(qe.needsLights&&(gn.state.directionalShadowMap.length>0&&Pt.setValue($,"directionalShadowMap",gn.state.directionalShadowMap,be),gn.state.spotShadowMap.length>0&&Pt.setValue($,"spotShadowMap",gn.state.spotShadowMap,be),gn.state.pointShadowMap.length>0&&Pt.setValue($,"pointShadowMap",gn.state.pointShadowMap,be)),oe.isSkinnedMesh){Pt.setOptional($,oe,"bindMatrix"),Pt.setOptional($,oe,"bindMatrixInverse");const qt=oe.skeleton;qt&&(qt.boneTexture===null&&qt.computeBoneTexture(),Pt.setValue($,"boneTexture",qt.boneTexture,be))}oe.isBatchedMesh&&(Pt.setOptional($,oe,"batchingTexture"),Pt.setValue($,"batchingTexture",oe._matricesTexture,be),Pt.setOptional($,oe,"batchingIdTexture"),Pt.setValue($,"batchingIdTexture",oe._indirectTexture,be),Pt.setOptional($,oe,"batchingColorTexture"),oe._colorsTexture!==null&&Pt.setValue($,"batchingColorTexture",oe._colorsTexture,be));const Hi=fe.morphAttributes;if((Hi.position!==void 0||Hi.normal!==void 0||Hi.color!==void 0)&&J.update(oe,fe,Yn),(Ni||qe.receiveShadow!==oe.receiveShadow)&&(qe.receiveShadow=oe.receiveShadow,Pt.setValue($,"receiveShadow",oe.receiveShadow)),(le.isMeshStandardMaterial||le.isMeshLambertMaterial||le.isMeshPhongMaterial)&&le.envMap===null&&Q.environment!==null&&(rn.envMapIntensity.value=Q.environmentIntensity),rn.dfgLUT!==void 0&&(rn.dfgLUT.value=qy()),Ni){if(Pt.setValue($,"toneMappingExposure",Z.toneMappingExposure),qe.needsLights&&so(rn,vr),Xe&&le.fog===!0&&rt.refreshFogUniforms(rn,Xe),rt.refreshMaterialUniforms(rn,le,we,he,U.state.transmissionRenderTarget[I.id]),qe.needsLights&&qe.lightProbeGrid){const qt=qe.lightProbeGrid;rn.probesSH.value=qt.texture,rn.probesMin.value.copy(qt.boundingBox.min),rn.probesMax.value.copy(qt.boundingBox.max),rn.probesResolution.value.copy(qt.resolution)}Ou.upload($,Xn(qe),rn,be)}if(le.isShaderMaterial&&le.uniformsNeedUpdate===!0&&(Ou.upload($,Xn(qe),rn,be),le.uniformsNeedUpdate=!1),le.isSpriteMaterial&&Pt.setValue($,"center",oe.center),Pt.setValue($,"modelViewMatrix",oe.modelViewMatrix),Pt.setValue($,"normalMatrix",oe.normalMatrix),Pt.setValue($,"modelMatrix",oe.matrixWorld),le.uniformsGroups!==void 0){const qt=le.uniformsGroups;for(let Gi=0,_n=qt.length;Gi<_n;Gi++){const Zn=qt[Gi];Re.update(Zn,Yn),Re.bind(Zn,Yn)}}return Yn}function so(I,Q){I.ambientLightColor.needsUpdate=Q,I.lightProbe.needsUpdate=Q,I.directionalLights.needsUpdate=Q,I.directionalLightShadows.needsUpdate=Q,I.pointLights.needsUpdate=Q,I.pointLightShadows.needsUpdate=Q,I.spotLights.needsUpdate=Q,I.spotLightShadows.needsUpdate=Q,I.rectAreaLights.needsUpdate=Q,I.hemisphereLights.needsUpdate=Q}function pl(I){return I.isMeshLambertMaterial||I.isMeshToonMaterial||I.isMeshPhongMaterial||I.isMeshStandardMaterial||I.isShadowMaterial||I.isShaderMaterial&&I.lights===!0}this.getActiveCubeFace=function(){return H},this.getActiveMipmapLevel=function(){return j},this.getRenderTarget=function(){return Ee},this.setRenderTargetTextures=function(I,Q,fe){const le=ae.get(I);le.__autoAllocateDepthBuffer=I.resolveDepthBuffer===!1,le.__autoAllocateDepthBuffer===!1&&(le.__useRenderToTexture=!1),ae.get(I.texture).__webglTexture=Q,ae.get(I.depthTexture).__webglTexture=le.__autoAllocateDepthBuffer?void 0:fe,le.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(I,Q){const fe=ae.get(I);fe.__webglFramebuffer=Q,fe.__useDefaultFramebuffer=Q===void 0},this.setRenderTarget=function(I,Q=0,fe=0){Ee=I,H=Q,j=fe;let le=null,oe=!1,Xe=!1;if(I){const Ze=ae.get(I);if(Ze.__useDefaultFramebuffer!==void 0){R.bindFramebuffer($.FRAMEBUFFER,Ze.__webglFramebuffer),K.copy(I.viewport),ue.copy(I.scissor),Pe=I.scissorTest,R.viewport(K),R.scissor(ue),R.setScissorTest(Pe),Ce=-1;return}else if(Ze.__webglFramebuffer===void 0)be.setupRenderTarget(I);else if(Ze.__hasExternalTextures)be.rebindTextures(I,ae.get(I.texture).__webglTexture,ae.get(I.depthTexture).__webglTexture);else if(I.depthBuffer){const ut=I.depthTexture;if(Ze.__boundDepthTexture!==ut){if(ut!==null&&ae.has(ut)&&(I.width!==ut.image.width||I.height!==ut.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");be.setupDepthRenderbuffer(I)}}const et=I.texture;(et.isData3DTexture||et.isDataArrayTexture||et.isCompressedArrayTexture)&&(Xe=!0);const at=ae.get(I).__webglFramebuffer;I.isWebGLCubeRenderTarget?(Array.isArray(at[Q])?le=at[Q][fe]:le=at[Q],oe=!0):I.samples>0&&be.useMultisampledRTT(I)===!1?le=ae.get(I).__webglMultisampledFramebuffer:Array.isArray(at)?le=at[fe]:le=at,K.copy(I.viewport),ue.copy(I.scissor),Pe=I.scissorTest}else K.copy(Je).multiplyScalar(we).floor(),ue.copy(Lt).multiplyScalar(we).floor(),Pe=Le;if(fe!==0&&(le=pe),R.bindFramebuffer($.FRAMEBUFFER,le)&&R.drawBuffers(I,le),R.viewport(K),R.scissor(ue),R.setScissorTest(Pe),oe){const Ze=ae.get(I.texture);$.framebufferTexture2D($.FRAMEBUFFER,$.COLOR_ATTACHMENT0,$.TEXTURE_CUBE_MAP_POSITIVE_X+Q,Ze.__webglTexture,fe)}else if(Xe){const Ze=Q;for(let et=0;et<I.textures.length;et++){const at=ae.get(I.textures[et]);$.framebufferTextureLayer($.FRAMEBUFFER,$.COLOR_ATTACHMENT0+et,at.__webglTexture,fe,Ze)}}else if(I!==null&&fe!==0){const Ze=ae.get(I.texture);$.framebufferTexture2D($.FRAMEBUFFER,$.COLOR_ATTACHMENT0,$.TEXTURE_2D,Ze.__webglTexture,fe)}Ce=-1},this.readRenderTargetPixels=function(I,Q,fe,le,oe,Xe,$e,Ze=0){if(!(I&&I.isWebGLRenderTarget)){Xt("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let et=ae.get(I).__webglFramebuffer;if(I.isWebGLCubeRenderTarget&&$e!==void 0&&(et=et[$e]),et){R.bindFramebuffer($.FRAMEBUFFER,et);try{const at=I.textures[Ze],ut=at.format,ct=at.type;if(I.textures.length>1&&$.readBuffer($.COLOR_ATTACHMENT0+Ze),!O.textureFormatReadable(ut)){Xt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!O.textureTypeReadable(ct)){Xt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}Q>=0&&Q<=I.width-le&&fe>=0&&fe<=I.height-oe&&$.readPixels(Q,fe,le,oe,Oe.convert(ut),Oe.convert(ct),Xe)}finally{const at=Ee!==null?ae.get(Ee).__webglFramebuffer:null;R.bindFramebuffer($.FRAMEBUFFER,at)}}},this.readRenderTargetPixelsAsync=async function(I,Q,fe,le,oe,Xe,$e,Ze=0){if(!(I&&I.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let et=ae.get(I).__webglFramebuffer;if(I.isWebGLCubeRenderTarget&&$e!==void 0&&(et=et[$e]),et)if(Q>=0&&Q<=I.width-le&&fe>=0&&fe<=I.height-oe){R.bindFramebuffer($.FRAMEBUFFER,et);const at=I.textures[Ze],ut=at.format,ct=at.type;if(I.textures.length>1&&$.readBuffer($.COLOR_ATTACHMENT0+Ze),!O.textureFormatReadable(ut))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!O.textureTypeReadable(ct))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const ot=$.createBuffer();$.bindBuffer($.PIXEL_PACK_BUFFER,ot),$.bufferData($.PIXEL_PACK_BUFFER,Xe.byteLength,$.STREAM_READ),$.readPixels(Q,fe,le,oe,Oe.convert(ut),Oe.convert(ct),0);const Yt=Ee!==null?ae.get(Ee).__webglFramebuffer:null;R.bindFramebuffer($.FRAMEBUFFER,Yt);const en=$.fenceSync($.SYNC_GPU_COMMANDS_COMPLETE,0);return $.flush(),await p_($,en,4),$.bindBuffer($.PIXEL_PACK_BUFFER,ot),$.getBufferSubData($.PIXEL_PACK_BUFFER,0,Xe),$.deleteBuffer(ot),$.deleteSync(en),Xe}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(I,Q=null,fe=0){const le=Math.pow(2,-fe),oe=Math.floor(I.image.width*le),Xe=Math.floor(I.image.height*le),$e=Q!==null?Q.x:0,Ze=Q!==null?Q.y:0;be.setTexture2D(I,0),$.copyTexSubImage2D($.TEXTURE_2D,fe,0,0,$e,Ze,oe,Xe),R.unbindTexture()},this.copyTextureToTexture=function(I,Q,fe=null,le=null,oe=0,Xe=0){let $e,Ze,et,at,ut,ct,ot,Yt,en;const gt=I.isCompressedTexture?I.mipmaps[Xe]:I.image;if(fe!==null)$e=fe.max.x-fe.min.x,Ze=fe.max.y-fe.min.y,et=fe.isBox3?fe.max.z-fe.min.z:1,at=fe.min.x,ut=fe.min.y,ct=fe.isBox3?fe.min.z:0;else{const rn=Math.pow(2,-oe);$e=Math.floor(gt.width*rn),Ze=Math.floor(gt.height*rn),I.isDataArrayTexture?et=gt.depth:I.isData3DTexture?et=Math.floor(gt.depth*rn):et=1,at=0,ut=0,ct=0}le!==null?(ot=le.x,Yt=le.y,en=le.z):(ot=0,Yt=0,en=0);const Ct=Oe.convert(Q.format),bn=Oe.convert(Q.type);let qe;Q.isData3DTexture?(be.setTexture3D(Q,0),qe=$.TEXTURE_3D):Q.isDataArrayTexture||Q.isCompressedArrayTexture?(be.setTexture2DArray(Q,0),qe=$.TEXTURE_2D_ARRAY):(be.setTexture2D(Q,0),qe=$.TEXTURE_2D),R.activeTexture($.TEXTURE0),R.pixelStorei($.UNPACK_FLIP_Y_WEBGL,Q.flipY),R.pixelStorei($.UNPACK_PREMULTIPLY_ALPHA_WEBGL,Q.premultiplyAlpha),R.pixelStorei($.UNPACK_ALIGNMENT,Q.unpackAlignment);const gn=R.getParameter($.UNPACK_ROW_LENGTH),Et=R.getParameter($.UNPACK_IMAGE_HEIGHT),Yn=R.getParameter($.UNPACK_SKIP_PIXELS),wn=R.getParameter($.UNPACK_SKIP_ROWS),Ni=R.getParameter($.UNPACK_SKIP_IMAGES);R.pixelStorei($.UNPACK_ROW_LENGTH,gt.width),R.pixelStorei($.UNPACK_IMAGE_HEIGHT,gt.height),R.pixelStorei($.UNPACK_SKIP_PIXELS,at),R.pixelStorei($.UNPACK_SKIP_ROWS,ut),R.pixelStorei($.UNPACK_SKIP_IMAGES,ct);const vr=I.isDataArrayTexture||I.isData3DTexture,Pt=Q.isDataArrayTexture||Q.isData3DTexture;if(I.isDepthTexture){const rn=ae.get(I),Hi=ae.get(Q),qt=ae.get(rn.__renderTarget),Gi=ae.get(Hi.__renderTarget);R.bindFramebuffer($.READ_FRAMEBUFFER,qt.__webglFramebuffer),R.bindFramebuffer($.DRAW_FRAMEBUFFER,Gi.__webglFramebuffer);for(let _n=0;_n<et;_n++)vr&&($.framebufferTextureLayer($.READ_FRAMEBUFFER,$.COLOR_ATTACHMENT0,ae.get(I).__webglTexture,oe,ct+_n),$.framebufferTextureLayer($.DRAW_FRAMEBUFFER,$.COLOR_ATTACHMENT0,ae.get(Q).__webglTexture,Xe,en+_n)),$.blitFramebuffer(at,ut,$e,Ze,ot,Yt,$e,Ze,$.DEPTH_BUFFER_BIT,$.NEAREST);R.bindFramebuffer($.READ_FRAMEBUFFER,null),R.bindFramebuffer($.DRAW_FRAMEBUFFER,null)}else if(oe!==0||I.isRenderTargetTexture||ae.has(I)){const rn=ae.get(I),Hi=ae.get(Q);R.bindFramebuffer($.READ_FRAMEBUFFER,_e),R.bindFramebuffer($.DRAW_FRAMEBUFFER,re);for(let qt=0;qt<et;qt++)vr?$.framebufferTextureLayer($.READ_FRAMEBUFFER,$.COLOR_ATTACHMENT0,rn.__webglTexture,oe,ct+qt):$.framebufferTexture2D($.READ_FRAMEBUFFER,$.COLOR_ATTACHMENT0,$.TEXTURE_2D,rn.__webglTexture,oe),Pt?$.framebufferTextureLayer($.DRAW_FRAMEBUFFER,$.COLOR_ATTACHMENT0,Hi.__webglTexture,Xe,en+qt):$.framebufferTexture2D($.DRAW_FRAMEBUFFER,$.COLOR_ATTACHMENT0,$.TEXTURE_2D,Hi.__webglTexture,Xe),oe!==0?$.blitFramebuffer(at,ut,$e,Ze,ot,Yt,$e,Ze,$.COLOR_BUFFER_BIT,$.NEAREST):Pt?$.copyTexSubImage3D(qe,Xe,ot,Yt,en+qt,at,ut,$e,Ze):$.copyTexSubImage2D(qe,Xe,ot,Yt,at,ut,$e,Ze);R.bindFramebuffer($.READ_FRAMEBUFFER,null),R.bindFramebuffer($.DRAW_FRAMEBUFFER,null)}else Pt?I.isDataTexture||I.isData3DTexture?$.texSubImage3D(qe,Xe,ot,Yt,en,$e,Ze,et,Ct,bn,gt.data):Q.isCompressedArrayTexture?$.compressedTexSubImage3D(qe,Xe,ot,Yt,en,$e,Ze,et,Ct,gt.data):$.texSubImage3D(qe,Xe,ot,Yt,en,$e,Ze,et,Ct,bn,gt):I.isDataTexture?$.texSubImage2D($.TEXTURE_2D,Xe,ot,Yt,$e,Ze,Ct,bn,gt.data):I.isCompressedTexture?$.compressedTexSubImage2D($.TEXTURE_2D,Xe,ot,Yt,gt.width,gt.height,Ct,gt.data):$.texSubImage2D($.TEXTURE_2D,Xe,ot,Yt,$e,Ze,Ct,bn,gt);R.pixelStorei($.UNPACK_ROW_LENGTH,gn),R.pixelStorei($.UNPACK_IMAGE_HEIGHT,Et),R.pixelStorei($.UNPACK_SKIP_PIXELS,Yn),R.pixelStorei($.UNPACK_SKIP_ROWS,wn),R.pixelStorei($.UNPACK_SKIP_IMAGES,Ni),Xe===0&&Q.generateMipmaps&&$.generateMipmap(qe),R.unbindTexture()},this.initRenderTarget=function(I){ae.get(I).__webglFramebuffer===void 0&&be.setupRenderTarget(I)},this.initTexture=function(I){I.isCubeTexture?be.setTextureCube(I,0):I.isData3DTexture?be.setTexture3D(I,0):I.isDataArrayTexture||I.isCompressedArrayTexture?be.setTexture2DArray(I,0):be.setTexture2D(I,0),R.unbindTexture()},this.resetState=function(){H=0,j=0,Ee=null,R.reset(),Fe.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return kr}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=Gt._getDrawingBufferColorSpace(e),t.unpackColorSpace=Gt._getUnpackColorSpace()}}const lm={type:"change"},Md={type:"start"},gg={type:"end"},wu=new tg,cm=new ja,$y=Math.cos(70*__.DEG2RAD),zn=new se,Di=2*Math.PI,on={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},rf=1e-6;class eS extends nx{constructor(e,t=null){super(e,t),this.state=on.NONE,this.target=new se,this.cursor=new se,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:il.ROTATE,MIDDLE:il.DOLLY,RIGHT:il.PAN},this.touches={ONE:nl.ROTATE,TWO:nl.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._cursorStyle="auto",this._domElementKeyEvents=null,this._lastPosition=new se,this._lastQuaternion=new rs,this._lastTargetPosition=new se,this._quat=new rs().setFromUnitVectors(e.up,new se(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new Op,this._sphericalDelta=new Op,this._scale=1,this._panOffset=new se,this._rotateStart=new pt,this._rotateEnd=new pt,this._rotateDelta=new pt,this._panStart=new pt,this._panEnd=new pt,this._panDelta=new pt,this._dollyStart=new pt,this._dollyEnd=new pt,this._dollyDelta=new pt,this._dollyDirection=new se,this._mouse=new pt,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=nS.bind(this),this._onPointerDown=tS.bind(this),this._onPointerUp=iS.bind(this),this._onContextMenu=uS.bind(this),this._onMouseWheel=sS.bind(this),this._onKeyDown=oS.bind(this),this._onTouchStart=lS.bind(this),this._onTouchMove=cS.bind(this),this._onMouseDown=rS.bind(this),this._onMouseMove=aS.bind(this),this._interceptControlDown=hS.bind(this),this._interceptControlUp=fS.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}set cursorStyle(e){this._cursorStyle=e,e==="grab"?this.domElement.style.cursor="grab":this.domElement.style.cursor="auto"}get cursorStyle(){return this._cursorStyle}connect(e){super.connect(e),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.getRootNode().removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.style.touchAction=""}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(e){e.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=e}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(lm),this.update(),this.state=on.NONE}pan(e,t){this._pan(e,t),this.update()}dollyIn(e){this._dollyIn(e),this.update()}dollyOut(e){this._dollyOut(e),this.update()}rotateLeft(e){this._rotateLeft(e),this.update()}rotateUp(e){this._rotateUp(e),this.update()}update(e=null){const t=this.object.position;zn.copy(t).sub(this.target),zn.applyQuaternion(this._quat),this._spherical.setFromVector3(zn),this.autoRotate&&this.state===on.NONE&&this._rotateLeft(this._getAutoRotationAngle(e)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let i=this.minAzimuthAngle,r=this.maxAzimuthAngle;isFinite(i)&&isFinite(r)&&(i<-Math.PI?i+=Di:i>Math.PI&&(i-=Di),r<-Math.PI?r+=Di:r>Math.PI&&(r-=Di),i<=r?this._spherical.theta=Math.max(i,Math.min(r,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(i+r)/2?Math.max(i,this._spherical.theta):Math.min(r,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let c=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{const u=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),c=u!=this._spherical.radius}if(zn.setFromSpherical(this._spherical),zn.applyQuaternion(this._quatInverse),t.copy(this.target).add(zn),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let u=null;if(this.object.isPerspectiveCamera){const d=zn.length();u=this._clampDistance(d*this._scale);const m=d-u;this.object.position.addScaledVector(this._dollyDirection,m),this.object.updateMatrixWorld(),c=!!m}else if(this.object.isOrthographicCamera){const d=new se(this._mouse.x,this._mouse.y,0);d.unproject(this.object);const m=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),c=m!==this.object.zoom;const p=new se(this._mouse.x,this._mouse.y,0);p.unproject(this.object),this.object.position.sub(p).add(d),this.object.updateMatrixWorld(),u=zn.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;u!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(u).add(this.object.position):(wu.origin.copy(this.object.position),wu.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(wu.direction))<$y?this.object.lookAt(this.target):(cm.setFromNormalAndCoplanarPoint(this.object.up,this.target),wu.intersectPlane(cm,this.target))))}else if(this.object.isOrthographicCamera){const u=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),u!==this.object.zoom&&(this.object.updateProjectionMatrix(),c=!0)}return this._scale=1,this._performCursorZoom=!1,c||this._lastPosition.distanceToSquared(this.object.position)>rf||8*(1-this._lastQuaternion.dot(this.object.quaternion))>rf||this._lastTargetPosition.distanceToSquared(this.target)>rf?(this.dispatchEvent(lm),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(e){return e!==null?Di/60*this.autoRotateSpeed*e:Di/60/60*this.autoRotateSpeed}_getZoomScale(e){const t=Math.abs(e*.01);return Math.pow(.95,this.zoomSpeed*t)}_rotateLeft(e){this._sphericalDelta.theta-=e}_rotateUp(e){this._sphericalDelta.phi-=e}_panLeft(e,t){zn.setFromMatrixColumn(t,0),zn.multiplyScalar(-e),this._panOffset.add(zn)}_panUp(e,t){this.screenSpacePanning===!0?zn.setFromMatrixColumn(t,1):(zn.setFromMatrixColumn(t,0),zn.crossVectors(this.object.up,zn)),zn.multiplyScalar(e),this._panOffset.add(zn)}_pan(e,t){const i=this.domElement;if(this.object.isPerspectiveCamera){const r=this.object.position;zn.copy(r).sub(this.target);let c=zn.length();c*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*e*c/i.clientHeight,this.object.matrix),this._panUp(2*t*c/i.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(e*(this.object.right-this.object.left)/this.object.zoom/i.clientWidth,this.object.matrix),this._panUp(t*(this.object.top-this.object.bottom)/this.object.zoom/i.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(e,t){if(!this.zoomToCursor)return;this._performCursorZoom=!0;const i=this.domElement.getBoundingClientRect(),r=e-i.left,c=t-i.top,u=i.width,d=i.height;this._mouse.x=r/u*2-1,this._mouse.y=-(c/d)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(e){return Math.max(this.minDistance,Math.min(this.maxDistance,e))}_handleMouseDownRotate(e){this._rotateStart.set(e.clientX,e.clientY)}_handleMouseDownDolly(e){this._updateZoomParameters(e.clientX,e.clientX),this._dollyStart.set(e.clientX,e.clientY)}_handleMouseDownPan(e){this._panStart.set(e.clientX,e.clientY)}_handleMouseMoveRotate(e){this._rotateEnd.set(e.clientX,e.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const t=this.domElement;this._rotateLeft(Di*this._rotateDelta.x/t.clientHeight),this._rotateUp(Di*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(e){this._dollyEnd.set(e.clientX,e.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(e){this._panEnd.set(e.clientX,e.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(e){this._updateZoomParameters(e.clientX,e.clientY),e.deltaY<0?this._dollyIn(this._getZoomScale(e.deltaY)):e.deltaY>0&&this._dollyOut(this._getZoomScale(e.deltaY)),this.update()}_handleKeyDown(e){let t=!1;switch(e.code){case this.keys.UP:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(Di*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),t=!0;break;case this.keys.BOTTOM:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(-Di*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),t=!0;break;case this.keys.LEFT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(Di*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),t=!0;break;case this.keys.RIGHT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(-Di*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),t=!0;break}t&&(e.preventDefault(),this.update())}_handleTouchStartRotate(e){if(this._pointers.length===1)this._rotateStart.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),i=.5*(e.pageX+t.x),r=.5*(e.pageY+t.y);this._rotateStart.set(i,r)}}_handleTouchStartPan(e){if(this._pointers.length===1)this._panStart.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),i=.5*(e.pageX+t.x),r=.5*(e.pageY+t.y);this._panStart.set(i,r)}}_handleTouchStartDolly(e){const t=this._getSecondPointerPosition(e),i=e.pageX-t.x,r=e.pageY-t.y,c=Math.sqrt(i*i+r*r);this._dollyStart.set(0,c)}_handleTouchStartDollyPan(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enablePan&&this._handleTouchStartPan(e)}_handleTouchStartDollyRotate(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enableRotate&&this._handleTouchStartRotate(e)}_handleTouchMoveRotate(e){if(this._pointers.length==1)this._rotateEnd.set(e.pageX,e.pageY);else{const i=this._getSecondPointerPosition(e),r=.5*(e.pageX+i.x),c=.5*(e.pageY+i.y);this._rotateEnd.set(r,c)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const t=this.domElement;this._rotateLeft(Di*this._rotateDelta.x/t.clientHeight),this._rotateUp(Di*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(e){if(this._pointers.length===1)this._panEnd.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),i=.5*(e.pageX+t.x),r=.5*(e.pageY+t.y);this._panEnd.set(i,r)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(e){const t=this._getSecondPointerPosition(e),i=e.pageX-t.x,r=e.pageY-t.y,c=Math.sqrt(i*i+r*r);this._dollyEnd.set(0,c),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);const u=(e.pageX+t.x)*.5,d=(e.pageY+t.y)*.5;this._updateZoomParameters(u,d)}_handleTouchMoveDollyPan(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enablePan&&this._handleTouchMovePan(e)}_handleTouchMoveDollyRotate(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enableRotate&&this._handleTouchMoveRotate(e)}_addPointer(e){this._pointers.push(e.pointerId)}_removePointer(e){delete this._pointerPositions[e.pointerId];for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId){this._pointers.splice(t,1);return}}_isTrackingPointer(e){for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId)return!0;return!1}_trackPointer(e){let t=this._pointerPositions[e.pointerId];t===void 0&&(t=new pt,this._pointerPositions[e.pointerId]=t),t.set(e.pageX,e.pageY)}_getSecondPointerPosition(e){const t=e.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[t]}_customWheelEvent(e){const t=e.deltaMode,i={clientX:e.clientX,clientY:e.clientY,deltaY:e.deltaY};switch(t){case 1:i.deltaY*=16;break;case 2:i.deltaY*=100;break}return e.ctrlKey&&!this._controlActive&&(i.deltaY*=10),i}}function tS(n){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(n.pointerId),this.domElement.ownerDocument.addEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(n)&&(this._addPointer(n),n.pointerType==="touch"?this._onTouchStart(n):this._onMouseDown(n),this._cursorStyle==="grab"&&(this.domElement.style.cursor="grabbing")))}function nS(n){this.enabled!==!1&&(n.pointerType==="touch"?this._onTouchMove(n):this._onMouseMove(n))}function iS(n){switch(this._removePointer(n),this._pointers.length){case 0:this.domElement.releasePointerCapture(n.pointerId),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(gg),this.state=on.NONE,this._cursorStyle==="grab"&&(this.domElement.style.cursor="grab");break;case 1:const e=this._pointers[0],t=this._pointerPositions[e];this._onTouchStart({pointerId:e,pageX:t.x,pageY:t.y});break}}function rS(n){let e;switch(n.button){case 0:e=this.mouseButtons.LEFT;break;case 1:e=this.mouseButtons.MIDDLE;break;case 2:e=this.mouseButtons.RIGHT;break;default:e=-1}switch(e){case il.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(n),this.state=on.DOLLY;break;case il.ROTATE:if(n.ctrlKey||n.metaKey||n.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(n),this.state=on.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(n),this.state=on.ROTATE}break;case il.PAN:if(n.ctrlKey||n.metaKey||n.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(n),this.state=on.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(n),this.state=on.PAN}break;default:this.state=on.NONE}this.state!==on.NONE&&this.dispatchEvent(Md)}function aS(n){switch(this.state){case on.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(n);break;case on.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(n);break;case on.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(n);break}}function sS(n){this.enabled===!1||this.enableZoom===!1||this.state!==on.NONE||(n.preventDefault(),this.dispatchEvent(Md),this._handleMouseWheel(this._customWheelEvent(n)),this.dispatchEvent(gg))}function oS(n){this.enabled!==!1&&this._handleKeyDown(n)}function lS(n){switch(this._trackPointer(n),this._pointers.length){case 1:switch(this.touches.ONE){case nl.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(n),this.state=on.TOUCH_ROTATE;break;case nl.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(n),this.state=on.TOUCH_PAN;break;default:this.state=on.NONE}break;case 2:switch(this.touches.TWO){case nl.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(n),this.state=on.TOUCH_DOLLY_PAN;break;case nl.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(n),this.state=on.TOUCH_DOLLY_ROTATE;break;default:this.state=on.NONE}break;default:this.state=on.NONE}this.state!==on.NONE&&this.dispatchEvent(Md)}function cS(n){switch(this._trackPointer(n),this.state){case on.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(n),this.update();break;case on.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(n),this.update();break;case on.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(n),this.update();break;case on.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(n),this.update();break;default:this.state=on.NONE}}function uS(n){this.enabled!==!1&&n.preventDefault()}function hS(n){n.key==="Control"&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function fS(n){n.key==="Control"&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}const Ys=2.7,ni=.2,Au=.1,um=.95,hm=2.15,Zs=2.05,pr=.02,fm={wood:13148266,fabric:9348040,white:15921902,metal:12174028},dm={sejour:16112040,cuisine:15972536,chambre:12178677,sdb:11462384,wc:13093877,couloir:15000800,escalier:15520754,bureau:12576965,garage:14078925,reception:15786926,openspace:12445396,reunion:15911389,sanitaire:11462384,hall:15000800,stockage:16176824,logistique:16178370,vestiaire:14208501,salle_client:16180896,comptoir:16107664,cuisine_pro:15972536,plonge:11462384,chambre_froide:12445424,terrasse:13166776,attente:14733552,polyvalent:14672872};function af(n){if(n.length===0)return[];const e=[...n].sort((i,r)=>i.a-r.a),t=[{...e[0]}];for(const i of e.slice(1)){const r=t[t.length-1];i.a<=r.b+pr?r.b=Math.max(r.b,i.b):t.push({...i})}return t}function dS({plan:n}){const e=Hn.useRef(null);return Hn.useEffect(()=>{const t=e.current;if(!t)return;const i=n.length,r=n.width,c=[],u=ue=>(c.push(ue),ue),d=new D_,m=t.clientWidth||640,p=t.clientHeight||380,g=new Ji(40,m/p,.1,600),b=Math.max(i,r);g.position.set(-b*.62,b*.92,b*1.18);const x=new jy({antialias:!0,alpha:!0});x.setPixelRatio(Math.min(window.devicePixelRatio,2)),x.setSize(m,p),x.shadowMap.enabled=!0,x.shadowMap.type=Lm,x.toneMapping=ad,x.toneMappingExposure=1.08,t.appendChild(x.domElement),d.add(new q_(14674687,12103834,.75));const M=new Up(16773852,2.1);M.position.set(-b*1.1,b*1.5,b*.7),M.castShadow=!0,M.shadow.mapSize.set(2048,2048),M.shadow.camera.near=1,M.shadow.camera.far=b*6,M.shadow.camera.left=-b*1.2,M.shadow.camera.right=b*1.2,M.shadow.camera.top=b*1.2,M.shadow.camera.bottom=-b*1.2,M.shadow.bias=-4e-4,M.shadow.radius=4,d.add(M);const A=new Up(13623551,.5);A.position.set(b*.8,b*.5,-b),d.add(A);const C=u(new hl(i+14,r+14)),T=u(new ma({color:10336378,roughness:1})),S=new fi(C,T);S.rotation.x=-Math.PI/2,S.position.set(i/2,-.12,r/2),S.receiveShadow=!0,d.add(S);const B=u(new ns(i+1.2,.12,r+1.2)),G=u(new ma({color:13354164,roughness:.95})),D=new fi(B,G);D.position.set(i/2,-.06,r/2),D.receiveShadow=!0,d.add(D);const z=u(new ma({color:16250352,roughness:.85})),U=u(new K_({color:10406120,transparent:!0,opacity:.38,roughness:.08,metalness:.05})),W=u(new ma({color:9067059,roughness:.6})),w=u(new ma({color:7028511,roughness:.5})),F=u(new ma({color:12623952,roughness:.3,metalness:.7})),Z=new xc,X=(ue,Pe,tt,De,me,he,we)=>{if(ue<.01||Pe<.01||tt<.01)return;const Ve=u(new ns(ue,Pe,tt)),Ke=new fi(Ve,we);Ke.position.set(De,me,he),Ke.castShadow=!0,Ke.receiveShadow=!0,Z.add(Ke)},ne=[{key:"N",openings:[],run:i},{key:"S",openings:[],run:i},{key:"W",openings:[],run:r},{key:"E",openings:[],run:r}];for(const ue of n.rooms){for(const Pe of ue.windows){const tt=Pe.wall,De=Pe.wall==="N"||Pe.wall==="S"?ue.x+Pe.position:ue.y+Pe.position;ne.find(me=>me.key===tt).openings.push({a:De,b:De+Pe.width,kind:"win"})}for(const Pe of ue.doors){if(!Pe.isEntry)continue;const tt=Pe.wall,De=Pe.wall==="N"||Pe.wall==="S"?ue.x+Pe.position:ue.y+Pe.position;(Pe.wall==="N"&&ue.y<pr||Pe.wall==="S"&&Math.abs(ue.y+ue.h-r)<pr||Pe.wall==="W"&&ue.x<pr||Pe.wall==="E"&&Math.abs(ue.x+ue.w-i)<pr)&&ne.find(he=>he.key===tt).openings.push({a:De,b:De+Pe.width,kind:"door"})}}const pe=ni/2;for(const ue of ne){const Pe=af(ue.openings.map(he=>({a:he.a,b:he.b}))).map(he=>({...he,kind:ue.openings.find(we=>we.a>=he.a-pr&&we.b<=he.b+pr)?.kind??"win"})),tt=[];let De=0;for(const he of Pe)he.a>De+pr&&tt.push({a:De,b:Math.min(he.a,ue.run)}),De=Math.max(De,he.b);De<ue.run-pr&&tt.push({a:De,b:ue.run});const me=(he,we,Ve,Ke,Je)=>{const Lt=we-he,Le=(he+we)/2;ue.key==="N"?X(Lt,Ke-Ve,ni,Le,(Ve+Ke)/2,pe,Je):ue.key==="S"?X(Lt,Ke-Ve,ni,Le,(Ve+Ke)/2,r-pe,Je):ue.key==="W"?X(ni,Ke-Ve,Lt,pe,(Ve+Ke)/2,Le,Je):X(ni,Ke-Ve,Lt,i-pe,(Ve+Ke)/2,Le,Je)};for(const he of tt)me(he.a,he.b,0,Ys,z);for(const he of Pe)if(he.kind==="win")me(he.a,he.b,0,um,z),me(he.a,he.b,hm,Ys,z),me(he.a,he.b,um,hm,U);else{me(he.a,he.b,Zs,Ys,z),me(he.a,he.b,0,Zs,W);const we=he.b-he.a,Ve=.04,Ke=.06;ue.key==="N"?(X(we+.1,Ke,Ve,(he.a+he.b)/2,Zs+Ke/2,pe+ni/2+Ve/2,w),X(we+.1,Ke,Ve,(he.a+he.b)/2,Ke/2,pe+ni/2+Ve/2,w)):ue.key==="S"?(X(we+.1,Ke,Ve,(he.a+he.b)/2,Zs+Ke/2,r-pe-ni/2-Ve/2,w),X(we+.1,Ke,Ve,(he.a+he.b)/2,Ke/2,r-pe-ni/2-Ve/2,w)):ue.key==="W"?(X(Ve,Ke,we+.1,pe+ni/2+Ve/2,Zs+Ke/2,(he.a+he.b)/2,w),X(Ve,Ke,we+.1,pe+ni/2+Ve/2,Ke/2,(he.a+he.b)/2,w)):(X(Ve,Ke,we+.1,i-pe-ni/2-Ve/2,Zs+Ke/2,(he.a+he.b)/2,w),X(Ve,Ke,we+.1,i-pe-ni/2-Ve/2,Ke/2,(he.a+he.b)/2,w));const Je=.03,Lt=Zs*.52,Le=we*.38,kt=u(new vd(Je,12,8)),mt=new fi(kt,F);ue.key==="N"?mt.position.set((he.a+he.b)/2+Le,Lt,pe+ni/2+.05):ue.key==="S"?mt.position.set((he.a+he.b)/2+Le,Lt,r-pe-ni/2-.05):ue.key==="W"?mt.position.set(pe+ni/2+.05,Lt,(he.a+he.b)/2+Le):mt.position.set(i-pe-ni/2-.05,Lt,(he.a+he.b)/2+Le),mt.castShadow=!0,Z.add(mt)}}const _e=new Map,re=new Map;for(const ue of n.rooms){for(const Pe of[ue.x,ue.x+ue.w])_e.has(Pe)||_e.set(Pe,[]),_e.get(Pe).push({a:ue.y,b:ue.y+ue.h});for(const Pe of[ue.y,ue.y+ue.h])re.has(Pe)||re.set(Pe,[]),re.get(Pe).push({a:ue.x,b:ue.x+ue.w})}const H=(ue,Pe)=>ue>pr&&Math.abs(ue-Pe)>pr;for(const[ue,Pe]of _e)if(H(ue,i))for(const tt of af(Pe))X(Au,Ys,tt.b-tt.a,ue,Ys/2,(tt.a+tt.b)/2,z);for(const[ue,Pe]of re)if(H(ue,r))for(const tt of af(Pe))X(tt.b-tt.a,Ys,Au,(tt.a+tt.b)/2,Ys/2,ue,z);for(const ue of n.rooms){const Pe=u(new ns(Math.max(ue.w-Au,.25),.06,Math.max(ue.h-Au,.25))),tt=u(new ma({color:dm[ue.kind]??dm.polyvalent,roughness:.8})),De=new fi(Pe,tt);if(De.position.set(ue.x+ue.w/2,.03,ue.y+ue.h/2),De.receiveShadow=!0,Z.add(De),ue.w>1.8&&ue.h>1.4){const me=pS(ue.label,ue.area);u(me.texture),u(me.material);const he=new hl(Math.min(ue.w*.82,4.4),Math.min(ue.w*.82,4.4)*(me.canvas.height/me.canvas.width));u(he);const we=new fi(he,me.material);we.rotation.x=-Math.PI/2,we.position.set(ue.x+ue.w/2,.075,ue.y+ue.h/2),Z.add(we)}}const j=Object.fromEntries(Object.keys(fm).map(ue=>[ue,u(new ma({color:fm[ue],roughness:.75}))]));for(const ue of n.rooms)for(const Pe of Im(ue)){if(Pe.t==="l")continue;const tt=j[Pe.m??"wood"];if(Pe.t==="r"){const De=Pe.ht??.45;X(Pe.w,De,Pe.h,Pe.x+Pe.w/2,De/2+.06,Pe.y+Pe.h/2,tt)}else{const De=Pe.ht??.45;if(Pe.flat||Pe.r<.03)continue;const me=u(new xd(Pe.r,Pe.r,De,18)),he=new fi(me,tt);he.position.set(Pe.x,De/2+.06,Pe.y),he.castShadow=!0,Z.add(he)}}d.add(Z);const Ee=new eS(g,x.domElement);Ee.target.set(i/2,.9,r/2),Ee.enableDamping=!0,Ee.dampingFactor=.07,Ee.autoRotate=!0,Ee.autoRotateSpeed=.8,Ee.minDistance=b*.35,Ee.maxDistance=b*3.5,Ee.maxPolarAngle=Math.PI/2.08;let Ce=0;const ce=()=>{Ce=requestAnimationFrame(ce),Ee.update(),x.render(d,g)};ce();const K=new ResizeObserver(()=>{const ue=t.clientWidth||m,Pe=t.clientHeight||p;g.aspect=ue/Pe,g.updateProjectionMatrix(),x.setSize(ue,Pe)});return K.observe(t),()=>{cancelAnimationFrame(Ce),K.disconnect(),Ee.dispose();for(const ue of c)ue.dispose();x.dispose(),x.domElement.parentElement===t&&t.removeChild(x.domElement)}},[n]),Y.jsx("div",{ref:e,className:"w-full h-[320px] sm:h-[400px] rounded-lg overflow-hidden bg-gradient-to-b from-sky-100 via-sky-50 to-emerald-50 dark:from-slate-900 dark:via-slate-850 dark:to-slate-800"})}function pS(n,e){const t=document.createElement("canvas");t.width=512,t.height=192;const i=t.getContext("2d");i.clearRect(0,0,t.width,t.height),i.fillStyle="rgba(255,255,255,0.72)";const r=14,c=t.width-r*2,u=t.height-r*2;i.beginPath(),i.roundRect(r,r,c,u,22),i.fill(),i.strokeStyle="rgba(28,25,23,0.55)",i.lineWidth=3,i.stroke(),i.fillStyle="#292524",i.textAlign="center",i.textBaseline="middle";let d=58;for(i.font=`700 ${d}px Inter, system-ui, sans-serif`;i.measureText(n.toUpperCase()).width>c-36&&d>26;)d-=4,i.font=`700 ${d}px Inter, system-ui, sans-serif`;i.fillText(n.toUpperCase(),t.width/2,t.height/2-24),i.fillStyle="#57534e",i.font="500 44px Inter, system-ui, sans-serif",i.fillText(`${e.toFixed(2)} m²`,t.width/2,t.height/2+42);const m=new H_(t);m.anisotropy=4;const p=new gd({map:m,transparent:!0,depthWrite:!1});return{canvas:t,texture:m,material:p}}const mS=2.7,gS=.8,Ru=.9,_S=new Set(["chambre","sdb","wc"]),xS=new Set(["sejour","cuisine","bureau","reception","openspace","polyvalent","terrasse","attente"]),td=new Set(["couloir","escalier","hall"]),vS=new Set(["chambre","sejour","cuisine","bureau","openspace","reunion","reception","polyvalent","salle_client","comptoir"]);function bS(n){return _S.has(n.kind)?"nuit":xS.has(n.kind)?"jour":td.has(n.kind)?"circulation":"service"}function MS(n){const e=n.rooms,t=e.reduce((w,F)=>w+F.area,0)||1,i=new Map,r=w=>({zone:w==="nuit"?"Zone nuit":w==="jour"?"Zone jour":w==="service"?"Zone service / technique":"Circulations",kind:w,rooms:[],area:0}),c=["nuit","jour","service","circulation"];for(const w of c)i.set(w,r(w));for(const w of e){const F=i.get(bS(w));F.rooms.push({label:w.label,area:w.area}),F.area+=w.area}const u=c.map(w=>i.get(w)),d=i.get("circulation").area,m=d/t*100,p=t-d,g={groups:u,circulationM2:d,circulationPct:m,usefulM2:p},b=e.filter(w=>td.has(w.kind)),x=b.length?Math.min(...b.map(w=>Math.min(w.w,w.h))):Math.min(...e.map(w=>Math.min(w.w,w.h))),M=e.filter(w=>!td.has(w.kind)&&Math.min(w.w,w.h)<1.6).map(w=>({label:w.label,dim:Math.round(Math.min(w.w,w.h)*100)/100})),A={ceilingHeight:mS,minPassage:x,passable:x>=gS,narrowRooms:M},C=e.reduce((w,F)=>w+F.doors.length,0),T=e.reduce((w,F)=>w+F.windows.length,0),S=e.filter(w=>vS.has(w.kind)&&w.windows.length===0).map(w=>({label:w.label,kind:w.kind})),B={totalDoors:C,totalWindows:T,roomsWithoutDaylight:S},G=[];let D=100;m>12?(G.push({category:"circulation",severity:"warning",title:"Circulations trop généreuses",detail:`${m.toFixed(0)}% de la surface (${d.toFixed(1)} m²) est consommée par les couloirs et la gaine. Recomposer le plan pour éliminer les m² perdus : regrouper les pièces de service en blocs contigus et réduire la longueur des couloirs.`}),D-=Math.min(15,Math.round((m-12)*1.5))):G.push({category:"circulation",severity:"info",title:"Bonne compacité des circulations",detail:`Seuls ${m.toFixed(1)}% de la surface (${d.toFixed(1)} m²) sont consacrés aux couloirs et à la gaine d'escalier, laissant ${p.toFixed(1)} m² de surface utile.`});const z=i.get("nuit"),U=i.get("jour");return z.area>0&&U.area>0&&(z.area>U.area?G.push({category:"zonage",severity:"warning",title:"Déséquilibre zone jour / nuit",detail:`La zone nuit (${z.area.toFixed(1)} m²) excède la zone jour (${U.area.toFixed(1)} m²). Rééquilibrer en faveur des espaces de vie (séjour ouvert sur la cuisine) pour un rythme jour/nuit plus lisible et une meilleure isolation acoustique des chambres.`}):G.push({category:"zonage",severity:"info",title:"Zonage jour / nuit cohérent",detail:`Les espaces de jour (${U.area.toFixed(1)} m²) dominent la zone nuit (${z.area.toFixed(1)} m²) : l'entrée mène naturellement au séjour, tandis que les chambres s'éloignent des sources de bruit.`})),A.passable?A.minPassage<Ru&&G.push({category:"ergonomie",severity:"warning",title:"Passage fonctionnel mais strict",detail:`Le passage le plus étroit atteint ${(A.minPassage*100).toFixed(0)} cm (cible ${(Ru*100).toFixed(0)} cm). Le garder dégagé sur toute sa longueur — aucun rangement saillant, porte battante hors du chemin.`}):(G.push({category:"ergonomie",severity:"critical",title:"Passage trop étroit",detail:`Le passage le plus étroit mesure ${(A.minPassage*100).toFixed(0)} cm, sous le minimum de ${Ru*100} cm conseillé. Élargir ce couloir à ${(Ru*100).toFixed(0)} cm pour permettre le croisement et le transport de mobilier.`}),D-=18),A.narrowRooms.length>0&&(G.push({category:"agencement",severity:"warning",title:"Pièces trop étroites",detail:`${A.narrowRooms.map(w=>`${w.label} (${(w.dim*100).toFixed(0)} cm)`).join(", ")}. Sous ${(1.6*100).toFixed(0)} cm de profondeur, préférer un mobilier sur-mesure (dressing, banquette) plutôt que du mobilier standard pour ne pas obstruer la circulation.`}),D-=5),B.roomsWithoutDaylight.length>0?(G.push({category:"lumiere",severity:"warning",title:"Pièces habitables sans lumière naturelle",detail:`${B.roomsWithoutDaylight.map(w=>w.label).join(", ")} n'ont pas de fenêtre. Percer une ouverture vers l'extérieur, ou en dernier recours prévoir un conduit de lumière / verrière et des cloisons vitrées pour diffuser la clarté.`}),D-=10):G.push({category:"lumiere",severity:"info",title:"Bon apport de lumière naturelle",detail:`Toutes les pièces de séjour bénéficient d'une ouverture extérieure (${B.totalWindows} fenêtres au total), limitant le recours à l'éclairage artificiel en journée.`}),B.totalWindows>0&&G.push({category:"agencement",severity:"info",title:"Mobilier face aux ouvertures",detail:`Conserver un dégagement d'au moins ${(.9*100).toFixed(0)} cm devant les ${B.totalWindows} fenêtres et positionner les rangements pleins (penderies, bibliothèques) sur les murs intérieurs pour ne pas occulter la lumière.`}),B.totalDoors===0&&(G.push({category:"agencement",severity:"critical",title:"Aucune porte sur ce niveau",detail:"Chaque pièce doit disposer d'un accès dédié pour garantir la fluidité du parcours intérieur."}),D-=10),{score:Math.max(40,Math.min(100,Math.round(D))),zoning:g,ergonomics:A,layout:B,recommendations:G}}var Ks={},gc={};var pm;function yS(){if(pm)return gc;pm=1;var n=bm(),e=vm();function t(s){var l="https://react.dev/errors/"+s;if(1<arguments.length){l+="?args[]="+encodeURIComponent(arguments[1]);for(var f=2;f<arguments.length;f++)l+="&args[]="+encodeURIComponent(arguments[f])}return"Minified React error #"+s+"; visit "+l+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}var i=Symbol.for("react.transitional.element"),r=Symbol.for("react.portal"),c=Symbol.for("react.fragment"),u=Symbol.for("react.strict_mode"),d=Symbol.for("react.profiler"),m=Symbol.for("react.consumer"),p=Symbol.for("react.context"),g=Symbol.for("react.forward_ref"),b=Symbol.for("react.suspense"),x=Symbol.for("react.suspense_list"),M=Symbol.for("react.memo"),A=Symbol.for("react.lazy"),C=Symbol.for("react.scope"),T=Symbol.for("react.activity"),S=Symbol.for("react.legacy_hidden"),B=Symbol.for("react.memo_cache_sentinel"),G=Symbol.for("react.view_transition"),D=Symbol.iterator;function z(s){return s===null||typeof s!="object"?null:(s=D&&s[D]||s["@@iterator"],typeof s=="function"?s:null)}var U=Array.isArray;function W(s,l){var f=s.length&3,v=s.length-f,E=l;for(l=0;l<v;){var L=s.charCodeAt(l)&255|(s.charCodeAt(++l)&255)<<8|(s.charCodeAt(++l)&255)<<16|(s.charCodeAt(++l)&255)<<24;++l,L=3432918353*(L&65535)+((3432918353*(L>>>16)&65535)<<16)&4294967295,L=L<<15|L>>>17,L=461845907*(L&65535)+((461845907*(L>>>16)&65535)<<16)&4294967295,E^=L,E=E<<13|E>>>19,E=5*(E&65535)+((5*(E>>>16)&65535)<<16)&4294967295,E=(E&65535)+27492+(((E>>>16)+58964&65535)<<16)}switch(L=0,f){case 3:L^=(s.charCodeAt(l+2)&255)<<16;case 2:L^=(s.charCodeAt(l+1)&255)<<8;case 1:L^=s.charCodeAt(l)&255,L=3432918353*(L&65535)+((3432918353*(L>>>16)&65535)<<16)&4294967295,L=L<<15|L>>>17,E^=461845907*(L&65535)+((461845907*(L>>>16)&65535)<<16)&4294967295}return E^=s.length,E^=E>>>16,E=2246822507*(E&65535)+((2246822507*(E>>>16)&65535)<<16)&4294967295,E^=E>>>13,E=3266489909*(E&65535)+((3266489909*(E>>>16)&65535)<<16)&4294967295,(E^E>>>16)>>>0}var w=Object.assign,F=Object.prototype.hasOwnProperty,Z=RegExp("^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"),X={},ne={};function pe(s){return F.call(ne,s)?!0:F.call(X,s)?!1:Z.test(s)?ne[s]=!0:(X[s]=!0,!1)}var _e=new Set("animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(" ")),re=new Map([["acceptCharset","accept-charset"],["htmlFor","for"],["httpEquiv","http-equiv"],["crossOrigin","crossorigin"],["accentHeight","accent-height"],["alignmentBaseline","alignment-baseline"],["arabicForm","arabic-form"],["baselineShift","baseline-shift"],["capHeight","cap-height"],["clipPath","clip-path"],["clipRule","clip-rule"],["colorInterpolation","color-interpolation"],["colorInterpolationFilters","color-interpolation-filters"],["colorProfile","color-profile"],["colorRendering","color-rendering"],["dominantBaseline","dominant-baseline"],["enableBackground","enable-background"],["fillOpacity","fill-opacity"],["fillRule","fill-rule"],["floodColor","flood-color"],["floodOpacity","flood-opacity"],["fontFamily","font-family"],["fontSize","font-size"],["fontSizeAdjust","font-size-adjust"],["fontStretch","font-stretch"],["fontStyle","font-style"],["fontVariant","font-variant"],["fontWeight","font-weight"],["glyphName","glyph-name"],["glyphOrientationHorizontal","glyph-orientation-horizontal"],["glyphOrientationVertical","glyph-orientation-vertical"],["horizAdvX","horiz-adv-x"],["horizOriginX","horiz-origin-x"],["imageRendering","image-rendering"],["letterSpacing","letter-spacing"],["lightingColor","lighting-color"],["markerEnd","marker-end"],["markerMid","marker-mid"],["markerStart","marker-start"],["overlinePosition","overline-position"],["overlineThickness","overline-thickness"],["paintOrder","paint-order"],["panose-1","panose-1"],["pointerEvents","pointer-events"],["renderingIntent","rendering-intent"],["shapeRendering","shape-rendering"],["stopColor","stop-color"],["stopOpacity","stop-opacity"],["strikethroughPosition","strikethrough-position"],["strikethroughThickness","strikethrough-thickness"],["strokeDasharray","stroke-dasharray"],["strokeDashoffset","stroke-dashoffset"],["strokeLinecap","stroke-linecap"],["strokeLinejoin","stroke-linejoin"],["strokeMiterlimit","stroke-miterlimit"],["strokeOpacity","stroke-opacity"],["strokeWidth","stroke-width"],["textAnchor","text-anchor"],["textDecoration","text-decoration"],["textRendering","text-rendering"],["transformOrigin","transform-origin"],["underlinePosition","underline-position"],["underlineThickness","underline-thickness"],["unicodeBidi","unicode-bidi"],["unicodeRange","unicode-range"],["unitsPerEm","units-per-em"],["vAlphabetic","v-alphabetic"],["vHanging","v-hanging"],["vIdeographic","v-ideographic"],["vMathematical","v-mathematical"],["vectorEffect","vector-effect"],["vertAdvY","vert-adv-y"],["vertOriginX","vert-origin-x"],["vertOriginY","vert-origin-y"],["wordSpacing","word-spacing"],["writingMode","writing-mode"],["xmlnsXlink","xmlns:xlink"],["xHeight","x-height"]]),H=/["'&<>]/;function j(s){if(typeof s=="boolean"||typeof s=="number"||typeof s=="bigint")return""+s;s=""+s;var l=H.exec(s);if(l){var f="",v,E=0;for(v=l.index;v<s.length;v++){switch(s.charCodeAt(v)){case 34:l="&quot;";break;case 38:l="&amp;";break;case 39:l="&#x27;";break;case 60:l="&lt;";break;case 62:l="&gt;";break;default:continue}E!==v&&(f+=s.slice(E,v)),E=v+1,f+=l}s=E!==v?f+s.slice(E,v):f}return s}var Ee=/([A-Z])/g,Ce=/^ms-/,ce=/^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;function K(s){return ce.test(""+s)?"javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')":s}var ue=n.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,Pe=e.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,tt={pending:!1,data:null,method:null,action:null},De=Pe.d;Pe.d={f:De.f,r:De.r,D:zi,C:Xn,L:ro,m:us,X:so,S:ao,M:pl};var me=[],he=null,we=/(<\/|<)(s)(cript)/gi;function Ve(s,l,f,v){return""+l+(f==="s"?"\\u0073":"\\u0053")+v}function Ke(s,l,f,v,E){return{idPrefix:s===void 0?"":s,nextFormID:0,streamingFormat:0,bootstrapScriptContent:f,bootstrapScripts:v,bootstrapModules:E,instructions:0,hasBody:!1,hasHtml:!1,unknownResources:{},dnsResources:{},connectResources:{default:{},anonymous:{},credentials:{}},imageResources:{},styleResources:{},scriptResources:{},moduleUnknownResources:{},moduleScriptResources:{}}}function Je(s,l,f,v){return{insertionMode:s,selectedValue:l,tagScope:f,viewTransition:v}}function Lt(s,l,f){var v=s.tagScope&-25;switch(l){case"noscript":return Je(2,null,v|1,null);case"select":return Je(2,f.value!=null?f.value:f.defaultValue,v,null);case"svg":return Je(4,null,v,null);case"picture":return Je(2,null,v|2,null);case"math":return Je(5,null,v,null);case"foreignObject":return Je(2,null,v,null);case"table":return Je(6,null,v,null);case"thead":case"tbody":case"tfoot":return Je(7,null,v,null);case"colgroup":return Je(9,null,v,null);case"tr":return Je(8,null,v,null);case"head":if(2>s.insertionMode)return Je(3,null,v,null);break;case"html":if(s.insertionMode===0)return Je(1,null,v,null)}return 6<=s.insertionMode||2>s.insertionMode?Je(2,null,v,null):s.tagScope!==v?Je(s.insertionMode,s.selectedValue,v,null):s}function Le(s){return s===null?null:{update:s.update,enter:"none",exit:"none",share:s.update,name:s.autoName,autoName:s.autoName,nameIdx:0}}function kt(s,l){return l.tagScope&32&&(s.instructions|=128),Je(l.insertionMode,l.selectedValue,l.tagScope|12,Le(l.viewTransition))}function mt(s,l){s=Le(l.viewTransition);var f=l.tagScope|16;return s!==null&&s.share!=="none"&&(f|=64),Je(l.insertionMode,l.selectedValue,f,s)}var Tt=new Map;function $t(s,l){if(typeof l!="object")throw Error(t(62));var f=!0,v;for(v in l)if(F.call(l,v)){var E=l[v];if(E!=null&&typeof E!="boolean"&&E!==""){if(v.indexOf("--")===0){var L=j(v);E=j((""+E).trim())}else L=Tt.get(v),L===void 0&&(L=j(v.replace(Ee,"-$1").toLowerCase().replace(Ce,"-ms-")),Tt.set(v,L)),E=typeof E=="number"?E===0||_e.has(v)?""+E:E+"px":j((""+E).trim());f?(f=!1,s.push(' style="',L,":",E)):s.push(";",L,":",E)}}f||s.push('"')}function Kt(s,l,f){f&&typeof f!="function"&&typeof f!="symbol"&&s.push(" ",l,'=""')}function wt(s,l,f){typeof f!="function"&&typeof f!="symbol"&&typeof f!="boolean"&&s.push(" ",l,'="',j(f),'"')}var En=j("javascript:throw new Error('React form unexpectedly submitted.')");function Nt(s,l){this.push('<input type="hidden"'),Ft(s),wt(this,"name",l),wt(this,"value",s),this.push("/>")}function Ft(s){if(typeof s!="string")throw Error(t(480))}function $(s,l){if(typeof l.$$FORM_ACTION=="function"){var f=s.nextFormID++;s=s.idPrefix+f;try{var v=l.$$FORM_ACTION(s);if(v){var E=v.data;E?.forEach(Ft)}return v}catch(L){if(typeof L=="object"&&L!==null&&typeof L.then=="function")throw L}}return null}function Ln(s,l,f,v,E,L,k,ge){var q=null;if(typeof v=="function"){var xe=$(l,v);xe!==null?(ge=xe.name,v=xe.action||"",E=xe.encType,L=xe.method,k=xe.target,q=xe.data):(s.push(" ","formAction",'="',En,'"'),k=L=E=v=ge=null,ie(l,f))}return ge!=null&&it(s,"name",ge),v!=null&&it(s,"formAction",v),E!=null&&it(s,"formEncType",E),L!=null&&it(s,"formMethod",L),k!=null&&it(s,"formTarget",k),q}function it(s,l,f){switch(l){case"className":wt(s,"class",f);break;case"tabIndex":wt(s,"tabindex",f);break;case"dir":case"role":case"viewBox":case"width":case"height":wt(s,l,f);break;case"style":$t(s,f);break;case"src":case"href":if(f==="")break;case"action":case"formAction":if(f==null||typeof f=="function"||typeof f=="symbol"||typeof f=="boolean")break;f=K(""+f),s.push(" ",l,'="',j(f),'"');break;case"defaultValue":case"defaultChecked":case"innerHTML":case"suppressContentEditableWarning":case"suppressHydrationWarning":case"ref":break;case"autoFocus":case"multiple":case"muted":Kt(s,l.toLowerCase(),f);break;case"xlinkHref":if(typeof f=="function"||typeof f=="symbol"||typeof f=="boolean")break;f=K(""+f),s.push(" ","xlink:href",'="',j(f),'"');break;case"contentEditable":case"spellCheck":case"draggable":case"value":case"autoReverse":case"externalResourcesRequired":case"focusable":case"preserveAlpha":typeof f!="function"&&typeof f!="symbol"&&s.push(" ",l,'="',j(f),'"');break;case"inert":case"allowFullScreen":case"async":case"autoPlay":case"controls":case"default":case"defer":case"disabled":case"disablePictureInPicture":case"disableRemotePlayback":case"formNoValidate":case"hidden":case"loop":case"noModule":case"noValidate":case"open":case"playsInline":case"readOnly":case"required":case"reversed":case"scoped":case"seamless":case"itemScope":f&&typeof f!="function"&&typeof f!="symbol"&&s.push(" ",l,'=""');break;case"capture":case"download":f===!0?s.push(" ",l,'=""'):f!==!1&&typeof f!="function"&&typeof f!="symbol"&&s.push(" ",l,'="',j(f),'"');break;case"cols":case"rows":case"size":case"span":typeof f!="function"&&typeof f!="symbol"&&!isNaN(f)&&1<=f&&s.push(" ",l,'="',j(f),'"');break;case"rowSpan":case"start":typeof f=="function"||typeof f=="symbol"||isNaN(f)||s.push(" ",l,'="',j(f),'"');break;case"xlinkActuate":wt(s,"xlink:actuate",f);break;case"xlinkArcrole":wt(s,"xlink:arcrole",f);break;case"xlinkRole":wt(s,"xlink:role",f);break;case"xlinkShow":wt(s,"xlink:show",f);break;case"xlinkTitle":wt(s,"xlink:title",f);break;case"xlinkType":wt(s,"xlink:type",f);break;case"xmlBase":wt(s,"xml:base",f);break;case"xmlLang":wt(s,"xml:lang",f);break;case"xmlSpace":wt(s,"xml:space",f);break;default:if((!(2<l.length)||l[0]!=="o"&&l[0]!=="O"||l[1]!=="n"&&l[1]!=="N")&&(l=re.get(l)||l,pe(l))){switch(typeof f){case"function":case"symbol":return;case"boolean":var v=l.toLowerCase().slice(0,5);if(v!=="data-"&&v!=="aria-")return}s.push(" ",l,'="',j(f),'"')}}}function O(s,l,f){if(l!=null){if(f!=null)throw Error(t(60));if(typeof l!="object"||!("__html"in l))throw Error(t(61));l=l.__html,l!=null&&s.push(""+l)}}function R(s){var l="";return n.Children.forEach(s,function(f){f!=null&&(l+=f)}),l}function ie(s,l){if((s.instructions&16)===0){s.instructions|=16;var f=l.preamble,v=l.bootstrapChunks;(f.htmlChunks||f.headChunks)&&v.length===0?(v.push(l.startInlineScript),xr(v,s),v.push(">",`addEventListener("submit",function(a){if(!a.defaultPrevented){var c=a.target,d=a.submitter,e=c.action,b=d;if(d){var f=d.getAttribute("formAction");null!=f&&(e=f,b=null)}"javascript:throw new Error('React form unexpectedly submitted.')"===e&&(a.preventDefault(),b?(a=document.createElement("input"),a.name=b.name,a.value=b.value,b.parentNode.insertBefore(a,b),b=new FormData(c),a.parentNode.removeChild(a)):b=new FormData(c),a=c.ownerDocument||c,(a.$$reactFormReplay=a.$$reactFormReplay||[]).push(c,d,b))}});`,"<\/script>")):v.unshift(l.startInlineScript,">",`addEventListener("submit",function(a){if(!a.defaultPrevented){var c=a.target,d=a.submitter,e=c.action,b=d;if(d){var f=d.getAttribute("formAction");null!=f&&(e=f,b=null)}"javascript:throw new Error('React form unexpectedly submitted.')"===e&&(a.preventDefault(),b?(a=document.createElement("input"),a.name=b.name,a.value=b.value,b.parentNode.insertBefore(a,b),b=new FormData(c),a.parentNode.removeChild(a)):b=new FormData(c),a=c.ownerDocument||c,(a.$$reactFormReplay=a.$$reactFormReplay||[]).push(c,d,b))}});`,"<\/script>")}}function ae(s,l){s.push(We("link"));for(var f in l)if(F.call(l,f)){var v=l[f];if(v!=null)switch(f){case"children":case"dangerouslySetInnerHTML":throw Error(t(399,"link"));default:it(s,f,v)}}return s.push("/>"),null}var be=/(<\/|<)(s)(tyle)/gi;function Ie(s,l,f,v){return""+l+(f==="s"?"\\73 ":"\\53 ")+v}function Ne(s,l,f){s.push(We(f));for(var v in l)if(F.call(l,v)){var E=l[v];if(E!=null)switch(v){case"children":case"dangerouslySetInnerHTML":throw Error(t(399,f));default:it(s,v,E)}}return s.push("/>"),null}function Me(s,l){s.push(We("title"));var f=null,v=null,E;for(E in l)if(F.call(l,E)){var L=l[E];if(L!=null)switch(E){case"children":f=L;break;case"dangerouslySetInnerHTML":v=L;break;default:it(s,E,L)}}return s.push(">"),l=Array.isArray(f)?2>f.length?f[0]:null:f,typeof l!="function"&&typeof l!="symbol"&&l!==null&&l!==void 0&&s.push(j(""+l)),O(s,v,f),s.push(J("title")),null}function ye(s,l){s.push(We("script"));var f=null,v=null,E;for(E in l)if(F.call(l,E)){var L=l[E];if(L!=null)switch(E){case"children":f=L;break;case"dangerouslySetInnerHTML":v=L;break;default:it(s,E,L)}}return s.push(">"),O(s,v,f),typeof f=="string"&&s.push((""+f).replace(we,Ve)),s.push(J("script")),null}function ze(s,l,f){s.push(We(f));var v=f=null,E;for(E in l)if(F.call(l,E)){var L=l[E];if(L!=null)switch(E){case"children":f=L;break;case"dangerouslySetInnerHTML":v=L;break;default:it(s,E,L)}}return s.push(">"),O(s,v,f),f}function rt(s,l,f){s.push(We(f));var v=f=null,E;for(E in l)if(F.call(l,E)){var L=l[E];if(L!=null)switch(E){case"children":f=L;break;case"dangerouslySetInnerHTML":v=L;break;default:it(s,E,L)}}return s.push(">"),O(s,v,f),typeof f=="string"?(s.push(j(f)),null):f}var Ge=/^[a-zA-Z][a-zA-Z:_\.\-\d]*$/,He=new Map;function We(s){var l=He.get(s);if(l===void 0){if(!Ge.test(s))throw Error(t(65,s));l="<"+s,He.set(s,l)}return l}function je(s,l,f,v,E,L,k,ge,q){switch(l){case"div":case"span":case"svg":case"path":break;case"a":s.push(We("a"));var xe=null,Ae=null,Se;for(Se in f)if(F.call(f,Se)){var ke=f[Se];if(ke!=null)switch(Se){case"children":xe=ke;break;case"dangerouslySetInnerHTML":Ae=ke;break;case"href":ke===""?wt(s,"href",""):it(s,Se,ke);break;default:it(s,Se,ke)}}if(s.push(">"),O(s,Ae,xe),typeof xe=="string"){s.push(j(xe));var lt=null}else lt=xe;return lt;case"g":case"p":case"li":break;case"select":s.push(We("select"));var Dt=null,vt=null,bt;for(bt in f)if(F.call(f,bt)){var _t=f[bt];if(_t!=null)switch(bt){case"children":Dt=_t;break;case"dangerouslySetInnerHTML":vt=_t;break;case"defaultValue":case"value":break;default:it(s,bt,_t)}}return s.push(">"),O(s,vt,Dt),Dt;case"option":var Mt=ge.selectedValue;s.push(We("option"));var fn=null,mn=null,zt=null,Wt=null,Ot;for(Ot in f)if(F.call(f,Ot)){var oi=f[Ot];if(oi!=null)switch(Ot){case"children":fn=oi;break;case"selected":zt=oi;break;case"dangerouslySetInnerHTML":Wt=oi;break;case"value":mn=oi;default:it(s,Ot,oi)}}if(Mt!=null){var Ht=mn!==null?""+mn:R(fn);if(U(Mt)){for(var gi=0;gi<Mt.length;gi++)if(""+Mt[gi]===Ht){s.push(' selected=""');break}}else""+Mt===Ht&&s.push(' selected=""')}else zt&&s.push(' selected=""');return s.push(">"),O(s,Wt,fn),fn;case"textarea":s.push(We("textarea"));var Zt=null,Tn=null,An=null,dn;for(dn in f)if(F.call(f,dn)){var $n=f[dn];if($n!=null)switch(dn){case"children":An=$n;break;case"value":Zt=$n;break;case"defaultValue":Tn=$n;break;case"dangerouslySetInnerHTML":throw Error(t(91));default:it(s,dn,$n)}}if(Zt===null&&Tn!==null&&(Zt=Tn),s.push(">"),An!=null){if(Zt!=null)throw Error(t(92));if(U(An)){if(1<An.length)throw Error(t(93));Zt=""+An[0]}Zt=""+An}return typeof Zt=="string"&&Zt[0]===`
`&&s.push(`
`),Zt!==null&&s.push(j(""+Zt)),null;case"input":s.push(We("input"));var ea=null,_i=null,ys=null,Ia=null,Jn=null,Si=null,Fi=null,Ui=null,$i=null,Er;for(Er in f)if(F.call(f,Er)){var Dn=f[Er];if(Dn!=null)switch(Er){case"children":case"dangerouslySetInnerHTML":throw Error(t(399,"input"));case"name":ea=Dn;break;case"formAction":_i=Dn;break;case"formEncType":ys=Dn;break;case"formMethod":Ia=Dn;break;case"formTarget":Jn=Dn;break;case"defaultChecked":$i=Dn;break;case"defaultValue":Fi=Dn;break;case"checked":Ui=Dn;break;case"value":Si=Dn;break;default:it(s,Er,Dn)}}var ta=Ln(s,v,E,_i,ys,Ia,Jn,ea);return Ui!==null?Kt(s,"checked",Ui):$i!==null&&Kt(s,"checked",$i),Si!==null?it(s,"value",Si):Fi!==null&&it(s,"value",Fi),s.push("/>"),ta?.forEach(Nt,s),null;case"button":s.push(We("button"));var Ss=null,Dl=null,Il=null,Vc=null,Ll=null,Es=null,Wc=null,na;for(na in f)if(F.call(f,na)){var Xi=f[na];if(Xi!=null)switch(na){case"children":Ss=Xi;break;case"dangerouslySetInnerHTML":Dl=Xi;break;case"name":Il=Xi;break;case"formAction":Vc=Xi;break;case"formEncType":Ll=Xi;break;case"formMethod":Es=Xi;break;case"formTarget":Wc=Xi;break;default:it(s,na,Xi)}}var ia=Ln(s,v,E,Vc,Ll,Es,Wc,Il);if(s.push(">"),ia?.forEach(Nt,s),O(s,Dl,Ss),typeof Ss=="string"){s.push(j(Ss));var Ro=null}else Ro=Ss;return Ro;case"form":s.push(We("form"));var Tr=null,Nl=null,Ei=null,Ts=null,La=null,Na=null,ws;for(ws in f)if(F.call(f,ws)){var er=f[ws];if(er!=null)switch(ws){case"children":Tr=er;break;case"dangerouslySetInnerHTML":Nl=er;break;case"action":Ei=er;break;case"encType":Ts=er;break;case"method":La=er;break;case"target":Na=er;break;default:it(s,ws,er)}}var Fl=null,Rn=null;if(typeof Ei=="function"){var wr=$(v,Ei);wr!==null?(Ei=wr.action||"",Ts=wr.encType,La=wr.method,Na=wr.target,Fl=wr.data,Rn=wr.name):(s.push(" ","action",'="',En,'"'),Na=La=Ts=Ei=null,ie(v,E))}if(Ei!=null&&it(s,"action",Ei),Ts!=null&&it(s,"encType",Ts),La!=null&&it(s,"method",La),Na!=null&&it(s,"target",Na),s.push(">"),Rn!==null&&(s.push('<input type="hidden"'),wt(s,"name",Rn),s.push("/>"),Fl?.forEach(Nt,s)),O(s,Nl,Tr),typeof Tr=="string"){s.push(j(Tr));var Fa=null}else Fa=Tr;return Fa;case"menuitem":s.push(We("menuitem"));for(var Ar in f)if(F.call(f,Ar)){var Co=f[Ar];if(Co!=null)switch(Ar){case"children":case"dangerouslySetInnerHTML":throw Error(t(400));default:it(s,Ar,Co)}}return s.push(">"),null;case"object":s.push(We("object"));var Ti=null,Rr=null,ra;for(ra in f)if(F.call(f,ra)){var wi=f[ra];if(wi!=null)switch(ra){case"children":Ti=wi;break;case"dangerouslySetInnerHTML":Rr=wi;break;case"data":var Un=K(""+wi);if(Un==="")break;s.push(" ","data",'="',j(Un),'"');break;default:it(s,ra,wi)}}if(s.push(">"),O(s,Rr,Ti),typeof Ti=="string"){s.push(j(Ti));var Ua=null}else Ua=Ti;return Ua;case"title":var Qn=ge.tagScope&1,Ul=ge.tagScope&4;if(ge.insertionMode===4||Qn||f.itemProp!=null)var As=Me(s,f);else Ul?As=null:(Me(E.hoistableChunks,f),As=void 0);return As;case"link":var Rs=ge.tagScope&1,Xc=ge.tagScope&4,Yc=f.rel,tr=f.href,aa=f.precedence;if(ge.insertionMode===4||Rs||f.itemProp!=null||typeof Yc!="string"||typeof tr!="string"||tr===""){ae(s,f);var Cr=null}else if(f.rel==="stylesheet")if(typeof aa!="string"||f.disabled!=null||f.onLoad||f.onError)Cr=ae(s,f);else{var On=E.styles.get(aa),Oa=v.styleResources.hasOwnProperty(tr)?v.styleResources[tr]:void 0;if(Oa!==null){v.styleResources[tr]=null,On||(On={precedence:j(aa),rules:[],hrefs:[],sheets:new Map},E.styles.set(aa,On));var Ba={state:0,props:w({},f,{"data-precedence":f.precedence,precedence:null})};if(Oa){Oa.length===2&&I(Ba.props,Oa);var Po=E.preloads.stylesheets.get(tr);Po&&0<Po.length?Po.length=0:Ba.state=1}On.sheets.set(tr,Ba),k&&k.stylesheets.add(Ba)}else if(On){var Do=On.sheets.get(tr);Do&&k&&k.stylesheets.add(Do)}q&&s.push("<!-- -->"),Cr=null}else f.onLoad||f.onError?Cr=ae(s,f):(q&&s.push("<!-- -->"),Cr=Xc?null:ae(E.hoistableChunks,f));return Cr;case"script":var Ol=ge.tagScope&1,Io=f.async;if(typeof f.src!="string"||!f.src||!Io||typeof Io=="function"||typeof Io=="symbol"||f.onLoad||f.onError||ge.insertionMode===4||Ol||f.itemProp!=null)var Bl=ye(s,f);else{var Mn=f.src;if(f.type==="module")var Lo=v.moduleScriptResources,ka=E.preloads.moduleScripts;else Lo=v.scriptResources,ka=E.preloads.scripts;var za=Lo.hasOwnProperty(Mn)?Lo[Mn]:void 0;if(za!==null){Lo[Mn]=null;var Cs=f;if(za){za.length===2&&(Cs=w({},f),I(Cs,za));var No=ka.get(Mn);No&&(No.length=0)}var Ps=[];E.scripts.add(Ps),ye(Ps,Cs)}q&&s.push("<!-- -->"),Bl=null}return Bl;case"style":var Ds=ge.tagScope&1,nr=f.precedence,xi=f.href,kl=f.nonce;if(ge.insertionMode===4||Ds||f.itemProp!=null||typeof nr!="string"||typeof xi!="string"||xi===""){s.push(We("style"));var Pr=null,zl=null,ir;for(ir in f)if(F.call(f,ir)){var sa=f[ir];if(sa!=null)switch(ir){case"children":Pr=sa;break;case"dangerouslySetInnerHTML":zl=sa;break;default:it(s,ir,sa)}}s.push(">");var rr=Array.isArray(Pr)?2>Pr.length?Pr[0]:null:Pr;typeof rr!="function"&&typeof rr!="symbol"&&rr!==null&&rr!==void 0&&s.push((""+rr).replace(be,Ie)),O(s,zl,Pr),s.push(J("style"));var Ha=null}else{var ar=E.styles.get(nr);if((v.styleResources.hasOwnProperty(xi)?v.styleResources[xi]:void 0)!==null){v.styleResources[xi]=null,ar||(ar={precedence:j(nr),rules:[],hrefs:[],sheets:new Map},E.styles.set(nr,ar));var Hl=E.nonce.style;if(!Hl||Hl===kl){ar.hrefs.push(j(xi));var Gl=ar.rules,sr=null,Is=null,oa;for(oa in f)if(F.call(f,oa)){var or=f[oa];if(or!=null)switch(oa){case"children":sr=or;break;case"dangerouslySetInnerHTML":Is=or}}var Dr=Array.isArray(sr)?2>sr.length?sr[0]:null:sr;typeof Dr!="function"&&typeof Dr!="symbol"&&Dr!==null&&Dr!==void 0&&Gl.push((""+Dr).replace(be,Ie)),O(Gl,Is,sr)}}ar&&k&&k.styles.add(ar),q&&s.push("<!-- -->"),Ha=void 0}return Ha;case"meta":var Ai=ge.tagScope&1,Fo=ge.tagScope&4;if(ge.insertionMode===4||Ai||f.itemProp!=null)var Vl=Ne(s,f,"meta");else q&&s.push("<!-- -->"),Vl=Fo?null:typeof f.charSet=="string"?Ne(E.charsetChunks,f,"meta"):f.name==="viewport"?Ne(E.viewportChunks,f,"meta"):Ne(E.hoistableChunks,f,"meta");return Vl;case"listing":case"pre":s.push(We(l));var Ga=null,a=null,o;for(o in f)if(F.call(f,o)){var h=f[o];if(h!=null)switch(o){case"children":Ga=h;break;case"dangerouslySetInnerHTML":a=h;break;default:it(s,o,h)}}if(s.push(">"),a!=null){if(Ga!=null)throw Error(t(60));if(typeof a!="object"||!("__html"in a))throw Error(t(61));var _=a.__html;_!=null&&(typeof _=="string"&&0<_.length&&_[0]===`
`?s.push(`
`,_):s.push(""+_))}return typeof Ga=="string"&&Ga[0]===`
`&&s.push(`
`),Ga;case"img":var y=ge.tagScope&3,P=f.src,N=f.srcSet;if(!(f.loading==="lazy"||!P&&!N||typeof P!="string"&&P!=null||typeof N!="string"&&N!=null||f.fetchPriority==="low"||y)&&(typeof P!="string"||P[4]!==":"||P[0]!=="d"&&P[0]!=="D"||P[1]!=="a"&&P[1]!=="A"||P[2]!=="t"&&P[2]!=="T"||P[3]!=="a"&&P[3]!=="A")&&(typeof N!="string"||N[4]!==":"||N[0]!=="d"&&N[0]!=="D"||N[1]!=="a"&&N[1]!=="A"||N[2]!=="t"&&N[2]!=="T"||N[3]!=="a"&&N[3]!=="A")){k!==null&&ge.tagScope&64&&(k.suspenseyImages=!0);var ee=typeof f.sizes=="string"?f.sizes:void 0,V=N?N+`
`+(ee||""):P,te=E.preloads.images,de=te.get(V);if(de)(f.fetchPriority==="high"||10>E.highImagePreloads.size)&&(te.delete(V),E.highImagePreloads.add(de));else if(!v.imageResources.hasOwnProperty(V)){v.imageResources[V]=me;var ve=f.crossOrigin,Be=typeof ve=="string"?ve==="use-credentials"?ve:"":void 0,Ye=E.headers,Bt;Ye&&0<Ye.remainingCapacity&&typeof f.srcSet!="string"&&(f.fetchPriority==="high"||500>Ye.highImagePreloads.length)&&(Bt=Q(P,"image",{imageSrcSet:f.srcSet,imageSizes:f.sizes,crossOrigin:Be,integrity:f.integrity,nonce:f.nonce,type:f.type,fetchPriority:f.fetchPriority,referrerPolicy:f.refererPolicy}),0<=(Ye.remainingCapacity-=Bt.length+2))?(E.resets.image[V]=me,Ye.highImagePreloads&&(Ye.highImagePreloads+=", "),Ye.highImagePreloads+=Bt):(de=[],ae(de,{rel:"preload",as:"image",href:N?void 0:P,imageSrcSet:N,imageSizes:ee,crossOrigin:Be,integrity:f.integrity,type:f.type,fetchPriority:f.fetchPriority,referrerPolicy:f.referrerPolicy}),f.fetchPriority==="high"||10>E.highImagePreloads.size?E.highImagePreloads.add(de):(E.bulkPreloads.add(de),te.set(V,de)))}}return Ne(s,f,"img");case"base":case"area":case"br":case"col":case"embed":case"hr":case"keygen":case"param":case"source":case"track":case"wbr":return Ne(s,f,l);case"annotation-xml":case"color-profile":case"font-face":case"font-face-src":case"font-face-uri":case"font-face-format":case"font-face-name":case"missing-glyph":break;case"head":if(2>ge.insertionMode){var yt=L||E.preamble;if(yt.headChunks)throw Error(t(545,"`<head>`"));L!==null&&s.push("<!--head-->"),yt.headChunks=[];var At=ze(yt.headChunks,f,"head")}else At=rt(s,f,"head");return At;case"body":if(2>ge.insertionMode){var hn=L||E.preamble;if(hn.bodyChunks)throw Error(t(545,"`<body>`"));L!==null&&s.push("<!--body-->"),hn.bodyChunks=[];var tn=ze(hn.bodyChunks,f,"body")}else tn=rt(s,f,"body");return tn;case"html":if(ge.insertionMode===0){var Bn=L||E.preamble;if(Bn.htmlChunks)throw Error(t(545,"`<html>`"));L!==null&&s.push("<!--html-->"),Bn.htmlChunks=[""];var li=ze(Bn.htmlChunks,f,"html")}else li=rt(s,f,"html");return li;default:if(l.indexOf("-")!==-1){s.push(We(l));var Ri=null,dt=null,qn;for(qn in f)if(F.call(f,qn)){var xn=f[qn];if(xn!=null){var ei=qn;switch(qn){case"children":Ri=xn;break;case"dangerouslySetInnerHTML":dt=xn;break;case"style":$t(s,xn);break;case"suppressContentEditableWarning":case"suppressHydrationWarning":case"ref":break;case"className":ei="class";default:if(pe(qn)&&typeof xn!="function"&&typeof xn!="symbol"&&xn!==!1){if(xn===!0)xn="";else if(typeof xn=="object")continue;s.push(" ",ei,'="',j(xn),'"')}}}}return s.push(">"),O(s,dt,Ri),Ri}}return rt(s,f,l)}var ht=new Map;function J(s){var l=ht.get(s);return l===void 0&&(l="</"+s+">",ht.set(s,l)),l}function Ue(s,l){s=s.preamble,s.htmlChunks===null&&l.htmlChunks&&(s.htmlChunks=l.htmlChunks),s.headChunks===null&&l.headChunks&&(s.headChunks=l.headChunks),s.bodyChunks===null&&l.bodyChunks&&(s.bodyChunks=l.bodyChunks)}function Te(s,l){l=l.bootstrapChunks;for(var f=0;f<l.length-1;f++)s.push(l[f]);return f<l.length?(f=l[f],l.length=0,s.push(f)):!0}function Oe(s,l,f){if(s.push('<!--$?--><template id="'),f===null)throw Error(t(395));return s.push(l.boundaryPrefix),l=f.toString(16),s.push(l),s.push('"></template>')}function Fe(s,l,f,v){switch(f.insertionMode){case 0:case 1:case 3:case 2:return s.push('<div hidden id="'),s.push(l.segmentPrefix),l=v.toString(16),s.push(l),s.push('">');case 4:return s.push('<svg aria-hidden="true" style="display:none" id="'),s.push(l.segmentPrefix),l=v.toString(16),s.push(l),s.push('">');case 5:return s.push('<math aria-hidden="true" style="display:none" id="'),s.push(l.segmentPrefix),l=v.toString(16),s.push(l),s.push('">');case 6:return s.push('<table hidden id="'),s.push(l.segmentPrefix),l=v.toString(16),s.push(l),s.push('">');case 7:return s.push('<table hidden><tbody id="'),s.push(l.segmentPrefix),l=v.toString(16),s.push(l),s.push('">');case 8:return s.push('<table hidden><tr id="'),s.push(l.segmentPrefix),l=v.toString(16),s.push(l),s.push('">');case 9:return s.push('<table hidden><colgroup id="'),s.push(l.segmentPrefix),l=v.toString(16),s.push(l),s.push('">');default:throw Error(t(397))}}function Re(s,l){switch(l.insertionMode){case 0:case 1:case 3:case 2:return s.push("</div>");case 4:return s.push("</svg>");case 5:return s.push("</math>");case 6:return s.push("</table>");case 7:return s.push("</tbody></table>");case 8:return s.push("</tr></table>");case 9:return s.push("</colgroup></table>");default:throw Error(t(397))}}var st=/[<\u2028\u2029]/g;function nt(s){return JSON.stringify(s).replace(st,function(l){switch(l){case"<":return"\\u003c";case"\u2028":return"\\u2028";case"\u2029":return"\\u2029";default:throw Error("escapeJSStringsForInstructionScripts encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React")}})}var ln=/[&><\u2028\u2029]/g;function Vt(s){return JSON.stringify(s).replace(ln,function(l){switch(l){case"&":return"\\u0026";case">":return"\\u003e";case"<":return"\\u003c";case"\u2028":return"\\u2028";case"\u2029":return"\\u2029";default:throw Error("escapeJSObjectForInstructionScripts encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React")}})}var Wn=!1,Jt=!0;function si(s){var l=s.rules,f=s.hrefs,v=0;if(f.length){for(this.push(he.startInlineStyle),this.push(' media="not all" data-precedence="'),this.push(s.precedence),this.push('" data-href="');v<f.length-1;v++)this.push(f[v]),this.push(" ");for(this.push(f[v]),this.push('">'),v=0;v<l.length;v++)this.push(l[v]);Jt=this.push("</style>"),Wn=!0,l.length=0,f.length=0}}function cn(s){return s.state!==2?Wn=!0:!1}function Xr(s,l,f){return Wn=!1,Jt=!0,he=f,l.styles.forEach(si,s),he=null,l.stylesheets.forEach(cn),Wn&&(f.stylesToHoist=!0),Jt}function Nn(s){for(var l=0;l<s.length;l++)this.push(s[l]);s.length=0}var un=[];function os(s){ae(un,s.props);for(var l=0;l<un.length;l++)this.push(un[l]);un.length=0,s.state=2}function ls(s){var l=0<s.sheets.size;s.sheets.forEach(os,this),s.sheets.clear();var f=s.rules,v=s.hrefs;if(!l||v.length){if(this.push(he.startInlineStyle),this.push(' data-precedence="'),this.push(s.precedence),s=0,v.length){for(this.push('" data-href="');s<v.length-1;s++)this.push(v[s]),this.push(" ");this.push(v[s])}for(this.push('">'),s=0;s<f.length;s++)this.push(f[s]);this.push("</style>"),f.length=0,v.length=0}}function Li(s){if(s.state===0){s.state=1;var l=s.props;for(ae(un,{rel:"preload",as:"style",href:s.props.href,crossOrigin:l.crossOrigin,fetchPriority:l.fetchPriority,integrity:l.integrity,media:l.media,hrefLang:l.hrefLang,referrerPolicy:l.referrerPolicy}),s=0;s<un.length;s++)this.push(un[s]);un.length=0}}function Ea(s){s.sheets.forEach(Li,this),s.sheets.clear()}function xr(s,l){(l.instructions&32)===0&&(l.instructions|=32,s.push(' id="',j("_"+l.idPrefix+"R_"),'"'))}function cs(s,l){s.push("[");var f="[";l.stylesheets.forEach(function(v){if(v.state!==2)if(v.state===3)s.push(f),v=Vt(""+v.props.href),s.push(v),s.push("]"),f=",[";else{s.push(f);var E=v.props["data-precedence"],L=v.props,k=K(""+v.props.href);k=Vt(k),s.push(k),E=""+E,s.push(","),E=Vt(E),s.push(E);for(var ge in L)if(F.call(L,ge)&&(E=L[ge],E!=null))switch(ge){case"href":case"rel":case"precedence":case"data-precedence":break;case"children":case"dangerouslySetInnerHTML":throw Error(t(399,"link"));default:Ut(s,ge,E)}s.push("]"),f=",[",v.state=3}}),s.push("]")}function Ut(s,l,f){var v=l.toLowerCase();switch(typeof f){case"function":case"symbol":return}switch(l){case"innerHTML":case"dangerouslySetInnerHTML":case"suppressContentEditableWarning":case"suppressHydrationWarning":case"style":case"ref":return;case"className":v="class",l=""+f;break;case"hidden":if(f===!1)return;l="";break;case"src":case"href":f=K(f),l=""+f;break;default:if(2<l.length&&(l[0]==="o"||l[0]==="O")&&(l[1]==="n"||l[1]==="N")||!pe(l))return;l=""+f}s.push(","),v=Vt(v),s.push(v),s.push(","),v=Vt(l),s.push(v)}function Qt(){return{styles:new Set,stylesheets:new Set,suspenseyImages:!1}}function zi(s){var l=Fn||null;if(l){var f=l.resumableState,v=l.renderState;if(typeof s=="string"&&s){if(!f.dnsResources.hasOwnProperty(s)){f.dnsResources[s]=null,f=v.headers;var E,L;(L=f&&0<f.remainingCapacity)&&(L=(E="<"+(""+s).replace(fe,le)+">; rel=dns-prefetch",0<=(f.remainingCapacity-=E.length+2))),L?(v.resets.dns[s]=null,f.preconnects&&(f.preconnects+=", "),f.preconnects+=E):(E=[],ae(E,{href:s,rel:"dns-prefetch"}),v.preconnects.add(E))}$r(l)}}else De.D(s)}function Xn(s,l){var f=Fn||null;if(f){var v=f.resumableState,E=f.renderState;if(typeof s=="string"&&s){var L=l==="use-credentials"?"credentials":typeof l=="string"?"anonymous":"default";if(!v.connectResources[L].hasOwnProperty(s)){v.connectResources[L][s]=null,v=E.headers;var k,ge;if(ge=v&&0<v.remainingCapacity){if(ge="<"+(""+s).replace(fe,le)+">; rel=preconnect",typeof l=="string"){var q=(""+l).replace(oe,Xe);ge+='; crossorigin="'+q+'"'}ge=(k=ge,0<=(v.remainingCapacity-=k.length+2))}ge?(E.resets.connect[L][s]=null,v.preconnects&&(v.preconnects+=", "),v.preconnects+=k):(L=[],ae(L,{rel:"preconnect",href:s,crossOrigin:l}),E.preconnects.add(L))}$r(f)}}else De.C(s,l)}function ro(s,l,f){var v=Fn||null;if(v){var E=v.resumableState,L=v.renderState;if(l&&s){switch(l){case"image":if(f)var k=f.imageSrcSet,ge=f.imageSizes,q=f.fetchPriority;var xe=k?k+`
`+(ge||""):s;if(E.imageResources.hasOwnProperty(xe))return;E.imageResources[xe]=me,E=L.headers;var Ae;E&&0<E.remainingCapacity&&typeof k!="string"&&q==="high"&&(Ae=Q(s,l,f),0<=(E.remainingCapacity-=Ae.length+2))?(L.resets.image[xe]=me,E.highImagePreloads&&(E.highImagePreloads+=", "),E.highImagePreloads+=Ae):(E=[],ae(E,w({rel:"preload",href:k?void 0:s,as:l},f)),q==="high"?L.highImagePreloads.add(E):(L.bulkPreloads.add(E),L.preloads.images.set(xe,E)));break;case"style":if(E.styleResources.hasOwnProperty(s))return;k=[],ae(k,w({rel:"preload",href:s,as:l},f)),E.styleResources[s]=!f||typeof f.crossOrigin!="string"&&typeof f.integrity!="string"?me:[f.crossOrigin,f.integrity],L.preloads.stylesheets.set(s,k),L.bulkPreloads.add(k);break;case"script":if(E.scriptResources.hasOwnProperty(s))return;k=[],L.preloads.scripts.set(s,k),L.bulkPreloads.add(k),ae(k,w({rel:"preload",href:s,as:l},f)),E.scriptResources[s]=!f||typeof f.crossOrigin!="string"&&typeof f.integrity!="string"?me:[f.crossOrigin,f.integrity];break;default:if(E.unknownResources.hasOwnProperty(l)){if(k=E.unknownResources[l],k.hasOwnProperty(s))return}else k={},E.unknownResources[l]=k;if(k[s]=me,(E=L.headers)&&0<E.remainingCapacity&&l==="font"&&(xe=Q(s,l,f),0<=(E.remainingCapacity-=xe.length+2)))L.resets.font[s]=me,E.fontPreloads&&(E.fontPreloads+=", "),E.fontPreloads+=xe;else switch(E=[],s=w({rel:"preload",href:s,as:l},f),ae(E,s),l){case"font":L.fontPreloads.add(E);break;default:L.bulkPreloads.add(E)}}$r(v)}}else De.L(s,l,f)}function us(s,l){var f=Fn||null;if(f){var v=f.resumableState,E=f.renderState;if(s){var L=l&&typeof l.as=="string"?l.as:"script";switch(L){case"script":if(v.moduleScriptResources.hasOwnProperty(s))return;L=[],v.moduleScriptResources[s]=!l||typeof l.crossOrigin!="string"&&typeof l.integrity!="string"?me:[l.crossOrigin,l.integrity],E.preloads.moduleScripts.set(s,L);break;default:if(v.moduleUnknownResources.hasOwnProperty(L)){var k=v.unknownResources[L];if(k.hasOwnProperty(s))return}else k={},v.moduleUnknownResources[L]=k;L=[],k[s]=me}ae(L,w({rel:"modulepreload",href:s},l)),E.bulkPreloads.add(L),$r(f)}}else De.m(s,l)}function ao(s,l,f){var v=Fn||null;if(v){var E=v.resumableState,L=v.renderState;if(s){l=l||"default";var k=L.styles.get(l),ge=E.styleResources.hasOwnProperty(s)?E.styleResources[s]:void 0;ge!==null&&(E.styleResources[s]=null,k||(k={precedence:j(l),rules:[],hrefs:[],sheets:new Map},L.styles.set(l,k)),l={state:0,props:w({rel:"stylesheet",href:s,"data-precedence":l},f)},ge&&(ge.length===2&&I(l.props,ge),(L=L.preloads.stylesheets.get(s))&&0<L.length?L.length=0:l.state=1),k.sheets.set(s,l),$r(v))}}else De.S(s,l,f)}function so(s,l){var f=Fn||null;if(f){var v=f.resumableState,E=f.renderState;if(s){var L=v.scriptResources.hasOwnProperty(s)?v.scriptResources[s]:void 0;L!==null&&(v.scriptResources[s]=null,l=w({src:s,async:!0},l),L&&(L.length===2&&I(l,L),s=E.preloads.scripts.get(s))&&(s.length=0),s=[],E.scripts.add(s),ye(s,l),$r(f))}}else De.X(s,l)}function pl(s,l){var f=Fn||null;if(f){var v=f.resumableState,E=f.renderState;if(s){var L=v.moduleScriptResources.hasOwnProperty(s)?v.moduleScriptResources[s]:void 0;L!==null&&(v.moduleScriptResources[s]=null,l=w({src:s,type:"module",async:!0},l),L&&(L.length===2&&I(l,L),s=E.preloads.moduleScripts.get(s))&&(s.length=0),s=[],E.scripts.add(s),ye(s,l),$r(f))}}else De.M(s,l)}function I(s,l){s.crossOrigin==null&&(s.crossOrigin=l[0]),s.integrity==null&&(s.integrity=l[1])}function Q(s,l,f){s=(""+s).replace(fe,le),l=(""+l).replace(oe,Xe),l="<"+s+'>; rel=preload; as="'+l+'"';for(var v in f)F.call(f,v)&&(s=f[v],typeof s=="string"&&(l+="; "+v.toLowerCase()+'="'+(""+s).replace(oe,Xe)+'"'));return l}var fe=/[<>\r\n]/g;function le(s){switch(s){case"<":return"%3C";case">":return"%3E";case`
`:return"%0A";case"\r":return"%0D";default:throw Error("escapeLinkHrefForHeaderContextReplacer encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React")}}var oe=/["';,\r\n]/g;function Xe(s){switch(s){case'"':return"%22";case"'":return"%27";case";":return"%3B";case",":return"%2C";case`
`:return"%0A";case"\r":return"%0D";default:throw Error("escapeStringForLinkHeaderQuotedParamValueContextReplacer encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React")}}function $e(s){this.styles.add(s)}function Ze(s){this.stylesheets.add(s)}function et(s,l){l.styles.forEach($e,s),l.stylesheets.forEach(Ze,s),l.suspenseyImages&&(s.suspenseyImages=!0)}function at(s,l){var f=s.idPrefix,v=[],E=s.bootstrapScriptContent,L=s.bootstrapScripts,k=s.bootstrapModules;E!==void 0&&(v.push("<script"),xr(v,s),v.push(">",(""+E).replace(we,Ve),"<\/script>")),E=f+"P:";var ge=f+"S:";f+="B:";var q=new Set,xe=new Set,Ae=new Set,Se=new Map,ke=new Set,lt=new Set,Dt=new Set,vt={images:new Map,stylesheets:new Map,scripts:new Map,moduleScripts:new Map};if(L!==void 0)for(var bt=0;bt<L.length;bt++){var _t=L[bt],Mt,fn=void 0,mn=void 0,zt={rel:"preload",as:"script",fetchPriority:"low",nonce:void 0};typeof _t=="string"?zt.href=Mt=_t:(zt.href=Mt=_t.src,zt.integrity=mn=typeof _t.integrity=="string"?_t.integrity:void 0,zt.crossOrigin=fn=typeof _t=="string"||_t.crossOrigin==null?void 0:_t.crossOrigin==="use-credentials"?"use-credentials":""),_t=s;var Wt=Mt;_t.scriptResources[Wt]=null,_t.moduleScriptResources[Wt]=null,_t=[],ae(_t,zt),ke.add(_t),v.push('<script src="',j(Mt),'"'),typeof mn=="string"&&v.push(' integrity="',j(mn),'"'),typeof fn=="string"&&v.push(' crossorigin="',j(fn),'"'),xr(v,s),v.push(' async=""><\/script>')}if(k!==void 0)for(L=0;L<k.length;L++)zt=k[L],fn=Mt=void 0,mn={rel:"modulepreload",fetchPriority:"low",nonce:void 0},typeof zt=="string"?mn.href=bt=zt:(mn.href=bt=zt.src,mn.integrity=fn=typeof zt.integrity=="string"?zt.integrity:void 0,mn.crossOrigin=Mt=typeof zt=="string"||zt.crossOrigin==null?void 0:zt.crossOrigin==="use-credentials"?"use-credentials":""),zt=s,_t=bt,zt.scriptResources[_t]=null,zt.moduleScriptResources[_t]=null,zt=[],ae(zt,mn),ke.add(zt),v.push('<script type="module" src="',j(bt),'"'),typeof fn=="string"&&v.push(' integrity="',j(fn),'"'),typeof Mt=="string"&&v.push(' crossorigin="',j(Mt),'"'),xr(v,s),v.push(' async=""><\/script>');return{placeholderPrefix:E,segmentPrefix:ge,boundaryPrefix:f,startInlineScript:"<script",startInlineStyle:"<style",preamble:{htmlChunks:null,headChunks:null,bodyChunks:null},externalRuntimeScript:null,bootstrapChunks:v,importMapChunks:[],onHeaders:void 0,headers:null,resets:{font:{},dns:{},connect:{default:{},anonymous:{},credentials:{}},image:{},style:{}},charsetChunks:[],viewportChunks:[],hoistableChunks:[],preconnects:q,fontPreloads:xe,highImagePreloads:Ae,styles:Se,bootstrapScripts:ke,scripts:lt,bulkPreloads:Dt,preloads:vt,nonce:{script:void 0,style:void 0},stylesToHoist:!1,generateStaticMarkup:l}}function ut(s,l,f,v){return f.generateStaticMarkup?(s.push(j(l)),!1):(l===""?s=v:(v&&s.push("<!-- -->"),s.push(j(l)),s=!0),s)}function ct(s,l,f,v){l.generateStaticMarkup||f&&v&&s.push("<!-- -->")}var ot=Function.prototype.bind,Yt=Symbol.for("react.client.reference");function en(s){if(s==null)return null;if(typeof s=="function")return s.$$typeof===Yt?null:s.displayName||s.name||null;if(typeof s=="string")return s;switch(s){case c:return"Fragment";case d:return"Profiler";case u:return"StrictMode";case b:return"Suspense";case x:return"SuspenseList";case T:return"Activity"}if(typeof s=="object")switch(s.$$typeof){case r:return"Portal";case p:return s.displayName||"Context";case m:return(s._context.displayName||"Context")+".Consumer";case g:var l=s.render;return s=s.displayName,s||(s=l.displayName||l.name||"",s=s!==""?"ForwardRef("+s+")":"ForwardRef"),s;case M:return l=s.displayName||null,l!==null?l:en(s.type)||"Memo";case A:l=s._payload,s=s._init;try{return en(s(l))}catch{}}return null}var gt={},Ct=null;function bn(s,l){if(s!==l){s.context._currentValue2=s.parentValue,s=s.parent;var f=l.parent;if(s===null){if(f!==null)throw Error(t(401))}else{if(f===null)throw Error(t(401));bn(s,f)}l.context._currentValue2=l.value}}function qe(s){s.context._currentValue2=s.parentValue,s=s.parent,s!==null&&qe(s)}function gn(s){var l=s.parent;l!==null&&gn(l),s.context._currentValue2=s.value}function Et(s,l){if(s.context._currentValue2=s.parentValue,s=s.parent,s===null)throw Error(t(402));s.depth===l.depth?bn(s,l):Et(s,l)}function Yn(s,l){var f=l.parent;if(f===null)throw Error(t(402));s.depth===f.depth?bn(s,f):Yn(s,f),l.context._currentValue2=l.value}function wn(s){var l=Ct;l!==s&&(l===null?gn(s):s===null?qe(l):l.depth===s.depth?bn(l,s):l.depth>s.depth?Et(l,s):Yn(l,s),Ct=s)}var Ni={enqueueSetState:function(s,l){s=s._reactInternals,s.queue!==null&&s.queue.push(l)},enqueueReplaceState:function(s,l){s=s._reactInternals,s.replace=!0,s.queue=[l]},enqueueForceUpdate:function(){}},vr={id:1,overflow:""};function Pt(s,l,f){var v=s.id;s=s.overflow;var E=32-rn(v)-1;v&=~(1<<E),f+=1;var L=32-rn(l)+E;if(30<L){var k=E-E%5;return L=(v&(1<<k)-1).toString(32),v>>=k,E-=k,{id:1<<32-rn(l)+E|f<<E|v,overflow:L+s}}return{id:1<<L|f<<E|v,overflow:s}}var rn=Math.clz32?Math.clz32:Gi,Hi=Math.log,qt=Math.LN2;function Gi(s){return s>>>=0,s===0?32:31-(Hi(s)/qt|0)|0}function _n(){}var Zn=Error(t(460));function Yu(s,l,f){switch(f=s[f],f===void 0?s.push(l):f!==l&&(l.then(_n,_n),l=f),l.status){case"fulfilled":return l.value;case"rejected":throw l.reason;default:switch(typeof l.status=="string"?l.then(_n,_n):(s=l,s.status="pending",s.then(function(v){if(l.status==="pending"){var E=l;E.status="fulfilled",E.value=v}},function(v){if(l.status==="pending"){var E=l;E.status="rejected",E.reason=v}})),l.status){case"fulfilled":return l.value;case"rejected":throw l.reason}throw oo=l,Zn}}var oo=null;function lo(){if(oo===null)throw Error(t(459));var s=oo;return oo=null,s}function Zu(s,l){return s===l&&(s!==0||1/s===1/l)||s!==s&&l!==l}var Rc=typeof Object.is=="function"?Object.is:Zu,qi=null,ml=null,gl=null,_l=null,co=null,an=null,hs=!1,uo=!1,fs=0,ds=0,ps=-1,ho=0,Ta=null,br=null,fo=0;function ji(){if(qi===null)throw Error(t(321));return qi}function Cc(){if(0<fo)throw Error(t(312));return{memoizedState:null,queue:null,next:null}}function xl(){return an===null?co===null?(hs=!1,co=an=Cc()):(hs=!0,an=co):an.next===null?(hs=!1,an=an.next=Cc()):(hs=!0,an=an.next),an}function wa(){var s=Ta;return Ta=null,s}function ms(){_l=gl=ml=qi=null,uo=!1,co=null,fo=0,an=br=null}function Pc(s,l){return typeof l=="function"?l(s):l}function Dc(s,l,f){if(qi=ji(),an=xl(),hs){var v=an.queue;if(l=v.dispatch,br!==null&&(f=br.get(v),f!==void 0)){br.delete(v),v=an.memoizedState;do v=s(v,f.action),f=f.next;while(f!==null);return an.memoizedState=v,[v,l]}return[an.memoizedState,l]}return s=s===Pc?typeof l=="function"?l():l:f!==void 0?f(l):l,an.memoizedState=s,s=an.queue={last:null,dispatch:null},s=s.dispatch=Ku.bind(null,qi,s),[an.memoizedState,s]}function Ic(s,l){if(qi=ji(),an=xl(),l=l===void 0?null:l,an!==null){var f=an.memoizedState;if(f!==null&&l!==null){var v=f[1];e:if(v===null)v=!1;else{for(var E=0;E<v.length&&E<l.length;E++)if(!Rc(l[E],v[E])){v=!1;break e}v=!0}if(v)return f[0]}}return s=s(),an.memoizedState=[s,l],s}function Ku(s,l,f){if(25<=fo)throw Error(t(301));if(s===qi)if(uo=!0,s={action:f,next:null},br===null&&(br=new Map),f=br.get(l),f===void 0)br.set(l,s);else{for(l=f;l.next!==null;)l=l.next;l.next=s}}function Ju(){throw Error(t(440))}function Qu(){throw Error(t(394))}function qu(){throw Error(t(479))}function vl(s,l,f){ji();var v=ds++,E=gl;if(typeof s.$$FORM_ACTION=="function"){var L=null,k=_l;E=E.formState;var ge=s.$$IS_SIGNATURE_EQUAL;if(E!==null&&typeof ge=="function"){var q=E[1];ge.call(s,E[2],E[3])&&(L=f!==void 0?"p"+f:"k"+W(JSON.stringify([k,null,v]),0),q===L&&(ps=v,l=E[0]))}var xe=s.bind(null,l);return s=function(Se){xe(Se)},typeof xe.$$FORM_ACTION=="function"&&(s.$$FORM_ACTION=function(Se){Se=xe.$$FORM_ACTION(Se),f!==void 0&&(f+="",Se.action=f);var ke=Se.data;return ke&&(L===null&&(L=f!==void 0?"p"+f:"k"+W(JSON.stringify([k,null,v]),0)),ke.append("$ACTION_KEY",L)),Se}),[l,s,!1]}var Ae=s.bind(null,l);return[l,function(Se){Ae(Se)},!1]}function Lc(s){var l=ho;return ho+=1,Ta===null&&(Ta=[]),Yu(Ta,s,l)}function ju(){throw Error(t(393))}var Nc={readContext:function(s){return s._currentValue2},use:function(s){if(s!==null&&typeof s=="object"){if(typeof s.then=="function")return Lc(s);if(s.$$typeof===p)return s._currentValue2}throw Error(t(438,String(s)))},useContext:function(s){return ji(),s._currentValue2},useMemo:Ic,useReducer:Dc,useRef:function(s){qi=ji(),an=xl();var l=an.memoizedState;return l===null?(s={current:s},an.memoizedState=s):l},useState:function(s){return Dc(Pc,s)},useInsertionEffect:_n,useLayoutEffect:_n,useCallback:function(s,l){return Ic(function(){return s},l)},useImperativeHandle:_n,useEffect:_n,useDebugValue:_n,useDeferredValue:function(s,l){return ji(),l!==void 0?l:s},useTransition:function(){return ji(),[!1,Qu]},useId:function(){var s=ml.treeContext,l=s.overflow;s=s.id,s=(s&~(1<<32-rn(s)-1)).toString(32)+l;var f=po;if(f===null)throw Error(t(404));return l=fs++,s="_"+f.idPrefix+"R_"+s,0<l&&(s+="H"+l.toString(32)),s+"_"},useSyncExternalStore:function(s,l,f){if(f===void 0)throw Error(t(407));return f()},useOptimistic:function(s){return ji(),[s,qu]},useActionState:vl,useFormState:vl,useHostTransitionStatus:function(){return ji(),tt},useMemoCache:function(s){for(var l=Array(s),f=0;f<s;f++)l[f]=B;return l},useCacheRefresh:function(){return ju},useEffectEvent:function(){return Ju}},po=null,$u={getCacheForType:function(){throw Error(t(248))},cacheSignal:function(){throw Error(t(248))}},bl,Fc;function Aa(s){if(bl===void 0)try{throw Error()}catch(f){var l=f.stack.trim().match(/\n( *(at )?)/);bl=l&&l[1]||"",Fc=-1<f.stack.indexOf(`
    at`)?" (<anonymous>)":-1<f.stack.indexOf("@")?"@unknown:0:0":""}return`
`+bl+s+Fc}var Ml=!1;function mo(s,l){if(!s||Ml)return"";Ml=!0;var f=Error.prepareStackTrace;Error.prepareStackTrace=void 0;try{var v={DetermineComponentFrameRoot:function(){try{if(l){var Se=function(){throw Error()};if(Object.defineProperty(Se.prototype,"props",{set:function(){throw Error()}}),typeof Reflect=="object"&&Reflect.construct){try{Reflect.construct(Se,[])}catch(lt){var ke=lt}Reflect.construct(s,[],Se)}else{try{Se.call()}catch(lt){ke=lt}s.call(Se.prototype)}}else{try{throw Error()}catch(lt){ke=lt}(Se=s())&&typeof Se.catch=="function"&&Se.catch(function(){})}}catch(lt){if(lt&&ke&&typeof lt.stack=="string")return[lt.stack,ke.stack]}return[null,null]}};v.DetermineComponentFrameRoot.displayName="DetermineComponentFrameRoot";var E=Object.getOwnPropertyDescriptor(v.DetermineComponentFrameRoot,"name");E&&E.configurable&&Object.defineProperty(v.DetermineComponentFrameRoot,"name",{value:"DetermineComponentFrameRoot"});var L=v.DetermineComponentFrameRoot(),k=L[0],ge=L[1];if(k&&ge){var q=k.split(`
`),xe=ge.split(`
`);for(E=v=0;v<q.length&&!q[v].includes("DetermineComponentFrameRoot");)v++;for(;E<xe.length&&!xe[E].includes("DetermineComponentFrameRoot");)E++;if(v===q.length||E===xe.length)for(v=q.length-1,E=xe.length-1;1<=v&&0<=E&&q[v]!==xe[E];)E--;for(;1<=v&&0<=E;v--,E--)if(q[v]!==xe[E]){if(v!==1||E!==1)do if(v--,E--,0>E||q[v]!==xe[E]){var Ae=`
`+q[v].replace(" at new "," at ");return s.displayName&&Ae.includes("<anonymous>")&&(Ae=Ae.replace("<anonymous>",s.displayName)),Ae}while(1<=v&&0<=E);break}}}finally{Ml=!1,Error.prepareStackTrace=f}return(f=s?s.displayName||s.name:"")?Aa(f):""}function Uc(s){if(typeof s=="string")return Aa(s);if(typeof s=="function")return s.prototype&&s.prototype.isReactComponent?mo(s,!0):mo(s,!1);if(typeof s=="object"&&s!==null){switch(s.$$typeof){case g:return mo(s.render,!1);case M:return mo(s.type,!1);case A:var l=s,f=l._payload;l=l._init;try{s=l(f)}catch{return Aa("Lazy")}return Uc(s)}if(typeof s.name=="string"){e:{f=s.name,l=s.env;var v=s.debugLocation;if(v!=null&&(s=Error.prepareStackTrace,Error.prepareStackTrace=void 0,v=v.stack,Error.prepareStackTrace=s,v.startsWith(`Error: react-stack-top-frame
`)&&(v=v.slice(29)),s=v.indexOf(`
`),s!==-1&&(v=v.slice(s+1)),s=v.indexOf("react_stack_bottom_frame"),s!==-1&&(s=v.lastIndexOf(`
`,s)),s=s!==-1?v=v.slice(0,s):"",v=s.lastIndexOf(`
`),s=v===-1?s:s.slice(v+1),s.indexOf(f)!==-1)){f=`
`+s;break e}f=Aa(f+(l?" ["+l+"]":""))}return f}}switch(s){case x:return Aa("SuspenseList");case b:return Aa("Suspense")}return""}function Ra(s,l){return(500<l.byteSize||!1)&&l.contentPreamble===null}function eh(s){if(typeof s=="object"&&s!==null&&typeof s.environmentName=="string"){var l=s.environmentName;s=[s].slice(0),typeof s[0]=="string"?s.splice(0,1,"[%s] "+s[0]," "+l+" "):s.splice(0,0,"[%s]"," "+l+" "),s.unshift(console),l=ot.apply(console.error,s),l()}else console.error(s);return null}function th(s,l,f,v,E,L,k,ge,q,xe,Ae){var Se=new Set;this.destination=null,this.flushScheduled=!1,this.resumableState=s,this.renderState=l,this.rootFormatContext=f,this.progressiveChunkSize=v===void 0?12800:v,this.status=10,this.fatalError=null,this.pendingRootTasks=this.allPendingTasks=this.nextSegmentId=0,this.completedPreambleSegments=this.completedRootSegment=null,this.byteSize=0,this.abortableTasks=Se,this.pingedTasks=[],this.clientRenderedBoundaries=[],this.completedBoundaries=[],this.partialBoundaries=[],this.trackedPostpones=null,this.onError=E===void 0?eh:E,this.onPostpone=xe===void 0?_n:xe,this.onAllReady=L===void 0?_n:L,this.onShellReady=k===void 0?_n:k,this.onShellError=ge===void 0?_n:ge,this.onFatalError=q===void 0?_n:q,this.formState=Ae===void 0?null:Ae}function nh(s,l,f,v,E,L,k,ge,q,xe,Ae,Se){return l=new th(l,f,v,E,L,k,ge,q,xe,Ae,Se),f=Yr(l,0,null,v,!1,!1),f.parentFlushed=!0,s=go(l,null,s,-1,null,f,null,null,l.abortableTasks,null,v,null,vr,null,null),Mr(s),l.pingedTasks.push(s),l}var Fn=null;function Ca(s,l){s.pingedTasks.push(l),s.pingedTasks.length===1&&(s.flushScheduled=s.destination!==null,zc(s))}function yl(s,l,f,v,E){return f={status:0,rootSegmentID:-1,parentFlushed:!1,pendingTasks:0,row:l,completedSegments:[],byteSize:0,fallbackAbortableTasks:f,errorDigest:null,contentState:Qt(),fallbackState:Qt(),contentPreamble:v,fallbackPreamble:E,trackedContentKeyPath:null,trackedFallbackNode:null},l!==null&&(l.pendingTasks++,v=l.boundaries,v!==null&&(s.allPendingTasks++,f.pendingTasks++,v.push(f)),s=l.inheritedHoistables,s!==null&&et(f.contentState,s)),f}function go(s,l,f,v,E,L,k,ge,q,xe,Ae,Se,ke,lt,Dt){s.allPendingTasks++,E===null?s.pendingRootTasks++:E.pendingTasks++,lt!==null&&lt.pendingTasks++;var vt={replay:null,node:f,childIndex:v,ping:function(){return Ca(s,vt)},blockedBoundary:E,blockedSegment:L,blockedPreamble:k,hoistableState:ge,abortSet:q,keyPath:xe,formatContext:Ae,context:Se,treeContext:ke,row:lt,componentStack:Dt,thenableState:l};return q.add(vt),vt}function Oc(s,l,f,v,E,L,k,ge,q,xe,Ae,Se,ke,lt){s.allPendingTasks++,L===null?s.pendingRootTasks++:L.pendingTasks++,ke!==null&&ke.pendingTasks++,f.pendingTasks++;var Dt={replay:f,node:v,childIndex:E,ping:function(){return Ca(s,Dt)},blockedBoundary:L,blockedSegment:null,blockedPreamble:null,hoistableState:k,abortSet:ge,keyPath:q,formatContext:xe,context:Ae,treeContext:Se,row:ke,componentStack:lt,thenableState:l};return ge.add(Dt),Dt}function Yr(s,l,f,v,E,L){return{status:0,parentFlushed:!1,id:-1,index:l,chunks:[],children:[],preambleChildren:[],parentFormatContext:v,boundary:f,lastPushedText:E,textEmbedded:L}}function Mr(s){var l=s.node;if(typeof l=="object"&&l!==null)switch(l.$$typeof){case i:s.componentStack={parent:s.componentStack,type:l.type}}}function gs(s){return s===null?null:{parent:s.parent,type:"Suspense Fallback"}}function yr(s){var l={};return s&&Object.defineProperty(l,"componentStack",{configurable:!0,enumerable:!0,get:function(){try{var f="",v=s;do f+=Uc(v.type),v=v.parent;while(v);var E=f}catch(L){E=`
Error generating stack: `+L.message+`
`+L.stack}return Object.defineProperty(l,"componentStack",{value:E}),E}}),l}function Kn(s,l,f){if(s=s.onError,l=s(l,f),l==null||typeof l=="string")return l}function Pa(s,l){var f=s.onShellError,v=s.onFatalError;f(l),v(l),s.destination!==null?(s.status=14,s.destination.destroy(l)):(s.status=13,s.fatalError=l)}function sn(s,l){Vi(s,l.next,l.hoistables)}function Vi(s,l,f){for(;l!==null;){f!==null&&(et(l.hoistables,f),l.inheritedHoistables=f);var v=l.boundaries;if(v!==null){l.boundaries=null;for(var E=0;E<v.length;E++){var L=v[E];f!==null&&et(L.contentState,f),Sr(s,L,null,null)}}if(l.pendingTasks--,0<l.pendingTasks)break;f=l.hoistables,l=l.next}}function Sl(s,l){var f=l.boundaries;if(f!==null&&l.pendingTasks===f.length){for(var v=!0,E=0;E<f.length;E++){var L=f[E];if(L.pendingTasks!==1||L.parentFlushed||Ra(s,L)){v=!1;break}}v&&Vi(s,l,l.hoistables)}}function _s(s){var l={pendingTasks:1,boundaries:null,hoistables:Qt(),inheritedHoistables:null,together:!1,next:null};return s!==null&&0<s.pendingTasks&&(l.pendingTasks++,l.boundaries=[],s.next=l),l}function Bc(s,l,f,v,E){var L=l.keyPath,k=l.treeContext,ge=l.row;l.keyPath=f,f=v.length;var q=null;if(l.replay!==null){var xe=l.replay.slots;if(xe!==null&&typeof xe=="object")for(var Ae=0;Ae<f;Ae++){var Se=E!=="backwards"&&E!=="unstable_legacy-backwards"?Ae:f-1-Ae,ke=v[Se];l.row=q=_s(q),l.treeContext=Pt(k,f,Se);var lt=xe[Se];typeof lt=="number"?(xo(s,l,lt,ke,Se),delete xe[Se]):Pn(s,l,ke,Se),--q.pendingTasks===0&&sn(s,q)}else for(xe=0;xe<f;xe++)Ae=E!=="backwards"&&E!=="unstable_legacy-backwards"?xe:f-1-xe,Se=v[Ae],l.row=q=_s(q),l.treeContext=Pt(k,f,Ae),Pn(s,l,Se,Ae),--q.pendingTasks===0&&sn(s,q)}else if(E!=="backwards"&&E!=="unstable_legacy-backwards")for(E=0;E<f;E++)xe=v[E],l.row=q=_s(q),l.treeContext=Pt(k,f,E),Pn(s,l,xe,E),--q.pendingTasks===0&&sn(s,q);else{for(E=l.blockedSegment,xe=E.children.length,Ae=E.chunks.length,Se=f-1;0<=Se;Se--){ke=v[Se],l.row=q=_s(q),l.treeContext=Pt(k,f,Se),lt=Yr(s,Ae,null,l.formatContext,Se===0?E.lastPushedText:!0,!0),E.children.splice(xe,0,lt),l.blockedSegment=lt;try{Pn(s,l,ke,Se),ct(lt.chunks,s.renderState,lt.lastPushedText,lt.textEmbedded),lt.status=1,--q.pendingTasks===0&&sn(s,q)}catch(Dt){throw lt.status=s.status===12?3:4,Dt}}l.blockedSegment=E,E.lastPushedText=!1}ge!==null&&q!==null&&0<q.pendingTasks&&(ge.pendingTasks++,q.next=ge),l.treeContext=k,l.row=ge,l.keyPath=L}function El(s,l,f,v,E,L){var k=l.thenableState;for(l.thenableState=null,qi={},ml=l,gl=s,_l=f,ds=fs=0,ps=-1,ho=0,Ta=k,s=v(E,L);uo;)uo=!1,ds=fs=0,ps=-1,ho=0,fo+=1,an=null,s=v(E,L);return ms(),s}function kc(s,l,f,v,E,L,k){var ge=!1;if(L!==0&&s.formState!==null){var q=l.blockedSegment;if(q!==null){ge=!0,q=q.chunks;for(var xe=0;xe<L;xe++)xe===k?q.push("<!--F!-->"):q.push("<!--F-->")}}L=l.keyPath,l.keyPath=f,E?(f=l.treeContext,l.treeContext=Pt(f,1,0),Pn(s,l,v,-1),l.treeContext=f):ge?Pn(s,l,v,-1):yi(s,l,v,-1),l.keyPath=L}function _o(s,l,f,v,E,L){if(typeof v=="function")if(v.prototype&&v.prototype.isReactComponent){var k=E;if("ref"in E){k={};for(var ge in E)ge!=="ref"&&(k[ge]=E[ge])}var q=v.defaultProps;if(q){k===E&&(k=w({},k,E));for(var xe in q)k[xe]===void 0&&(k[xe]=q[xe])}E=k,k=gt,q=v.contextType,typeof q=="object"&&q!==null&&(k=q._currentValue2),k=new v(E,k);var Ae=k.state!==void 0?k.state:null;if(k.updater=Ni,k.props=E,k.state=Ae,q={queue:[],replace:!1},k._reactInternals=q,L=v.contextType,k.context=typeof L=="object"&&L!==null?L._currentValue2:gt,L=v.getDerivedStateFromProps,typeof L=="function"&&(L=L(E,Ae),Ae=L==null?Ae:w({},Ae,L),k.state=Ae),typeof v.getDerivedStateFromProps!="function"&&typeof k.getSnapshotBeforeUpdate!="function"&&(typeof k.UNSAFE_componentWillMount=="function"||typeof k.componentWillMount=="function"))if(v=k.state,typeof k.componentWillMount=="function"&&k.componentWillMount(),typeof k.UNSAFE_componentWillMount=="function"&&k.UNSAFE_componentWillMount(),v!==k.state&&Ni.enqueueReplaceState(k,k.state,null),q.queue!==null&&0<q.queue.length)if(v=q.queue,L=q.replace,q.queue=null,q.replace=!1,L&&v.length===1)k.state=v[0];else{for(q=L?v[0]:k.state,Ae=!0,L=L?1:0;L<v.length;L++)xe=v[L],xe=typeof xe=="function"?xe.call(k,q,E,void 0):xe,xe!=null&&(Ae?(Ae=!1,q=w({},q,xe)):w(q,xe));k.state=q}else q.queue=null;if(v=k.render(),s.status===12)throw null;E=l.keyPath,l.keyPath=f,yi(s,l,v,-1),l.keyPath=E}else{if(v=El(s,l,f,v,E,void 0),s.status===12)throw null;kc(s,l,f,v,fs!==0,ds,ps)}else if(typeof v=="string")if(k=l.blockedSegment,k===null)k=E.children,q=l.formatContext,Ae=l.keyPath,l.formatContext=Lt(q,v,E),l.keyPath=f,Pn(s,l,k,-1),l.formatContext=q,l.keyPath=Ae;else{if(Ae=je(k.chunks,v,E,s.resumableState,s.renderState,l.blockedPreamble,l.hoistableState,l.formatContext,k.lastPushedText),k.lastPushedText=!1,q=l.formatContext,L=l.keyPath,l.keyPath=f,(l.formatContext=Lt(q,v,E)).insertionMode===3){f=Yr(s,0,null,l.formatContext,!1,!1),k.preambleChildren.push(f),l.blockedSegment=f;try{f.status=6,Pn(s,l,Ae,-1),ct(f.chunks,s.renderState,f.lastPushedText,f.textEmbedded),f.status=1}finally{l.blockedSegment=k}}else Pn(s,l,Ae,-1);l.formatContext=q,l.keyPath=L;e:{switch(l=k.chunks,s=s.resumableState,v){case"title":case"style":case"script":case"area":case"base":case"br":case"col":case"embed":case"hr":case"img":case"input":case"keygen":case"link":case"meta":case"param":case"source":case"track":case"wbr":break e;case"body":if(1>=q.insertionMode){s.hasBody=!0;break e}break;case"html":if(q.insertionMode===0){s.hasHtml=!0;break e}break;case"head":if(1>=q.insertionMode)break e}l.push(J(v))}k.lastPushedText=!1}else{switch(v){case S:case u:case d:case c:v=l.keyPath,l.keyPath=f,yi(s,l,E.children,-1),l.keyPath=v;return;case T:v=l.blockedSegment,v===null?E.mode!=="hidden"&&(v=l.keyPath,l.keyPath=f,Pn(s,l,E.children,-1),l.keyPath=v):E.mode!=="hidden"&&(s.renderState.generateStaticMarkup||v.chunks.push("<!--&-->"),v.lastPushedText=!1,k=l.keyPath,l.keyPath=f,Pn(s,l,E.children,-1),l.keyPath=k,s.renderState.generateStaticMarkup||v.chunks.push("<!--/&-->"),v.lastPushedText=!1);return;case x:e:{if(v=E.children,E=E.revealOrder,E==="forwards"||E==="backwards"||E==="unstable_legacy-backwards"){if(U(v)){Bc(s,l,f,v,E);break e}if((k=z(v))&&(k=k.call(v))){if(q=k.next(),!q.done){do q=k.next();while(!q.done);Bc(s,l,f,v,E)}break e}}E==="together"?(E=l.keyPath,k=l.row,q=l.row=_s(null),q.boundaries=[],q.together=!0,l.keyPath=f,yi(s,l,v,-1),--q.pendingTasks===0&&sn(s,q),l.keyPath=E,l.row=k,k!==null&&0<q.pendingTasks&&(k.pendingTasks++,q.next=k)):(E=l.keyPath,l.keyPath=f,yi(s,l,v,-1),l.keyPath=E)}return;case G:case C:throw Error(t(343));case b:e:if(l.replay!==null){v=l.keyPath,k=l.formatContext,q=l.row,l.keyPath=f,l.formatContext=mt(s.resumableState,k),l.row=null,f=E.children;try{Pn(s,l,f,-1)}finally{l.keyPath=v,l.formatContext=k,l.row=q}}else{v=l.keyPath,L=l.formatContext;var Se=l.row,ke=l.blockedBoundary;xe=l.blockedPreamble;var lt=l.hoistableState;ge=l.blockedSegment;var Dt=E.fallback;E=E.children;var vt=new Set,bt=yl(s,l.row,vt,null,null);s.trackedPostpones!==null&&(bt.trackedContentKeyPath=f);var _t=Yr(s,ge.chunks.length,bt,l.formatContext,!1,!1);ge.children.push(_t),ge.lastPushedText=!1;var Mt=Yr(s,0,null,l.formatContext,!1,!1);if(Mt.parentFlushed=!0,s.trackedPostpones!==null){k=l.componentStack,q=[f[0],"Suspense Fallback",f[2]],Ae=[q[1],q[2],[],null],s.trackedPostpones.workingMap.set(q,Ae),bt.trackedFallbackNode=Ae,l.blockedSegment=_t,l.blockedPreamble=bt.fallbackPreamble,l.keyPath=q,l.formatContext=kt(s.resumableState,L),l.componentStack=gs(k),_t.status=6;try{Pn(s,l,Dt,-1),ct(_t.chunks,s.renderState,_t.lastPushedText,_t.textEmbedded),_t.status=1}catch(fn){throw _t.status=s.status===12?3:4,fn}finally{l.blockedSegment=ge,l.blockedPreamble=xe,l.keyPath=v,l.formatContext=L}l=go(s,null,E,-1,bt,Mt,bt.contentPreamble,bt.contentState,l.abortSet,f,mt(s.resumableState,l.formatContext),l.context,l.treeContext,null,k),Mr(l),s.pingedTasks.push(l)}else{l.blockedBoundary=bt,l.blockedPreamble=bt.contentPreamble,l.hoistableState=bt.contentState,l.blockedSegment=Mt,l.keyPath=f,l.formatContext=mt(s.resumableState,L),l.row=null,Mt.status=6;try{if(Pn(s,l,E,-1),ct(Mt.chunks,s.renderState,Mt.lastPushedText,Mt.textEmbedded),Mt.status=1,vs(bt,Mt),bt.pendingTasks===0&&bt.status===0){if(bt.status=1,!Ra(s,bt)){Se!==null&&--Se.pendingTasks===0&&sn(s,Se),s.pendingRootTasks===0&&l.blockedPreamble&&Jr(s);break e}}else Se!==null&&Se.together&&Sl(s,Se)}catch(fn){bt.status=4,s.status===12?(Mt.status=3,k=s.fatalError):(Mt.status=4,k=fn),q=yr(l.componentStack),Ae=Kn(s,k,q),bt.errorDigest=Ae,Mo(s,bt)}finally{l.blockedBoundary=ke,l.blockedPreamble=xe,l.hoistableState=lt,l.blockedSegment=ge,l.keyPath=v,l.formatContext=L,l.row=Se}l=go(s,null,Dt,-1,ke,_t,bt.fallbackPreamble,bt.fallbackState,vt,[f[0],"Suspense Fallback",f[2]],kt(s.resumableState,l.formatContext),l.context,l.treeContext,l.row,gs(l.componentStack)),Mr(l),s.pingedTasks.push(l)}}return}if(typeof v=="object"&&v!==null)switch(v.$$typeof){case g:if("ref"in E)for(Dt in k={},E)Dt!=="ref"&&(k[Dt]=E[Dt]);else k=E;v=El(s,l,f,v.render,k,L),kc(s,l,f,v,fs!==0,ds,ps);return;case M:_o(s,l,f,v.type,E,L);return;case p:if(q=E.children,k=l.keyPath,E=E.value,Ae=v._currentValue2,v._currentValue2=E,L=Ct,Ct=v={parent:L,depth:L===null?0:L.depth+1,context:v,parentValue:Ae,value:E},l.context=v,l.keyPath=f,yi(s,l,q,-1),s=Ct,s===null)throw Error(t(403));s.context._currentValue2=s.parentValue,s=Ct=s.parent,l.context=s,l.keyPath=k;return;case m:E=E.children,v=E(v._context._currentValue2),E=l.keyPath,l.keyPath=f,yi(s,l,v,-1),l.keyPath=E;return;case A:if(k=v._init,v=k(v._payload),s.status===12)throw null;_o(s,l,f,v,E,L);return}throw Error(t(130,v==null?v:typeof v,""))}}function xo(s,l,f,v,E){var L=l.replay,k=l.blockedBoundary,ge=Yr(s,0,null,l.formatContext,!1,!1);ge.id=f,ge.parentFlushed=!0;try{l.replay=null,l.blockedSegment=ge,Pn(s,l,v,E),ge.status=1,k===null?s.completedRootSegment=ge:(vs(k,ge),k.parentFlushed&&s.partialBoundaries.push(k))}finally{l.replay=L,l.blockedSegment=null}}function yi(s,l,f,v){l.replay!==null&&typeof l.replay.slots=="number"?xo(s,l,l.replay.slots,f,v):(l.node=f,l.childIndex=v,f=l.componentStack,Mr(l),Tl(s,l),l.componentStack=f)}function Tl(s,l){var f=l.node,v=l.childIndex;if(f!==null){if(typeof f=="object"){switch(f.$$typeof){case i:var E=f.type,L=f.key,k=f.props;f=k.ref;var ge=f!==void 0?f:null,q=en(E),xe=L??(v===-1?0:v);if(L=[l.keyPath,q,xe],l.replay!==null)e:{var Ae=l.replay;for(v=Ae.nodes,f=0;f<v.length;f++){var Se=v[f];if(xe===Se[1]){if(Se.length===4){if(q!==null&&q!==Se[0])throw Error(t(490,Se[0],q));var ke=Se[2];q=Se[3],xe=l.node,l.replay={nodes:ke,slots:q,pendingTasks:1};try{if(_o(s,l,L,E,k,ge),l.replay.pendingTasks===1&&0<l.replay.nodes.length)throw Error(t(488));l.replay.pendingTasks--}catch(Wt){if(typeof Wt=="object"&&Wt!==null&&(Wt===Zn||typeof Wt.then=="function"))throw l.node===xe?l.replay=Ae:v.splice(f,1),Wt;l.replay.pendingTasks--,k=yr(l.componentStack),L=s,s=l.blockedBoundary,E=Wt,k=Kn(L,E,k),Zr(L,s,ke,q,E,k)}l.replay=Ae}else{if(E!==b)throw Error(t(490,"Suspense",en(E)||"Unknown"));t:{Ae=void 0,E=Se[5],ge=Se[2],q=Se[3],xe=Se[4]===null?[]:Se[4][2],Se=Se[4]===null?null:Se[4][3];var lt=l.keyPath,Dt=l.formatContext,vt=l.row,bt=l.replay,_t=l.blockedBoundary,Mt=l.hoistableState,fn=k.children,mn=k.fallback,zt=new Set;k=yl(s,l.row,zt,null,null),k.parentFlushed=!0,k.rootSegmentID=E,l.blockedBoundary=k,l.hoistableState=k.contentState,l.keyPath=L,l.formatContext=mt(s.resumableState,Dt),l.row=null,l.replay={nodes:ge,slots:q,pendingTasks:1};try{if(Pn(s,l,fn,-1),l.replay.pendingTasks===1&&0<l.replay.nodes.length)throw Error(t(488));if(l.replay.pendingTasks--,k.pendingTasks===0&&k.status===0){k.status=1,s.completedBoundaries.push(k);break t}}catch(Wt){k.status=4,ke=yr(l.componentStack),Ae=Kn(s,Wt,ke),k.errorDigest=Ae,l.replay.pendingTasks--,s.clientRenderedBoundaries.push(k)}finally{l.blockedBoundary=_t,l.hoistableState=Mt,l.replay=bt,l.keyPath=lt,l.formatContext=Dt,l.row=vt}ke=Oc(s,null,{nodes:xe,slots:Se,pendingTasks:0},mn,-1,_t,k.fallbackState,zt,[L[0],"Suspense Fallback",L[2]],kt(s.resumableState,l.formatContext),l.context,l.treeContext,l.row,gs(l.componentStack)),Mr(ke),s.pingedTasks.push(ke)}}v.splice(f,1);break e}}}else _o(s,l,L,E,k,ge);return;case r:throw Error(t(257));case A:if(ke=f._init,f=ke(f._payload),s.status===12)throw null;yi(s,l,f,v);return}if(U(f)){vo(s,l,f,v);return}if((ke=z(f))&&(ke=ke.call(f))){if(f=ke.next(),!f.done){k=[];do k.push(f.value),f=ke.next();while(!f.done);vo(s,l,k,v)}return}if(typeof f.then=="function")return l.thenableState=null,yi(s,l,Lc(f),v);if(f.$$typeof===p)return yi(s,l,f._currentValue2,v);throw v=Object.prototype.toString.call(f),Error(t(31,v==="[object Object]"?"object with keys {"+Object.keys(f).join(", ")+"}":v))}typeof f=="string"?(v=l.blockedSegment,v!==null&&(v.lastPushedText=ut(v.chunks,f,s.renderState,v.lastPushedText))):(typeof f=="number"||typeof f=="bigint")&&(v=l.blockedSegment,v!==null&&(v.lastPushedText=ut(v.chunks,""+f,s.renderState,v.lastPushedText)))}}function vo(s,l,f,v){var E=l.keyPath;if(v!==-1&&(l.keyPath=[l.keyPath,"Fragment",v],l.replay!==null)){for(var L=l.replay,k=L.nodes,ge=0;ge<k.length;ge++){var q=k[ge];if(q[1]===v){v=q[2],q=q[3],l.replay={nodes:v,slots:q,pendingTasks:1};try{if(vo(s,l,f,-1),l.replay.pendingTasks===1&&0<l.replay.nodes.length)throw Error(t(488));l.replay.pendingTasks--}catch(Se){if(typeof Se=="object"&&Se!==null&&(Se===Zn||typeof Se.then=="function"))throw Se;l.replay.pendingTasks--,f=yr(l.componentStack);var xe=l.blockedBoundary,Ae=Se;f=Kn(s,Ae,f),Zr(s,xe,v,q,Ae,f)}l.replay=L,k.splice(ge,1);break}}l.keyPath=E;return}if(L=l.treeContext,k=f.length,l.replay!==null&&(ge=l.replay.slots,ge!==null&&typeof ge=="object")){for(v=0;v<k;v++)q=f[v],l.treeContext=Pt(L,k,v),xe=ge[v],typeof xe=="number"?(xo(s,l,xe,q,v),delete ge[v]):Pn(s,l,q,v);l.treeContext=L,l.keyPath=E;return}for(ge=0;ge<k;ge++)v=f[ge],l.treeContext=Pt(L,k,ge),Pn(s,l,v,ge);l.treeContext=L,l.keyPath=E}function xs(s,l,f){if(f.status=5,f.rootSegmentID=s.nextSegmentId++,s=f.trackedContentKeyPath,s===null)throw Error(t(486));var v=f.trackedFallbackNode,E=[],L=l.workingMap.get(s);return L===void 0?(f=[s[1],s[2],E,null,v,f.rootSegmentID],l.workingMap.set(s,f),Wi(f,s[0],l),f):(L[4]=v,L[5]=f.rootSegmentID,L)}function bo(s,l,f,v){v.status=5;var E=f.keyPath,L=f.blockedBoundary;if(L===null)v.id=s.nextSegmentId++,l.rootSlots=v.id,s.completedRootSegment!==null&&(s.completedRootSegment.status=5);else{if(L!==null&&L.status===0){var k=xs(s,l,L);if(L.trackedContentKeyPath===E&&f.childIndex===-1){v.id===-1&&(v.id=v.parentFlushed?L.rootSegmentID:s.nextSegmentId++),k[3]=v.id;return}}if(v.id===-1&&(v.id=v.parentFlushed&&L!==null?L.rootSegmentID:s.nextSegmentId++),f.childIndex===-1)E===null?l.rootSlots=v.id:(f=l.workingMap.get(E),f===void 0?(f=[E[1],E[2],[],v.id],Wi(f,E[0],l)):f[3]=v.id);else{if(E===null){if(s=l.rootSlots,s===null)s=l.rootSlots={};else if(typeof s=="number")throw Error(t(491))}else if(L=l.workingMap,k=L.get(E),k===void 0)s={},k=[E[1],E[2],[],s],L.set(E,k),Wi(k,E[0],l);else if(s=k[3],s===null)s=k[3]={};else if(typeof s=="number")throw Error(t(491));s[f.childIndex]=v.id}}}function Mo(s,l){s=s.trackedPostpones,s!==null&&(l=l.trackedContentKeyPath,l!==null&&(l=s.workingMap.get(l),l!==void 0&&(l.length=4,l[2]=[],l[3]=null)))}function yo(s,l,f){return Oc(s,f,l.replay,l.node,l.childIndex,l.blockedBoundary,l.hoistableState,l.abortSet,l.keyPath,l.formatContext,l.context,l.treeContext,l.row,l.componentStack)}function So(s,l,f){var v=l.blockedSegment,E=Yr(s,v.chunks.length,null,l.formatContext,v.lastPushedText,!0);return v.children.push(E),v.lastPushedText=!1,go(s,f,l.node,l.childIndex,l.blockedBoundary,E,l.blockedPreamble,l.hoistableState,l.abortSet,l.keyPath,l.formatContext,l.context,l.treeContext,l.row,l.componentStack)}function Pn(s,l,f,v){var E=l.formatContext,L=l.context,k=l.keyPath,ge=l.treeContext,q=l.componentStack,xe=l.blockedSegment;if(xe===null){xe=l.replay;try{return yi(s,l,f,v)}catch(ke){if(ms(),f=ke===Zn?lo():ke,s.status!==12&&typeof f=="object"&&f!==null){if(typeof f.then=="function"){v=ke===Zn?wa():null,s=yo(s,l,v).ping,f.then(s,s),l.formatContext=E,l.context=L,l.keyPath=k,l.treeContext=ge,l.componentStack=q,l.replay=xe,wn(L);return}if(f.message==="Maximum call stack size exceeded"){f=ke===Zn?wa():null,f=yo(s,l,f),s.pingedTasks.push(f),l.formatContext=E,l.context=L,l.keyPath=k,l.treeContext=ge,l.componentStack=q,l.replay=xe,wn(L);return}}}}else{var Ae=xe.children.length,Se=xe.chunks.length;try{return yi(s,l,f,v)}catch(ke){if(ms(),xe.children.length=Ae,xe.chunks.length=Se,f=ke===Zn?lo():ke,s.status!==12&&typeof f=="object"&&f!==null){if(typeof f.then=="function"){xe=f,f=ke===Zn?wa():null,s=So(s,l,f).ping,xe.then(s,s),l.formatContext=E,l.context=L,l.keyPath=k,l.treeContext=ge,l.componentStack=q,wn(L);return}if(f.message==="Maximum call stack size exceeded"){xe=ke===Zn?wa():null,xe=So(s,l,xe),s.pingedTasks.push(xe),l.formatContext=E,l.context=L,l.keyPath=k,l.treeContext=ge,l.componentStack=q,wn(L);return}}}}throw l.formatContext=E,l.context=L,l.keyPath=k,l.treeContext=ge,wn(L),f}function ih(s){var l=s.blockedBoundary,f=s.blockedSegment;f!==null&&(f.status=3,Sr(this,l,s.row,f))}function Zr(s,l,f,v,E,L){for(var k=0;k<f.length;k++){var ge=f[k];if(ge.length===4)Zr(s,l,ge[2],ge[3],E,L);else{ge=ge[5];var q=s,xe=L,Ae=yl(q,null,new Set,null,null);Ae.parentFlushed=!0,Ae.rootSegmentID=ge,Ae.status=4,Ae.errorDigest=xe,Ae.parentFlushed&&q.clientRenderedBoundaries.push(Ae)}}if(f.length=0,v!==null){if(l===null)throw Error(t(487));if(l.status!==4&&(l.status=4,l.errorDigest=L,l.parentFlushed&&s.clientRenderedBoundaries.push(l)),typeof v=="object")for(var Se in v)delete v[Se]}}function wl(s,l,f){var v=s.blockedBoundary,E=s.blockedSegment;if(E!==null){if(E.status===6)return;E.status=3}var L=yr(s.componentStack);if(v===null){if(l.status!==13&&l.status!==14){if(v=s.replay,v===null){l.trackedPostpones!==null&&E!==null?(v=l.trackedPostpones,Kn(l,f,L),bo(l,v,s,E),Sr(l,null,s.row,E)):(Kn(l,f,L),Pa(l,f));return}v.pendingTasks--,v.pendingTasks===0&&0<v.nodes.length&&(E=Kn(l,f,L),Zr(l,null,v.nodes,v.slots,f,E)),l.pendingRootTasks--,l.pendingRootTasks===0&&Rl(l)}}else{var k=l.trackedPostpones;if(v.status!==4){if(k!==null&&E!==null)return Kn(l,f,L),bo(l,k,s,E),v.fallbackAbortableTasks.forEach(function(ge){return wl(ge,l,f)}),v.fallbackAbortableTasks.clear(),Sr(l,v,s.row,E);v.status=4,E=Kn(l,f,L),v.status=4,v.errorDigest=E,Mo(l,v),v.parentFlushed&&l.clientRenderedBoundaries.push(v)}v.pendingTasks--,E=v.row,E!==null&&--E.pendingTasks===0&&sn(l,E),v.fallbackAbortableTasks.forEach(function(ge){return wl(ge,l,f)}),v.fallbackAbortableTasks.clear()}s=s.row,s!==null&&--s.pendingTasks===0&&sn(l,s),l.allPendingTasks--,l.allPendingTasks===0&&Eo(l)}function Al(s,l){try{var f=s.renderState,v=f.onHeaders;if(v){var E=f.headers;if(E){f.headers=null;var L=E.preconnects;if(E.fontPreloads&&(L&&(L+=", "),L+=E.fontPreloads),E.highImagePreloads&&(L&&(L+=", "),L+=E.highImagePreloads),!l){var k=f.styles.values(),ge=k.next();e:for(;0<E.remainingCapacity&&!ge.done;ge=k.next())for(var q=ge.value.sheets.values(),xe=q.next();0<E.remainingCapacity&&!xe.done;xe=q.next()){var Ae=xe.value,Se=Ae.props,ke=Se.href,lt=Ae.props,Dt=Q(lt.href,"style",{crossOrigin:lt.crossOrigin,integrity:lt.integrity,nonce:lt.nonce,type:lt.type,fetchPriority:lt.fetchPriority,referrerPolicy:lt.referrerPolicy,media:lt.media});if(0<=(E.remainingCapacity-=Dt.length+2))f.resets.style[ke]=me,L&&(L+=", "),L+=Dt,f.resets.style[ke]=typeof Se.crossOrigin=="string"||typeof Se.integrity=="string"?[Se.crossOrigin,Se.integrity]:me;else break e}}v(L?{Link:L}:{})}}}catch(vt){Kn(s,vt,{})}}function Rl(s){s.trackedPostpones===null&&Al(s,!0),s.trackedPostpones===null&&Jr(s),s.onShellError=_n,s=s.onShellReady,s()}function Eo(s){Al(s,s.trackedPostpones===null?!0:s.completedRootSegment===null||s.completedRootSegment.status!==5),Jr(s),s=s.onAllReady,s()}function vs(s,l){if(l.chunks.length===0&&l.children.length===1&&l.children[0].boundary===null&&l.children[0].id===-1){var f=l.children[0];f.id=l.id,f.parentFlushed=!0,f.status!==1&&f.status!==3&&f.status!==4||vs(s,f)}else s.completedSegments.push(l)}function Sr(s,l,f,v){if(f!==null&&(--f.pendingTasks===0?sn(s,f):f.together&&Sl(s,f)),s.allPendingTasks--,l===null){if(v!==null&&v.parentFlushed){if(s.completedRootSegment!==null)throw Error(t(389));s.completedRootSegment=v}s.pendingRootTasks--,s.pendingRootTasks===0&&Rl(s)}else if(l.pendingTasks--,l.status!==4)if(l.pendingTasks===0){if(l.status===0&&(l.status=1),v!==null&&v.parentFlushed&&(v.status===1||v.status===3)&&vs(l,v),l.parentFlushed&&s.completedBoundaries.push(l),l.status===1)f=l.row,f!==null&&et(f.hoistables,l.contentState),Ra(s,l)||(l.fallbackAbortableTasks.forEach(ih,s),l.fallbackAbortableTasks.clear(),f!==null&&--f.pendingTasks===0&&sn(s,f)),s.pendingRootTasks===0&&s.trackedPostpones===null&&l.contentPreamble!==null&&Jr(s);else if(l.status===5&&(l=l.row,l!==null)){if(s.trackedPostpones!==null){f=s.trackedPostpones;var E=l.next;if(E!==null&&(v=E.boundaries,v!==null))for(E.boundaries=null,E=0;E<v.length;E++){var L=v[E];xs(s,f,L),Sr(s,L,null,null)}}--l.pendingTasks===0&&sn(s,l)}}else v===null||!v.parentFlushed||v.status!==1&&v.status!==3||(vs(l,v),l.completedSegments.length===1&&l.parentFlushed&&s.partialBoundaries.push(l)),l=l.row,l!==null&&l.together&&Sl(s,l);s.allPendingTasks===0&&Eo(s)}function zc(s){if(s.status!==14&&s.status!==13){var l=Ct,f=ue.H;ue.H=Nc;var v=ue.A;ue.A=$u;var E=Fn;Fn=s;var L=po;po=s.resumableState;try{var k=s.pingedTasks,ge;for(ge=0;ge<k.length;ge++){var q=k[ge],xe=s,Ae=q.blockedSegment;if(Ae===null){var Se=xe;if(q.replay.pendingTasks!==0){wn(q.context);try{if(typeof q.replay.slots=="number"?xo(Se,q,q.replay.slots,q.node,q.childIndex):Tl(Se,q),q.replay.pendingTasks===1&&0<q.replay.nodes.length)throw Error(t(488));q.replay.pendingTasks--,q.abortSet.delete(q),Sr(Se,q.blockedBoundary,q.row,null)}catch(dn){ms();var ke=dn===Zn?lo():dn;if(typeof ke=="object"&&ke!==null&&typeof ke.then=="function"){var lt=q.ping;ke.then(lt,lt),q.thenableState=dn===Zn?wa():null}else{q.replay.pendingTasks--,q.abortSet.delete(q);var Dt=yr(q.componentStack);xe=void 0;var vt=Se,bt=q.blockedBoundary,_t=Se.status===12?Se.fatalError:ke,Mt=q.replay.nodes,fn=q.replay.slots;xe=Kn(vt,_t,Dt),Zr(vt,bt,Mt,fn,_t,xe),Se.pendingRootTasks--,Se.pendingRootTasks===0&&Rl(Se),Se.allPendingTasks--,Se.allPendingTasks===0&&Eo(Se)}}finally{}}}else if(Se=void 0,vt=Ae,vt.status===0){vt.status=6,wn(q.context);var mn=vt.children.length,zt=vt.chunks.length;try{Tl(xe,q),ct(vt.chunks,xe.renderState,vt.lastPushedText,vt.textEmbedded),q.abortSet.delete(q),vt.status=1,Sr(xe,q.blockedBoundary,q.row,vt)}catch(dn){ms(),vt.children.length=mn,vt.chunks.length=zt;var Wt=dn===Zn?lo():xe.status===12?xe.fatalError:dn;if(xe.status===12&&xe.trackedPostpones!==null){var Ot=xe.trackedPostpones,oi=yr(q.componentStack);q.abortSet.delete(q),Kn(xe,Wt,oi),bo(xe,Ot,q,vt),Sr(xe,q.blockedBoundary,q.row,vt)}else if(typeof Wt=="object"&&Wt!==null&&typeof Wt.then=="function"){vt.status=0,q.thenableState=dn===Zn?wa():null;var Ht=q.ping;Wt.then(Ht,Ht)}else{var gi=yr(q.componentStack);q.abortSet.delete(q),vt.status=4;var Zt=q.blockedBoundary,Tn=q.row;if(Tn!==null&&--Tn.pendingTasks===0&&sn(xe,Tn),xe.allPendingTasks--,Se=Kn(xe,Wt,gi),Zt===null)Pa(xe,Wt);else if(Zt.pendingTasks--,Zt.status!==4){Zt.status=4,Zt.errorDigest=Se,Mo(xe,Zt);var An=Zt.row;An!==null&&--An.pendingTasks===0&&sn(xe,An),Zt.parentFlushed&&xe.clientRenderedBoundaries.push(Zt),xe.pendingRootTasks===0&&xe.trackedPostpones===null&&Zt.contentPreamble!==null&&Jr(xe)}xe.allPendingTasks===0&&Eo(xe)}}finally{}}}k.splice(0,ge),s.destination!==null&&To(s,s.destination)}catch(dn){Kn(s,dn,{}),Pa(s,dn)}finally{po=L,ue.H=f,ue.A=v,f===Nc&&wn(l),Fn=E}}}function Kr(s,l,f){l.preambleChildren.length&&f.push(l.preambleChildren);for(var v=!1,E=0;E<l.children.length;E++)v=bs(s,l.children[E],f)||v;return v}function bs(s,l,f){var v=l.boundary;if(v===null)return Kr(s,l,f);var E=v.contentPreamble,L=v.fallbackPreamble;if(E===null||L===null)return!1;switch(v.status){case 1:if(Ue(s.renderState,E),s.byteSize+=v.byteSize,l=v.completedSegments[0],!l)throw Error(t(391));return Kr(s,l,f);case 5:if(s.trackedPostpones!==null)return!0;case 4:if(l.status===1)return Ue(s.renderState,L),Kr(s,l,f);default:return!0}}function Jr(s){if(s.completedRootSegment&&s.completedPreambleSegments===null){var l=[],f=s.byteSize,v=bs(s,s.completedRootSegment,l),E=s.renderState.preamble;v===!1||E.headChunks&&E.bodyChunks?s.completedPreambleSegments=l:s.byteSize=f}}function Da(s,l,f,v){switch(f.parentFlushed=!0,f.status){case 0:f.id=s.nextSegmentId++;case 5:return v=f.id,f.lastPushedText=!1,f.textEmbedded=!1,s=s.renderState,l.push('<template id="'),l.push(s.placeholderPrefix),s=v.toString(16),l.push(s),l.push('"></template>');case 1:f.status=2;var E=!0,L=f.chunks,k=0;f=f.children;for(var ge=0;ge<f.length;ge++){for(E=f[ge];k<E.index;k++)l.push(L[k]);E=qr(s,l,E,v)}for(;k<L.length-1;k++)l.push(L[k]);return k<L.length&&(E=l.push(L[k])),E;case 3:return!0;default:throw Error(t(390))}}var Qr=0;function qr(s,l,f,v){var E=f.boundary;if(E===null)return Da(s,l,f,v);if(E.parentFlushed=!0,E.status===4){var L=E.row;return L!==null&&--L.pendingTasks===0&&sn(s,L),s.renderState.generateStaticMarkup||(E=E.errorDigest,l.push("<!--$!-->"),l.push("<template"),E&&(l.push(' data-dgst="'),E=j(E),l.push(E),l.push('"')),l.push("></template>")),Da(s,l,f,v),s=s.renderState.generateStaticMarkup?!0:l.push("<!--/$-->"),s}if(E.status!==1)return E.status===0&&(E.rootSegmentID=s.nextSegmentId++),0<E.completedSegments.length&&s.partialBoundaries.push(E),Oe(l,s.renderState,E.rootSegmentID),v&&et(v,E.fallbackState),Da(s,l,f,v),l.push("<!--/$-->");if(!Ms&&Ra(s,E)&&Qr+E.byteSize>s.progressiveChunkSize)return E.rootSegmentID=s.nextSegmentId++,s.completedBoundaries.push(E),Oe(l,s.renderState,E.rootSegmentID),Da(s,l,f,v),l.push("<!--/$-->");if(Qr+=E.byteSize,v&&et(v,E.contentState),f=E.row,f!==null&&Ra(s,E)&&--f.pendingTasks===0&&sn(s,f),s.renderState.generateStaticMarkup||l.push("<!--$-->"),f=E.completedSegments,f.length!==1)throw Error(t(391));return qr(s,l,f[0],v),s=s.renderState.generateStaticMarkup?!0:l.push("<!--/$-->"),s}function Cl(s,l,f,v){return Fe(l,s.renderState,f.parentFormatContext,f.id),qr(s,l,f,v),Re(l,f.parentFormatContext)}function Hc(s,l,f){Qr=f.byteSize;for(var v=f.completedSegments,E=0;E<v.length;E++)jr(s,l,f,v[E]);v.length=0,v=f.row,v!==null&&Ra(s,f)&&--v.pendingTasks===0&&sn(s,v),Xr(l,f.contentState,s.renderState),v=s.resumableState,s=s.renderState,E=f.rootSegmentID,f=f.contentState;var L=s.stylesToHoist;return s.stylesToHoist=!1,l.push(s.startInlineScript),l.push(">"),L?((v.instructions&4)===0&&(v.instructions|=4,l.push('$RX=function(b,c,d,e,f){var a=document.getElementById(b);a&&(b=a.previousSibling,b.data="$!",a=a.dataset,c&&(a.dgst=c),d&&(a.msg=d),e&&(a.stck=e),f&&(a.cstck=f),b._reactRetry&&b._reactRetry())};')),(v.instructions&2)===0&&(v.instructions|=2,l.push(`$RB=[];$RV=function(a){$RT=performance.now();for(var b=0;b<a.length;b+=2){var c=a[b],e=a[b+1];null!==e.parentNode&&e.parentNode.removeChild(e);var f=c.parentNode;if(f){var g=c.previousSibling,h=0;do{if(c&&8===c.nodeType){var d=c.data;if("/$"===d||"/&"===d)if(0===h)break;else h--;else"$"!==d&&"$?"!==d&&"$~"!==d&&"$!"!==d&&"&"!==d||h++}d=c.nextSibling;f.removeChild(c);c=d}while(c);for(;e.firstChild;)f.insertBefore(e.firstChild,c);g.data="$";g._reactRetry&&requestAnimationFrame(g._reactRetry)}}a.length=0};
$RC=function(a,b){if(b=document.getElementById(b))(a=document.getElementById(a))?(a.previousSibling.data="$~",$RB.push(a,b),2===$RB.length&&("number"!==typeof $RT?requestAnimationFrame($RV.bind(null,$RB)):(a=performance.now(),setTimeout($RV.bind(null,$RB),2300>a&&2E3<a?2300-a:$RT+300-a)))):b.parentNode.removeChild(b)};`)),(v.instructions&8)===0?(v.instructions|=8,l.push(`$RM=new Map;$RR=function(n,w,p){function u(q){this._p=null;q()}for(var r=new Map,t=document,h,b,e=t.querySelectorAll("link[data-precedence],style[data-precedence]"),v=[],k=0;b=e[k++];)"not all"===b.getAttribute("media")?v.push(b):("LINK"===b.tagName&&$RM.set(b.getAttribute("href"),b),r.set(b.dataset.precedence,h=b));e=0;b=[];var l,a;for(k=!0;;){if(k){var f=p[e++];if(!f){k=!1;e=0;continue}var c=!1,m=0;var d=f[m++];if(a=$RM.get(d)){var g=a._p;c=!0}else{a=t.createElement("link");a.href=d;a.rel=
"stylesheet";for(a.dataset.precedence=l=f[m++];g=f[m++];)a.setAttribute(g,f[m++]);g=a._p=new Promise(function(q,x){a.onload=u.bind(a,q);a.onerror=u.bind(a,x)});$RM.set(d,a)}d=a.getAttribute("media");!g||d&&!matchMedia(d).matches||b.push(g);if(c)continue}else{a=v[e++];if(!a)break;l=a.getAttribute("data-precedence");a.removeAttribute("media")}c=r.get(l)||h;c===h&&(h=a);r.set(l,a);c?c.parentNode.insertBefore(a,c.nextSibling):(c=t.head,c.insertBefore(a,c.firstChild))}if(p=document.getElementById(n))p.previousSibling.data=
"$~";Promise.all(b).then($RC.bind(null,n,w),$RX.bind(null,n,"CSS failed to load"))};$RR("`)):l.push('$RR("')):((v.instructions&2)===0&&(v.instructions|=2,l.push(`$RB=[];$RV=function(a){$RT=performance.now();for(var b=0;b<a.length;b+=2){var c=a[b],e=a[b+1];null!==e.parentNode&&e.parentNode.removeChild(e);var f=c.parentNode;if(f){var g=c.previousSibling,h=0;do{if(c&&8===c.nodeType){var d=c.data;if("/$"===d||"/&"===d)if(0===h)break;else h--;else"$"!==d&&"$?"!==d&&"$~"!==d&&"$!"!==d&&"&"!==d||h++}d=c.nextSibling;f.removeChild(c);c=d}while(c);for(;e.firstChild;)f.insertBefore(e.firstChild,c);g.data="$";g._reactRetry&&requestAnimationFrame(g._reactRetry)}}a.length=0};
$RC=function(a,b){if(b=document.getElementById(b))(a=document.getElementById(a))?(a.previousSibling.data="$~",$RB.push(a,b),2===$RB.length&&("number"!==typeof $RT?requestAnimationFrame($RV.bind(null,$RB)):(a=performance.now(),setTimeout($RV.bind(null,$RB),2300>a&&2E3<a?2300-a:$RT+300-a)))):b.parentNode.removeChild(b)};`)),l.push('$RC("')),v=E.toString(16),l.push(s.boundaryPrefix),l.push(v),l.push('","'),l.push(s.segmentPrefix),l.push(v),L?(l.push('",'),cs(l,f)):l.push('"'),f=l.push(")<\/script>"),Te(l,s)&&f}function jr(s,l,f,v){if(v.status===2)return!0;var E=f.contentState,L=v.id;if(L===-1){if((v.id=f.rootSegmentID)===-1)throw Error(t(392));return Cl(s,l,v,E)}return L===f.rootSegmentID?Cl(s,l,v,E):(Cl(s,l,v,E),f=s.resumableState,s=s.renderState,l.push(s.startInlineScript),l.push(">"),(f.instructions&1)===0?(f.instructions|=1,l.push('$RS=function(a,b){a=document.getElementById(a);b=document.getElementById(b);for(a.parentNode.removeChild(a);a.firstChild;)b.parentNode.insertBefore(a.firstChild,b);b.parentNode.removeChild(b)};$RS("')):l.push('$RS("'),l.push(s.segmentPrefix),L=L.toString(16),l.push(L),l.push('","'),l.push(s.placeholderPrefix),l.push(L),l=l.push('")<\/script>'),l)}var Ms=!1;function To(s,l){try{if(!(0<s.pendingRootTasks)){var f,v=s.completedRootSegment;if(v!==null){if(v.status===5)return;var E=s.completedPreambleSegments;if(E===null)return;Qr=s.byteSize;var L=s.resumableState,k=s.renderState,ge=k.preamble,q=ge.htmlChunks,xe=ge.headChunks,Ae;if(q){for(Ae=0;Ae<q.length;Ae++)l.push(q[Ae]);if(xe)for(Ae=0;Ae<xe.length;Ae++)l.push(xe[Ae]);else{var Se=We("head");l.push(Se),l.push(">")}}else if(xe)for(Ae=0;Ae<xe.length;Ae++)l.push(xe[Ae]);var ke=k.charsetChunks;for(Ae=0;Ae<ke.length;Ae++)l.push(ke[Ae]);ke.length=0,k.preconnects.forEach(Nn,l),k.preconnects.clear();var lt=k.viewportChunks;for(Ae=0;Ae<lt.length;Ae++)l.push(lt[Ae]);lt.length=0,k.fontPreloads.forEach(Nn,l),k.fontPreloads.clear(),k.highImagePreloads.forEach(Nn,l),k.highImagePreloads.clear(),he=k,k.styles.forEach(ls,l),he=null;var Dt=k.importMapChunks;for(Ae=0;Ae<Dt.length;Ae++)l.push(Dt[Ae]);Dt.length=0,k.bootstrapScripts.forEach(Nn,l),k.scripts.forEach(Nn,l),k.scripts.clear(),k.bulkPreloads.forEach(Nn,l),k.bulkPreloads.clear(),L.instructions|=32;var vt=k.hoistableChunks;for(Ae=0;Ae<vt.length;Ae++)l.push(vt[Ae]);for(L=vt.length=0;L<E.length;L++){var bt=E[L];for(k=0;k<bt.length;k++)qr(s,l,bt[k],null)}var _t=s.renderState.preamble,Mt=_t.headChunks;if(_t.htmlChunks||Mt){var fn=J("head");l.push(fn)}var mn=_t.bodyChunks;if(mn)for(E=0;E<mn.length;E++)l.push(mn[E]);qr(s,l,v,null),s.completedRootSegment=null;var zt=s.renderState;if(s.allPendingTasks!==0||s.clientRenderedBoundaries.length!==0||s.completedBoundaries.length!==0||s.trackedPostpones!==null&&(s.trackedPostpones.rootNodes.length!==0||s.trackedPostpones.rootSlots!==null)){var Wt=s.resumableState;if((Wt.instructions&64)===0){if(Wt.instructions|=64,l.push(zt.startInlineScript),(Wt.instructions&32)===0){Wt.instructions|=32;var Ot="_"+Wt.idPrefix+"R_";l.push(' id="');var oi=j(Ot);l.push(oi),l.push('"')}l.push(">"),l.push("requestAnimationFrame(function(){$RT=performance.now()});"),l.push("<\/script>")}}Te(l,zt)}var Ht=s.renderState;v=0;var gi=Ht.viewportChunks;for(v=0;v<gi.length;v++)l.push(gi[v]);gi.length=0,Ht.preconnects.forEach(Nn,l),Ht.preconnects.clear(),Ht.fontPreloads.forEach(Nn,l),Ht.fontPreloads.clear(),Ht.highImagePreloads.forEach(Nn,l),Ht.highImagePreloads.clear(),Ht.styles.forEach(Ea,l),Ht.scripts.forEach(Nn,l),Ht.scripts.clear(),Ht.bulkPreloads.forEach(Nn,l),Ht.bulkPreloads.clear();var Zt=Ht.hoistableChunks;for(v=0;v<Zt.length;v++)l.push(Zt[v]);Zt.length=0;var Tn=s.clientRenderedBoundaries;for(f=0;f<Tn.length;f++){var An=Tn[f];Ht=l;var dn=s.resumableState,$n=s.renderState,ea=An.rootSegmentID,_i=An.errorDigest;Ht.push($n.startInlineScript),Ht.push(">"),(dn.instructions&4)===0?(dn.instructions|=4,Ht.push('$RX=function(b,c,d,e,f){var a=document.getElementById(b);a&&(b=a.previousSibling,b.data="$!",a=a.dataset,c&&(a.dgst=c),d&&(a.msg=d),e&&(a.stck=e),f&&(a.cstck=f),b._reactRetry&&b._reactRetry())};;$RX("')):Ht.push('$RX("'),Ht.push($n.boundaryPrefix);var ys=ea.toString(16);if(Ht.push(ys),Ht.push('"'),_i){Ht.push(",");var Ia=nt(_i||"");Ht.push(Ia)}var Jn=Ht.push(")<\/script>");if(!Jn){s.destination=null,f++,Tn.splice(0,f);return}}Tn.splice(0,f);var Si=s.completedBoundaries;for(f=0;f<Si.length;f++)if(!Hc(s,l,Si[f])){s.destination=null,f++,Si.splice(0,f);return}Si.splice(0,f),Ms=!0;var Fi=s.partialBoundaries;for(f=0;f<Fi.length;f++){var Ui=Fi[f];e:{Tn=s,An=l,Qr=Ui.byteSize;var $i=Ui.completedSegments;for(Jn=0;Jn<$i.length;Jn++)if(!jr(Tn,An,Ui,$i[Jn])){Jn++,$i.splice(0,Jn);var Er=!1;break e}$i.splice(0,Jn);var Dn=Ui.row;Dn!==null&&Dn.together&&Ui.pendingTasks===1&&(Dn.pendingTasks===1?Vi(Tn,Dn,Dn.hoistables):Dn.pendingTasks--),Er=Xr(An,Ui.contentState,Tn.renderState)}if(!Er){s.destination=null,f++,Fi.splice(0,f);return}}Fi.splice(0,f),Ms=!1;var ta=s.completedBoundaries;for(f=0;f<ta.length;f++)if(!Hc(s,l,ta[f])){s.destination=null,f++,ta.splice(0,f);return}ta.splice(0,f)}}finally{Ms=!1,s.allPendingTasks===0&&s.clientRenderedBoundaries.length===0&&s.completedBoundaries.length===0&&(s.flushScheduled=!1,f=s.resumableState,f.hasBody&&(Fi=J("body"),l.push(Fi)),f.hasHtml&&(f=J("html"),l.push(f)),s.status=14,l.push(null),s.destination=null)}}function $r(s){if(s.flushScheduled===!1&&s.pingedTasks.length===0&&s.destination!==null){s.flushScheduled=!0;var l=s.destination;l?To(s,l):s.flushScheduled=!1}}function wo(s,l){if(s.status===13)s.status=14,l.destroy(s.fatalError);else if(s.status!==14&&s.destination===null){s.destination=l;try{To(s,l)}catch(f){Kn(s,f,{}),Pa(s,f)}}}function Gc(s,l){(s.status===11||s.status===10)&&(s.status=12);try{var f=s.abortableTasks;if(0<f.size){var v=l===void 0?Error(t(432)):typeof l=="object"&&l!==null&&typeof l.then=="function"?Error(t(530)):l;s.fatalError=v,f.forEach(function(E){return wl(E,s,v)}),f.clear()}s.destination!==null&&To(s,s.destination)}catch(E){Kn(s,E,{}),Pa(s,E)}}function Wi(s,l,f){if(l===null)f.rootNodes.push(s);else{var v=f.workingMap,E=v.get(l);E===void 0&&(E=[l[1],l[2],[],null],v.set(l,E),Wi(E,l[0],f)),E[2].push(s)}}function Ao(){}function Pl(s,l,f,v){var E=!1,L=null,k="",ge=!1;if(l=Ke(l?l.identifierPrefix:void 0),s=nh(s,l,at(l,f),Je(0,null,0,null),1/0,Ao,void 0,function(){ge=!0},void 0,void 0,void 0),s.flushScheduled=s.destination!==null,zc(s),s.status===10&&(s.status=11),s.trackedPostpones===null&&Al(s,s.pendingRootTasks===0),Gc(s,v),wo(s,{push:function(q){return q!==null&&(k+=q),!0},destroy:function(q){E=!0,L=q}}),E&&L!==v)throw L;if(!ge)throw Error(t(426));return k}return gc.renderToStaticMarkup=function(s,l){return Pl(s,l,!0,'The server used "renderToStaticMarkup" which does not support Suspense. If you intended to have the server wait for the suspended component please switch to "renderToReadableStream" which supports Suspense on the server')},gc.renderToString=function(s,l){return Pl(s,l,!1,'The server used "renderToString" which does not support Suspense. If you intended for this Suspense boundary to render the fallback content on the server consider throwing an Error somewhere within the Suspense boundary. If you intended to have the server wait for the suspended component please switch to "renderToReadableStream" which supports Suspense on the server')},gc.version="19.2.7",gc}var Js={};var mm;function SS(){if(mm)return Js;mm=1;var n=bm(),e=vm();function t(a){var o="https://react.dev/errors/"+a;if(1<arguments.length){o+="?args[]="+encodeURIComponent(arguments[1]);for(var h=2;h<arguments.length;h++)o+="&args[]="+encodeURIComponent(arguments[h])}return"Minified React error #"+a+"; visit "+o+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}var i=Symbol.for("react.transitional.element"),r=Symbol.for("react.portal"),c=Symbol.for("react.fragment"),u=Symbol.for("react.strict_mode"),d=Symbol.for("react.profiler"),m=Symbol.for("react.consumer"),p=Symbol.for("react.context"),g=Symbol.for("react.forward_ref"),b=Symbol.for("react.suspense"),x=Symbol.for("react.suspense_list"),M=Symbol.for("react.memo"),A=Symbol.for("react.lazy"),C=Symbol.for("react.scope"),T=Symbol.for("react.activity"),S=Symbol.for("react.legacy_hidden"),B=Symbol.for("react.memo_cache_sentinel"),G=Symbol.for("react.view_transition"),D=Symbol.iterator;function z(a){return a===null||typeof a!="object"?null:(a=D&&a[D]||a["@@iterator"],typeof a=="function"?a:null)}var U=Array.isArray;function W(a,o){var h=a.length&3,_=a.length-h,y=o;for(o=0;o<_;){var P=a.charCodeAt(o)&255|(a.charCodeAt(++o)&255)<<8|(a.charCodeAt(++o)&255)<<16|(a.charCodeAt(++o)&255)<<24;++o,P=3432918353*(P&65535)+((3432918353*(P>>>16)&65535)<<16)&4294967295,P=P<<15|P>>>17,P=461845907*(P&65535)+((461845907*(P>>>16)&65535)<<16)&4294967295,y^=P,y=y<<13|y>>>19,y=5*(y&65535)+((5*(y>>>16)&65535)<<16)&4294967295,y=(y&65535)+27492+(((y>>>16)+58964&65535)<<16)}switch(P=0,h){case 3:P^=(a.charCodeAt(o+2)&255)<<16;case 2:P^=(a.charCodeAt(o+1)&255)<<8;case 1:P^=a.charCodeAt(o)&255,P=3432918353*(P&65535)+((3432918353*(P>>>16)&65535)<<16)&4294967295,P=P<<15|P>>>17,y^=461845907*(P&65535)+((461845907*(P>>>16)&65535)<<16)&4294967295}return y^=a.length,y^=y>>>16,y=2246822507*(y&65535)+((2246822507*(y>>>16)&65535)<<16)&4294967295,y^=y>>>13,y=3266489909*(y&65535)+((3266489909*(y>>>16)&65535)<<16)&4294967295,(y^y>>>16)>>>0}var w=new MessageChannel,F=[];w.port1.onmessage=function(){var a=F.shift();a&&a()};function Z(a){F.push(a),w.port2.postMessage(null)}function X(a){setTimeout(function(){throw a})}var ne=Promise,pe=typeof queueMicrotask=="function"?queueMicrotask:function(a){ne.resolve(null).then(a).catch(X)},_e=null,re=0;function H(a,o){if(o.byteLength!==0)if(2048<o.byteLength)0<re&&(a.enqueue(new Uint8Array(_e.buffer,0,re)),_e=new Uint8Array(2048),re=0),a.enqueue(o);else{var h=_e.length-re;h<o.byteLength&&(h===0?a.enqueue(_e):(_e.set(o.subarray(0,h),re),a.enqueue(_e),o=o.subarray(h)),_e=new Uint8Array(2048),re=0),_e.set(o,re),re+=o.byteLength}}function j(a,o){return H(a,o),!0}function Ee(a){_e&&0<re&&(a.enqueue(new Uint8Array(_e.buffer,0,re)),_e=null,re=0)}var Ce=new TextEncoder;function ce(a){return Ce.encode(a)}function K(a){return Ce.encode(a)}function ue(a){return a.byteLength}function Pe(a,o){typeof a.error=="function"?a.error(o):a.close()}var tt=Object.assign,De=Object.prototype.hasOwnProperty,me=RegExp("^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"),he={},we={};function Ve(a){return De.call(we,a)?!0:De.call(he,a)?!1:me.test(a)?we[a]=!0:(he[a]=!0,!1)}var Ke=new Set("animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(" ")),Je=new Map([["acceptCharset","accept-charset"],["htmlFor","for"],["httpEquiv","http-equiv"],["crossOrigin","crossorigin"],["accentHeight","accent-height"],["alignmentBaseline","alignment-baseline"],["arabicForm","arabic-form"],["baselineShift","baseline-shift"],["capHeight","cap-height"],["clipPath","clip-path"],["clipRule","clip-rule"],["colorInterpolation","color-interpolation"],["colorInterpolationFilters","color-interpolation-filters"],["colorProfile","color-profile"],["colorRendering","color-rendering"],["dominantBaseline","dominant-baseline"],["enableBackground","enable-background"],["fillOpacity","fill-opacity"],["fillRule","fill-rule"],["floodColor","flood-color"],["floodOpacity","flood-opacity"],["fontFamily","font-family"],["fontSize","font-size"],["fontSizeAdjust","font-size-adjust"],["fontStretch","font-stretch"],["fontStyle","font-style"],["fontVariant","font-variant"],["fontWeight","font-weight"],["glyphName","glyph-name"],["glyphOrientationHorizontal","glyph-orientation-horizontal"],["glyphOrientationVertical","glyph-orientation-vertical"],["horizAdvX","horiz-adv-x"],["horizOriginX","horiz-origin-x"],["imageRendering","image-rendering"],["letterSpacing","letter-spacing"],["lightingColor","lighting-color"],["markerEnd","marker-end"],["markerMid","marker-mid"],["markerStart","marker-start"],["overlinePosition","overline-position"],["overlineThickness","overline-thickness"],["paintOrder","paint-order"],["panose-1","panose-1"],["pointerEvents","pointer-events"],["renderingIntent","rendering-intent"],["shapeRendering","shape-rendering"],["stopColor","stop-color"],["stopOpacity","stop-opacity"],["strikethroughPosition","strikethrough-position"],["strikethroughThickness","strikethrough-thickness"],["strokeDasharray","stroke-dasharray"],["strokeDashoffset","stroke-dashoffset"],["strokeLinecap","stroke-linecap"],["strokeLinejoin","stroke-linejoin"],["strokeMiterlimit","stroke-miterlimit"],["strokeOpacity","stroke-opacity"],["strokeWidth","stroke-width"],["textAnchor","text-anchor"],["textDecoration","text-decoration"],["textRendering","text-rendering"],["transformOrigin","transform-origin"],["underlinePosition","underline-position"],["underlineThickness","underline-thickness"],["unicodeBidi","unicode-bidi"],["unicodeRange","unicode-range"],["unitsPerEm","units-per-em"],["vAlphabetic","v-alphabetic"],["vHanging","v-hanging"],["vIdeographic","v-ideographic"],["vMathematical","v-mathematical"],["vectorEffect","vector-effect"],["vertAdvY","vert-adv-y"],["vertOriginX","vert-origin-x"],["vertOriginY","vert-origin-y"],["wordSpacing","word-spacing"],["writingMode","writing-mode"],["xmlnsXlink","xmlns:xlink"],["xHeight","x-height"]]),Lt=/["'&<>]/;function Le(a){if(typeof a=="boolean"||typeof a=="number"||typeof a=="bigint")return""+a;a=""+a;var o=Lt.exec(a);if(o){var h="",_,y=0;for(_=o.index;_<a.length;_++){switch(a.charCodeAt(_)){case 34:o="&quot;";break;case 38:o="&amp;";break;case 39:o="&#x27;";break;case 60:o="&lt;";break;case 62:o="&gt;";break;default:continue}y!==_&&(h+=a.slice(y,_)),y=_+1,h+=o}a=y!==_?h+a.slice(y,_):h}return a}var kt=/([A-Z])/g,mt=/^ms-/,Tt=/^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;function $t(a){return Tt.test(""+a)?"javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')":a}var Kt=n.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,wt=e.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,En={pending:!1,data:null,method:null,action:null},Nt=wt.d;wt.d={f:Nt.f,r:Nt.r,D:wl,C:Al,L:Rl,m:Eo,X:Sr,S:vs,M:zc};var Ft=[],$=null;K('"></template>');var Ln=K("<script"),it=K("<\/script>"),O=K('<script src="'),R=K('<script type="module" src="'),ie=K(' nonce="'),ae=K(' integrity="'),be=K(' crossorigin="'),Ie=K(' async=""><\/script>'),Ne=K("<style"),Me=/(<\/|<)(s)(cript)/gi;function ye(a,o,h,_){return""+o+(h==="s"?"\\u0073":"\\u0053")+_}var ze=K('<script type="importmap">'),rt=K("<\/script>");function Ge(a,o,h,_,y,P){h=typeof o=="string"?o:o&&o.script;var N=h===void 0?Ln:K('<script nonce="'+Le(h)+'"'),ee=typeof o=="string"?void 0:o&&o.style,V=ee===void 0?Ne:K('<style nonce="'+Le(ee)+'"'),te=a.idPrefix,de=[],ve=a.bootstrapScriptContent,Be=a.bootstrapScripts,Ye=a.bootstrapModules;if(ve!==void 0&&(de.push(N),xs(de,a),de.push(Qt,ce((""+ve).replace(Me,ye)),it)),ve=[],_!==void 0&&(ve.push(ze),ve.push(ce((""+JSON.stringify(_)).replace(Me,ye))),ve.push(rt)),_=y?{preconnects:"",fontPreloads:"",highImagePreloads:"",remainingCapacity:2+(typeof P=="number"?P:2e3)}:null,y={placeholderPrefix:K(te+"P:"),segmentPrefix:K(te+"S:"),boundaryPrefix:K(te+"B:"),startInlineScript:N,startInlineStyle:V,preamble:We(),externalRuntimeScript:null,bootstrapChunks:de,importMapChunks:ve,onHeaders:y,headers:_,resets:{font:{},dns:{},connect:{default:{},anonymous:{},credentials:{}},image:{},style:{}},charsetChunks:[],viewportChunks:[],hoistableChunks:[],preconnects:new Set,fontPreloads:new Set,highImagePreloads:new Set,styles:new Map,bootstrapScripts:new Set,scripts:new Set,bulkPreloads:new Set,preloads:{images:new Map,stylesheets:new Map,scripts:new Map,moduleScripts:new Map},nonce:{script:h,style:ee},hoistableState:null,stylesToHoist:!1},Be!==void 0)for(_=0;_<Be.length;_++)te=Be[_],ee=N=void 0,V={rel:"preload",as:"script",fetchPriority:"low",nonce:o},typeof te=="string"?V.href=P=te:(V.href=P=te.src,V.integrity=ee=typeof te.integrity=="string"?te.integrity:void 0,V.crossOrigin=N=typeof te=="string"||te.crossOrigin==null?void 0:te.crossOrigin==="use-credentials"?"use-credentials":""),te=a,ve=P,te.scriptResources[ve]=null,te.moduleScriptResources[ve]=null,te=[],Q(te,V),y.bootstrapScripts.add(te),de.push(O,ce(Le(P)),cn),h&&de.push(ie,ce(Le(h)),cn),typeof ee=="string"&&de.push(ae,ce(Le(ee)),cn),typeof N=="string"&&de.push(be,ce(Le(N)),cn),xs(de,a),de.push(Ie);if(Ye!==void 0)for(o=0;o<Ye.length;o++)ee=Ye[o],P=_=void 0,N={rel:"modulepreload",fetchPriority:"low",nonce:h},typeof ee=="string"?N.href=Be=ee:(N.href=Be=ee.src,N.integrity=P=typeof ee.integrity=="string"?ee.integrity:void 0,N.crossOrigin=_=typeof ee=="string"||ee.crossOrigin==null?void 0:ee.crossOrigin==="use-credentials"?"use-credentials":""),ee=a,V=Be,ee.scriptResources[V]=null,ee.moduleScriptResources[V]=null,ee=[],Q(ee,N),y.bootstrapScripts.add(ee),de.push(R,ce(Le(Be)),cn),h&&de.push(ie,ce(Le(h)),cn),typeof P=="string"&&de.push(ae,ce(Le(P)),cn),typeof _=="string"&&de.push(be,ce(Le(_)),cn),xs(de,a),de.push(Ie);return y}function He(a,o,h,_,y){return{idPrefix:a===void 0?"":a,nextFormID:0,streamingFormat:0,bootstrapScriptContent:h,bootstrapScripts:_,bootstrapModules:y,instructions:0,hasBody:!1,hasHtml:!1,unknownResources:{},dnsResources:{},connectResources:{default:{},anonymous:{},credentials:{}},imageResources:{},styleResources:{},scriptResources:{},moduleUnknownResources:{},moduleScriptResources:{}}}function We(){return{htmlChunks:null,headChunks:null,bodyChunks:null}}function je(a,o,h,_){return{insertionMode:a,selectedValue:o,tagScope:h,viewTransition:_}}function ht(a){return je(a==="http://www.w3.org/2000/svg"?4:a==="http://www.w3.org/1998/Math/MathML"?5:0,null,0,null)}function J(a,o,h){var _=a.tagScope&-25;switch(o){case"noscript":return je(2,null,_|1,null);case"select":return je(2,h.value!=null?h.value:h.defaultValue,_,null);case"svg":return je(4,null,_,null);case"picture":return je(2,null,_|2,null);case"math":return je(5,null,_,null);case"foreignObject":return je(2,null,_,null);case"table":return je(6,null,_,null);case"thead":case"tbody":case"tfoot":return je(7,null,_,null);case"colgroup":return je(9,null,_,null);case"tr":return je(8,null,_,null);case"head":if(2>a.insertionMode)return je(3,null,_,null);break;case"html":if(a.insertionMode===0)return je(1,null,_,null)}return 6<=a.insertionMode||2>a.insertionMode?je(2,null,_,null):a.tagScope!==_?je(a.insertionMode,a.selectedValue,_,null):a}function Ue(a){return a===null?null:{update:a.update,enter:"none",exit:"none",share:a.update,name:a.autoName,autoName:a.autoName,nameIdx:0}}function Te(a,o){return o.tagScope&32&&(a.instructions|=128),je(o.insertionMode,o.selectedValue,o.tagScope|12,Ue(o.viewTransition))}function Oe(a,o){a=Ue(o.viewTransition);var h=o.tagScope|16;return a!==null&&a.share!=="none"&&(h|=64),je(o.insertionMode,o.selectedValue,h,a)}var Fe=K("<!-- -->");function Re(a,o,h,_){return o===""?_:(_&&a.push(Fe),a.push(ce(Le(o))),!0)}var st=new Map,nt=K(' style="'),ln=K(":"),Vt=K(";");function Wn(a,o){if(typeof o!="object")throw Error(t(62));var h=!0,_;for(_ in o)if(De.call(o,_)){var y=o[_];if(y!=null&&typeof y!="boolean"&&y!==""){if(_.indexOf("--")===0){var P=ce(Le(_));y=ce(Le((""+y).trim()))}else P=st.get(_),P===void 0&&(P=K(Le(_.replace(kt,"-$1").toLowerCase().replace(mt,"-ms-"))),st.set(_,P)),y=typeof y=="number"?y===0||Ke.has(_)?ce(""+y):ce(y+"px"):ce(Le((""+y).trim()));h?(h=!1,a.push(nt,P,ln,y)):a.push(Vt,P,ln,y)}}h||a.push(cn)}var Jt=K(" "),si=K('="'),cn=K('"'),Xr=K('=""');function Nn(a,o,h){h&&typeof h!="function"&&typeof h!="symbol"&&a.push(Jt,ce(o),Xr)}function un(a,o,h){typeof h!="function"&&typeof h!="symbol"&&typeof h!="boolean"&&a.push(Jt,ce(o),si,ce(Le(h)),cn)}var os=K(Le("javascript:throw new Error('React form unexpectedly submitted.')")),ls=K('<input type="hidden"');function Li(a,o){this.push(ls),Ea(a),un(this,"name",o),un(this,"value",a),this.push(zi)}function Ea(a){if(typeof a!="string")throw Error(t(480))}function xr(a,o){if(typeof o.$$FORM_ACTION=="function"){var h=a.nextFormID++;a=a.idPrefix+h;try{var _=o.$$FORM_ACTION(a);if(_){var y=_.data;y?.forEach(Ea)}return _}catch(P){if(typeof P=="object"&&P!==null&&typeof P.then=="function")throw P}}return null}function cs(a,o,h,_,y,P,N,ee){var V=null;if(typeof _=="function"){var te=xr(o,_);te!==null?(ee=te.name,_=te.action||"",y=te.encType,P=te.method,N=te.target,V=te.data):(a.push(Jt,ce("formAction"),si,os,cn),N=P=y=_=ee=null,so(o,h))}return ee!=null&&Ut(a,"name",ee),_!=null&&Ut(a,"formAction",_),y!=null&&Ut(a,"formEncType",y),P!=null&&Ut(a,"formMethod",P),N!=null&&Ut(a,"formTarget",N),V}function Ut(a,o,h){switch(o){case"className":un(a,"class",h);break;case"tabIndex":un(a,"tabindex",h);break;case"dir":case"role":case"viewBox":case"width":case"height":un(a,o,h);break;case"style":Wn(a,h);break;case"src":case"href":if(h==="")break;case"action":case"formAction":if(h==null||typeof h=="function"||typeof h=="symbol"||typeof h=="boolean")break;h=$t(""+h),a.push(Jt,ce(o),si,ce(Le(h)),cn);break;case"defaultValue":case"defaultChecked":case"innerHTML":case"suppressContentEditableWarning":case"suppressHydrationWarning":case"ref":break;case"autoFocus":case"multiple":case"muted":Nn(a,o.toLowerCase(),h);break;case"xlinkHref":if(typeof h=="function"||typeof h=="symbol"||typeof h=="boolean")break;h=$t(""+h),a.push(Jt,ce("xlink:href"),si,ce(Le(h)),cn);break;case"contentEditable":case"spellCheck":case"draggable":case"value":case"autoReverse":case"externalResourcesRequired":case"focusable":case"preserveAlpha":typeof h!="function"&&typeof h!="symbol"&&a.push(Jt,ce(o),si,ce(Le(h)),cn);break;case"inert":case"allowFullScreen":case"async":case"autoPlay":case"controls":case"default":case"defer":case"disabled":case"disablePictureInPicture":case"disableRemotePlayback":case"formNoValidate":case"hidden":case"loop":case"noModule":case"noValidate":case"open":case"playsInline":case"readOnly":case"required":case"reversed":case"scoped":case"seamless":case"itemScope":h&&typeof h!="function"&&typeof h!="symbol"&&a.push(Jt,ce(o),Xr);break;case"capture":case"download":h===!0?a.push(Jt,ce(o),Xr):h!==!1&&typeof h!="function"&&typeof h!="symbol"&&a.push(Jt,ce(o),si,ce(Le(h)),cn);break;case"cols":case"rows":case"size":case"span":typeof h!="function"&&typeof h!="symbol"&&!isNaN(h)&&1<=h&&a.push(Jt,ce(o),si,ce(Le(h)),cn);break;case"rowSpan":case"start":typeof h=="function"||typeof h=="symbol"||isNaN(h)||a.push(Jt,ce(o),si,ce(Le(h)),cn);break;case"xlinkActuate":un(a,"xlink:actuate",h);break;case"xlinkArcrole":un(a,"xlink:arcrole",h);break;case"xlinkRole":un(a,"xlink:role",h);break;case"xlinkShow":un(a,"xlink:show",h);break;case"xlinkTitle":un(a,"xlink:title",h);break;case"xlinkType":un(a,"xlink:type",h);break;case"xmlBase":un(a,"xml:base",h);break;case"xmlLang":un(a,"xml:lang",h);break;case"xmlSpace":un(a,"xml:space",h);break;default:if((!(2<o.length)||o[0]!=="o"&&o[0]!=="O"||o[1]!=="n"&&o[1]!=="N")&&(o=Je.get(o)||o,Ve(o))){switch(typeof h){case"function":case"symbol":return;case"boolean":var _=o.toLowerCase().slice(0,5);if(_!=="data-"&&_!=="aria-")return}a.push(Jt,ce(o),si,ce(Le(h)),cn)}}}var Qt=K(">"),zi=K("/>");function Xn(a,o,h){if(o!=null){if(h!=null)throw Error(t(60));if(typeof o!="object"||!("__html"in o))throw Error(t(61));o=o.__html,o!=null&&a.push(ce(""+o))}}function ro(a){var o="";return n.Children.forEach(a,function(h){h!=null&&(o+=h)}),o}var us=K(' selected=""'),ao=K(`addEventListener("submit",function(a){if(!a.defaultPrevented){var c=a.target,d=a.submitter,e=c.action,b=d;if(d){var f=d.getAttribute("formAction");null!=f&&(e=f,b=null)}"javascript:throw new Error('React form unexpectedly submitted.')"===e&&(a.preventDefault(),b?(a=document.createElement("input"),a.name=b.name,a.value=b.value,b.parentNode.insertBefore(a,b),b=new FormData(c),a.parentNode.removeChild(a)):b=new FormData(c),a=c.ownerDocument||c,(a.$$reactFormReplay=a.$$reactFormReplay||[]).push(c,d,b))}});`);function so(a,o){if((a.instructions&16)===0){a.instructions|=16;var h=o.preamble,_=o.bootstrapChunks;(h.htmlChunks||h.headChunks)&&_.length===0?(_.push(o.startInlineScript),xs(_,a),_.push(Qt,ao,it)):_.unshift(o.startInlineScript,Qt,ao,it)}}var pl=K("<!--F!-->"),I=K("<!--F-->");function Q(a,o){a.push(gt("link"));for(var h in o)if(De.call(o,h)){var _=o[h];if(_!=null)switch(h){case"children":case"dangerouslySetInnerHTML":throw Error(t(399,"link"));default:Ut(a,h,_)}}return a.push(zi),null}var fe=/(<\/|<)(s)(tyle)/gi;function le(a,o,h,_){return""+o+(h==="s"?"\\73 ":"\\53 ")+_}function oe(a,o,h){a.push(gt(h));for(var _ in o)if(De.call(o,_)){var y=o[_];if(y!=null)switch(_){case"children":case"dangerouslySetInnerHTML":throw Error(t(399,h));default:Ut(a,_,y)}}return a.push(zi),null}function Xe(a,o){a.push(gt("title"));var h=null,_=null,y;for(y in o)if(De.call(o,y)){var P=o[y];if(P!=null)switch(y){case"children":h=P;break;case"dangerouslySetInnerHTML":_=P;break;default:Ut(a,y,P)}}return a.push(Qt),o=Array.isArray(h)?2>h.length?h[0]:null:h,typeof o!="function"&&typeof o!="symbol"&&o!==null&&o!==void 0&&a.push(ce(Le(""+o))),Xn(a,_,h),a.push(gn("title")),null}var $e=K("<!--head-->"),Ze=K("<!--body-->"),et=K("<!--html-->");function at(a,o){a.push(gt("script"));var h=null,_=null,y;for(y in o)if(De.call(o,y)){var P=o[y];if(P!=null)switch(y){case"children":h=P;break;case"dangerouslySetInnerHTML":_=P;break;default:Ut(a,y,P)}}return a.push(Qt),Xn(a,_,h),typeof h=="string"&&a.push(ce((""+h).replace(Me,ye))),a.push(gn("script")),null}function ut(a,o,h){a.push(gt(h));var _=h=null,y;for(y in o)if(De.call(o,y)){var P=o[y];if(P!=null)switch(y){case"children":h=P;break;case"dangerouslySetInnerHTML":_=P;break;default:Ut(a,y,P)}}return a.push(Qt),Xn(a,_,h),h}function ct(a,o,h){a.push(gt(h));var _=h=null,y;for(y in o)if(De.call(o,y)){var P=o[y];if(P!=null)switch(y){case"children":h=P;break;case"dangerouslySetInnerHTML":_=P;break;default:Ut(a,y,P)}}return a.push(Qt),Xn(a,_,h),typeof h=="string"?(a.push(ce(Le(h))),null):h}var ot=K(`
`),Yt=/^[a-zA-Z][a-zA-Z:_\.\-\d]*$/,en=new Map;function gt(a){var o=en.get(a);if(o===void 0){if(!Yt.test(a))throw Error(t(65,a));o=K("<"+a),en.set(a,o)}return o}var Ct=K("<!DOCTYPE html>");function bn(a,o,h,_,y,P,N,ee,V){switch(o){case"div":case"span":case"svg":case"path":break;case"a":a.push(gt("a"));var te=null,de=null,ve;for(ve in h)if(De.call(h,ve)){var Be=h[ve];if(Be!=null)switch(ve){case"children":te=Be;break;case"dangerouslySetInnerHTML":de=Be;break;case"href":Be===""?un(a,"href",""):Ut(a,ve,Be);break;default:Ut(a,ve,Be)}}if(a.push(Qt),Xn(a,de,te),typeof te=="string"){a.push(ce(Le(te)));var Ye=null}else Ye=te;return Ye;case"g":case"p":case"li":break;case"select":a.push(gt("select"));var Bt=null,yt=null,At;for(At in h)if(De.call(h,At)){var hn=h[At];if(hn!=null)switch(At){case"children":Bt=hn;break;case"dangerouslySetInnerHTML":yt=hn;break;case"defaultValue":case"value":break;default:Ut(a,At,hn)}}return a.push(Qt),Xn(a,yt,Bt),Bt;case"option":var tn=ee.selectedValue;a.push(gt("option"));var Bn=null,li=null,Ri=null,dt=null,qn;for(qn in h)if(De.call(h,qn)){var xn=h[qn];if(xn!=null)switch(qn){case"children":Bn=xn;break;case"selected":Ri=xn;break;case"dangerouslySetInnerHTML":dt=xn;break;case"value":li=xn;default:Ut(a,qn,xn)}}if(tn!=null){var ei=li!==null?""+li:ro(Bn);if(U(tn)){for(var lr=0;lr<tn.length;lr++)if(""+tn[lr]===ei){a.push(us);break}}else""+tn===ei&&a.push(us)}else Ri&&a.push(us);return a.push(Qt),Xn(a,dt,Bn),Bn;case"textarea":a.push(gt("textarea"));var vn=null,Ir=null,Yi=null,kn;for(kn in h)if(De.call(h,kn)){var Ci=h[kn];if(Ci!=null)switch(kn){case"children":Yi=Ci;break;case"value":vn=Ci;break;case"defaultValue":Ir=Ci;break;case"dangerouslySetInnerHTML":throw Error(t(91));default:Ut(a,kn,Ci)}}if(vn===null&&Ir!==null&&(vn=Ir),a.push(Qt),Yi!=null){if(vn!=null)throw Error(t(92));if(U(Yi)){if(1<Yi.length)throw Error(t(93));vn=""+Yi[0]}vn=""+Yi}return typeof vn=="string"&&vn[0]===`
`&&a.push(ot),vn!==null&&a.push(ce(Le(""+vn))),null;case"input":a.push(gt("input"));var Ls=null,Ns=null,la=null,Fs=null,Wl=null,Lr=null,Va=null,rh=null,ah=null,Xl;for(Xl in h)if(De.call(h,Xl)){var cr=h[Xl];if(cr!=null)switch(Xl){case"children":case"dangerouslySetInnerHTML":throw Error(t(399,"input"));case"name":Ls=cr;break;case"formAction":Ns=cr;break;case"formEncType":la=cr;break;case"formMethod":Fs=cr;break;case"formTarget":Wl=cr;break;case"defaultChecked":ah=cr;break;case"defaultValue":Va=cr;break;case"checked":rh=cr;break;case"value":Lr=cr;break;default:Ut(a,Xl,cr)}}var yd=cs(a,_,y,Ns,la,Fs,Wl,Ls);return rh!==null?Nn(a,"checked",rh):ah!==null&&Nn(a,"checked",ah),Lr!==null?Ut(a,"value",Lr):Va!==null&&Ut(a,"value",Va),a.push(zi),yd?.forEach(Li,a),null;case"button":a.push(gt("button"));var Yl=null,Sd=null,Ed=null,Td=null,wd=null,Ad=null,Rd=null,Zl;for(Zl in h)if(De.call(h,Zl)){var ca=h[Zl];if(ca!=null)switch(Zl){case"children":Yl=ca;break;case"dangerouslySetInnerHTML":Sd=ca;break;case"name":Ed=ca;break;case"formAction":Td=ca;break;case"formEncType":wd=ca;break;case"formMethod":Ad=ca;break;case"formTarget":Rd=ca;break;default:Ut(a,Zl,ca)}}var Cd=cs(a,_,y,Td,wd,Ad,Rd,Ed);if(a.push(Qt),Cd?.forEach(Li,a),Xn(a,Sd,Yl),typeof Yl=="string"){a.push(ce(Le(Yl)));var Pd=null}else Pd=Yl;return Pd;case"form":a.push(gt("form"));var Kl=null,Dd=null,Us=null,Jl=null,Ql=null,ql=null,jl;for(jl in h)if(De.call(h,jl)){var Wa=h[jl];if(Wa!=null)switch(jl){case"children":Kl=Wa;break;case"dangerouslySetInnerHTML":Dd=Wa;break;case"action":Us=Wa;break;case"encType":Jl=Wa;break;case"method":Ql=Wa;break;case"target":ql=Wa;break;default:Ut(a,jl,Wa)}}var sh=null,oh=null;if(typeof Us=="function"){var Os=xr(_,Us);Os!==null?(Us=Os.action||"",Jl=Os.encType,Ql=Os.method,ql=Os.target,sh=Os.data,oh=Os.name):(a.push(Jt,ce("action"),si,os,cn),ql=Ql=Jl=Us=null,so(_,y))}if(Us!=null&&Ut(a,"action",Us),Jl!=null&&Ut(a,"encType",Jl),Ql!=null&&Ut(a,"method",Ql),ql!=null&&Ut(a,"target",ql),a.push(Qt),oh!==null&&(a.push(ls),un(a,"name",oh),a.push(zi),sh?.forEach(Li,a)),Xn(a,Dd,Kl),typeof Kl=="string"){a.push(ce(Le(Kl)));var Id=null}else Id=Kl;return Id;case"menuitem":a.push(gt("menuitem"));for(var Zc in h)if(De.call(h,Zc)){var Ld=h[Zc];if(Ld!=null)switch(Zc){case"children":case"dangerouslySetInnerHTML":throw Error(t(400));default:Ut(a,Zc,Ld)}}return a.push(Qt),null;case"object":a.push(gt("object"));var $l=null,Nd=null,ec;for(ec in h)if(De.call(h,ec)){var tc=h[ec];if(tc!=null)switch(ec){case"children":$l=tc;break;case"dangerouslySetInnerHTML":Nd=tc;break;case"data":var Fd=$t(""+tc);if(Fd==="")break;a.push(Jt,ce("data"),si,ce(Le(Fd)),cn);break;default:Ut(a,ec,tc)}}if(a.push(Qt),Xn(a,Nd,$l),typeof $l=="string"){a.push(ce(Le($l)));var Ud=null}else Ud=$l;return Ud;case"title":var _g=ee.tagScope&1,xg=ee.tagScope&4;if(ee.insertionMode===4||_g||h.itemProp!=null)var lh=Xe(a,h);else xg?lh=null:(Xe(y.hoistableChunks,h),lh=void 0);return lh;case"link":var vg=ee.tagScope&1,bg=ee.tagScope&4,Mg=h.rel,Xa=h.href,Kc=h.precedence;if(ee.insertionMode===4||vg||h.itemProp!=null||typeof Mg!="string"||typeof Xa!="string"||Xa===""){Q(a,h);var nc=null}else if(h.rel==="stylesheet")if(typeof Kc!="string"||h.disabled!=null||h.onLoad||h.onError)nc=Q(a,h);else{var Uo=y.styles.get(Kc),Jc=_.styleResources.hasOwnProperty(Xa)?_.styleResources[Xa]:void 0;if(Jc!==null){_.styleResources[Xa]=null,Uo||(Uo={precedence:ce(Le(Kc)),rules:[],hrefs:[],sheets:new Map},y.styles.set(Kc,Uo));var Qc={state:0,props:tt({},h,{"data-precedence":h.precedence,precedence:null})};if(Jc){Jc.length===2&&Kr(Qc.props,Jc);var ch=y.preloads.stylesheets.get(Xa);ch&&0<ch.length?ch.length=0:Qc.state=1}Uo.sheets.set(Xa,Qc),N&&N.stylesheets.add(Qc)}else if(Uo){var Od=Uo.sheets.get(Xa);Od&&N&&N.stylesheets.add(Od)}V&&a.push(Fe),nc=null}else h.onLoad||h.onError?nc=Q(a,h):(V&&a.push(Fe),nc=bg?null:Q(y.hoistableChunks,h));return nc;case"script":var yg=ee.tagScope&1,uh=h.async;if(typeof h.src!="string"||!h.src||!uh||typeof uh=="function"||typeof uh=="symbol"||h.onLoad||h.onError||ee.insertionMode===4||yg||h.itemProp!=null)var Bd=at(a,h);else{var qc=h.src;if(h.type==="module")var jc=_.moduleScriptResources,kd=y.preloads.moduleScripts;else jc=_.scriptResources,kd=y.preloads.scripts;var $c=jc.hasOwnProperty(qc)?jc[qc]:void 0;if($c!==null){jc[qc]=null;var hh=h;if($c){$c.length===2&&(hh=tt({},h),Kr(hh,$c));var zd=kd.get(qc);zd&&(zd.length=0)}var Hd=[];y.scripts.add(Hd),at(Hd,hh)}V&&a.push(Fe),Bd=null}return Bd;case"style":var Sg=ee.tagScope&1,eu=h.precedence,Oo=h.href,Eg=h.nonce;if(ee.insertionMode===4||Sg||h.itemProp!=null||typeof eu!="string"||typeof Oo!="string"||Oo===""){a.push(gt("style"));var Bo=null,Gd=null,ic;for(ic in h)if(De.call(h,ic)){var tu=h[ic];if(tu!=null)switch(ic){case"children":Bo=tu;break;case"dangerouslySetInnerHTML":Gd=tu;break;default:Ut(a,ic,tu)}}a.push(Qt);var rc=Array.isArray(Bo)?2>Bo.length?Bo[0]:null:Bo;typeof rc!="function"&&typeof rc!="symbol"&&rc!==null&&rc!==void 0&&a.push(ce((""+rc).replace(fe,le))),Xn(a,Gd,Bo),a.push(gn("style"));var Vd=null}else{var Bs=y.styles.get(eu);if((_.styleResources.hasOwnProperty(Oo)?_.styleResources[Oo]:void 0)!==null){_.styleResources[Oo]=null,Bs||(Bs={precedence:ce(Le(eu)),rules:[],hrefs:[],sheets:new Map},y.styles.set(eu,Bs));var Wd=y.nonce.style;if(!Wd||Wd===Eg){Bs.hrefs.push(ce(Le(Oo)));var Xd=Bs.rules,ko=null,Yd=null,nu;for(nu in h)if(De.call(h,nu)){var fh=h[nu];if(fh!=null)switch(nu){case"children":ko=fh;break;case"dangerouslySetInnerHTML":Yd=fh}}var ac=Array.isArray(ko)?2>ko.length?ko[0]:null:ko;typeof ac!="function"&&typeof ac!="symbol"&&ac!==null&&ac!==void 0&&Xd.push(ce((""+ac).replace(fe,le))),Xn(Xd,Yd,ko)}}Bs&&N&&N.styles.add(Bs),V&&a.push(Fe),Vd=void 0}return Vd;case"meta":var Tg=ee.tagScope&1,wg=ee.tagScope&4;if(ee.insertionMode===4||Tg||h.itemProp!=null)var Zd=oe(a,h,"meta");else V&&a.push(Fe),Zd=wg?null:typeof h.charSet=="string"?oe(y.charsetChunks,h,"meta"):h.name==="viewport"?oe(y.viewportChunks,h,"meta"):oe(y.hoistableChunks,h,"meta");return Zd;case"listing":case"pre":a.push(gt(o));var sc=null,oc=null,lc;for(lc in h)if(De.call(h,lc)){var iu=h[lc];if(iu!=null)switch(lc){case"children":sc=iu;break;case"dangerouslySetInnerHTML":oc=iu;break;default:Ut(a,lc,iu)}}if(a.push(Qt),oc!=null){if(sc!=null)throw Error(t(60));if(typeof oc!="object"||!("__html"in oc))throw Error(t(61));var ks=oc.__html;ks!=null&&(typeof ks=="string"&&0<ks.length&&ks[0]===`
`?a.push(ot,ce(ks)):a.push(ce(""+ks)))}return typeof sc=="string"&&sc[0]===`
`&&a.push(ot),sc;case"img":var Ag=ee.tagScope&3,ci=h.src,ti=h.srcSet;if(!(h.loading==="lazy"||!ci&&!ti||typeof ci!="string"&&ci!=null||typeof ti!="string"&&ti!=null||h.fetchPriority==="low"||Ag)&&(typeof ci!="string"||ci[4]!==":"||ci[0]!=="d"&&ci[0]!=="D"||ci[1]!=="a"&&ci[1]!=="A"||ci[2]!=="t"&&ci[2]!=="T"||ci[3]!=="a"&&ci[3]!=="A")&&(typeof ti!="string"||ti[4]!==":"||ti[0]!=="d"&&ti[0]!=="D"||ti[1]!=="a"&&ti[1]!=="A"||ti[2]!=="t"&&ti[2]!=="T"||ti[3]!=="a"&&ti[3]!=="A")){N!==null&&ee.tagScope&64&&(N.suspenseyImages=!0);var Kd=typeof h.sizes=="string"?h.sizes:void 0,zo=ti?ti+`
`+(Kd||""):ci,dh=y.preloads.images,zs=dh.get(zo);if(zs)(h.fetchPriority==="high"||10>y.highImagePreloads.size)&&(dh.delete(zo),y.highImagePreloads.add(zs));else if(!_.imageResources.hasOwnProperty(zo)){_.imageResources[zo]=Ft;var ph=h.crossOrigin,Jd=typeof ph=="string"?ph==="use-credentials"?ph:"":void 0,Hs=y.headers,mh;Hs&&0<Hs.remainingCapacity&&typeof h.srcSet!="string"&&(h.fetchPriority==="high"||500>Hs.highImagePreloads.length)&&(mh=bs(ci,"image",{imageSrcSet:h.srcSet,imageSizes:h.sizes,crossOrigin:Jd,integrity:h.integrity,nonce:h.nonce,type:h.type,fetchPriority:h.fetchPriority,referrerPolicy:h.refererPolicy}),0<=(Hs.remainingCapacity-=mh.length+2))?(y.resets.image[zo]=Ft,Hs.highImagePreloads&&(Hs.highImagePreloads+=", "),Hs.highImagePreloads+=mh):(zs=[],Q(zs,{rel:"preload",as:"image",href:ti?void 0:ci,imageSrcSet:ti,imageSizes:Kd,crossOrigin:Jd,integrity:h.integrity,type:h.type,fetchPriority:h.fetchPriority,referrerPolicy:h.referrerPolicy}),h.fetchPriority==="high"||10>y.highImagePreloads.size?y.highImagePreloads.add(zs):(y.bulkPreloads.add(zs),dh.set(zo,zs)))}}return oe(a,h,"img");case"base":case"area":case"br":case"col":case"embed":case"hr":case"keygen":case"param":case"source":case"track":case"wbr":return oe(a,h,o);case"annotation-xml":case"color-profile":case"font-face":case"font-face-src":case"font-face-uri":case"font-face-format":case"font-face-name":case"missing-glyph":break;case"head":if(2>ee.insertionMode){var gh=P||y.preamble;if(gh.headChunks)throw Error(t(545,"`<head>`"));P!==null&&a.push($e),gh.headChunks=[];var Qd=ut(gh.headChunks,h,"head")}else Qd=ct(a,h,"head");return Qd;case"body":if(2>ee.insertionMode){var _h=P||y.preamble;if(_h.bodyChunks)throw Error(t(545,"`<body>`"));P!==null&&a.push(Ze),_h.bodyChunks=[];var qd=ut(_h.bodyChunks,h,"body")}else qd=ct(a,h,"body");return qd;case"html":if(ee.insertionMode===0){var xh=P||y.preamble;if(xh.htmlChunks)throw Error(t(545,"`<html>`"));P!==null&&a.push(et),xh.htmlChunks=[Ct];var jd=ut(xh.htmlChunks,h,"html")}else jd=ct(a,h,"html");return jd;default:if(o.indexOf("-")!==-1){a.push(gt(o));var vh=null,$d=null,Ho;for(Ho in h)if(De.call(h,Ho)){var ur=h[Ho];if(ur!=null){var ep=Ho;switch(Ho){case"children":vh=ur;break;case"dangerouslySetInnerHTML":$d=ur;break;case"style":Wn(a,ur);break;case"suppressContentEditableWarning":case"suppressHydrationWarning":case"ref":break;case"className":ep="class";default:if(Ve(Ho)&&typeof ur!="function"&&typeof ur!="symbol"&&ur!==!1){if(ur===!0)ur="";else if(typeof ur=="object")continue;a.push(Jt,ce(ep),si,ce(Le(ur)),cn)}}}}return a.push(Qt),Xn(a,$d,vh),vh}}return ct(a,h,o)}var qe=new Map;function gn(a){var o=qe.get(a);return o===void 0&&(o=K("</"+a+">"),qe.set(a,o)),o}function Et(a,o){a=a.preamble,a.htmlChunks===null&&o.htmlChunks&&(a.htmlChunks=o.htmlChunks),a.headChunks===null&&o.headChunks&&(a.headChunks=o.headChunks),a.bodyChunks===null&&o.bodyChunks&&(a.bodyChunks=o.bodyChunks)}function Yn(a,o){o=o.bootstrapChunks;for(var h=0;h<o.length-1;h++)H(a,o[h]);return h<o.length?(h=o[h],o.length=0,j(a,h)):!0}var wn=K("requestAnimationFrame(function(){$RT=performance.now()});"),Ni=K('<template id="'),vr=K('"></template>'),Pt=K("<!--&-->"),rn=K("<!--/&-->"),Hi=K("<!--$-->"),qt=K('<!--$?--><template id="'),Gi=K('"></template>'),_n=K("<!--$!-->"),Zn=K("<!--/$-->"),Yu=K("<template"),oo=K('"'),lo=K(' data-dgst="');K(' data-msg="'),K(' data-stck="'),K(' data-cstck="');var Zu=K("></template>");function Rc(a,o,h){if(H(a,qt),h===null)throw Error(t(395));return H(a,o.boundaryPrefix),H(a,ce(h.toString(16))),j(a,Gi)}var qi=K('<div hidden id="'),ml=K('">'),gl=K("</div>"),_l=K('<svg aria-hidden="true" style="display:none" id="'),co=K('">'),an=K("</svg>"),hs=K('<math aria-hidden="true" style="display:none" id="'),uo=K('">'),fs=K("</math>"),ds=K('<table hidden id="'),ps=K('">'),ho=K("</table>"),Ta=K('<table hidden><tbody id="'),br=K('">'),fo=K("</tbody></table>"),ji=K('<table hidden><tr id="'),Cc=K('">'),xl=K("</tr></table>"),wa=K('<table hidden><colgroup id="'),ms=K('">'),Pc=K("</colgroup></table>");function Dc(a,o,h,_){switch(h.insertionMode){case 0:case 1:case 3:case 2:return H(a,qi),H(a,o.segmentPrefix),H(a,ce(_.toString(16))),j(a,ml);case 4:return H(a,_l),H(a,o.segmentPrefix),H(a,ce(_.toString(16))),j(a,co);case 5:return H(a,hs),H(a,o.segmentPrefix),H(a,ce(_.toString(16))),j(a,uo);case 6:return H(a,ds),H(a,o.segmentPrefix),H(a,ce(_.toString(16))),j(a,ps);case 7:return H(a,Ta),H(a,o.segmentPrefix),H(a,ce(_.toString(16))),j(a,br);case 8:return H(a,ji),H(a,o.segmentPrefix),H(a,ce(_.toString(16))),j(a,Cc);case 9:return H(a,wa),H(a,o.segmentPrefix),H(a,ce(_.toString(16))),j(a,ms);default:throw Error(t(397))}}function Ic(a,o){switch(o.insertionMode){case 0:case 1:case 3:case 2:return j(a,gl);case 4:return j(a,an);case 5:return j(a,fs);case 6:return j(a,ho);case 7:return j(a,fo);case 8:return j(a,xl);case 9:return j(a,Pc);default:throw Error(t(397))}}var Ku=K('$RS=function(a,b){a=document.getElementById(a);b=document.getElementById(b);for(a.parentNode.removeChild(a);a.firstChild;)b.parentNode.insertBefore(a.firstChild,b);b.parentNode.removeChild(b)};$RS("'),Ju=K('$RS("'),Qu=K('","'),qu=K('")<\/script>');K('<template data-rsi="" data-sid="'),K('" data-pid="');var vl=K(`$RB=[];$RV=function(a){$RT=performance.now();for(var b=0;b<a.length;b+=2){var c=a[b],e=a[b+1];null!==e.parentNode&&e.parentNode.removeChild(e);var f=c.parentNode;if(f){var g=c.previousSibling,h=0;do{if(c&&8===c.nodeType){var d=c.data;if("/$"===d||"/&"===d)if(0===h)break;else h--;else"$"!==d&&"$?"!==d&&"$~"!==d&&"$!"!==d&&"&"!==d||h++}d=c.nextSibling;f.removeChild(c);c=d}while(c);for(;e.firstChild;)f.insertBefore(e.firstChild,c);g.data="$";g._reactRetry&&requestAnimationFrame(g._reactRetry)}}a.length=0};
$RC=function(a,b){if(b=document.getElementById(b))(a=document.getElementById(a))?(a.previousSibling.data="$~",$RB.push(a,b),2===$RB.length&&("number"!==typeof $RT?requestAnimationFrame($RV.bind(null,$RB)):(a=performance.now(),setTimeout($RV.bind(null,$RB),2300>a&&2E3<a?2300-a:$RT+300-a)))):b.parentNode.removeChild(b)};`);ce(`$RV=function(A,g){function k(a,b){var e=a.getAttribute(b);e&&(b=a.style,l.push(a,b.viewTransitionName,b.viewTransitionClass),"auto"!==e&&(b.viewTransitionClass=e),(a=a.getAttribute("vt-name"))||(a="_T_"+K++ +"_"),b.viewTransitionName=a,B=!0)}var B=!1,K=0,l=[];try{var f=document.__reactViewTransition;if(f){f.finished.finally($RV.bind(null,g));return}var m=new Map;for(f=1;f<g.length;f+=2)for(var h=g[f].querySelectorAll("[vt-share]"),d=0;d<h.length;d++){var c=h[d];m.set(c.getAttribute("vt-name"),c)}var u=[];for(h=0;h<g.length;h+=2){var C=g[h],x=C.parentNode;if(x){var v=x.getBoundingClientRect();if(v.left||v.top||v.width||v.height){c=C;for(f=0;c;){if(8===c.nodeType){var r=c.data;if("/$"===r)if(0===f)break;else f--;else"$"!==r&&"$?"!==r&&"$~"!==r&&"$!"!==r||f++}else if(1===c.nodeType){d=c;var D=d.getAttribute("vt-name"),y=m.get(D);k(d,y?"vt-share":"vt-exit");y&&(k(y,"vt-share"),m.set(D,null));var E=d.querySelectorAll("[vt-share]");for(d=0;d<E.length;d++){var F=E[d],G=F.getAttribute("vt-name"),
H=m.get(G);H&&(k(F,"vt-share"),k(H,"vt-share"),m.set(G,null))}}c=c.nextSibling}for(var I=g[h+1],t=I.firstElementChild;t;)null!==m.get(t.getAttribute("vt-name"))&&k(t,"vt-enter"),t=t.nextElementSibling;c=x;do for(var n=c.firstElementChild;n;){var J=n.getAttribute("vt-update");J&&"none"!==J&&!l.includes(n)&&k(n,"vt-update");n=n.nextElementSibling}while((c=c.parentNode)&&1===c.nodeType&&"none"!==c.getAttribute("vt-update"));u.push.apply(u,I.querySelectorAll('img[src]:not([loading="lazy"])'))}}}if(B){var z=
document.__reactViewTransition=document.startViewTransition({update:function(){A(g);for(var a=[document.documentElement.clientHeight,document.fonts.ready],b={},e=0;e<u.length;b={g:b.g},e++)if(b.g=u[e],!b.g.complete){var p=b.g.getBoundingClientRect();0<p.bottom&&0<p.right&&p.top<window.innerHeight&&p.left<window.innerWidth&&(p=new Promise(function(w){return function(q){w.g.addEventListener("load",q);w.g.addEventListener("error",q)}}(b)),a.push(p))}return Promise.race([Promise.all(a),new Promise(function(w){var q=
performance.now();setTimeout(w,2300>q&&2E3<q?2300-q:500)})])},types:[]});z.ready.finally(function(){for(var a=l.length-3;0<=a;a-=3){var b=l[a],e=b.style;e.viewTransitionName=l[a+1];e.viewTransitionClass=l[a+1];""===b.getAttribute("style")&&b.removeAttribute("style")}});z.finished.finally(function(){document.__reactViewTransition===z&&(document.__reactViewTransition=null)});$RB=[];return}}catch(a){}A(g)}.bind(null,$RV);`);var Lc=K('$RC("'),ju=K(`$RM=new Map;$RR=function(n,w,p){function u(q){this._p=null;q()}for(var r=new Map,t=document,h,b,e=t.querySelectorAll("link[data-precedence],style[data-precedence]"),v=[],k=0;b=e[k++];)"not all"===b.getAttribute("media")?v.push(b):("LINK"===b.tagName&&$RM.set(b.getAttribute("href"),b),r.set(b.dataset.precedence,h=b));e=0;b=[];var l,a;for(k=!0;;){if(k){var f=p[e++];if(!f){k=!1;e=0;continue}var c=!1,m=0;var d=f[m++];if(a=$RM.get(d)){var g=a._p;c=!0}else{a=t.createElement("link");a.href=d;a.rel=
"stylesheet";for(a.dataset.precedence=l=f[m++];g=f[m++];)a.setAttribute(g,f[m++]);g=a._p=new Promise(function(q,x){a.onload=u.bind(a,q);a.onerror=u.bind(a,x)});$RM.set(d,a)}d=a.getAttribute("media");!g||d&&!matchMedia(d).matches||b.push(g);if(c)continue}else{a=v[e++];if(!a)break;l=a.getAttribute("data-precedence");a.removeAttribute("media")}c=r.get(l)||h;c===h&&(h=a);r.set(l,a);c?c.parentNode.insertBefore(a,c.nextSibling):(c=t.head,c.insertBefore(a,c.firstChild))}if(p=document.getElementById(n))p.previousSibling.data=
"$~";Promise.all(b).then($RC.bind(null,n,w),$RX.bind(null,n,"CSS failed to load"))};$RR("`),Nc=K('$RR("'),po=K('","'),$u=K('",'),bl=K('"'),Fc=K(")<\/script>");K('<template data-rci="" data-bid="'),K('<template data-rri="" data-bid="'),K('" data-sid="'),K('" data-sty="');var Aa=K('$RX=function(b,c,d,e,f){var a=document.getElementById(b);a&&(b=a.previousSibling,b.data="$!",a=a.dataset,c&&(a.dgst=c),d&&(a.msg=d),e&&(a.stck=e),f&&(a.cstck=f),b._reactRetry&&b._reactRetry())};'),Ml=K('$RX=function(b,c,d,e,f){var a=document.getElementById(b);a&&(b=a.previousSibling,b.data="$!",a=a.dataset,c&&(a.dgst=c),d&&(a.msg=d),e&&(a.stck=e),f&&(a.cstck=f),b._reactRetry&&b._reactRetry())};;$RX("'),mo=K('$RX("'),Uc=K('"'),Ra=K(","),eh=K(")<\/script>");K('<template data-rxi="" data-bid="'),K('" data-dgst="'),K('" data-msg="'),K('" data-stck="'),K('" data-cstck="');var th=/[<\u2028\u2029]/g;function nh(a){return JSON.stringify(a).replace(th,function(o){switch(o){case"<":return"\\u003c";case"\u2028":return"\\u2028";case"\u2029":return"\\u2029";default:throw Error("escapeJSStringsForInstructionScripts encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React")}})}var Fn=/[&><\u2028\u2029]/g;function Ca(a){return JSON.stringify(a).replace(Fn,function(o){switch(o){case"&":return"\\u0026";case">":return"\\u003e";case"<":return"\\u003c";case"\u2028":return"\\u2028";case"\u2029":return"\\u2029";default:throw Error("escapeJSObjectForInstructionScripts encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React")}})}var yl=K(' media="not all" data-precedence="'),go=K('" data-href="'),Oc=K('">'),Yr=K("</style>"),Mr=!1,gs=!0;function yr(a){var o=a.rules,h=a.hrefs,_=0;if(h.length){for(H(this,$.startInlineStyle),H(this,yl),H(this,a.precedence),H(this,go);_<h.length-1;_++)H(this,h[_]),H(this,El);for(H(this,h[_]),H(this,Oc),_=0;_<o.length;_++)H(this,o[_]);gs=j(this,Yr),Mr=!0,o.length=0,h.length=0}}function Kn(a){return a.state!==2?Mr=!0:!1}function Pa(a,o,h){return Mr=!1,gs=!0,$=h,o.styles.forEach(yr,a),$=null,o.stylesheets.forEach(Kn),Mr&&(h.stylesToHoist=!0),gs}function sn(a){for(var o=0;o<a.length;o++)H(this,a[o]);a.length=0}var Vi=[];function Sl(a){Q(Vi,a.props);for(var o=0;o<Vi.length;o++)H(this,Vi[o]);Vi.length=0,a.state=2}var _s=K(' data-precedence="'),Bc=K('" data-href="'),El=K(" "),kc=K('">'),_o=K("</style>");function xo(a){var o=0<a.sheets.size;a.sheets.forEach(Sl,this),a.sheets.clear();var h=a.rules,_=a.hrefs;if(!o||_.length){if(H(this,$.startInlineStyle),H(this,_s),H(this,a.precedence),a=0,_.length){for(H(this,Bc);a<_.length-1;a++)H(this,_[a]),H(this,El);H(this,_[a])}for(H(this,kc),a=0;a<h.length;a++)H(this,h[a]);H(this,_o),h.length=0,_.length=0}}function yi(a){if(a.state===0){a.state=1;var o=a.props;for(Q(Vi,{rel:"preload",as:"style",href:a.props.href,crossOrigin:o.crossOrigin,fetchPriority:o.fetchPriority,integrity:o.integrity,media:o.media,hrefLang:o.hrefLang,referrerPolicy:o.referrerPolicy}),a=0;a<Vi.length;a++)H(this,Vi[a]);Vi.length=0}}function Tl(a){a.sheets.forEach(yi,this),a.sheets.clear()}K('<link rel="expect" href="#'),K('" blocking="render"/>');var vo=K(' id="');function xs(a,o){(o.instructions&32)===0&&(o.instructions|=32,a.push(vo,ce(Le("_"+o.idPrefix+"R_")),cn))}var bo=K("["),Mo=K(",["),yo=K(","),So=K("]");function Pn(a,o){H(a,bo);var h=bo;o.stylesheets.forEach(function(_){if(_.state!==2)if(_.state===3)H(a,h),H(a,ce(Ca(""+_.props.href))),H(a,So),h=Mo;else{H(a,h);var y=_.props["data-precedence"],P=_.props,N=$t(""+_.props.href);H(a,ce(Ca(N))),y=""+y,H(a,yo),H(a,ce(Ca(y)));for(var ee in P)if(De.call(P,ee)&&(y=P[ee],y!=null))switch(ee){case"href":case"rel":case"precedence":case"data-precedence":break;case"children":case"dangerouslySetInnerHTML":throw Error(t(399,"link"));default:ih(a,ee,y)}H(a,So),h=Mo,_.state=3}}),H(a,So)}function ih(a,o,h){var _=o.toLowerCase();switch(typeof h){case"function":case"symbol":return}switch(o){case"innerHTML":case"dangerouslySetInnerHTML":case"suppressContentEditableWarning":case"suppressHydrationWarning":case"style":case"ref":return;case"className":_="class",o=""+h;break;case"hidden":if(h===!1)return;o="";break;case"src":case"href":h=$t(h),o=""+h;break;default:if(2<o.length&&(o[0]==="o"||o[0]==="O")&&(o[1]==="n"||o[1]==="N")||!Ve(o))return;o=""+h}H(a,yo),H(a,ce(Ca(_))),H(a,yo),H(a,ce(Ca(o)))}function Zr(){return{styles:new Set,stylesheets:new Set,suspenseyImages:!1}}function wl(a){var o=Rn||null;if(o){var h=o.resumableState,_=o.renderState;if(typeof a=="string"&&a){if(!h.dnsResources.hasOwnProperty(a)){h.dnsResources[a]=null,h=_.headers;var y,P;(P=h&&0<h.remainingCapacity)&&(P=(y="<"+(""+a).replace(Jr,Da)+">; rel=dns-prefetch",0<=(h.remainingCapacity-=y.length+2))),P?(_.resets.dns[a]=null,h.preconnects&&(h.preconnects+=", "),h.preconnects+=y):(y=[],Q(y,{href:a,rel:"dns-prefetch"}),_.preconnects.add(y))}or(o)}}else Nt.D(a)}function Al(a,o){var h=Rn||null;if(h){var _=h.resumableState,y=h.renderState;if(typeof a=="string"&&a){var P=o==="use-credentials"?"credentials":typeof o=="string"?"anonymous":"default";if(!_.connectResources[P].hasOwnProperty(a)){_.connectResources[P][a]=null,_=y.headers;var N,ee;if(ee=_&&0<_.remainingCapacity){if(ee="<"+(""+a).replace(Jr,Da)+">; rel=preconnect",typeof o=="string"){var V=(""+o).replace(Qr,qr);ee+='; crossorigin="'+V+'"'}ee=(N=ee,0<=(_.remainingCapacity-=N.length+2))}ee?(y.resets.connect[P][a]=null,_.preconnects&&(_.preconnects+=", "),_.preconnects+=N):(P=[],Q(P,{rel:"preconnect",href:a,crossOrigin:o}),y.preconnects.add(P))}or(h)}}else Nt.C(a,o)}function Rl(a,o,h){var _=Rn||null;if(_){var y=_.resumableState,P=_.renderState;if(o&&a){switch(o){case"image":if(h)var N=h.imageSrcSet,ee=h.imageSizes,V=h.fetchPriority;var te=N?N+`
`+(ee||""):a;if(y.imageResources.hasOwnProperty(te))return;y.imageResources[te]=Ft,y=P.headers;var de;y&&0<y.remainingCapacity&&typeof N!="string"&&V==="high"&&(de=bs(a,o,h),0<=(y.remainingCapacity-=de.length+2))?(P.resets.image[te]=Ft,y.highImagePreloads&&(y.highImagePreloads+=", "),y.highImagePreloads+=de):(y=[],Q(y,tt({rel:"preload",href:N?void 0:a,as:o},h)),V==="high"?P.highImagePreloads.add(y):(P.bulkPreloads.add(y),P.preloads.images.set(te,y)));break;case"style":if(y.styleResources.hasOwnProperty(a))return;N=[],Q(N,tt({rel:"preload",href:a,as:o},h)),y.styleResources[a]=!h||typeof h.crossOrigin!="string"&&typeof h.integrity!="string"?Ft:[h.crossOrigin,h.integrity],P.preloads.stylesheets.set(a,N),P.bulkPreloads.add(N);break;case"script":if(y.scriptResources.hasOwnProperty(a))return;N=[],P.preloads.scripts.set(a,N),P.bulkPreloads.add(N),Q(N,tt({rel:"preload",href:a,as:o},h)),y.scriptResources[a]=!h||typeof h.crossOrigin!="string"&&typeof h.integrity!="string"?Ft:[h.crossOrigin,h.integrity];break;default:if(y.unknownResources.hasOwnProperty(o)){if(N=y.unknownResources[o],N.hasOwnProperty(a))return}else N={},y.unknownResources[o]=N;if(N[a]=Ft,(y=P.headers)&&0<y.remainingCapacity&&o==="font"&&(te=bs(a,o,h),0<=(y.remainingCapacity-=te.length+2)))P.resets.font[a]=Ft,y.fontPreloads&&(y.fontPreloads+=", "),y.fontPreloads+=te;else switch(y=[],a=tt({rel:"preload",href:a,as:o},h),Q(y,a),o){case"font":P.fontPreloads.add(y);break;default:P.bulkPreloads.add(y)}}or(_)}}else Nt.L(a,o,h)}function Eo(a,o){var h=Rn||null;if(h){var _=h.resumableState,y=h.renderState;if(a){var P=o&&typeof o.as=="string"?o.as:"script";switch(P){case"script":if(_.moduleScriptResources.hasOwnProperty(a))return;P=[],_.moduleScriptResources[a]=!o||typeof o.crossOrigin!="string"&&typeof o.integrity!="string"?Ft:[o.crossOrigin,o.integrity],y.preloads.moduleScripts.set(a,P);break;default:if(_.moduleUnknownResources.hasOwnProperty(P)){var N=_.unknownResources[P];if(N.hasOwnProperty(a))return}else N={},_.moduleUnknownResources[P]=N;P=[],N[a]=Ft}Q(P,tt({rel:"modulepreload",href:a},o)),y.bulkPreloads.add(P),or(h)}}else Nt.m(a,o)}function vs(a,o,h){var _=Rn||null;if(_){var y=_.resumableState,P=_.renderState;if(a){o=o||"default";var N=P.styles.get(o),ee=y.styleResources.hasOwnProperty(a)?y.styleResources[a]:void 0;ee!==null&&(y.styleResources[a]=null,N||(N={precedence:ce(Le(o)),rules:[],hrefs:[],sheets:new Map},P.styles.set(o,N)),o={state:0,props:tt({rel:"stylesheet",href:a,"data-precedence":o},h)},ee&&(ee.length===2&&Kr(o.props,ee),(P=P.preloads.stylesheets.get(a))&&0<P.length?P.length=0:o.state=1),N.sheets.set(a,o),or(_))}}else Nt.S(a,o,h)}function Sr(a,o){var h=Rn||null;if(h){var _=h.resumableState,y=h.renderState;if(a){var P=_.scriptResources.hasOwnProperty(a)?_.scriptResources[a]:void 0;P!==null&&(_.scriptResources[a]=null,o=tt({src:a,async:!0},o),P&&(P.length===2&&Kr(o,P),a=y.preloads.scripts.get(a))&&(a.length=0),a=[],y.scripts.add(a),at(a,o),or(h))}}else Nt.X(a,o)}function zc(a,o){var h=Rn||null;if(h){var _=h.resumableState,y=h.renderState;if(a){var P=_.moduleScriptResources.hasOwnProperty(a)?_.moduleScriptResources[a]:void 0;P!==null&&(_.moduleScriptResources[a]=null,o=tt({src:a,type:"module",async:!0},o),P&&(P.length===2&&Kr(o,P),a=y.preloads.moduleScripts.get(a))&&(a.length=0),a=[],y.scripts.add(a),at(a,o),or(h))}}else Nt.M(a,o)}function Kr(a,o){a.crossOrigin==null&&(a.crossOrigin=o[0]),a.integrity==null&&(a.integrity=o[1])}function bs(a,o,h){a=(""+a).replace(Jr,Da),o=(""+o).replace(Qr,qr),o="<"+a+'>; rel=preload; as="'+o+'"';for(var _ in h)De.call(h,_)&&(a=h[_],typeof a=="string"&&(o+="; "+_.toLowerCase()+'="'+(""+a).replace(Qr,qr)+'"'));return o}var Jr=/[<>\r\n]/g;function Da(a){switch(a){case"<":return"%3C";case">":return"%3E";case`
`:return"%0A";case"\r":return"%0D";default:throw Error("escapeLinkHrefForHeaderContextReplacer encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React")}}var Qr=/["';,\r\n]/g;function qr(a){switch(a){case'"':return"%22";case"'":return"%27";case";":return"%3B";case",":return"%2C";case`
`:return"%0A";case"\r":return"%0D";default:throw Error("escapeStringForLinkHeaderQuotedParamValueContextReplacer encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React")}}function Cl(a){this.styles.add(a)}function Hc(a){this.stylesheets.add(a)}function jr(a,o){o.styles.forEach(Cl,a),o.stylesheets.forEach(Hc,a),o.suspenseyImages&&(a.suspenseyImages=!0)}function Ms(a){return 0<a.stylesheets.size||a.suspenseyImages}var To=Function.prototype.bind,$r=Symbol.for("react.client.reference");function wo(a){if(a==null)return null;if(typeof a=="function")return a.$$typeof===$r?null:a.displayName||a.name||null;if(typeof a=="string")return a;switch(a){case c:return"Fragment";case d:return"Profiler";case u:return"StrictMode";case b:return"Suspense";case x:return"SuspenseList";case T:return"Activity"}if(typeof a=="object")switch(a.$$typeof){case r:return"Portal";case p:return a.displayName||"Context";case m:return(a._context.displayName||"Context")+".Consumer";case g:var o=a.render;return a=a.displayName,a||(a=o.displayName||o.name||"",a=a!==""?"ForwardRef("+a+")":"ForwardRef"),a;case M:return o=a.displayName||null,o!==null?o:wo(a.type)||"Memo";case A:o=a._payload,a=a._init;try{return wo(a(o))}catch{}}return null}var Gc={},Wi=null;function Ao(a,o){if(a!==o){a.context._currentValue=a.parentValue,a=a.parent;var h=o.parent;if(a===null){if(h!==null)throw Error(t(401))}else{if(h===null)throw Error(t(401));Ao(a,h)}o.context._currentValue=o.value}}function Pl(a){a.context._currentValue=a.parentValue,a=a.parent,a!==null&&Pl(a)}function s(a){var o=a.parent;o!==null&&s(o),a.context._currentValue=a.value}function l(a,o){if(a.context._currentValue=a.parentValue,a=a.parent,a===null)throw Error(t(402));a.depth===o.depth?Ao(a,o):l(a,o)}function f(a,o){var h=o.parent;if(h===null)throw Error(t(402));a.depth===h.depth?Ao(a,h):f(a,h),o.context._currentValue=o.value}function v(a){var o=Wi;o!==a&&(o===null?s(a):a===null?Pl(o):o.depth===a.depth?Ao(o,a):o.depth>a.depth?l(o,a):f(o,a),Wi=a)}var E={enqueueSetState:function(a,o){a=a._reactInternals,a.queue!==null&&a.queue.push(o)},enqueueReplaceState:function(a,o){a=a._reactInternals,a.replace=!0,a.queue=[o]},enqueueForceUpdate:function(){}},L={id:1,overflow:""};function k(a,o,h){var _=a.id;a=a.overflow;var y=32-ge(_)-1;_&=~(1<<y),h+=1;var P=32-ge(o)+y;if(30<P){var N=y-y%5;return P=(_&(1<<N)-1).toString(32),_>>=N,y-=N,{id:1<<32-ge(o)+y|h<<y|_,overflow:P+a}}return{id:1<<P|h<<y|_,overflow:a}}var ge=Math.clz32?Math.clz32:Ae,q=Math.log,xe=Math.LN2;function Ae(a){return a>>>=0,a===0?32:31-(q(a)/xe|0)|0}function Se(){}var ke=Error(t(460));function lt(a,o,h){switch(h=a[h],h===void 0?a.push(o):h!==o&&(o.then(Se,Se),o=h),o.status){case"fulfilled":return o.value;case"rejected":throw o.reason;default:switch(typeof o.status=="string"?o.then(Se,Se):(a=o,a.status="pending",a.then(function(_){if(o.status==="pending"){var y=o;y.status="fulfilled",y.value=_}},function(_){if(o.status==="pending"){var y=o;y.status="rejected",y.reason=_}})),o.status){case"fulfilled":return o.value;case"rejected":throw o.reason}throw Dt=o,ke}}var Dt=null;function vt(){if(Dt===null)throw Error(t(459));var a=Dt;return Dt=null,a}function bt(a,o){return a===o&&(a!==0||1/a===1/o)||a!==a&&o!==o}var _t=typeof Object.is=="function"?Object.is:bt,Mt=null,fn=null,mn=null,zt=null,Wt=null,Ot=null,oi=!1,Ht=!1,gi=0,Zt=0,Tn=-1,An=0,dn=null,$n=null,ea=0;function _i(){if(Mt===null)throw Error(t(321));return Mt}function ys(){if(0<ea)throw Error(t(312));return{memoizedState:null,queue:null,next:null}}function Ia(){return Ot===null?Wt===null?(oi=!1,Wt=Ot=ys()):(oi=!0,Ot=Wt):Ot.next===null?(oi=!1,Ot=Ot.next=ys()):(oi=!0,Ot=Ot.next),Ot}function Jn(){var a=dn;return dn=null,a}function Si(){zt=mn=fn=Mt=null,Ht=!1,Wt=null,ea=0,Ot=$n=null}function Fi(a,o){return typeof o=="function"?o(a):o}function Ui(a,o,h){if(Mt=_i(),Ot=Ia(),oi){var _=Ot.queue;if(o=_.dispatch,$n!==null&&(h=$n.get(_),h!==void 0)){$n.delete(_),_=Ot.memoizedState;do _=a(_,h.action),h=h.next;while(h!==null);return Ot.memoizedState=_,[_,o]}return[Ot.memoizedState,o]}return a=a===Fi?typeof o=="function"?o():o:h!==void 0?h(o):o,Ot.memoizedState=a,a=Ot.queue={last:null,dispatch:null},a=a.dispatch=Er.bind(null,Mt,a),[Ot.memoizedState,a]}function $i(a,o){if(Mt=_i(),Ot=Ia(),o=o===void 0?null:o,Ot!==null){var h=Ot.memoizedState;if(h!==null&&o!==null){var _=h[1];e:if(_===null)_=!1;else{for(var y=0;y<_.length&&y<o.length;y++)if(!_t(o[y],_[y])){_=!1;break e}_=!0}if(_)return h[0]}}return a=a(),Ot.memoizedState=[a,o],a}function Er(a,o,h){if(25<=ea)throw Error(t(301));if(a===Mt)if(Ht=!0,a={action:h,next:null},$n===null&&($n=new Map),h=$n.get(o),h===void 0)$n.set(o,a);else{for(o=h;o.next!==null;)o=o.next;o.next=a}}function Dn(){throw Error(t(440))}function ta(){throw Error(t(394))}function Ss(){throw Error(t(479))}function Dl(a,o,h){_i();var _=Zt++,y=mn;if(typeof a.$$FORM_ACTION=="function"){var P=null,N=zt;y=y.formState;var ee=a.$$IS_SIGNATURE_EQUAL;if(y!==null&&typeof ee=="function"){var V=y[1];ee.call(a,y[2],y[3])&&(P=h!==void 0?"p"+h:"k"+W(JSON.stringify([N,null,_]),0),V===P&&(Tn=_,o=y[0]))}var te=a.bind(null,o);return a=function(ve){te(ve)},typeof te.$$FORM_ACTION=="function"&&(a.$$FORM_ACTION=function(ve){ve=te.$$FORM_ACTION(ve),h!==void 0&&(h+="",ve.action=h);var Be=ve.data;return Be&&(P===null&&(P=h!==void 0?"p"+h:"k"+W(JSON.stringify([N,null,_]),0)),Be.append("$ACTION_KEY",P)),ve}),[o,a,!1]}var de=a.bind(null,o);return[o,function(ve){de(ve)},!1]}function Il(a){var o=An;return An+=1,dn===null&&(dn=[]),lt(dn,a,o)}function Vc(){throw Error(t(393))}var Ll={readContext:function(a){return a._currentValue},use:function(a){if(a!==null&&typeof a=="object"){if(typeof a.then=="function")return Il(a);if(a.$$typeof===p)return a._currentValue}throw Error(t(438,String(a)))},useContext:function(a){return _i(),a._currentValue},useMemo:$i,useReducer:Ui,useRef:function(a){Mt=_i(),Ot=Ia();var o=Ot.memoizedState;return o===null?(a={current:a},Ot.memoizedState=a):o},useState:function(a){return Ui(Fi,a)},useInsertionEffect:Se,useLayoutEffect:Se,useCallback:function(a,o){return $i(function(){return a},o)},useImperativeHandle:Se,useEffect:Se,useDebugValue:Se,useDeferredValue:function(a,o){return _i(),o!==void 0?o:a},useTransition:function(){return _i(),[!1,ta]},useId:function(){var a=fn.treeContext,o=a.overflow;a=a.id,a=(a&~(1<<32-ge(a)-1)).toString(32)+o;var h=Es;if(h===null)throw Error(t(404));return o=gi++,a="_"+h.idPrefix+"R_"+a,0<o&&(a+="H"+o.toString(32)),a+"_"},useSyncExternalStore:function(a,o,h){if(h===void 0)throw Error(t(407));return h()},useOptimistic:function(a){return _i(),[a,Ss]},useActionState:Dl,useFormState:Dl,useHostTransitionStatus:function(){return _i(),En},useMemoCache:function(a){for(var o=Array(a),h=0;h<a;h++)o[h]=B;return o},useCacheRefresh:function(){return Vc},useEffectEvent:function(){return Dn}},Es=null,Wc={getCacheForType:function(){throw Error(t(248))},cacheSignal:function(){throw Error(t(248))}},na,Xi;function ia(a){if(na===void 0)try{throw Error()}catch(h){var o=h.stack.trim().match(/\n( *(at )?)/);na=o&&o[1]||"",Xi=-1<h.stack.indexOf(`
    at`)?" (<anonymous>)":-1<h.stack.indexOf("@")?"@unknown:0:0":""}return`
`+na+a+Xi}var Ro=!1;function Tr(a,o){if(!a||Ro)return"";Ro=!0;var h=Error.prepareStackTrace;Error.prepareStackTrace=void 0;try{var _={DetermineComponentFrameRoot:function(){try{if(o){var ve=function(){throw Error()};if(Object.defineProperty(ve.prototype,"props",{set:function(){throw Error()}}),typeof Reflect=="object"&&Reflect.construct){try{Reflect.construct(ve,[])}catch(Ye){var Be=Ye}Reflect.construct(a,[],ve)}else{try{ve.call()}catch(Ye){Be=Ye}a.call(ve.prototype)}}else{try{throw Error()}catch(Ye){Be=Ye}(ve=a())&&typeof ve.catch=="function"&&ve.catch(function(){})}}catch(Ye){if(Ye&&Be&&typeof Ye.stack=="string")return[Ye.stack,Be.stack]}return[null,null]}};_.DetermineComponentFrameRoot.displayName="DetermineComponentFrameRoot";var y=Object.getOwnPropertyDescriptor(_.DetermineComponentFrameRoot,"name");y&&y.configurable&&Object.defineProperty(_.DetermineComponentFrameRoot,"name",{value:"DetermineComponentFrameRoot"});var P=_.DetermineComponentFrameRoot(),N=P[0],ee=P[1];if(N&&ee){var V=N.split(`
`),te=ee.split(`
`);for(y=_=0;_<V.length&&!V[_].includes("DetermineComponentFrameRoot");)_++;for(;y<te.length&&!te[y].includes("DetermineComponentFrameRoot");)y++;if(_===V.length||y===te.length)for(_=V.length-1,y=te.length-1;1<=_&&0<=y&&V[_]!==te[y];)y--;for(;1<=_&&0<=y;_--,y--)if(V[_]!==te[y]){if(_!==1||y!==1)do if(_--,y--,0>y||V[_]!==te[y]){var de=`
`+V[_].replace(" at new "," at ");return a.displayName&&de.includes("<anonymous>")&&(de=de.replace("<anonymous>",a.displayName)),de}while(1<=_&&0<=y);break}}}finally{Ro=!1,Error.prepareStackTrace=h}return(h=a?a.displayName||a.name:"")?ia(h):""}function Nl(a){if(typeof a=="string")return ia(a);if(typeof a=="function")return a.prototype&&a.prototype.isReactComponent?Tr(a,!0):Tr(a,!1);if(typeof a=="object"&&a!==null){switch(a.$$typeof){case g:return Tr(a.render,!1);case M:return Tr(a.type,!1);case A:var o=a,h=o._payload;o=o._init;try{a=o(h)}catch{return ia("Lazy")}return Nl(a)}if(typeof a.name=="string"){e:{h=a.name,o=a.env;var _=a.debugLocation;if(_!=null&&(a=Error.prepareStackTrace,Error.prepareStackTrace=void 0,_=_.stack,Error.prepareStackTrace=a,_.startsWith(`Error: react-stack-top-frame
`)&&(_=_.slice(29)),a=_.indexOf(`
`),a!==-1&&(_=_.slice(a+1)),a=_.indexOf("react_stack_bottom_frame"),a!==-1&&(a=_.lastIndexOf(`
`,a)),a=a!==-1?_=_.slice(0,a):"",_=a.lastIndexOf(`
`),a=_===-1?a:a.slice(_+1),a.indexOf(h)!==-1)){h=`
`+a;break e}h=ia(h+(o?" ["+o+"]":""))}return h}}switch(a){case x:return ia("SuspenseList");case b:return ia("Suspense")}return""}function Ei(a,o){return(500<o.byteSize||Ms(o.contentState))&&o.contentPreamble===null}function Ts(a){if(typeof a=="object"&&a!==null&&typeof a.environmentName=="string"){var o=a.environmentName;a=[a].slice(0),typeof a[0]=="string"?a.splice(0,1,"%c%s%c "+a[0],"background: #e6e6e6;background: light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.25));color: #000000;color: light-dark(#000000, #ffffff);border-radius: 2px"," "+o+" ",""):a.splice(0,0,"%c%s%c","background: #e6e6e6;background: light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.25));color: #000000;color: light-dark(#000000, #ffffff);border-radius: 2px"," "+o+" ",""),a.unshift(console),o=To.apply(console.error,a),o()}else console.error(a);return null}function La(a,o,h,_,y,P,N,ee,V,te,de){var ve=new Set;this.destination=null,this.flushScheduled=!1,this.resumableState=a,this.renderState=o,this.rootFormatContext=h,this.progressiveChunkSize=_===void 0?12800:_,this.status=10,this.fatalError=null,this.pendingRootTasks=this.allPendingTasks=this.nextSegmentId=0,this.completedPreambleSegments=this.completedRootSegment=null,this.byteSize=0,this.abortableTasks=ve,this.pingedTasks=[],this.clientRenderedBoundaries=[],this.completedBoundaries=[],this.partialBoundaries=[],this.trackedPostpones=null,this.onError=y===void 0?Ts:y,this.onPostpone=te===void 0?Se:te,this.onAllReady=P===void 0?Se:P,this.onShellReady=N===void 0?Se:N,this.onShellError=ee===void 0?Se:ee,this.onFatalError=V===void 0?Se:V,this.formState=de===void 0?null:de}function Na(a,o,h,_,y,P,N,ee,V,te,de,ve){return o=new La(o,h,_,y,P,N,ee,V,te,de,ve),h=Ti(o,0,null,_,!1,!1),h.parentFlushed=!0,a=Ar(o,null,a,-1,null,h,null,null,o.abortableTasks,null,_,null,L,null,null),Rr(a),o.pingedTasks.push(a),o}function ws(a,o,h,_,y,P,N,ee,V,te,de){return a=Na(a,o,h,_,y,P,N,ee,V,te,de,void 0),a.trackedPostpones={workingMap:new Map,rootNodes:[],rootSlots:null},a}function er(a,o,h,_,y,P,N,ee,V){return h=new La(o.resumableState,h,o.rootFormatContext,o.progressiveChunkSize,_,y,P,N,ee,V,null),h.nextSegmentId=o.nextSegmentId,typeof o.replaySlots=="number"?(_=Ti(h,0,null,o.rootFormatContext,!1,!1),_.parentFlushed=!0,a=Ar(h,null,a,-1,null,_,null,null,h.abortableTasks,null,o.rootFormatContext,null,L,null,null),Rr(a),h.pingedTasks.push(a),h):(a=Co(h,null,{nodes:o.replayNodes,slots:o.replaySlots,pendingTasks:0},a,-1,null,null,h.abortableTasks,null,o.rootFormatContext,null,L,null,null),Rr(a),h.pingedTasks.push(a),h)}function Fl(a,o,h,_,y,P,N,ee,V){return a=er(a,o,h,_,y,P,N,ee,V),a.trackedPostpones={workingMap:new Map,rootNodes:[],rootSlots:null},a}var Rn=null;function wr(a,o){a.pingedTasks.push(o),a.pingedTasks.length===1&&(a.flushScheduled=a.destination!==null,a.trackedPostpones!==null||a.status===10?pe(function(){return kl(a)}):Z(function(){return kl(a)}))}function Fa(a,o,h,_,y){return h={status:0,rootSegmentID:-1,parentFlushed:!1,pendingTasks:0,row:o,completedSegments:[],byteSize:0,fallbackAbortableTasks:h,errorDigest:null,contentState:Zr(),fallbackState:Zr(),contentPreamble:_,fallbackPreamble:y,trackedContentKeyPath:null,trackedFallbackNode:null},o!==null&&(o.pendingTasks++,_=o.boundaries,_!==null&&(a.allPendingTasks++,h.pendingTasks++,_.push(h)),a=o.inheritedHoistables,a!==null&&jr(h.contentState,a)),h}function Ar(a,o,h,_,y,P,N,ee,V,te,de,ve,Be,Ye,Bt){a.allPendingTasks++,y===null?a.pendingRootTasks++:y.pendingTasks++,Ye!==null&&Ye.pendingTasks++;var yt={replay:null,node:h,childIndex:_,ping:function(){return wr(a,yt)},blockedBoundary:y,blockedSegment:P,blockedPreamble:N,hoistableState:ee,abortSet:V,keyPath:te,formatContext:de,context:ve,treeContext:Be,row:Ye,componentStack:Bt,thenableState:o};return V.add(yt),yt}function Co(a,o,h,_,y,P,N,ee,V,te,de,ve,Be,Ye){a.allPendingTasks++,P===null?a.pendingRootTasks++:P.pendingTasks++,Be!==null&&Be.pendingTasks++,h.pendingTasks++;var Bt={replay:h,node:_,childIndex:y,ping:function(){return wr(a,Bt)},blockedBoundary:P,blockedSegment:null,blockedPreamble:null,hoistableState:N,abortSet:ee,keyPath:V,formatContext:te,context:de,treeContext:ve,row:Be,componentStack:Ye,thenableState:o};return ee.add(Bt),Bt}function Ti(a,o,h,_,y,P){return{status:0,parentFlushed:!1,id:-1,index:o,chunks:[],children:[],preambleChildren:[],parentFormatContext:_,boundary:h,lastPushedText:y,textEmbedded:P}}function Rr(a){var o=a.node;if(typeof o=="object"&&o!==null)switch(o.$$typeof){case i:a.componentStack={parent:a.componentStack,type:o.type}}}function ra(a){return a===null?null:{parent:a.parent,type:"Suspense Fallback"}}function wi(a){var o={};return a&&Object.defineProperty(o,"componentStack",{configurable:!0,enumerable:!0,get:function(){try{var h="",_=a;do h+=Nl(_.type),_=_.parent;while(_);var y=h}catch(P){y=`
Error generating stack: `+P.message+`
`+P.stack}return Object.defineProperty(o,"componentStack",{value:y}),y}}),o}function Un(a,o,h){if(a=a.onError,o=a(o,h),o==null||typeof o=="string")return o}function Ua(a,o){var h=a.onShellError,_=a.onFatalError;h(o),_(o),a.destination!==null?(a.status=14,Pe(a.destination,o)):(a.status=13,a.fatalError=o)}function Qn(a,o){Ul(a,o.next,o.hoistables)}function Ul(a,o,h){for(;o!==null;){h!==null&&(jr(o.hoistables,h),o.inheritedHoistables=h);var _=o.boundaries;if(_!==null){o.boundaries=null;for(var y=0;y<_.length;y++){var P=_[y];h!==null&&jr(P.contentState,h),xi(a,P,null,null)}}if(o.pendingTasks--,0<o.pendingTasks)break;h=o.hoistables,o=o.next}}function As(a,o){var h=o.boundaries;if(h!==null&&o.pendingTasks===h.length){for(var _=!0,y=0;y<h.length;y++){var P=h[y];if(P.pendingTasks!==1||P.parentFlushed||Ei(a,P)){_=!1;break}}_&&Ul(a,o,o.hoistables)}}function Rs(a){var o={pendingTasks:1,boundaries:null,hoistables:Zr(),inheritedHoistables:null,together:!1,next:null};return a!==null&&0<a.pendingTasks&&(o.pendingTasks++,o.boundaries=[],a.next=o),o}function Xc(a,o,h,_,y){var P=o.keyPath,N=o.treeContext,ee=o.row;o.keyPath=h,h=_.length;var V=null;if(o.replay!==null){var te=o.replay.slots;if(te!==null&&typeof te=="object")for(var de=0;de<h;de++){var ve=y!=="backwards"&&y!=="unstable_legacy-backwards"?de:h-1-de,Be=_[ve];o.row=V=Rs(V),o.treeContext=k(N,h,ve);var Ye=te[ve];typeof Ye=="number"?(Cr(a,o,Ye,Be,ve),delete te[ve]):Mn(a,o,Be,ve),--V.pendingTasks===0&&Qn(a,V)}else for(te=0;te<h;te++)de=y!=="backwards"&&y!=="unstable_legacy-backwards"?te:h-1-te,ve=_[de],o.row=V=Rs(V),o.treeContext=k(N,h,de),Mn(a,o,ve,de),--V.pendingTasks===0&&Qn(a,V)}else if(y!=="backwards"&&y!=="unstable_legacy-backwards")for(y=0;y<h;y++)te=_[y],o.row=V=Rs(V),o.treeContext=k(N,h,y),Mn(a,o,te,y),--V.pendingTasks===0&&Qn(a,V);else{for(y=o.blockedSegment,te=y.children.length,de=y.chunks.length,ve=h-1;0<=ve;ve--){Be=_[ve],o.row=V=Rs(V),o.treeContext=k(N,h,ve),Ye=Ti(a,de,null,o.formatContext,ve===0?y.lastPushedText:!0,!0),y.children.splice(te,0,Ye),o.blockedSegment=Ye;try{Mn(a,o,Be,ve),Ye.lastPushedText&&Ye.textEmbedded&&Ye.chunks.push(Fe),Ye.status=1,nr(a,o.blockedBoundary,Ye),--V.pendingTasks===0&&Qn(a,V)}catch(Bt){throw Ye.status=a.status===12?3:4,Bt}}o.blockedSegment=y,y.lastPushedText=!1}ee!==null&&V!==null&&0<V.pendingTasks&&(ee.pendingTasks++,V.next=ee),o.treeContext=N,o.row=ee,o.keyPath=P}function Yc(a,o,h,_,y,P){var N=o.thenableState;for(o.thenableState=null,Mt={},fn=o,mn=a,zt=h,Zt=gi=0,Tn=-1,An=0,dn=N,a=_(y,P);Ht;)Ht=!1,Zt=gi=0,Tn=-1,An=0,ea+=1,Ot=null,a=_(y,P);return Si(),a}function tr(a,o,h,_,y,P,N){var ee=!1;if(P!==0&&a.formState!==null){var V=o.blockedSegment;if(V!==null){ee=!0,V=V.chunks;for(var te=0;te<P;te++)te===N?V.push(pl):V.push(I)}}P=o.keyPath,o.keyPath=h,y?(h=o.treeContext,o.treeContext=k(h,1,0),Mn(a,o,_,-1),o.treeContext=h):ee?Mn(a,o,_,-1):On(a,o,_,-1),o.keyPath=P}function aa(a,o,h,_,y,P){if(typeof _=="function")if(_.prototype&&_.prototype.isReactComponent){var N=y;if("ref"in y){N={};for(var ee in y)ee!=="ref"&&(N[ee]=y[ee])}var V=_.defaultProps;if(V){N===y&&(N=tt({},N,y));for(var te in V)N[te]===void 0&&(N[te]=V[te])}y=N,N=Gc,V=_.contextType,typeof V=="object"&&V!==null&&(N=V._currentValue),N=new _(y,N);var de=N.state!==void 0?N.state:null;if(N.updater=E,N.props=y,N.state=de,V={queue:[],replace:!1},N._reactInternals=V,P=_.contextType,N.context=typeof P=="object"&&P!==null?P._currentValue:Gc,P=_.getDerivedStateFromProps,typeof P=="function"&&(P=P(y,de),de=P==null?de:tt({},de,P),N.state=de),typeof _.getDerivedStateFromProps!="function"&&typeof N.getSnapshotBeforeUpdate!="function"&&(typeof N.UNSAFE_componentWillMount=="function"||typeof N.componentWillMount=="function"))if(_=N.state,typeof N.componentWillMount=="function"&&N.componentWillMount(),typeof N.UNSAFE_componentWillMount=="function"&&N.UNSAFE_componentWillMount(),_!==N.state&&E.enqueueReplaceState(N,N.state,null),V.queue!==null&&0<V.queue.length)if(_=V.queue,P=V.replace,V.queue=null,V.replace=!1,P&&_.length===1)N.state=_[0];else{for(V=P?_[0]:N.state,de=!0,P=P?1:0;P<_.length;P++)te=_[P],te=typeof te=="function"?te.call(N,V,y,void 0):te,te!=null&&(de?(de=!1,V=tt({},V,te)):tt(V,te));N.state=V}else V.queue=null;if(_=N.render(),a.status===12)throw null;y=o.keyPath,o.keyPath=h,On(a,o,_,-1),o.keyPath=y}else{if(_=Yc(a,o,h,_,y,void 0),a.status===12)throw null;tr(a,o,h,_,gi!==0,Zt,Tn)}else if(typeof _=="string")if(N=o.blockedSegment,N===null)N=y.children,V=o.formatContext,de=o.keyPath,o.formatContext=J(V,_,y),o.keyPath=h,Mn(a,o,N,-1),o.formatContext=V,o.keyPath=de;else{if(de=bn(N.chunks,_,y,a.resumableState,a.renderState,o.blockedPreamble,o.hoistableState,o.formatContext,N.lastPushedText),N.lastPushedText=!1,V=o.formatContext,P=o.keyPath,o.keyPath=h,(o.formatContext=J(V,_,y)).insertionMode===3){h=Ti(a,0,null,o.formatContext,!1,!1),N.preambleChildren.push(h),o.blockedSegment=h;try{h.status=6,Mn(a,o,de,-1),h.lastPushedText&&h.textEmbedded&&h.chunks.push(Fe),h.status=1,nr(a,o.blockedBoundary,h)}finally{o.blockedSegment=N}}else Mn(a,o,de,-1);o.formatContext=V,o.keyPath=P;e:{switch(o=N.chunks,a=a.resumableState,_){case"title":case"style":case"script":case"area":case"base":case"br":case"col":case"embed":case"hr":case"img":case"input":case"keygen":case"link":case"meta":case"param":case"source":case"track":case"wbr":break e;case"body":if(1>=V.insertionMode){a.hasBody=!0;break e}break;case"html":if(V.insertionMode===0){a.hasHtml=!0;break e}break;case"head":if(1>=V.insertionMode)break e}o.push(gn(_))}N.lastPushedText=!1}else{switch(_){case S:case u:case d:case c:_=o.keyPath,o.keyPath=h,On(a,o,y.children,-1),o.keyPath=_;return;case T:_=o.blockedSegment,_===null?y.mode!=="hidden"&&(_=o.keyPath,o.keyPath=h,Mn(a,o,y.children,-1),o.keyPath=_):y.mode!=="hidden"&&(_.chunks.push(Pt),_.lastPushedText=!1,N=o.keyPath,o.keyPath=h,Mn(a,o,y.children,-1),o.keyPath=N,_.chunks.push(rn),_.lastPushedText=!1);return;case x:e:{if(_=y.children,y=y.revealOrder,y==="forwards"||y==="backwards"||y==="unstable_legacy-backwards"){if(U(_)){Xc(a,o,h,_,y);break e}if((N=z(_))&&(N=N.call(_))){if(V=N.next(),!V.done){do V=N.next();while(!V.done);Xc(a,o,h,_,y)}break e}}y==="together"?(y=o.keyPath,N=o.row,V=o.row=Rs(null),V.boundaries=[],V.together=!0,o.keyPath=h,On(a,o,_,-1),--V.pendingTasks===0&&Qn(a,V),o.keyPath=y,o.row=N,N!==null&&0<V.pendingTasks&&(N.pendingTasks++,V.next=N)):(y=o.keyPath,o.keyPath=h,On(a,o,_,-1),o.keyPath=y)}return;case G:case C:throw Error(t(343));case b:e:if(o.replay!==null){_=o.keyPath,N=o.formatContext,V=o.row,o.keyPath=h,o.formatContext=Oe(a.resumableState,N),o.row=null,h=y.children;try{Mn(a,o,h,-1)}finally{o.keyPath=_,o.formatContext=N,o.row=V}}else{_=o.keyPath,P=o.formatContext;var ve=o.row;te=o.blockedBoundary,ee=o.blockedPreamble;var Be=o.hoistableState,Ye=o.blockedSegment,Bt=y.fallback;y=y.children;var yt=new Set,At=2>o.formatContext.insertionMode?Fa(a,o.row,yt,We(),We()):Fa(a,o.row,yt,null,null);a.trackedPostpones!==null&&(At.trackedContentKeyPath=h);var hn=Ti(a,Ye.chunks.length,At,o.formatContext,!1,!1);Ye.children.push(hn),Ye.lastPushedText=!1;var tn=Ti(a,0,null,o.formatContext,!1,!1);if(tn.parentFlushed=!0,a.trackedPostpones!==null){N=o.componentStack,V=[h[0],"Suspense Fallback",h[2]],de=[V[1],V[2],[],null],a.trackedPostpones.workingMap.set(V,de),At.trackedFallbackNode=de,o.blockedSegment=hn,o.blockedPreamble=At.fallbackPreamble,o.keyPath=V,o.formatContext=Te(a.resumableState,P),o.componentStack=ra(N),hn.status=6;try{Mn(a,o,Bt,-1),hn.lastPushedText&&hn.textEmbedded&&hn.chunks.push(Fe),hn.status=1,nr(a,te,hn)}catch(Bn){throw hn.status=a.status===12?3:4,Bn}finally{o.blockedSegment=Ye,o.blockedPreamble=ee,o.keyPath=_,o.formatContext=P}o=Ar(a,null,y,-1,At,tn,At.contentPreamble,At.contentState,o.abortSet,h,Oe(a.resumableState,o.formatContext),o.context,o.treeContext,null,N),Rr(o),a.pingedTasks.push(o)}else{o.blockedBoundary=At,o.blockedPreamble=At.contentPreamble,o.hoistableState=At.contentState,o.blockedSegment=tn,o.keyPath=h,o.formatContext=Oe(a.resumableState,P),o.row=null,tn.status=6;try{if(Mn(a,o,y,-1),tn.lastPushedText&&tn.textEmbedded&&tn.chunks.push(Fe),tn.status=1,nr(a,At,tn),Ds(At,tn),At.pendingTasks===0&&At.status===0){if(At.status=1,!Ei(a,At)){ve!==null&&--ve.pendingTasks===0&&Qn(a,ve),a.pendingRootTasks===0&&o.blockedPreamble&&ir(a);break e}}else ve!==null&&ve.together&&As(a,ve)}catch(Bn){At.status=4,a.status===12?(tn.status=3,N=a.fatalError):(tn.status=4,N=Bn),V=wi(o.componentStack),de=Un(a,N,V),At.errorDigest=de,Ol(a,At)}finally{o.blockedBoundary=te,o.blockedPreamble=ee,o.hoistableState=Be,o.blockedSegment=Ye,o.keyPath=_,o.formatContext=P,o.row=ve}o=Ar(a,null,Bt,-1,te,hn,At.fallbackPreamble,At.fallbackState,yt,[h[0],"Suspense Fallback",h[2]],Te(a.resumableState,o.formatContext),o.context,o.treeContext,o.row,ra(o.componentStack)),Rr(o),a.pingedTasks.push(o)}}return}if(typeof _=="object"&&_!==null)switch(_.$$typeof){case g:if("ref"in y)for(Ye in N={},y)Ye!=="ref"&&(N[Ye]=y[Ye]);else N=y;_=Yc(a,o,h,_.render,N,P),tr(a,o,h,_,gi!==0,Zt,Tn);return;case M:aa(a,o,h,_.type,y,P);return;case p:if(V=y.children,N=o.keyPath,y=y.value,de=_._currentValue,_._currentValue=y,P=Wi,Wi=_={parent:P,depth:P===null?0:P.depth+1,context:_,parentValue:de,value:y},o.context=_,o.keyPath=h,On(a,o,V,-1),a=Wi,a===null)throw Error(t(403));a.context._currentValue=a.parentValue,a=Wi=a.parent,o.context=a,o.keyPath=N;return;case m:y=y.children,_=y(_._context._currentValue),y=o.keyPath,o.keyPath=h,On(a,o,_,-1),o.keyPath=y;return;case A:if(N=_._init,_=N(_._payload),a.status===12)throw null;aa(a,o,h,_,y,P);return}throw Error(t(130,_==null?_:typeof _,""))}}function Cr(a,o,h,_,y){var P=o.replay,N=o.blockedBoundary,ee=Ti(a,0,null,o.formatContext,!1,!1);ee.id=h,ee.parentFlushed=!0;try{o.replay=null,o.blockedSegment=ee,Mn(a,o,_,y),ee.status=1,nr(a,N,ee),N===null?a.completedRootSegment=ee:(Ds(N,ee),N.parentFlushed&&a.partialBoundaries.push(N))}finally{o.replay=P,o.blockedSegment=null}}function On(a,o,h,_){o.replay!==null&&typeof o.replay.slots=="number"?Cr(a,o,o.replay.slots,h,_):(o.node=h,o.childIndex=_,h=o.componentStack,Rr(o),Oa(a,o),o.componentStack=h)}function Oa(a,o){var h=o.node,_=o.childIndex;if(h!==null){if(typeof h=="object"){switch(h.$$typeof){case i:var y=h.type,P=h.key,N=h.props;h=N.ref;var ee=h!==void 0?h:null,V=wo(y),te=P??(_===-1?0:_);if(P=[o.keyPath,V,te],o.replay!==null)e:{var de=o.replay;for(_=de.nodes,h=0;h<_.length;h++){var ve=_[h];if(te===ve[1]){if(ve.length===4){if(V!==null&&V!==ve[0])throw Error(t(490,ve[0],V));var Be=ve[2];V=ve[3],te=o.node,o.replay={nodes:Be,slots:V,pendingTasks:1};try{if(aa(a,o,P,y,N,ee),o.replay.pendingTasks===1&&0<o.replay.nodes.length)throw Error(t(488));o.replay.pendingTasks--}catch(dt){if(typeof dt=="object"&&dt!==null&&(dt===ke||typeof dt.then=="function"))throw o.node===te?o.replay=de:_.splice(h,1),dt;o.replay.pendingTasks--,N=wi(o.componentStack),P=a,a=o.blockedBoundary,y=dt,N=Un(P,y,N),ka(P,a,Be,V,y,N)}o.replay=de}else{if(y!==b)throw Error(t(490,"Suspense",wo(y)||"Unknown"));t:{de=void 0,y=ve[5],ee=ve[2],V=ve[3],te=ve[4]===null?[]:ve[4][2],ve=ve[4]===null?null:ve[4][3];var Ye=o.keyPath,Bt=o.formatContext,yt=o.row,At=o.replay,hn=o.blockedBoundary,tn=o.hoistableState,Bn=N.children,li=N.fallback,Ri=new Set;N=2>o.formatContext.insertionMode?Fa(a,o.row,Ri,We(),We()):Fa(a,o.row,Ri,null,null),N.parentFlushed=!0,N.rootSegmentID=y,o.blockedBoundary=N,o.hoistableState=N.contentState,o.keyPath=P,o.formatContext=Oe(a.resumableState,Bt),o.row=null,o.replay={nodes:ee,slots:V,pendingTasks:1};try{if(Mn(a,o,Bn,-1),o.replay.pendingTasks===1&&0<o.replay.nodes.length)throw Error(t(488));if(o.replay.pendingTasks--,N.pendingTasks===0&&N.status===0){N.status=1,a.completedBoundaries.push(N);break t}}catch(dt){N.status=4,Be=wi(o.componentStack),de=Un(a,dt,Be),N.errorDigest=de,o.replay.pendingTasks--,a.clientRenderedBoundaries.push(N)}finally{o.blockedBoundary=hn,o.hoistableState=tn,o.replay=At,o.keyPath=Ye,o.formatContext=Bt,o.row=yt}Be=Co(a,null,{nodes:te,slots:ve,pendingTasks:0},li,-1,hn,N.fallbackState,Ri,[P[0],"Suspense Fallback",P[2]],Te(a.resumableState,o.formatContext),o.context,o.treeContext,o.row,ra(o.componentStack)),Rr(Be),a.pingedTasks.push(Be)}}_.splice(h,1);break e}}}else aa(a,o,P,y,N,ee);return;case r:throw Error(t(257));case A:if(Be=h._init,h=Be(h._payload),a.status===12)throw null;On(a,o,h,_);return}if(U(h)){Ba(a,o,h,_);return}if((Be=z(h))&&(Be=Be.call(h))){if(h=Be.next(),!h.done){N=[];do N.push(h.value),h=Be.next();while(!h.done);Ba(a,o,N,_)}return}if(typeof h.then=="function")return o.thenableState=null,On(a,o,Il(h),_);if(h.$$typeof===p)return On(a,o,h._currentValue,_);throw _=Object.prototype.toString.call(h),Error(t(31,_==="[object Object]"?"object with keys {"+Object.keys(h).join(", ")+"}":_))}typeof h=="string"?(_=o.blockedSegment,_!==null&&(_.lastPushedText=Re(_.chunks,h,a.renderState,_.lastPushedText))):(typeof h=="number"||typeof h=="bigint")&&(_=o.blockedSegment,_!==null&&(_.lastPushedText=Re(_.chunks,""+h,a.renderState,_.lastPushedText)))}}function Ba(a,o,h,_){var y=o.keyPath;if(_!==-1&&(o.keyPath=[o.keyPath,"Fragment",_],o.replay!==null)){for(var P=o.replay,N=P.nodes,ee=0;ee<N.length;ee++){var V=N[ee];if(V[1]===_){_=V[2],V=V[3],o.replay={nodes:_,slots:V,pendingTasks:1};try{if(Ba(a,o,h,-1),o.replay.pendingTasks===1&&0<o.replay.nodes.length)throw Error(t(488));o.replay.pendingTasks--}catch(ve){if(typeof ve=="object"&&ve!==null&&(ve===ke||typeof ve.then=="function"))throw ve;o.replay.pendingTasks--,h=wi(o.componentStack);var te=o.blockedBoundary,de=ve;h=Un(a,de,h),ka(a,te,_,V,de,h)}o.replay=P,N.splice(ee,1);break}}o.keyPath=y;return}if(P=o.treeContext,N=h.length,o.replay!==null&&(ee=o.replay.slots,ee!==null&&typeof ee=="object")){for(_=0;_<N;_++)V=h[_],o.treeContext=k(P,N,_),te=ee[_],typeof te=="number"?(Cr(a,o,te,V,_),delete ee[_]):Mn(a,o,V,_);o.treeContext=P,o.keyPath=y;return}for(ee=0;ee<N;ee++)_=h[ee],o.treeContext=k(P,N,ee),Mn(a,o,_,ee);o.treeContext=P,o.keyPath=y}function Po(a,o,h){if(h.status=5,h.rootSegmentID=a.nextSegmentId++,a=h.trackedContentKeyPath,a===null)throw Error(t(486));var _=h.trackedFallbackNode,y=[],P=o.workingMap.get(a);return P===void 0?(h=[a[1],a[2],y,null,_,h.rootSegmentID],o.workingMap.set(a,h),Fo(h,a[0],o),h):(P[4]=_,P[5]=h.rootSegmentID,P)}function Do(a,o,h,_){_.status=5;var y=h.keyPath,P=h.blockedBoundary;if(P===null)_.id=a.nextSegmentId++,o.rootSlots=_.id,a.completedRootSegment!==null&&(a.completedRootSegment.status=5);else{if(P!==null&&P.status===0){var N=Po(a,o,P);if(P.trackedContentKeyPath===y&&h.childIndex===-1){_.id===-1&&(_.id=_.parentFlushed?P.rootSegmentID:a.nextSegmentId++),N[3]=_.id;return}}if(_.id===-1&&(_.id=_.parentFlushed&&P!==null?P.rootSegmentID:a.nextSegmentId++),h.childIndex===-1)y===null?o.rootSlots=_.id:(h=o.workingMap.get(y),h===void 0?(h=[y[1],y[2],[],_.id],Fo(h,y[0],o)):h[3]=_.id);else{if(y===null){if(a=o.rootSlots,a===null)a=o.rootSlots={};else if(typeof a=="number")throw Error(t(491))}else if(P=o.workingMap,N=P.get(y),N===void 0)a={},N=[y[1],y[2],[],a],P.set(y,N),Fo(N,y[0],o);else if(a=N[3],a===null)a=N[3]={};else if(typeof a=="number")throw Error(t(491));a[h.childIndex]=_.id}}}function Ol(a,o){a=a.trackedPostpones,a!==null&&(o=o.trackedContentKeyPath,o!==null&&(o=a.workingMap.get(o),o!==void 0&&(o.length=4,o[2]=[],o[3]=null)))}function Io(a,o,h){return Co(a,h,o.replay,o.node,o.childIndex,o.blockedBoundary,o.hoistableState,o.abortSet,o.keyPath,o.formatContext,o.context,o.treeContext,o.row,o.componentStack)}function Bl(a,o,h){var _=o.blockedSegment,y=Ti(a,_.chunks.length,null,o.formatContext,_.lastPushedText,!0);return _.children.push(y),_.lastPushedText=!1,Ar(a,h,o.node,o.childIndex,o.blockedBoundary,y,o.blockedPreamble,o.hoistableState,o.abortSet,o.keyPath,o.formatContext,o.context,o.treeContext,o.row,o.componentStack)}function Mn(a,o,h,_){var y=o.formatContext,P=o.context,N=o.keyPath,ee=o.treeContext,V=o.componentStack,te=o.blockedSegment;if(te===null){te=o.replay;try{return On(a,o,h,_)}catch(Be){if(Si(),h=Be===ke?vt():Be,a.status!==12&&typeof h=="object"&&h!==null){if(typeof h.then=="function"){_=Be===ke?Jn():null,a=Io(a,o,_).ping,h.then(a,a),o.formatContext=y,o.context=P,o.keyPath=N,o.treeContext=ee,o.componentStack=V,o.replay=te,v(P);return}if(h.message==="Maximum call stack size exceeded"){h=Be===ke?Jn():null,h=Io(a,o,h),a.pingedTasks.push(h),o.formatContext=y,o.context=P,o.keyPath=N,o.treeContext=ee,o.componentStack=V,o.replay=te,v(P);return}}}}else{var de=te.children.length,ve=te.chunks.length;try{return On(a,o,h,_)}catch(Be){if(Si(),te.children.length=de,te.chunks.length=ve,h=Be===ke?vt():Be,a.status!==12&&typeof h=="object"&&h!==null){if(typeof h.then=="function"){te=h,h=Be===ke?Jn():null,a=Bl(a,o,h).ping,te.then(a,a),o.formatContext=y,o.context=P,o.keyPath=N,o.treeContext=ee,o.componentStack=V,v(P);return}if(h.message==="Maximum call stack size exceeded"){te=Be===ke?Jn():null,te=Bl(a,o,te),a.pingedTasks.push(te),o.formatContext=y,o.context=P,o.keyPath=N,o.treeContext=ee,o.componentStack=V,v(P);return}}}}throw o.formatContext=y,o.context=P,o.keyPath=N,o.treeContext=ee,v(P),h}function Lo(a){var o=a.blockedBoundary,h=a.blockedSegment;h!==null&&(h.status=3,xi(this,o,a.row,h))}function ka(a,o,h,_,y,P){for(var N=0;N<h.length;N++){var ee=h[N];if(ee.length===4)ka(a,o,ee[2],ee[3],y,P);else{ee=ee[5];var V=a,te=P,de=Fa(V,null,new Set,null,null);de.parentFlushed=!0,de.rootSegmentID=ee,de.status=4,de.errorDigest=te,de.parentFlushed&&V.clientRenderedBoundaries.push(de)}}if(h.length=0,_!==null){if(o===null)throw Error(t(487));if(o.status!==4&&(o.status=4,o.errorDigest=P,o.parentFlushed&&a.clientRenderedBoundaries.push(o)),typeof _=="object")for(var ve in _)delete _[ve]}}function za(a,o,h){var _=a.blockedBoundary,y=a.blockedSegment;if(y!==null){if(y.status===6)return;y.status=3}var P=wi(a.componentStack);if(_===null){if(o.status!==13&&o.status!==14){if(_=a.replay,_===null){o.trackedPostpones!==null&&y!==null?(_=o.trackedPostpones,Un(o,h,P),Do(o,_,a,y),xi(o,null,a.row,y)):(Un(o,h,P),Ua(o,h));return}_.pendingTasks--,_.pendingTasks===0&&0<_.nodes.length&&(y=Un(o,h,P),ka(o,null,_.nodes,_.slots,h,y)),o.pendingRootTasks--,o.pendingRootTasks===0&&No(o)}}else{var N=o.trackedPostpones;if(_.status!==4){if(N!==null&&y!==null)return Un(o,h,P),Do(o,N,a,y),_.fallbackAbortableTasks.forEach(function(ee){return za(ee,o,h)}),_.fallbackAbortableTasks.clear(),xi(o,_,a.row,y);_.status=4,y=Un(o,h,P),_.status=4,_.errorDigest=y,Ol(o,_),_.parentFlushed&&o.clientRenderedBoundaries.push(_)}_.pendingTasks--,y=_.row,y!==null&&--y.pendingTasks===0&&Qn(o,y),_.fallbackAbortableTasks.forEach(function(ee){return za(ee,o,h)}),_.fallbackAbortableTasks.clear()}a=a.row,a!==null&&--a.pendingTasks===0&&Qn(o,a),o.allPendingTasks--,o.allPendingTasks===0&&Ps(o)}function Cs(a,o){try{var h=a.renderState,_=h.onHeaders;if(_){var y=h.headers;if(y){h.headers=null;var P=y.preconnects;if(y.fontPreloads&&(P&&(P+=", "),P+=y.fontPreloads),y.highImagePreloads&&(P&&(P+=", "),P+=y.highImagePreloads),!o){var N=h.styles.values(),ee=N.next();e:for(;0<y.remainingCapacity&&!ee.done;ee=N.next())for(var V=ee.value.sheets.values(),te=V.next();0<y.remainingCapacity&&!te.done;te=V.next()){var de=te.value,ve=de.props,Be=ve.href,Ye=de.props,Bt=bs(Ye.href,"style",{crossOrigin:Ye.crossOrigin,integrity:Ye.integrity,nonce:Ye.nonce,type:Ye.type,fetchPriority:Ye.fetchPriority,referrerPolicy:Ye.referrerPolicy,media:Ye.media});if(0<=(y.remainingCapacity-=Bt.length+2))h.resets.style[Be]=Ft,P&&(P+=", "),P+=Bt,h.resets.style[Be]=typeof ve.crossOrigin=="string"||typeof ve.integrity=="string"?[ve.crossOrigin,ve.integrity]:Ft;else break e}}_(P?{Link:P}:{})}}}catch(yt){Un(a,yt,{})}}function No(a){a.trackedPostpones===null&&Cs(a,!0),a.trackedPostpones===null&&ir(a),a.onShellError=Se,a=a.onShellReady,a()}function Ps(a){Cs(a,a.trackedPostpones===null?!0:a.completedRootSegment===null||a.completedRootSegment.status!==5),ir(a),a=a.onAllReady,a()}function Ds(a,o){if(o.chunks.length===0&&o.children.length===1&&o.children[0].boundary===null&&o.children[0].id===-1){var h=o.children[0];h.id=o.id,h.parentFlushed=!0,h.status!==1&&h.status!==3&&h.status!==4||Ds(a,h)}else a.completedSegments.push(o)}function nr(a,o,h){if(ue!==null){h=h.chunks;for(var _=0,y=0;y<h.length;y++)_+=h[y].byteLength;o===null?a.byteSize+=_:o.byteSize+=_}}function xi(a,o,h,_){if(h!==null&&(--h.pendingTasks===0?Qn(a,h):h.together&&As(a,h)),a.allPendingTasks--,o===null){if(_!==null&&_.parentFlushed){if(a.completedRootSegment!==null)throw Error(t(389));a.completedRootSegment=_}a.pendingRootTasks--,a.pendingRootTasks===0&&No(a)}else if(o.pendingTasks--,o.status!==4)if(o.pendingTasks===0){if(o.status===0&&(o.status=1),_!==null&&_.parentFlushed&&(_.status===1||_.status===3)&&Ds(o,_),o.parentFlushed&&a.completedBoundaries.push(o),o.status===1)h=o.row,h!==null&&jr(h.hoistables,o.contentState),Ei(a,o)||(o.fallbackAbortableTasks.forEach(Lo,a),o.fallbackAbortableTasks.clear(),h!==null&&--h.pendingTasks===0&&Qn(a,h)),a.pendingRootTasks===0&&a.trackedPostpones===null&&o.contentPreamble!==null&&ir(a);else if(o.status===5&&(o=o.row,o!==null)){if(a.trackedPostpones!==null){h=a.trackedPostpones;var y=o.next;if(y!==null&&(_=y.boundaries,_!==null))for(y.boundaries=null,y=0;y<_.length;y++){var P=_[y];Po(a,h,P),xi(a,P,null,null)}}--o.pendingTasks===0&&Qn(a,o)}}else _===null||!_.parentFlushed||_.status!==1&&_.status!==3||(Ds(o,_),o.completedSegments.length===1&&o.parentFlushed&&a.partialBoundaries.push(o)),o=o.row,o!==null&&o.together&&As(a,o);a.allPendingTasks===0&&Ps(a)}function kl(a){if(a.status!==14&&a.status!==13){var o=Wi,h=Kt.H;Kt.H=Ll;var _=Kt.A;Kt.A=Wc;var y=Rn;Rn=a;var P=Es;Es=a.resumableState;try{var N=a.pingedTasks,ee;for(ee=0;ee<N.length;ee++){var V=N[ee],te=a,de=V.blockedSegment;if(de===null){var ve=te;if(V.replay.pendingTasks!==0){v(V.context);try{if(typeof V.replay.slots=="number"?Cr(ve,V,V.replay.slots,V.node,V.childIndex):Oa(ve,V),V.replay.pendingTasks===1&&0<V.replay.nodes.length)throw Error(t(488));V.replay.pendingTasks--,V.abortSet.delete(V),xi(ve,V.blockedBoundary,V.row,null)}catch(kn){Si();var Be=kn===ke?vt():kn;if(typeof Be=="object"&&Be!==null&&typeof Be.then=="function"){var Ye=V.ping;Be.then(Ye,Ye),V.thenableState=kn===ke?Jn():null}else{V.replay.pendingTasks--,V.abortSet.delete(V);var Bt=wi(V.componentStack);te=void 0;var yt=ve,At=V.blockedBoundary,hn=ve.status===12?ve.fatalError:Be,tn=V.replay.nodes,Bn=V.replay.slots;te=Un(yt,hn,Bt),ka(yt,At,tn,Bn,hn,te),ve.pendingRootTasks--,ve.pendingRootTasks===0&&No(ve),ve.allPendingTasks--,ve.allPendingTasks===0&&Ps(ve)}}finally{}}}else if(ve=void 0,yt=de,yt.status===0){yt.status=6,v(V.context);var li=yt.children.length,Ri=yt.chunks.length;try{Oa(te,V),yt.lastPushedText&&yt.textEmbedded&&yt.chunks.push(Fe),V.abortSet.delete(V),yt.status=1,nr(te,V.blockedBoundary,yt),xi(te,V.blockedBoundary,V.row,yt)}catch(kn){Si(),yt.children.length=li,yt.chunks.length=Ri;var dt=kn===ke?vt():te.status===12?te.fatalError:kn;if(te.status===12&&te.trackedPostpones!==null){var qn=te.trackedPostpones,xn=wi(V.componentStack);V.abortSet.delete(V),Un(te,dt,xn),Do(te,qn,V,yt),xi(te,V.blockedBoundary,V.row,yt)}else if(typeof dt=="object"&&dt!==null&&typeof dt.then=="function"){yt.status=0,V.thenableState=kn===ke?Jn():null;var ei=V.ping;dt.then(ei,ei)}else{var lr=wi(V.componentStack);V.abortSet.delete(V),yt.status=4;var vn=V.blockedBoundary,Ir=V.row;if(Ir!==null&&--Ir.pendingTasks===0&&Qn(te,Ir),te.allPendingTasks--,ve=Un(te,dt,lr),vn===null)Ua(te,dt);else if(vn.pendingTasks--,vn.status!==4){vn.status=4,vn.errorDigest=ve,Ol(te,vn);var Yi=vn.row;Yi!==null&&--Yi.pendingTasks===0&&Qn(te,Yi),vn.parentFlushed&&te.clientRenderedBoundaries.push(vn),te.pendingRootTasks===0&&te.trackedPostpones===null&&vn.contentPreamble!==null&&ir(te)}te.allPendingTasks===0&&Ps(te)}}finally{}}}N.splice(0,ee),a.destination!==null&&Is(a,a.destination)}catch(kn){Un(a,kn,{}),Ua(a,kn)}finally{Es=P,Kt.H=h,Kt.A=_,h===Ll&&v(o),Rn=y}}}function Pr(a,o,h){o.preambleChildren.length&&h.push(o.preambleChildren);for(var _=!1,y=0;y<o.children.length;y++)_=zl(a,o.children[y],h)||_;return _}function zl(a,o,h){var _=o.boundary;if(_===null)return Pr(a,o,h);var y=_.contentPreamble,P=_.fallbackPreamble;if(y===null||P===null)return!1;switch(_.status){case 1:if(Et(a.renderState,y),a.byteSize+=_.byteSize,o=_.completedSegments[0],!o)throw Error(t(391));return Pr(a,o,h);case 5:if(a.trackedPostpones!==null)return!0;case 4:if(o.status===1)return Et(a.renderState,P),Pr(a,o,h);default:return!0}}function ir(a){if(a.completedRootSegment&&a.completedPreambleSegments===null){var o=[],h=a.byteSize,_=zl(a,a.completedRootSegment,o),y=a.renderState.preamble;_===!1||y.headChunks&&y.bodyChunks?a.completedPreambleSegments=o:a.byteSize=h}}function sa(a,o,h,_){switch(h.parentFlushed=!0,h.status){case 0:h.id=a.nextSegmentId++;case 5:return _=h.id,h.lastPushedText=!1,h.textEmbedded=!1,a=a.renderState,H(o,Ni),H(o,a.placeholderPrefix),a=ce(_.toString(16)),H(o,a),j(o,vr);case 1:h.status=2;var y=!0,P=h.chunks,N=0;h=h.children;for(var ee=0;ee<h.length;ee++){for(y=h[ee];N<y.index;N++)H(o,P[N]);y=Ha(a,o,y,_)}for(;N<P.length-1;N++)H(o,P[N]);return N<P.length&&(y=j(o,P[N])),y;case 3:return!0;default:throw Error(t(390))}}var rr=0;function Ha(a,o,h,_){var y=h.boundary;if(y===null)return sa(a,o,h,_);if(y.parentFlushed=!0,y.status===4){var P=y.row;P!==null&&--P.pendingTasks===0&&Qn(a,P),y=y.errorDigest,j(o,_n),H(o,Yu),y&&(H(o,lo),H(o,ce(Le(y))),H(o,oo)),j(o,Zu),sa(a,o,h,_)}else if(y.status!==1)y.status===0&&(y.rootSegmentID=a.nextSegmentId++),0<y.completedSegments.length&&a.partialBoundaries.push(y),Rc(o,a.renderState,y.rootSegmentID),_&&jr(_,y.fallbackState),sa(a,o,h,_);else if(!sr&&Ei(a,y)&&(rr+y.byteSize>a.progressiveChunkSize||Ms(y.contentState)))y.rootSegmentID=a.nextSegmentId++,a.completedBoundaries.push(y),Rc(o,a.renderState,y.rootSegmentID),sa(a,o,h,_);else{if(rr+=y.byteSize,_&&jr(_,y.contentState),h=y.row,h!==null&&Ei(a,y)&&--h.pendingTasks===0&&Qn(a,h),j(o,Hi),h=y.completedSegments,h.length!==1)throw Error(t(391));Ha(a,o,h[0],_)}return j(o,Zn)}function ar(a,o,h,_){return Dc(o,a.renderState,h.parentFormatContext,h.id),Ha(a,o,h,_),Ic(o,h.parentFormatContext)}function Hl(a,o,h){rr=h.byteSize;for(var _=h.completedSegments,y=0;y<_.length;y++)Gl(a,o,h,_[y]);_.length=0,_=h.row,_!==null&&Ei(a,h)&&--_.pendingTasks===0&&Qn(a,_),Pa(o,h.contentState,a.renderState),_=a.resumableState,a=a.renderState,y=h.rootSegmentID,h=h.contentState;var P=a.stylesToHoist;return a.stylesToHoist=!1,H(o,a.startInlineScript),H(o,Qt),P?((_.instructions&4)===0&&(_.instructions|=4,H(o,Aa)),(_.instructions&2)===0&&(_.instructions|=2,H(o,vl)),(_.instructions&8)===0?(_.instructions|=8,H(o,ju)):H(o,Nc)):((_.instructions&2)===0&&(_.instructions|=2,H(o,vl)),H(o,Lc)),_=ce(y.toString(16)),H(o,a.boundaryPrefix),H(o,_),H(o,po),H(o,a.segmentPrefix),H(o,_),P?(H(o,$u),Pn(o,h)):H(o,bl),h=j(o,Fc),Yn(o,a)&&h}function Gl(a,o,h,_){if(_.status===2)return!0;var y=h.contentState,P=_.id;if(P===-1){if((_.id=h.rootSegmentID)===-1)throw Error(t(392));return ar(a,o,_,y)}return P===h.rootSegmentID?ar(a,o,_,y):(ar(a,o,_,y),h=a.resumableState,a=a.renderState,H(o,a.startInlineScript),H(o,Qt),(h.instructions&1)===0?(h.instructions|=1,H(o,Ku)):H(o,Ju),H(o,a.segmentPrefix),P=ce(P.toString(16)),H(o,P),H(o,Qu),H(o,a.placeholderPrefix),H(o,P),o=j(o,qu),o)}var sr=!1;function Is(a,o){_e=new Uint8Array(2048),re=0;try{if(!(0<a.pendingRootTasks)){var h,_=a.completedRootSegment;if(_!==null){if(_.status===5)return;var y=a.completedPreambleSegments;if(y===null)return;rr=a.byteSize;var P=a.resumableState,N=a.renderState,ee=N.preamble,V=ee.htmlChunks,te=ee.headChunks,de;if(V){for(de=0;de<V.length;de++)H(o,V[de]);if(te)for(de=0;de<te.length;de++)H(o,te[de]);else H(o,gt("head")),H(o,Qt)}else if(te)for(de=0;de<te.length;de++)H(o,te[de]);var ve=N.charsetChunks;for(de=0;de<ve.length;de++)H(o,ve[de]);ve.length=0,N.preconnects.forEach(sn,o),N.preconnects.clear();var Be=N.viewportChunks;for(de=0;de<Be.length;de++)H(o,Be[de]);Be.length=0,N.fontPreloads.forEach(sn,o),N.fontPreloads.clear(),N.highImagePreloads.forEach(sn,o),N.highImagePreloads.clear(),$=N,N.styles.forEach(xo,o),$=null;var Ye=N.importMapChunks;for(de=0;de<Ye.length;de++)H(o,Ye[de]);Ye.length=0,N.bootstrapScripts.forEach(sn,o),N.scripts.forEach(sn,o),N.scripts.clear(),N.bulkPreloads.forEach(sn,o),N.bulkPreloads.clear(),V||te||(P.instructions|=32);var Bt=N.hoistableChunks;for(de=0;de<Bt.length;de++)H(o,Bt[de]);for(P=Bt.length=0;P<y.length;P++){var yt=y[P];for(N=0;N<yt.length;N++)Ha(a,o,yt[N],null)}var At=a.renderState.preamble,hn=At.headChunks;(At.htmlChunks||hn)&&H(o,gn("head"));var tn=At.bodyChunks;if(tn)for(y=0;y<tn.length;y++)H(o,tn[y]);Ha(a,o,_,null),a.completedRootSegment=null;var Bn=a.renderState;if(a.allPendingTasks!==0||a.clientRenderedBoundaries.length!==0||a.completedBoundaries.length!==0||a.trackedPostpones!==null&&(a.trackedPostpones.rootNodes.length!==0||a.trackedPostpones.rootSlots!==null)){var li=a.resumableState;if((li.instructions&64)===0){if(li.instructions|=64,H(o,Bn.startInlineScript),(li.instructions&32)===0){li.instructions|=32;var Ri="_"+li.idPrefix+"R_";H(o,vo),H(o,ce(Le(Ri))),H(o,cn)}H(o,Qt),H(o,wn),j(o,it)}}Yn(o,Bn)}var dt=a.renderState;_=0;var qn=dt.viewportChunks;for(_=0;_<qn.length;_++)H(o,qn[_]);qn.length=0,dt.preconnects.forEach(sn,o),dt.preconnects.clear(),dt.fontPreloads.forEach(sn,o),dt.fontPreloads.clear(),dt.highImagePreloads.forEach(sn,o),dt.highImagePreloads.clear(),dt.styles.forEach(Tl,o),dt.scripts.forEach(sn,o),dt.scripts.clear(),dt.bulkPreloads.forEach(sn,o),dt.bulkPreloads.clear();var xn=dt.hoistableChunks;for(_=0;_<xn.length;_++)H(o,xn[_]);xn.length=0;var ei=a.clientRenderedBoundaries;for(h=0;h<ei.length;h++){var lr=ei[h];dt=o;var vn=a.resumableState,Ir=a.renderState,Yi=lr.rootSegmentID,kn=lr.errorDigest;H(dt,Ir.startInlineScript),H(dt,Qt),(vn.instructions&4)===0?(vn.instructions|=4,H(dt,Ml)):H(dt,mo),H(dt,Ir.boundaryPrefix),H(dt,ce(Yi.toString(16))),H(dt,Uc),kn&&(H(dt,Ra),H(dt,ce(nh(kn||""))));var Ci=j(dt,eh);if(!Ci){a.destination=null,h++,ei.splice(0,h);return}}ei.splice(0,h);var Ls=a.completedBoundaries;for(h=0;h<Ls.length;h++)if(!Hl(a,o,Ls[h])){a.destination=null,h++,Ls.splice(0,h);return}Ls.splice(0,h),Ee(o),_e=new Uint8Array(2048),re=0,sr=!0;var Ns=a.partialBoundaries;for(h=0;h<Ns.length;h++){var la=Ns[h];e:{ei=a,lr=o,rr=la.byteSize;var Fs=la.completedSegments;for(Ci=0;Ci<Fs.length;Ci++)if(!Gl(ei,lr,la,Fs[Ci])){Ci++,Fs.splice(0,Ci);var Wl=!1;break e}Fs.splice(0,Ci);var Lr=la.row;Lr!==null&&Lr.together&&la.pendingTasks===1&&(Lr.pendingTasks===1?Ul(ei,Lr,Lr.hoistables):Lr.pendingTasks--),Wl=Pa(lr,la.contentState,ei.renderState)}if(!Wl){a.destination=null,h++,Ns.splice(0,h);return}}Ns.splice(0,h),sr=!1;var Va=a.completedBoundaries;for(h=0;h<Va.length;h++)if(!Hl(a,o,Va[h])){a.destination=null,h++,Va.splice(0,h);return}Va.splice(0,h)}}finally{sr=!1,a.allPendingTasks===0&&a.clientRenderedBoundaries.length===0&&a.completedBoundaries.length===0?(a.flushScheduled=!1,h=a.resumableState,h.hasBody&&H(o,gn("body")),h.hasHtml&&H(o,gn("html")),Ee(o),a.status=14,o.close(),a.destination=null):Ee(o)}}function oa(a){a.flushScheduled=a.destination!==null,pe(function(){return kl(a)}),Z(function(){a.status===10&&(a.status=11),a.trackedPostpones===null&&Cs(a,a.pendingRootTasks===0)})}function or(a){a.flushScheduled===!1&&a.pingedTasks.length===0&&a.destination!==null&&(a.flushScheduled=!0,Z(function(){var o=a.destination;o?Is(a,o):a.flushScheduled=!1}))}function Dr(a,o){if(a.status===13)a.status=14,Pe(o,a.fatalError);else if(a.status!==14&&a.destination===null){a.destination=o;try{Is(a,o)}catch(h){Un(a,h,{}),Ua(a,h)}}}function Ai(a,o){(a.status===11||a.status===10)&&(a.status=12);try{var h=a.abortableTasks;if(0<h.size){var _=o===void 0?Error(t(432)):typeof o=="object"&&o!==null&&typeof o.then=="function"?Error(t(530)):o;a.fatalError=_,h.forEach(function(y){return za(y,a,_)}),h.clear()}a.destination!==null&&Is(a,a.destination)}catch(y){Un(a,y,{}),Ua(a,y)}}function Fo(a,o,h){if(o===null)h.rootNodes.push(a);else{var _=h.workingMap,y=_.get(o);y===void 0&&(y=[o[1],o[2],[],null],_.set(o,y),Fo(y,o[0],h)),y[2].push(a)}}function Vl(a){var o=a.trackedPostpones;if(o===null||o.rootNodes.length===0&&o.rootSlots===null)return a.trackedPostpones=null;if(a.completedRootSegment===null||a.completedRootSegment.status!==5&&a.completedPreambleSegments!==null){var h=a.nextSegmentId,_=o.rootSlots,y=a.resumableState;y.bootstrapScriptContent=void 0,y.bootstrapScripts=void 0,y.bootstrapModules=void 0}else{h=0,_=-1,y=a.resumableState;var P=a.renderState;y.nextFormID=0,y.hasBody=!1,y.hasHtml=!1,y.unknownResources={font:P.resets.font},y.dnsResources=P.resets.dns,y.connectResources=P.resets.connect,y.imageResources=P.resets.image,y.styleResources=P.resets.style,y.scriptResources={},y.moduleUnknownResources={},y.moduleScriptResources={},y.instructions=0}return{nextSegmentId:h,rootFormatContext:a.rootFormatContext,progressiveChunkSize:a.progressiveChunkSize,resumableState:a.resumableState,replayNodes:o.rootNodes,replaySlots:_}}function Ga(){var a=n.version;if(a!=="19.2.7")throw Error(t(527,a,"19.2.7"))}return Ga(),Ga(),Js.prerender=function(a,o){return new Promise(function(h,_){var y=o?o.onHeaders:void 0,P;y&&(P=function(de){y(new Headers(de))});var N=He(o?o.identifierPrefix:void 0,o?o.unstable_externalRuntimeSrc:void 0,o?o.bootstrapScriptContent:void 0,o?o.bootstrapScripts:void 0,o?o.bootstrapModules:void 0),ee=ws(a,N,Ge(N,void 0,o?o.unstable_externalRuntimeSrc:void 0,o?o.importMap:void 0,P,o?o.maxHeadersLength:void 0),ht(o?o.namespaceURI:void 0),o?o.progressiveChunkSize:void 0,o?o.onError:void 0,function(){var de=new ReadableStream({type:"bytes",pull:function(ve){Dr(ee,ve)},cancel:function(ve){ee.destination=null,Ai(ee,ve)}},{highWaterMark:0});de={postponed:Vl(ee),prelude:de},h(de)},void 0,void 0,_,o?o.onPostpone:void 0);if(o&&o.signal){var V=o.signal;if(V.aborted)Ai(ee,V.reason);else{var te=function(){Ai(ee,V.reason),V.removeEventListener("abort",te)};V.addEventListener("abort",te)}}oa(ee)})},Js.renderToReadableStream=function(a,o){return new Promise(function(h,_){var y,P,N=new Promise(function(Ye,Bt){P=Ye,y=Bt}),ee=o?o.onHeaders:void 0,V;ee&&(V=function(Ye){ee(new Headers(Ye))});var te=He(o?o.identifierPrefix:void 0,o?o.unstable_externalRuntimeSrc:void 0,o?o.bootstrapScriptContent:void 0,o?o.bootstrapScripts:void 0,o?o.bootstrapModules:void 0),de=Na(a,te,Ge(te,o?o.nonce:void 0,o?o.unstable_externalRuntimeSrc:void 0,o?o.importMap:void 0,V,o?o.maxHeadersLength:void 0),ht(o?o.namespaceURI:void 0),o?o.progressiveChunkSize:void 0,o?o.onError:void 0,P,function(){var Ye=new ReadableStream({type:"bytes",pull:function(Bt){Dr(de,Bt)},cancel:function(Bt){de.destination=null,Ai(de,Bt)}},{highWaterMark:0});Ye.allReady=N,h(Ye)},function(Ye){N.catch(function(){}),_(Ye)},y,o?o.onPostpone:void 0,o?o.formState:void 0);if(o&&o.signal){var ve=o.signal;if(ve.aborted)Ai(de,ve.reason);else{var Be=function(){Ai(de,ve.reason),ve.removeEventListener("abort",Be)};ve.addEventListener("abort",Be)}}oa(de)})},Js.resume=function(a,o,h){return new Promise(function(_,y){var P,N,ee=new Promise(function(ve,Be){N=ve,P=Be}),V=er(a,o,Ge(o.resumableState,h?h.nonce:void 0,void 0,void 0,void 0,void 0),h?h.onError:void 0,N,function(){var ve=new ReadableStream({type:"bytes",pull:function(Be){Dr(V,Be)},cancel:function(Be){V.destination=null,Ai(V,Be)}},{highWaterMark:0});ve.allReady=ee,_(ve)},function(ve){ee.catch(function(){}),y(ve)},P,h?h.onPostpone:void 0);if(h&&h.signal){var te=h.signal;if(te.aborted)Ai(V,te.reason);else{var de=function(){Ai(V,te.reason),te.removeEventListener("abort",de)};te.addEventListener("abort",de)}}oa(V)})},Js.resumeAndPrerender=function(a,o,h){return new Promise(function(_,y){var P=Fl(a,o,Ge(o.resumableState,void 0,void 0,void 0,void 0,void 0),h?h.onError:void 0,function(){var V=new ReadableStream({type:"bytes",pull:function(te){Dr(P,te)},cancel:function(te){P.destination=null,Ai(P,te)}},{highWaterMark:0});V={postponed:Vl(P),prelude:V},_(V)},void 0,void 0,y,h?h.onPostpone:void 0);if(h&&h.signal){var N=h.signal;if(N.aborted)Ai(P,N.reason);else{var ee=function(){Ai(P,N.reason),N.removeEventListener("abort",ee)};N.addEventListener("abort",ee)}}oa(P)})},Js.version="19.2.7",Js}var gm;function ES(){if(gm)return Ks;gm=1;var n,e;return n=yS(),e=SS(),Ks.version=n.version,Ks.renderToString=n.renderToString,Ks.renderToStaticMarkup=n.renderToStaticMarkup,Ks.renderToReadableStream=e.renderToReadableStream,Ks.resume=e.resume,Ks}var TS=ES();Wg(wm);async function wS(n){const e=TS.renderToStaticMarkup(Y.jsx(cf,{plan:n})),t=document.createElement("div");t.setAttribute("style","position:absolute;left:-99999px;width:0;height:0;overflow:hidden;"),document.body.appendChild(t),t.innerHTML=e;try{const i=t.querySelector("svg");if(!i)throw new Error("SVG plan introuvable");const r=i.viewBox.baseVal,c=r.width,u=r.height,d=new XMLSerializer().serializeToString(i),m="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(`<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg">${d}</svg>`),p=new Image,g=await new Promise((A,C)=>{p.onload=()=>A(p),p.onerror=()=>C(new Error("Impossible de rasteriser le plan 2D")),p.src=m}),b=3,x=document.createElement("canvas");x.width=Math.max(2,Math.round(c*b)),x.height=Math.max(2,Math.round(u*b));const M=x.getContext("2d");if(!M)throw new Error("Canvas 2D indisponible");return M.fillStyle="#ffffff",M.fillRect(0,0,x.width,x.height),M.drawImage(g,0,0,x.width,x.height),{dataUrl:x.toDataURL("image/png"),svgW:c,svgH:u}}finally{document.body.removeChild(t)}}const AS=n=>n.replace(/[\u{1F000}-\u{1FFFF}]|\u{FE0F}|\u{200D}|[\u{2600}-\u{27BF}]|[\u{231A}-\u{23FF}]|[\u{24C2}-\u{1F9FF}]/gu,"").trim();async function RS({plan:n,projectName:e,variantName:t,floorLabel:i,filename:r}){const{dataUrl:c,svgW:u,svgH:d}=await wS(n),m=u>d,p=new wm({orientation:m?"l":"p",unit:"mm",format:"a4"}),g=p.internal.pageSize.getWidth(),b=p.internal.pageSize.getHeight(),x=12,M=12,A=g-x-M,C={primary:[5,150,105],text:[31,41,55],textSecondary:[107,114,128],border:[229,231,235]};p.setFillColor(C.primary[0],C.primary[1],C.primary[2]),p.rect(0,0,g,18,"F"),Xg(p,x,3.5,12),p.setTextColor(255,255,255),p.setFontSize(15),p.setFont("helvetica","bold"),p.text("Plan d'architecte — batibuild App",x+16,9),p.setFontSize(7),p.setFont("helvetica","normal"),p.text(`${AS(e)} · ${t} · ${i}`,x+16,15),p.setFontSize(6),p.text(new Date().toLocaleDateString("fr-FR"),g-M,8,{align:"right"}),p.text("Échelle indicative — document non contractuel",g-M,15,{align:"right"});let T=22;const S=A,B=b-T-40,G=u/d;let D=S,z=S/G;z>B&&(z=B,D=B*G);const U=x+(S-D)/2;p.addImage(c,"PNG",U,T,D,z,void 0,"FAST"),T=T+z+8;const F=Pm(n).map(ne=>[ne.label,`${ne.area.toFixed(1)} m²`,`${ne.sharePct}%`]);p.setFontSize(9),p.setFont("helvetica","bold"),p.setTextColor(C.text[0],C.text[1],C.text[2]),p.text("Sommaire des surfaces",x,T+2),p.autoTable({startY:T+5,margin:{left:x,right:M},head:[["Pièce","Surface","Part"]],body:F,theme:"grid",styles:{fontSize:7,cellPadding:1.5,textColor:C.text,lineColor:C.border,lineWidth:.3},headStyles:{fillColor:C.primary,textColor:255,fontStyle:"bold",fontSize:7},columnStyles:{1:{halign:"right"},2:{halign:"right"}}}),p.setDrawColor(C.border[0],C.border[1],C.border[2]),p.line(x,b-14,g-M,b-14),p.setFontSize(6),p.setFont("helvetica","italic"),p.setTextColor(C.textSecondary[0],C.textSecondary[1],C.textSecondary[2]),p.text(p.splitTextToSize("Plan généré algorithmiquement à titre indicatif. Validation par un architecte inscrit à l'Ordre requise avant dépôt du permis de bâtir. Hauteur sous plafond de référence : 2,70 m.",A),x,b-9);const X=`${e.replace(/[^a-zA-Z0-9-_]/g,"_")}_${i.replace(/\s+/g,"_")}`;p.save(r||`Plan-${X}.pdf`)}const _m=3e3,sf=["Analyse des caractéristiques du projet…","Génération des variantes architecturales…","Validation spatiale (surfaces, circulation, structure)…"];function eE(){Vg({title:"Plans d'architecte IA - batibuild App",description:"10 variantes de plans d'architecte 2D et 3D générées par IA pour votre projet de construction en Tunisie."});const{id:n}=Rg(),e=Cg(),[t,i]=Hn.useState(!0),[r,c]=Hn.useState(0),[u,d]=Hn.useState(0);Hn.useEffect(()=>{const x=Date.now(),M=setInterval(()=>{const C=Math.min(100,(Date.now()-x)/_m*100);c(C),d(Math.min(sf.length-1,Math.floor(C/100*sf.length)))},50),A=setTimeout(()=>{i(!1),clearInterval(M)},_m);return()=>{clearTimeout(A),clearInterval(M)}},[]);const m=Pg(Dg.projects.getProject,t||!n?"skip":{projectId:n}),g=Hn.useMemo(()=>m?m0({category:m.category,surface:m.surface??120,floors:Math.max(1,Math.min(4,m.floors??Fg(m.category))),bedrooms:m.bedrooms??void 0,bathrooms:m.bathrooms??void 0,kitchens:m.kitchens??void 0,livingRooms:m.livingRooms??void 0,wcs:m.wcs??void 0}):[],[m]),b=Hn.useMemo(()=>Math.max(0,...g.map(x=>x.validation.score)),[g]);return Y.jsxs("main",{className:"min-h-screen bg-gradient-to-b from-primary/[0.03] via-background to-background pb-12",children:[Y.jsx("header",{className:"sticky top-0 z-30 border-b border-border/20 bg-background/90 backdrop-blur-md",children:Y.jsx("div",{className:"max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14 sm:h-16",children:Y.jsxs("div",{className:"flex items-center gap-2 sm:gap-3 min-w-0",children:[Y.jsx("button",{onClick:()=>e(`/dashboard/project/${n}`),className:"flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted/50 active:scale-95 transition-all shrink-0",children:Y.jsx(Yg,{className:"h-4 w-4"})}),Y.jsx("div",{className:"h-4 w-px bg-border/50 shrink-0"}),Y.jsx("div",{className:"flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-indigo-500/10 text-violet-600 shrink-0",children:Y.jsx(n0,{className:"h-3.5 w-3.5"})}),Y.jsxs("div",{className:"min-w-0",children:[Y.jsx("h1",{className:"text-sm font-semibold tracking-tight truncate",children:"Plans d'architecte IA"}),Y.jsxs("p",{className:"text-[9px] text-muted-foreground leading-tight truncate",children:[p0," variantes 2D / 3D · Validation spatiale automatique"]})]})]})})}),Y.jsx("div",{className:"max-w-7xl mx-auto px-4 sm:px-6 mt-5 space-y-5",children:t?Y.jsxs("div",{className:"flex flex-col items-center justify-center py-24 text-center",children:[Y.jsxs("div",{className:"relative mb-6",children:[Y.jsx("div",{className:"absolute inset-0 rounded-full bg-violet-500/10 animate-ping"}),Y.jsx("div",{className:"relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/20 to-indigo-500/10 border border-violet-500/30",children:Y.jsx(Mm,{className:"h-9 w-9 animate-spin text-violet-600"})})]}),Y.jsx("h2",{className:"text-lg font-bold tracking-tight",children:"Génération des plans d'architecte…"}),Y.jsx("p",{className:"text-xs text-muted-foreground mt-1 max-w-md",children:"Le moteur spatial compose, valide et note chaque variante avant affichage."}),Y.jsxs("div",{className:"w-full max-w-sm mt-6 space-y-2",children:[Y.jsx(Og,{value:r,className:"h-1.5"}),Y.jsxs(ym.p,{initial:{opacity:0,y:4},animate:{opacity:1,y:0},className:"text-[11px] text-muted-foreground flex items-center justify-center gap-1.5",children:[Y.jsx(Zg,{className:"h-3 w-3 text-violet-500"}),sf[u]]},u)]})]}):m?Y.jsxs(Y.Fragment,{children:[Y.jsx(Sm,{className:"border-primary/15 bg-gradient-to-r from-violet-500/[0.05] to-transparent",children:Y.jsxs(Em,{className:"py-4 px-4 sm:px-5 flex flex-wrap items-center gap-x-6 gap-y-2",children:[Y.jsxs("div",{className:"flex items-center gap-2.5 min-w-0",children:[Y.jsx(Kg,{className:"h-4 w-4 text-primary shrink-0"}),Y.jsxs("div",{className:"min-w-0",children:[Y.jsx("p",{className:"text-sm font-semibold tracking-tight truncate",children:m.name}),Y.jsx("p",{className:"text-[11px] text-muted-foreground",children:Ug(m.category)})]})]}),Y.jsx(Cu,{icon:Am,label:"Surface",value:`${m.surface??120} m²`}),Y.jsx(Cu,{icon:Jg,label:"Niveaux",value:`${Math.max(1,m.floors??1)}`}),Y.jsx(Cu,{icon:Qg,label:"Variantes",value:`${g.length}`}),Y.jsx(Cu,{icon:qg,label:"Meilleure note",value:`${b}/100`,highlight:b>=90})]})}),Y.jsx("div",{className:"grid grid-cols-1 xl:grid-cols-2 gap-5",children:g.map((x,M)=>Y.jsx(CS,{variant:x,index:M,projectName:m.name},x.id))}),Y.jsx("p",{className:"text-center text-[10px] text-muted-foreground/60 pt-2",children:"Plans générés algorithmiquement à titre indicatif — validation par un architecte inscrit à l'ordre requise avant dépôt du permis de bâtir."})]}):Y.jsxs("div",{className:"flex flex-col items-center justify-center py-24 text-center",children:[Y.jsx(Ig,{className:"h-8 w-8 text-muted-foreground mb-3"}),Y.jsx("h2",{className:"text-base font-semibold",children:"Projet introuvable"}),Y.jsx("p",{className:"text-xs text-muted-foreground mt-1 mb-4",children:"Ce projet n'existe pas ou n'est pas accessible."}),Y.jsx(of,{variant:"outline",size:"sm",onClick:()=>e("/dashboard"),children:"Retour au tableau de bord"})]})})]})}function Cu({icon:n,label:e,value:t,highlight:i}){return Y.jsxs("div",{className:"flex items-center gap-2",children:[Y.jsx(n,{className:_a("h-3.5 w-3.5 shrink-0",i?"text-emerald-600":"text-muted-foreground")}),Y.jsxs("div",{className:"leading-tight",children:[Y.jsx("p",{className:"text-[9px] text-muted-foreground uppercase tracking-wide",children:e}),Y.jsx("p",{className:_a("text-xs font-semibold tabular-nums",i&&"text-emerald-600"),children:t})]})]})}function CS({variant:n,index:e,projectName:t}){const[i,r]=Hn.useState(0),[c,u]=Hn.useState("2d"),[d,m]=Hn.useState(!1),[p,g]=Hn.useState(!1),[b,x]=Hn.useState(!1),M=n.floors[Math.min(i,n.floors.length-1)],A=Hn.useMemo(()=>Pm(M),[M]),C=Hn.useMemo(()=>MS(M),[M]),T=M.level===0?"Rez-de-chaussée":`Niveau ${M.level}`,S=n.validation,B=async()=>{if(!b){x(!0);try{await RS({plan:M,projectName:t,variantName:n.name,floorLabel:T})}catch(D){console.error("Erreur export PDF du plan :",D)}finally{x(!1)}}},G=S.score>=90?"bg-emerald-500/10 text-emerald-600 border-emerald-500/30":S.score>=75?"bg-amber-500/10 text-amber-600 border-amber-500/30":"bg-red-500/10 text-red-600 border-red-500/30";return Y.jsxs(ym.div,{initial:{opacity:0,y:14},animate:{opacity:1,y:0},transition:{delay:e*.04,duration:.3},children:[Y.jsxs(Sm,{className:"overflow-hidden",children:[Y.jsxs(Lg,{className:"pb-3 pt-4 px-4",children:[Y.jsxs("div",{className:"flex items-start justify-between gap-3",children:[Y.jsx(Ng,{className:"text-sm font-bold tracking-tight",children:n.name}),Y.jsxs(Tm,{variant:"outline",className:_a("text-[10px] shrink-0",G),children:["Note ",S.score,"/100"]})]}),Y.jsxs("div",{className:"flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-[11px] text-muted-foreground",children:[Y.jsxs("span",{children:["Emprise"," ",Y.jsxs("span",{className:"font-medium text-foreground tabular-nums",children:[n.footprint.length.toFixed(1)," × ",n.footprint.width.toFixed(1)," m"]})]}),Y.jsxs("span",{children:["Surface totale"," ",Y.jsxs("span",{className:"font-medium text-foreground tabular-nums",children:[n.totalArea.toFixed(1)," m²"]})]}),Y.jsxs("span",{children:["Niveaux"," ",Y.jsx("span",{className:"font-medium text-foreground tabular-nums",children:n.floors.length})]})]})]}),Y.jsxs(Em,{className:"px-4 space-y-3",children:[Y.jsxs("div",{className:"flex items-center justify-between gap-2 flex-wrap",children:[Y.jsx(Bg,{value:c,onValueChange:D=>u(D),children:Y.jsxs(kg,{className:"h-7",children:[Y.jsx(tp,{value:"2d",className:"text-[11px] h-6 px-2.5",children:"Plan 2D"}),Y.jsx(tp,{value:"3d",className:"text-[11px] h-6 px-2.5",children:"Vue 3D"})]})}),n.floors.length>1&&Y.jsx("div",{className:"flex items-center gap-1",children:n.floors.map(D=>Y.jsx("button",{onClick:()=>r(D.level),className:_a("h-6 px-2 rounded-md text-[10px] font-medium border transition-colors cursor-pointer",D.level===i?"bg-primary text-primary-foreground border-primary":"bg-background text-muted-foreground border-border hover:border-primary/40"),children:D.level===0?"RDC":`N${D.level}`},D.level))})]}),c==="2d"?Y.jsxs("div",{className:"relative group cursor-zoom-in",role:"button",tabIndex:0,"aria-label":"Afficher le plan 2D en plein écran",onClick:()=>m(!0),onKeyDown:D=>{(D.key==="Enter"||D.key===" ")&&(D.preventDefault(),m(!0))},children:[Y.jsx(cf,{plan:M}),Y.jsxs("span",{className:"absolute top-2 right-2 inline-flex items-center gap-1 rounded-md border bg-background/90 px-2 py-1 text-[10px] font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100",children:[Y.jsx(r0,{className:"h-3 w-3"})," Plein écran"]})]}):Y.jsx(dS,{plan:M}),Y.jsxs("div",{className:"flex flex-wrap items-center gap-2",children:[Y.jsxs(of,{size:"sm",variant:"outline",onClick:B,disabled:b,children:[b?Y.jsx(Mm,{className:"h-3.5 w-3.5 animate-spin"}):Y.jsx(jg,{className:"h-3.5 w-3.5"}),b?"Génération…":"Télécharger PDF"]}),Y.jsxs(of,{size:"sm",variant:"secondary",onClick:()=>g(D=>!D),children:[Y.jsx(Rm,{className:"h-3.5 w-3.5"}),"Analyse & optimisation",Y.jsx($g,{className:_a("h-3.5 w-3.5 transition-transform",p&&"rotate-180")})]})]}),Y.jsxs("div",{className:"rounded-lg border overflow-hidden",children:[Y.jsxs("div",{className:"px-3 py-1.5 bg-muted/50 flex items-center gap-1.5",children:[Y.jsx(Am,{className:"h-3 w-3 text-muted-foreground"}),Y.jsxs("span",{className:"text-[10px] font-semibold uppercase tracking-wide text-muted-foreground",children:["Tableau des surfaces · ",M.level===0?"Rez-de-chaussée":`Niveau ${M.level}`]})]}),Y.jsx("table",{className:"w-full text-[11px]",children:Y.jsxs("tbody",{children:[A.map(D=>Y.jsxs("tr",{className:"border-t border-border/50",children:[Y.jsx("td",{className:"px-3 py-1.5",children:D.label}),Y.jsxs("td",{className:"px-3 py-1.5 text-right tabular-nums font-medium w-20",children:[D.area.toFixed(1)," m²"]}),Y.jsxs("td",{className:"px-3 py-1.5 text-right tabular-nums text-muted-foreground w-14",children:[D.sharePct,"%"]})]},D.label)),Y.jsxs("tr",{className:"border-t border-border bg-muted/30",children:[Y.jsx("td",{className:"px-3 py-1.5 font-semibold",children:"Total niveau"}),Y.jsxs("td",{className:"px-3 py-1.5 text-right tabular-nums font-bold",children:[M.area.toFixed(1)," m²"]}),Y.jsx("td",{className:"px-3 py-1.5"})]})]})})]}),Y.jsxs("div",{className:"rounded-lg border border-violet-500/20 bg-violet-500/[0.04] px-3 py-2.5",children:[Y.jsxs("div",{className:"flex items-center gap-1.5 mb-1",children:[Y.jsx(e0,{className:"h-3 w-3 text-violet-600"}),Y.jsx("span",{className:"text-[10px] font-semibold uppercase tracking-wide text-violet-600",children:"Note conceptuelle IA"})]}),Y.jsx("p",{className:"text-[11px] leading-relaxed text-muted-foreground",children:n.conceptNote})]}),Y.jsx("div",{className:"flex flex-wrap items-center gap-1.5",children:[{ok:S.dimensionsOk,label:"Dimensions"},{ok:S.noOverlap,label:"Sans chevauchement"},{ok:S.areasOk,label:"Surfaces cohérentes"},{ok:S.circulationOk,label:"Circulation"},{ok:S.structureOk,label:"Structure continue"}].map(D=>Y.jsxs("span",{className:_a("inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9px] font-medium",D.ok?"border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-600":"border-red-500/25 bg-red-500/[0.06] text-red-600"),children:[D.ok?"✓":"✕"," ",D.label]},D.label))}),S.issues.length>0&&Y.jsx("ul",{className:"text-[10px] text-muted-foreground list-disc pl-4 space-y-0.5",children:S.issues.slice(0,4).map(D=>Y.jsx("li",{children:D},D))}),p&&Y.jsx(DS,{analysis:C,floorLabel:T})]})]}),Y.jsx(zg,{open:d,onOpenChange:m,children:Y.jsxs(Hg,{className:"max-w-none w-[calc(100vw-2rem)] h-[calc(100vh-2rem)] max-w-full p-4 sm:p-6 overflow-auto bg-transparent border-transparent",children:[Y.jsxs(Gg,{className:"sr-only",children:["Plan 2D — ",n.name," · ",T]}),Y.jsx("div",{className:"flex items-center justify-between gap-2 mb-3 pr-10",children:Y.jsxs("p",{className:"text-sm font-semibold tracking-tight truncate",children:[n.name," · ",T," — Plan 2D"]})}),Y.jsx("div",{className:"mx-auto w-full max-w-6xl",children:Y.jsx("div",{className:"rounded-md border bg-white p-2 shadow-sm",children:Y.jsx(cf,{plan:M})})})]})})]})}const xm={nuit:{label:"Zone nuit",dot:"bg-indigo-500"},jour:{label:"Zone jour",dot:"bg-amber-500"},service:{label:"Service / technique",dot:"bg-slate-500"},circulation:{label:"Circulations",dot:"bg-zinc-400"}},PS={info:"border-sky-500/25 bg-sky-500/[0.06] text-sky-600",warning:"border-amber-500/25 bg-amber-500/[0.06] text-amber-600",critical:"border-red-500/30 bg-red-500/[0.06] text-red-600"};function DS({analysis:n,floorLabel:e}){const t=n;return Y.jsxs("div",{className:"rounded-lg border border-emerald-500/20 bg-emerald-500/[0.03] px-3 py-3 space-y-3",children:[Y.jsxs("div",{className:"flex items-center justify-between gap-2",children:[Y.jsxs("div",{className:"flex items-center gap-1.5",children:[Y.jsx(Rm,{className:"h-3.5 w-3.5 text-emerald-600"}),Y.jsxs("span",{className:"text-[10px] font-semibold uppercase tracking-wide text-emerald-600",children:["Analyse & optimisation · ",e]})]}),Y.jsxs(Tm,{variant:"outline",className:"text-[10px] border-emerald-500/30 bg-emerald-500/10 text-emerald-600",children:["Optimisation ",t.score,"/100"]})]}),Y.jsxs("div",{children:[Y.jsx("p",{className:"text-[9px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5",children:"Zonage & circulation"}),Y.jsx("div",{className:"grid grid-cols-1 sm:grid-cols-2 gap-1.5",children:t.zoning.groups.filter(i=>i.rooms.length>0).map(i=>Y.jsxs("div",{className:"rounded-md border bg-background/70 px-2 py-1.5",children:[Y.jsxs("div",{className:"flex items-center gap-1.5",children:[Y.jsx("span",{className:_a("h-2 w-2 rounded-full",xm[i.kind].dot)}),Y.jsx("span",{className:"text-[10px] font-medium",children:xm[i.kind].label}),Y.jsxs("span",{className:"ml-auto text-[10px] font-semibold tabular-nums",children:[i.area.toFixed(1)," m²"]})]}),Y.jsx("p",{className:"mt-0.5 text-[9px] text-muted-foreground",children:i.rooms.map(r=>r.label).join(" · ")})]},i.kind))}),Y.jsxs("div",{className:"mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-muted-foreground",children:[Y.jsxs("span",{children:["Circulations :"," ",Y.jsxs("span",{className:"font-semibold text-foreground tabular-nums",children:[t.zoning.circulationM2.toFixed(1)," m² (",t.zoning.circulationPct.toFixed(0),"%)"]})]}),Y.jsxs("span",{children:["Surface utile :"," ",Y.jsxs("span",{className:"font-semibold text-foreground tabular-nums",children:[t.zoning.usefulM2.toFixed(1)," m²"]})]})]})]}),Y.jsxs("div",{className:"grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-center",children:[Y.jsx(Pu,{label:"Haut. plafond",value:`${t.ergonomics.ceilingHeight.toFixed(2)} m`}),Y.jsx(Pu,{label:"Passage min.",value:`${(t.ergonomics.minPassage*100).toFixed(0)} cm`,ok:t.ergonomics.passable}),Y.jsx(Pu,{label:"Fenêtres",value:`${t.layout.totalWindows}`}),Y.jsx(Pu,{label:"Portes",value:`${t.layout.totalDoors}`})]}),Y.jsx("div",{className:"space-y-1.5",children:t.recommendations.map(i=>Y.jsxs("div",{className:_a("rounded-md border px-2 py-1.5",PS[i.severity]),children:[Y.jsx("p",{className:"text-[10px] font-semibold leading-tight",children:i.title}),Y.jsx("p",{className:"text-[10px] leading-relaxed opacity-90 mt-0.5",children:i.detail})]},i.category+i.title))})]})}function Pu({label:n,value:e,ok:t}){return Y.jsxs("div",{className:"rounded-md border bg-background/70 px-2 py-1.5",children:[Y.jsx("p",{className:"text-[9px] text-muted-foreground uppercase tracking-wide truncate",children:n}),Y.jsx("p",{className:_a("text-xs font-semibold tabular-nums",t===!1&&"text-red-600",t===!0&&"text-emerald-600"),children:e})]})}export{eE as default};
