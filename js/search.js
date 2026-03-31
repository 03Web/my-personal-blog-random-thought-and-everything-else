/**
 * @file search.js
 * @description Script untuk fungsionalitas pencarian di seluruh situs dengan indeks komprehensif.
 */

const SearchApp = (() => {
  // Daftar LENGKAP konten yang akan diindeks berdasarkan file yang Anda berikan
  const searchableContent = [
    // Halaman Utama
    {
      type: "page",
      title: "Beranda",
      path: "index.html",
      keywords: "utama, depan, home, beranda, amazia",
    },
    {
      type: "page",
      title: "Tentang Saya",
      path: "about.html",
      keywords: "about, tentang, amazia kristanto, profil, biodata",
    },
    {
      type: "page",
      title: "Galeri",
      path: "galeri.html",
      keywords: "foto, video, gambar, books, buku, picture",
    },
    {
      type: "page",
      title: "Toko",
      path: "toko.html",
      keywords: "produk, buku, jasa, bekas, preloved, teknologi",
    },
    {
      type: "page",
      title: "Artikel",
      path: "kegiatan.html",
      keywords: "artikel, tulisan, blog, keresahan, opini, history, science",
    },
    {
      type: "page",
      title: "Aspirasi",
      path: "aspirasi.html",
      keywords: "saran, kritik, masukan, kontak, diskusi",
    },
    {
      type: "page",
      title: "Kontak",
      path: "kontak.html",
      keywords: "alamat, nomor, telepon, whatsapp, email, social media",
    },

    // Data JSON
    { type: "json", path: "data/kegiatan.json" },
    { type: "json", path: "data/produk.json" },
    { type: "json", path: "data/testimonials.json" },
    { type: "json", path: "data/kontak.json" },

    // Semua Artikel HTML
    // (Anda bisa menambahkan path ke file HTML artikel di sini jika ada)
    // Contoh: { type: "html", path: "konten-kegiatan/artikel-baru.html" },
  ];

  let searchIndex = [];
  let isIndexBuilt = false;

  const fetchContent = async (item) => {
    try {
      const response = await fetch(item.path);
      if (!response.ok) throw new Error(`Gagal memuat ${item.path}`);
      if (item.type === "json") return await response.json();
      return await response.text();
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  const cleanText = (text) => {
    if (!text) return "";
    return text.replace(/\s+/g, " ").trim();
  };

  const buildIndex = async () => {
    if (isIndexBuilt) return;

    console.log("Membangun indeks pencarian...");

    const promises = searchableContent.map(async (item) => {
      const content = await fetchContent(item);
      if (!content) return;

      if (item.type === "page") {
        searchIndex.push({
          title: item.title,
          url: item.path,
          content: cleanText(`${item.title} ${item.keywords}`),
          type: "Halaman",
        });
      } else if (item.type === "json") {
        // Logika untuk memproses berbagai jenis file JSON
        if (item.path.includes("kegiatan")) {
          content.forEach((k) =>
            searchIndex.push({
              title: k.judul,
              url: k.link,
              content: cleanText(`${k.judul} ${k.deskripsi} ${k.kategori}`),
              type: "Artikel",
            })
          );
        } else if (item.path.includes("produk")) {
          content.forEach((p) =>
            searchIndex.push({
              title: p.nama,
              url: `detail-produk.html?id=${p.id}`,
              content: cleanText(`${p.nama} ${p.deskripsi} ${p.kategori}`),
              type: "Produk",
            })
          );
        } else if (item.path.includes("testimonials")) {
          content.forEach((t) =>
            searchIndex.push({
              title: `Kutipan dari ${t.name}`,
              url: "index.html#testimonial-section",
              content: cleanText(t.text),
              type: "Kutipan",
            })
          );
        } else if (item.path.includes("kontak")) {
          content.forEach((k) =>
            searchIndex.push({
              title: k.nama,
              url: "kontak.html",
              content: cleanText(`${k.nama} ${k.jabatan} ${k.deskripsi}`),
              type: "Kontak",
            })
          );
        }
      } else if (item.type === "html") {
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, "text/html");
        const title = doc.querySelector("h2")?.textContent || "Artikel";
        const bodyText = doc.body.innerText;
        const slug = item.path
          .substring(item.path.lastIndexOf("/") + 1)
          .replace(".html", "");
        const category = item.path.split("/")[1];
        const url = `artikel.html?slug=${category}/${slug}`;
        searchIndex.push({
          title: title,
          url: url,
          content: cleanText(`${title} ${bodyText}`),
          type: "Artikel",
        });
      }
    });

    await Promise.all(promises);
    isIndexBuilt = true;
    console.log("Indeks pencarian berhasil dibangun:", searchIndex);
  };

  const search = (query) => {
    if (!query || query.length < 2) return [];
    const lowerCaseQuery = query.toLowerCase();

    // Memberi skor pada hasil
    const results = searchIndex
      .map((item) => {
        let score = 0;
        const lowerCaseContent = item.content.toLowerCase();
        const lowerCaseTitle = item.title.toLowerCase();

        if (lowerCaseTitle.includes(lowerCaseQuery)) {
          score += 10; // Skor tinggi jika ada di judul
        }
        if (lowerCaseContent.includes(lowerCaseQuery)) {
          score += 1;
        }

        return { ...item, score };
      })
      .filter((item) => item.score > 0);

    // Urutkan berdasarkan skor
    return results.sort((a, b) => b.score - a.score);
  };

  const displayResults = async () => {
    await buildIndex(); // Pastikan index sudah ada
    const container = document.getElementById("search-results-container");
    const queryDisplay = document.getElementById("search-query-display");
    if (!container || !queryDisplay) return;

    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get("q");

    queryDisplay.textContent = `Menampilkan hasil untuk: "${query}"`;

    const results = search(query);

    if (results.length > 0) {
      container.innerHTML = results
        .map(
          (result) => `
        <a href="${result.url}" class="kegiatan-item animate-on-scroll">
          <div class="kegiatan-konten" style="padding-left: 0;">
            <span class="kegiatan-meta">${result.type}</span>
            <h3>${result.title}</h3>
            <p>${result.content
              .substring(0, 150)
              .replace(
                new RegExp(query, "gi"),
                (match) => `<mark>${match}</mark>`
              )}...</p>
            <span class="kegiatan-tombol">Lihat Selengkapnya</span>
          </div>
        </a>
      `
        )
        .join("");
      App.initScrollAnimations();
    } else {
      container.innerHTML =
        "<p>Tidak ada hasil yang ditemukan untuk pencarian Anda.</p>";
    }
  };

  const init = () => {
    // Mulai bangun index di latar belakang segera setelah script dimuat
    buildIndex();
    if (document.body.dataset.pageId === "search") {
      displayResults();
    }
  };

  return {
    init,
    search,
  };
})();

document.addEventListener("DOMContentLoaded", SearchApp.init);
