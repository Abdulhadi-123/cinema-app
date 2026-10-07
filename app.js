const API_KEY = 'b66d8f9190be0d85d0147fc270a75566';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

let currentLang = 'en-US';
let currentCategory = 'trending';
let userProfileData = null;
let viewedProfileData = null; // لتخزين بيانات البروفايل الذي يتم استعراضه حالياً

let favorites = JSON.parse(localStorage.getItem('cinema_favs')) || [];
let watchedList = JSON.parse(localStorage.getItem('cinema_watched')) || [];
let watchedEpisodes = JSON.parse(localStorage.getItem('cinema_watched_episodes')) || [];
let followingList = JSON.parse(localStorage.getItem('cinema_following')) || [];
let watchlist = JSON.parse(localStorage.getItem('cinema_watchlist')) || [];
let ratings = JSON.parse(localStorage.getItem('cinema_ratings')) || {};
let reviews = JSON.parse(localStorage.getItem('cinema_reviews')) || [];
let diary = JSON.parse(localStorage.getItem('cinema_diary')) || [];
let activities = JSON.parse(localStorage.getItem('cinema_activities')) || [];
let currentDetailItem = null;
let customLists = JSON.parse(localStorage.getItem('cinema_custom_lists')) || [];
let showSpoilers = false;
let currentEpisodeContext = null;

const moviesGrid = document.getElementById('movies-grid');
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const sectionTitle = document.getElementById('section-title');

const translations = {
  'en-US': {
    logo: 'WatchList', home: 'Home', movies: 'Movies', series: 'TV Shows', favs: 'Favorites',
    searchPlaceholder: 'Search movies, TV shows, or @username...', searchBtn: 'Search',
    trendingTitle: 'Trending & Recommended 🔥', moviesTitle: 'Popular Movies 🎬',
    seriesTitle: 'Popular TV Shows 📺', favsTitle: 'My Favorites ❤️', watchlistTitle: 'My Watchlist ⏱️',
    upnextTitle: 'Up Next ▶️', diaryTitle: 'Watch Diary 📅', activityTitle: 'Friends Activity 👥',
    reviewsTitle: 'Reviews & Community 💬', listsTitle: 'Lists 📝', calendarTitle: 'Release Calendar 📆',
    statsTitle: 'My Stats 📊', recommendationsTitle: 'For You ✨', notificationsTitle: 'Notifications 🔔',
    searchResults: 'Search results for: ', noResults: 'No results found 🔍', noFavs: 'No favorites added yet 💔'
  }
};

// ==========================================
// 1️⃣ إدارة البروفايل وصفحة البروفايل المستقلة
// ==========================================
window.handleUserLogin = async function(user) {
  if (!window.db) return;
  try {
    const userDocRef = window.doc(window.db, "users", user.uid);
    const docSnap = await window.getDoc(userDocRef);

    if (docSnap.exists()) {
      userProfileData = docSnap.data();
      followingList = userProfileData.following || [];
      if (!userProfileData.username) {
        showUsernameSetupModal();
      } else {
        updateUIWithUserData();
      }
    } else {
      showUsernameSetupModal();
    }
  } catch (err) {
    console.error(err);
  }
};

function showUsernameSetupModal() {
  const modalElem = document.getElementById('usernameModal');
  if (modalElem) {
    bootstrap.Modal.getOrCreateInstance(modalElem).show();
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
    errDiv.textContent = 'That username is already taken.';
    errDiv.classList.remove('d-none');
    return;
  }

  const userDocRef = window.doc(window.db, "users", window.currentUser.uid);
  const newProfile = {
    uid: window.currentUser.uid,
    username: input,
    displayName: window.currentUser.displayName || input,
    avatar: window.currentUser.photoURL || 'https://cdn-icons-png.flaticon.com/512/3172/3172522.png',
    joinedAt: new Date().toLocaleDateString('en-US'),
    favorites: favorites,
    watchedList: watchedList,
    watchedEpisodes: watchedEpisodes,
    following: followingList,
    watchlist, ratings, reviews, diary, activities, customLists, bio:'', banner:'', favoriteFour:[]
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
}

// فتح بروفايل المستخدم الحالي
window.openMyProfile = function() {
  if (!userProfileData) return;
  openUserProfile(userProfileData);
};

// دالة لجلب عدد وم قائمة المتابِعين (الأشخاص الذين يتابعون هذا المستخدم)
async function getFollowersData(targetUid) {
  if (!window.db) return [];
  try {
    const usersRef = window.collection(window.db, "users");
    const qSnapshot = await window.getDocs(usersRef);
    let followers = [];
    qSnapshot.forEach(docSnap => {
      const uData = docSnap.data();
      if (uData.following && Array.isArray(uData.following) && uData.following.includes(targetUid)) {
        followers.push(uData);
      }
    });
    return followers;
  } catch (e) {
    console.error("Error fetching followers:", e);
    return [];
  }
}

// فتح صفحة أي بروفايل (سواء لك أو لمستخدم آخر)
async function openUserProfile(profileObj) {
  viewedProfileData = profileObj;
  document.getElementById('main-content-area').classList.add('d-none');
  document.getElementById('profile-page-area').classList.remove('d-none');

  const isMyProfile = userProfileData && userProfileData.uid === viewedProfileData.uid;

  // إظهار أو إخفاء نموذج التعديل وزر المتابعة حسب الملكية
  const editFormContainer = document.getElementById('edit-profile-section');
  const followBtnContainer = document.getElementById('follow-btn-container');

  if (isMyProfile) {
    if (editFormContainer) editFormContainer.classList.remove('d-none');
    if (followBtnContainer) followBtnContainer.classList.add('d-none');
    const editUser = document.getElementById('edit-username');
    const editDisplay = document.getElementById('edit-displayname');
    if (editUser) editUser.value = userProfileData.username || '';
    if (editDisplay) editDisplay.value = userProfileData.displayName || '';
    const editBio=document.getElementById('edit-bio'); if(editBio) editBio.value=userProfileData.bio||'';
    const editBanner=document.getElementById('edit-banner'); if(editBanner) editBanner.value=userProfileData.banner||'';
  } else {
    if (editFormContainer) editFormContainer.classList.add('d-none');
    if (followBtnContainer) {
      followBtnContainer.classList.remove('d-none');
      const isFollowing = followingList.includes(viewedProfileData.uid);
      followBtnContainer.innerHTML = `
        <button id="follow-action-btn" class="btn ${isFollowing ? 'btn-outline-danger' : 'btn-info'} btn-sm w-100 fw-bold mb-3" onclick="toggleFollowUser('${viewedProfileData.uid}')">
          <i class="fa-solid ${isFollowing ? 'fa-user-minus' : 'fa-user-plus'} me-1"></i> ${isFollowing ? 'Unfollow' : 'Follow'}
        </button>
      `;
    }
  }

  // تعبئة البيانات الأساسية في البروفايل
  const pAvatar = document.getElementById('profile-page-avatar');
  const pName = document.getElementById('profile-page-name');
  const pUser = document.getElementById('profile-page-username');
  const pJoined = document.getElementById('profile-page-joined');

  if (pAvatar) pAvatar.src = viewedProfileData.avatar || 'https://cdn-icons-png.flaticon.com/512/3172/3172522.png';
  if (pName) pName.textContent = viewedProfileData.displayName || '';
  if (pUser) pUser.textContent = `@${viewedProfileData.username || ''}`;
  if (pJoined) pJoined.textContent = `Joined: ${viewedProfileData.joinedAt || '2026'}`;

  // حساب الإحصائيات للأفلام والمفضلة والحلقات
  const currentFavs = viewedProfileData.favorites || [];
  const currentWatchedMovies = viewedProfileData.watchedList || [];
  const currentWatchedEps = viewedProfileData.watchedEpisodes || [];
  const currentFollowing = viewedProfileData.following || [];

  // جلب عدد المتابعين الحقيقيين من قاعدة البيانات
  const followersList = await getFollowersData(viewedProfileData.uid);

  // تحديث عدادات الإحصائيات في واجهة البروفايل
  document.getElementById('stat-fav-count').textContent = currentFavs.length;
  document.getElementById('stat-ep-count').textContent = currentWatchedEps.length;
  document.getElementById('stat-followers-count').textContent = followersList.length;
  document.getElementById('stat-following-count').textContent = currentFollowing.length;

  renderProfileWatchedCards(viewedProfileData);
}

// دالة فتح نافذة (Modal) عرض قائمة المتابِعين أو المتابَعين
window.openFollowersModal = async function(type) {
  if (!viewedProfileData) return;
  const modalTitle = document.getElementById('followersModalTitle');
  const modalList = document.getElementById('followersModalList');
  
  modalList.innerHTML = `<div class="text-center py-3"><div class="spinner-border text-info spinner-border-sm"></div></div>`;
  const modalElem = document.getElementById('followersModal');
  bootstrap.Modal.getOrCreateInstance(modalElem).show();

  let usersToDisplay = [];

  if (type === 'followers') {
    modalTitle.textContent = 'Followers';
    usersToDisplay = await getFollowersData(viewedProfileData.uid);
  } else {
    modalTitle.textContent = 'Following';
    const followingIds = viewedProfileData.following || [];
    if (followingIds.length > 0 && window.db) {
      try {
        const usersRef = window.collection(window.db, "users");
        const qSnapshot = await window.getDocs(usersRef);
        qSnapshot.forEach(docSnap => {
          const uData = docSnap.data();
          if (followingIds.includes(uData.uid)) {
            usersToDisplay.push(uData);
          }
        });
      } catch (e) {
        console.error(e);
      }
    }
  }

  if (usersToDisplay.length === 0) {
    modalList.innerHTML = `<div class="text-center text-muted small py-3">Nothing to show yet.</div>`;
    return;
  }

  modalList.innerHTML = '';
  usersToDisplay.forEach(u => {
    const item = document.createElement('div');
    item.className = 'd-flex align-items-center justify-content-between p-2 mb-1 bg-secondary bg-opacity-25 rounded hover-bg-secondary cursor-pointer';
    item.style.cursor = 'pointer';
    item.innerHTML = `
      <div class="d-flex align-items-center gap-2">
        <img src="${u.avatar || 'https://placehold.co/100'}" class="rounded-circle" style="width: 35px; height: 35px; object-fit: cover;">
        <div>
          <div class="fw-bold small text-white text-truncate" style="max-width: 140px;">${u.displayName}</div>
          <div class="text-info" style="font-size: 10px;">@${u.username}</div>
        </div>
      </div>
      <button class="btn btn-sm btn-outline-info py-0 px-2" style="font-size: 11px;">View</button>
    `;
    item.addEventListener('click', () => {
      bootstrap.Modal.getInstance(modalElem).hide();
      openUserProfile(u);
    });
    modalList.appendChild(item);
  });
};

// نظام المتابعة
window.toggleFollowUser = async function(targetUid) {
  if (!window.currentUser) {
    alert('Please sign in before following users.');
    return;
  }
  
  const idx = followingList.indexOf(targetUid);
  if (idx > -1) {
    followingList.splice(idx, 1);
  } else {
    followingList.push(targetUid);
  }

  const followingNow=idx===-1;
  if(window.db){ const fid=`${window.currentUser.uid}_${targetUid}`; const ref=window.doc(window.db,'follows',fid); if(followingNow){ await window.setDoc(ref,{id:fid,followerUid:window.currentUser.uid,followingUid:targetUid,createdAt:new Date().toISOString()}); await createNotification(targetUid,'follow',{from:publicProfileSnapshot()}); } else if(window.deleteDoc){ await window.deleteDoc(ref).catch(()=>{}); } }
  saveData();
  openUserProfile(viewedProfileData);
};

// عرض الأعمال التي تابعها المستخدم في البروفايل
async function renderProfileWatchedCards(profileObj) {
  const container = document.getElementById('profile-watched-grid');
  if (!container) return;
  container.innerHTML = `<div class="col-12 text-center py-4"><div class="spinner-border text-info spinner-border-sm"></div></div>`;

  const wList = profileObj.watchedList || [];
  const wEps = profileObj.watchedEpisodes || [];

  const uniqueIdsSet = new Set([...wList]);
  wEps.forEach(epKey => {
    const tvId = epKey.split('_')[0];
    if (tvId) uniqueIdsSet.add(tvId);
  });

  const allIds = Array.from(uniqueIdsSet);
  if (allIds.length === 0) {
    container.innerHTML = `<div class="col-12 text-center text-muted py-4">No watched or tracked titles yet.</div>`;
    return;
  }

  container.innerHTML = '';
  for (const id of allIds) {
    try {
      let mediaType = 'tv';
      let res = await fetch(`${BASE_URL}/tv/${id}?api_key=${API_KEY}&language=en-US`);
      let data = await res.json();

      if (!data.id || data.success === false) {
        res = await fetch(`${BASE_URL}/movie/${id}?api_key=${API_KEY}&language=en-US`);
        data = await res.json();
        mediaType = 'movie';
      }

      if (data.id) {
        const title = data.title || data.name;
        const poster = data.poster_path ? `${IMAGE_BASE_URL}${data.poster_path}` : 'https://placehold.co/300x450/1e293b/ffffff?text=No+Image';
        const isWatchedMovie = wList.includes(Number(id)) || wList.includes(id);
        const episodesCountForThisTv = wEps.filter(e => e.startsWith(id + '_')).length;

        const card = document.createElement('div');
        card.className = 'col-6 col-sm-4 col-md-3 mb-3';
        card.innerHTML = `
          <div class="card bg-dark border-secondary h-100 p-2 position-relative shadow-sm" style="font-size: 12px; cursor: pointer;">
            <div class="position-relative">
              <img src="${poster}" class="rounded w-100" style="height: 160px; object-fit: cover;">
              ${isWatchedMovie ? '<span class="badge bg-success position-absolute top-0 start-0 m-1" title="Watched"><i class="fa-solid fa-eye"></i></span>' : ''}
              ${episodesCountForThisTv > 0 ? `<span class="badge bg-info text-dark position-absolute top-0 end-0 m-1" title="Tracked episodes"><i class="fa-solid fa-check"></i> ${episodesCountForThisTv}</span>` : ''}
            </div>
            <div class="mt-2 text-center">
              <div class="fw-bold text-white text-truncate">${title}</div>
            </div>
          </div>
        `;

        card.addEventListener('click', () => openMovieDetails(id, mediaType));
        container.appendChild(card);
      }
    } catch (e) {
      console.error(e);
    }
  }
}

// تحويل الصورة وضغطها
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

document.getElementById('profile-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const newUsername = document.getElementById('edit-username').value.trim().toLowerCase();
  const newDisplayName = document.getElementById('edit-displayname').value.trim();
  const fileInput = document.getElementById('edit-avatar-file');
  const newBio = document.getElementById('edit-bio')?.value.trim() || '';
  const newBanner = document.getElementById('edit-banner')?.value.trim() || '';

  const errDiv = document.getElementById('profile-error');
  const succDiv = document.getElementById('profile-success');
  const saveBtn = document.getElementById('save-profile-btn');

  errDiv.classList.add('d-none');
  succDiv.classList.add('d-none');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    if (newUsername !== userProfileData.username) {
      const taken = await isUsernameTaken(newUsername, window.currentUser.uid);
      if (taken) {
        errDiv.textContent = 'That username is already in use.';
        errDiv.classList.remove('d-none');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save changes';
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
    userProfileData.bio = newBio;
    userProfileData.banner = newBanner;

    const userDocRef = window.doc(window.db, "users", window.currentUser.uid);
    await window.setDoc(userDocRef, {
      username: newUsername,
      displayName: newDisplayName,
      avatar: finalAvatar, bio:newBio, banner:newBanner
    }, { merge: true });

    succDiv.classList.remove('d-none');
    updateUIWithUserData();
    if (fileInput) fileInput.value = '';
    setTimeout(() => succDiv.classList.add('d-none'), 3000);
  } catch (error) {
    console.error(error);
    errDiv.textContent = 'Something went wrong while saving.';
    errDiv.classList.remove('d-none');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save changes';
  }
});

// ==========================================
// 2️⃣ حفظ البيانات محلياً وسحابياً
// ==========================================
async function saveData() {
  localStorage.setItem('cinema_favs', JSON.stringify(favorites));
  localStorage.setItem('cinema_watched', JSON.stringify(watchedList));
  localStorage.setItem('cinema_watched_episodes', JSON.stringify(watchedEpisodes));
  localStorage.setItem('cinema_following', JSON.stringify(followingList));
  localStorage.setItem('cinema_watchlist', JSON.stringify(watchlist));
  localStorage.setItem('cinema_ratings', JSON.stringify(ratings));
  localStorage.setItem('cinema_reviews', JSON.stringify(reviews));
  localStorage.setItem('cinema_diary', JSON.stringify(diary));
  localStorage.setItem('cinema_activities', JSON.stringify(activities));
  localStorage.setItem('cinema_custom_lists', JSON.stringify(customLists));

  if (window.currentUser && window.db && typeof window.doc === 'function') {
    try {
      const userDocRef = window.doc(window.db, "users", window.currentUser.uid);
      await window.setDoc(userDocRef, {
        favorites: favorites,
        watchedList: watchedList,
        watchedEpisodes: watchedEpisodes,
        following: followingList,
        watchlist, ratings, reviews, diary, activities, customLists,
        lastUpdated: new Date()
      }, { merge: true });
    } catch (error) {
      console.error(error);
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
        followingList = data.following || [];
        watchlist = data.watchlist || [];
        ratings = data.ratings || {};
        reviews = data.reviews || [];
        diary = data.diary || [];
        activities = data.activities || [];
        customLists = data.customLists || [];
        saveData();
        if (currentCategory === 'favorites') displayFavorites();
      }
    } catch (error) {
      console.error(error);
    }
  }
};

// ==========================================
// 3️⃣ جلب وعرض المحتوى
// ==========================================
function getEndpoint(category, page = 1) {
  if (category === 'movies') return `${BASE_URL}/movie/popular?api_key=${API_KEY}&language=en-US&page=${page}`;
  if (category === 'series') return `${BASE_URL}/tv/popular?api_key=${API_KEY}&language=en-US&page=${page}`;
  return `${BASE_URL}/trending/all/day?api_key=${API_KEY}&language=en-US&page=${page}`;
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
    card.className = 'col-6 col-sm-4 col-md-3 col-lg-2 mb-3';
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
        <div class="p-2 d-flex flex-column flex-grow-1 justify-content-between">
          <h6 class="fw-bold mb-1 text-white text-truncate small">${title}</h6>
          <small class="text-secondary" style="font-size: 10px;"><i class="fa-regular fa-calendar me-1"></i>${date}</small>
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
    btn?.classList.remove('active');
  } else {
    watchedList.push(itemId);
    btn?.classList.add('active');
    if (currentDetailItem && currentDetailItem.id === itemId) {
      addActivity('watched', currentDetailItem);
    }
  }
  saveData();
}

// ==========================================
// 4️⃣ تفاصيل العمل والحلقات
// ==========================================
async function openMovieDetails(itemId, mediaType = 'movie') {
  const modalElement = document.getElementById('movieDetailModal');
  const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
  
  document.getElementById('modalTitle').textContent = 'Loading...';
  document.getElementById('modalOverview').textContent = '';
  document.getElementById('trailerContainer').classList.add('d-none');
  document.getElementById('trailerIframe').src = '';
  document.getElementById('castContainer').innerHTML = '';

  const epTabLi = document.getElementById('episodes-tab-li');
  const infoTabBtn = document.getElementById('info-tab');
  if (infoTabBtn) bootstrap.Tab.getOrCreateInstance(infoTabBtn).show();

  modal.show();

  try {
    const res = await fetch(`${BASE_URL}/${mediaType}/${itemId}?api_key=${API_KEY}&language=en-US`);
    const data = await res.json();
    currentDetailItem = {
      id: itemId, media_type: mediaType, title: data.title || data.name,
      poster_path: data.poster_path, release_date: data.release_date || data.first_air_date,
      vote_average: data.vote_average || 0
    };
    setupSocialActions(currentDetailItem);

    document.getElementById('modalTitle').textContent = data.title || data.name;
    document.getElementById('modalOverview').textContent = data.overview || 'No overview available.';

    if (mediaType === 'movie') {
      if (epTabLi) epTabLi.classList.add('d-none');
    } else {
      if (epTabLi) epTabLi.classList.remove('d-none');
      setupSeasons(data.seasons || [], itemId);
    }

    const vRes = await fetch(`${BASE_URL}/${mediaType}/${itemId}/videos?api_key=${API_KEY}&language=en-US`);
    const vData = await vRes.json();
    const videos = vData.results || [];
    const trailer = videos.find(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')) || videos[0];
    
    if (trailer) {
      document.getElementById('trailerIframe').src = `https://www.youtube.com/embed/${trailer.key}`;
      document.getElementById('trailerContainer').classList.remove('d-none');
    }

    const cRes = await fetch(`${BASE_URL}/${mediaType}/${itemId}/credits?api_key=${API_KEY}&language=en-US`);
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
    console.error(e);
  }
}

function setupSeasons(seasons, tvId) {
  const select = document.getElementById('seasonSelect');
  if (!select) return;
  select.innerHTML = '';
  const validSeasons = seasons.filter(s => s.season_number > 0);
  if (validSeasons.length === 0 && seasons.length > 0) validSeasons.push(...seasons);

  validSeasons.forEach(s => {
    select.innerHTML += `<option value="${s.season_number}">${s.name || 'Season ' + s.season_number} (${s.episode_count || 0} eps)</option>`;
  });

  if (validSeasons.length > 0) fetchEpisodes(tvId, validSeasons[0].season_number);
  select.onchange = (e) => fetchEpisodes(tvId, e.target.value);
}

async function fetchEpisodes(tvId, seasonNum) {
  const container = document.getElementById('episodesContainer');
  if (!container) return;
  container.innerHTML = `<div class="col-12 text-center py-4"><div class="spinner-border text-info spinner-border-sm"></div></div>`;

  try {
    const res = await fetch(`${BASE_URL}/tv/${tvId}/season/${seasonNum}?api_key=${API_KEY}&language=en-US`);
    const data = await res.json();
    container.innerHTML = '';

    const episodes = data.episodes || [];
    if (episodes.length === 0) {
      container.innerHTML = `<div class="col-12 text-center text-muted py-3">No episodes available.</div>`;
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
            <img src="${img}" class="card-img-top" style="height: 110px; object-fit: cover;">
            <button class="btn btn-sm ${isWatched ? 'btn-success' : 'btn-dark opacity-75'} position-absolute top-0 end-0 m-2 btn-ep-watch">
              <i class="fa-solid ${isWatched ? 'fa-check-double' : 'fa-check'}"></i>
            </button>
          </div>
          <div class="card-body p-2 d-flex flex-column justify-content-between">
            <span class="badge bg-info text-dark w-auto">Ep ${ep.episode_number}</span>
            <h6 class="card-title text-white fw-bold my-1 small text-truncate">${ep.name}</h6>
            <button class="btn btn-outline-info btn-sm btn-ep-community mt-1"><i class="fa-regular fa-comments me-1"></i>Community</button>
          </div>
        </div>
      `;

      epCol.querySelector('.btn-ep-watch').addEventListener('click', (e) => { toggleWatchedEp(epKey, e.currentTarget); });
      epCol.querySelector('.btn-ep-community').addEventListener('click', () => openEpisodeCommunity({tvId,seasonNum:Number(seasonNum),episode:ep}));

      container.appendChild(epCol);
    });
  } catch (e) {
    console.error(e);
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
    if (currentDetailItem) addActivity('episode', currentDetailItem, { episodeKey: epKey });
    btn.className = 'btn btn-sm btn-success position-absolute top-0 end-0 m-2 btn-ep-watch';
    btn.innerHTML = '<i class="fa-solid fa-check-double"></i>';
  }
  saveData();
}

// ==========================================
// 5️⃣ المفضلة والبحث الشامل (أفلام، مسلسلات، ومستخدمين)
// ==========================================
function toggleFavorite(item, btn) {
  const idx = favorites.findIndex(f => f.id === item.id);
  if (idx > -1) {
    favorites.splice(idx, 1);
    btn.classList.remove('active');
    btn.querySelector('i').className = 'fa-regular fa-heart';
    if (currentCategory === 'favorites') displayFavorites();
  } else {
    addActivity('favorite', item);
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
  
  document.getElementById('main-content-area').classList.remove('d-none');
  document.getElementById('profile-page-area').classList.add('d-none');

  document.querySelectorAll('.nav-link, .dropdown-item').forEach(l => l.classList.remove('active'));
  
  if (category === 'trending') document.getElementById('nav-home')?.classList.add('active');
  if (category === 'movies') document.getElementById('nav-movies')?.classList.add('active');
  if (category === 'series') document.getElementById('nav-series')?.classList.add('active');
  if (category === 'favorites') document.getElementById('nav-favs')?.classList.add('active');
  if (category === 'watchlist') document.getElementById('nav-watchlist')?.classList.add('active');
  if (category === 'upnext') document.getElementById('nav-upnext')?.classList.add('active');
  if (category === 'diary') document.getElementById('nav-diary')?.classList.add('active');
  if (category === 'activity') document.getElementById('nav-activity')?.classList.add('active');
  ['reviews','lists','calendar','stats','recommendations','notifications'].forEach(x=>{if(category===x) document.getElementById('nav-'+x)?.classList.add('active');});

  const t = translations[currentLang];
  if (sectionTitle) sectionTitle.textContent = t[`${category}Title`] || t.trendingTitle;

  if (category === 'favorites') displayFavorites();
  else if (category === 'watchlist') displayWatchlist();
  else if (category === 'diary') displayDiary();
  else if (category === 'activity') displayActivityFeed();
  else if (category === 'upnext') displayUpNext();
  else if (category === 'reviews') displayGlobalReviews();
  else if (category === 'lists') displayLists();
  else if (category === 'calendar') displayReleaseCalendar();
  else if (category === 'stats') displayStats();
  else if (category === 'recommendations') displayRecommendations();
  else if (category === 'notifications') displayNotifications();
  else fetchMultiplePages(category);
}

window.loadCategory = loadCategory;


if (searchForm) {
  searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    let q = searchInput.value.trim();
    if (!q) return;

    document.getElementById('main-content-area').classList.remove('d-none');
    document.getElementById('profile-page-area').classList.add('d-none');

    sectionTitle.textContent = `${translations[currentLang].searchResults} "${q}"`;
    moviesGrid.innerHTML = `<div class="col-12 text-center my-5"><div class="spinner-border text-info"></div></div>`;

    if (q.startsWith('@') || (window.db && window.query)) {
      try {
        const cleanQuery = q.startsWith('@') ? q.substring(1).toLowerCase() : q.toLowerCase();
        const usersRef = window.collection(window.db, "users");
        const qSnapshot = await window.getDocs(usersRef);
        let foundUsers = [];
        qSnapshot.forEach(docSnap => {
          const uData = docSnap.data();
          if (uData.username && uData.username.toLowerCase().includes(cleanQuery)) {
            foundUsers.push(uData);
          }
        });

        if (foundUsers.length > 0) {
          moviesGrid.innerHTML = '';
          foundUsers.forEach(user => {
            const userCard = document.createElement('div');
            userCard.className = 'col-6 col-sm-4 col-md-3 mb-3';
            userCard.innerHTML = `
              <div class="card bg-dark border-info h-100 p-3 text-center shadow-sm" style="cursor: pointer;">
                <img src="${user.avatar || 'https://placehold.co/100'}" class="rounded-circle mx-auto mb-2 border border-info" style="width: 70px; height: 70px; object-fit: cover;">
                <h6 class="fw-bold text-white text-truncate mb-0">${user.displayName}</h6>
                <small class="text-info">@${user.username}</small>
              </div>
            `;
            userCard.addEventListener('click', () => openUserProfile(user));
            moviesGrid.appendChild(userCard);
          });
          searchInput.value = '';
          return;
        }
      } catch (err) {
        console.error("Error searching users:", err);
      }
    }

    try {
      const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&language=en-US&query=${encodeURIComponent(q)}`);
      const data = await res.json();
      displayItems((data.results || []).filter(i => i.media_type === 'movie' || i.media_type === 'tv'));
    } catch (e) { 
      console.error(e); 
    }
    searchInput.value = '';
  });
}


// ==========================================
// 6️⃣ Social tracking: Watchlist, ratings, diary, reviews, feed, Up Next
// ==========================================
function itemKey(item) { return `${item.media_type || (item.title ? 'movie' : 'tv')}_${item.id}`; }
function compactItem(item) {
  return { id:item.id, media_type:item.media_type || (item.title ? 'movie':'tv'), title:item.title || item.name,
    poster_path:item.poster_path || null, release_date:item.release_date || item.first_air_date || '', vote_average:item.vote_average || 0 };
}
function requireLogin() {
  if (!window.currentUser) { alert('Sign in first to sync this action.'); return false; }
  return true;
}
function addActivity(type, item, extra={}) {
  if (!window.currentUser || !item) return;
  const activity={ id:`${Date.now()}_${Math.random().toString(36).slice(2,7)}`, uid:window.currentUser.uid, type, item:compactItem(item), extra, createdAt:new Date().toISOString(), user:publicProfileSnapshot() };
  activities.unshift(activity); activities = activities.slice(0,150);
  if(window.db && window.setDoc) window.setDoc(window.doc(window.db,'activities',activity.id), activity).catch(console.error);
}
function setupSocialActions(item) {
  const key=itemKey(item), inWatchlist=watchlist.some(x=>itemKey(x)===key), watched=watchedList.includes(item.id);
  const wBtn=document.getElementById('detail-watchlist-btn'), seenBtn=document.getElementById('detail-watched-btn');
  if (wBtn) {
    wBtn.className=`btn btn-sm ${inWatchlist?'btn-info':'btn-outline-info'}`;
    wBtn.innerHTML=`<i class="${inWatchlist?'fa-solid':'fa-regular'} fa-clock me-1"></i> ${inWatchlist?'In Watchlist':'Watchlist'}`;
    wBtn.onclick=()=>toggleWatchlist(item);
  }
  if (seenBtn) {
    seenBtn.className=`btn btn-sm ${watched?'btn-success':'btn-outline-success'}`;
    seenBtn.innerHTML=`<i class="fa-solid fa-eye me-1"></i> ${watched?'Watched':'Mark watched'}`;
    seenBtn.onclick=()=>{ toggleWatchedMovie(item.id, seenBtn); setupSocialActions(item); };
  }
  document.getElementById('detail-log-btn').onclick=()=>logDiary(item);
  const ffBtn=document.getElementById('detail-favorite-four-btn'); if(ffBtn){const ff=(userProfileData?.favoriteFour||[]),has=ff.some(x=>itemKey(x)===key);ffBtn.className=`btn btn-sm ${has?'btn-danger':'btn-outline-danger'}`;ffBtn.onclick=()=>toggleFavoriteFour(item);}
  document.getElementById('save-review-btn').onclick=()=>saveReview(item);
  document.getElementById('clear-rating-btn').onclick=()=>{ delete ratings[key]; saveData(); renderRatingStars(item); };
  const myReview=reviews.find(r=>r.itemKey===key && r.uid===window.currentUser?.uid);
  document.getElementById('detail-review-text').value=myReview?.text || '';
  renderRatingStars(item);
}
function renderRatingStars(item) {
  const box=document.getElementById('detail-rating-stars'); if(!box) return;
  const key=itemKey(item), value=Number(ratings[key]||0); box.innerHTML='';
  for(let i=1;i<=5;i++) {
    const b=document.createElement('button'); b.type='button'; b.className=i<=value?'active':''; b.innerHTML='<i class="fa-solid fa-star"></i>';
    b.title=`${i}/5`; b.onclick=()=>{ if(!requireLogin()) return; ratings[key]=i; addActivity('rated',item,{rating:i}); saveData(); renderRatingStars(item); showActionStatus(`Rated ${i}/5`); };
    box.appendChild(b);
  }
}
function showActionStatus(text) { const el=document.getElementById('detail-action-status'); if(!el)return; el.textContent=text; el.classList.remove('d-none'); setTimeout(()=>el.classList.add('d-none'),1800); }
function toggleWatchlist(item) {
  if(!requireLogin()) return; const key=itemKey(item), idx=watchlist.findIndex(x=>itemKey(x)===key);
  if(idx>-1) watchlist.splice(idx,1); else { watchlist.unshift(compactItem(item)); addActivity('watchlist',item); }
  saveData(); setupSocialActions(item); showActionStatus(idx>-1?'Removed from watchlist':'Added to watchlist');
}
function logDiary(item) {
  if(!requireLogin()) return; const today=new Date().toISOString().slice(0,10), key=itemKey(item);
  diary.unshift({ id:`${Date.now()}`, uid:window.currentUser.uid, itemKey:key, item:compactItem(item), watchedDate:today, rating:ratings[key]||null, createdAt:new Date().toISOString() });
  if(!watchedList.includes(item.id)) watchedList.push(item.id);
  watchlist=watchlist.filter(x=>itemKey(x)!==key); addActivity('logged',item,{date:today}); saveData(); setupSocialActions(item); showActionStatus('Added to diary');
}
async function saveReview(item) {
  if(!requireLogin()) return; let text=document.getElementById('detail-review-text').value.trim(); if(!text) return;
  const spoiler=/^\[spoiler\]/i.test(text); text=text.replace(/^\[spoiler\]\s*/i,'');
  const key=itemKey(item), existing=reviews.findIndex(r=>r.itemKey===key && r.uid===window.currentUser.uid);
  const id=`${window.currentUser.uid}_${key}`; const created=existing>-1?reviews[existing].createdAt:new Date().toISOString();
  const record={id,uid:window.currentUser.uid,itemKey:key,item:compactItem(item),text,rating:ratings[key]||null,spoiler,createdAt:created,updatedAt:new Date().toISOString(),user:publicProfileSnapshot()};
  if(existing>-1) reviews[existing]=record; else reviews.unshift(record);
  if(window.db) await window.setDoc(window.doc(window.db,'reviews',id),record,{merge:true});
  addActivity('reviewed',item,{text:text.slice(0,240),rating:record.rating,reviewId:id}); await saveData(); showActionStatus('Review posted'); loadCommunityReviews(item);
}
function displayWatchlist() { if(!moviesGrid)return; watchlist.length?displayItems(watchlist):moviesGrid.innerHTML='<div class="col-12 text-center text-muted py-5">Your watchlist is empty.</div>'; }
function displayDiary() {
  if(!moviesGrid)return; moviesGrid.innerHTML=''; if(!diary.length){moviesGrid.innerHTML='<div class="col-12 text-center text-muted py-5">No diary entries yet.</div>';return;}
  diary.forEach(d=>{const c=document.createElement('div');c.className='col-12';c.innerHTML=`<div class="diary-card d-flex gap-3 align-items-center"><img src="${d.item.poster_path?IMAGE_BASE_URL+d.item.poster_path:'https://placehold.co/80x120'}" style="width:58px;height:86px;object-fit:cover;border-radius:7px"><div class="flex-grow-1"><div class="fw-bold">${d.item.title}</div><div class="activity-meta"><i class="fa-regular fa-calendar me-1"></i>${d.watchedDate}${d.rating?' · ⭐ '+d.rating+'/5':''}</div></div><button class="btn btn-outline-info btn-sm">View</button></div>`; c.querySelector('button').onclick=()=>openMovieDetails(d.item.id,d.item.media_type);moviesGrid.appendChild(c);});
}
async function displayActivityFeed() {
  if(!moviesGrid)return; moviesGrid.innerHTML='<div class="col-12 text-center py-5"><div class="spinner-border text-info"></div></div>';
  if(!window.currentUser||!window.db){moviesGrid.innerHTML='<div class="col-12 text-center text-muted py-5">Sign in to see activity from people you follow.</div>';return;}
  const all=await getCollection('activities'); let feed=all.filter(a=>followingList.includes(a.uid)||a.uid===window.currentUser.uid).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  let filter='all',shown=20; const verbs={watched:'watched',episode:'watched an episode of',favorite:'favorited',rated:'rated',watchlist:'added to watchlist',logged:'logged',reviewed:'reviewed'};
  const render=()=>{moviesGrid.innerHTML='';const controls=document.createElement('div');controls.className='col-12 col-lg-8 mx-auto';controls.innerHTML='<div class="d-flex gap-2 flex-wrap mb-3"><button class="btn btn-info btn-sm feed-filter" data-f="all">All</button><button class="btn btn-outline-info btn-sm feed-filter" data-f="reviewed">Reviews</button><button class="btn btn-outline-info btn-sm feed-filter" data-f="rated">Ratings</button><button class="btn btn-outline-info btn-sm feed-filter" data-f="episode">Episodes</button></div>';moviesGrid.appendChild(controls);controls.querySelectorAll('.feed-filter').forEach(b=>b.onclick=()=>{filter=b.dataset.f;shown=20;render();});const rows=(filter==='all'?feed:feed.filter(a=>a.type===filter));if(!rows.length){moviesGrid.innerHTML+='<div class="col-12 text-center text-muted py-5">Follow people to build your activity feed.</div>';return;}rows.slice(0,shown).forEach(a=>{const c=document.createElement('div');c.className='col-12 col-lg-8 mx-auto';const extra=a.type==='rated'?` · ⭐ ${a.extra?.rating}/5`:'';const review=a.type==='reviewed'?`<div class="review-text mt-2">“${escapeHtml(a.extra?.text||'')}”</div>`:'';c.innerHTML=`<div class="feed-card"><div class="d-flex gap-2"><img class="rounded-circle feed-avatar" src="${a.user?.avatar||'https://placehold.co/80'}"><div class="flex-grow-1"><div><strong>${escapeHtml(a.user?.displayName||a.user?.username||'User')}</strong> <span class="text-secondary">${verbs[a.type]||a.type}</span> <button class="btn btn-link text-info p-0 fw-bold item-link">${escapeHtml(a.item?.title||'')}</button>${extra}</div><div class="activity-meta">${new Date(a.createdAt).toLocaleString()}</div>${review}</div></div></div>`;c.querySelector('.item-link').onclick=()=>openMovieDetails(a.item.id,a.item.media_type);moviesGrid.appendChild(c);});if(shown<rows.length){const more=document.createElement('div');more.className='col-12 col-lg-8 mx-auto text-center';more.innerHTML='<button class="btn btn-outline-info">Load more</button>';more.firstChild.onclick=()=>{shown+=20;render();};moviesGrid.appendChild(more);}}; render();
}
async function displayUpNext() {
  if(!moviesGrid)return; moviesGrid.innerHTML='<div class="col-12 text-center py-5"><div class="spinner-border text-info"></div></div>';
  const ids=[...new Set(watchedEpisodes.map(k=>k.split('_')[0]))]; if(!ids.length){moviesGrid.innerHTML='<div class="col-12 text-center text-muted py-5">Mark TV episodes as watched and your next episodes will appear here.</div>';return;}
  const cards=[];
  for(const id of ids.slice(0,30)) { try { const show=await fetch(`${BASE_URL}/tv/${id}?api_key=${API_KEY}&language=en-US`).then(r=>r.json()); let next=null; for(const season of (show.seasons||[]).filter(s=>s.season_number>0)) { const sd=await fetch(`${BASE_URL}/tv/${id}/season/${season.season_number}?api_key=${API_KEY}&language=en-US`).then(r=>r.json()); next=(sd.episodes||[]).find(ep=>!watchedEpisodes.includes(`${id}_S${season.season_number}_E${ep.episode_number}`)); if(next){cards.push({show,season:season.season_number,ep:next});break;} } } catch(e){console.error(e);} }
  moviesGrid.innerHTML=''; if(!cards.length){moviesGrid.innerHTML='<div class="col-12 text-center text-muted py-5">You are all caught up 🎉</div>';return;}
  cards.forEach(x=>{const c=document.createElement('div');c.className='col-12 col-md-6'; const img=x.ep.still_path?IMAGE_BASE_URL+x.ep.still_path:'https://placehold.co/500x280'; c.innerHTML=`<div class="upnext-card h-100"><img src="${img}" class="w-100 rounded mb-2" style="aspect-ratio:16/9;object-fit:cover"><div class="text-info small">${escapeHtml(x.show.name)} · S${x.season}E${x.ep.episode_number}</div><div class="fw-bold">${escapeHtml(x.ep.name||'Episode')}</div><div class="activity-meta mt-1">${x.ep.air_date||''}</div><button class="btn btn-success btn-sm mt-2"><i class="fa-solid fa-check me-1"></i>Mark watched</button></div>`; c.querySelector('button').onclick=()=>{toggleWatchedEp(`${x.show.id}_S${x.season}_E${x.ep.episode_number}`,c.querySelector('button'));displayUpNext();};moviesGrid.appendChild(c);});
}
function escapeHtml(v=''){return String(v).replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));}


// ==========================================
// 7️⃣ Community + lists + calendar + stats + recommendations + notifications
// ==========================================
function publicProfileSnapshot(){return {uid:window.currentUser?.uid||'',username:userProfileData?.username||'',displayName:userProfileData?.displayName||window.currentUser?.displayName||'',avatar:userProfileData?.avatar||window.currentUser?.photoURL||''};}
function safeId(v){return String(v).replace(/[^a-zA-Z0-9_-]/g,'_');}
async function getCollection(name){if(!window.db)return[];const snap=await window.getDocs(window.collection(window.db,name));const rows=[];snap.forEach(d=>rows.push({...d.data(),_id:d.id}));return rows;}
async function createNotification(targetUid,type,payload={}){if(!window.db||!window.currentUser||targetUid===window.currentUser.uid)return;const id=`${Date.now()}_${Math.random().toString(36).slice(2,8)}`;await window.setDoc(window.doc(window.db,'notifications',id),{id,targetUid,actorUid:window.currentUser.uid,type,payload,read:false,createdAt:new Date().toISOString()}).catch(console.error);}

async function loadCommunityReviews(item){
 const box=document.getElementById('communityReviews'); if(!box||!window.db)return; box.innerHTML='<div class="text-center py-3"><div class="spinner-border spinner-border-sm text-info"></div></div>';
 const all=await getCollection('reviews'); const rows=all.filter(r=>r.itemKey===itemKey(item)).sort((a,b)=>new Date(b.updatedAt||b.createdAt)-new Date(a.updatedAt||a.createdAt)); box.innerHTML='';
 document.getElementById('toggle-spoilers-btn').onclick=()=>{showSpoilers=!showSpoilers;document.getElementById('toggle-spoilers-btn').textContent=showSpoilers?'Hide spoilers':'Show spoilers';loadCommunityReviews(item);};
 if(!rows.length){box.innerHTML='<div class="text-muted py-3">No community reviews yet.</div>';return;}
 for(const r of rows){const likes=(await getCollection('reviewLikes')).filter(x=>x.reviewId===r.id);const comments=(await getCollection('reviewComments')).filter(x=>x.reviewId===r.id).sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));const hidden=r.spoiler&&!showSpoilers;const wrap=document.createElement('div');wrap.className='community-review mb-3';wrap.innerHTML=`<div class="d-flex gap-2"><img class="rounded-circle feed-avatar" src="${r.user?.avatar||'https://placehold.co/80'}"><div class="flex-grow-1"><div class="fw-bold">${escapeHtml(r.user?.displayName||r.user?.username||'User')} ${r.rating?'⭐ '+r.rating+'/5':''}</div><div class="review-text ${hidden?'spoiler-hidden':''}">${hidden?'Spoiler hidden — use Show spoilers to reveal.':escapeHtml(r.text)}</div><div class="mt-2 d-flex gap-2"><button class="btn btn-outline-info btn-sm like-review">♥ ${likes.length}</button><button class="btn btn-outline-secondary btn-sm toggle-comments">Comments ${comments.length}</button></div><div class="comments-box mt-2 d-none"></div></div></div>`;
 const commentsBox=wrap.querySelector('.comments-box'); commentsBox.innerHTML=comments.map(c=>`<div class="comment-row ${c.parentId?'ms-3':''}"><strong>${escapeHtml(c.user?.displayName||c.user?.username||'User')}</strong>: ${c.spoiler&&!showSpoilers?'[spoiler]':escapeHtml(c.text)} <button class="btn btn-link btn-sm p-0 reply-comment" data-id="${c.id}">Reply</button></div>`).join('')+`<div class="input-group input-group-sm mt-2"><input class="form-control bg-dark text-white border-secondary comment-input" placeholder="Comment or reply..."><button class="btn btn-info add-comment">Send</button></div>`;commentsBox.querySelectorAll('.reply-comment').forEach(btn=>btn.onclick=()=>{commentsBox.dataset.replyTo=btn.dataset.id;const input=commentsBox.querySelector('.comment-input');input.placeholder='Replying to comment…';input.focus();});
 wrap.querySelector('.toggle-comments').onclick=()=>commentsBox.classList.toggle('d-none');
 wrap.querySelector('.like-review').onclick=async()=>{if(!requireLogin())return;const id=`${window.currentUser.uid}_${safeId(r.id)}`,ref=window.doc(window.db,'reviewLikes',id),mine=likes.some(x=>x.uid===window.currentUser.uid);if(mine&&window.deleteDoc)await window.deleteDoc(ref);else{await window.setDoc(ref,{id,reviewId:r.id,uid:window.currentUser.uid,createdAt:new Date().toISOString()});await createNotification(r.uid,'review_like',{reviewId:r.id,item:r.item,from:publicProfileSnapshot()});}loadCommunityReviews(item);};
 wrap.querySelector('.add-comment').onclick=async()=>{if(!requireLogin())return;const input=wrap.querySelector('.comment-input'),text=input.value.trim();if(!text)return;const id=`${Date.now()}_${window.currentUser.uid}`;await window.setDoc(window.doc(window.db,'reviewComments',id),{id,reviewId:r.id,uid:window.currentUser.uid,parentId:commentsBox.dataset.replyTo||null,text,spoiler:false,user:publicProfileSnapshot(),createdAt:new Date().toISOString()});await createNotification(r.uid,'review_comment',{reviewId:r.id,item:r.item,from:publicProfileSnapshot()});loadCommunityReviews(item);};
 box.appendChild(wrap);
 }
}

async function displayGlobalReviews(){if(!moviesGrid)return;moviesGrid.innerHTML='<div class="col-12 text-center py-5"><div class="spinner-border text-info"></div></div>';const rows=(await getCollection('reviews')).sort((a,b)=>new Date(b.updatedAt||b.createdAt)-new Date(a.updatedAt||a.createdAt));moviesGrid.innerHTML='';if(!rows.length){moviesGrid.innerHTML='<div class="col-12 text-muted text-center py-5">No reviews yet.</div>';return;}rows.slice(0,100).forEach(r=>{const c=document.createElement('div');c.className='col-12 col-lg-8 mx-auto';c.innerHTML=`<div class="feed-card"><div class="d-flex gap-3"><img src="${r.item?.poster_path?IMAGE_BASE_URL+r.item.poster_path:'https://placehold.co/80x120'}" class="mini-poster"><div><div class="fw-bold">${escapeHtml(r.item?.title||'')} ${r.rating?'⭐ '+r.rating+'/5':''}</div><div class="activity-meta">by @${escapeHtml(r.user?.username||'user')}</div><div class="review-text mt-2">${r.spoiler?'⚠ Spoiler · ':''}${escapeHtml(r.text)}</div></div></div></div>`;c.onclick=()=>openMovieDetails(r.item.id,r.item.media_type);moviesGrid.appendChild(c);});}

window.createCustomList=async function(){if(!requireLogin())return;const name=document.getElementById('list-name').value.trim(),description=document.getElementById('list-description').value.trim(),isPrivate=document.getElementById('list-private').checked;if(!name)return;const id=`${window.currentUser.uid}_${Date.now()}`,row={id,uid:window.currentUser.uid,name,description,isPrivate,items:[],likes:0,user:publicProfileSnapshot(),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};customLists.unshift(row);await window.setDoc(window.doc(window.db,'lists',id),row);await saveData();bootstrap.Modal.getInstance(document.getElementById('createListModal'))?.hide();displayLists();};
async function displayLists(){if(!moviesGrid)return;moviesGrid.innerHTML=`<div class="col-12"><button class="btn btn-info mb-3" data-bs-toggle="modal" data-bs-target="#createListModal"><i class="fa-solid fa-plus me-1"></i>Create list</button></div>`;if(!window.db)return;const publicSnap=await window.getDocs(window.query(window.collection(window.db,'lists'),window.where('isPrivate','==',false)));let rows=[];publicSnap.forEach(d=>rows.push(d.data()));if(window.currentUser){const mine=await window.getDocs(window.query(window.collection(window.db,'lists'),window.where('uid','==',window.currentUser.uid)));mine.forEach(d=>{if(!rows.some(x=>x.id===d.data().id))rows.push(d.data());});}rows.sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));if(!rows.length)moviesGrid.innerHTML+='<div class="col-12 text-muted">No lists yet.</div>';for(const l of rows){const likes=(await getCollection('listLikes')).filter(x=>x.listId===l.id);const c=document.createElement('div');c.className='col-12 col-md-6';c.innerHTML=`<div class="feed-card h-100"><div class="d-flex justify-content-between"><h5>${escapeHtml(l.name)}</h5><span class="badge text-bg-secondary">${(l.items||[]).length}</span></div><p class="text-secondary small">${escapeHtml(l.description||'')}</p><div class="activity-meta">@${escapeHtml(l.user?.username||'user')} ${l.isPrivate?'· Private':''}</div><div class="mt-2 d-flex flex-wrap gap-1"><button class="btn btn-outline-info btn-sm open-list">Open</button><button class="btn btn-outline-secondary btn-sm like-list">♥ ${likes.length}</button><button class="btn btn-outline-secondary btn-sm share-list">Share</button>${l.uid!==window.currentUser?.uid?'<button class="btn btn-outline-light btn-sm clone-list">Clone</button>':''}${l.uid===window.currentUser?.uid?'<button class="btn btn-outline-danger btn-sm delete-list">Delete</button>':''}</div></div>`;c.querySelector('.open-list').onclick=()=>openList(l);c.querySelector('.like-list').onclick=async()=>{if(!requireLogin())return;const id=`${window.currentUser.uid}_${safeId(l.id)}`,ref=window.doc(window.db,'listLikes',id),mine=likes.some(x=>x.uid===window.currentUser.uid);if(mine&&window.deleteDoc)await window.deleteDoc(ref);else{await window.setDoc(ref,{id,listId:l.id,uid:window.currentUser.uid,createdAt:new Date().toISOString()});await createNotification(l.uid,'list_like',{listId:l.id,from:publicProfileSnapshot()});}displayLists();};c.querySelector('.share-list').onclick=()=>shareList(l);c.querySelector('.clone-list')?.addEventListener('click',()=>cloneList(l));c.querySelector('.delete-list')?.addEventListener('click',async()=>{await window.deleteDoc(window.doc(window.db,'lists',l.id));customLists=customLists.filter(x=>x.id!==l.id);saveData();displayLists();});moviesGrid.appendChild(c);}}

async function openList(l){sectionTitle.textContent=l.name;moviesGrid.innerHTML='';const comments=(await getCollection('listComments')).filter(x=>x.listId===l.id).sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));const controls=document.createElement('div');controls.className='col-12';controls.innerHTML=`<div class="feed-card mb-3"><p>${escapeHtml(l.description||'')}</p>${l.uid===window.currentUser?.uid?'<div class="input-group mb-3"><input id="list-add-search" class="form-control bg-dark text-white border-secondary" placeholder="Search TMDB to add..."><button class="btn btn-info" id="list-add-btn">Search</button></div>':''}<div class="mt-3"><h6>Comments</h6>${comments.map(c=>`<div class="comment-row"><strong>${escapeHtml(c.user?.displayName||c.user?.username||'User')}</strong>: ${escapeHtml(c.text)}</div>`).join('')}<div class="input-group input-group-sm mt-2"><input id="list-comment-input" class="form-control bg-dark text-white border-secondary" placeholder="Comment..."><button id="list-comment-btn" class="btn btn-info">Send</button></div></div></div>`;moviesGrid.appendChild(controls);(l.items||[]).forEach(i=>{const c=document.createElement('div');c.className='col-6 col-md-3';c.innerHTML=`<div class="movie-card"><img class="movie-poster" src="${i.poster_path?IMAGE_BASE_URL+i.poster_path:'https://placehold.co/300x450'}"><div class="p-2 fw-bold small">${escapeHtml(i.title)}</div></div>`;c.onclick=()=>openMovieDetails(i.id,i.media_type);moviesGrid.appendChild(c);});document.getElementById('list-comment-btn').onclick=async()=>{if(!requireLogin())return;const input=document.getElementById('list-comment-input'),text=input.value.trim();if(!text)return;const id=`${Date.now()}_${window.currentUser.uid}`;await window.setDoc(window.doc(window.db,'listComments',id),{id,listId:l.id,uid:window.currentUser.uid,text,user:publicProfileSnapshot(),createdAt:new Date().toISOString()});await createNotification(l.uid,'list_comment',{listId:l.id,from:publicProfileSnapshot()});openList(l);};if(l.uid===window.currentUser?.uid)document.getElementById('list-add-btn').onclick=async()=>{const q=document.getElementById('list-add-search').value.trim();if(!q)return;const data=await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(q)}&language=en-US`).then(r=>r.json());const choice=(data.results||[]).find(x=>x.media_type==='movie'||x.media_type==='tv');if(!choice)return;l.items=[...(l.items||[]),compactItem(choice)];l.updatedAt=new Date().toISOString();await window.setDoc(window.doc(window.db,'lists',l.id),l,{merge:true});openList(l);};}
async function shareList(l){const text=`${l.name} — ${l.description||''}`;if(navigator.share){try{await navigator.share({title:l.name,text});return;}catch(e){}}if(navigator.clipboard){await navigator.clipboard.writeText(text);alert('List copied to clipboard.');}}
async function cloneList(l){if(!requireLogin())return;const id=`${window.currentUser.uid}_${Date.now()}`,copy={...l,id,uid:window.currentUser.uid,name:`${l.name} (copy)`,isPrivate:false,user:publicProfileSnapshot(),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};await window.setDoc(window.doc(window.db,'lists',id),copy);displayLists();}

async function displayReleaseCalendar(){if(!moviesGrid)return;moviesGrid.innerHTML='<div class="col-12 text-center py-5"><div class="spinner-border text-info"></div></div>';const ids=[...new Set(watchedEpisodes.map(k=>k.split('_')[0]))];const events=[];const today=new Date(),max=new Date(Date.now()+14*86400000);for(const id of ids.slice(0,25)){try{const show=await fetch(`${BASE_URL}/tv/${id}?api_key=${API_KEY}&language=en-US`).then(r=>r.json());const season=show.next_episode_to_air?.season_number;if(show.next_episode_to_air){const d=new Date(show.next_episode_to_air.air_date);if(d>=today&&d<=max)events.push({show,ep:show.next_episode_to_air});}else if(season){}}catch(e){}}events.sort((a,b)=>new Date(a.ep.air_date)-new Date(b.ep.air_date));moviesGrid.innerHTML='';if(!events.length){moviesGrid.innerHTML='<div class="col-12 text-center text-muted py-5">No tracked releases in the next 14 days.</div>';return;}events.forEach(x=>{const c=document.createElement('div');c.className='col-12 col-md-6';c.innerHTML=`<div class="upnext-card"><div class="text-info">${new Date(x.ep.air_date).toLocaleDateString()}</div><div class="fw-bold">${escapeHtml(x.show.name)}</div><div class="text-secondary">S${x.ep.season_number}E${x.ep.episode_number} · ${escapeHtml(x.ep.name||'Episode')}</div></div>`;moviesGrid.appendChild(c);});}

async function displayStats(){if(!moviesGrid)return;moviesGrid.innerHTML='<div class="col-12 text-center py-5"><div class="spinner-border text-info"></div></div>';const totalEps=watchedEpisodes.length,totalMovies=watchedList.length,reviewCount=reviews.length,diaryCount=diary.length,rv=Object.values(ratings).map(Number),avg=rv.length?(rv.reduce((a,b)=>a+b,0)/rv.length).toFixed(1):'—';const months={},years={},days=[];diary.forEach(d=>{const date=d.watchedDate||'';if(!date)return;const m=date.slice(0,7),y=date.slice(0,4);months[m]=(months[m]||0)+1;years[y]=(years[y]||0)+1;days.push(date);});const uniqueDays=[...new Set(days)].sort();let streak=0,best=0,prev=null;for(const ds of uniqueDays){const d=new Date(ds+'T00:00:00');if(prev&&((d-prev)/86400000===1))streak++;else streak=1;best=Math.max(best,streak);prev=d;}const genres={},people={};let minutes=totalEps*45;for(const log of diary.slice(0,25)){try{const type=log.item?.media_type||'movie';const d=await fetch(`${BASE_URL}/${type}/${log.item.id}?api_key=${API_KEY}&language=en-US&append_to_response=credits`).then(r=>r.json());minutes+=Number(d.runtime||0);(d.genres||[]).forEach(g=>genres[g.name]=(genres[g.name]||0)+1);(d.credits?.crew||[]).filter(x=>x.job==='Director').forEach(x=>people[x.name]=(people[x.name]||0)+1);(d.credits?.cast||[]).slice(0,3).forEach(x=>people[x.name]=(people[x.name]||0)+1);}catch(e){}}const top=(obj,n=5)=>Object.entries(obj).sort((a,b)=>b[1]-a[1]).slice(0,n);const trackedShows=new Set(watchedEpisodes.map(k=>k.split('_')[0])).size;const completion=trackedShows?Math.min(100,Math.round((totalEps/(totalEps+trackedShows*5))*100)):0;moviesGrid.innerHTML=`<div class="col-12"><div class="stats-grid"><div class="stat-card"><b>${totalMovies}</b><span>Movies watched</span></div><div class="stat-card"><b>${totalEps}</b><span>Episodes watched</span></div><div class="stat-card"><b>${Math.round(minutes/60)}</b><span>Hours watched</span></div><div class="stat-card"><b>${best}</b><span>Best logging streak</span></div><div class="stat-card"><b>${avg}</b><span>Average rating</span></div><div class="stat-card"><b>${completion}%</b><span>TV completion estimate</span></div></div></div><div class="col-md-6"><div class="feed-card"><h5>Top genres</h5>${top(genres).map(([k,v])=>`<div class="d-flex justify-content-between py-1"><span>${escapeHtml(k)}</span><b>${v}</b></div>`).join('')||'<span class="text-muted">Not enough data.</span>'}</div></div><div class="col-md-6"><div class="feed-card"><h5>Actors / directors</h5>${top(people).map(([k,v])=>`<div class="d-flex justify-content-between py-1"><span>${escapeHtml(k)}</span><b>${v}</b></div>`).join('')||'<span class="text-muted">Not enough data.</span>'}</div></div><div class="col-md-6"><div class="feed-card"><h5>Monthly activity</h5>${Object.entries(months).sort().slice(-12).map(([m,n])=>`<div class="d-flex justify-content-between border-bottom border-secondary py-2"><span>${m}</span><b>${n}</b></div>`).join('')||'<span class="text-muted">No diary data.</span>'}</div></div><div class="col-md-6"><div class="feed-card"><h5>Yearly activity</h5>${Object.entries(years).sort().map(([y,n])=>`<div class="d-flex justify-content-between border-bottom border-secondary py-2"><span>${y}</span><b>${n}</b></div>`).join('')||'<span class="text-muted">No diary data.</span>'}</div></div><div class="col-12"><div class="feed-card"><div class="d-flex justify-content-between"><span>Reviews</span><b>${reviewCount}</b></div><div class="d-flex justify-content-between"><span>Diary logs</span><b>${diaryCount}</b></div></div></div>`;}

async function displayRecommendations(){if(!moviesGrid)return;moviesGrid.innerHTML='<div class="col-12 text-center py-5"><div class="spinner-border text-info"></div></div>';const seeds=[...favorites,...watchlist].slice(0,8);let results=[];for(const item of seeds){try{const type=item.media_type||(item.title?'movie':'tv');const d=await fetch(`${BASE_URL}/${type}/${item.id}/recommendations?api_key=${API_KEY}&language=en-US&page=1`).then(r=>r.json());results.push(...(d.results||[]).map(x=>({...x,media_type:type})));}catch(e){}}const seen=new Set([...watchedList.map(String),...favorites.map(x=>String(x.id))]);const uniq=[];for(const x of results.sort((a,b)=>(b.vote_average||0)-(a.vote_average||0))){const k=itemKey(x);if(!seen.has(String(x.id))&&!uniq.some(y=>itemKey(y)===k))uniq.push(x);}moviesGrid.innerHTML='';if(!uniq.length){moviesGrid.innerHTML='<div class="col-12 text-muted text-center py-5">Add favorites, ratings and watchlist titles to improve recommendations.</div>';return;}displayItems(uniq.slice(0,40));}

async function displayNotifications(){if(!moviesGrid)return;if(!requireLogin()){moviesGrid.innerHTML='';return;}const snap=await window.getDocs(window.query(window.collection(window.db,'notifications'),window.where('targetUid','==',window.currentUser.uid)));let rows=[];snap.forEach(d=>rows.push(d.data()));rows.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));moviesGrid.innerHTML='';if(!rows.length){moviesGrid.innerHTML='<div class="col-12 text-center text-muted py-5">No notifications.</div>';return;}for(const n of rows){const labels={follow:'started following you',review_like:'liked your review',review_comment:'commented on your review',episode_reply:'replied to your episode comment',list_like:'liked your list',list_comment:'commented on your list'};const c=document.createElement('div');c.className='col-12 col-lg-8 mx-auto';c.innerHTML=`<div class="feed-card ${n.read?'':'unread-notification'}"><strong>${escapeHtml(n.payload?.from?.displayName||n.payload?.from?.username||'Someone')}</strong> ${labels[n.type]||n.type}<div class="activity-meta">${new Date(n.createdAt).toLocaleString()}</div></div>`;c.onclick=async()=>{await window.setDoc(window.doc(window.db,'notifications',n.id),{read:true},{merge:true});c.firstChild.classList.remove('unread-notification');updateNotificationBadge();};moviesGrid.appendChild(c);}await updateNotificationBadge();}
async function updateNotificationBadge(){if(!window.currentUser||!window.db)return;const snap=await window.getDocs(window.query(window.collection(window.db,'notifications'),window.where('targetUid','==',window.currentUser.uid)));let count=0;snap.forEach(d=>{if(!d.data().read)count++;});const b=document.getElementById('notification-badge');if(b){b.textContent=count;b.classList.toggle('d-none',count===0);}}

async function openEpisodeCommunity(ctx){currentEpisodeContext=ctx;const key=`${ctx.tvId}_S${ctx.seasonNum}_E${ctx.episode.episode_number}`;document.getElementById('episode-community-title').textContent=`S${ctx.seasonNum}E${ctx.episode.episode_number} · ${ctx.episode.name}`;const bar=document.getElementById('episode-reaction-bar');const reactions=['🔥','😂','😭','🤯','❤️'];bar.innerHTML='';for(const emoji of reactions){const b=document.createElement('button');b.className='btn btn-outline-secondary btn-sm';b.textContent=emoji;b.onclick=async()=>{if(!requireLogin())return;const id=`${window.currentUser.uid}_${safeId(key)}_${encodeURIComponent(emoji)}`;await window.setDoc(window.doc(window.db,'episodeReactions',id),{id,episodeKey:key,uid:window.currentUser.uid,reaction:emoji,createdAt:new Date().toISOString()});renderEpisodeCommunity(key);};bar.appendChild(b);}if((ctx.episode.guest_stars||[]).length){const label=document.createElement('span');label.className='text-info small w-100';label.textContent='Favorite character / guest star:';bar.appendChild(label);for(const star of ctx.episode.guest_stars.slice(0,5)){const vb=document.createElement('button');vb.className='btn btn-outline-light btn-sm';vb.textContent=star.name;vb.onclick=async()=>{if(!requireLogin())return;const id=`${window.currentUser.uid}_${safeId(key)}`;await window.setDoc(window.doc(window.db,'episodeVotes',id),{id,episodeKey:key,uid:window.currentUser.uid,personId:star.id,personName:star.name,createdAt:new Date().toISOString()});renderEpisodeCommunity(key);};bar.appendChild(vb);}}document.getElementById('episode-comment-submit').onclick=async()=>{if(!requireLogin())return;const input=document.getElementById('episode-comment-text'),text=input.value.trim();if(!text)return;const id=`${Date.now()}_${window.currentUser.uid}`;await window.setDoc(window.doc(window.db,'episodeComments',id),{id,episodeKey:key,uid:window.currentUser.uid,text,spoiler:document.getElementById('episode-spoiler').checked,user:publicProfileSnapshot(),createdAt:new Date().toISOString()});input.value='';renderEpisodeCommunity(key);};await renderEpisodeCommunity(key);bootstrap.Modal.getOrCreateInstance(document.getElementById('episodeCommunityModal')).show();}
async function renderEpisodeCommunity(key){const feed=document.getElementById('episode-community-feed');const comments=(await getCollection('episodeComments')).filter(x=>x.episodeKey===key).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));const reacts=(await getCollection('episodeReactions')).filter(x=>x.episodeKey===key);const counts={};reacts.forEach(r=>counts[r.reaction]=(counts[r.reaction]||0)+1);document.querySelectorAll('#episode-reaction-bar button').forEach(b=>b.textContent=`${b.textContent.split(' ')[0]} ${counts[b.textContent.split(' ')[0]]||0}`);feed.innerHTML=comments.map(c=>`<div class="comment-row py-2"><strong>${escapeHtml(c.user?.displayName||c.user?.username||'User')}</strong><div>${c.spoiler&&!showSpoilers?'⚠ Spoiler hidden':escapeHtml(c.text)}</div><span class="activity-meta">${new Date(c.createdAt).toLocaleString()}</span></div>`).join('')||'<div class="text-muted">No comments yet.</div>';}

async function toggleFavoriteFour(item){if(!requireLogin())return;userProfileData.favoriteFour=userProfileData.favoriteFour||[];const key=itemKey(item),idx=userProfileData.favoriteFour.findIndex(x=>itemKey(x)===key);if(idx>-1)userProfileData.favoriteFour.splice(idx,1);else{if(userProfileData.favoriteFour.length>=4){alert('Favorite Four is full. Remove one first.');return;}userProfileData.favoriteFour.push(compactItem(item));}await window.setDoc(window.doc(window.db,'users',window.currentUser.uid),{favoriteFour:userProfileData.favoriteFour},{merge:true});setupSocialActions(item);}
function renderFavoriteFour(profile){const box=document.getElementById('profile-favorite-four');if(!box)return;const list=(profile.favoriteFour?.length?profile.favoriteFour:(profile.favorites||[]).slice(0,4));box.innerHTML='';list.slice(0,4).forEach(i=>{const c=document.createElement('div');c.className='col-3';c.innerHTML=`<img src="${i.poster_path?IMAGE_BASE_URL+i.poster_path:'https://placehold.co/200x300'}" class="w-100 rounded favorite-four-poster">`;c.onclick=()=>openMovieDetails(i.id,i.media_type||(i.title?'movie':'tv'));box.appendChild(c);});}
window.renderProfileSection=async function(type){if(!viewedProfileData)return;const box=document.getElementById('profile-watched-grid'),title=document.getElementById('profile-section-title');if(type==='watched'){title.textContent='Watched';return renderProfileWatchedCards(viewedProfileData);}if(type==='diary'){title.textContent='Diary';const rows=viewedProfileData.diary||[];box.innerHTML=rows.map(d=>`<div class="col-12"><div class="diary-card"><b>${escapeHtml(d.item?.title||'')}</b><div class="activity-meta">${d.watchedDate||''}</div></div></div>`).join('')||'<div class="text-muted">No diary entries.</div>';return;}if(type==='reviews'){title.textContent='Reviews';let rows=(await getCollection('reviews')).filter(r=>r.uid===viewedProfileData.uid);box.innerHTML=rows.map(r=>`<div class="col-12"><div class="feed-card"><b>${escapeHtml(r.item?.title||'')}</b><div class="review-text">${r.spoiler?'⚠ ':''}${escapeHtml(r.text)}</div></div></div>`).join('')||'<div class="text-muted">No reviews.</div>';return;}if(type==='lists'){title.textContent='Lists';const snap=await window.getDocs(window.query(window.collection(window.db,'lists'),window.where('uid','==',viewedProfileData.uid)));let rows=[];snap.forEach(d=>{const x=d.data();if(!x.isPrivate||viewedProfileData.uid===window.currentUser?.uid)rows.push(x);});box.innerHTML=rows.map(r=>`<div class="col-12"><div class="feed-card"><b>${escapeHtml(r.name)}</b><div class="activity-meta">${(r.items||[]).length} titles</div></div></div>`).join('')||'<div class="text-muted">No public lists.</div>';return;}if(type==='stats'){title.textContent='Stats';const p=viewedProfileData;box.innerHTML=`<div class="col-6"><div class="stat-card"><b>${(p.watchedList||[]).length}</b><span>Movies</span></div></div><div class="col-6"><div class="stat-card"><b>${(p.watchedEpisodes||[]).length}</b><span>Episodes</span></div></div>`;}}

// Browser notifications are useful immediately; true Firebase Cloud Messaging push still needs a Web Push certificate/VAPID key and server/Cloud Function sender.
async function enableBrowserNotifications(){if('Notification' in window&&Notification.permission==='default')await Notification.requestPermission();}
document.addEventListener('click',e=>{if(e.target.closest('#nav-notifications'))enableBrowserNotifications();});
setTimeout(()=>updateNotificationBadge().catch(()=>{}),2500);

loadCategory('trending');