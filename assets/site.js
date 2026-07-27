/* 林美園藝官網 共用腳本
   原則（見 DESIGN-NOTES.md 第五節）：全站只有兩支進場動畫、不做 pin、不做視差 scrub。
   進場用 scroll 事件 + 幾何判斷驅動 CSS transition，不依賴 rAF／IntersectionObserver，
   確保任何渲染環境（含離屏截圖）都不會把內容卡在隱藏狀態。 */
(function(){
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── 進場 ─────────────────────────── */
  var fx = [].slice.call(document.querySelectorAll('.fx-fade,.fx-zoom'));
  function showAll(){fx.forEach(function(el){el.classList.add('in');});fx=[];}

  if(reduce){
    showAll();
  }else{
    var check = function(){
      var vh = document.documentElement.clientHeight;
      if(!vh){showAll();return;}
      var hit=[],rest=[];
      fx.forEach(function(el){
        (el.getBoundingClientRect().top < vh*.9 ? hit : rest).push(el);
      });
      if(hit.length){
        var step = hit[0].classList.contains('fx-zoom') ? .1 : .08;
        hit.forEach(function(el,i){
          el.style.transitionDelay = (i*step)+'s';
          el.classList.add('in');
        });
        fx = rest;
      }
    };
    addEventListener('scroll',check,{passive:true});
    addEventListener('resize',check);
    addEventListener('load',check);
    check();
  }

  /* ── 導覽列：離開標頭後轉為實心 ────── */
  var hd = document.getElementById('hd');
  if(hd){
    var syncHd = function(){hd.classList.toggle('solid',scrollY>60);};
    addEventListener('scroll',syncHd,{passive:true});
    syncHd();

    /* 行動版抽屜選單 */
    var burger = hd.querySelector('.burger');
    var drawer = document.getElementById('drawer');
    if(burger && drawer){
      var toggle = function(open){
        document.documentElement.classList.toggle('nav-open',open);
        burger.setAttribute('aria-expanded',open?'true':'false');
      };
      burger.addEventListener('click',function(){
        toggle(!document.documentElement.classList.contains('nav-open'));
      });
      drawer.addEventListener('click',function(e){
        if(e.target.tagName==='A' || e.target===drawer) toggle(false);
      });
      addEventListener('keydown',function(e){if(e.key==='Escape') toggle(false);});
    }
  }

  /* ── 首頁 HERO：三張底圖交叉淡入 + 緩慢推近 ── */
  var slides = [].slice.call(document.querySelectorAll('.hero .slide'));
  if(slides.length && window.gsap){
    gsap.set(slides[0],{opacity:1});
    gsap.to(slides[0],{scale:1,duration:8,ease:'none'});
    if(!reduce && slides.length>1){
      var i=0;
      setInterval(function(){
        var cur=slides[i], nxt=slides[(i=(i+1)%slides.length)];
        gsap.set(nxt,{scale:1.06});
        gsap.to(nxt,{opacity:1,duration:2,ease:'none'});
        gsap.to(nxt,{scale:1,duration:8,ease:'none'});
        gsap.to(cur,{opacity:0,duration:2,ease:'none'});
      },5000);
    }
  }else if(slides.length){
    slides[0].style.opacity = 1;
    slides[0].style.transform = 'none';
  }

  /* ── 實績分類篩選 ──────────────────── */
  /* 目前為前端篩選（資料寫在 HTML）。接 Firebase 後台後，
     改由後台輸出 data-cat，本段邏輯不必動。 */
  var filters = document.querySelectorAll('.filters button');
  if(filters.length){
    var cards = [].slice.call(document.querySelectorAll('.works .work'));
    var countEl = document.querySelector('.count b');
    filters.forEach(function(b){
      b.addEventListener('click',function(){
        filters.forEach(function(x){x.classList.remove('on');});
        b.classList.add('on');
        var cat = b.dataset.cat || '';
        var n = 0;
        cards.forEach(function(c){
          var show = !cat || c.dataset.cat === cat;
          c.style.display = show ? '' : 'none';
          if(show) n++;
        });
        if(countEl) countEl.textContent = n;
      });
    });
  }
})();
