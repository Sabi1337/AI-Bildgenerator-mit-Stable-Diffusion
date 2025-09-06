(() => {
  const $  = (sel, ctx=document) => ctx.querySelector(sel);
  const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));
  const byId = (id) => document.getElementById(id);

  const themeToggle   = byId('theme-toggle');
  const form          = byId('generate-form');
  const errorBanner   = byId('error-banner');
  const resultCard    = byId('result-card');
  const resultImg     = byId('generated-image');
  const downloadLink  = byId('download-link');
  const submitBtn     = byId('submit-btn');

  const steps         = byId('steps');
  const stepsVal      = byId('steps-val');
  const widthInput    = byId('width');
  const heightInput   = byId('height');
  const promptInput   = byId('prompt');
  const negativeInput = byId('negative-prompt');
  const modelSelect   = byId('model');
  const samplerSelect = byId('sampler');

  const typeRadios    = $$("input[type='radio'][value='txt2img'], input[type='radio'][value='img2img']");
  const typeSelect    = byId('generation-type'); // falls vorhanden

  const img2imgWrap   = byId('img2img-wrap') || byId('image-input');
  const dropzone      = byId('dropzone');
  const imageInput    = byId('image') || byId('input-image');
  const preview       = byId('preview');
  const clearBtn      = byId('clear-image');

  const sdUrlInput    = byId('sd-api-url');
  const sdSaveBtn     = byId('sd-save');
  const sdHidden      = byId('sd-api-url-hidden');

  let lastPreviewURL = null;

  if (themeToggle) {
    const saved = localStorage.getItem('theme') || 'auto';
    const apply = (t) => { document.documentElement.dataset.theme = t; localStorage.setItem('theme', t); };
    apply(saved);
    themeToggle.addEventListener('click', () => {
      const cur = document.documentElement.dataset.theme;
      apply(cur === 'dark' ? 'light' : 'dark');
    });
  }

  const setError = (msg) => {
    if (!errorBanner) return;
    if (msg) { errorBanner.textContent = msg; errorBanner.hidden = false; }
    else     { errorBanner.hidden = true;  errorBanner.textContent = ''; }
  };

  const toggleLoading = (busy) => {
    if (!submitBtn) return;
    submitBtn.classList.toggle('loading', !!busy);
    submitBtn.disabled = !!busy;
  };

  const isMultipleOf64 = (n) => Number.isFinite(n) && n > 0 && n % 64 === 0;

  const getMode = () => {
    if (document.querySelector("input[type='radio'][value='img2img']:checked")) return 'img2img';
    if (document.querySelector("input[type='radio'][value='txt2img']:checked")) return 'txt2img';
    if (typeSelect) {
      const v = typeSelect.value;
      if (v === 'img2img' || v === 'txt2img') return v;
    }
    return 'txt2img';
  };

  const isImg2ImgMode = () => document.body.classList.contains('mode-img2img');

  const clearImageSelection = () => {
    if (!imageInput || !preview || !dropzone) return;
    imageInput.value = '';
    if (lastPreviewURL) { URL.revokeObjectURL(lastPreviewURL); lastPreviewURL = null; }
    preview.src = '';
    preview.hidden = true;
    dropzone.classList.remove('has-file');
  };

  const applyModeClass = () => {
    const mode = getMode();
    const imgMode = mode === 'img2img';
    document.body.classList.toggle('mode-img2img', imgMode);
    if (img2imgWrap && imageInput) imageInput.disabled = !imgMode;
    if (!imgMode) clearImageSelection();
  };

  if (steps && stepsVal) {
    stepsVal.textContent = steps.value;
    steps.addEventListener('input', () => (stepsVal.textContent = steps.value));
  }

  if (typeRadios.length) typeRadios.forEach(r => r.addEventListener('change', applyModeClass));
  if (typeSelect) typeSelect.addEventListener('change', applyModeClass);
  applyModeClass();

  const fileToPreview = (file) => {
    if (!file || !preview || !dropzone) return;
    const url = URL.createObjectURL(file);
    if (lastPreviewURL) URL.revokeObjectURL(lastPreviewURL);
    lastPreviewURL = url;
    preview.src = url;
    preview.hidden = false;
    dropzone.classList.add('has-file');
  };

  if (dropzone && imageInput) {
    const openFilePicker = () => { if (isImg2ImgMode()) imageInput.click(); };

    dropzone.addEventListener('click', () => { if (isImg2ImgMode()) openFilePicker(); });
    dropzone.addEventListener('keypress', (e) => {
      if (!isImg2ImgMode()) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFilePicker(); }
    });

    imageInput.addEventListener('change', (e) => fileToPreview(e.target.files[0]));

    ['dragenter','dragover'].forEach(ev =>
      dropzone.addEventListener(ev, (e) => {
        if (!isImg2ImgMode()) return;
        e.preventDefault();
        dropzone.classList.add('dragover');
      })
    );
    ['dragleave','drop'].forEach(ev =>
      dropzone.addEventListener(ev, (e) => {
        if (!isImg2ImgMode()) return;
        e.preventDefault();
        dropzone.classList.remove('dragover');
      })
    );
    dropzone.addEventListener('drop', (e) => {
      if (!isImg2ImgMode()) return;
      const file = e.dataTransfer?.files?.[0];
      if (file) { imageInput.files = e.dataTransfer.files; fileToPreview(file); }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      clearImageSelection();
    });
  }

  (() => {
    const serverVal  = (sdHidden?.value || '').trim();
    const storedVal  = (localStorage.getItem('sdApiUrl') || '').trim();
    const effective  = serverVal || storedVal;

    if (effective) {
      if (sdUrlInput) sdUrlInput.value = effective;
      if (sdHidden)   sdHidden.value   = effective;
    }

    sdSaveBtn?.addEventListener('click', () => {
      const url = (sdUrlInput?.value || '').trim().replace(/\/+$/, '');
      if (!url) return;
      localStorage.setItem('sdApiUrl', url);
      if (sdHidden) sdHidden.value = url;

      const qp = new URLSearchParams(window.location.search);
      qp.set('sd_api_url', url);
      window.location.search = qp.toString();
    });
  })();

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      setError('');
      if (resultCard) resultCard.hidden = true;

      const w = parseInt((widthInput?.value || '0'), 10);
      const h = parseInt((heightInput?.value || '0'), 10);
      if (!isMultipleOf64(w) || !isMultipleOf64(h)) {
        return setError('Breite/Höhe müssen Vielfache von 64 sein.');
      }

      const imgMode = isImg2ImgMode();
      if (imgMode && (!imageInput || !imageInput.files || !imageInput.files.length)) {
        return setError('Bitte ein Quellbild auswählen (Bild→Bild).');
      }

      const fd = new FormData();
      fd.set('prompt', (promptInput?.value || '').trim());
      fd.set('negative-prompt', (negativeInput?.value || '').trim());
      if (modelSelect)   fd.set('model',   modelSelect.value);
      if (samplerSelect) fd.set('sampler', samplerSelect.value);
      fd.set('width',  String(w));
      fd.set('height', String(h));
      if (steps) fd.set('steps', steps.value);

      const sdUrlVal = ((sdHidden?.value || sdUrlInput?.value) || '').trim();
      if (sdUrlVal) fd.set('sd_api_url', sdUrlVal);

      if (imgMode && imageInput && imageInput.files[0]) {
        const file = imageInput.files[0];
        fd.set('image', file);
        fd.set('input-image', file);
        fd.set('input_image', file);
      }

      const url = imgMode ? '/generate_img2img' : '/generate_txt2img';

      toggleLoading(true);
      try {
        const resp = await fetch(url, { method: 'POST', body: fd });

        const raw = await resp.text();
        let data = {};
        try { data = JSON.parse(raw); } catch {}

        if (!resp.ok) {
          throw new Error(data?.error || `HTTP ${resp.status}`);
        }

        const mime = data?.mime || 'image/png';
        const serverUrl = data?.image_url;
        const b64 = data?.image_base64;

        let imageUrl = null;

        if (serverUrl) {
          imageUrl = serverUrl;
        } else if (b64) {
          const byteStr = atob(b64);
          const len = byteStr.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) bytes[i] = byteStr.charCodeAt(i);
          const blob = new Blob([bytes], { type: mime });

          if (window.__lastObjectUrl) URL.revokeObjectURL(window.__lastObjectUrl);
          imageUrl = URL.createObjectURL(blob);
          window.__lastObjectUrl = imageUrl;
        }

        if (!imageUrl) {
          throw new Error('Unbekanntes Antwortformat (image_url oder image_base64 fehlt).');
        }

        if (resultImg)    resultImg.src = imageUrl;
        if (downloadLink) {
          downloadLink.href = imageUrl;
          const ext = (mime.split('/')[1] || 'png').toLowerCase();
          downloadLink.download = `generated.${ext}`;
        }
        if (resultCard)   resultCard.hidden = false;

      } catch (err) {
        console.error(err);
        setError(`Fehler bei der Generierung: ${err.message || err}`);
      } finally {
        toggleLoading(false);
      }
    });
  }
})();
