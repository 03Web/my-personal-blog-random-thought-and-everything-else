// File: js/portfolio.js
// Portfolio page implementation with search, filter, and sort functionality

const PortfolioApp = (() => {
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  let allProjects = [];
  let filteredProjects = [];

  // ============================================
  // INITIALIZATION
  // ============================================
  const init = async () => {
    const container = document.getElementById("portfolio-grid");
    const searchInput = document.getElementById("portfolio-search");
    const sorter = document.getElementById("portfolio-sorter");

    if (!container) {
      console.error("Portfolio grid container not found.");
      return;
    }

    // Fetch project data using App.fetchData
    const data = await App.fetchData("projects", "data/projects.json");
    if (!data) {
      container.innerHTML =
        "<p>Failed to load projects. Please check data/projects.json</p>";
      return;
    }

    allProjects = data;

    // Setup event listeners
    setupEventListeners(searchInput, sorter);

    // Setup modal listeners
    setupModalListeners();

    // Setup click delegation for view details buttons
    setupClickDelegation();

    // Initial render
    renderProjects();
  };

  // ============================================
  // PROJECT CARD TEMPLATE
  // ============================================
  const createProjectCard = (project) => {
    // Tech badges (max 4 visible)
    const techBadges = project.technologies
      .slice(0, 4)
      .map((tech) => `<span class="tech-badge">${tech}</span>`)
      .join("");

    const moreTech =
      project.technologies.length > 4
        ? `<span class="tech-badge more">+${
            project.technologies.length - 4
          } more</span>`
        : "";

    // Featured badge
    const featuredBadge = project.featured
      ? '<span class="featured-badge"><i class="fas fa-star"></i> Featured</span>'
      : "";

    // Status class
    const statusClass = project.status.toLowerCase().replace(/\s+/g, "-");

    // Links (only show if URL exists and is not placeholder)
    const liveLink =
      project.links.live && !project.links.live.includes("your-")
        ? `<a href="${project.links.live}"
             target="_blank"
             rel="noopener noreferrer"
             class="project-link live">
            <i class="fas fa-external-link-alt"></i> Live Demo
          </a>`
        : "";

    const githubLink =
      project.links.github && !project.links.github.includes("your")
        ? `<a href="${project.links.github}"
             target="_blank"
             rel="noopener noreferrer"
             class="project-link github">
            <i class="fab fa-github"></i> GitHub
          </a>`
        : "";

    return `
      <div class="project-card animate-on-scroll" data-content-id="${project.id}">
        ${featuredBadge}

        <div class="project-image-wrapper">
          <img src="${project.thumbnail}"
               alt="${project.title}"
               loading="lazy"
               class="project-thumbnail"
               onerror="this.src='foto/logoneutrontransparan.png'">
          <div class="project-overlay">
            <button class="btn-view-details" data-project-id="${project.id}">
              <i class="fas fa-eye"></i> View Details
            </button>
          </div>
        </div>

        <div class="project-info">
          <div class="project-header">
            <h3 class="project-title">${project.title}</h3>
            <span class="project-status status-${statusClass}">
              ${project.status}
            </span>
          </div>

          <p class="project-description">${project.shortDescription}</p>

          <div class="project-category">
            <i class="fas fa-folder"></i>
            <span>${project.category}</span>
          </div>

          <div class="tech-stack">
            ${techBadges}
            ${moreTech}
          </div>

          ${
            liveLink || githubLink
              ? `<div class="project-links">
                ${liveLink}
                ${githubLink}
              </div>`
              : ""
          }

          <div class="reaction-buttons" data-content-id="${project.id}">
            <button class="reaction-btn like-btn" data-reaction-type="like">
              <i class="fas fa-thumbs-up"></i>
              <span class="like-count">0</span>
            </button>
            <button class="reaction-btn dislike-btn" data-reaction-type="dislike">
              <i class="fas fa-thumbs-down"></i>
              <span class="dislike-count">0</span>
            </button>
          </div>
        </div>
      </div>
    `;
  };

  // ============================================
  // FILTERING LOGIC
  // ============================================
  const filterProjects = (searchTerm) => {
    return allProjects.filter((project) => {
      // Search filter only
      const matchesSearch =
        searchTerm === "" ||
        project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.shortDescription
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        project.fullDescription
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        project.technologies.some((tech) =>
          tech.toLowerCase().includes(searchTerm.toLowerCase())
        ) ||
        project.category.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    });
  };

  // ============================================
  // SORTING LOGIC
  // ============================================
  const sortProjects = (projects, sortType) => {
    const sorted = [...projects];

    switch (sortType) {
      case "newest":
        return sorted.sort(
          (a, b) => new Date(b.completedDate) - new Date(a.completedDate)
        );
      case "oldest":
        return sorted.sort(
          (a, b) => new Date(a.completedDate) - new Date(b.completedDate)
        );
      case "featured":
        return sorted.sort((a, b) => {
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return new Date(b.completedDate) - new Date(a.completedDate);
        });
      case "popular":
        return sorted.sort(
          (a, b) => (b.stats?.stars || 0) - (a.stats?.stars || 0)
        );
      default:
        return sorted;
    }
  };

  // ============================================
  // RENDERING
  // ============================================
  const renderProjects = () => {
    const container = document.getElementById("portfolio-grid");
    const searchInput = document.getElementById("portfolio-search");
    const sorter = document.getElementById("portfolio-sorter");

    if (!container) return;

    const searchTerm = searchInput?.value || "";
    const sortType = sorter?.value || "featured";

    // Filter and sort
    filteredProjects = filterProjects(searchTerm);
    filteredProjects = sortProjects(filteredProjects, sortType);

    // Render using App.renderItems (existing utility)
    App.renderItems(
      container,
      filteredProjects,
      createProjectCard,
      `<div class="no-results">
        <i class="fas fa-folder-open"></i>
        <p>No projects found matching your search.</p>
        <button class="btn-reset" onclick="location.reload()">Clear Search</button>
      </div>`
    );

    // Update reaction counts for all projects after DOM is ready
    setTimeout(() => {
      filteredProjects.forEach((project) => {
        App.updateReactionUI(project.id);
      });
    }, 100);
  };

  // ============================================
  // EVENT LISTENERS
  // ============================================
  const setupEventListeners = (searchInput, sorter) => {
    // Search with debounce (300ms delay)
    let searchTimeout;
    searchInput?.addEventListener("input", () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(renderProjects, 300);
    });

    // Sort options
    sorter?.addEventListener("change", renderProjects);
  };

  // ============================================
  // MODAL FUNCTIONALITY
  // ============================================
  const setupModalListeners = () => {
    const modal = document.getElementById("project-modal");
    const closeBtn = document.getElementById("close-project-modal");

    // Close modal when clicking close button
    closeBtn?.addEventListener("click", () => {
      modal.classList.remove("active");
      document.body.style.overflow = ""; // Re-enable scrolling
    });

    // Close modal when clicking outside
    modal?.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.remove("active");
        document.body.style.overflow = "";
      }
    });

    // Close modal on ESC key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("active")) {
        modal.classList.remove("active");
        document.body.style.overflow = "";
      }
    });
  };

  // Use event delegation instead of attaching to individual buttons
  const setupClickDelegation = () => {
    const container = document.getElementById("portfolio-grid");

    // Event delegation on the grid container
    container?.addEventListener("click", (e) => {
      // Find the closest button with class btn-view-details
      const btn = e.target.closest(".btn-view-details");

      if (btn) {
        e.preventDefault();
        e.stopPropagation();
        const projectId = btn.getAttribute("data-project-id");
        console.log("Opening modal for project:", projectId); // Debug
        showProjectModal(projectId);
      }
    });
  };

  const showProjectModal = (projectId) => {
    const project = allProjects.find((p) => p.id === projectId);
    if (!project) return;

    const modal = document.getElementById("project-modal");
    const modalBody = document.getElementById("project-modal-body");

    // Build tech stack HTML
    const techStackHTML = project.technologies
      .map((tech) => `<div class="modal-tech-item">${tech}</div>`)
      .join("");

    // Build links HTML
    const liveLink =
      project.links.live && !project.links.live.includes("your-")
        ? `<a href="${project.links.live}" target="_blank" rel="noopener noreferrer" class="modal-link primary">
            <i class="fas fa-external-link-alt"></i> Open Live Demo
          </a>`
        : "";

    const githubLink =
      project.links.github && !project.links.github.includes("your")
        ? `<a href="${project.links.github}" target="_blank" rel="noopener noreferrer" class="modal-link secondary">
            <i class="fab fa-github"></i> View on GitHub
          </a>`
        : "";

    // Build live preview HTML
    const livePreviewHTML =
      project.links.live && !project.links.live.includes("your-")
        ? `<div class="modal-live-preview">
            <iframe src="${project.links.live}" title="${project.title} - Live Preview" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>
          </div>`
        : `<div class="modal-live-preview">
            <div class="preview-placeholder">
              <i class="fas fa-desktop"></i>
              <p>Live preview not available</p>
              <p style="font-size: 0.9em; color: var(--dark-text);">Please visit the live demo link if available</p>
            </div>
          </div>`;

    // Build image gallery HTML
    const imageGalleryHTML = project.images && project.images.length > 0
      ? `<div class="modal-image-gallery">
          <h3 class="modal-section-title">
            <i class="fas fa-images"></i>
            Project Screenshots
          </h3>
          <div class="gallery-grid">
            ${project.images.map((img, index) => `
              <div class="gallery-item">
                <img src="${img}"
                     alt="${project.title} - Screenshot ${index + 1}"
                     loading="lazy"
                     onerror="this.src='foto/logoneutrontransparan.png'">
              </div>
            `).join('')}
          </div>
        </div>`
      : '';

    // Build modal content
    modalBody.innerHTML = `
      <div class="modal-project-header">
        <h2 class="modal-project-title">
          ${project.title}
          ${
            project.featured
              ? '<span class="featured-badge"><i class="fas fa-star"></i> Featured</span>'
              : ""
          }
        </h2>
        <div class="modal-project-meta">
          <span class="modal-badge category">
            <i class="fas fa-folder"></i>
            ${project.category}
          </span>
          <span class="project-status status-${project.status
            .toLowerCase()
            .replace(/\s+/g, "-")}">
            ${project.status}
          </span>
        </div>
      </div>

      <div class="modal-description">
        ${project.fullDescription}
      </div>

      ${imageGalleryHTML}

      <div class="modal-tech-section">
        <h3 class="modal-section-title">
          <i class="fas fa-code"></i>
          Technology Stack
        </h3>
        <div class="modal-tech-grid">
          ${techStackHTML}
        </div>
      </div>

      ${
        liveLink || githubLink
          ? `<div class="modal-links">
          ${liveLink}
          ${githubLink}
        </div>`
          : ""
      }

      <div class="modal-tech-section">
        <h3 class="modal-section-title">
          <i class="fas fa-eye"></i>
          Live Preview
        </h3>
        ${livePreviewHTML}
      </div>
    `;

    // Show modal
    modal.classList.add("active");
    document.body.style.overflow = "hidden"; // Disable scrolling on body

    // Add lightbox functionality for gallery images
    setTimeout(() => {
      const galleryImages = modalBody.querySelectorAll('.gallery-item img');
      galleryImages.forEach(img => {
        img.addEventListener('click', () => {
          // Create lightbox element
          const lightbox = document.createElement('div');
          lightbox.className = 'image-lightbox active';
          lightbox.innerHTML = `
            <button class="lightbox-close">×</button>
            <img src="${img.src}" alt="${img.alt}">
          `;
          document.body.appendChild(lightbox);

          // Close lightbox on click (background or close button)
          lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox || e.target.classList.contains('lightbox-close')) {
              lightbox.remove();
            }
          });

          // Close lightbox on ESC key
          const handleEscape = (e) => {
            if (e.key === 'Escape') {
              lightbox.remove();
              document.removeEventListener('keydown', handleEscape);
            }
          };
          document.addEventListener('keydown', handleEscape);
        });
      });
    }, 100);
  };

  // ============================================
  // PUBLIC API
  // ============================================
  return {
    init,
  };
})();

// Register with App initializers
if (typeof App !== "undefined" && App.initializers) {
  App.initializers.kutipan = PortfolioApp.init;
}
