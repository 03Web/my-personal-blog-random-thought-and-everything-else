/**
 * @file visitor-counter.js
 * @description Unique visitor counter — counts each visitor only once per session.
 *              Stores count in Firebase Realtime Database.
 *              Automatically waits for footer element to appear before binding.
 */

const VisitorCounter = (() => {
  const SESSION_KEY = 'amaz_visitor_counted';

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

  function startCounter() {
    if (typeof firebase === 'undefined') return;

    // Inisialisasi Firebase jika belum
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    const db = firebase.database();
    const counterRef = db.ref('siteStats/visitorCount');
    const counterEl = document.getElementById('visitor-count-number');

    // Tampilkan jumlah pengunjung secara real-time
    if (counterEl) {
      counterRef.on('value', (snapshot) => {
        const count = snapshot.val() || 0;
        counterEl.textContent = formatNumber(count);
      });
    }

    // Hanya tambah 1x per sesi browser
    if (!sessionStorage.getItem(SESSION_KEY)) {
      counterRef.transaction((current) => {
        return (current || 0) + 1;
      }).then(() => {
        sessionStorage.setItem(SESSION_KEY, '1');
      }).catch((err) => {
        console.error('[VisitorCounter] Error:', err);
      });
    }
  }

  function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString('id-ID');
  }

  /**
   * Init: wait for #visitor-count-number to appear in DOM
   * (footer is loaded asynchronously by app-core.js).
   * Uses MutationObserver to detect when footer content is injected.
   */
  function init() {
    // Jika elemen sudah ada, langsung jalankan
    if (document.getElementById('visitor-count-number')) {
      startCounter();
      return;
    }

    // Jika belum ada, tunggu footer dimuat (MutationObserver)
    const footer = document.getElementById('main-footer');
    if (footer) {
      const observer = new MutationObserver(() => {
        if (document.getElementById('visitor-count-number')) {
          observer.disconnect();
          startCounter();
        }
      });
      observer.observe(footer, { childList: true, subtree: true });
    } else {
      // Fallback: coba lagi setelah 2 detik
      setTimeout(() => {
        startCounter();
      }, 2000);
    }
  }

  return { init };
})();

// Jalankan segera atau saat DOM siap
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', VisitorCounter.init);
} else {
  VisitorCounter.init();
}
