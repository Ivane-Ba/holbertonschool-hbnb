document.addEventListener('DOMContentLoaded', async () => {
    const token = getTokenFromCookie();
    const placeId = getPlaceIdFromURL();

    // Affichage complet (place + reviews + formulaire)
    await fetchAndDisplayPlaceAndReviews(token, placeId);
});


function getPlaceIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}
function getTokenFromCookie() {
    const match = document.cookie.match(/(?:^|;\s*)access_token=([^;]+)/);
    return match ? match[1] : null;
}
function isAuthenticated() {
    return !!getTokenFromCookie();
}


function showReviewSuccess(msg) {
    const box = document.getElementById('review-message');
    box.innerHTML = `<span style="color:#22e082;font-weight:bold;">${msg}</span>`;
    box.style.display = 'block';
    setTimeout(() => {
        box.innerHTML = '';
        box.style.display = 'none';
    }, 3500);
}
function showReviewError(msg) {
    const box = document.getElementById('review-message');
    box.innerHTML = `<span style="color:#f55;font-weight:bold;">${msg}</span>`;
    box.style.display = 'block';
    setTimeout(() => {
        box.innerHTML = '';
        box.style.display = 'none';
    }, 5000);
}

// Fetch et rendu
async function fetchAndDisplayPlaceAndReviews(token, placeId) {
    const headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;

    let place = null, reviews = [];
    try {
        const res = await fetch(`http://127.0.0.1:5000/api/v1/places/${placeId}`, { headers });
        if (!res.ok) throw new Error("not found");
        place = await res.json();
    } catch { document.getElementById('place-details').innerHTML = '<div style="color:#f55;">Erreur chargement lieu.</div>'; return; }

    try {
        const res = await fetch(`http://127.0.0.1:5000/api/v1/reviews/by_place/${placeId}`, { headers });
        reviews = res.ok ? await res.json() : [];
    } catch { reviews = []; }

    displayPlaceDetails(place, reviews);
}

function displayPlaceDetails(place, reviews) {
    const container = document.getElementById('place-details');
    container.innerHTML = ''; // Clear

    // GALERIE D'IMAGES 
    let images = (place.images && place.images.length > 0)
      ? place.images
      : [{url: 'https://upload.wikimedia.org/wikipedia/commons/6/65/No-Image-Placeholder.svg'}];

    const gallery = document.createElement('div');
    gallery.className = 'place-image-gallery';

    // Image principale (index courant pour le modal)
    let currentImageIndex = 0;
    const mainImg = document.createElement('img');
    mainImg.src = images[0].url;
    mainImg.className = 'place-detail-img';
    mainImg.tabIndex = 0;
    mainImg.alt = place.title || 'Photo';
    mainImg.onclick = () => showModalImage(images, currentImageIndex);
    gallery.appendChild(mainImg);

    // Miniatures
    if (images.length > 1) {
        const thumbs = document.createElement('div');
        thumbs.className = 'place-thumbs';
        images.forEach((img, idx) => {
            const t = document.createElement('img');
            t.src = img.url;
            t.className = 'thumb-img' + (idx === 0 ? ' selected' : '');
            t.tabIndex = 0;
            t.onclick = () => {
                currentImageIndex = idx;
                mainImg.src = img.url;
                thumbs.querySelectorAll('.thumb-img').forEach(th => th.classList.remove('selected'));
                t.classList.add('selected');
            };
            t.onkeydown = (e) => { if (e.key === "Enter") t.onclick(); };
            thumbs.appendChild(t);
        });
        gallery.appendChild(thumbs);
    }
    container.appendChild(gallery);

    // INFOS 
    const title = document.createElement('h1');
    title.textContent = place.title || '(No Title)';
    container.appendChild(title);

    const desc = document.createElement('p');
    desc.innerHTML = `<b>Description:</b> ${place.description || ''}`;
    container.appendChild(desc);

    const price = document.createElement('p');
    price.innerHTML = `<b>Price:</b> $${place.price}`;
    container.appendChild(price);

    if (place.amenities && place.amenities.length > 0) {
        const amenities = document.createElement('div');
        amenities.className = 'amenities-list';
        amenities.innerHTML = '<b>Amenities:</b> ' +
            place.amenities.map(a => `<span class="tag">${a}</span>`).join(' ');
        container.appendChild(amenities);
    }

    // REVIEWS
    const reviewsSection = document.createElement('section');
    reviewsSection.className = 'reviews-section';
    reviewsSection.innerHTML = '<h2>Reviews</h2>';
    if (reviews && reviews.length > 0) {
        reviews.forEach(rv => {
            let name = "Utilisateur";
            if (rv.user_first_name) {
                name = rv.user_first_name;
                if (rv.user_last_name) name += " " + rv.user_last_name[0].toUpperCase() + ".";
            }
            const review = document.createElement('div');
            review.className = 'review-item';
            review.innerHTML = `
                <span class="review-author">${name}</span>
                <span class="review-rating">${'★'.repeat(rv.rating)}</span><br>
                <span>${rv.text}</span>
            `;
            reviewsSection.appendChild(review);
        });
    } else {
        reviewsSection.innerHTML += '<p style="text-align:center;">No reviews yet.</p>';
    }
    container.appendChild(reviewsSection);

    // FORMULAIRE ADD REVIEW 
    if (isAuthenticated()) {
        if (document.getElementById('add-review-form')) document.getElementById('add-review-form').remove();
        const addReviewSection = document.createElement('section');
        addReviewSection.className = 'add-review-section';
        addReviewSection.innerHTML = `
          <form id="add-review-form" class="form-card">
            <h2>Add a Review</h2>
            <label for="review">Your Review:</label>
            <textarea id="review" name="review" rows="4" required></textarea>
            <label for="rating">Rating:</label>
            <select id="rating" name="rating" required>
              <option value="" disabled selected>Select rating</option>
              <option value="5">⭐️⭐️⭐️⭐️⭐️</option>
              <option value="4">⭐️⭐️⭐️⭐️</option>
              <option value="3">⭐️⭐️⭐️</option>
              <option value="2">⭐️⭐️</option>
              <option value="1">⭐️</option>
            </select>
            <button type="submit">Submit Review</button>
            <div id="review-message" style="margin-top:12px;"></div>
          </form>
        `;
        container.appendChild(addReviewSection);

        document.getElementById('add-review-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const data = {
        text: this.review.value.trim(),
        rating: Number(this.rating.value),
        place_id: getPlaceIdFromURL()
    };
    try {
        const res = await fetch(`http://127.0.0.1:5000/api/v1/reviews/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + getTokenFromCookie()
            },
            body: JSON.stringify(data)
        });
        if (res.ok) {
    showReviewSuccess('Review added! Thank you for your feedback.');
    this.reset();
    // NE RECONSTRUIT PAS IMMEDIATEMENT — attend 2 secondes avant de refresh !
    setTimeout(() => {
        fetchAndDisplayPlaceAndReviews(getTokenFromCookie(), getPlaceIdFromURL());
    }, 3500); // laisse le message visible !
        } else {
            const err = await res.json();
            showReviewError(err.error || err.message || 'Error');
        }
    } catch {
        showReviewError('Network error.');
    }
});

    }
}

// ZOOM IMAGE avec flèches de défilement
function showModalImage(images, currentIndex) {
    if (!images || !images.length) return;
    const urls = images.map(img => (typeof img === 'string' ? img : img.url));
    let index = Math.max(0, Math.min(currentIndex, urls.length - 1));
    const hasMultiple = urls.length > 1;

    let modal = document.createElement('div');
    modal.className = 'modal-image-wrap';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-label', 'Galerie image');
    modal.innerHTML = `
      <button type="button" class="modal-arrow modal-arrow-left" aria-label="Image précédente" ${!hasMultiple ? 'disabled style="visibility:hidden"' : ''}>&#10094;</button>
      <div class="modal-image-container">
        <img src="${urls[index]}" alt="Photo ${index + 1}/${urls.length}" class="modal-image-main">
        <span class="modal-image-counter">${index + 1} / ${urls.length}</span>
      </div>
      <button type="button" class="modal-arrow modal-arrow-right" aria-label="Image suivante" ${!hasMultiple ? 'disabled style="visibility:hidden"' : ''}>&#10095;</button>
      <button type="button" class="modal-close" id="close-modal-img" aria-label="Fermer">&times;</button>
    `;
    document.body.appendChild(modal);

    const imgEl = modal.querySelector('.modal-image-main');
    const counterEl = modal.querySelector('.modal-image-counter');
    const btnPrev = modal.querySelector('.modal-arrow-left');
    const btnNext = modal.querySelector('.modal-arrow-right');

    function go(delta) {
        if (!hasMultiple) return;
        index = (index + delta + urls.length) % urls.length;
        imgEl.src = urls[index];
        imgEl.alt = `Photo ${index + 1}/${urls.length}`;
        counterEl.textContent = `${index + 1} / ${urls.length}`;
    }

    function close() {
        document.body.removeChild(modal);
        document.removeEventListener('keydown', onKey);
    }

    function onKey(e) {
        if (e.key === 'Escape') close();
        if (e.key === 'ArrowLeft') go(-1);
        if (e.key === 'ArrowRight') go(1);
    }

    modal.onclick = (e) => { if (e.target === modal) close(); };
    modal.querySelector('.modal-close').onclick = close;
    modal.querySelector('.modal-image-container').onclick = (e) => e.stopPropagation();
    btnPrev.onclick = (e) => { e.stopPropagation(); go(-1); };
    btnNext.onclick = (e) => { e.stopPropagation(); go(1); };
    document.addEventListener('keydown', onKey);
}
