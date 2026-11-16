// Minimal local renderer for this project's .dc.html subset (for screenshots only).
(function(){
  const React={createElement:(t,p,...c)=>({$v:1,t,p:p||{},c:c.flat()}),createRef:()=>({current:null})};
  window.React=React;
  class DCLogic{constructor(props){this.props=props;this.state={}}
    setState(u,cb){const prev=this.state;const s=typeof u==='function'?u(this.state,this.props):u;if(s==null)return;this.state={...this.state,...s};window.__dcSched(this,prev,cb)}
    forceUpdate(){window.__dcSched(this,this.state)}}
  window.DCLogic=DCLogic;
  const SVGNS='http://www.w3.org/2000/svg';
  function kebab(k){return k.replace(/[A-Z]/g,m=>'-'+m.toLowerCase())}
  function vdom(v,ns){
    if(v==null||v===false||v===true)return [];
    if(Array.isArray(v))return v.flatMap(x=>vdom(x,ns));
    if(typeof v!=='object')return [document.createTextNode(String(v))];
    if(!v.$v)return [document.createTextNode(String(v))];
    const isSvg=v.t==='svg'||ns===SVGNS;const el=isSvg?document.createElementNS(SVGNS,v.t):document.createElement(v.t);
    for(const [k,val] of Object.entries(v.p)){if(k==='key'||val==null)continue;
      if(k==='style'&&typeof val==='object'){for(const [sk,sv] of Object.entries(val)){if(sv!=null)el.style[sk]=sv}continue}
      if(k==='className'){el.setAttribute('class',val);continue}
      el.setAttribute(isSvg&&!k.includes('-')&&k!=='viewBox'?kebab(k):k,String(val))}
    v.c.forEach(ch=>vdom(ch,isSvg?SVGNS:null).forEach(n=>el.appendChild(n)));
    return [el];
  }
  function look(path,scopes){path=path.trim();
    if(path==='true')return true;if(path==='false')return false;if(path==='null')return null;
    if(/^-?\d+(\.\d+)?$/.test(path))return Number(path);
    if(/^(['"]).*\1$/.test(path))return path.slice(1,-1);
    const parts=path.split('.');let base;
    for(let i=scopes.length-1;i>=0;i--){if(parts[0] in scopes[i]){base=scopes[i][parts[0]];break}}
    for(let i=1;i<parts.length;i++){if(base==null)return undefined;base=base[parts[i]]}
    return base}
  const WHOLE=/^\s*\{\{([^}]+)\}\}\s*$/;
  function interp(str,scopes){const m=str.match(WHOLE);if(m)return look(m[1],scopes);
    return str.replace(/\{\{([^}]+)\}\}/g,(_,p)=>{const v=look(p,scopes);return v==null?'':String(v)})}
  const EV={onclick:'click',onchange:'input',onfocus:'focus',onkeydown:'keydown',onscroll:'scroll',oninput:'input'};
  function build(node,scopes,out,ns){
    if(node.nodeType===3){const t=node.nodeValue;if(!t.includes('{{')){out.push(document.createTextNode(t));return}
      t.split(/(\{\{[^}]+\}\})/).forEach(seg=>{const m=seg.match(/^\{\{([^}]+)\}\}$/);if(m)vdom(look(m[1],scopes),ns).forEach(n=>out.push(n));else if(seg)out.push(document.createTextNode(seg))});return}
    if(node.nodeType!==1)return;
    const tag=node.localName;
    if(tag==='helmet')return;
    if(tag==='sc-if'){const v=interp(node.getAttribute('value')||'',scopes);if(v&&!(Array.isArray(v)&&0))node.childNodes.forEach(c=>build(c,scopes,out,ns));return}
    if(tag==='sc-for'){const list=interp(node.getAttribute('list')||'',scopes)||[];const as=node.getAttribute('as')||'item';
      list.forEach((it,i)=>{const sc={[as]:it,$index:i};node.childNodes.forEach(c=>build(c,[...scopes,sc],out,ns))});return}
    const isSvg=tag==='svg'||ns===SVGNS;const el=isSvg?document.createElementNS(SVGNS,tag):document.createElement(tag);
    for(const a of Array.from(node.attributes)){const n=a.name;
      if(n.startsWith('hint-'))continue;
      const val=interp(a.value,scopes);
      if(EV[n]){if(typeof val==='function'){el.addEventListener(EV[n],e=>{if(!e.nativeEvent)e.nativeEvent=e;val(e)})}continue}
      if(n==='ref'){if(val&&typeof val==='object')val.current=el;continue}
      if(n==='value'&&(tag==='input'||tag==='textarea')){el.value=val==null?'':val;continue}
      if(n==='checked'){el.checked=!!val;continue}
      if(val===false||val==null){if(n.startsWith('aria-'))el.setAttribute(n,'false');continue}
      if(val===true){el.setAttribute(n,n.startsWith('aria-')?'true':'');continue}
      el.setAttribute(n,String(val))}
    const kids=tag==='template'?node.content.childNodes:node.childNodes;
    const sub=[];kids.forEach(c=>build(c,scopes,sub,isSvg?SVGNS:null));sub.forEach(n=>el.appendChild(n));
    out.push(el);
  }
  window.dcMount=function(tplEl,code,props,root){
    const helmet=tplEl.content.querySelector('helmet');if(helmet)helmet.childNodes.forEach(n=>{if(n.nodeType===1)document.head.appendChild(n.cloneNode(true))});
    const Component=new Function('DCLogic','React',code+'\n;return Component;')(DCLogic,React);
    const inst=new Component(props);inst.props=props;
    let pending=false,queue=[];
    function render(){const vals=inst.renderVals();const out=[];tplEl.content.childNodes.forEach(c=>build(c,[vals],out,null));
      const sx=[...root.querySelectorAll('*')].map(e=>e.scrollTop);
      const ae=document.activeElement,fid=ae&&ae.id,ss=ae&&ae.selectionStart,se=ae&&ae.selectionEnd;
      root.replaceChildren(...out);
      // 전체 DOM을 갈아끼우므로 포커스·캐럿·스크롤을 복원해야 입력창에 계속 타이핑할 수 있다
      const all=[...root.querySelectorAll('*')];if(all.length===sx.length)all.forEach((e,i)=>{if(sx[i])e.scrollTop=sx[i]});
      if(fid){const n=document.getElementById(fid);if(n&&n!==document.activeElement){n.focus({preventScroll:true});try{n.setSelectionRange(ss,se)}catch(e){}}}}
    // 한글 IME 조합 중에는 DOM을 교체하지 않는다(조합이 끊김). 조합이 끝나면 한 번에 렌더.
    let composing=false,dirty=false;
    document.addEventListener('compositionstart',()=>{composing=true});
    document.addEventListener('compositionend',()=>{composing=false;if(dirty){dirty=false;setTimeout(render,0)}});
    window.__dcSched=(i,prev,cb)=>{queue.push([prev,cb]);if(pending)return;pending=true;queueMicrotask(()=>{pending=false;const q=queue;queue=[];if(composing)dirty=true;else render();
      if(inst.componentDidUpdate)try{inst.componentDidUpdate(props,q[0][0])}catch(e){console.error(e)}
      q.forEach(([,c])=>c&&c())})};
    render();if(inst.componentDidMount)inst.componentDidMount();
    window.__inst=inst;return inst};
})();
