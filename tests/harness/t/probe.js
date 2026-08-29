// probe -- diagnostic only. Reports what is alive over time, with REAL timestamps, so a
// "timed out waiting for app init" can be attributed rather than guessed at.
window.addEventListener('load',function(){ (async function(){
  var T=window.__T, out={t0:performance.now(), samples:[]};
  for(var i=0;i<80;i++){
    var menu=document.getElementById('file-menu');
    var wrap=document.getElementById('file-menu-wrap');
    out.samples.push({
      ms: Math.round(performance.now()),
      menuKids: menu?menu.children.length:-1,
      wrapDisplay: wrap?wrap.style.display:'?',
      fsa: typeof window.showSaveFilePicker,
      idb: typeof window.indexedDB,
      errs: (window.__ERR||[]).length
    });
    if(menu && menu.children.length>0) break;
    await T.sleep(100);
  }
  out.errors=(window.__ERR||[]).slice(0,10);
  out.finalMenuKids=(document.getElementById('file-menu')||{children:[]}).children.length;
  // Can this page use IndexedDB at all? Open the app's own database name and report.
  out.idbProbe = await new Promise(function(res){
    var done=false, t=setTimeout(function(){ if(!done) res('TIMED OUT after 5s'); },5000);
    try{
      var r=indexedDB.open('spt-planning-cal');
      r.onsuccess=function(){ done=true; clearTimeout(t); res('opened, stores: '+[].slice.call(r.result.objectStoreNames).join(',')); };
      r.onerror=function(){ done=true; clearTimeout(t); res('error: '+(r.error&&r.error.message)); };
      r.onblocked=function(){ done=true; clearTimeout(t); res('BLOCKED'); };
      r.onupgradeneeded=function(){ res('upgradeneeded'); };
    }catch(e){ done=true; clearTimeout(t); res('threw: '+e.message); }
  });
  T.done(out);
})(); });
