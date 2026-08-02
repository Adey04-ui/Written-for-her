/**
 * For Her Gift — Creator Frontend
 * Handles event selection, dynamic follow-up fields, photo upload, API calls.
 */

let photoDataUrl = '';

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
  dynamicFields: document.getElementById('dynamic-fields'),
  sourceTag: document.getElementById('source-tag'),
};

// ====== DYNAMIC EVENT FIELDS ======
const EVENT_FIELDS = {
  anniversary: `
    <div class="form-row">
      <div class="form-group">
        <label for="inp-event-unit">Time Unit</label>
        <select id="inp-event-unit">
          <option value="years">Years</option>
          <option value="months">Months</option>
          <option value="days">Days</option>
        </select>
      </div>
      <div class="form-group">
        <label for="inp-event-count">How Many?</label>
        <input type="number" id="inp-event-count" placeholder="e.g. 2" min="1" max="99">
      </div>
    </div>
  `,
  birthday: `
    <div class="form-group">
      <label for="inp-event-count">How Old Is She Turning?</label>
      <input type="number" id="inp-event-count" placeholder="e.g. 25" min="1" max="120">
    </div>
  `,
};

function updateDynamicFields() {
  const event = document.querySelector('input[name="event"]:checked')?.value || 'girlfriend_day';
  const html = EVENT_FIELDS[event] || '';

  // Animate transition
  if (els.dynamicFields.innerHTML !== html) {
    els.dynamicFields.style.opacity = '0';
    setTimeout(() => {
      els.dynamicFields.innerHTML = html;
      els.dynamicFields.style.transition = 'opacity 0.3s ease';
      els.dynamicFields.style.opacity = '1';
    }, 150);
  }
}

// Attach event listeners to all radio buttons
document.querySelectorAll('input[name="event"]').forEach(radio => {
  radio.addEventListener('change', updateDynamicFields);
});

// Initialize
updateDynamicFields();

// ====== PHOTO UPLOAD ======
function handlePhoto(input) {
  const file = input.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showError('Please upload an image file (JPG, PNG, etc.)');
    return;
  }
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
  reader.onerror = () => showError('Failed to read photo. Please try another image.');
  reader.readAsDataURL(file);
}
window.handlePhoto = handlePhoto;

// ====== FORM SUBMISSION ======
async function createGift(event) {
  event.preventDefault();
  hideError();

  const name = document.getElementById('inp-name').value.trim();
  const met = document.getElementById('inp-met').value.trim();
  const place = document.getElementById('inp-place').value.trim();
  const favs = document.getElementById('inp-favs').value.trim();
  const memory = document.getElementById('inp-memory').value.trim();
  const vibe = document.querySelector('input[name="vibe"]:checked')?.value || 'dreamy';
  const from = document.getElementById('inp-from').value.trim();
  const eventType = document.querySelector('input[name="event"]:checked')?.value || 'girlfriend_day';

  // Dynamic fields
  const eventUnit = document.getElementById('inp-event-unit')?.value || '';
  const eventCount = document.getElementById('inp-event-count')?.value || '';

  if (!name) {
    shakeField(document.getElementById('inp-name'));
    showError('Please enter her name 💕');
    return;
  }

  setLoading(true);
  els.result.classList.remove('show');

  try {
    const response = await fetch('/api/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, met, place, favs, memory, vibe, from,
        event: eventType,
        eventUnit,
        eventCount,
        photo: photoDataUrl,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Something went wrong.');

    const fullUrl = `${window.location.origin}${data.url}`;
    els.resultUrl.value = fullUrl;
    els.preview.textContent = data.preview || '';

    // Show which AI generated it
    const sourceLabels = {
      openai: '🤖 OpenAI GPT-4o',
      anthropic: '🤖 Anthropic Claude',
      gemini: '🤖 Google Gemini',
      huggingface: '⚡ Hugging Face (Free)',
      nlg: '✨ Smart Generator',
    };
    els.sourceTag.textContent = sourceLabels[data.source] || '✨ AI Generated';
    els.sourceTag.style.display = 'inline-block';

    els.result.classList.add('show');
    els.result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (err) {
    console.error('Create error:', err);
    showError(err.message || 'Failed to create gift. Please try again.');
  } finally {
    setLoading(false);
  }
}

function copyUrl() {
  const url = els.resultUrl.value;
  if (!url) return;
  navigator.clipboard.writeText(url).then(() => {
    const original = els.copyBtn.textContent;
    els.copyBtn.textContent = 'Copied! ✨';
    setTimeout(() => els.copyBtn.textContent = original, 2000);
  }).catch(() => {
    els.resultUrl.select();
    document.execCommand('copy');
    els.copyBtn.textContent = 'Copied! ✨';
    setTimeout(() => els.copyBtn.textContent = 'Copy Link', 2000);
  });
}
window.copyUrl = copyUrl;

// ====== UI HELPERS ======
function setLoading(loading) {
  els.submitBtn.disabled = loading;
  els.spinner.style.display = loading ? 'inline-block' : 'none';
  els.btnText.textContent = loading ? 'Creating her gift...' : '✨ Create Her Gift';
}
function showError(msg) { els.error.textContent = msg; els.error.classList.add('show'); }
function hideError() { els.error.classList.remove('show'); }
function shakeField(el) {
  el.style.animation = 'none';
  el.offsetHeight;
  el.style.animation = 'shake 0.4s ease';
  setTimeout(() => el.style.animation = '', 400);
}

els.form.addEventListener('submit', createGift);

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
