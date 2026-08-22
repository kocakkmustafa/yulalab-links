# links.yulalab.com

YULA Lab ürün dizini ve doğrulanmış bağlantı hub'ı. Vanilla HTML/CSS/JS kullanır; build ve çalışma zamanı bağımlılığı yoktur. Görsel STAMP düzeni dondurulmuştur.

## Public truth sözleşmesi

- Ürün adı, lifecycle, güncel web/store yüzeyleri ve gösterilen sayısal claim'ler `https://yulalab.com/portfolio-registry.json` kaynağından gelir.
- Canlı/beta ürünler önce; araştırma ürünleri açıkça `Araştırma` olarak render edilir. Archived kayıtlar gösterilmez.
- Ağ cevabı JSON değilse, Vercel Attack Challenge içeriyorsa, tarih/şema/URL doğrulaması geçmiyorsa veya fetch başarısızsa sayfa fail-closed son bilinen snapshot'a döner.
- Fallback bildirimi son doğrulama tarihini ve kaynak registry SHA-256 özetini görünür gösterir. Tarihi dolmuş web/store yüzeyi `current/live` kabul edilmez ve dış CTA olarak render edilmez.
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

Lokal inceleme manuel gate gerektirmez. `develop` push, Vercel preview veya production deploy yalnız `MANUAL-YULA-DEPLOY` ile yapılır. Bu repo için production dış sistem mutasyonu otomatik değildir.
