// File: js/kutipan.js

const KutipanApp = (() => {
  const init = async () => {
    const container = document.getElementById("kutipan-list");
    const sorter = document.getElementById("kutipan-sorter");
    const kategoriFilter = document.getElementById("kategori-filter");

    // Pastikan semua elemen penting ada sebelum melanjutkan
    if (!container || !sorter || !kategoriFilter) {
      console.error("Elemen penting untuk halaman kutipan tidak ditemukan.");
      return;
    }

    // Mengambil data menggunakan fungsi dari app-core.js
    const data = await App.fetchData("testimonials", "data/testimonials.json");
    if (!data) {
      container.innerHTML =
        "<p>Gagal memuat data kutipan. Pastikan file data/testimonials.json ada dan formatnya benar.</p>";
      return;
    }

    // Fungsi untuk membuat satu kartu kutipan (HTML template)
    const createKutipanTemplate = (item) => {
      // Placeholder untuk avatar jika tidak ada
      const avatarHTML = item.avatar
        ? `<img src="${item.avatar}" alt="Avatar ${item.name}" loading="lazy">`
        : `<div class="testimonial-avatar-placeholder"><i class="fas fa-quote-left"></i></div>`;

      // Link sumber hanya ditampilkan jika linknya bukan '#'
      const linkHTML =
        item.link && item.link !== "#"
          ? `<a href="${item.link}" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-x-twitter"></i> Lihat Sumber</a>`
          : "";

      return `
        <div class="testimonial-card animate-on-scroll" data-content-id="${item.id}" style="width: 100%; max-width: 700px; margin: 0 auto;">
            <div class="testimonial-header">
                ${avatarHTML}
                <div class="testimonial-user">
                    <div class="name">${item.name}</div>
                    <div class="handle">${item.handle}</div>
                </div>
            </div>
            <div class="testimonial-body" style="font-size: 1.05em; line-height: 1.7;">
                <p>${item.text}</p>
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

    // Fungsi utama untuk memfilter, mengurutkan, dan menampilkan data
    const renderKutipan = () => {
      const sortOrder = sorter.value;
      const selectedKategori = kategoriFilter.value;

      // 1. Filter berdasarkan kategori yang dipilih
      const filteredData = data.filter(
        (item) =>
          selectedKategori === "semua" || item.kategori === selectedKategori
      );

      // 2. Urutkan data yang sudah difilter
      const sortedData = [...filteredData].sort((a, b) => {
        const dateA = new Date(a.tanggal);
        const dateB = new Date(b.tanggal);
        return sortOrder === "terbaru" ? dateB - dateA : dateA - dateB;
      });

      // 3. Tampilkan hasilnya ke halaman
      App.renderItems(
        container,
        sortedData,
        createKutipanTemplate,
        "<p style='text-align: center;'>Tidak ada kutipan yang cocok dengan filter Anda.</p>"
      );

      // 4. Panggil fungsi untuk update jumlah like/dislike dari Firebase
      sortedData.forEach((item) => App.updateReactionUI(item.id));
    };

    // Tambahkan event listener ke tombol filter dan sortir
    sorter.addEventListener("change", renderKutipan);
    kategoriFilter.addEventListener("change", renderKutipan);

    // Tampilkan kutipan untuk pertama kali saat halaman dimuat
    renderKutipan();
  };

  return {
    init,
  };
})();

// Daftarkan fungsi init dari KutipanApp ke dalam App.initializers
// Ini penting agar script ini bisa dijalankan oleh app-core.js
if (typeof App !== "undefined" && App.initializers) {
  App.initializers.kutipan = KutipanApp.init;
}
