# links.yulalab.com

YULA Lab Holding + 3 ürün için tek sayfalık, tek dosyalık (vanilla HTML/CSS/JS) Linktree-style sosyal bağlantı sitesi. **Sıfır bağımlılık, sıfır build, sıfır framework.** Çift tıkla aç, çalışır.

> Kaynak tasarım: `Downloads/yulalab-links-v3.html` — Mustafa Kaan tarafından farklı araçlarda parça parça hazırlandı, bu sürümde birleştirildi + URL routing, a11y, OG, print desteği eklendi.

---

## Sayfalar

| Hash URL | Sayfa | İçerik |
|----------|-------|--------|
| `/` veya `#holding` | YULA Lab (Holding) | 3 ürün kartı + YULA Lab sosyal medya |
| `#braavolabs` | Braavolabs | B2B AI Şirket OS · 9 primitives · 12 LLMs |
| `#burunfarki` | Burun Farkı | TR 18+ at yarışı AI analiz platformu |
| `#lifeos` | LifeOS | 5 hayat alanı · cihaz-üstü AI · sıfır reklam |

**URL routing:** `links.yulalab.com/#braavolabs` paylaşılabilir, browser back/forward çalışır, document.title her sayfada güncellenir.

---

## Tasarım Sistemi

| Marka | Accent | Background gradient | Avatar bg |
|-------|--------|---------------------|-----------|
| YULA Lab | `#E8EAF0` (ink-white) | radial 12% gray → `#06080F` | `#E8EAF0` solid |
| Braavolabs | `#00D1FF` (cyan) | radial 10% cyan → `#06080F` | cyan glass |
| Burun Farkı | `#FAB81F` (gold) | radial 12% gold → `#06080F` | gold glass |
| LifeOS | `#C3F400` (neon yeşil) | radial 10% green → `#06080F` | neon green glass |

**Tipografi:** Manrope (400-900) + JetBrains Mono (400-600), Google Fonts.

**Bileşenler:**
- `.brand-card` — 72px+ hero ürün kartı (Holding sayfasında)
- `.link-btn` — 56px+ touch-optimized sosyal/platform linki
- `.link-btn.soon` — Henüz aktif olmayan platformlar için "Yakında" rozeti (placeholder linkler otomatik bu state'e geçer)
- `.stat-pill` — Marka metrik rozetleri (örn. "%40.8 Top-1", "9 Primitives")

---

## Linkler — Mevcut Durum

Aşağıdaki linkler **gerçek hesaplarla** bağlı:

**YULA Lab** ✅
- yulalab.com (web)
- instagram.com/yulalab
- x.com/yulalab
- linkedin.com/company/yulalab

**Braavolabs** ✅
- braavolabs.com
- x.com/braavolabs
- linkedin.com/company/braavolabs
- github.com/kocakkmustafa/braavolabs

**Burun Farkı** ✅
- burunfark.com
- instagram.com/burunfarki
- x.com/burunfarki
- youtube.com/@burunfarki

**LifeOS** — Tüm linkler **Yakında** durumunda (App Store/Play Store onayı sonrası açılacak).

Diğer tüm platformlar (TikTok, YouTube, Reddit, Facebook, Discord, Telegram, GitHub vb.) **placeholder** olarak yer alıyor — hesaplar açıldıkça `href="#"` ve `.soon` sınıfı silinerek aktif edilecek.

### Link nasıl aktif edilir?

`index.html` içinde ilgili `<a class="link-btn soon" href="#" ...>` bloğunu bul, **iki değişiklik yap**:

```html
<!-- önce -->
<a class="link-btn soon" href="#" aria-label="TikTok — yakında">

<!-- sonra -->
<a class="link-btn" href="https://tiktok.com/@yulalab" target="_blank" rel="noopener" aria-label="TikTok @yulalab">
```

`soon` sınıfı silindiği anda buton tıklanabilir hale gelir ve "Yakında" rozeti kaybolur. `target="_blank"` ve `rel="noopener"` güvenlik için zorunlu.

---

## Deploy

### Seçenek A — Subdomain (önerilen)

`links.yulalab.com` alt domaini açılır, içerik bu klasörden serve edilir.

**Vercel:**
1. Yeni proje, root directory: `ventures/yulalab-com/links`
2. Framework Preset: **Other** (build komutu yok)
3. Domain: `links.yulalab.com` ekle
4. DNS: `links` CNAME → `cname.vercel-dns.com`

**Netlify / Cloudflare Pages:** aynı mantık, sadece root directory ayarı yeterli.

**GitHub Pages:** `gh-pages` branch'e push, `links.yulalab.com` custom domain ayarla.

### Seçenek B — yulalab.com/links route

Dosya zaten `Web Sites/yulalab.com/public/links/index.html` konumuna kopyalandı. Next.js otomatik olarak `public/` altındaki static dosyaları serve eder.

```
https://yulalab.com/links     →  bu sayfayı açar
https://yulalab.com/links/    →  aynı sayfa
```

Bu varyant alt domain DNS değişikliği gerektirmez — sadece bir sonraki Vercel deploy ile canlıya gelir.

### Seçenek C — Cloudflare R2 / S3

Tek bir HTML olduğu için herhangi bir static bucket yeterli.

---

## SEO & Sosyal Paylaşım

- **OG image:** `https://yulalab.com/brand/yulalab-banner.png` (mevcut)
- **Twitter card:** `summary_large_image`
- **Locale:** `tr_TR` (primary), `en_US` (alternate)
- **Description:** 160 karakter altında, marka manifesto cümlesi
- **Theme color:** `#06080F` (mobil tarayıcı chrome rengi)
- **Favicon:** Inline SVG ("YL" monogramı) — sıfır external request

Paylaşım metni örneği (X/LinkedIn):
```
YULA Lab — AI-Native Venture Studio.
3 ürün, 1 stüdyo, sıfır kara kutu.
↳ links.yulalab.com
```

---

## A11y & Performans

- ✅ Tüm interaktif öğelerde `aria-label`
- ✅ `:focus-visible` outline
- ✅ Semantic `<h1>` her sayfada bir tane
- ✅ Touch target min 44×44 px (Apple HIG)
- ✅ `prefers-reduced-motion` respected (sadece tek geçiş animasyonu, hafif)
- ✅ No-JS fallback uyarısı
- ✅ Print stylesheet (tüm sayfalar PDF export'ta görünür)

**Lighthouse beklenen skorlar:**
- Performance: 99-100 (zero JS framework, inline CSS, Google Fonts swap)
- Accessibility: 95+
- Best Practices: 100
- SEO: 100

---

## Dosya Yapısı

```
links.yulalab.com/
├── index.html        # Tek dosya, 66 KB, self-contained
└── README.md         # Bu dosya
```

`yulalab.com/public/links/index.html` aynı dosyanın kopyası — birini güncellediğinde diğerini de senkron tut (veya symlink kur):

```bash
# Symlink (geliştirme sırasında)
ln -sf "$(pwd)/links.yulalab.com/index.html" \
       "$(pwd)/yulalab.com/public/links/index.html"
```

---

## Değişiklik Takibi

- **v3 (kaynak):** Mustafa Kaan tarafından birleştirildi (Downloads/yulalab-links-v3.html)
- **v3.1 (bu sürüm, 2026-05-13):** Klasör yapısı + README + URL hash routing + browser history + meta/OG/Twitter + favicon SVG + a11y aria-label'ları + `.soon` rozet sistemi + print stylesheet + no-JS fallback

---

## Sıradaki Adımlar

- [ ] DNS kaydı: `links.yulalab.com` CNAME oluştur
- [ ] Vercel'de subdomain projesi aç ve bu klasörü bağla
- [ ] Open Graph banner görselini son haline getir (`yulalab.com/brand/yulalab-banner.png` — boyut 1200×630)
- [ ] Açılan sosyal medya hesaplarının URL'lerini `index.html` içinde `.soon` sınıfından çıkararak aktif et
- [ ] LifeOS App Store + Play Store linkleri yayınlandığında ilgili `<a class="link-btn soon">` bloklarını aktif et
- [ ] (Opsiyonel) Analytics ekle — Plausible script (KVKK uyumlu, çerez yok)
- [ ] (Opsiyonel) UTM parameter desteği — her dış link `?utm_source=links&utm_medium=biolink&utm_campaign=<marka>`
