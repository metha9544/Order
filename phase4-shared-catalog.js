/*
 * METIST Order - Phase 4 Shared Catalog
 * Load after order-ui-v2.js.
 * Reads the shared catalog from Supabase; falls back to the existing defaults if unavailable.
 */
(() => {
  "use strict";
  if (window.__metistPhase4OrderLoaded) return;
  window.__metistPhase4OrderLoaded = true;

  const DEFAULT_CATALOG = {
    flowers: [
      { name:"แดง", color:"#e63946", active:true },
      { name:"ขาว", color:"#ffffff", active:true },
      { name:"ชมพู", color:"#f7b2cc", active:true },
      { name:"น้ำเงิน", color:"#457b9d", active:true },
      { name:"ม่วง", color:"#9b5de5", active:true }
    ],
    papers: [
      { name:"ดำ", color:"#333333", active:true },
      { name:"ขาว", color:"#ffffff", active:true },
      { name:"ชมพู", color:"#f7b2cc", active:true },
      { name:"แดง", color:"#e63946", active:true }
    ],
    bows: [
      { name:"แดง", color:"#e63946", active:true },
      { name:"ขาว", color:"#ffffff", active:true },
      { name:"ชมพู", color:"#f7b2cc", active:true },
      { name:"น้ำเงิน", color:"#457b9d", active:true },
      { name:"ม่วง", color:"#9b5de5", active:true },
      { name:"ชมพูแก้ว", color:"#ff007f", active:true },
      { name:"แดงแก้ว", color:"#b91d1d", active:true }
    ],
    extras: [
      { name:"ผีเสื้อ", price:5, active:true },
      { name:"มงกุฎ", price:10, active:true },
      { name:"ไฟLED", price:25, active:true },
      { name:"ไข่มุก", price:0, active:true },
      { name:"ขอบลูกไม้", price:0, active:true },
      { name:"ขอบมุก", price:0, active:true },
      { name:"การ์ด", price:0, active:true }
    ]
  };

  let catalog = JSON.parse(JSON.stringify(DEFAULT_CATALOG));
  let catalogRevision = null;

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[ch]));
  const token = (value) => encodeURIComponent(String(value)).replace(/'/g,"%27");
  const decodeToken = (value) => decodeURIComponent(value);

  function readableTextColor(hex) {
    const m = /^#([0-9a-f]{6})$/i.exec(hex || "");
    if (!m) return "#4b3b40";
    const n = parseInt(m[1],16);
    const r=(n>>16)&255, g=(n>>8)&255, b=n&255;
    return (0.299*r + 0.587*g + 0.114*b) > 180 ? "#4b3b40" : "#fff";
  }

  function normalize(input) {
    const src = input && typeof input === "object" ? input : DEFAULT_CATALOG;
    const out = {};
    for (const category of ["flowers","papers","bows","extras"]) {
      const fallback = DEFAULT_CATALOG[category];
      const items = Array.isArray(src[category]) ? src[category] : fallback;
      const seen = new Set();
      out[category] = [];
      for (const item of items) {
        if (!item || item.active === false) continue;
        const name = String(item.name || "").trim();
        if (!name) continue;
        const key = name.toLocaleLowerCase("th-TH");
        if (seen.has(key)) continue;
        seen.add(key);
        if (category === "extras") {
          const price = Number(item.price);
          out[category].push({ name, price: Number.isFinite(price) && price >= 0 ? price : 0, active:true });
        } else {
          const color = String(item.color || "#cccccc");
          out[category].push({ name, color:/^#[0-9a-f]{6}$/i.test(color) ? color : "#cccccc", active:true });
        }
      }
    }
    return out;
  }

  function pruneSelections() {
    const flowerNames = new Set(catalog.flowers.map(x => x.name));
    for (const type of ["พื้น","กริตเตอร์"]) {
      const bucket = currentFlowerData?.[type];
      if (!bucket) continue;
      for (const name of Object.keys(bucket)) {
        if (!flowerNames.has(name)) delete bucket[name];
      }
    }

    const paperNames = new Set(catalog.papers.map(x => x.name));
    selectedPapers = [...new Set(selectedPapers || [])].filter(x => paperNames.has(x));

    const bowNames = new Set(catalog.bows.map(x => x.name));
    selectedBows = [...new Set(selectedBows || [])].filter(x => bowNames.has(x));

    const extraNames = new Set(catalog.extras.map(x => x.name));
    for (const name of Object.keys(selectedExtras || {})) {
      if (!extraNames.has(name)) delete selectedExtras[name];
    }
  }

  function getFlowerCount() {
    let total = 0;
    for (const type of Object.keys(currentFlowerData || {})) {
      for (const count of Object.values(currentFlowerData[type] || {})) {
        total += Math.max(0, Number(count) || 0);
      }
    }
    return total;
  }

  function calculateParts() {
    const totalFlowers = getFlowerCount();
    let flowerPrice = 0;
    if (totalFlowers > 0) {
      const keys = Object.keys(priceTable).map(Number).sort((a,b) => b-a);
      const baseKey = keys.find(k => k <= totalFlowers) || 1;
      flowerPrice = Math.round((priceTable[baseKey] / baseKey) * totalFlowers);
    }

    const isFree = totalFlowers >= 10;
    const freeExtras = ["มงกุฎ","ผีเสื้อ","ไข่มุก","การ์ด","ไฟLED"];
    let extrasTotal = 0;
    for (const item of catalog.extras) {
      const qty = Math.max(0, Number(selectedExtras?.[item.name]) || 0);
      const price = isFree && freeExtras.includes(item.name) ? 0 : Number(item.price || 0);
      extrasTotal += qty * price;
    }

    const cutterNormal = Math.max(0, Number(cutter?.normal) || 0);
    const cutterSwitch = Math.max(0, Number(cutter?.switch) || 0);
    const cutterTotal = cutterNormal * 125 + cutterSwitch * 145;

    return {
      totalFlowers,
      flowerPrice,
      extrasTotal,
      flowerTotal: flowerPrice + extrasTotal,
      cutterNormal,
      cutterSwitch,
      cutterTotal,
      total: flowerPrice + extrasTotal + cutterTotal,
      isFree
    };
  }

  window.orderV2AdjustFlower = function(nameToken, delta) {
    const name = decodeToken(nameToken);
    const type = document.querySelector('input[name="flowerType"]:checked')?.value || "กริตเตอร์";
    currentFlowerData[type] ||= {};
    const next = Math.max(0, (Number(currentFlowerData[type][name]) || 0) + Number(delta || 0));
    if (next === 0) delete currentFlowerData[type][name];
    else currentFlowerData[type][name] = next;
    renderFlowers();
    calculateAutoPrice();
  };

  window.renderFlowers = function renderFlowers() {
    const grid = document.getElementById("flower-grid");
    if (!grid) return;
    grid.className = "p2-stepper-grid";
    const type = document.querySelector('input[name="flowerType"]:checked')?.value || "กริตเตอร์";

    if (!catalog.flowers.length) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:#999;padding:18px;">ขณะนี้ยังไม่มีสีดอกไม้ให้เลือก</div>`;
      return;
    }

    grid.innerHTML = catalog.flowers.map(item => {
      const count = Math.max(0, Number(currentFlowerData?.[type]?.[item.name]) || 0);
      return `
        <div class="p2-option">
          <div class="p2-option-head">
            <span class="p2-swatch" style="background:${esc(item.color)}"></span>
            <div style="min-width:0;flex:1">
              <div class="p2-option-name">${esc(item.name)}</div>
              <div class="p2-option-sub">${esc(type)}</div>
            </div>
          </div>
          <div class="p2-stepper">
            <button type="button" class="p2-minus" onclick="orderV2AdjustFlower('${token(item.name)}',-1)">−</button>
            <div class="p2-qty">${count}</div>
            <button type="button" class="p2-plus" onclick="orderV2AdjustFlower('${token(item.name)}',1)">＋</button>
          </div>
        </div>`;
    }).join("");
  };

  window.orderV2TogglePaper = function(nameToken) {
    const name = decodeToken(nameToken);
    selectedPapers = [...new Set(selectedPapers || [])];
    selectedPapers = selectedPapers.includes(name)
      ? selectedPapers.filter(x => x !== name)
      : [...selectedPapers, name];
    renderPaperGrid();
  };

  window.orderV2ToggleBow = function(nameToken) {
    const name = decodeToken(nameToken);
    selectedBows = [...new Set(selectedBows || [])];
    selectedBows = selectedBows.includes(name)
      ? selectedBows.filter(x => x !== name)
      : [...selectedBows, name];
    renderBowGrid();
  };

  function renderToggleGrid(items, gridId, selected, fnName) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    grid.className = "p2-toggle-grid";
    const set = new Set(selected || []);

    if (!items.length) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:#999;padding:18px;">ขณะนี้ยังไม่มีตัวเลือก</div>`;
      return;
    }

    grid.innerHTML = items.map(item => {
      const selectedNow = set.has(item.name);
      return `
        <button type="button" class="p2-toggle ${selectedNow ? "selected" : ""}"
          style="background:${esc(item.color)};color:${readableTextColor(item.color)}"
          onclick="${fnName}('${token(item.name)}')">
          ${selectedNow ? '<span class="p2-check">✓</span>' : ""}
          ${esc(item.name)}
        </button>`;
    }).join("");
  }

  function renderPaperGrid() {
    selectedPapers = [...new Set(selectedPapers || [])];
    renderToggleGrid(catalog.papers, "paper-grid", selectedPapers, "orderV2TogglePaper");
    const label = document.getElementById("paperChoice");
    if (label) label.textContent = "เลือก: " + (selectedPapers.join(", ") || "-");
  }

  function renderBowGrid() {
    selectedBows = [...new Set(selectedBows || [])];
    renderToggleGrid(catalog.bows, "bow-grid", selectedBows, "orderV2ToggleBow");
    const label = document.getElementById("bowChoice");
    if (label) label.textContent = "เลือก: " + (selectedBows.join(", ") || "-");
  }

  window.orderV2AdjustExtra = function(nameToken, delta) {
    const name = decodeToken(nameToken);
    const next = Math.max(0, (Number(selectedExtras?.[name]) || 0) + Number(delta || 0));
    if (next === 0) delete selectedExtras[name];
    else selectedExtras[name] = next;
    renderExtrasGrid();
    renderExtraChoice();
    calculateAutoPrice();
  };

  function renderExtrasGrid() {
    const grid = document.getElementById("extra-grid");
    if (!grid) return;
    grid.className = "p2-stepper-grid";

    if (!catalog.extras.length) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:#999;padding:18px;">ขณะนี้ยังไม่มีของตกแต่งให้เลือก</div>`;
      return;
    }

    grid.innerHTML = catalog.extras.map(item => {
      const qty = Math.max(0, Number(selectedExtras?.[item.name]) || 0);
      return `
        <div class="p2-option">
          <div class="p2-option-head">
            <span style="font-size:23px;width:31px;text-align:center">✨</span>
            <div style="min-width:0;flex:1">
              <div class="p2-option-name">${esc(item.name)}</div>
              <div class="p2-option-sub">${Number(item.price).toLocaleString()} บาท / ชิ้น</div>
            </div>
          </div>
          <div class="p2-stepper">
            <button type="button" class="p2-minus" onclick="orderV2AdjustExtra('${token(item.name)}',-1)">−</button>
            <div class="p2-qty">${qty}</div>
            <button type="button" class="p2-plus" onclick="orderV2AdjustExtra('${token(item.name)}',1)">＋</button>
          </div>
        </div>`;
    }).join("");
  }

  function renderExtraChoice() {
    const list = Object.keys(selectedExtras || {})
      .filter(k => Number(selectedExtras[k]) > 0)
      .map(k => `${k} x${Number(selectedExtras[k])}`);
    const label = document.getElementById("extraChoice");
    if (label) label.textContent = "เลือก: " + (list.join(", ") || "-");
  }

  window.calculateAutoPrice = function calculateAutoPrice() {
    const parts = calculateParts();
    const summary = document.getElementById("summary-text");
    const sticky = document.getElementById("p2-sticky-total");

    if (summary) {
      summary.firstChild && (summary.firstChild.textContent = "");
      const breakdown = document.getElementById("p2-breakdown");
      if (breakdown) {
        breakdown.innerHTML = `
          ${parts.totalFlowers > 0 ? `<div class="p2-breakdown-row"><span>🌹 ดอกไม้ ${parts.totalFlowers} ดอก</span><b>${parts.flowerPrice.toLocaleString()} ฿</b></div>` : ""}
          ${parts.extrasTotal > 0 ? `<div class="p2-breakdown-row"><span>✨ ของตกแต่ง</span><b>${parts.extrasTotal.toLocaleString()} ฿</b></div>` : ""}
          ${parts.isFree && Object.keys(selectedExtras || {}).some(k => Number(selectedExtras[k]) > 0) ? `<div class="p2-breakdown-row"><span>🎁 สิทธิ์ของตกแต่งฟรี 10+ ดอก</span><b>ใช้แล้ว</b></div>` : ""}
          ${parts.cutterTotal > 0 ? `<div class="p2-breakdown-row"><span>✂️ เครื่องตัด ${parts.cutterNormal + parts.cutterSwitch} เครื่อง</span><b>${parts.cutterTotal.toLocaleString()} ฿</b></div>` : ""}
          <div class="p2-breakdown-row total"><span>ยอดรวมทั้งหมด</span><span>${parts.total.toLocaleString()} ฿</span></div>`;
      } else {
        summary.innerHTML = `<b>ยอดรวมทั้งหมด: ${parts.total.toLocaleString()} ฿</b>`;
      }
    }
    if (sticky) sticky.textContent = `${parts.total.toLocaleString()} ฿`;
    return parts.total;
  };

  window.resetPart = function resetPart(part) {
    if (part === "flowers") {
      currentFlowerData = { "พื้น": {}, "กริตเตอร์": {} };
      renderFlowers();
    } else if (part === "papers") {
      selectedPapers = [];
      renderPaperGrid();
    } else if (part === "bows") {
      selectedBows = [];
      renderBowGrid();
    } else if (part === "extras") {
      selectedExtras = {};
      renderExtrasGrid();
      renderExtraChoice();
    }
    calculateAutoPrice();
  };

  function validateCheckout() {
    const name = String(document.getElementById("custName")?.value || "").trim();
    const address = String(document.getElementById("custAddress")?.value || "").trim();
    const slipFile = document.getElementById("slipInput")?.files?.[0];
    const parts = calculateParts();

    if (name.length < 2) return { error:"กรุณากรอกชื่อ TikTok หรือ LINE ให้ครบ" };
    if (address.length < 8) return { error:"กรุณากรอกชื่อ ที่อยู่ และเบอร์โทรสำหรับจัดส่งให้ครบ" };
    if (parts.total <= 0) return { error:"กรุณาเลือกสินค้าอย่างน้อย 1 รายการ" };
    if (!slipFile) return { error:"กรุณาแนบหลักฐานการโอนเงิน" };
    if (!String(slipFile.type || "").startsWith("image/")) return { error:"ไฟล์สลิปต้องเป็นรูปภาพ" };
    if (slipFile.size > 10 * 1024 * 1024) return { error:"รูปสลิปมีขนาดเกิน 10 MB กรุณาใช้รูปที่เล็กลง" };
    return { name, address, slipFile, parts };
  }

  function makeBundleId() {
    if (window.crypto?.randomUUID) return crypto.randomUUID();
    return `bundle-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  }

  async function uploadSlip(file) {
    const extFromName = String(file.name || "").split(".").pop().toLowerCase();
    const safeExt = /^[a-z0-9]{2,5}$/.test(extFromName) ? extFromName : "jpg";
    const random = window.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    const fileName = `slip_${random}.${safeExt}`;

    const { error: uploadError } = await _supabase.storage
      .from("slips")
      .upload(fileName, file, { cacheControl:"3600", upsert:false });
    if (uploadError) throw uploadError;

    const { data: urlData } = _supabase.storage.from("slips").getPublicUrl(fileName);
    if (!urlData?.publicUrl) throw new Error("ไม่สามารถสร้างลิงก์สลิปได้");
    return urlData.publicUrl;
  }

  function buildRows(name, address, slipUrl, parts) {
    const rows = [];
    const bundleId = makeBundleId();
    const hasFlowers = parts.totalFlowers > 0;
    const hasCutter = parts.cutterNormal + parts.cutterSwitch > 0;

    if (hasFlowers) {
      rows.push({
        name,
        total: parts.flowerTotal,
        status: false,
        details: {
          orderVersion: 2,
          catalogRevision,
          bundleId,
          productKind:"flower",
          address,
          isCutter:false,
          hasFlowers:true,
          qty:1,
          flowers: currentFlowerData,
          paper:[...new Set(selectedPapers || [])].join(", "),
          bow:[...new Set(selectedBows || [])].join(", "),
          extras:{ ...(selectedExtras || {}) },
          basePrice:parts.flowerTotal
        },
        slip_url:slipUrl
      });
    }

    if (hasCutter) {
      rows.push({
        name,
        total:parts.cutterTotal,
        status:false,
        details: {
          orderVersion:2,
          catalogRevision,
          bundleId,
          productKind:"cutter",
          address,
          isCutter:true,
          hasCutter:true,
          qty:parts.cutterNormal + parts.cutterSwitch,
          cutterDetails:{ normal:parts.cutterNormal, withSwitch:parts.cutterSwitch },
          basePrice:parts.cutterTotal
        },
        slip_url:slipUrl
      });
    }
    return rows;
  }

  window.submitToAdmin = async function submitToAdmin() {
    const btn = document.getElementById("submitBtn");
    if (!btn || btn.disabled) return;

    const checked = validateCheckout();
    if (checked.error) {
      alert(checked.error);
      return;
    }

    const { name, address, slipFile, parts } = checked;
    btn.disabled = true;
    btn.textContent = "กำลังอัปโหลดสลิป...";

    try {
      const slipUrl = await uploadSlip(slipFile);
      btn.textContent = "กำลังส่งออเดอร์...";

      const rows = buildRows(name, address, slipUrl, parts);
      if (!rows.length) throw new Error("ไม่มีรายการสินค้าที่จะส่ง");

      const { error: insertError } = await _supabase.from("orders").insert(rows);
      if (insertError) throw insertError;

      const modal = document.getElementById("successModal");
      if (modal) modal.style.display = "flex";
      const title = modal?.querySelector("h2");
      if (title) title.textContent = "ส่งออเดอร์สำเร็จ! ✨";

      const successParagraph = modal?.querySelector("p");
      if (successParagraph && rows.length > 1) {
        successParagraph.innerHTML = `ดอกไม้และเครื่องตัดถูกแยกเป็นรายการให้ร้านจัดการอัตโนมัติ<br><b>คุณไม่ต้องส่งออเดอร์ซ้ำ</b>`;
      }
      btn.textContent = "ส่งออเดอร์สำเร็จแล้ว ✨";
    } catch (err) {
      alert("เกิดข้อผิดพลาด: " + (err?.message || String(err)));
      btn.disabled = false;
      btn.textContent = "ส่งออเดอร์ให้ร้าน 🌸";
    }
  };

  function refreshUI() {
    pruneSelections();
    renderFlowers();
    renderPaperGrid();
    renderBowGrid();
    renderExtrasGrid();
    renderExtraChoice();
    calculateAutoPrice();

    const extraNote = document.getElementById("extra-grid")?.closest(".card")?.querySelector("p");
    if (extraNote) {
      extraNote.textContent = "ราคาของตกแต่งแสดงใต้แต่ละรายการ · 10 ดอกขึ้นไปใช้สิทธิ์ฟรีตามเงื่อนไขร้าน";
    }
  }

  function applyRemote(row) {
    if (!row?.catalog) return;
    catalog = normalize(row.catalog);
    catalogRevision = Number(row.revision) || null;
    refreshUI();
  }

  async function fetchCatalog() {
    try {
      const { data, error } = await _supabase
        .from("catalog_config")
        .select("catalog,revision,updated_at")
        .eq("id","main")
        .maybeSingle();
      if (error) throw error;
      if (data?.catalog) applyRemote(data);
    } catch (err) {
      console.warn("METIST Phase 4 catalog fetch failed; using defaults", err);
    }
  }

  function startRealtime() {
    try {
      _supabase
        .channel("metist-catalog-order-v1")
        .on(
          "postgres_changes",
          { event:"*", schema:"public", table:"catalog_config", filter:"id=eq.main" },
          (payload) => {
            if (payload?.new?.catalog) applyRemote(payload.new);
          }
        )
        .subscribe();
    } catch (err) {
      console.warn("METIST Phase 4 catalog realtime unavailable", err);
    }

    setInterval(fetchCatalog, 60000);
  }

  async function init() {
    await fetchCatalog();
    startRealtime();
    console.info("METIST Phase 4 shared catalog loaded (Order)");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once:true });
  } else {
    init();
  }
})();
