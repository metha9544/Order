/*
 * METIST Order - Customer UI v2
 * Load after the existing inline script.
 * Keeps existing Supabase project and pricing logic, improves UX and data consistency.
 */
(() => {
  "use strict";

  const CATALOG = {
    flowers: [
      { name: "แดง", color: "#e63946" },
      { name: "ขาว", color: "#ffffff" },
      { name: "ชมพู", color: "#f7b2cc" },
      { name: "น้ำเงิน", color: "#457b9d" },
      { name: "ม่วง", color: "#9b5de5" }
    ],
    papers: [
      { name: "ดำ", color: "#333333" },
      { name: "ขาว", color: "#ffffff" },
      { name: "ชมพู", color: "#f7b2cc" },
      { name: "แดง", color: "#e63946" }
    ],
    bows: [
      { name: "แดง", color: "#e63946" },
      { name: "ขาว", color: "#ffffff" },
      { name: "ชมพู", color: "#f7b2cc" },
      { name: "น้ำเงิน", color: "#457b9d" },
      { name: "ม่วง", color: "#9b5de5" },
      { name: "ชมพูแก้ว", color: "#ff007f" },
      { name: "แดงแก้ว", color: "#b91d1d" }
    ],
    extras: [
      { name: "ผีเสื้อ", price: 5 },
      { name: "มงกุฎ", price: 10 },
      { name: "ไฟLED", price: 25 },
      { name: "ไข่มุก", price: 0 },
      { name: "ขอบลูกไม้", price: 0 },
      { name: "ขอบมุก", price: 0 },
      { name: "การ์ด", price: 0 }
    ]
  };

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[ch]));

  const token = (value) => encodeURIComponent(String(value)).replace(/'/g, "%27");
  const decodeToken = (value) => decodeURIComponent(value);

  function readableTextColor(hex) {
    const m = /^#([0-9a-f]{6})$/i.exec(hex || "");
    if (!m) return "#4b3b40";
    const n = parseInt(m[1], 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) > 180 ? "#4b3b40" : "#fff";
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
      const keys = Object.keys(priceTable).map(Number).sort((a, b) => b - a);
      const baseKey = keys.find(k => k <= totalFlowers) || 1;
      flowerPrice = Math.round((priceTable[baseKey] / baseKey) * totalFlowers);
    }

    const isFree = totalFlowers >= 10;
    const freeExtras = ["มงกุฎ", "ผีเสื้อ", "ไข่มุก", "การ์ด", "ไฟLED"];
    let extrasTotal = 0;

    for (const item of CATALOG.extras) {
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

  function injectStyles() {
    if (document.getElementById("order-ui-v2-style")) return;
    const style = document.createElement("style");
    style.id = "order-ui-v2-style";
    style.textContent = `
      :root {
        --pink:#f8c8dc; --pink-dark:#c96f89; --pink-soft:#fff4f7;
        --purple:#e6d9ff; --green:#d9f5e3; --cutter-color:#238f85;
        --text:#503c43; --muted:#927e85; --line:#f0e2e7; --surface:#fff;
      }
      html { scroll-behavior:smooth; }
      body {
        max-width:720px; margin:0 auto !important; padding:16px 14px 108px !important;
        background:linear-gradient(180deg,#fff8fb 0,#fdf2f7 42%,#fff 100%) !important;
        color:var(--text);
      }
      button,input,textarea { font-family:inherit; }
      button { -webkit-tap-highlight-color:transparent; }
      .header {
        background:rgba(255,255,255,.82); border:1px solid rgba(240,226,231,.9);
        border-radius:24px; padding:18px 14px; margin-bottom:14px !important;
        box-shadow:0 10px 30px rgba(180,100,125,.08);
      }
      .header h1 { font-size:1.9rem !important; letter-spacing:.3px; }
      .header p { margin-top:5px !important; letter-spacing:1.5px !important; }
      .p2-brand-sub { margin-top:8px; font-size:11px; color:var(--muted); }
      .card {
        border:1px solid var(--line); box-shadow:0 8px 24px rgba(180,100,125,.08) !important;
        border-radius:22px !important; padding:17px !important;
      }
      h2 { font-size:1.05rem !important; }
      input[type="text"], textarea {
        border:1px solid #ead8df !important; background:#fffcfd; outline:none;
        transition:border-color .2s,box-shadow .2s;
      }
      input[type="text"]:focus, textarea:focus {
        border-color:var(--pink-dark) !important; box-shadow:0 0 0 3px rgba(201,111,137,.10);
      }
      textarea { resize:vertical !important; min-height:92px; }
      .p2-step {
        display:inline-flex; align-items:center; justify-content:center; width:24px; height:24px;
        border-radius:50%; margin-right:6px; background:var(--pink-dark); color:#fff;
        font-size:11px; font-weight:800;
      }
      .p2-note {
        font-size:11px; color:var(--muted); line-height:1.55; margin:-4px 0 12px;
      }
      .p2-stepper-grid {
        display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px;
      }
      .p2-option {
        border:1px solid #eee; border-radius:15px; background:#fff; padding:10px;
        box-shadow:0 3px 10px rgba(0,0,0,.035); min-width:0;
      }
      .p2-option-head { display:flex; align-items:center; gap:8px; min-width:0; }
      .p2-swatch {
        width:31px; height:31px; border-radius:50%; border:2px solid #fff;
        outline:1px solid #ddd; flex:0 0 auto;
      }
      .p2-option-name { font-size:12px; font-weight:800; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .p2-option-sub { font-size:10px; color:#999; margin-top:2px; }
      .p2-stepper {
        display:grid; grid-template-columns:38px 1fr 38px; gap:5px; align-items:center; margin-top:9px;
      }
      .p2-stepper button {
        height:36px; border:none; border-radius:11px; font-size:20px; font-weight:800; cursor:pointer;
      }
      .p2-minus { background:#f2f2f2; color:#777; }
      .p2-plus { background:#fff0f3; color:var(--pink-dark); }
      .p2-qty {
        height:36px; display:flex; align-items:center; justify-content:center; border-radius:11px;
        background:#fafafa; font-size:14px; font-weight:800;
      }
      .p2-toggle-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; }
      .p2-toggle {
        position:relative; min-height:54px; border:2px solid transparent; border-radius:13px;
        padding:9px 5px; font-size:11px; font-weight:800; cursor:pointer;
      }
      .p2-toggle.selected {
        border-color:var(--pink-dark); box-shadow:0 0 0 2px rgba(201,111,137,.14);
      }
      .p2-check {
        position:absolute; right:5px; top:4px; width:18px; height:18px; border-radius:50%;
        display:flex; align-items:center; justify-content:center; background:var(--pink-dark);
        color:#fff; font-size:10px;
      }
      .type-selector {
        padding:5px !important; border:1px solid #f2dce4; background:#fff8fa !important;
      }
      .type-selector label {
        flex:1; text-align:center; border-radius:10px; padding:7px 5px; cursor:pointer;
      }
      .type-selector input { margin-right:4px; }
      .btn-reset-mini { background:#f5f2f3 !important; padding:6px 9px !important; }
      .image-gallery {
        background:#fff; border:1px solid var(--line); border-radius:20px; padding:10px;
        box-shadow:0 6px 20px rgba(180,100,125,.06);
      }
      .img-thumb { aspect-ratio:4/5; object-fit:cover; }
      .btn-zoom { padding:8px !important; border-radius:10px !important; }
      .cutter-item { border-radius:14px !important; }
      .qty-box { gap:7px !important; padding:4px 6px !important; }
      .btn-qty {
        width:38px; height:36px; border-radius:10px !important; background:#edf8f6 !important;
      }
      .qty-num { min-width:34px !important; }
      .summary-bar {
        border:none !important; background:linear-gradient(135deg,#fff0f3,#f6efff) !important;
        border-radius:16px !important; padding:15px !important;
      }
      #p2-breakdown {
        margin-top:10px; padding-top:10px; border-top:1px dashed #e2cdd5;
        display:grid; gap:5px; font-size:12px;
      }
      .p2-breakdown-row { display:flex; justify-content:space-between; gap:10px; }
      .p2-breakdown-row.total { font-size:15px; font-weight:800; color:var(--pink-dark); margin-top:4px; }
      .qr-code { max-width:190px; width:58vw !important; height:auto !important; }
      #slipInput {
        width:100%; box-sizing:border-box; border:1px dashed #dcbac5; padding:12px;
        border-radius:13px; background:#fff9fb;
      }
      #p2-slip-preview {
        display:none; margin-top:10px; padding:9px; border-radius:13px; background:#fafafa;
        align-items:center; gap:10px; font-size:11px; color:#777;
      }
      #p2-slip-preview img { width:56px; height:56px; border-radius:10px; object-fit:cover; }
      .delivery-info { background:#fff !important; border:1px solid var(--line) !important; }
      .btn-submit {
        min-height:54px; box-shadow:0 10px 24px rgba(201,111,137,.22);
      }
      .btn-submit:disabled { opacity:.55; cursor:not-allowed; box-shadow:none; }
      #p2-sticky {
        position:fixed; z-index:1200; left:50%; transform:translateX(-50%);
        bottom:max(10px,env(safe-area-inset-bottom)); width:min(calc(100% - 24px),696px);
        background:rgba(255,255,255,.94); backdrop-filter:blur(14px); border:1px solid #eedde3;
        border-radius:18px; padding:9px 10px; box-sizing:border-box;
        box-shadow:0 12px 35px rgba(84,53,64,.18); display:flex; align-items:center; gap:10px;
      }
      .p2-sticky-text { flex:1; min-width:0; }
      .p2-sticky-label { font-size:10px; color:#968087; }
      .p2-sticky-total { font-size:17px; font-weight:900; color:var(--pink-dark); }
      .p2-sticky-btn {
        border:none; background:var(--pink-dark); color:white; border-radius:13px; padding:12px 14px;
        font-weight:800; cursor:pointer;
      }
      .p2-security-note {
        font-size:10px; line-height:1.5; color:#999; text-align:center; margin:8px 0 0;
      }
      .success-content { max-width:380px !important; }
      @media (max-width:380px) {
        .p2-stepper-grid { grid-template-columns:1fr; }
        .p2-toggle-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
      }
    `;
    document.head.appendChild(style);
  }

  function enhanceStaticDOM() {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) viewport.setAttribute("content", "width=device-width, initial-scale=1.0");

    const header = document.querySelector(".header");
    if (header && !header.querySelector(".p2-brand-sub")) {
      const sub = document.createElement("div");
      sub.className = "p2-brand-sub";
      sub.textContent = "เลือกแบบที่ชอบ เช็กยอด แล้วส่งออเดอร์ได้ในหน้าเดียว";
      header.appendChild(sub);
    }

    const cards = [...document.querySelectorAll(".card")];
    const stepMap = [
      ["ข้อมูลการติดต่อ", "1"],
      ["เครื่องตัดริบบิ้น", "2"],
      ["เลือกสีดอกไม้", "3"],
      ["เลือกกระดาษห่อ", "4"],
      ["เลือกโบว์", "5"],
      ["ของตกแต่ง", "6"],
      ["ยอดชำระ", "7"]
    ];
    for (const card of cards) {
      const h2 = card.querySelector("h2");
      if (!h2 || h2.querySelector(".p2-step")) continue;
      const text = h2.textContent || "";
      const found = stepMap.find(([needle]) => text.includes(needle));
      if (found) {
        const badge = document.createElement("span");
        badge.className = "p2-step";
        badge.textContent = found[1];
        h2.prepend(badge);
      }
    }

    const flowerCard = document.getElementById("flower-grid")?.closest(".card");
    if (flowerCard && !flowerCard.querySelector(".p2-note")) {
      const note = document.createElement("p");
      note.className = "p2-note";
      note.textContent = "กด + หรือ − เพื่อกำหนดจำนวนแต่ละสี";
      flowerCard.querySelector(".type-selector")?.insertAdjacentElement("beforebegin", note);
    }

    for (const [id, text] of [
      ["paper-grid", "แตะสีเพื่อเลือก และแตะซ้ำเพื่อยกเลิก"],
      ["bow-grid", "แตะสีเพื่อเลือก และแตะซ้ำเพื่อยกเลิก"],
      ["extra-grid", "กด + หรือ − เพื่อกำหนดจำนวนของตกแต่ง"]
    ]) {
      const grid = document.getElementById(id);
      const card = grid?.closest(".card");
      if (card && !card.querySelector(`.p2-note[data-for="${id}"]`)) {
        const note = document.createElement("p");
        note.className = "p2-note";
        note.dataset.for = id;
        note.textContent = text;
        grid.insertAdjacentElement("beforebegin", note);
      }
    }

    const summary = document.getElementById("summary-text");
    if (summary && !document.getElementById("p2-breakdown")) {
      summary.insertAdjacentHTML("beforeend", `<div id="p2-breakdown"></div>`);
    }

    const slip = document.getElementById("slipInput");
    if (slip && !document.getElementById("p2-slip-preview")) {
      const preview = document.createElement("div");
      preview.id = "p2-slip-preview";
      preview.innerHTML = `<img alt="ตัวอย่างสลิป"><div><b>ตรวจสอบรูปก่อนส่ง</b><br><span id="p2-slip-name"></span></div>`;
      slip.insertAdjacentElement("afterend", preview);
      slip.addEventListener("change", previewSlip);
    }

    const submit = document.getElementById("submitBtn");
    if (submit && !document.querySelector(".p2-security-note")) {
      const note = document.createElement("div");
      note.className = "p2-security-note";
      note.textContent = "ระบบจะส่งข้อมูลออเดอร์และรูปสลิปให้ร้านหลังจากกดปุ่มด้านบน";
      submit.insertAdjacentElement("afterend", note);
    }

    if (!document.getElementById("p2-sticky")) {
      const sticky = document.createElement("div");
      sticky.id = "p2-sticky";
      sticky.innerHTML = `
        <div class="p2-sticky-text">
          <div class="p2-sticky-label">ยอดรวมปัจจุบัน</div>
          <div class="p2-sticky-total" id="p2-sticky-total">0 ฿</div>
        </div>
        <button type="button" class="p2-sticky-btn" id="p2-go-pay">ดูยอด / ชำระ</button>`;
      document.body.appendChild(sticky);
      document.getElementById("p2-go-pay").addEventListener("click", () => {
        document.getElementById("summary-text")?.closest(".card")?.scrollIntoView({ behavior:"smooth", block:"start" });
      });
    }
  }

  function previewSlip() {
    const file = document.getElementById("slipInput")?.files?.[0];
    const box = document.getElementById("p2-slip-preview");
    if (!box) return;

    if (!file || !file.type.startsWith("image/")) {
      box.style.display = "none";
      return;
    }

    const img = box.querySelector("img");
    const name = document.getElementById("p2-slip-name");
    const url = URL.createObjectURL(file);
    img.onload = () => URL.revokeObjectURL(url);
    img.src = url;
    name.textContent = file.name;
    box.style.display = "flex";
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

    grid.innerHTML = CATALOG.flowers.map(item => {
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
    renderToggleGrid(CATALOG.papers, "paper-grid", selectedPapers, "orderV2TogglePaper");
    const label = document.getElementById("paperChoice");
    if (label) label.textContent = "เลือก: " + (selectedPapers.join(", ") || "-");
  }

  function renderBowGrid() {
    selectedBows = [...new Set(selectedBows || [])];
    renderToggleGrid(CATALOG.bows, "bow-grid", selectedBows, "orderV2ToggleBow");
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

    grid.innerHTML = CATALOG.extras.map(item => {
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

    if (name.length < 2) return { error: "กรุณากรอกชื่อ TikTok หรือ LINE ให้ครบ" };
    if (address.length < 8) return { error: "กรุณากรอกชื่อ ที่อยู่ และเบอร์โทรสำหรับจัดส่งให้ครบ" };
    if (parts.total <= 0) return { error: "กรุณาเลือกสินค้าอย่างน้อย 1 รายการ" };
    if (!slipFile) return { error: "กรุณาแนบหลักฐานการโอนเงิน" };
    if (!String(slipFile.type || "").startsWith("image/")) return { error: "ไฟล์สลิปต้องเป็นรูปภาพ" };
    if (slipFile.size > 10 * 1024 * 1024) return { error: "รูปสลิปมีขนาดเกิน 10 MB กรุณาใช้รูปที่เล็กลง" };

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
          bundleId,
          productKind: "flower",
          address,
          isCutter: false,
          hasFlowers: true,
          qty: 1,
          flowers: currentFlowerData,
          paper: [...new Set(selectedPapers || [])].join(", "),
          bow: [...new Set(selectedBows || [])].join(", "),
          extras: { ...(selectedExtras || {}) },
          basePrice: parts.flowerTotal
        },
        slip_url: slipUrl
      });
    }

    if (hasCutter) {
      rows.push({
        name,
        total: parts.cutterTotal,
        status: false,
        details: {
          orderVersion: 2,
          bundleId,
          productKind: "cutter",
          address,
          isCutter: true,
          hasCutter: true,
          qty: parts.cutterNormal + parts.cutterSwitch,
          cutterDetails: {
            normal: parts.cutterNormal,
            withSwitch: parts.cutterSwitch
          },
          basePrice: parts.cutterTotal
        },
        slip_url: slipUrl
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

  function init() {
    injectStyles();
    enhanceStaticDOM();

    // Align the visible choices with the Shop catalog defaults.
    renderFlowers();
    renderPaperGrid();
    renderBowGrid();
    renderExtrasGrid();
    renderExtraChoice();
    calculateAutoPrice();

    console.info("METIST customer UI v2 loaded");
  }

  init();
})();
