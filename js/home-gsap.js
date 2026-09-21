(function () {
  'use strict';

  var html = document.documentElement;
  var reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  function fallback() {
    html.classList.remove('js-gsap');
    html.classList.add('gsap-fallback');
  }

  if (typeof gsap === 'undefined') {
    fallback();
    return;
  }

  window.__gsapHomeReady = true;
  gsap.registerPlugin(ScrollTrigger);

  function prefersReduced() {
    return reducedQuery.matches;
  }

  function initNavIndicator() {
    var inner = document.querySelector('.navbar .navbar-inner');
    var nav = document.querySelector('.navbar .nav');
    if (!inner || !nav) return;

    var indicator = document.createElement('span');
    indicator.className = 'nav-indicator';
    indicator.setAttribute('aria-hidden', 'true');
    inner.appendChild(indicator);

    var active = nav.querySelector('li.active a') || nav.querySelector('a');

    function moveTo(link, instant) {
      if (!link) return;
      var navBox = inner.getBoundingClientRect();
      var box = link.getBoundingClientRect();
      gsap.to(indicator, {
        x: box.left - navBox.left,
        y: box.bottom - navBox.top - 2,
        width: box.width,
        duration: (instant || prefersReduced()) ? 0 : 0.35,
        ease: 'power3.out',
        overwrite: true
      });
    }

    moveTo(active, true);
    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('mouseenter', function () {
        moveTo(link);
      });
      link.addEventListener('focus', function () {
        moveTo(link);
      });
    });
    nav.addEventListener('mouseleave', function () {
      moveTo(active);
    });
    window.addEventListener('resize', function () {
      moveTo(active, true);
    });
  }

  function initCarousel() {
    var root = document.querySelector('.image-carousel');
    if (!root) return;

    var viewport = root.querySelector('.carousel-viewport') || root;
    var slides = gsap.utils.toArray(root.querySelectorAll('.carousel-slide'));
    if (slides.length === 0) return;

    var current = 0;
    var hold = 5;
    var autoplay;
    var progressTween;
    var transition;
    var paused = false;

    root.setAttribute('role', 'region');
    root.setAttribute('aria-roledescription', 'carousel');
    root.setAttribute('aria-label', 'Lab photos');

    var controls = document.createElement('div');
    controls.className = 'carousel-controls';

    var prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'carousel-btn';
    prev.setAttribute('aria-label', 'Previous photo');
    prev.textContent = '‹';

    var next = document.createElement('button');
    next.type = 'button';
    next.className = 'carousel-btn';
    next.setAttribute('aria-label', 'Next photo');
    next.textContent = '›';

    var dots = document.createElement('div');
    dots.className = 'carousel-dots';
    dots.setAttribute('role', 'tablist');
    dots.setAttribute('aria-label', 'Carousel slides');

    slides.forEach(function (slide, i) {
      slide.setAttribute('role', 'group');
      slide.setAttribute('aria-roledescription', 'slide');
      slide.setAttribute('aria-label', (i + 1) + ' of ' + slides.length);

      var dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'carousel-dot';
      dot.setAttribute('aria-label', 'Show photo ' + (i + 1));
      dot.addEventListener('click', function () {
        goTo(i, true);
      });
      dots.appendChild(dot);
    });

    controls.appendChild(prev);
    controls.appendChild(dots);
    controls.appendChild(next);
    root.appendChild(controls);

    var progress = document.createElement('div');
    progress.className = 'carousel-progress';
    var bar = document.createElement('span');
    progress.appendChild(bar);
    root.appendChild(progress);

    var live = document.createElement('div');
    live.className = 'visually-hidden';
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    root.appendChild(live);

    gsap.set(slides, { autoAlpha: 0, zIndex: 0 });
    gsap.set(slides[0], { autoAlpha: 1, zIndex: 2 });

    function setDots(announce) {
      Array.prototype.forEach.call(dots.children, function (dot, i) {
        var on = i === current;
        dot.classList.toggle('is-active', on);
        dot.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      live.textContent = announce ? ('Photo ' + (current + 1) + ' of ' + slides.length) : '';
    }

    function killKenBurns() {
      slides.forEach(function (slide) {
        var img = slide.querySelector('img');
        if (img) gsap.killTweensOf(img);
      });
    }

    function kenBurns(index) {
      killKenBurns();
      var img = slides[index].querySelector('img');
      if (!img || prefersReduced()) {
        if (img) gsap.set(img, { scale: 1 });
        return;
      }
      gsap.fromTo(img, { scale: 1 }, {
        scale: 1.05,
        duration: hold + 0.8,
        ease: 'none'
      });
    }

    function startProgress() {
      if (progressTween) progressTween.kill();
      gsap.set(bar, { scaleX: 0, transformOrigin: 'left center' });
      if (prefersReduced() || paused || slides.length < 2) return;
      progressTween = gsap.to(bar, {
        scaleX: 1,
        duration: hold,
        ease: 'none'
      });
    }

    function restartAutoplay() {
      if (autoplay) autoplay.kill();
      if (prefersReduced() || paused || slides.length < 2) return;
      autoplay = gsap.delayedCall(hold, function () {
        goTo(current + 1);
      });
    }

    function goTo(index, user) {
      var nextIndex = (index + slides.length) % slides.length;
      if (nextIndex === current) {
        startProgress();
        restartAutoplay();
        return;
      }

      var from = current;
      current = nextIndex;
      if (transition) transition.kill();

      var duration = prefersReduced() ? 0 : 0.85;
      gsap.set(slides[current], { zIndex: 2 });
      gsap.set(slides[from], { zIndex: 1 });

      transition = gsap.timeline({
        onComplete: function () {
          gsap.set(slides[from], { autoAlpha: 0, zIndex: 0 });
        }
      });

      transition.to(slides[from], { autoAlpha: 0, duration: duration, ease: 'power2.inOut' }, 0);
      transition.fromTo(slides[current], { autoAlpha: 0 }, {
        autoAlpha: 1,
        duration: duration,
        ease: 'power2.out'
      }, 0);

      setDots(user);
      kenBurns(current);
      startProgress();
      restartAutoplay();
    }

    prev.addEventListener('click', function () {
      goTo(current - 1, true);
    });
    next.addEventListener('click', function () {
      goTo(current + 1, true);
    });

    root.setAttribute('tabindex', '0');
    root.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goTo(current - 1, true);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goTo(current + 1, true);
      }
    });

    function pause() {
      paused = true;
      if (autoplay) autoplay.kill();
      if (progressTween) progressTween.pause();
    }

    function resume() {
      paused = false;
      startProgress();
      restartAutoplay();
    }

    root.addEventListener('mouseenter', pause);
    root.addEventListener('mouseleave', resume);
    root.addEventListener('focusin', pause);
    root.addEventListener('focusout', function (event) {
      if (!root.contains(event.relatedTarget)) resume();
    });

    var touchX = 0;
    viewport.addEventListener('touchstart', function (event) {
      touchX = event.changedTouches[0].clientX;
      pause();
    }, { passive: true });
    viewport.addEventListener('touchend', function (event) {
      var dx = event.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 40) {
        goTo(current + (dx < 0 ? 1 : -1), true);
      }
      resume();
    }, { passive: true });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) pause();
      else resume();
    });

    setDots(false);
    kenBurns(0);
    startProgress();
    restartAutoplay();
  }

  function introAnimation() {
    var header = document.querySelector('#overview img');
    var navItems = gsap.utils.toArray('.navbar .nav li');
    var intro = document.querySelector('.home-intro');
    var foci = gsap.utils.toArray('.home-foci > li');
    var carousel = document.querySelector('.image-carousel');
    var join = document.querySelector('.home-join');
    var news = document.querySelector('.news-card');

    if (prefersReduced()) {
      gsap.set([header, navItems, intro, foci, carousel, join, news], {
        clearProps: 'all'
      });
      html.classList.remove('js-gsap');
      return;
    }

    if (header) gsap.set(header, { autoAlpha: 0 });
    if (navItems.length) gsap.set(navItems, { autoAlpha: 0 });
    if (intro) gsap.set(intro, { autoAlpha: 0 });
    if (foci.length) gsap.set(foci, { autoAlpha: 0 });
    if (carousel) gsap.set(carousel, { autoAlpha: 0 });
    if (join) gsap.set(join, { autoAlpha: 0 });
    if (news) gsap.set(news, { autoAlpha: 0 });

    var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    if (header) {
      tl.fromTo(header, { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7 }, 0);
    }
    if (navItems.length) {
      tl.fromTo(navItems, { y: -10, autoAlpha: 0 }, {
        y: 0,
        autoAlpha: 1,
        duration: 0.4,
        stagger: 0.05
      }, 0.18);
    }
    if (intro) {
      tl.fromTo(intro, { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.55 }, 0.32);
    }
    if (foci.length) {
      tl.fromTo(foci, { y: 16, autoAlpha: 0 }, {
        y: 0,
        autoAlpha: 1,
        duration: 0.45,
        stagger: 0.08
      }, 0.42);
    }
    if (carousel) {
      tl.fromTo(carousel, { y: 22, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7 }, 0.38);
    }

    var joinBits = join ? gsap.utils.toArray(join.querySelectorAll('h4, li')) : [];

    if (join) {
      gsap.set(joinBits, { autoAlpha: 0, y: 16 });
      ScrollTrigger.create({
        trigger: join,
        start: 'top 92%',
        once: true,
        onEnter: function () {
          gsap.set(join, { autoAlpha: 1 });
          gsap.to(joinBits, {
            y: 0,
            autoAlpha: 1,
            duration: 0.5,
            stagger: 0.1,
            ease: 'power3.out',
            overwrite: 'auto'
          });
        }
      });
    }

    if (news) {
      gsap.fromTo(news, { y: 24, autoAlpha: 0 }, {
        y: 0,
        autoAlpha: 1,
        duration: 0.6,
        ease: 'power3.out',
        immediateRender: true,
        scrollTrigger: {
          trigger: news,
          start: 'top 92%',
          once: true,
          toggleActions: 'play none none none'
        }
      });
    }

    foci.forEach(function (item) {
      item.addEventListener('mouseenter', function () {
        gsap.to(item, { x: 6, duration: 0.28, ease: 'power2.out', overwrite: 'auto' });
      });
      item.addEventListener('mouseleave', function () {
        gsap.to(item, { x: 0, duration: 0.28, ease: 'power2.out', overwrite: 'auto' });
      });
    });

    function revealIfInView() {
      if (join && ScrollTrigger.isInViewport(join, 0.05) && gsap.getProperty(join, 'opacity') < 0.5) {
        gsap.set(join, { autoAlpha: 1, y: 0 });
        gsap.to(joinBits, { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.08, overwrite: 'auto' });
      }
      if (news && ScrollTrigger.isInViewport(news, 0.05) && gsap.getProperty(news, 'opacity') < 0.5) {
        gsap.to(news, { autoAlpha: 1, y: 0, duration: 0.45, overwrite: 'auto' });
      }
    }

    tl.eventCallback('onComplete', function () {
      ScrollTrigger.refresh();
      revealIfInView();
    });
    gsap.delayedCall(0.9, revealIfInView);
  }

  initNavIndicator();
  initCarousel();
  introAnimation();

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      ScrollTrigger.refresh();
    });
  }
})();
