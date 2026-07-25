const API_KEY = 'b66d8f9190be0d85d0147fc270a75566';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

let currentLang = 'ar-SA';
let currentCategory = 'trending';
let userProfileData = null;

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
// 1️⃣ إدارة البروفايل والمستخدمين (Profile Engine)
// ==========================================
window.handleUserLogin = async function(user) {
  if (!window.db) return;
  
  try {
    const userDocRef = window.doc(window.db, "users", user.uid);
    const docSnap = await window.getDoc(userDocRef);

    if (docSnap.exists()) {
      userProfileData = docSnap.data();
      if (!userProfileData.username) {
        showUsernameSetupModal();
      } else {
        updateUIWithUserData();
      }
    } else {
      showUsernameSetupModal();
    }
  } catch (err) {
    console.error("خطأ جلب بيانات المستخدم:", err);
  }
};

function showUsernameSetupModal() {
  const modalElem = document.getElementById('usernameModal');
  if (modalElem) {
    const modal = bootstrap.Modal.getOrCreateInstance(modalElem);
    modal.show();
  }
}

async function isUsernameTaken(username, currentUid) {
  const q = window.query(window.collection(window.db, "users"), window.where("username", "==", username.toLowerCase()));
  const querySnap = await window.getDocs(q);
  let taken = false;
  querySnap.forEach(doc => {
    if (doc.id !== currentUid) taken = true;
  });
  return taken;
}

document.getElementById('setup-username-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('setup-username-input').value.trim().toLowerCase();
  const errDiv = document.getElementById('setup-username-error');
  errDiv.classList.add('d-none');

  if (!window.currentUser) return;

  const taken = await isUsernameTaken(input, window.currentUser.uid);
  if (taken) {
    errDiv.textContent = 'اسم المستخدم هذا مأخوذ بالفعل! اختر اسماً آخر.';
    errDiv.classList.remove('d-none');
    return;
  }

  const userDocRef = window.doc(window.db, "users", window.currentUser.uid);
  const newProfile = {
    uid: window.currentUser.uid,
    username: input,
    displayName: window.currentUser.displayName || input,
    avatar: window.currentUser.photoURL || 'https://cdn-icons-png.flaticon.com/512/3172/3172522.png',
    joinedAt: new Date().toLocaleDateString('ar-SA'),
    favorites: favorites,
    watchedList: watchedList,
    watchedEpisodes: watchedEpisodes
  };

  await window.setDoc(userDocRef, newProfile, { merge: true });
  userProfileData = newProfile;
  
  bootstrap.Modal.getInstance(document.getElementById('usernameModal')).hide();
  updateUIWithUserData();
});

function updateUIWithUserData() {
  if (!userProfileData) return;

  document.getElementById('login-btn')?.classList.add('d-none');
  document.getElementById('user-info')?.classList.remove('d-none');
  
  const avatarImg = document.getElementById('user-avatar');
  const nameSpan = document.getElementById('user-name');
  const handleSpan = document.getElementById('user-handle');

  if (avatarImg) avatarImg.src = userProfileData.avatar;
  if (nameSpan) nameSpan.textContent = userProfileData.displayName;
  if (handleSpan) handleSpan.textContent = `@${userProfileData.username}`;

  // تحديث بيانات مودال البروفايل
  const profAvatar = document.getElementById('profile-modal-avatar');
  const profName = document.getElementById('profile-modal-name');
  const profUser = document.getElementById('profile-modal-username');
  const profJoined = document.getElementById('profile-modal-joined');

  if (profAvatar) profAvatar.src = userProfileData.avatar;
  if (profName) profName.textContent = userProfileData.displayName;
  if (profUser) profUser.textContent = `@${userProfileData.username}`;
  if (profJoined) profJoined.textContent = `انضم في: ${userProfileData.joinedAt || '2026'}`;

  // تحديث العدادات والإحصائيات داخل البروفايل
  const statFavCount = document.getElementById('stat-fav-count');
  const statEpCount = document.getElementById('stat-ep-count');

  if (statFavCount) statFavCount.textContent = (userProfileData.favorites || favorites).length;
  if (statEpCount) statEpCount.textContent = (userProfileData.watchedEpisodes || watchedEpisodes).length;

  const editUser = document.getElementById('edit-username');
  const editDisplay = document.getElementById('edit-displayname');

  if (editUser) editUser.value = userProfileData.username;
  if (editDisplay) editDisplay.value = userProfileData.displayName;
}

document.getElementById('open-profile-btn')?.addEventListener('click', () => {
  if (userProfileData) {
    bootstrap.Modal.getOrCreateInstance(document.getElementById('profileModal')).show();
  }
});

// تحويل وضغط صورة الجهاز إلى Base64
function convertFileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 250;
        const scaleFactor = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleFactor;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
    };
    reader.onerror = error => reject(error);
  });
}

// حفظ تعديلات البروفايل والصورة من الملفات
document.getElementById('profile-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const newUsername = document.getElementById('edit-username').value.trim().toLowerCase();
  const newDisplayName = document.getElementById('edit-displayname').value.trim();
  const fileInput = document.getElementById('edit-avatar-file');

  const errDiv = document.getElementById('profile-error');
  const succDiv = document.getElementById('profile-success');
  const saveBtn = document.getElementById('save-profile-btn');

  errDiv.classList.add('d-none');
  succDiv.classList.add('d-none');
  saveBtn.disabled = true;
  saveBtn.textContent = 'جاري الحفظ...';

  try {
    if (newUsername !== userProfileData.username) {
      const taken = await isUsernameTaken(newUsername, window.currentUser.uid);
      if (taken) {
        errDiv.textContent = 'اسم المستخدم هذا مستعمل من قبل شخص آخر!';
        errDiv.classList.remove('d-none');
        saveBtn.disabled = false;
        saveBtn.textContent = 'حفظ التغييرات';
        return;
      }
    }

    let finalAvatar = userProfileData.avatar;
    if (fileInput && fileInput.files && fileInput.files[0]) {
      finalAvatar = await convertFileToBase64(fileInput.files[0]);
    }

    userProfileData.username = newUsername;
    userProfileData.displayName = newDisplayName;
    userProfileData.avatar = finalAvatar;

    const userDocRef = window.doc(window.db, "users", window.currentUser.uid);
    await window.setDoc(userDocRef, {
      username: newUsername,
      displayName: newDisplayName,
      avatar: finalAvatar
    }, { merge: true });

    succDiv.classList.remove('d-none');
    updateUIWithUserData();
    if (fileInput) fileInput.value = '';
    setTimeout(() => succDiv.classList.add('d-none'), 3000);
  } catch (error) {
    console.error("خطأ في حفظ البروفايل:", error);
    errDiv.textContent = 'حدث خطأ أثناء الحفظ. حاول مرة أخرى.';
    errDiv.classList.remove('d-none');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'حفظ التغييرات';
  }
});

// ==========================================
// 2️⃣ حفظ البيانات محلياً + السحابياً
// ==========================================
async function saveData() {
  localStorage.setItem('cinema_favs', JSON.stringify(favorites));
  localStorage.setItem('cinema_watched', JSON.stringify(watchedList));
  localStorage.setItem('cinema_watched_episodes', JSON.stringify(watchedEpisodes));

  if (window.currentUser && window.db && typeof window.doc === 'function') {
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
  if (window.currentUser && window.db && typeof window.doc === 'function') {
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
// 3️⃣ جلب وعرض المحتوى
// ==========================================
function getEndpoint(category, page = 1) {
  if (category === 'movies') return `${BASE_URL}/movie/popular?api_key=${API_KEY}&language=${currentLang}&page=${page}`;
  if (category === 'series') return `${BASE_URL}/tv/popular?api_key=${API_KEY}&language=${currentLang}&page=${page}`;
  return `${BASE_URL}/trending/all/day?api_key=${API_KEY}&language=${currentLang}&page=${page}`;
}

async function fetchMultiplePages(category) {
  if (!moviesGrid) return;
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
  if (!moviesGrid) return;
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
        const type = item.media_type || (item.title ? 'movie' : 'tv');
        openMovieDetails(item.id, type);
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
// 4️⃣ تفاصيل المودال والترايلر والحلقات
// ==========================================
async function openMovieDetails(itemId, mediaType = 'movie') {
  const modalElement = document.getElementById('movieDetailModal');
  const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
  
  document.getElementById('modalTitle').textContent = 'جاري التحميل...';
  document.getElementById('modalOverview').textContent = '';
  document.getElementById('trailerContainer').classList.add('d-none');
  document.getElementById('trailerIframe').src = '';
  document.getElementById('castContainer').innerHTML = '';

  const epTabLi = document.getElementById('episodes-tab-li');

  const infoTabBtn = document.getElementById('info-tab');
  if (infoTabBtn) {
    const tabInstance = bootstrap.Tab.getOrCreateInstance(infoTabBtn);
    tabInstance.show();
  }

  modal.show();

  try {
    const res = await fetch(`${BASE_URL}/${mediaType}/${itemId}?api_key=${API_KEY}&language=${currentLang}`);
    const data = await res.json();

    document.getElementById('modalTitle').textContent = data.title || data.name;
    document.getElementById('modalOverview').textContent = data.overview || 'لا يوجد ملخص متوفر لهذا العمل.';

    if (mediaType === 'movie') {
      if (epTabLi) epTabLi.classList.add('d-none');
    } else {
      if (epTabLi) epTabLi.classList.remove('d-none');
      setupSeasons(data.seasons || [], itemId);
    }

    const vRes = await fetch(`${BASE_URL}/${mediaType}/${itemId}/videos?api_key=${API_KEY}&language=en-US`);
    const vData = await vRes.json();
    const videos = vData.results || [];
    const trailer = videos.find(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser' || v.type === 'Clip')) || videos[0];
    
    if (trailer) {
      document.getElementById('trailerIframe').src = `https://www.youtube.com/embed/${trailer.key}`;
      document.getElementById('trailerContainer').classList.remove('d-none');
    }

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
    console.error("خطأ في جلب تفاصيل العمل:", e);
  }
}

function setupSeasons(seasons, tvId) {
  const select = document.getElementById('seasonSelect');
  if (!select) return;
  select.innerHTML = '';
  
  const validSeasons = seasons.filter(s => s.season_number > 0);
  
  if (validSeasons.length === 0 && seasons.length > 0) {
    validSeasons.push(...seasons);
  }

  validSeasons.forEach(s => {
    select.innerHTML += `<option value="${s.season_number}">${s.name || 'موسم ' + s.season_number} (${s.episode_count || 0} حلقة)</option>`;
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

    const episodes = data.episodes || [];
    if (episodes.length === 0) {
      container.innerHTML = `<div class="col-12 text-center text-muted py-3">لا توجد حلقات متاحة لهذا الموسم.</div>`;
      return;
    }

    episodes.forEach(ep => {
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
// 5️⃣ المفضلة والتنقل والبحث
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
  if (!moviesGrid) return;
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
  if (sectionTitle) sectionTitle.textContent = t[`${category}Title`] || t.trendingTitle;

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

if (searchForm) {
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
}

// ==========================================
// 6️⃣ تنظيف خلفية الـ Modal تلقائياً
// ==========================================
function clearModalBackdrop() {
  document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
  document.body.classList.remove('modal-open');
  document.body.style.overflow = 'auto';
  document.body.style.paddingRight = '0px';
}

const modalElem = document.getElementById('movieDetailModal');
if (modalElem) {
  modalElem.addEventListener('hidden.bs.modal', () => {
    const iframe = document.getElementById('trailerIframe');
    if (iframe) iframe.src = '';
    clearModalBackdrop();
  });
}

loadCategory('trending');