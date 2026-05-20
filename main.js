// ================================================================
// main.js v13 — Init + événements
// ================================================================
(function init(){
  recompute(); updateTop();
  document.querySelectorAll('.nb').forEach(function(b){
    b.addEventListener('click',function(){navigate(b.getAttribute('data-pg'));});
  });
  if(!META.heroId) navigate('char-select');
  else navigate('home');
  setInterval(saveMeta, 30000);
  window.addEventListener('beforeunload', saveMeta);
  setInterval(function(){
    updateTop();
  }, 200);
})();

// Reset
var _bRst=document.getElementById('btn-rst');if(_bRst)_bRst.addEventListener('click',function(){
  if(!confirm('Réinitialiser toute la progression ? Irréversible.')) return;
  META=mkMeta(); saveMeta();
  showSel(); updateTop();
});

document.getElementById('btn-reroll').addEventListener('click', rerollBout);

// Main delegation
document.getElementById('main').addEventListener('click',function(e){
  var t=e.target;
  while(t&&t!==this&&t.tagName!=='BUTTON') t=t.parentNode;
  if(!t||t.tagName!=='BUTTON') return;
  var id    = t.getAttribute('data-id');
  var uid   = t.getAttribute('data-uid');
  var stat  = t.getAttribute('data-stat');
  var spell = t.getAttribute('data-spell');
  var sid   = t.getAttribute('data-sid');
  if(t.classList.contains('btn-upg'))  { buyUpg(id);      return; }
  if(t.classList.contains('btn-bout')) { var _sc=t.closest?t.closest('.shop-img-card'):null; if(_sc)_flashEl(_sc); setTimeout(function(){ buyBout(id); },_sc?450:0); return; }
  if(t.classList.contains('btn-eq'))   { equipIt(uid);    return; }
  if(t.classList.contains('btn-sell')) { sellItem(uid);   hideItemDetail(); return; }
  if(t.classList.contains('btn-stat')) { spendSt(stat);   return; }
  if(t.classList.contains('btn-spwr')) { upgSpPwr(spell); return; }
  if(t.classList.contains('btn-scd'))  { upgSpCd(spell);  return; }
});

function selectChip(el, groupId){
  document.getElementById(groupId)
    .querySelectorAll('.cpick')
    .forEach(function(b){ b.classList.remove('active'); });
  el.classList.add('active');
}
