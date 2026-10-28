
(function(){
  var root=document.querySelector('#sources-transparency');
  if(!root)return;
  var search=root.querySelector('#src-search');
  var role=root.querySelector('#src-role');
  var state=root.querySelector('#src-state');
  var total=root.querySelector('#src-results');
  var more=root.querySelector('#src-show-more');
  var empty=root.querySelector('#src-no-results');
  var cards=Array.from(root.querySelectorAll('.src-source-card'));
  var count=24;
  function apply(){
    var term=(search.value||'').trim().toLowerCase();
    var requested=role.value;
    var status=state.value;
    var eligible=cards.filter(function(card){
      return (!term||(card.dataset.search||'').indexOf(term)>=0)
        &&(requested==='all'||(card.dataset.roles||'').split(' ').indexOf(requested)>=0)
        &&(status==='all'||card.dataset.enabled===status);
    });
    var shown=eligible.slice(0,count);
    cards.forEach(function(card){card.hidden=shown.indexOf(card)<0;});
    total.textContent='Showing '+shown.length+' of '+eligible.length+' matching sources';
    more.hidden=shown.length>=eligible.length;
    empty.hidden=eligible.length!==0;
  }
  function reset(){count=24;apply();}
  search.addEventListener('input',reset);
  role.addEventListener('change',reset);
  state.addEventListener('change',reset);
  more.addEventListener('click',function(){count+=24;apply();});
  apply();
})();
