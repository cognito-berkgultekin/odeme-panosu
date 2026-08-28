/* ============================================================
   COGNITO – ÖDEME TAKİP PANOSU
   PROJE AYARLARI
   ------------------------------------------------------------
   Yeni bir proje eklemek için aşağıdaki listeye yeni bir kayıt
   ekleyin. Anahtar (örn: "aygos") sayfanın linkinde kullanılır:
   https://<kullanici>.github.io/<repo>/?p=aygos
   ============================================================ */

const VARSAYILAN_PROJE = "aygos";

const PROJELER = {

  "aygos": {
    // --- Kimlik ---
    proje:        "AYGÖS Projesi",
    musteri:      "HAVELSAN",
    aciklama:     "Sözleşme karşılıklı imzalandı. Avans ödeme vadesi işliyor.",

    // --- Ödemenin adı (başka projede "Ödeme" / "Hakediş ödemesi" olabilir) ---
    odemeAdi:        "Avans ödeme",     // "... vadesine kalan süre" gibi yerlerde
    odemeAdiIyelik:  "Avans ödemesi",   // "... bekleniyor / tamamlandı" gibi yerlerde

    // --- Taraflar ---
    bizimAdimiz:   "Cognito A.Ş.",   // Bizim taraf
    karsiTarafAdi: "HAVELSAN",       // Karşı taraf

    // --- Tarihler (YYYY-AA-GG) ---
    teklifTarihi:         "2024-12-22",  // İlk bütçesel teklifi verdiğimiz tarih
    beklenenImzaTarihi:   "2025-12-31",  // İmzalanmasını beklediğimiz tarih
    cognitoImzaTarihi:    "2026-07-01",  // Cognito A.Ş. imza tarihi
    karsiTarafImzaTarihi: "2026-08-03",  // HAVELSAN imza tarihi

    // --- Ödeme ---
    vadeGun:      45,                // Yalnızca odemeTarihi null ise kullanılır
    odemeTarihi:  "2026-09-15",      // Ödeme vadesine göre beklenen tarih (sabit)
    gonulTarihi:  "2026-08-30",  // Gönüllerden geçen avans ödeme tarihi
    tutar:        null,          // Örn: 750000  (göstermek istemiyorsanız null)
    paraBirimi:   "TL",

    odendi:             false,   // Ödeme geldiyse true yapın
    odemeYapilmaTarihi: null,    // Örn: "2026-09-10"

    // --- Sevgi & Minnet (gösterge tam dolu başlar, gecikme oldukça erir) ---
    minnetMaks:     1000000,   // Tam kapasite minnet miktarı
    minnetTaban:    0.35,      // En fazla bu orana kadar düşer (0.35 = %35)
    minnetErimeGun: 120,       // Vadeden sonra kaç günde tabana yaklaşır

    // --- Projeye özel olaylar (hazır listeye eklenir) ---
    // Tarihi "beklenenImzaTarihi" ile bugün arasına düşenler otomatik listelenir.
    olaylar: [
      { tarih: "2026-07-26", baslik: "Filenin Sultanları dünya şampiyonu oldu." }
    ],

    // --- Alt not (opsiyonel) ---
    not: "Bu pano yalnızca bilgilendirme amaçlıdır; her saniye canlı olarak güncellenir."
  }

};
