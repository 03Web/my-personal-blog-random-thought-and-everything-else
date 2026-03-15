/**
 * @file page-initializers.js
 * @description Inisialisasi spesifik untuk setiap halaman Karang Taruna (UI Amazia).
 * @version Perbaikan 24-08-2025
 */

// === FIREBASE INITIALIZATION (GLOBAL) ===
// Inisialisasi Firebase secara global agar dapat diakses oleh semua halaman
const firebaseConfig = {
  apiKey: "AIzaSyBl9qIcylHlyYouvjjpNC3KhE9aZVe2GV0",
  authDomain: "my-personal-blog-2dfc0.firebaseapp.com",
  databaseURL:
    "https://my-personal-blog-2dfc0-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "my-personal-blog-2dfc0",
  storageBucket: "my-personal-blog-2dfc0.firebasestorage.app",
  messagingSenderId: "859096020336",
  appId: "1:859096020336:web:7d05a1220bd44c340d4bb5",
  measurementId: "G-46X3TH1GPC",
};

// Inisialisasi Firebase hanya sekali
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
  console.log('Firebase initialized successfully');
}

// === HOME PAGE INITIALIZER (PERBAIKAN FINAL DENGAN TIMEOUT) ===
App.initializers.home = async () => {
  // --- Inisialisasi Testimoni (Mengambil dari JSON) ---
  const wrapper = document.querySelector(".testimonial-carousel-wrapper");
  const testimonialContainer = document.getElementById(
    "testimonial-carousel-container"
  );
  const prevBtn = document.getElementById("testimonial-prev-btn");
  const nextBtn = document.getElementById("testimonial-next-btn");

  if (testimonialContainer && prevBtn && nextBtn) {
    const testimonialData = await App.fetchData(
      "testimonials",
      "data/testimonials.json"
    );

    if (testimonialData && testimonialData.length > 0) {
      const createTestimonialTemplate = (item) => `
      <div class="testimonial-card" data-content-id="${item.id}">
          <div class="testimonial-header">
            <img src="${item.avatar}" alt="Avatar ${item.name}" loading="lazy">
            <div class="testimonial-user">
              <div class="name">${item.name}</div>
              <div class="handle">${item.handle}</div>
            </div>
          </div>
          <div class="testimonial-body">
            <p data-fulltext="${item.text}"></p>
          </div>
         <div class="testimonial-footer">
            <div class="reaction-buttons">
                <button class="reaction-btn like-btn"><i class="fas fa-thumbs-up"></i> <span class="like-count">0</span></button>
                <button class="reaction-btn dislike-btn"><i class="fas fa-thumbs-down"></i> <span class="dislike-count">0</span></button>
            </div>
            <a href="${item.link}" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-x-twitter"></i> Lihat di X</a>
          </div>
        </div>
      `;

      testimonialContainer.innerHTML = testimonialData
        .map(createTestimonialTemplate)
        .join("");

      // Panggil fungsi update UI untuk setiap testimoni
      testimonialData.forEach((item) => App.updateReactionUI(item.id));

      // === LOGIKA CAROUSEL INFINITE LOOP DAN BACA SELENGKAPNYA ===
      setTimeout(() => {
        const carousel = testimonialContainer;
        const originalItems = Array.from(carousel.querySelectorAll(".testimonial-card"));
        if (originalItems.length <= 1) return;

        let autoPlayInterval;
        const gap = 25; // gap between cards in px
        const totalOriginal = originalItems.length;
        // Jumlah clone di setiap sisi (cukup untuk mengisi viewport)
        const cloneCount = Math.min(totalOriginal, 5);

        // --- Buat clone di awal dan akhir untuk efek infinite ---
        const fragment_end = document.createDocumentFragment();
        const fragment_start = document.createDocumentFragment();
        for (let i = 0; i < cloneCount; i++) {
          const cloneEnd = originalItems[i].cloneNode(true);
          cloneEnd.classList.add("testimonial-clone");
          cloneEnd.setAttribute("aria-hidden", "true");
          fragment_end.appendChild(cloneEnd);

          const cloneStart = originalItems[totalOriginal - 1 - i].cloneNode(true);
          cloneStart.classList.add("testimonial-clone");
          cloneStart.setAttribute("aria-hidden", "true");
          fragment_start.insertBefore(cloneStart, fragment_start.firstChild);
        }
        carousel.appendChild(fragment_end);
        carousel.insertBefore(fragment_start, carousel.firstChild);

        // --- Hitung posisi awal (skip clone awal) ---
        const getCardWidth = () => {
          const card = carousel.querySelector(".testimonial-card");
          return card ? card.offsetWidth + gap : 300 + gap;
        };

        const setInitialScroll = () => {
          carousel.scrollLeft = cloneCount * getCardWidth();
        };
        setInitialScroll();

        // --- Deteksi boundary dan reset posisi untuk infinite loop ---
        let isResetting = false;
        const handleInfiniteScroll = () => {
          if (isResetting) return;
          const cardWidth = getCardWidth();
          const totalCloneWidth = cloneCount * cardWidth;
          const totalOriginalWidth = totalOriginal * cardWidth;
          const maxScroll = totalCloneWidth + totalOriginalWidth;
          const currentScroll = carousel.scrollLeft;

          if (currentScroll >= maxScroll) {
            // Melewati batas kanan → reset ke awal original
            isResetting = true;
            carousel.scrollLeft = currentScroll - totalOriginalWidth;
            requestAnimationFrame(() => {
              isResetting = false;
            });
          } else if (currentScroll <= 0) {
            // Melewati batas kiri → reset ke akhir original
            isResetting = true;
            carousel.scrollLeft = currentScroll + totalOriginalWidth;
            requestAnimationFrame(() => {
              isResetting = false;
            });
          }
        };

        carousel.addEventListener("scroll", handleInfiniteScroll);

        const updateDots = () => {}; // No-op (dots removed for cleaner UI)

        carousel.addEventListener("scroll", () => {
          requestAnimationFrame(updateDots);
        });

        // --- Baca Selengkapnya ---
        const initializeReadMore = () => {
          const charLimit = 150;
          // Terapkan pada semua card termasuk clones
          carousel.querySelectorAll(".testimonial-card").forEach((card) => {
            const body = card.querySelector(".testimonial-body");
            const p = body.querySelector("p");
            if (!p) return;
            const fullText = p.getAttribute("data-fulltext");
            if (!fullText) return;

            if (fullText.length > charLimit) {
              const shortText = fullText.substring(0, charLimit);
              p.innerHTML = `
                <span class="short-text">"${shortText}..."</span>
                <span class="full-text">"${fullText}"</span>
              `;
              
              // Tambahkan tombol UI premium di bawah paragraf
              const btnHTML = `
                <div class="read-more-wrapper">
                  <button class="read-more-btn" type="button" aria-expanded="false">
                    <span class="btn-text">Selengkapnya</span>
                    <i class="fas fa-chevron-down"></i>
                  </button>
                </div>
              `;
              body.insertAdjacentHTML("beforeend", btnHTML);

              const readMoreBtn = body.querySelector(".read-more-btn");
              const btnText = readMoreBtn.querySelector(".btn-text");

              const toggleExpand = (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const isExpanded = body.classList.contains("expanded");
                
                if (!isExpanded) {
                  // Tutup card lain yang terbuka
                  carousel.querySelectorAll(".testimonial-body.expanded").forEach((otherBody) => {
                    if (otherBody !== body) {
                      otherBody.classList.remove("expanded");
                      const otherBtn = otherBody.querySelector(".read-more-btn");
                      if (otherBtn) {
                        otherBtn.setAttribute("aria-expanded", "false");
                        otherBtn.querySelector(".btn-text").textContent = "Selengkapnya";
                      }
                    }
                  });
                  
                  body.classList.add("expanded");
                  readMoreBtn.setAttribute("aria-expanded", "true");
                  btnText.textContent = "Tutup";
                } else {
                  body.classList.remove("expanded");
                  readMoreBtn.setAttribute("aria-expanded", "false");
                  btnText.textContent = "Selengkapnya";
                }
                
                // Stop drag/scroll intent if any
                isDragging = false;
                carousel.style.cursor = "";
              };
              
              readMoreBtn.addEventListener("click", toggleExpand);
            } else {
              p.innerHTML = `"${fullText}"`;
            }
          });
        };

        // --- Auto-play: scroll kontinu, pelan, halus, dinamis dan profesional ---
        let autoPlayAniId;
        let lastTime = 0;
        const autoScrollSpeed = 35; // 35 pixels per detik (semakin kecil semakin lambat)
        let accumulatedScroll = 0;
        let isHoveringElement = false;

        const autoScrollLoop = (currentTime) => {
          if (!lastTime) lastTime = currentTime;
          const deltaTime = Math.min(currentTime - lastTime, 50); // capping delta max
          lastTime = currentTime;

          // Check if any card is currently expanded by the user
          const hasExpandedCard = carousel.querySelector(".testimonial-body.expanded") !== null;

          if (!isDragging && !isHoveringElement && !hasExpandedCard) {
            accumulatedScroll += (autoScrollSpeed * deltaTime) / 1000;
            if (accumulatedScroll >= 1) {
              const intScroll = Math.floor(accumulatedScroll);
              carousel.scrollLeft += intScroll;
              accumulatedScroll -= intScroll;
            }
          }
          autoPlayAniId = requestAnimationFrame(autoScrollLoop);
        };

        const startAutoPlay = () => {
          isHoveringElement = false;
          if (!autoPlayAniId) {
            lastTime = 0; // reset
            autoPlayAniId = requestAnimationFrame(autoScrollLoop);
          }
        };

        const stopAutoPlay = () => {
          isHoveringElement = true; // Loop tetap jalan tapi tidak scroll
        };

        // --- Tombol navigasi ---
        nextBtn.addEventListener("click", () => {
          carousel.scrollBy({ left: getCardWidth(), behavior: "smooth" });
        });

        prevBtn.addEventListener("click", () => {
          carousel.scrollBy({ left: -getCardWidth(), behavior: "smooth" });
        });

        // --- Drag/touch scroll support ---
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let currentX = 0;
        let scrollLeftStart = 0;
        let hasDragged = false;

        carousel.addEventListener("pointerdown", (e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          
          // --- FIX: Prevent capturing pointer events on interactive elements ---
          if (e.target.closest('.read-more-btn') || e.target.closest('a') || e.target.closest('.reaction-btn')) {
            return; // Biarkan event diteruskan ke tombol agar bisa diklik
          }

          isDragging = true;
          hasDragged = false;
          startX = e.pageX;
          startY = e.pageY;
          currentX = startX;
          scrollLeftStart = carousel.scrollLeft;
          try {
            carousel.setPointerCapture(e.pointerId);
          } catch(err) {}
          isHoveringElement = true; // pause auto scroll
        });

        carousel.addEventListener("pointermove", (e) => {
          if (!isDragging) return;
          
          const dx = e.pageX - startX;
          const dy = Math.abs(e.pageY - startY);
          
          // Only start dragging horizontally if they moved X more than Y (and >5px to avoid jitter)
          if (!hasDragged && Math.abs(dx) > 5 && Math.abs(dx) > dy) {
            hasDragged = true;
            carousel.style.cursor = "grabbing";
          }
          
          if (hasDragged) {
            e.preventDefault();
            carousel.scrollLeft = scrollLeftStart - dx;
          }
        });

        const stopDrag = () => {
          if (!isDragging) return;
          isDragging = false;
          carousel.style.cursor = "";
          
          if (hasDragged) {
            // Snap halus ke card terdekat setelah dilepas
            const cardWidth = getCardWidth();
            const snapTarget = Math.round(carousel.scrollLeft / cardWidth) * cardWidth;
            carousel.scrollTo({ left: snapTarget, behavior: "smooth" });
          }

          isHoveringElement = false; 
        };

        carousel.addEventListener("pointerup", stopDrag);
        carousel.addEventListener("pointercancel", stopDrag);

        // Prevent link clicks during true drag
        carousel.addEventListener("click", (e) => {
          if (hasDragged) {
            e.preventDefault();
            e.stopPropagation();
          }
        }, true);

        // --- Pause/resume auto-play on hover ---
        wrapper.addEventListener("mouseenter", stopAutoPlay);
        wrapper.addEventListener("mouseleave", startAutoPlay);

        // --- Resize handler: reset posisi clone boundary ---
        let resizeTimeout;
        window.addEventListener("resize", () => {
          clearTimeout(resizeTimeout);
          resizeTimeout = setTimeout(setInitialScroll, 200);
        });

        initializeReadMore();
        startAutoPlay();
      }, 100);
    } else {
      testimonialContainer.innerHTML =
        "<p>Gagal memuat testimoni atau data kosong.</p>";
    }
  }

  // --- Inisialisasi Kegiatan Terbaru ---
  const kegiatanContainer = document.getElementById("kegiatan-terbaru");
  if (kegiatanContainer) {
    const kegiatanData = await App.fetchData("kegiatan", "data/kegiatan.json");
    if (kegiatanData) {
      const sortedKegiatan = [...kegiatanData].sort(
        (a, b) => new Date(b.tanggal) - new Date(a.tanggal)
      );
      const terbaru = sortedKegiatan.slice(0, 3);

      const createKegiatanTemplate = (item) => `
        <article class="kegiatan-item" style="display: flex; flex-direction: column;">
          <a href="${item.link
        }" class="kegiatan-foto" style="width:100%; height: 180px;">
            <img src="${item.gambar}" alt="${item.alt_gambar || "Gambar Kegiatan " + item.judul
        }" loading="lazy">
          </a>
          <div class="kegiatan-konten">
            <h2>${item.judul}</h2>
            <p class="kegiatan-meta"><i class="fas fa-calendar-alt"></i> ${new Date(
          item.tanggal
        ).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}</p>
            <a href="${item.link}" class="kegiatan-tombol">Baca Selengkapnya</a>
          </div>
        </article>`;
      App.renderItems(kegiatanContainer, terbaru, createKegiatanTemplate, "");
    } else {
      kegiatanContainer.innerHTML = "<p>Gagal memuat kegiatan.</p>";
    }
  }
};

// === KEGIATAN PAGE ===
App.initializers.kegiatan = async () => {
  const container = document.getElementById("kegiatan-list");
  const sorter = document.getElementById("kegiatan-sorter");
  const kategoriFilter = document.getElementById("kategori-filter");

  if (!container || !sorter || !kategoriFilter) return;

  const data = await App.fetchData("kegiatan", "data/kegiatan.json");
  if (!data) {
    container.innerHTML = "<p>Gagal memuat daftar kegiatan.</p>";
    return;
  }

  // --- PERUBAHAN UTAMA ADA DI TEMPLATE INI ---
  const createKegiatanTemplate = (item) => {
    // Membuat ID unik untuk setiap item reaksi
    const contentId =
      item.link.split("slug=")[1]?.replace(/[^a-zA-Z0-9]/g, "_") ||
      `artikel_${new Date(item.tanggal).getTime()}`;
    return `
    <a href="${item.link
      }" class="kegiatan-item animate-on-scroll" data-content-id="${contentId}" data-kategori="${item.kategori
      }" data-tanggal="${item.tanggal}">
      <div class="kegiatan-foto">
        <img src="${item.gambar}" alt="${item.alt_gambar || "Gambar " + item.judul
      }" loading="lazy">
      </div>
      <div class="kegiatan-konten">
        <h3>${item.judul}</h3>
        <span class="kegiatan-meta">${new Date(item.tanggal).toLocaleDateString(
        "id-ID",
        { day: "numeric", month: "long", year: "numeric" }
      )}</span>
        <p>${item.deskripsi}</p>
        
        <div class="card-actions">
            <span class="kegiatan-tombol">Baca Selengkapnya</span>
            <div class="reaction-buttons">
                <button class="reaction-btn like-btn"><i class="fas fa-thumbs-up"></i> <span class="like-count">0</span></button>
                <button class="reaction-btn dislike-btn"><i class="fas fa-thumbs-down"></i> <span class="dislike-count">0</span></button>
            </div>
        </div>

      </div>
    </a>
  `;
  };

  const renderKegiatan = () => {
    const sortOrder = sorter.value;
    const selectedKategori = kategoriFilter.value;

    const filteredData = data.filter(
      (item) =>
        selectedKategori === "semua" || item.kategori === selectedKategori
    );

    const sortedData = [...filteredData].sort((a, b) => {
      const dateA = new Date(a.tanggal);
      const dateB = new Date(b.tanggal);
      return sortOrder === "terbaru" ? dateB - dateA : dateA - dateB;
    });

    App.renderItems(
      container,
      sortedData,
      createKegiatanTemplate,
      "Tidak ada kegiatan yang cocok dengan filter Anda."
    );

    // Panggil update UI untuk setiap artikel
    sortedData.forEach((item) => {
      const contentId =
        item.link.split("slug=")[1]?.replace(/[^a-zA-Z0-9]/g, "_") ||
        `artikel_${new Date(item.tanggal).getTime()}`;
      App.updateReactionUI(contentId);
    });
  };

  sorter.addEventListener("change", renderKegiatan);
  kategoriFilter.addEventListener("change", renderKegiatan);
  renderKegiatan();
};

// ... Sisa kode untuk `page-initializers.js` Anda yang lain tetap sama ...
// (Galeri, About, Kontak, Artikel)

// === GALERI PAGE (USING LIGHTGALLERY) ===
App.initializers.galeri = async () => {
  const data = await App.fetchData("galeri", "data/galeri.json");
  if (!data) return;

  const albumContainer = document.getElementById("album-grid");
  if (albumContainer && Array.isArray(data.albumFoto)) {
    const getAlbumPhotos = (album) =>
      Array.isArray(album.foto) ? album.foto : [];

    const createAlbumTemplate = (album) => {
      const photos = getAlbumPhotos(album);
      const photoCountLabel = `${photos.length} Foto`;

      return `
    <div class="album-item">
        <div class="album-cover" id="album-cover-${album.id}">
            <img src="${album.cover}" alt="${album.alt_cover || "Cover album " + album.judul
      }" loading="lazy">
            <div class="album-info"><h4>${album.judul}</h4><p>${photoCountLabel}</p></div>
            <div class="click-hint-animated">
                <i class="fas fa-hand-pointer"></i>
                <span>Buka Galeri</span>
            </div>
        </div>
        <div id="lightgallery-${album.id}" style="display:none;">
            ${photos
        .map(
          (foto) =>
            `<a href="${foto.src}" data-sub-html="<h4>${foto.title || album.judul
            }</h4>" data-alt="${foto.alt || foto.title}">
                      <img src="${foto.src}" alt="${foto.alt || foto.title}" />
                  </a>`
        )
        .join("")}
        </div>
    </div>`;
    };

    albumContainer.innerHTML = `
      <div class="album-carousel-wrapper">
        <button class="carousel-nav prev" aria-label="Sebelumnya">&lt;</button>
        <div class="album-carousel">
          ${data.albumFoto.map(createAlbumTemplate).join("")}
        </div>
        <button class="carousel-nav next" aria-label="Selanjutnya">&gt;</button>
      </div>
    `;

    data.albumFoto.forEach((album) => {
      const cover = document.getElementById(`album-cover-${album.id}`);
      const gallery = document.getElementById(`lightgallery-${album.id}`);

      const lg = lightGallery(gallery, {
        plugins: [lgThumbnail],
        speed: 500,
        download: false,
        mobileSettings: {
          controls: true,
          showCloseIcon: true,
        },
      });

      cover.addEventListener("click", () => {
        lg.openGallery();
      });
    });

    const wrapper = albumContainer.querySelector(".album-carousel-wrapper");
    const carousel = wrapper.querySelector(".album-carousel");
    const prevBtn = wrapper.querySelector(".prev");
    const nextBtn = wrapper.querySelector(".next");
    let autoPlayInterval;

    const startAutoPlay = () => {
      autoPlayInterval = setInterval(() => {
        const firstItem = carousel.querySelector(".album-item");
        if (!firstItem) return;
        const scrollAmount = firstItem.offsetWidth + 25;
        const isAtEnd =
          carousel.scrollLeft + carousel.clientWidth >=
          carousel.scrollWidth - 1;
        if (isAtEnd) {
          carousel.scrollTo({ left: 0, behavior: "smooth" });
        } else {
          carousel.scrollBy({ left: scrollAmount, behavior: "smooth" });
        }
      }, 3000);
    };
    const stopAutoPlay = () => clearInterval(autoPlayInterval);

    setTimeout(() => {
      const firstItem = carousel.querySelector(".album-item");
      if (!firstItem) return;
      const scrollAmount = firstItem.offsetWidth + 25;
      nextBtn.addEventListener("click", () =>
        carousel.scrollBy({ left: scrollAmount, behavior: "smooth" })
      );
      prevBtn.addEventListener("click", () =>
        carousel.scrollBy({ left: -scrollAmount, behavior: "smooth" })
      );
      wrapper.addEventListener("mouseenter", stopAutoPlay);
      wrapper.addEventListener("mouseleave", startAutoPlay);
      startAutoPlay();
    }, 100);
  }

  const videoContainer = document.getElementById("video-grid");
  if (videoContainer && data.dokumentasiVideo) {
    const createVideoTemplate = (video) => `
        <div class="gallery-item video-item animate-on-scroll" data-tanggal="${video.tanggal
      }">
            <iframe src="${video.src.replace("watch?v=", "embed/")}" title="${video.title
      }" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>
        </div>`;
    const renderVideos = (items) =>
      App.renderItems(
        videoContainer,
        items,
        createVideoTemplate,
        "Gagal memuat video."
      );
    const sorter = document.getElementById("video-sorter");
    const updateVideos = () => {
      const sortedData = [...data.dokumentasiVideo].sort((a, b) =>
        sorter.value === "terbaru"
          ? new Date(b.tanggal) - new Date(a.tanggal)
          : new Date(a.tanggal) - new Date(b.tanggal)
      );
      renderVideos(sortedData);
    };
    sorter.addEventListener("change", updateVideos);
    updateVideos();
  }
};

// === KONTAK PAGE ===
App.initializers.kontak = async () => {
  const container = document.getElementById("kontak-grid");
  if (!container) return;
  const data = await App.fetchData("kontak", "data/kontak.json");

  const createKontakTemplate = (kontak) => `
    <div class="kontak-card animate-on-scroll">
      <img src="${kontak.foto}" alt="${kontak.alt
    }" class="foto-pengurus" loading="lazy" />
      <h4>${kontak.nama}</h4>
      <p class="jabatan">${kontak.jabatan}</p>
      <p class="info-kontak">${kontak.deskripsi}</p>
      <a href="https://wa.me/${kontak.whatsapp}?text=${encodeURIComponent(
      kontak.pesan_wa
    )}" target="_blank" class="wa-button">
        <i class="fab fa-whatsapp"></i> Hubungi via WhatsApp
      </a>
    </div>`;
  App.renderItems(
    container,
    data,
    createKontakTemplate,
    "Gagal memuat daftar narahubung."
  );
};

// === ARTIKEL PAGE (DENGAN PENAMBAHAN KOMENTAR DINAMIS) ===
App.initializers.artikel = async () => {
  const mainContainer = document.querySelector("main");
  const container = document.getElementById("artikel-dinamis-container");
  if (!container || !mainContainer) return;

  const initSlideshow = () => {
    document.querySelectorAll(".slideshow-container").forEach((container) => {
      const slides = container.querySelectorAll(".slide-image");
      if (slides.length <= 1) {
        if (slides.length === 1) slides[0].classList.add("active-slide");
        return;
      }
      let currentIndex = 0;
      slides[currentIndex].classList.add("active-slide");
      if (container.dataset.intervalId)
        clearInterval(parseInt(container.dataset.intervalId));

      const intervalId = setInterval(() => {
        slides[currentIndex].classList.remove("active-slide");
        currentIndex = (currentIndex + 1) % slides.length;
        slides[currentIndex].classList.add("active-slide");
      }, 4000);
      container.dataset.intervalId = intervalId;
    });
  };

  try {
    const slug = new URLSearchParams(window.location.search).get("slug");
    if (!slug) throw new Error("Slug artikel tidak ditemukan di URL.");

    const artikelPath = `konten-kegiatan/${slug}.html`;
    const response = await fetch(artikelPath);
    if (!response.ok)
      throw new Error(`Gagal memuat konten artikel: ${response.statusText}`);

    // LANGKAH PENTING: Langsung ambil seluruh konten HTML
    const artikelHTML = await response.text();

    // TEMUKAN JUDUL DARI DATA JSON (lebih andal)
    // Pastikan data kegiatan sudah dimuat atau muat sekarang
    const kegiatanData = await App.fetchData("kegiatan", "data/kegiatan.json");
    const artikelInfo = kegiatanData.find((item) => item.link.includes(slug));

    const title = artikelInfo ? artikelInfo.judul : "Artikel";
    document.title = `${title} - My Personal Blog`;

    // LANGSUNG MASUKKAN SELURUH KONTEN ARTIKEL KE DALAM CONTAINER
    container.innerHTML = artikelHTML;

    // Tambahkan tombol reaksi secara dinamis
    const artikelKontenDiv = container.querySelector(".artikel-konten");
    if (artikelKontenDiv) {
      const currentURL = window.location.href; // Ambil URL lengkap saat ini

      const reactionButtonsHTML = `
            <div class="reaction-buttons" data-content-id="${slug}" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border-color); display: flex; flex-wrap: wrap; gap: 15px;">
              <button class="reaction-btn like-btn"><i class="fas fa-thumbs-up"></i> <span class="like-count">0</span></button>
              <button class="reaction-btn dislike-btn"><i class="fas fa-thumbs-down"></i> <span class="dislike-count">0</span></button>
              
              <button class="reaction-btn share-btn" onclick="navigator.clipboard.writeText('${currentURL}').then(() => alert('Link artikel berhasil disalin! Silakan tempel (paste) di WhatsApp atau Medsos.'));">
                <i class="fas fa-share-alt"></i> Bagikan
              </button>
            </div>
        `;
      artikelKontenDiv.insertAdjacentHTML("beforeend", reactionButtonsHTML);
    }

    // Tambahkan tombol kembali
    container.insertAdjacentHTML(
      "beforeend",
      `
        <a href="kegiatan.html" class="tombol-kembali" style="margin-top: 30px;">
            <i class="fas fa-arrow-left"></i> Kembali ke Daftar Artikel
        </a>
    `
    );

    initSlideshow();
    App.updateReactionUI(slug);

    const commentSectionHTML = `
      <div class="container" id="comment-section-container">
          <hr class="separator animate-on-scroll" />
          <section class="comment-section animate-on-scroll">
              <h3>
                  <span id="comment-count">0</span> Komentar
              </h3>
              <form id="comment-form-element" class="comment-form">
                  <div class="comment-avatar-input">
                      <i class="fas fa-user"></i>
                  </div>
                  <div class="comment-input-wrapper">
                      <textarea id="comment-pesan" placeholder="Tambahkan komentar..." required></textarea>
                      <div class="comment-actions">
                          <input type="text" id="comment-nama" placeholder="Nama (opsional)">
                          <button type="submit" class="comment-submit-btn">Kirim</button>
                      </div>
                  </div>
              </form>
              <div id="comment-list-container" class="comment-list">
                  <p>Memuat komentar...</p>
              </div>
          </section>
      </div>
    `;
    mainContainer.insertAdjacentHTML("beforeend", commentSectionHTML);

    if (typeof KomentarApp !== "undefined") {
      KomentarApp.init();
    }
  } catch (error) {
    console.error("Gagal memuat artikel:", error);
    container.innerHTML = `<div style="text-align: center;"><h2>Gagal Memuat Artikel</h2><p>Maaf, konten yang Anda cari tidak dapat ditemukan.</p><p><i>${error.message}</i></p><a href="kegiatan.html" class="kegiatan-tombol" style="margin-top: 20px;"><i class="fas fa-arrow-left"></i> Kembali ke Daftar Kegiatan</a></div>`;
  } finally {
    App.initScrollAnimations();
  }
};

// === ASPIRASI PAGE (DIUBAH) ===
App.initializers.aspirasi = () => {
  const introContainer = document.getElementById("collapsible-intro");
  if (introContainer) {
    const textWrapper = introContainer.querySelector("#intro-text-wrapper");
    const toggleButton = introContainer.querySelector("#toggle-intro-btn");

    if (textWrapper && toggleButton) {
      textWrapper.classList.add("collapsed");
      toggleButton.addEventListener("click", () => {
        const isCollapsed = textWrapper.classList.contains("collapsed");
        if (isCollapsed) {
          textWrapper.classList.remove("collapsed");
          toggleButton.textContent = "Sembunyikan";
        } else {
          textWrapper.classList.add("collapsed");
          toggleButton.textContent = "Baca Selengkapnya...";
        }
      });
    }
  }

  // Firebase sudah diinisialisasi secara global di bagian atas file
  // Tidak perlu inisialisasi ulang di sini

  const aspirasiContainer = document.getElementById("aspirasi-list");
  const form = document.getElementById("aspirasi-form");
  const formStatus = document.getElementById("form-status");
  const submitButton = document.getElementById("submit-aspirasi-btn");

  // Sembunyikan input nama lama
  const namaInputLama = document.getElementById("nama");
  if (namaInputLama) {
    namaInputLama.parentElement.style.display = "none";
  }

  if (!aspirasiContainer || !form || !submitButton) {
    console.error("Elemen penting untuk halaman aspirasi tidak ditemukan!");
    return;
  }

  const db = firebase.database();
  const aspirasiDbRef = db.ref("aspirasi");

  const createAspirasiTemplate = (item) => {
    const namaPengirim = item.nama ? item.nama : "Saran Anonim";
    const escapeHtml = (unsafe) => {
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    return `
      <div class="aspirasi-item">
        <div class="aspirasi-header">
          <h3>${escapeHtml(item.subjek)}</h3>
          <span class="status-tag status-baru-masuk">Baru Masuk</span>
        </div>
        <div class="aspirasi-meta">
          <span>Oleh: <strong>${escapeHtml(namaPengirim)}</strong></span>
          <span>Masuk pada: ${new Date(item.tanggal_masuk).toLocaleDateString(
      "id-ID",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    )}</span>
        </div>
        <div class="aspirasi-body">
          <p>${escapeHtml(item.pesan)}</p>
        </div>
      </div>
    `;
  };

  const query = db.ref("aspirasi").orderByChild("tanggal_masuk");
  query.on("value", (snapshot) => {
    aspirasiContainer.innerHTML = "";
    if (snapshot.exists()) {
      const data = snapshot.val();
      const aspirasiArray = Object.values(data).sort(
        (a, b) => new Date(b.tanggal_masuk) - new Date(a.tanggal_masuk)
      );
      aspirasiArray.forEach((item) => {
        aspirasiContainer.innerHTML += createAspirasiTemplate(item);
      });
    } else {
      aspirasiContainer.innerHTML =
        "<p>Belum ada aspirasi publik yang ditampilkan. Jadilah yang pertama!</p>";
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Validasi input yang tersisa
    const subjek = document.getElementById("subjek").value.trim();
    const pesan = document.getElementById("pesan").value.trim();
    if (!subjek || !pesan) {
      alert("Subjek dan Pesan tidak boleh kosong.");
      return;
    }

    try {
      // MINTA IDENTITAS PENGGUNA
      const user = await App.InteractionManager.requestIdentity(
        "menyampaikan aspirasi"
      );
      if (!user) return; // Pengguna membatalkan

      submitButton.disabled = true;
      formStatus.textContent = "Mengirim...";
      formStatus.className = "form-status";

      const dataToSend = {
        nama: user.displayName, // Gunakan nama dari modal
        subjek: subjek,
        pesan: pesan,
        tanggal_masuk: new Date().toISOString(),
      };

      aspirasiDbRef
        .push(dataToSend)
        .then(() => {
          formStatus.textContent =
            "Terima kasih! Aspirasi Anda telah berhasil dipublikasikan.";
          formStatus.classList.add("status-sukses");
          form.reset();
        })
        .catch((error) => {
          console.error("Firebase Error:", error);
          formStatus.textContent =
            "Gagal mengirim aspirasi. Silakan coba lagi.";
          formStatus.classList.add("status-gagal");
        })
        .finally(() => {
          submitButton.disabled = false;
          setTimeout(() => {
            formStatus.textContent = "";
            formStatus.className = "form-status";
          }, 6000);
        });
    } catch (error) {
      console.log("Interaksi dibatalkan oleh pengguna.");
    }
  });
};

// === POJOK BACA PAGE ===
App.initializers['pojok-baca'] = () => {
  if (typeof BacaanApp !== 'undefined') {
    BacaanApp.init();
  } else {
    console.error('BacaanApp belum dimuat. Pastikan js/bacaan.js sudah terpasang.');
  }
};
