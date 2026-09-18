const TOTAL_FRAMES = 390;
const LERP         = 0.04;
const CONCURRENCY  = 48;

const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent) || innerWidth < 768;
const FRAME_DIR = isMobile ? 'frames-mobile' : 'frames-webp';

const canvas = document.getElementById('gl-canvas');
const ctx = canvas.getContext('2d');
let canvasDpr = 1;

function resize() {
  canvasDpr = Math.min(devicePixelRatio || 1, isMobile ? 1.5 : 2);
  canvas.width  = innerWidth * canvasDpr;
  canvas.height = innerHeight * canvasDpr;
  canvas.style.width  = innerWidth + 'px';
  canvas.style.height = innerHeight + 'px';
  ctx.setTransform(canvasDpr, 0, 0, canvasDpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

const frames = new Array(TOTAL_FRAMES);
let loadedCount = 0;
let isReady = false;

function frameName(i) {
  return `${FRAME_DIR}/frame_${String(i + 1).padStart(6, '0')}.webp`;
}

async function loadAll() {
  const queue = Array.from({length: TOTAL_FRAMES}, (_, i) => i);
  async function worker() {
    while (queue.length) {
      const i = queue.shift();
      await new Promise(resolve => {
        const img = new Image();
        img.onload = img.onerror = () => {
          frames[i] = img;
          loadedCount++;
          if (loadedCount === 1) {
            isReady = true;
            startAnim();
          }
          resolve();
        };
        img.src = frameName(i);
      });
    }
  }
  await Promise.all(Array.from({length: CONCURRENCY}, worker));
}

let currentFrame = 0;
let targetFrame  = 0;

window.addEventListener('scroll', () => {
  if (!isReady) return;
  const maxScroll = document.documentElement.scrollHeight - innerHeight;
  const progress  = maxScroll > 0 ? scrollY / maxScroll : 0;
  targetFrame = progress * (TOTAL_FRAMES - 1);
}, { passive: true });

function drawFrame(idx) {
  const img = frames[Math.max(0, Math.min(idx, TOTAL_FRAMES - 1))];
  if (!img || !img.complete) return;
  
  const W = innerWidth;
  const H = innerHeight;
  
  const r  = Math.max(W / img.naturalWidth, H / img.naturalHeight);
  const iw = img.naturalWidth * r;
  const ih = img.naturalHeight * r;
  const x  = (W - iw) / 2;
  const y  = (H - ih) / 2;
  
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(img, x, y, iw, ih);
  
  const vig = ctx.createRadialGradient(W/2, H/2, H*0.18, W/2, H/2, H*0.85);
  vig.addColorStop(0, 'rgba(6,4,10,0)');
  vig.addColorStop(1, 'rgba(6,4,10,0.85)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
}

function startAnim() {
  function loop() {
    requestAnimationFrame(loop);
    currentFrame += (targetFrame - currentFrame) * LERP;
    if (isReady) drawFrame(Math.round(currentFrame));
  }
  loop();
}

const pages    = Array.from(document.querySelectorAll('.page'));
const navLinks = Array.from(document.querySelectorAll('.nav-link'));

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const idx = pages.indexOf(entry.target);
      pages.forEach((p, i) => p.classList.toggle('is-active', i === idx));
      navLinks.forEach((l, i) => l.classList.toggle('active', i === idx));
    }
  });
}, { rootMargin: '-40% 0px -40% 0px' });

pages.forEach(p => observer.observe(p));

loadAll();

// === CRM INTEGRATION (Telegram) ===
const form = document.getElementById('lead-form');
if(form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button');
    const originalText = btn.innerText;
    btn.innerText = 'Отправка...';
    btn.disabled = true;

    // Сбор данных из формы
    const formData = new FormData(form);
    let messageText = "🔥 *Новая заявка на открытие СЦ Тенториум* 🔥\n\n";
    formData.forEach((value, key) => {
      messageText += `*${key}:* ${value}\n`;
    });

    // ⚠️ ВАЖНО: Вставьте сюда свои данные из BotFather
    const BOT_TOKEN = "8980544567:AAHr5xFehrSfAOVRQimR714TdtUGhFdEryI"; // Пример: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
    const CHAT_ID = "8538272428";     // Пример: 123456789

    if(BOT_TOKEN === "8980544567:AAHr5xFehrSfAOVRQimR714TdtUGhFdEryI") {
        console.warn("Telegram Token не настроен! Показываем заглушку об успехе.");
        setTimeout(() => {
          form.innerHTML = '<div style="text-align:center; padding: 20px; background: rgba(0,255,100,0.1); border: 1px solid #0f0; border-radius: 4px;"><h3>Заявка успешно отправлена!</h3><p>ТОП-Директор свяжется с вами в течение часа.</p></div>';
        }, 1500);
        return;
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: messageText,
          parse_mode: 'Markdown'
        })
      });

      if (response.ok) {
        form.innerHTML = '<div style="text-align:center; padding: 20px; background: rgba(0,255,100,0.1); border: 1px solid #0f0; border-radius: 4px;"><h3>Заявка успешно отправлена!</h3><p>ТОП-Директор свяжется с вами в течение часа.</p></div>';
      } else {
        throw new Error('Ошибка отправки в Telegram');
      }
    } catch (error) {
      console.error(error);
      btn.innerText = 'Ошибка. Попробуйте еще раз';
      btn.disabled = false;
      setTimeout(() => { btn.innerText = originalText; }, 3000);
    }
  });
}

