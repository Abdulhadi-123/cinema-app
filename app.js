const API_KEY = 'b66d8f9190be0d85d0147fc270a75566';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

let currentLang = 'ar-SA';
let currentCategory = 'trending';
let currentMediaItem = null;

let favorites = JSON.parse(localStorage.getItem('cinema_favs')) || [];

const moviesGrid = document.getElementById('movies-grid');
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const sectionTitle = document.getElementById('section-title');
const langBtn = document.getElementById('lang-btn');

const translations = {
  'ar-SA': {
    logo: 'سينما',
    home: 'الرئيسية',
    movies: 'الأفلام',
    series: 'المسلسلات',
    favs: 'المفضلة',
    searchPlaceholder: 'ابحث عن فيلم أو مسلسل...',
    searchBtn: 'بحث',
    langBtn: 'English',
    trendingTitle: 'المقترحات والأشياء الشائعة 🔥',
    moviesTitle: 'أفضل الأفلام 🎬',
    seriesTitle: 'أفضل المسلسلات 📺',
    favsTitle: 'قائمتي المفضلة ❤️',
    searchResults: 'نتائج البحث عن: ',
    noResults: 'لم يتم العثور على نتائج 🔍',
    noFavs: 'لا توجد عناصر في المفضلة بعد 💔'
  },
  'en-US': {
    logo: 'Cinema',
    home: 'Home',
    movies: 'Movies',
    series: 'TV Series',
    favs: 'Favorites',
    searchPlaceholder: 'Search movie or show...',
    searchBtn: 'Search',
    langBtn: 'العربية',
    trendingTitle: 'Trending & Recommended 🔥',
    moviesTitle: 'Popular Movies 🎬',
    seriesTitle: 'Popular TV Series 📺',
    favsTitle: 'My Favorites ❤️',
    searchResults: 'Search results for: ',
    noResults: 'No results found 🔍',
    noFavs: 'No favorites added yet 💔'
  }
};

// ==========================================
// ☁️ دوال التعامل مع السحابة (Firebase Firestore)
// ==========================================

async function saveFavorites() {
  localStorage.setItem('cinema_favs', JSON.stringify(favorites));

  if (window.currentUser && window.db && window.doc && window.setDoc) {
    try {
      const userDocRef = window.doc(window.db, "users", window.currentUser.uid);
      await window.setDoc(userDocRef, { favorites: favorites }, { merge: true });
    } catch (error) {
      console.error("خطأ في حفظ المفضلة بالسحابة:", error);
    }
  }
}

async function syncFavoritesFromCloud() {
  if (window.currentUser && window.db && window.doc && window.getDoc) {
    try {
      const userDocRef = window.doc(window.db, "users", window.currentUser.uid);
      const docSnap = await window.getDoc(userDocRef);

      if (docSnap.exists() && docSnap.data().favorites) {
        const cloudFavs = docSnap.data().favorites || [];
        
        const mergedFavs = [...cloudFavs];
        favorites.forEach(localItem => {
          if (!mergedFavs.some(cloudItem => cloudItem.id === localItem.id)) {
            mergedFavs.push(localItem);
          }
        });

        favorites = mergedFavs;
        saveFavorites();
      } else if (favorites.length > 0) {
        saveFavorites();
      }

      if (currentCategory === 'favorites') {
        displayFavorites();
      } else {
        loadCategory(currentCategory);
      }
    } catch (error) {
      console.error("خطأ في جلب البيانات من السحابة:", error);
    }
  }
}

function loadLocalFavorites() {
  favorites = JSON.parse(localStorage.getItem('cinema_favs')) || [];
  if (currentCategory === 'favorites') {
    displayFavorites();
  } else {
    loadCategory(currentCategory);
  }
}

window.syncFavoritesFromCloud = syncFavoritesFromCloud;
window.loadLocalFavorites = loadLocalFavorites;

// ==========================================
// 🎬 دوال عرض الأفلام والبيانات
// ==========================================

function getEndpoint(category, page = 1) {
  if (category === 'movies') {
    return `${BASE_URL}/movie/popular?api_key=${API_KEY}&language=${currentLang}&page=${page}`;
  } else if (category === 'series') {
    return `${BASE_URL}/tv/popular?api_key=${API_KEY}&language=${currentLang}&page=${page}`;
  } else {
    return `${BASE_URL}/trending/all/day?api_key=${API_KEY}&language=${currentLang}&page=${page}`;
  }
}

async function fetchMultiplePages(category) {
  moviesGrid.innerHTML = `<div class="col-12 text-center my-5"><div class="spinner-border text-info" role="status"></div></div>`;
  
  try {
    const page1 = fetch(getEndpoint(category, 1)).then(res => res.json());
    const page2 = fetch(getEndpoint(category, 2)).then(res => res.json());
    const page3 = fetch(getEndpoint(category, 3)).then(res => res.json());

    const [data1, data2, data3] = await Promise.all([page1, page2, page3]);
    
    const combinedResults = [
      ...(data1.results || []),
      ...(data2.results || []),
      ...(data3.results || [])
    ];

    if (combinedResults.length > 0) {
      displayItems(combinedResults);
    } else {
      moviesGrid.innerHTML = `<div class="col-12 text-center text-muted my-5"><h3>${translations[currentLang].noResults}</h3></div>`;
    }
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

function displayItems(items) {
  moviesGrid.innerHTML = '';

  items.forEach((item) => {
    const title = item.title || item.name;
    const releaseDate = item.release_date || item.first_air_date || 'N/A';
    const isFav = favorites.some(f => f.id === item.id);
    
    let poster = 'https://placehold.co/500x750/1e293b/ffffff?text=No+Image';
    if (item.poster_path) {
      const cleanPath = item.poster_path.startsWith('/') ? item.poster_path : `/${item.poster_path}`;
      poster = `${IMAGE_BASE_URL}${cleanPath}`;
    }

    const card = document.createElement('div');
    card.classList.add('col-12', 'col-sm-6', 'col-md-4', 'col-lg-3', 'mb-4');

    card.innerHTML = `
      <div class="movie-card h-100 d-flex flex-column">
        <div class="position-relative">
          <img src="${poster}" 
               alt="${title}" 
               class="movie-poster" 
               loading="lazy"
               referrerpolicy="no-referrer"
               onerror="this.onerror=null; this.src='https://placehold.co/500x750/1e293b/ffffff?text=No+Image';">
          
          <button class="fav-btn ${isFav ? 'active' : ''}" aria-label="Favorite">
            <i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
          </button>

          <span class="rating-badge">
            <i class="fa-solid fa-star me-1"></i>${item.vote_average ? item.vote_average.toFixed(1) : 'N/A'}
          </span>
        </div>
        <div class="p-3 d-flex flex-column flex-grow-1 justify-content-between">
          <h6 class="fw-bold mb-2 text-white text-truncate">${title}</h6>
          <small class="text-secondary"><i class="fa-regular fa-calendar me-1"></i>${releaseDate}</small>
        </div>
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (!e.target.closest('.fav-btn')) {
        const mediaType = item.media_type || (item.title ? 'movie' : 'tv');
        openMovieDetails(item.id, mediaType);
      }
    });

    const favBtn = card.querySelector('.fav-btn');
    favBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(item, favBtn);
    });

    moviesGrid.appendChild(card);
  });
}

// ==========================================
// 📺 تفاصيل العمل والحلقات والتعليقات
// ==========================================

async function openMovieDetails(itemId, mediaType = 'movie') {
  currentMediaItem = { id: itemId, mediaType: mediaType };
  
  const modalElement = document.getElementById('movieDetailModal');
  const modal = new bootstrap.Modal(modalElement);
  const modalTitle = document.getElementById('modalTitle');
  const modalOverview = document.getElementById('modalOverview');
  const trailerContainer = document.getElementById('trailerContainer');
  const trailerIframe = document.getElementById('trailerIframe');
  const castContainer = document.getElementById('castContainer');
  const episodesTabLi = document.getElementById('episodes-tab-li');

  // إعادة ضبط التبويب للقصة تلقائياً
  const infoTab = new bootstrap.Tab(document.getElementById('info-tab'));
  infoTab.show();

  const oldBtn = document.getElementById('direct-yt-btn');
  if (oldBtn) oldBtn.remove();

  trailerContainer.classList.add('d-none');
  trailerIframe.src = '';
  castContainer.innerHTML = '<span class="text-secondary small">جاري التحميل...</span>';

  modal.show();

  try {
    const detailRes = await fetch(`${BASE_URL}/${mediaType}/${itemId}?api_key=${API_KEY}&language=${currentLang}`);
    const detailData = await detailRes.json();
    
    modalTitle.textContent = detailData.title || detailData.name;
    modalOverview.textContent = detailData.overview || 'لا يوجد ملخص متوفر.';

    // إظهار وإدارة التبويب الخاص بالحلقات إن كان العمل مسلسلاً
    if (mediaType === 'tv') {
      episodesTabLi.classList.remove('d-none');
      setupSeasonsDropdown(detailData.seasons || [], itemId);
    } else {
      episodesTabLi.classList.add('d-none');
    }

    // جلب التريلر
    let videoRes = await fetch(`${BASE_URL}/${mediaType}/${itemId}/videos?api_key=${API_KEY}&language=en-US`);
    let videoData = await videoRes.json();
    let trailers = videoData.results ? videoData.results.filter(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')) : [];

    if (trailers.length === 0 && currentLang !== 'en-US') {
      videoRes = await fetch(`${BASE_URL}/${mediaType}/${itemId}/videos?api_key=${API_KEY}&language=${currentLang}`);
      videoData = await videoRes.json();
      trailers = videoData.results ? videoData.results.filter(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')) : [];
    }

    if (trailers.length > 0) {
      const selectedTrailer = trailers[0];
      const ytLink = `https://www.youtube.com/watch?v=${selectedTrailer.key}`;

      trailerIframe.src = `https://www.youtube.com/embed/${selectedTrailer.key}?autoplay=0&rel=0`;
      trailerContainer.classList.remove('d-none');

      const ytBtnHtml = `
        <div id="direct-yt-btn" class="mb-3 text-center">
          <a href="${ytLink}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline-danger px-3 py-2 rounded-pill">
            <i class="fa-brands fa-youtube me-2"></i> مشاهدة الإعلان على YouTube
          </a>
        </div>
      `;
      trailerContainer.insertAdjacentHTML('afterend', ytBtnHtml);
    }

    // جلب طاقم التمثيل
    const creditsRes = await fetch(`${BASE_URL}/${mediaType}/${itemId}/credits?api_key=${API_KEY}&language=${currentLang}`);
    const creditsData = await creditsRes.json();

    castContainer.innerHTML = '';
    const topCast = creditsData.cast ? creditsData.cast.slice(0, 6) : [];

    if (topCast.length > 0) {
      topCast.forEach(actor => {
        const actorImg = actor.profile_path 
          ? `${IMAGE_BASE_URL}${actor.profile_path}`
          : 'https://placehold.co/100x100/1e293b/ffffff?text=User';

        castContainer.innerHTML += `
          <div class="actor-card text-center">
            <img src="${actorImg}" class="actor-img mb-1" alt="${actor.name}">
            <div class="small fw-bold text-truncate text-white" style="font-size: 11px;">${actor.name}</div>
            <div class="text-muted text-truncate" style="font-size: 10px;">${actor.character || ''}</div>
          </div>
        `;
      });
    } else {
      castContainer.innerHTML = '<span class="text-secondary small">لا يتوفر معلومات عن الممثلين.</span>';
    }

    // جلب التعليقات للفيلم / المسلسل
    loadComments(itemId);

  } catch (error) {
    console.error("Error fetching details:", error);
  }
}

// دالة المواسم
function setupSeasonsDropdown(seasons, tvId) {
  const seasonSelect = document.getElementById('seasonSelect');
  seasonSelect.innerHTML = '';

  const validSeasons = seasons.filter(s => s.season_number > 0);

  validSeasons.forEach(s => {
    const option = document.createElement('option');
    option.value = s.season_number;
    option.textContent = `${s.name} (${s.episode_count} الحلقة)`;
    seasonSelect.appendChild(option);
  });

  if (validSeasons.length > 0) {
    fetchEpisodes(tvId, validSeasons[0].season_number);
  }

  seasonSelect.onchange = (e) => {
    fetchEpisodes(tvId, e.target.value);
  };
}

// دالة جلب الحلقات
async function fetchEpisodes(tvId, seasonNumber) {
  const episodesContainer = document.getElementById('episodesContainer');
  episodesContainer.innerHTML = `<div class="col-12 text-center py-4"><div class="spinner-border text-info spinner-border-sm"></div></div>`;

  try {
    const res = await fetch(`${BASE_URL}/tv/${tvId}/season/${seasonNumber}?api_key=${API_KEY}&language=${currentLang}`);
    const data = await res.json();

    episodesContainer.innerHTML = '';
    if (data.episodes && data.episodes.length > 0) {
      data.episodes.forEach(ep => {
        let epImg = ep.still_path 
          ? `${IMAGE_BASE_URL}${ep.still_path}`
          : 'https://placehold.co/300x170/1e293b/ffffff?text=No+Image';

        episodesContainer.innerHTML += `
          <div class="col-12 col-md-6">
            <div class="card bg-dark border-secondary h-100 overflow-hidden">
              <img src="${epImg}" class="card-img-top" style="height: 140px; object-fit: cover;">
              <div class="card-body p-2">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <span class="badge bg-info text-dark">حلقة ${ep.episode_number}</span>
                  <small class="text-warning fw-bold"><i class="fa-solid fa-star me-1"></i>${ep.vote_average ? ep.vote_average.toFixed(1) : 'N/A'}</small>
                </div>
                <h6 class="card-title text-white fw-bold mb-1 small text-truncate">${ep.name}</h6>
                <p class="card-text text-secondary text-truncate" style="font-size: 11px;">${ep.overview || 'لا يوجد وصف للحلقة.'}</p>
              </div>
            </div>
          </div>
        `;
      });
    } else {
      episodesContainer.innerHTML = `<div class="col-12 text-center text-muted py-3">لا توجد معلومات عن الحلقات</div>`;
    }
  } catch (err) {
    console.error(err);
  }
}

// ==========================================
// 💬 نظام التقييم والتعليقات (Firestore)
// ==========================================

async function loadComments(itemId) {
  const commentsList = document.getElementById('commentsList');
  commentsList.innerHTML = '<span class="text-secondary small">جاري تحميل التعليقات...</span>';

  if (!window.db || !window.doc || !window.getDoc) {
    commentsList.innerHTML = '<span class="text-secondary small">يتطلب الاتصال بـ Firebase لعرض التعليقات.</span>';
    return;
  }

  try {
    const docRef = window.doc(window.db, "media_reviews", String(itemId));
    const docSnap = await window.getDoc(docRef);

    if (docSnap.exists() && docSnap.data().reviews && docSnap.data().reviews.length > 0) {
      commentsList.innerHTML = '';
      const reviews = docSnap.data().reviews;

      reviews.forEach(r => {
        commentsList.innerHTML += `
          <div class="p-2 rounded bg-dark border border-secondary">
            <div class="d-flex align-items-center justify-content-between mb-1">
              <div class="d-flex align-items-center gap-2">
                <img src="${r.photoURL || 'https://placehold.co/30x30/1e293b/ffffff?text=U'}" class="rounded-circle" style="width: 24px; height: 24px; object-fit: cover;">
                <span class="fw-bold small text-light">${r.userName}</span>
              </div>
              <span class="badge bg-warning text-dark">⭐️ ${r.rating}/10</span>
            </div>
            <p class="mb-0 text-secondary small ps-4">${r.comment}</p>
          </div>
        `;
      });
    } else {
      commentsList.innerHTML = '<span class="text-secondary small">لا توجد تعليقات بعد، كن أول من يضيف رأيه! 🚀</span>';
    }
  } catch (err) {
    console.error("خطأ جلب التعليقات:", err);
    commentsList.innerHTML = '<span class="text-secondary small">حدث خطأ أثناء جلب التعليقات.</span>';
  }
}

document.getElementById('submitReviewBtn').addEventListener('click', async () => {
  if (!window.currentUser) {
    alert("عذراً، يجب عليك تسجيل الدخول أولاً لإضافة تقييم ورأي!");
    return;
  }

  const commentText = document.getElementById('userCommentInput').value.trim();
  const ratingVal = document.getElementById('userRatingInput').value;

  if (!commentText) {
    alert("يرجى كتابة تعليق قبل الإرسال.");
    return;
  }

  if (!currentMediaItem) return;

  const newReview = {
    userId: window.currentUser.uid,
    userName: window.currentUser.displayName || 'مستخدم',
    photoURL: window.currentUser.photoURL || '',
    rating: ratingVal,
    comment: commentText,
    createdAt: new Date().toISOString()
  };

  try {
    const docRef = window.doc(window.db, "media_reviews", String(currentMediaItem.id));
    const docSnap = await window.getDoc(docRef);
    let existingReviews = [];

    if (docSnap.exists() && docSnap.data().reviews) {
      existingReviews = docSnap.data().reviews;
    }

    existingReviews.unshift(newReview);

    await window.setDoc(docRef, { reviews: existingReviews }, { merge: true });

    document.getElementById('userCommentInput').value = '';
    loadComments(currentMediaItem.id);
  } catch (err) {
    console.error("خطأ إضافة التقييم:", err);
    alert("حدث خطأ أثناء حفظ تقييمك.");
  }
});

document.getElementById('movieDetailModal').addEventListener('hidden.bs.modal', function () {
  document.getElementById('trailerIframe').src = '';
  const oldBtn = document.getElementById('direct-yt-btn');
  if (oldBtn) oldBtn.remove();
});

// ==========================================
// ❤️ المفضلة والتنقل والبحث
// ==========================================

function toggleFavorite(item, btnElement) {
  const index = favorites.findIndex(f => f.id === item.id);
  const icon = btnElement.querySelector('i');

  if (index > -1) {
    favorites.splice(index, 1);
    btnElement.classList.remove('active');
    icon.className = 'fa-regular fa-heart';

    if (currentCategory === 'favorites') {
      const cardContainer = btnElement.closest('.col-12');
      cardContainer.style.transition = 'all 0.3s ease';
      cardContainer.style.opacity = '0';
      cardContainer.style.transform = 'scale(0.8)';
      setTimeout(() => {
        cardContainer.remove();
        if (favorites.length === 0) displayFavorites();
      }, 300);
    }
  } else {
    favorites.push({
      id: item.id,
      title: item.title || item.name,
      poster_path: item.poster_path,
      release_date: item.release_date || item.first_air_date,
      vote_average: item.vote_average,
      media_type: item.title ? 'movie' : 'tv'
    });
    btnElement.classList.add('active');
    icon.className = 'fa-solid fa-heart';
  }

  saveFavorites();
}

function displayFavorites() {
  if (favorites.length === 0) {
    moviesGrid.innerHTML = `<div class="col-12 text-center text-muted my-5"><h3>${translations[currentLang].noFavs}</h3></div>`;
  } else {
    displayItems(favorites);
  }
}

function loadCategory(category) {
  currentCategory = category;

  const navbarCollapse = document.getElementById('navbarNav');
  if (navbarCollapse && navbarCollapse.classList.contains('show')) {
    const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse);
    if (bsCollapse) bsCollapse.hide();
  }

  document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
  
  const navHome = document.getElementById('nav-home');
  const navMovies = document.getElementById('nav-movies');
  const navSeries = document.getElementById('nav-series');
  const navFavs = document.getElementById('nav-favs');

  if (category === 'trending' && navHome) navHome.classList.add('active');
  if (category === 'movies' && navMovies) navMovies.classList.add('active');
  if (category === 'series' && navSeries) navSeries.classList.add('active');
  if (category === 'favorites' && navFavs) navFavs.classList.add('active');

  const t = translations[currentLang];
  if (category === 'trending') sectionTitle.textContent = t.trendingTitle;
  if (category === 'movies') sectionTitle.textContent = t.moviesTitle;
  if (category === 'series') sectionTitle.textContent = t.seriesTitle;
  if (category === 'favorites') sectionTitle.textContent = t.favsTitle;

  if (category === 'favorites') {
    displayFavorites();
  } else {
    fetchMultiplePages(category);
  }
}

function toggleLanguage() {
  currentLang = currentLang === 'ar-SA' ? 'en-US' : 'ar-SA';
  
  const htmlTag = document.getElementById('html-tag');
  const bootstrapLink = document.getElementById('bootstrap-link');
  
  if (currentLang === 'en-US') {
    htmlTag.setAttribute('dir', 'ltr');
    htmlTag.setAttribute('lang', 'en');
    bootstrapLink.href = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css';
  } else {
    htmlTag.setAttribute('dir', 'rtl');
    htmlTag.setAttribute('lang', 'ar');
    bootstrapLink.href = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.rtl.min.css';
  }

  const t = translations[currentLang];
  document.getElementById('logo-text').textContent = t.logo;
  document.getElementById('nav-home').textContent = t.home;
  document.getElementById('nav-movies').textContent = t.movies;
  document.getElementById('nav-series').textContent = t.series;
  
  const favText = document.getElementById('nav-fav-text');
  if (favText) favText.textContent = t.favs;

  searchInput.placeholder = t.searchPlaceholder;
  document.getElementById('btn-search').textContent = t.searchBtn;
  langBtn.textContent = t.langBtn;

  loadCategory(currentCategory);
}

searchForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const query = searchInput.value.trim();
  const t = translations[currentLang];

  if (query) {
    const searchUrl = `${BASE_URL}/search/multi?api_key=${API_KEY}&language=${currentLang}&query=${encodeURIComponent(query)}`;
    sectionTitle.textContent = `${t.searchResults} "${query}"`;
    
    try {
      moviesGrid.innerHTML = `<div class="col-12 text-center my-5"><div class="spinner-border text-info" role="status"></div></div>`;
      const res = await fetch(searchUrl);
      const data = await res.json();
      
      const filteredResults = (data.results || []).filter(item => item.media_type === 'movie' || item.media_type === 'tv');
      
      if (filteredResults.length > 0) {
        displayItems(filteredResults);
      } else {
        moviesGrid.innerHTML = `<div class="col-12 text-center text-muted my-5"><h3>${t.noResults}</h3></div>`;
      }
    } catch (err) {
      console.error(err);
    }
    
    searchInput.value = '';
  }
});

loadCategory('trending');