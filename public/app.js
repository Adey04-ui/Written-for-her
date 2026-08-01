/**
 * For Her Gift — Creator Frontend
 * 
 * Handles form input, photo upload, API communication with the backend,
 * and displays the generated shareable URL.
 */

// ====== STATE ======
let photoDataUrl = '';

// ====== DOM ELEMENTS ======
const els = {
  form: document.getElementById('gift-form'),
  photoInput: document.getElementById('inp-photo'),
  photoPreview: document.getElementById('photo-preview'),
  photoPlaceholder: document.getElementById('photo-placeholder'),
  submitBtn: document.getElementById('submit-btn'),
  spinner: document.getElementById('spinner'),
  btnText: document.getElementById('btn-text'),
  result: document.getElementById('result'),
  resultUrl: document.getElementById('result-url'),
  copyBtn: document.getElementById('copy-btn'),
  preview: document.getElementById('preview-text'),
  error: document.getElementById('error'),
};

// ====== PHOTO UPLOAD ======
function handlePhoto(input) {
  const file = input.files[0];
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith('image/')) {
    showError('Please upload an image file (JPG, PNG, etc.)');
    return;
  }

  // Validate file size (max 3MB)
  if (file.size > 3 * 1024 * 1024) {
    showError('Photo too large. Please choose an image under 3MB.');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    photoDataUrl = e.target.result;
    els.photoPreview.src = photoDataUrl;
    els.photoPreview.style.display = 'block';
    els.photoPlaceholder.style.display = 'none';
    hideError();
  };
  reader.onerror = () => {
    showError('Failed to read photo. Please try another image.');
  };
  reader.readAsDataURL(file);
}

// Make handlePhoto globally accessible for the onclick handler
window.handlePhoto = handlePhoto;

// ====== FORM SUBMISSION ======
async function createGift(event) {
  event.preventDefault();
  hideError();

  // Collect form data
  const name = document.getElementById('inp-name').value.trim();
  const met = document.getElementById('inp-met').value.trim();
  const place = document.getElementById('inp-place').value.trim();
  const favs = document.getElementById('inp-favs').value.trim();
  const memory = document.getElementById('inp-memory').value.trim();
  const vibe = document.querySelector('input[name="vibe"]:checked')?.value || 'dreamy';
  const from = document.getElementById('inp-from').value.trim();

  // Validate
  if (!name) {
    shakeField(document.getElementById('inp-name'));
    showError('Please enter her name 💕');
    return;
  }

  // Show loading state
  setLoading(true);
  els.result.classList.remove('show');

  try {
    const response = await fetch('/api/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        met,
        place,
        favs,
        memory,
        vibe,
        from,
        photo: photoDataUrl,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Something went wrong. Please try again.');
    }

    // Build full URL
    const fullUrl = `${window.location.origin}${data.url}`;

    // Show result
    els.resultUrl.value = fullUrl;
    els.preview.textContent = data.preview || '';
    els.result.classList.add('show');

    // Scroll to result
    els.result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  } catch (err) {
    console.error('Create error:', err);
    showError(err.message || 'Failed to create gift. Please try again.');
  } finally {
    setLoading(false);
  }
}

// ====== COPY URL ======
function copyUrl() {
  const url = els.resultUrl.value;
  if (!url) return;

  navigator.clipboard.writeText(url).then(() => {
    const originalText = els.copyBtn.textContent;
    els.copyBtn.textContent = 'Copied! ✨';
    setTimeout(() => {
      els.copyBtn.textContent = originalText;
    }, 2000);
  }).catch(() => {
    // Fallback: select and copy
    els.resultUrl.select();
    document.execCommand('copy');
    els.copyBtn.textContent = 'Copied! ✨';
    setTimeout(() => {
      els.copyBtn.textContent = 'Copy Link';
    }, 2000);
  });
}

// Make copyUrl globally accessible
window.copyUrl = copyUrl;

// ====== UI HELPERS ======
function setLoading(loading) {
  els.submitBtn.disabled = loading;
  els.spinner.style.display = loading ? 'inline-block' : 'none';
  els.btnText.textContent = loading ? 'Creating her gift...' : '✨ Create Her Gift';
}

function showError(msg) {
  els.error.textContent = msg;
  els.error.classList.add('show');
}

function hideError() {
  els.error.classList.remove('show');
}

function shakeField(el) {
  el.style.animation = 'none';
  el.offsetHeight; // trigger reflow
  el.style.animation = 'shake 0.4s ease';
  setTimeout(() => { el.style.animation = ''; }, 400);
}

// ====== EVENT LISTENERS ======
els.form.addEventListener('submit', createGift);

// Add shake keyframe dynamically
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-6px); }
    40% { transform: translateX(6px); }
    60% { transform: translateX(-4px); }
    80% { transform: translateX(4px); }
  }
`;
document.head.appendChild(shakeStyle);
