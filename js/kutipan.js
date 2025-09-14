// File: js/kutipan.js

const KutipanApp = (() => {
  const init = async () => {
    const container = document.getElementById("kutipan-list");
    const sorter = document.getElementById("kutipan-sorter");
    const kategoriFilter = document.getElementById("kategori-filter");

    if (!container || !sorter || !kategoriFilter) {
      console.error("Elemen penting untuk halaman kutipan tidak ditemukan.");
      return;
    }

    const data = await App.fetchData("testimonials", "data/testimonials.json");
    if (!data) {
      container.innerHTML =
        "<p>Gagal memuat data kutipan. Pastikan file data/testimonials.json ada dan formatnya benar.</p>";
      return;
    }

    const createKutipanTemplate = (item) => {
      const avatarHTML = item.avatar
        ? `<img src="${item.avatar}" alt="Avatar ${item.name}" loading="lazy">`
        : `<div class="testimonial-avatar-placeholder"><i class="fas fa-quote-left"></i></div>`;

      const linkHTML =
        item.link && item.link !== "#"
          ? `<a href="${item.link}" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-x-twitter"></i> Lihat Sumber</a>`
          : "";

      // PERUBAHAN: Menambahkan data-fulltext pada paragraf
      return `
        <div class="testimonial-card animate-on-scroll" data-content-id="${
          item.id
        }" style="width: 100%; max-width: 700px; margin: 0 auto;">
            <div class="testimonial-header">
                ${avatarHTML}
                <div class="testimonial-user">
                    <div class="name">${item.name}</div>
                    <div class="handle">${item.handle}</div>
                </div>
            </div>
            <div class="testimonial-body" style="font-size: 1.05em; line-height: 1.7;">
                <p data-fulltext="${encodeURIComponent(item.text)}"></p> 
            </div>
            <div class="testimonial-footer">
                <div class="reaction-buttons">
                    <button class="reaction-btn like-btn"><i class="fas fa-thumbs-up"></i> <span class="like-count">0</span></button>
                    <button class="reaction-btn dislike-btn"><i class="fas fa-thumbs-down"></i> <span class="dislike-count">0</span></button>
                </div>
                ${linkHTML}
            </div>
        </div>
      `;
    };

    // FUNGSI BARU untuk inisialisasi "Baca Selengkapnya"
    const initializeReadMore = () => {
      const charLimit = 150; // Batas karakter sebelum dipotong
      const kutipanCards = container.querySelectorAll(".testimonial-card");

      kutipanCards.forEach((card) => {
        const body = card.querySelector(".testimonial-body");
        const p = body.querySelector("p");
        // Menggunakan decodeURIComponent untuk mendapatkan teks asli kembali
        const fullText = decodeURIComponent(p.getAttribute("data-fulltext"));

        // Membersihkan tag <br> untuk perhitungan panjang yang akurat
        const textOnly = fullText.replace(/<br\s*\/?>/gi, " ");

        if (textOnly.length > charLimit) {
          const shortText = textOnly.substring(0, charLimit);
          // Menggunakan innerHTML untuk merender <br>
          p.innerHTML = `
            <span class="short-text">${shortText.replace(
              /\n/g,
              "<br>"
            )}...</span>
            <span class="full-text">${fullText}</span>
            <button class="read-more-btn">selengkapnya</button>
          `;

          const readMoreBtn = p.querySelector(".read-more-btn");
          readMoreBtn.addEventListener("click", (e) => {
            e.preventDefault(); // Mencegah link default jika ada
            e.stopPropagation(); // Mencegah event lain terpicu

            // Tutup semua kartu lain yang sedang terbuka
            kutipanCards.forEach((otherCard) => {
              if (otherCard !== card) {
                otherCard
                  .querySelector(".testimonial-body")
                  .classList.remove("expanded");
              }
            });
            // Buka atau tutup kartu yang di-klik
            body.classList.toggle("expanded");
          });
        } else {
          // Jika teks pendek, langsung tampilkan seluruhnya
          p.innerHTML = fullText;
        }
      });
    };

    const renderKutipan = () => {
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
        createKutipanTemplate,
        "<p style='text-align: center;'>Tidak ada kutipan yang cocok dengan filter Anda.</p>"
      );

      // PANGGIL FUNGSI BARU SETELAH RENDER
      initializeReadMore();

      sortedData.forEach((item) => App.updateReactionUI(item.id));
    };

    sorter.addEventListener("change", renderKutipan);
    kategoriFilter.addEventListener("change", renderKutipan);

    renderKutipan();
  };

  return {
    init,
  };
})();

if (typeof App !== "undefined" && App.initializers) {
  App.initializers.kutipan = KutipanApp.init;
}
