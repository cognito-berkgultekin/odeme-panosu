# Cognito · Ödeme Takip Panosu

Sözleşme imza ve ödeme sürecini **canlı sayaçlarla** gösteren, GitHub Pages
üzerinde yayınlanan tek sayfalık bir site. Aynı sayfa farklı projeler için
tekrar tekrar kullanılabilir.

## Sayfada neler var?

| Bölüm | İçerik |
|---|---|
| Sayaç 1 | Sözleşmenin imzalandığı tarihten bu yana geçen süre — gün / saat / dakika / saniye |
| Sayaç 2 | Ödeme vadesine kalan süre (geri sayım). Vade geçtiyse kırmızıya döner ve yukarı saymaya başlar |
| Bilgi kartları | Beklenen imza tarihi · Cognito imza tarihi · Karşı taraf imza tarihi · Ödeme vadesi · Gönüllerden geçen ödeme tarihi · Kalan gün |
| Süreç çizelgesi | Tüm kilometre taşları tarih sırasıyla dikey zaman çizelgesinde |
| Dünyada neler oldu | Beklenen imza tarihinden bugüne kadar geçen sürede yaşanan önemli olaylar + otomatik hesaplanan satırlar |
| Sevgi & minnet göstergesi | Her saniye artan minnet sayacı, dolan bar ve gecikmeye göre değişen seviye |

Ödeme geldiğinde `odendi: true` yapılır; sayaçlar durur, sayfa yeşile döner ve
teşekkür moduna geçer.

---

## 1. Proje bilgilerini girmek

Tüm ayarlar [`config.js`](config.js) dosyasında:

```js
const PROJELER = {

  "aygos": {
    proje:    "AYGÖS Projesi",
    musteri:  "HAVELSAN",
    aciklama: "Sözleşme karşılıklı imzalandı. Ödeme vadesi işliyor.",

    bizimAdimiz:   "Cognito A.Ş.",
    karsiTarafAdi: "HAVELSAN",

    beklenenImzaTarihi:   "2025-12-31",   // imzalanmasını beklediğimiz tarih
    cognitoImzaTarihi:    "2026-07-01",   // Cognito A.Ş. imza tarihi
    karsiTarafImzaTarihi: "2026-08-01",   // HAVELSAN imza tarihi

    vadeGun:     45,             // karşı taraf imzasından sonraki vade
    odemeTarihi: null,           // sabit vade tarihi vermek isterseniz "2026-09-15"
    gonulTarihi: "2026-08-30",   // gönüllerden geçen ödeme tarihi
    tutar:       null,           // örn: 750000 (göstermek istemiyorsanız null)
    paraBirimi:  "TL",

    odendi:             false,
    odemeYapilmaTarihi: null,

    minnetKatsayisi: 7,          // saniyede biriken minnet puanı

    not: "Bu pano yalnızca bilgilendirme amaçlıdır."
  }

};
```

Linki şu şekilde paylaşın:

```
https://<kullanici>.github.io/<repo>/?p=aygos
```

`?p=` yazılmazsa `VARSAYILAN_PROJE` içinde belirtilen proje açılır.

**Tarih formatı:** `YYYY-AA-GG` (`"2026-08-01"`) veya `GG.AA.YYYY` (`"01.08.2026"`).

**Ödeme vadesi** varsayılan olarak *karşı taraf imzası + `vadeGun`* şeklinde
otomatik hesaplanır. Sözleşmede sabit bir tarih varsa `odemeTarihi` yazın,
o zaman `vadeGun` yok sayılır.

---

## 2. "Dünyada neler oldu" bölümü

Sayfa, **beklenen imza tarihi ile bugün arasına düşen** olayları otomatik
listeler; tarihi bu aralığın dışında kalanlar kendiliğinden gizlenir. Yani aynı
liste farklı projelerde de doğru çalışır.

Hazır listede takvimi önceden belli olan olaylar var (Kış Olimpiyatları, Dünya
Kupası, bayramlar, 12 Ağustos 2026 tam güneş tutulması). Kendi olaylarınızı
eklemek için projeye `olaylar` alanı ekleyin:

```js
olaylar: [
  { tarih: "2026-04-15", baslik: "Şirketimiz yeni ofisine taşındı." },
  { tarih: "2026-06-01", baslik: "Projenin ikinci fazı teslim edildi.", not: "Sözleşme hâlâ ödeme bekliyordu." }
]
```

Hazır listeyi tamamen kapatmak için: `varsayilanOlaylar: false`

Listenin sonundaki "Bu arada" satırları otomatik hesaplanır — Dünya'nın
Güneş etrafında aldığı yol, dolunay sayısı, mevsim değişimi ve geçen gün sayısı.

---

## 3. Deploy etmeden hızlı yol: linkten ayar

`config.js`'e dokunmadan tek seferlik pano üretebilirsiniz:

```
?ad=AYGÖS%20Projesi&musteri=HAVELSAN&beklenen=2025-12-31&bizimimza=2026-07-01&imza=2026-08-01&vade=45&gonul=2026-08-30
```

| Parametre | Karşılığı |
|---|---|
| `p` | `config.js` içindeki proje anahtarı |
| `ad` | Proje adı |
| `musteri` | Müşteri adı |
| `aciklama` | Alt açıklama |
| `biz` / `karsi` | Taraf isimleri |
| `beklenen` | İmzalanmasını beklediğimiz tarih |
| `bizimimza` | Cognito imza tarihi |
| `imza` | Karşı taraf imza tarihi |
| `vade` | Vade (gün) |
| `odeme` | Sabit ödeme tarihi |
| `gonul` | Gönüllerden geçen ödeme tarihi |
| `tutar` / `pb` | Tutar / para birimi |
| `odendi` | `1` yapılırsa teşekkür moduna geçer |
| `odemetarih` | Ödemenin yapıldığı tarih |
| `kat` | Minnet katsayısı |
| `not` | Sayfa altındaki not |

Link parametreleri `config.js`'i **ezer** — yani `?p=aygos&odendi=1` ile panoyu
anında teşekkür moduna alabilirsiniz.

---

## 4. GitHub Pages'e yayınlama

```bash
git init && git add . && git commit -m "Cognito odeme takip panosu"
```

```bash
git branch -M main && git remote add origin https://github.com/<kullanici>/<repo>.git && git push -u origin main
```

Ardından GitHub'da: **Settings → Pages → Source: Deploy from a branch →
Branch: `main` / `(root)` → Save.**

Bir iki dakika içinde site şu adreste yayında olur:

```
https://<kullanici>.github.io/<repo>/
```

> Depo **public** olmalı (ücretsiz hesapta Pages özel depolarda çalışmaz).
> Linki bilen herkes sayfayı görebilir; hassas bilgi yazmayın.

---

## 5. Yerelde denemek

```bash
python -m http.server 8087
```

Sonra `http://localhost:8087/` adresini açın.

---

## Dosyalar

| Dosya | Görev |
|---|---|
| `index.html` | Sayfa iskeleti |
| `styles.css` | Görsel tasarım (koyu tema) |
| `app.js` | Tarih hesapları, canlı sayaçlar, olay listesi, minnet göstergesi |
| `config.js` | **Proje bilgileri — düzenlemeniz gereken tek dosya** |
