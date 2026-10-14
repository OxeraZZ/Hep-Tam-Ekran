/*
 * Hep Tam Ekran — Firefox eklentisi
 *
 * Firefox açıldığında ve sonradan açılan her pencerede tam ekran moduna
 * geçer. Bu mod, F11 tuşuyla açılan modun aynısıdır.
 *
 * Dokunmadığı pencereler:
 *   - Özel pencereler
 *   - Sitelerin açtığı küçük açılır pencereler (ör. "Google ile giriş yap")
 *   - Simge durumuna küçültülmüş pencereler
 *
 * F11 ile tam ekrandan çıkarsan eklenti seni geri zorlamaz. Yalnızca
 * Firefox açılırken, eklenti ilk kurulduğunda ve yeni pencerelerde
 * devreye girer.
 */

"use strict";

// Yeni açılan bir pencereyi Firefox bir süre daha hazırlar ve bu sırada
// pencerenin durumunu sıfırlayabilir. Bu yüzden tam ekrana aldıktan sonra
// pencereyi bu aralıklarla iki kez daha kontrol ediyoruz. (Bu ~2 saniye
// içinde F11 ile çıkarsan pencere bir kez daha tam ekrana alınabilir.)
const RECHECK_DELAYS_MS = [500, 1500];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Sadece sıradan tarayıcı pencereleri: açılır pencere ya da özel pencere değil.
function isEligible(win) {
  return win.type === "normal" && !win.incognito;
}

// Normal veya büyütülmüş pencereler tam ekrana alınır.
// Küçültülmüş ya da zaten tam ekran olan pencerelere dokunulmaz.
function needsFullscreen(win) {
  return win.state === "normal" || win.state === "maximized";
}

async function getWindow(windowId) {
  try {
    return await browser.windows.get(windowId);
  } catch {
    return null; // Pencere bu arada kapanmış.
  }
}

async function goFullscreen(windowId) {
  try {
    await browser.windows.update(windowId, { state: "fullscreen" });
  } catch (error) {
    console.warn("Hep Tam Ekran: pencere tam ekrana alınamadı", windowId, error);
  }
}

async function makeFullscreen(windowId) {
  let win = await getWindow(windowId);
  if (!win || !isEligible(win) || !needsFullscreen(win)) {
    return;
  }
  await goFullscreen(windowId);

  for (const delay of RECHECK_DELAYS_MS) {
    await sleep(delay);
    win = await getWindow(windowId);
    if (!win) {
      return;
    }
    if (needsFullscreen(win)) {
      await goFullscreen(windowId);
    }
  }
}

async function makeAllFullscreen() {
  let windows;
  try {
    windows = await browser.windows.getAll({ windowTypes: ["normal"] });
  } catch (error) {
    console.warn("Hep Tam Ekran: pencere listesi alınamadı", error);
    return;
  }
  await Promise.all(windows.map((win) => makeFullscreen(win.id)));
}

// Dinleyiciler dosyanın en üst seviyesinde kaydedilmeli: Firefox arka plan
// betiğini boşta kalınca durdurur ve bir olay geldiğinde yeniden başlatır.

// 1) Firefox açıldığında: oturum geri yüklemeyle gelenler dahil tüm pencereler.
browser.runtime.onStartup.addListener(makeAllFullscreen);

// 2) Eklenti ilk kurulduğunda: çalıştığını hemen görebilmen için.
browser.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    makeAllFullscreen();
  }
});

// 3) Sonradan açılan her yeni pencere.
browser.windows.onCreated.addListener((win) => {
  if (isEligible(win)) {
    makeFullscreen(win.id);
  }
});
