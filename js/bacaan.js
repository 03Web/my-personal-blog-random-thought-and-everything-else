/**
 * @file bacaan.js
 * @description Pojok Baca — Katalog Buku & Custom PDF Reader
 * @version 4.0.0 — Slide-per-page reader + hidden Drive controls
 */

const BacaanApp = (() => {
  // === STATE ===
  let pdfDoc = null;
  let currentPage = 1;
  let totalPages = 0;
  let currentScale = 1.2;
  let isRendering = false;
  let preloadedPage = null;
  let isIframeMode = false;

  const MIN_SCALE = 0.5;
  const MAX_SCALE = 3.0;
  const SCALE_STEP = 0.2;

  let touchStartX = 0;
  let touchStartY = 0;
  const SWIPE_THRESHOLD = 50;

  let els = {};

  // =============================================
  // === GOOGLE DRIVE URL HANDLER             ===
  // =============================================

  function extractDriveFileId(url) {
    if (!url) return null;
    const m1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (m1) return m1[1];
    const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (m2) return m2[1];
    return null;
  }

  function getDrivePreviewUrl(fileId) {
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }

  /**
   * Generate CORS-proxied download URLs to try.
   */
  function getProxiedUrls(fileId) {
    const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    return [
      `https://corsproxy.io/?${encodeURIComponent(directUrl)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}`,
    ];
  }

  // =============================================
  // === KATALOG BUKU - STATE MANAGEMENT        ===
  // =============================================

  let bukuData = [];
  let bukuKategoriSet = new Set();

  /**
   * Extract unique categories from buku data and populate filter dropdown
   */
  function generateKategoriFilter(books) {
    const select = document.getElementById('buku-kategori-filter');
    if (!select) return;

    // Collect unique categories
    bukuKategoriSet.clear();
    books.forEach((book) => {
      if (book.kategori) {
        bukuKategoriSet.add(book.kategori);
      }
    });

    // Sort categories alphabetically
    const sortedKategori = Array.from(bukuKategoriSet).sort();

    // Save current selection
    const currentValue = select.value;

    // Clear existing options (keep "Semua Kategori")
    select.innerHTML = '<option value="semua">Semua Kategori</option>';

    // Add options dynamically
    sortedKategori.forEach((kategori) => {
      const option = document.createElement('option');
      option.value = kategori;
      option.textContent = kategori;
      select.appendChild(option);
    });

    // Restore selection if still valid
    if (currentValue !== 'semua' && bukuKategoriSet.has(currentValue)) {
      select.value = currentValue;
    }
  }

  /**
   * Filter and render books based on selected category and search query
   */
  function filterAndRenderBuku() {
    const container = document.getElementById('bacaan-grid-container');
    const kategoriFilter = document.getElementById('buku-kategori-filter');
    const searchInput = document.getElementById('buku-search-input');

    if (!container || bukuData.length === 0) return;

    const selectedKategori = kategoriFilter ? kategoriFilter.value : 'semua';
    const searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : '';

    // Filter books
    const filteredBooks = bukuData.filter((book) => {
      // Category filter
      const kategoriMatch = selectedKategori === 'semua' || book.kategori === selectedKategori;

      // Search filter (judul buku)
      const judulLower = (book.judul_buku || '').toLowerCase();
      const searchMatch = !searchQuery || judulLower.includes(searchQuery);

      return kategoriMatch && searchMatch;
    });

    // Render filtered results
    if (filteredBooks.length === 0) {
      container.innerHTML = `
        <div class="buku-empty-state">
          <i class="fas fa-search"></i>
          <p>Tidak ada buku yang cocok dengan filter.</p>
        </div>
      `;
      return;
    }

    const fragment = document.createDocumentFragment();

    filteredBooks.forEach((book) => {
      const card = document.createElement('div');
      card.className = 'bacaan-card animate-on-scroll';
      card.dataset.title = book.judul_buku;
      card.dataset.kategori = book.kategori;

      card.innerHTML = `
        <div class="bacaan-card-cover">
          <img src="${book.cover_url}" alt="Cover ${book.judul_buku}" loading="lazy" />
          <div class="bacaan-card-overlay">
            <i class="fas fa-book-reader"></i>
          </div>
        </div>
        <div class="bacaan-card-info">
          ${book.kategori ? `<span class="buku-kategori">${book.kategori}</span>` : ''}
          <h4>${book.judul_buku}</h4>
        </div>
      `;

      card.addEventListener('click', () => {
        openReader(book.pdf_url, book.judul_buku);
      });

      fragment.appendChild(card);
    });

    container.innerHTML = '';
    container.appendChild(fragment);

    // Re-init scroll animations for new elements
    if (typeof App !== 'undefined' && App.initScrollAnimations) {
      App.initScrollAnimations();
    }
  }

  /**
   * Bind filter events for buku catalog
   */
  function bindBukuFilterEvents() {
    const kategoriFilter = document.getElementById('buku-kategori-filter');
    const searchInput = document.getElementById('buku-search-input');

    if (kategoriFilter) {
      kategoriFilter.addEventListener('change', filterAndRenderBuku);
    }

    if (searchInput) {
      // Debounced search for better performance
      let searchTimeout;
      searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(filterAndRenderBuku, 150);
      });

      // Clear search on Escape key
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          searchInput.value = '';
          filterAndRenderBuku();
          searchInput.blur();
        }
      });
    }
  }

  /**
   * Try loading PDF via pdf.js with CORS proxies (fast timeout).
   * Returns pdf document or null if all fail.
   */
  async function tryLoadPdf(fileId) {
    if (typeof pdfjsLib === 'undefined') return null;

    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const urls = getProxiedUrls(fileId);

    for (const url of urls) {
      try {
        // Race: load PDF vs 6-second timeout
        const doc = await Promise.race([
          pdfjsLib.getDocument({
            url: url,
            cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
            cMapPacked: true,
          }).promise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 6000)),
        ]);
        console.log('[Pojok Baca] PDF.js berhasil — mode slide aktif!');
        return doc;
      } catch (e) {
        console.warn(`[Pojok Baca] Proxy gagal: ${e.message}`);
      }
    }
    return null;
  }

  // =============================================
  // === KATALOG BUKU                         ===
  // =============================================

  async function loadCatalog() {
    const container = document.getElementById('bacaan-grid-container');
    if (!container) return;

    try {
      const response = await fetch('data/bacaan.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      bukuData = await response.json();

      if (!bukuData || bukuData.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:var(--dark-text);">Belum ada buku tersedia.</p>';
        return;
      }

      // Generate kategori filter options dynamically
      generateKategoriFilter(bukuData);

      // Render dengan filter (default: semua)
      filterAndRenderBuku();

      // Bind filter events
      bindBukuFilterEvents();
    } catch (error) {
      console.error('Gagal memuat katalog buku:', error);
      container.innerHTML = `
        <div style="text-align:center; padding: 40px;">
          <i class="fas fa-exclamation-triangle" style="font-size:2em; color:#ff6b6b;"></i>
          <p style="margin-top:15px; color:var(--dark-text);">Gagal memuat daftar buku.</p>
        </div>
      `;
    }
  }

  // =============================================
  // === PDF READER                           ===
  // =============================================

  function cacheElements() {
    els = {
      modal: document.getElementById('pdf-reader-modal'),
      title: document.getElementById('reader-book-title'),
      canvasArea: document.getElementById('reader-canvas-area'),
      canvasWrapper: document.getElementById('reader-canvas-wrapper'),
      canvas: document.getElementById('reader-canvas'),
      iframeContainer: document.getElementById('reader-iframe-container'),
      loadingOverlay: document.getElementById('reader-loading'),
      errorOverlay: document.getElementById('reader-error'),
      errorMsg: document.getElementById('reader-error-msg'),
      btnClose: document.getElementById('reader-btn-close'),
      btnPrev: document.getElementById('reader-btn-prev'),
      btnNext: document.getElementById('reader-btn-next'),
      btnZoomIn: document.getElementById('reader-btn-zoomin'),
      btnZoomOut: document.getElementById('reader-btn-zoomout'),
      pageInput: document.getElementById('reader-page-input'),
      pageTotal: document.getElementById('reader-page-total'),
      zoomLevel: document.getElementById('reader-zoom-level'),
    };
  }

  function showLoading(show) {
    if (els.loadingOverlay) els.loadingOverlay.classList.toggle('active', show);
  }

  function showError(msg) {
    if (els.errorOverlay && els.errorMsg) {
      els.errorMsg.textContent = msg;
      els.errorOverlay.classList.add('active');
    }
    showLoading(false);
  }

  function hideError() {
    if (els.errorOverlay) els.errorOverlay.classList.remove('active');
  }

  /**
   * Activate iframe fallback mode — with overlay to hide external link button.
   */
  function activateIframeMode(fileId, title) {
    isIframeMode = true;

    if (els.canvasWrapper) els.canvasWrapper.style.display = 'none';
    if (els.iframeContainer) {
      els.iframeContainer.style.display = 'flex';
      els.iframeContainer.innerHTML = '';

      // Wrapper crops the top toolbar of Drive viewer (hides external link button)
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'position:relative; flex:1; width:100%; height:100%; overflow:hidden; border-radius:8px;';

      const iframe = document.createElement('iframe');
      iframe.src = getDrivePreviewUrl(fileId);
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('allow', 'autoplay');
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('referrerpolicy', 'no-referrer');
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
      // Shift iframe UP by 40px to crop Drive's top toolbar off-screen
      // Add extra height to compensate so bottom content isn't cut off
      iframe.style.cssText = 'border:none; width:100%; height:calc(100% + 40px); margin-top:-40px;';

      iframe.addEventListener('load', () => showLoading(false));

      wrapper.appendChild(iframe);
      els.iframeContainer.appendChild(wrapper);
    }

    // Hide pdf.js controls
    const bottomBar = document.querySelector('.reader-bottom-bar');
    if (bottomBar) bottomBar.style.display = 'none';

    els.title.textContent = title || 'Membaca...';
  }

  /**
   * Open the PDF reader.
   * Strategy: try pdf.js first (slide mode) → fallback iframe (with hidden button)
   */
  async function openReader(pdfUrl, title) {
    cacheElements();
    if (!els.modal) return;

    // Reset
    pdfDoc = null;
    currentPage = 1;
    totalPages = 0;
    currentScale = 1.2;
    isRendering = false;
    preloadedPage = null;
    isIframeMode = false;

    // Reset UI
    if (els.canvasWrapper) els.canvasWrapper.style.display = '';
    if (els.iframeContainer) {
      els.iframeContainer.style.display = 'none';
      els.iframeContainer.innerHTML = '';
    }
    const bottomBar = document.querySelector('.reader-bottom-bar');
    if (bottomBar) bottomBar.style.display = '';

    // Show modal
    els.modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    els.title.textContent = title || 'Memuat...';
    hideError();
    showLoading(true);

    const fileId = extractDriveFileId(pdfUrl);
    if (!fileId) {
      showError('Link Google Drive tidak valid.');
      return;
    }

    // Strategy 1: Try pdf.js (enables slide-per-page reading)
    const doc = await tryLoadPdf(fileId);

    if (doc) {
      // ★ PDF.js SUCCESS — slide-per-page mode!
      pdfDoc = doc;
      totalPages = pdfDoc.numPages;
      els.pageTotal.textContent = `/ ${totalPages}`;
      updateZoomDisplay();
      await renderPage(currentPage);
      showLoading(false);
      preloadNextPage();
    } else {
      // Strategy 2: Fallback to iframe (with hidden external button)
      console.log('[Pojok Baca] Menggunakan Drive viewer (slide tidak tersedia).');
      activateIframeMode(fileId, title);
    }
  }

  function closeReader() {
    if (els.modal) {
      els.modal.classList.remove('active');
      document.body.style.overflow = '';
    }
    if (els.iframeContainer) els.iframeContainer.innerHTML = '';
    pdfDoc = null;
    preloadedPage = null;
    isIframeMode = false;
  }

  async function renderPage(pageNum, direction = null) {
    if (!pdfDoc || isRendering || isIframeMode) return;
    isRendering = true;

    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: currentScale });
      const canvas = els.canvas;
      const ctx = canvas.getContext('2d');

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Slide animation — like flipping a book page
      if (direction && els.canvasWrapper) {
        els.canvasWrapper.classList.remove('slide-left', 'slide-right');
        void els.canvasWrapper.offsetWidth;
        els.canvasWrapper.classList.add(
          direction === 'next' ? 'slide-left' : 'slide-right'
        );
      }

      await page.render({ canvasContext: ctx, viewport }).promise;

      els.pageInput.value = pageNum;
      currentPage = pageNum;
      updateNavButtons();
    } catch (error) {
      console.error('Gagal render halaman:', error);
    } finally {
      isRendering = false;
    }
  }

  function updateNavButtons() {
    if (els.btnPrev) els.btnPrev.disabled = currentPage <= 1;
    if (els.btnNext) els.btnNext.disabled = currentPage >= totalPages;
  }

  function updateZoomDisplay() {
    if (els.zoomLevel) els.zoomLevel.textContent = `${Math.round(currentScale * 100)}%`;
  }

  async function preloadNextPage() {
    if (!pdfDoc || currentPage >= totalPages) return;
    try { preloadedPage = await pdfDoc.getPage(currentPage + 1); } catch (e) {}
  }

  function goNextPage() {
    if (currentPage < totalPages && !isRendering && !isIframeMode)
      renderPage(currentPage + 1, 'next').then(preloadNextPage);
  }

  function goPrevPage() {
    if (currentPage > 1 && !isRendering && !isIframeMode)
      renderPage(currentPage - 1, 'prev');
  }

  function jumpToPage(pageNum) {
    if (isIframeMode) return;
    const num = parseInt(pageNum, 10);
    if (isNaN(num) || num < 1 || num > totalPages || num === currentPage) return;
    renderPage(num, num > currentPage ? 'next' : 'prev').then(preloadNextPage);
  }

  function zoomIn() {
    if (isIframeMode || currentScale >= MAX_SCALE) return;
    currentScale = Math.min(currentScale + SCALE_STEP, MAX_SCALE);
    updateZoomDisplay();
    renderPage(currentPage);
  }

  function zoomOut() {
    if (isIframeMode || currentScale <= MIN_SCALE) return;
    currentScale = Math.max(currentScale - SCALE_STEP, MIN_SCALE);
    updateZoomDisplay();
    renderPage(currentPage);
  }

  // =============================================
  // === ANTI-COPY PROTECTION                 ===
  // =============================================

  function initProtection() {
    const modal = document.getElementById('pdf-reader-modal');
    if (!modal) return;
    modal.addEventListener('contextmenu', (e) => { e.preventDefault(); return false; });
    modal.addEventListener('dragstart', (e) => { e.preventDefault(); });
    modal.style.userSelect = 'none';
    modal.style.webkitUserSelect = 'none';
  }

  // =============================================
  // === EVENT LISTENERS                      ===
  // =============================================

  function bindEvents() {
    cacheElements();

    if (els.btnClose) els.btnClose.addEventListener('click', closeReader);
    if (els.btnPrev) els.btnPrev.addEventListener('click', goPrevPage);
    if (els.btnNext) els.btnNext.addEventListener('click', goNextPage);

    if (els.pageInput) {
      els.pageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); jumpToPage(els.pageInput.value); els.pageInput.blur(); }
      });
      els.pageInput.addEventListener('input', () => {
        els.pageInput.value = els.pageInput.value.replace(/[^0-9]/g, '');
      });
    }

    if (els.btnZoomIn) els.btnZoomIn.addEventListener('click', zoomIn);
    if (els.btnZoomOut) els.btnZoomOut.addEventListener('click', zoomOut);

    document.addEventListener('keydown', (e) => {
      if (!els.modal || !els.modal.classList.contains('active')) return;
      switch (e.key) {
        case 'ArrowRight': case 'ArrowDown': e.preventDefault(); goNextPage(); break;
        case 'ArrowLeft': case 'ArrowUp': e.preventDefault(); goPrevPage(); break;
        case 'Escape': closeReader(); break;
        case '+': case '=': if (e.ctrlKey || e.metaKey) { e.preventDefault(); zoomIn(); } break;
        case '-': if (e.ctrlKey || e.metaKey) { e.preventDefault(); zoomOut(); } break;
      }
    });

    const canvasArea = els.canvasArea;
    if (canvasArea) {
      canvasArea.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
      }, { passive: true });
      canvasArea.addEventListener('touchend', (e) => {
        const deltaX = e.changedTouches[0].screenX - touchStartX;
        const deltaY = Math.abs(e.changedTouches[0].screenY - touchStartY);
        if (Math.abs(deltaX) > SWIPE_THRESHOLD && Math.abs(deltaX) > deltaY) {
          deltaX < 0 ? goNextPage() : goPrevPage();
        }
      }, { passive: true });
    }

    const errorRetryBtn = document.getElementById('reader-error-retry');
    if (errorRetryBtn) errorRetryBtn.addEventListener('click', closeReader);

    initProtection();
  }

  // =============================================
  // === ARTIKEL SECTION                      ===
  // =============================================

  let artikelData = null;

  async function loadArtikel() {
    const container = document.getElementById('pb-artikel-list');
    const kategoriFilter = document.getElementById('pb-kategori-filter');
    const sorter = document.getElementById('pb-sorter');
    if (!container) return;

    try {
      if (typeof App !== 'undefined' && App.fetchData) {
        artikelData = await App.fetchData('kegiatan', 'data/kegiatan.json');
      } else {
        const response = await fetch('data/kegiatan.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        artikelData = await response.json();
      }

      if (!artikelData || artikelData.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:var(--dark-text);">Belum ada artikel tersedia.</p>';
        return;
      }

      const renderArtikel = () => {
        const selectedKategori = kategoriFilter ? kategoriFilter.value : 'semua';
        const sortOrder = sorter ? sorter.value : 'terbaru';

        const filteredData = artikelData.filter(
          (item) => selectedKategori === 'semua' || item.kategori === selectedKategori
        );
        const sortedData = [...filteredData].sort((a, b) => {
          return sortOrder === 'terbaru'
            ? new Date(b.tanggal) - new Date(a.tanggal)
            : new Date(a.tanggal) - new Date(b.tanggal);
        });

        if (sortedData.length === 0) {
          container.innerHTML = '<p style="text-align:center;color:var(--dark-text);padding:30px 0;">Tidak ada artikel yang cocok dengan filter.</p>';
          return;
        }

        container.innerHTML = sortedData.map((item) => {
          const contentId = item.link.split('slug=')[1]?.replace(/[^a-zA-Z0-9]/g, '_') || `artikel_${new Date(item.tanggal).getTime()}`;
          const formattedDate = new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
          return `
            <a href="${item.link}" class="artikel-compact-item animate-on-scroll" data-content-id="${contentId}">
              <div class="artikel-compact-thumb">
                <img src="${item.gambar}" alt="${item.alt_gambar || item.judul}" loading="lazy" />
              </div>
              <div class="artikel-compact-body">
                <span class="artikel-compact-kategori">${item.kategori || ''}</span>
                <h4>${item.judul}</h4>
                <p class="artikel-compact-desc">${item.deskripsi || ''}</p>
                <span class="artikel-compact-date"><i class="fas fa-calendar-alt"></i> ${formattedDate}</span>
              </div>
            </a>
          `;
        }).join('');

        if (typeof App !== 'undefined') {
          if (App.initScrollAnimations) App.initScrollAnimations();
          sortedData.forEach((item) => {
            const contentId = item.link.split('slug=')[1]?.replace(/[^a-zA-Z0-9]/g, '_') || `artikel_${new Date(item.tanggal).getTime()}`;
            if (App.updateReactionUI) App.updateReactionUI(contentId);
          });
        }
      };

      if (kategoriFilter) kategoriFilter.addEventListener('change', renderArtikel);
      if (sorter) sorter.addEventListener('change', renderArtikel);
      renderArtikel();
    } catch (error) {
      console.error('Gagal memuat artikel:', error);
      container.innerHTML = '<p style="text-align:center; color:var(--dark-text); padding:30px 0;"><i class="fas fa-exclamation-triangle" style="color:#ff6b6b;"></i> Gagal memuat daftar artikel.</p>';
    }
  }

  // =============================================
  // === INIT                                 ===
  // =============================================

  function init() {
    loadCatalog();
    loadArtikel();
    bindEvents();
  }

  return { init, openReader, closeReader };
})();
