const API_KEY = 'b66d8f9190be0d85d0147fc270a75566';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

let currentLang = 'ar-SA';
let currentCategory = 'trending';

let favorites = JSON.parse(localStorage.getItem('cinema_favs')) || [];
let watchedList = JSON.parse(localStorage.getItem('cinema_watched')) || [];
let watchedEpisodes = JSON.parse(localStorage.getItem('cinema_watched_episodes')) || [];

const moviesGrid = document.getElementById('movies-grid');
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const sectionTitle = document.getElementById('section-title');
const langBtn = document.getElementById('lang-btn');

const translations = {
  'ar-SA': {
    logo: 'سينما', home: 'الرئيسية', movies: 'الأفلام', series: 'المسلسلات', favs: 'المفضلة',
    searchPlaceholder: 'ابحث عن فيلم أو مسلسل...', searchBtn: 'بحث', langBtn: 'English',
    trendingTitle: 'المقترحات والأشياء الشائعة 🔥', moviesTitle: 'أفضل الأفلام 🎬',
    seriesTitle: 'أفضل المسلسلات 📺', favsTitle: 'قائمتي المفضلة ❤️',
    searchResults: 'نتائج البحث عن: ', noResults: 'لم يتم العثور على نتائج 🔍', noFavs: 'لا توجد عناصر في المفضلة بعد 💔'
  },
  'en-US': {
    logo: 'Cinema', home: 'Home', movies: 'Movies', series: 'TV Series', favs: 'Favorites',
    searchPlaceholder: 'Search movie or show...', searchBtn: 'Search', langBtn: 'العربية',
    trendingTitle: 'Trending & Recommended 🔥', moviesTitle: 'Popular Movies 🎬',
    seriesTitle: 'Popular TV Series 📺', favsTitle: 'My Favorites ❤️',
    searchResults: 'Search results for: ', noResults: 'No results found 🔍', noFavs: 'No favorites added yet 💔'
  }
};

// ==========================================
// 1️⃣ حفظ البيانات محلياً + السحابياً
// ==========================================
async function saveData() {
  localStorage.setItem('cinema_favs', JSON.stringify(favorites));
  localStorage.setItem('cinema_watched', JSON.stringify(watchedList));
  localStorage.setItem('cinema_watched_episodes', JSON.stringify(watchedEpisodes));

  if (window.currentUser && window.db) {
    try {
      const userDocRef = window.doc(window.db, "users", window.currentUser.uid);
      await window.setDoc(userDocRef, {
        favorites: favorites,
        watchedList: watchedList,
        watchedEpisodes: watchedEpisodes,
        lastUpdated: new Date()
      }, { merge: true });
    } catch (error) {
      console.error("خطأ بالحفظ السحابي:", error);
    }
  }
}

window.syncUserDataFromCloud = async function() {
  if (window.currentUser && window.db) {
    try {
      const userDocRef = window.doc(window.db, "users", window.currentUser.uid);
      const docSnap = await window.getDoc(userDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        favorites = data.favorites || [];
        watchedList = data.watchedList || [];
        watchedEpisodes = data.watchedEpisodes || [];
        saveData();
        if (currentCategory === 'favorites') displayFavorites();
      }
    } catch (error) {
      console.error("خطأ بجلب البيانات السحابية:", error);
    }
  }
};

// ==========================================
// 2️⃣ جلب وعرض المحتوى
// ==========================================
function getEndpoint(category, page = 1) {
  if (category === 'movies') return `${BASE_URL}/movie/popular?api_key=${API_KEY}&language=${currentLang}&page=${page}`;
  if (category === 'series') return `${BASE_URL}/tv/popular?api_key=${API_KEY}&language=${currentLang}&page=${page}`;
  return `${BASE_URL}/trending/all/day?api_key=${API_KEY}&language=${currentLang}&page=${page}`;
}

async function fetchMultiplePages(category) {
  moviesGrid.innerHTML = `<div class="col-12 text-center my-5"><div class="spinner-border text-info" role="status"></div></div>`;
  try {
    const [d1, d2, d3] = await Promise.all([
      fetch(getEndpoint(category, 1)).then(r => r.json()),
      fetch(getEndpoint(category, 2)).then(r => r.json()),
      fetch(getEndpoint(category, 3)).then(r => r.json())
    ]);
    const results = [...(d1.results || []), ...(d2.results || []), ...(d3.results || [])];
    results.length > 0 ? displayItems(results) : moviesGrid.innerHTML = `<div class="col-12 text-center text-muted my-5"><h3>${translations[currentLang].noResults}</h3></div>`;
  } catch (err) {
    console.error(err);
  }
}

function displayItems(items) {
  moviesGrid.innerHTML = '';
  items.forEach((item) => {
    const title = item.title || item.name;
    const date = item.release_date || item.first_air_date || 'N/A';
    const isFav = favorites.some(f => f.id === item.id);
    const isWatched = watchedList.includes(item.id);
    const poster = item.poster_path ? `${IMAGE_BASE_URL}${item.poster_path}` : 'https://placehold.co/500x750/1e293b/ffffff?text=No+Image';

    const card = document.createElement('div');
    card.className = 'col-12 col-sm-6 col-md-4 col-lg-3 mb-4';
    card.innerHTML = `
      <div class="movie-card h-100 d-flex flex-column">
        <div class="position-relative">
          <img src="${poster}" alt="${title}" class="movie-poster" loading="lazy">
          
          <button class="fav-btn ${isFav ? 'active' : ''}">
            <i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
          </button>

          <button class="watched-card-btn ${isWatched ? 'active' : ''}">
            <i class="fa-solid fa-eye"></i>
          </button>

          <span class="rating-badge"><i class="fa-solid fa-star me-1"></i>${item.vote_average ? item.vote_average.toFixed(1) : 'N/A'}</span>
        </div>
        <div class="p-3 d-flex flex-column flex-grow-1 justify-content-between">
          <h6 class="fw-bold mb-2 text-white text-truncate">${title}</h6>
          <small class="text-secondary"><i class="fa-regular fa-calendar me-1"></i>${date}</small>
        </div>
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (!e.target.closest('.fav-btn') && !e.target.closest('.watched-card-btn')) {
        openMovieDetails(item.id, item.media_type || (item.title ? 'movie' : 'tv'));
      }
    });

    card.querySelector('.fav-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(item, e.currentTarget);
    });

    card.querySelector('.watched-card-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleWatchedMovie(item.id, e.currentTarget);
    });

    moviesGrid.appendChild(card);
  });
}

function toggleWatchedMovie(itemId, btn) {
  const idx = watchedList.indexOf(itemId);
  if (idx > -1) {
    watchedList.splice(idx, 1);
    btn.classList.remove('active');
  } else {
    watchedList.push(itemId);
    btn.classList.add('active');
  }
  saveData();
}

// ==========================================
// 3️⃣ تفاصيل المودال، الترايلر والحلقات
// ==========================================
async function openMovieDetails(itemId, mediaType = 'movie') {
  const modalElement = document.getElementById('movieDetailModal');
  const modal = new bootstrap.Modal(modalElement);
  
  document.getElementById('modalTitle').textContent = 'جاري التحميل...';
  document.getElementById('modalOverview').textContent = '';
  document.getElementById('trailerContainer').classList.add('d-none');
  document.getElementById('trailerIframe').src = '';
  document.getElementById('castContainer').innerHTML = '';

  const epTab = document.getElementById('episodes-tab-li');

  new bootstrap.Tab(document.getElementById('info-tab')).show();
  modal.show();

  try {
    // 1. جلب بيانات الفيلم/المسلسل
    const res = await fetch(`${BASE_URL}/${mediaType}/${itemId}?api_key=${API_KEY}&language=${currentLang}`);
    const data = await res.json();

    document.getElementById('modalTitle').textContent = data.title || data.name;
    document.getElementById('modalOverview').textContent = data.overview || 'لا يوجد ملخص متوفر.';

    if (mediaType === 'movie') {
      if (epTab) epTab.classList.add('d-none');
    } else {
      if (epTab) epTab.classList.remove('d-none');
      setupSeasons(data.seasons || [], itemId);
    }

    // 2. جلب الفيديو الإعلاني (Trailer)
    const vRes = await fetch(`${BASE_URL}/${mediaType}/${itemId}/videos?api_key=${API_KEY}&language=en-US`);
    const vData = await vRes.json();
    const trailer = (vData.results || []).find(v => v.site === 'YouTube' && (v.type.toLowerCase() === 'trailer' || v.type.toLowerCase() === 'teaser'));
    
    if (trailer) {
      document.getElementById('trailerIframe').src = `https://www.youtube.com/embed/${trailer.key}`;
      document.getElementById('trailerContainer').classList.remove('d-none');
    }

    // 3. جلب طاقم التمثيل
    const cRes = await fetch(`${BASE_URL}/${mediaType}/${itemId}/credits?api_key=${API_KEY}&language=${currentLang}`);
    const cData = await cRes.json();
    const castContainer = document.getElementById('castContainer');
    (cData.cast || []).slice(0, 8).forEach(actor => {
      const img = actor.profile_path ? `${IMAGE_BASE_URL}${actor.profile_path}` : 'https://placehold.co/100x100/1e293b/ffffff?text=User';
      castContainer.innerHTML += `
        <div class="actor-card text-center">
          <img src="${img}" class="actor-img mb-1">
          <div class="small fw-bold text-truncate text-white" style="font-size: 11px;">${actor.name}</div>
        </div>
      `;
    });

  } catch (e) {
    console.error("خطأ في جلب التفاصيل:", e);
  }
}

function setupSeasons(seasons, tvId) {
  const select = document.getElementById('seasonSelect');
  if (!select) return;
  select.innerHTML = '';
  const validSeasons = seasons.filter(s => s.season_number > 0);
  
  validSeasons.forEach(s => {
    select.innerHTML += `<option value="${s.season_number}">${s.name} (${s.episode_count} حلقة)</option>`;
  });

  if (validSeasons.length > 0) fetchEpisodes(tvId, validSeasons[0].season_number);
  select.onchange = (e) => fetchEpisodes(tvId, e.target.value);
}

async function fetchEpisodes(tvId, seasonNum) {
  const container = document.getElementById('episodesContainer');
  if (!container) return;
  container.innerHTML = `<div class="col-12 text-center py-4"><div class="spinner-border text-info spinner-border-sm"></div></div>`;

  try {
    const res = await fetch(`${BASE_URL}/tv/${tvId}/season/${seasonNum}?api_key=${API_KEY}&language=${currentLang}`);
    const data = await res.json();
    container.innerHTML = '';

    (data.episodes || []).forEach(ep => {
      const epKey = `${tvId}_S${seasonNum}_E${ep.episode_number}`;
      const isWatched = watchedEpisodes.includes(epKey);
      const img = ep.still_path ? `${IMAGE_BASE_URL}${ep.still_path}` : 'https://placehold.co/300x170/1e293b/ffffff?text=No+Image';

      const epCol = document.createElement('div');
      epCol.className = 'col-12 col-md-6 mb-2';
      epCol.innerHTML = `
        <div class="card bg-dark border-secondary h-100 overflow-hidden">
          <div class="position-relative">
            <img src="${img}" class="card-img-top" style="height: 120px; object-fit: cover;">
            <button class="btn btn-sm ${isWatched ? 'btn-success' : 'btn-dark opacity-75'} position-absolute top-0 end-0 m-2 btn-ep-watch">
              <i class="fa-solid ${isWatched ? 'fa-check-double' : 'fa-check'}"></i>
            </button>
          </div>
          <div class="card-body p-2 d-flex flex-column justify-content-between">
            <div>
              <span class="badge bg-info text-dark">حلقة ${ep.episode_number}</span>
              <h6 class="card-title text-white fw-bold my-1 small text-truncate">${ep.name}</h6>
            </div>
          </div>
        </div>
      `;

      epCol.querySelector('.btn-ep-watch').addEventListener('click', (e) => {
        toggleWatchedEp(epKey, e.currentTarget);
      });

      container.appendChild(epCol);
    });
  } catch (e) {
    console.error("خطأ في جلب الحلقات:", e);
  }
}

function toggleWatchedEp(epKey, btn) {
  const idx = watchedEpisodes.indexOf(epKey);
  if (idx > -1) {
    watchedEpisodes.splice(idx, 1);
    btn.className = 'btn btn-sm btn-dark opacity-75 position-absolute top-0 end-0 m-2 btn-ep-watch';
    btn.innerHTML = '<i class="fa-solid fa-check"></i>';
  } else {
    watchedEpisodes.push(epKey);
    btn.className = 'btn btn-sm btn-success position-absolute top-0 end-0 m-2 btn-ep-watch';
    btn.innerHTML = '<i class="fa-solid fa-check-double"></i>';
  }
  saveData();
}

// ==========================================
// 4️⃣ المفضلة والتنقل والبحث
// ==========================================
function toggleFavorite(item, btn) {
  const idx = favorites.findIndex(f => f.id === item.id);
  if (idx > -1) {
    favorites.splice(idx, 1);
    btn.classList.remove('active');
    btn.querySelector('i').className = 'fa-regular fa-heart';
    if (currentCategory === 'favorites') displayFavorites();
  } else {
    favorites.push({
      id: item.id, title: item.title || item.name, poster_path: item.poster_path,
      release_date: item.release_date || item.first_air_date, vote_average: item.vote_average
    });
    btn.classList.add('active');
    btn.querySelector('i').className = 'fa-solid fa-heart';
  }
  saveData();
}

function displayFavorites() {
  favorites.length === 0 
    ? moviesGrid.innerHTML = `<div class="col-12 text-center text-muted my-5"><h3>${translations[currentLang].noFavs}</h3></div>`
    : displayItems(favorites);
}

function loadCategory(category) {
  currentCategory = category;
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  
  if (category === 'trending') document.getElementById('nav-home')?.classList.add('active');
  if (category === 'movies') document.getElementById('nav-movies')?.classList.add('active');
  if (category === 'series') document.getElementById('nav-series')?.classList.add('active');
  if (category === 'favorites') document.getElementById('nav-favs')?.classList.add('active');

  const t = translations[currentLang];
  sectionTitle.textContent = t[`${category}Title`] || t.trendingTitle;

  category === 'favorites' ? displayFavorites() : fetchMultiplePages(category);
}

window.loadCategory = loadCategory;

function toggleLanguage() {
  currentLang = currentLang === 'ar-SA' ? 'en-US' : 'ar-SA';
  document.getElementById('html-tag').setAttribute('dir', currentLang === 'en-US' ? 'ltr' : 'rtl');
  document.getElementById('bootstrap-link').href = currentLang === 'en-US' 
    ? 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css'
    : 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.rtl.min.css';

  const t = translations[currentLang];
  document.getElementById('logo-text').textContent = t.logo;
  document.getElementById('nav-home').textContent = t.home;
  document.getElementById('nav-movies').textContent = t.movies;
  document.getElementById('nav-series').textContent = t.series;
  document.getElementById('nav-fav-text').textContent = t.favs;
  searchInput.placeholder = t.searchPlaceholder;
  document.getElementById('btn-search').textContent = t.searchBtn;
  langBtn.textContent = t.langBtn;

  loadCategory(currentCategory);
}

window.toggleLanguage = toggleLanguage;

searchForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const q = searchInput.value.trim();
  if (q) {
    sectionTitle.textContent = `${translations[currentLang].searchResults} "${q}"`;
    moviesGrid.innerHTML = `<div class="col-12 text-center my-5"><div class="spinner-border text-info"></div></div>`;
    try {
      const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&language=${currentLang}&query=${encodeURIComponent(q)}`);
      const data = await res.json();
      displayItems((data.results || []).filter(i => i.media_type === 'movie' || i.media_type === 'tv'));
    } catch (e) { console.error(e); }
    searchInput.value = '';
  }
});

// ==========================================
// 5️⃣ تنظيف خلفية الـ Modal
// ==========================================
function clearModalBackdrop() {
  document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
  document.body.classList.remove('modal-open');
  document.body.style.overflow = 'auto';
  document.body.style.paddingRight = '0px';
}

document.getElementById('movieDetailModal').addEventListener('hidden.bs.modal', () => {
  document.getElementById('trailerIframe').src = '';
  clearModalBackdrop();
});

loadCategory('trending');