const API_KEY = 'b66d8f9190be0d85d0147fc270a75566';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

let currentLang = 'ar-SA';
let currentCategory = 'trending';

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

// دالة فتح النافذة والتأكد من دعم التضمين
async function openMovieDetails(itemId, mediaType = 'movie') {
  const modalElement = document.getElementById('movieDetailModal');
  const modal = new bootstrap.Modal(modalElement);
  const modalTitle = document.getElementById('modalTitle');
  const modalOverview = document.getElementById('modalOverview');
  const trailerContainer = document.getElementById('trailerContainer');
  const trailerIframe = document.getElementById('trailerIframe');
  const castContainer = document.getElementById('castContainer');

  // تنظيف أي أزرار سابقة
  const oldBtn = document.getElementById('direct-yt-btn');
  if (oldBtn) oldBtn.remove();

  trailerContainer.classList.add('d-none');
  trailerIframe.src = '';
  castContainer.innerHTML = '<span class="text-secondary small">جاري التحميل...</span>';

  modal.show();

  try {
    // 1. جلب القصة والتفاصيل
    const detailRes = await fetch(`${BASE_URL}/${mediaType}/${itemId}?api_key=${API_KEY}&language=${currentLang}`);
    const detailData = await detailRes.json();
    
    modalTitle.textContent = detailData.title || detailData.name;
    modalOverview.textContent = detailData.overview || 'لا يوجد ملخص متوفر.';

    // 2. جلب الفيديوهات
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

      // إضافة مشغل الفيديو وتضمين معالم التشغيل المباشر
      trailerIframe.src = `https://www.youtube.com/embed/${selectedTrailer.key}?autoplay=0&rel=0`;
      trailerContainer.classList.remove('d-none');

      // تصميم كارت أنيق للفتح المباشر دون تشويه المظهر عند وجود حظر من يوتيوب
      const ytBtnHtml = `
        <div id="direct-yt-btn" class="mb-3 text-center">
          <a href="${ytLink}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline-danger px-3 py-2 rounded-pill">
            <i class="fa-brands fa-youtube me-2"></i> مشاهدة الإعلان على YouTube
          </a>
        </div>
      `;
      trailerContainer.insertAdjacentHTML('afterend', ytBtnHtml);
    }

    // 3. جلب طاقم التمثيل
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
          <div class="actor-card">
            <img src="${actorImg}" class="actor-img mb-1" alt="${actor.name}">
            <div class="small fw-bold text-truncate text-white" style="font-size: 11px;">${actor.name}</div>
            <div class="text-muted text-truncate" style="font-size: 10px;">${actor.character || ''}</div>
          </div>
        `;
      });
    } else {
      castContainer.innerHTML = '<span class="text-secondary small">لا يتوفر معلومات عن الممثلين.</span>';
    }

  } catch (error) {
    console.error("Error fetching movie details:", error);
  }
}

// تنظيف النافذة عند إغلاقها
document.getElementById('movieDetailModal').addEventListener('hidden.bs.modal', function () {
  document.getElementById('trailerIframe').src = '';
  const oldBtn = document.getElementById('direct-yt-btn');
  if (oldBtn) oldBtn.remove();
});

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

  localStorage.setItem('cinema_favs', JSON.stringify(favorites));
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
      const res = await fetch(searchUrl);
      const data = await res.json();
      displayItems(data.results || []);
    } catch (err) {
      console.error(err);
    }
    
    searchInput.value = '';
  }
});

loadCategory('trending');