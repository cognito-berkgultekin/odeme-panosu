/* ============================================================
   COGNITO – ÖDEME TAKİP PANOSU
   Sayaç ve gösterge mantığı
   ============================================================ */

(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var GUN_MS = 86400000;

  /* ---------- Yardımcılar ---------- */

  function tarihCoz(s) {
    // "YYYY-AA-GG" veya "GG.AA.YYYY" -> yerel saatle gece yarısı
    if (!s) return null;
    if (s instanceof Date) return s;
    var p = String(s).trim().split(/[-/.]/);
    if (p.length < 3) return null;
    var y, a, g;
    if (p[0].length === 4) { y = +p[0]; a = +p[1]; g = +p[2]; }
    else { g = +p[0]; a = +p[1]; y = +p[2]; }
    var d = new Date(y, a - 1, g, 0, 0, 0, 0);
    return isNaN(d.getTime()) ? null : d;
  }

  function tarihYaz(d) {
    if (!d) return "—";
    try { return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }); }
    catch (e) { return d.getDate() + "." + (d.getMonth() + 1) + "." + d.getFullYear(); }
  }

  function tarihKisa(d) {
    if (!d) return "";
    try { return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" }); }
    catch (e) { return d.getDate() + "." + (d.getMonth() + 1) + "." + d.getFullYear(); }
  }

  function sayiYaz(n) {
    try { return Math.floor(n).toLocaleString("tr-TR"); }
    catch (e) { return String(Math.floor(n)); }
  }

  function paraYaz(n, pb) {
    if (n === null || n === undefined || n === "" || isNaN(+n)) return null;
    return sayiYaz(+n) + " " + (pb || "TL");
  }

  function ped(n) { return (n < 10 ? "0" : "") + n; }

  function gunFarki(a, b) {
    if (!a || !b) return null;
    return Math.round((b - a) / GUN_MS);
  }

  function bugunBasi() {
    var n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }

  function gunSonu(d) {
    return d ? new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999) : null;
  }

  function kacar(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function parcala(ms) {
    var t = Math.floor(Math.max(0, ms) / 1000);
    return {
      gun: Math.floor(t / 86400),
      saat: Math.floor((t % 86400) / 3600),
      dakika: Math.floor((t % 3600) / 60),
      saniye: t % 60
    };
  }

  /* ---------- Ayarların toplanması ---------- */

  function urlAyarlari() {
    var q = new URLSearchParams(window.location.search);
    var o = {};

    // Tüm ayarı tek parametrede göndermek için:  ?d=<base64 json>
    var paket = q.get("d");
    if (paket) {
      try {
        var json = decodeURIComponent(escape(atob(paket.replace(/-/g, "+").replace(/_/g, "/"))));
        Object.assign(o, JSON.parse(json));
      } catch (e) { /* bozuk paket yok sayılır */ }
    }

    var esle = {
      ad: "proje", proje: "proje",
      musteri: "musteri",
      aciklama: "aciklama",
      biz: "bizimAdimiz",
      karsi: "karsiTarafAdi",
      beklenen: "beklenenImzaTarihi",
      bizimimza: "cognitoImzaTarihi",
      imza: "karsiTarafImzaTarihi",
      vade: "vadeGun",
      odeme: "odemeTarihi",
      gonul: "gonulTarihi",
      tutar: "tutar",
      pb: "paraBirimi",
      odendi: "odendi",
      odemetarih: "odemeYapilmaTarihi",
      kat: "minnetKatsayisi",
      not: "not"
    };

    Object.keys(esle).forEach(function (k) {
      if (!q.has(k)) return;
      var v = q.get(k);
      var alan = esle[k];
      if (alan === "vadeGun" || alan === "minnetKatsayisi" || alan === "tutar") v = +v;
      if (alan === "odendi") v = (v === "1" || v === "true" || v === "evet");
      o[alan] = v;
    });

    return o;
  }

  function ayarlariGetir() {
    var q = new URLSearchParams(window.location.search);
    var slug = q.get("p") || (typeof VARSAYILAN_PROJE !== "undefined" ? VARSAYILAN_PROJE : null);
    var temel = {};

    if (typeof PROJELER !== "undefined" && PROJELER) {
      if (slug && PROJELER[slug]) temel = PROJELER[slug];
      else {
        var ilk = Object.keys(PROJELER)[0];
        if (ilk) temel = PROJELER[ilk];
      }
    }

    var c = Object.assign({}, temel, urlAyarlari());

    if (c.vadeGun === undefined || c.vadeGun === null || isNaN(+c.vadeGun)) c.vadeGun = 30;
    if (!c.minnetKatsayisi || isNaN(+c.minnetKatsayisi)) c.minnetKatsayisi = 7;
    if (!c.paraBirimi) c.paraBirimi = "TL";
    if (!c.bizimAdimiz) c.bizimAdimiz = "Cognito A.Ş.";
    if (!c.karsiTarafAdi) c.karsiTarafAdi = c.musteri || "Karşı taraf";
    if (!c.karsiTarafImzaTarihi && c.imzaTarihi) c.karsiTarafImzaTarihi = c.imzaTarihi;
    return c;
  }

  /* ---------- Minnet seviyeleri ---------- */

  var SEVIYELER = [
    { esik: -1e9, ad: "Sevgiyle bekliyoruz", mesaj: "Süreç planlandığı gibi ilerliyor. Ödeme gününe kadar her şey yolunda; ilginiz ve emeğiniz için şimdiden teşekkür ederiz." },
    { esik: 0,    ad: "Teşekkür ederiz",     mesaj: "Ödeme tarihi geldi. Süreci takip eden herkese teşekkür ediyoruz; dosya bugün kapanırsa bu sayaç güzel bir anıya dönüşecek." },
    { esik: 3,    ad: "Minnettarız",         mesaj: "Birkaç gündür bekliyoruz. Bu dosyayı bir adım öne taşıyan herkese içten teşekkürlerimizi iletiyoruz." },
    { esik: 10,   ad: "Derin minnet",        mesaj: "Sayaç çalışmaya devam ediyor. Ödemenin hızlanması için telefon açan, mail atan, imza peşinde koşan herkes bu ekranın gerçek kahramanı." },
    { esik: 25,   ad: "Büyük minnet",        mesaj: "Bekleyiş uzadı ama sabrımız da sevgimiz de tam. Bu dosyayı çözen kişiye Cognito ekibi olarak gerçekten minnettar olacağız." },
    { esik: 45,   ad: "Efsanevi minnet",     mesaj: "Bu sayaç artık kendi hikâyesini yazıyor. Ödemeyi harekete geçiren kişi, şirket tarihimize teşekkürle geçecek." },
    { esik: 75,   ad: "Destansı minnet",     mesaj: "Sabır bir erdemdir, minnet ise birikimli. Bu dosyayı kapatan kahramana duyacağımız minnetin haddi hesabı olmayacak." },
    { esik: 120,  ad: "Sonsuz minnet",       mesaj: "Sayaç yeni rekorlar kırıyor. Ödemeyi tamamlayan herkese sonsuz sevgi ve minnetimizi şimdiden gönderiyoruz." }
  ];

  function seviyeBul(gecikmeGun) {
    var s = SEVIYELER[0];
    for (var i = 0; i < SEVIYELER.length; i++) {
      if (gecikmeGun >= SEVIYELER[i].esik) s = SEVIYELER[i];
    }
    return s;
  }

  /* ---------- Dünyada neler oldu: hazır olay havuzu ----------
     Takvimi önceden belli olan (planlı / astronomik) olaylar.
     Sayfa, yalnızca "beklenen imza tarihi" ile "bugün" arasına
     düşen olayları otomatik olarak listeler.
     Kendi olaylarınızı config.js içinde "olaylar" ile ekleyin.
  ------------------------------------------------------------ */

  var HAZIR_OLAYLAR = [
    { tarih: "2026-02-06", baslik: "Milano-Cortina Kış Olimpiyatları başladı." },
    { tarih: "2026-02-22", baslik: "Kış Olimpiyatları sona erdi, bütün madalyalar sahiplerini buldu." },
    { tarih: "2026-03-20", baslik: "Ramazan Bayramı geldi ve geçti." },
    { tarih: "2026-05-27", baslik: "Kurban Bayramı geldi ve geçti." },
    { tarih: "2026-06-11", baslik: "48 takımlı FIFA Dünya Kupası başladı." },
    { tarih: "2026-07-19", baslik: "Dünya Kupası finali oynandı, şampiyon kupasını kaldırdı." },
    { tarih: "2026-08-12", baslik: "Avrupa’da 1999’dan bu yana görülen ilk tam güneş tutulması yaşandı." }
  ];

  var MEVSIMLER = [
    { ay: 2, gun: 20, ad: "ilkbahar" },
    { ay: 5, gun: 21, ad: "yaz" },
    { ay: 8, gun: 22, ad: "sonbahar" },
    { ay: 11, gun: 21, ad: "kış" }
  ];

  function mevsimSayisi(bas, son) {
    if (!bas || !son) return 0;
    var n = 0;
    for (var y = bas.getFullYear(); y <= son.getFullYear(); y++) {
      for (var i = 0; i < MEVSIMLER.length; i++) {
        var d = new Date(y, MEVSIMLER[i].ay, MEVSIMLER[i].gun);
        if (d > bas && d <= son) n++;
      }
    }
    return n;
  }

  /* ---------- Kurulum ---------- */

  var C = ayarlariGetir();

  var beklenenImza = tarihCoz(C.beklenenImzaTarihi);
  var cognitoImza  = tarihCoz(C.cognitoImzaTarihi);
  var karsiImza    = tarihCoz(C.karsiTarafImzaTarihi);
  var odemeElle    = tarihCoz(C.odemeTarihi);
  var gonul        = tarihCoz(C.gonulTarihi);
  var odemeYapilma = tarihCoz(C.odemeYapilmaTarihi);

  var vadeGun = +C.vadeGun;

  // Sözleşmenin yürürlüğe girdiği an: iki imzadan geç olanı
  var tamImza = null;
  if (cognitoImza && karsiImza) tamImza = (cognitoImza > karsiImza) ? cognitoImza : karsiImza;
  else tamImza = karsiImza || cognitoImza;

  var vadeBaslangici = karsiImza || cognitoImza;
  var odemeVadesi = odemeElle || (vadeBaslangici ? new Date(vadeBaslangici.getTime() + vadeGun * GUN_MS) : null);

  var odendi = !!C.odendi;
  var imzaBekleniyor = !tamImza;
  var baslangic = tamImza || beklenenImza;
  var bitis = odendi ? (odemeYapilma || new Date()) : null;

  /* ---------- Statik içerik ---------- */

  function metniYaz() {
    var projeAd = C.proje || "Ödeme Takip Panosu";
    $("proje").textContent = projeAd;
    $("musteri").textContent = C.musteri || "Cognito";
    document.title = projeAd + " · Cognito Ödeme Takip";

    if (C.aciklama) $("aciklama").textContent = C.aciklama;
    else $("aciklama").hidden = true;

    var tutar = paraYaz(C.tutar, C.paraBirimi);
    if (tutar) {
      $("tutarRozeti").hidden = false;
      $("tutarRozeti").textContent = "Sözleşme bedeli: " + tutar;
    }

    $("altNot").textContent = C.not ||
      "Bu pano yalnızca bilgilendirme amaçlıdır ve her saniye canlı olarak güncellenir.";

    /* --- Beklenen imza --- */
    $("beklenenImza").textContent = tarihYaz(beklenenImza);
    if (beklenenImza && tamImza) {
      var fark = gunFarki(beklenenImza, tamImza);
      $("beklenenImzaNot").textContent = fark > 0
        ? "Sözleşme bu tarihten " + sayiYaz(fark) + " gün sonra tamamlandı."
        : (fark === 0 ? "Tam planlandığı gün imzalandı." : Math.abs(fark) + " gün erken imzalandı.");
    } else if (beklenenImza) {
      var f2 = gunFarki(beklenenImza, bugunBasi());
      $("beklenenImzaNot").textContent = f2 > 0
        ? sayiYaz(f2) + " gündür imza bekleniyor."
        : "İmza tarihi yaklaşıyor.";
    } else {
      $("beklenenImzaNot").textContent = "Planlanan imza tarihi.";
    }

    /* --- Cognito imzası --- */
    $("cognitoImzaLabel").innerHTML = '<span lang="en">' + kacar(C.bizimAdimiz) + '</span> imza tarihi';
    $("cognitoImza").textContent = cognitoImza ? tarihYaz(cognitoImza) : "Henüz imzalanmadı";
    if (cognitoImza && beklenenImza) {
      var fc = gunFarki(beklenenImza, cognitoImza);
      $("cognitoImzaNot").textContent = fc > 0
        ? "Planlanan tarihten " + sayiYaz(fc) + " gün sonra."
        : "Planlanan tarihten önce imzalandı.";
    } else {
      $("cognitoImzaNot").textContent = cognitoImza ? "İmza tamamlandı." : "Bekleniyor.";
    }

    /* --- Karşı taraf imzası --- */
    $("karsiImzaLabel").innerHTML = '<span lang="en">' + kacar(C.karsiTarafAdi) + '</span> imza tarihi';
    $("karsiImza").textContent = karsiImza ? tarihYaz(karsiImza) : "Henüz imzalanmadı";
    if (karsiImza && cognitoImza) {
      var fk = gunFarki(cognitoImza, karsiImza);
      $("karsiImzaNot").textContent = fk > 0
        ? C.bizimAdimiz + " imzasından " + sayiYaz(fk) + " gün sonra."
        : (fk === 0 ? "Aynı gün imzalandı." : Math.abs(fk) + " gün önce imzalandı.");
    } else {
      $("karsiImzaNot").textContent = karsiImza ? "Sözleşme yürürlükte." : "Bekleniyor.";
    }

    /* --- Vade --- */
    $("odemeVadesi").textContent = odemeVadesi
      ? tarihYaz(odemeVadesi)
      : "İmzadan " + vadeGun + " gün sonra";
    $("odemeVadesiNot").textContent = odemeElle
      ? "Sözleşmede belirtilen ödeme tarihi."
      : (karsiImza
          ? C.karsiTarafAdi + " imzası + " + vadeGun + " gün."
          : "İmza tarihi + " + vadeGun + " gün vade.");

    /* --- Gönüllerden geçen tarih --- */
    if (!gonul) {
      $("gonulKart").hidden = true;
    } else {
      $("gonulTarihi").textContent = tarihYaz(gonul);
      var fg = gunFarki(bugunBasi(), gonul);
      if (odendi) {
        $("gonulNot").textContent = "Ödeme tamamlandı, gönlümüz ferah.";
      } else if (fg > 0) {
        $("gonulNot").textContent = "Bu tarihte gelirse Cognito’da bayram havası eser (" + fg + " gün kaldı).";
      } else if (fg === 0) {
        $("gonulNot").textContent = "İşte o gün bugün. Gönlümüz hazır.";
      } else {
        $("gonulNot").textContent = "Bu tarihin üzerinden " + Math.abs(fg) + " gün geçti; gönlümüz hâlâ umutlu.";
      }
    }
  }

  function durumuYaz() {
    var rozet = $("durumRozeti");
    var kart  = $("gecikmeKart");
    var lbl   = $("gecikmeLabel");
    var deger = $("gecikmeDeger");
    var not   = $("gecikmeNot");

    kart.classList.remove("accent-bad", "accent-warn", "accent-good");
    rozet.classList.remove("is-bad", "is-warn", "is-good");

    if (odendi) {
      document.body.classList.add("odendi");
      rozet.textContent = "Ödeme tamamlandı";
      rozet.classList.add("is-good");
      lbl.textContent = "Ödeme durumu";
      deger.textContent = "Tamamlandı";
      not.textContent = odemeYapilma
        ? tarihYaz(odemeYapilma) + " tarihinde ödendi. Teşekkür ederiz."
        : "Teşekkür ederiz.";
      kart.classList.add("accent-good");
      return;
    }

    if (imzaBekleniyor) {
      rozet.textContent = "İmza bekleniyor";
      rozet.classList.add("is-warn");
      lbl.textContent = "Ödeme durumu";
      deger.textContent = "İmza sonrası";
      not.textContent = "Sözleşme imzalandığında ödeme takvimi başlayacak.";
      kart.classList.add("accent-warn");
      return;
    }

    var gecikme = odemeVadesi ? gunFarki(odemeVadesi, bugunBasi()) : null;

    if (gecikme === null) {
      rozet.textContent = "Ödeme bekleniyor";
      deger.textContent = "—";
      not.textContent = "Ödeme tarihi tanımlı değil.";
      return;
    }

    if (gecikme > 0) {
      rozet.textContent = gecikme + " gündür ödeme bekleniyor";
      rozet.classList.add("is-bad");
      lbl.textContent = "Vade tarihinden bu yana";
      deger.textContent = gecikme + " gün";
      not.textContent = "Ödemenin yapılması gereken tarih geçti.";
      kart.classList.add("accent-bad");
      $("anaSayacKart").classList.add("is-late");
      $("geriSayimKart").classList.add("is-late");
    } else if (gecikme === 0) {
      rozet.textContent = "Ödeme günü bugün";
      rozet.classList.add("is-warn");
      lbl.textContent = "Ödeme günü";
      deger.textContent = "Bugün";
      not.textContent = "Ödemenin bugün yapılması bekleniyor.";
      kart.classList.add("accent-warn");
    } else {
      rozet.textContent = Math.abs(gecikme) + " gün içinde ödeme";
      rozet.classList.add("is-good");
      lbl.textContent = "Ödeme vadesine kalan gün";
      deger.textContent = Math.abs(gecikme) + " gün";
      not.textContent = vadeGun + " günlük vadenin kalan kısmı.";
      kart.classList.add("accent-good");
    }
  }

  function zamanCizelgesi() {
    var bugun = bugunBasi();
    var satirlar = [];

    satirlar.push({
      baslik: "İmzalanmasını beklediğimiz tarih",
      tarih: beklenenImza,
      durum: (beklenenImza && beklenenImza <= bugun) ? "done" : "",
      not: beklenenImza ? "Planlanan imza tarihi" : "Tarih girilmedi"
    });

    satirlar.push({
      baslik: C.bizimAdimiz + " imzası",
      tarih: cognitoImza,
      durum: cognitoImza ? "done" : "now",
      not: (cognitoImza && beklenenImza && gunFarki(beklenenImza, cognitoImza) > 0)
        ? sayiYaz(gunFarki(beklenenImza, cognitoImza)) + " gün gecikmeli imzalandı"
        : (cognitoImza ? "" : "Bekleniyor")
    });

    satirlar.push({
      baslik: C.karsiTarafAdi + " imzası",
      tarih: karsiImza,
      durum: karsiImza ? "done" : "now",
      not: (karsiImza && cognitoImza && gunFarki(cognitoImza, karsiImza) > 0)
        ? gunFarki(cognitoImza, karsiImza) + " gün sonra imzalandı — vade bu tarihten işlemeye başladı"
        : (karsiImza ? "Vade bu tarihten işlemeye başladı" : "Bekleniyor")
    });

    if (gonul) {
      satirlar.push({
        baslik: "Gönüllerden geçen ödeme tarihi",
        tarih: gonul,
        durum: "love",
        not: "Resmî değil, kalbî"
      });
    }

    var vadeDurum = "";
    if (odendi) vadeDurum = "done";
    else if (odemeVadesi && odemeVadesi < bugun) vadeDurum = "late";
    else if (odemeVadesi && +odemeVadesi === +bugun) vadeDurum = "now";

    satirlar.push({
      baslik: "Ödeme vadesine göre beklenen tarih",
      tarih: odemeVadesi,
      durum: vadeDurum,
      not: odemeElle
        ? "Sözleşmede belirtilen tarih"
        : (karsiImza ? C.karsiTarafAdi + " imzası + " + vadeGun + " gün" : "İmza sonrası hesaplanacak")
    });

    satirlar.push({
      baslik: odendi ? "Ödeme alındı" : "Ödeme",
      tarih: odendi ? odemeYapilma : null,
      durum: odendi ? "done" : (vadeDurum === "late" ? "late" : "now"),
      not: odendi ? "Teşekkür ederiz" : "Bekleniyor"
    });

    // Tarihe göre sırala (tarihi olmayanlar sona)
    satirlar.sort(function (a, b) {
      if (!a.tarih && !b.tarih) return 0;
      if (!a.tarih) return 1;
      if (!b.tarih) return -1;
      return a.tarih - b.tarih;
    });

    $("timeline").innerHTML = satirlar.map(function (s) {
      return '<div class="tl-item ' + s.durum + '">' +
        '<div class="tl-rail"><div class="tl-dot"></div><div class="tl-line"></div></div>' +
        '<div class="tl-body">' +
        '<div class="tl-title">' + kacar(s.baslik) + '</div>' +
        '<div class="tl-date">' + (s.tarih ? tarihYaz(s.tarih) : "—") + '</div>' +
        (s.not ? '<div class="tl-note">' + kacar(s.not) + '</div>' : '') +
        '</div></div>';
    }).join("");
  }

  /* ---------- Dünyada neler oldu ---------- */

  function dunyadaNeOldu() {
    var bas = beklenenImza;
    if (!bas) return;

    var simdi = new Date();
    var havuz = (C.varsayilanOlaylar === false) ? [] : HAZIR_OLAYLAR.slice();
    if (C.olaylar && C.olaylar.length) havuz = havuz.concat(C.olaylar);

    var liste = havuz
      .map(function (o) { return { d: tarihCoz(o.tarih), baslik: o.baslik, not: o.not }; })
      .filter(function (o) { return o.d && o.baslik && o.d >= bas && o.d <= simdi; })
      .sort(function (a, b) { return a.d - b.d; });

    // Otomatik hesaplanan satırlar
    var gecenGun = gunFarki(bas, bugunBasi()) || 0;
    var otomatik = [];
    if (gecenGun > 0) {
      var kmMilyon = (gecenGun * 86400 * 29.78) / 1e6;   // Dünya'nın yörünge hızı ~29,78 km/sn
      otomatik.push({
        etiket: "Bu arada",
        metin: "Dünya, Güneş’in etrafında " + sayiYaz(kmMilyon) + " milyon km yol aldı."
      });
      var dolunay = Math.floor(gecenGun / 29.53);
      if (dolunay >= 1) {
        otomatik.push({ etiket: "Bu arada", metin: dolunay + " kez dolunay doğup battı." });
      }
      var mev = mevsimSayisi(bas, bugunBasi());
      if (mev >= 1) {
        otomatik.push({ etiket: "Bu arada", metin: "Mevsim " + mev + " kez değişti." });
      }
      otomatik.push({
        etiket: "Bu arada",
        metin: "Takvimden " + sayiYaz(gecenGun) + " gün geçti; sözleşme hâlâ ödeme bekliyor."
      });
    }

    if (!liste.length && !otomatik.length) return;

    $("dunyaBaslik").textContent =
      "İmzalanmasını beklediğimiz " + tarihYaz(bas) + " tarihinden bu yana dünyada neler oldu?";

    var html = liste.map(function (o) {
      return '<li class="ev">' +
        '<span class="ev-date">' + tarihKisa(o.d) + '</span>' +
        '<span class="ev-text">' + kacar(o.baslik) +
        (o.not ? '<span class="ev-note">' + kacar(o.not) + '</span>' : '') +
        '</span></li>';
    }).join("");

    html += otomatik.map(function (o) {
      return '<li class="ev">' +
        '<span class="ev-date">' + o.etiket + '</span>' +
        '<span class="ev-text">' + o.metin + '</span></li>';
    }).join("");

    $("olaylar").innerHTML = html;
    $("dunyaKart").hidden = false;
  }

  /* ---------- Canlı sayaçlar ---------- */

  function sayacBasliklari() {
    if (odendi) {
      $("anaSayacBaslik").textContent = "İmzadan ödemeye kadar geçen süre";
    } else if (imzaBekleniyor) {
      $("anaSayacBaslik").textContent = "İmzayı beklediğimiz tarihten bu yana geçen süre";
    } else {
      $("anaSayacBaslik").textContent = "Sözleşmenin imzalandığı tarihten bu yana geçen süre";
    }
  }

  function sayacYaz(ms) {
    var p = parcala(ms);
    $("kGun").textContent    = p.gun < 100 ? ped(p.gun) : String(p.gun);
    $("kSaat").textContent   = ped(p.saat);
    $("kDakika").textContent = ped(p.dakika);
    $("kSaniye").textContent = ped(p.saniye);
  }

  function tik() {
    var simdi = new Date();
    var son = bitis || simdi;

    /* --- Sayaç 1: imzadan bu yana --- */
    if (baslangic) {
      var gun = parcala(son - baslangic);
      $("gun").textContent    = gun.gun < 100 ? ped(gun.gun) : String(gun.gun);
      $("saat").textContent   = ped(gun.saat);
      $("dakika").textContent = ped(gun.dakika);
      $("saniye").textContent = ped(gun.saniye);

      if (odendi) {
        $("anaSayacAlt").textContent = "Sayaç " + tarihYaz(bitis) + " tarihinde durdu. Emeği geçen herkese teşekkür ederiz.";
      } else if (imzaBekleniyor) {
        $("anaSayacAlt").textContent = "Sözleşme imzalandığında bu sayaç ödeme takvimine geçer.";
      } else {
        $("anaSayacAlt").textContent = tarihYaz(tamImza) + " tarihinde sözleşme yürürlüğe girdi.";
      }
    } else {
      $("anaSayacAlt").textContent = "Tarih bilgisi girilmedi.";
    }

    /* --- Sayaç 2: vadeye kalan / vadeden bu yana --- */
    var hedef = gunSonu(odemeVadesi);
    if (odendi) {
      $("geriSayimBaslik").textContent = "Ödeme durumu";
      sayacYaz(0);
      $("geriSayimAlt").textContent = odemeYapilma
        ? tarihYaz(odemeYapilma) + " tarihinde ödeme alındı. Sayaç mutlu bir şekilde durdu."
        : "Ödeme alındı. Sayaç mutlu bir şekilde durdu.";
    } else if (!hedef) {
      $("geriSayimBaslik").textContent = "Ödeme vadesine kalan süre";
      sayacYaz(0);
      $("geriSayimAlt").textContent = "Vade tarihi, imza tamamlandığında hesaplanacak.";
    } else if (hedef > simdi) {
      $("geriSayimBaslik").textContent = "Ödeme vadesine kalan süre";
      sayacYaz(hedef - simdi);
      $("geriSayimAlt").textContent = tarihYaz(odemeVadesi) + " tarihine kadar ödeme bekleniyor.";
    } else {
      $("geriSayimBaslik").textContent = "Ödeme vadesinin üzerinden geçen süre";
      sayacYaz(simdi - hedef);
      $("geriSayimKart").classList.add("is-late");
      $("geriSayimAlt").textContent = "Vade tarihi " + tarihYaz(odemeVadesi) + " idi.";
    }

    /* --- Sevgi & minnet --- */
    var minnetMs = baslangic ? Math.max(0, son - baslangic) : 0;
    $("minnetSayac").textContent = sayiYaz((minnetMs / 1000) * (+C.minnetKatsayisi));

    var gecikmeGun = (odemeVadesi && !odendi) ? gunFarki(odemeVadesi, bugunBasi()) : -1;
    var sev;

    if (odendi) {
      sev = {
        ad: "Sonsuz teşekkür",
        mesaj: "Ödeme tamamlandı. Bu süreci hızlandıran herkese Cognito ekibi olarak içten teşekkürlerimizi sunuyoruz."
      };
    } else if (gonul && bugunBasi() > gonul && gecikmeGun < 0) {
      sev = {
        ad: "Gönül sayacı çalışıyor",
        mesaj: "Gönlümüzden geçen tarih geçti, resmî vade henüz gelmedi. Ödemeyi erkene çekebilen herkese duyduğumuz sevgi tarifsiz olur."
      };
    } else {
      sev = seviyeBul(gecikmeGun);
    }

    $("minnetSeviye").textContent = sev.ad;
    $("minnetMesaj").textContent  = sev.mesaj;

    var oran;
    if (odendi) {
      oran = 100;
    } else if (gecikmeGun < 0) {
      var toplam = (baslangic && odemeVadesi) ? Math.max(1, gunFarki(baslangic, odemeVadesi)) : 30;
      var gecen  = Math.max(0, toplam + gecikmeGun);
      oran = 5 + (gecen / toplam) * 17;
    } else {
      oran = 25 + Math.min(1, gecikmeGun / 120) * 75;
    }
    $("minnetBar").style.width = Math.max(3, Math.min(100, oran)).toFixed(1) + "%";

    try {
      $("sonGuncelleme").textContent = "Son güncelleme: " + simdi.toLocaleString("tr-TR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit", second: "2-digit"
      });
    } catch (e) { /* yoksay */ }
  }

  /* ---------- Başlat ---------- */

  metniYaz();
  durumuYaz();
  zamanCizelgesi();
  dunyadaNeOldu();
  sayacBasliklari();
  tik();
  setInterval(tik, 250);

})();
