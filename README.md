# links.yulalab.com

## Güncel yerel aday — 20 Ekim 2026

Site ile aynı 14 arayüz dili: `tr,en,es-419,pt-BR,de,fr,ja,ar,it,ko,id,pl,hi,zh-Hans`. Native dil seçimi ürün hash'ini korur; açık/koyu/sistem seçimi yalnız bu origin'de `yula.appearance.v1` olarak tutulur. JavaScript kapalı yüzeyde 14 dilin ürün, ana site, destek ve gizlilik bağlantıları bulunur. Tarihli dizin kaydı, mağazanın canlı kontrolü veya yeni yayın kabulü değildir. [Güncel yerel kanıt ve açık kapılar](../workspace/implementation-01-2026-10-19/theme-14-acceptance/REPORT.tr.md). Aşağıdaki yayın/source/CI okumaları kendi tarihli checkpoint'leridir; yeni push veya deploy yapılmadı.


YULA Lab ürün dizini ve doğrulanmış bağlantı hub'ı. Vanilla HTML/CSS/JS kullanır; build ve çalışma zamanı bağımlılığı yoktur. Görsel STAMP düzeni dondurulmuştur.

## Public truth sözleşmesi

- Ürün adı, lifecycle, güncel web/store yüzeyleri ve gösterilen sayısal claim'ler `https://yulalab.com/portfolio-registry.json` kaynağından gelir.
- Canlı/beta ürünler önce; araştırma ürünleri açıkça `Araştırma` olarak render edilir. Archived kayıtlar gösterilmez.
- Ağ cevabı JSON değilse, Vercel Attack Challenge içeriyorsa, tarih/şema/URL doğrulaması geçmiyorsa veya fetch başarısızsa sayfa fail-closed son bilinen snapshot'a döner.
- Teknik registry uyarısı sabit bir alt şerit olarak gösterilmez; ağ/veri hatalarında güvenli fallback davranışı korunur. Tarihi dolmuş web/store yüzeyi `current/live` kabul edilmez ve dış CTA olarak render edilmez.
- Registry metni HTML olarak işlenmez; text escape edilir. Yüzey URL'leri ürün + yüzey türü bazlı HTTPS host allowlist'inden geçer. Registry sosyal hesap üretemez.
- Doğrulanmış sosyal allowlist yalnız YULA Lab X ve Instagram hesaplarını içerir. Diğer kutular güvenli `SOON` durumundadır.

Son bilinen canonical snapshot:

```text
verifiedAt: 2026-08-21
source registry SHA-256: 95768aac9494edaa01372f9a714ffc25f6c32d655436b776d8e2e0a555db7cab
```

## Rotalar

| Canonical route | Hash route | Lifecycle |
|---|---|---|
| `/braavolabs` | `#braavolabs` | Beta |
| `/burunfarki` | `#burunfarki` | Canlı · Türkiye 18+ |
| `/lifeos` | `#lifeos` | Canlı |
| `/gravita` | `#gravita` | Araştırma |
| `/lissom` | `#lissom` | Araştırma |
| `/jablab` | `#jablab` | Araştırma |
| `/ostinato` | `#ostinato` | Araştırma |
| `/choreia` | `#choreia` | Araştırma |

Kısa alias'lar `vercel.json` içinde hash rotalarına yönlenir. Router browser back/forward, keyboard navigation ve ürün bazlı `document.title` davranışını korur.

## Güvenlik ve dayanıklılık

- CSP header ve eşdeğer meta policy; inline JavaScript SHA-256 ile sabittir.
- `frame-src`, `object-src`, `base-uri`, `form-action` ve `frame-ancestors` fail-closed; yalnız canonical registry/event origin'i için `connect-src` açıktır.
- Attribution varsayılan kapalıdır. Açıldığında UTM session sözleşmesi, `product_view`, `product_primary_cta` ve `store_outbound` event sınıflandırması korunur; ürün host allowlist'i güncel registry yüzeylerinden türetilir.
- JavaScript kapalıyken güvenli YULA ürün sayfaları, snapshot tarihi ve hash görünür. Offline/fetch-failure durumunda aynı deterministic renderer fallback snapshot'ını kullanır.
- `prefers-reduced-motion`, 320 px tek-sütun davranışı, görünür focus ve ana içerik landmark'ı desteklenir.

## Lokal doğrulama

Basit kök sunucu:

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

HTML doğrulaması repo/site dependency ağacını değiştirmeden, task-owned geçici ortamda pinned `html-validate` ile yapılır. Üretim paketi veya lockfile eklenmez.

Beklenen kontroller: canonical registry parity, fallback/challenge/malformed payload negatifleri, tüm canonical/alias rotalar, dış CTA + UTM/event sınıflandırması, keyboard, 320 px, reduced-motion, no-JS, offline, CSP console/network ve `git diff --check`.

## Deploy sınırı

Uzak varsayılan kaynak dalı `main`; mevcut yerel aday `consolidation/links-8300b938@da0b243ac1ba76e0ef1273b7f77324d5cc38e109` üzerindedir. Public `links.yulalab.com` Netlify üzerinden sunulur. GitHub PR4 (`3362e2f`) draft ve unmerged durumundadır; GitHub static CI ve otomatik Vercel preview kaydı Netlify production yayını değildir. 12 Ekim 2026 18:26 UTC public GET okumasında root HTML **69.225 bayt**, SHA-256 `356c9dcc3caf9362c416cc41b6bfbaafc33e5bc326cd9f2fb94daa2e9ba2cee2`; Git `43524f61e28d9bbd73be372ca8bc30feedddb8ad:index.html` ile **tam bayt eş**. Yerel `da0b243a` adayıyla eş değil ve bu aday yayımlanmadı. Bu okumada önceki 184 bayt HUD farkı gözlenmedi; sağlayıcı ayarının neden değiştiği doğrulanmadı. `/lifeos` hedefi `/#lifeos`, YULALAB `/links` alias'ı hub root'una yönlenir. Gerçek tarayıcı yerleşimi ve provider deploy kimliği bu GET kabulüne dahil değildir.

Son Netlify integration metadata kaydı (3 Ekim) boş Git settings ve sıfır build hook, 4 Ekim UI kaydı “Not linked” gösterir; bunlar güncel ayar garantisi değildir. Vercel production dalı, hesap/rol ve merge etkisi önceki 403/2FA erişim sınırı nedeniyle UNKNOWN/HOLD kalır. Kaynak push/merge, provider ayarı veya deploy ayrı somut yayın onayı gerektirir; bu kayıt hiçbiri için yetki yaratmaz.

### Yayın hazırlığı — 2026-09-06

TR/EN düğmesi `?lang=tr` / `?lang=en` ile aynı ürün hash hedefini korur. Ortak destek `support@yulalab.com`; holding, ürün ve JavaScript kapalı yüzeylerinde erişilebilir. Mağaza bağlantıları güncel doğrulamaya göre açılır; süresi dolmuş kayıtlar, listelenmeyen platformlar ve gerçek “yakında” kayıtları ayrı etiketlenir. Registry yenilemesi odak ve kaydırma konumunu korur.

`netlify.toml`, `_redirects` ve `_headers` statik Netlify sözleşmesidir. 19 kısa yol Vercel yönlendirmeleriyle eşleşir. Yayın paketine yalnız `index.html`, `robots.txt`, `sitemap.xml`, `_redirects` ve `_headers` alınır; build komutu/Next eklentisi/function gerekmez. Mevcut domain'in HTTP/header/redirect kabulü yeni kaynak adayının yayını değildir; yeni aday production'a alınmadı.

Son yerel doğrulama: 21 JSDOM normal kullanım kontrolü ve mevcut statik HTML/rota sözleşmesi geçti. Bunlar gerçek tarayıcı yerleşimi, canlı yönlendirme veya final güvenlik kabulü değildir. Gerçek tarayıcı isteği yerel HTTP sunucusuna ulaşamadığı için mobil ve provider kabulü açık kaldı.
