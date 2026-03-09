// ---------------- Firebase ----------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, doc,
  runTransaction, serverTimestamp, query, where, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCEIx6PShKZtqNuGXNrLiPNpwNoMxgHxyE",
  authDomain: "app-ordini-4cf36.firebaseapp.com",
  projectId: "app-ordini-4cf36",
  storageBucket: "app-ordini-4cf36.firebasestorage.app",
  messagingSenderId: "704362573304",
  appId: "1:704362573304:web:4f79c980416563ad963a0d"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const auth = getAuth(app);

// --- LOGIN ---
document.getElementById("login-btn").addEventListener("click", async () => {
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    document.getElementById("login-error").textContent = "Errore: " + err.message;
  }
});

// --- CAMBIO STATO UTENTE ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Utente loggato → mostra app, nascondi login
    document.getElementById("login-box").style.display = "none";
    document.getElementById("app").style.display = "block";

    // Avvia listener Firestore
    listenCategories();
    listenProducts();
  } else {
    // Nessun utente loggato → mostra login, nascondi app
    document.getElementById("login-box").style.display = "block";
    document.getElementById("app").style.display = "none";
  }
});

// --- LOGOUT ---
const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    signOut(auth)
      .then(() => {
        console.log("Utente disconnesso");

        // Aggiorna subito la UI
        document.getElementById("login-box").style.display = "block";
        document.getElementById("app").style.display = "none";
      })
      .catch((err) => {
        console.error("Errore logout:", err);
      });
  });
}

// ---------------- NAV ----------------
window.showPage = function(page) {
  document.querySelectorAll(".page").forEach(p => p.style.display = "none");
  document.getElementById(page).style.display = "block";
};

// ---------------- STATE ----------------
let categories = []; // {id, name, color, order}
let products = [];   // {id, name, price, stock|null, category, active}
let cart = [];       // [{productId, name, price, qty}]
let barName = "San Luigi";

// ---------------- REFS ----------------
const productsButtons = document.getElementById("products-buttons");
const cartList = document.getElementById("cart-list");
const cartTotalEl = document.getElementById("cart-total");
const printBtn = document.getElementById("print-order");

const categoriesList = document.getElementById("categories-list");
const productsList = document.getElementById("products-list");
const productCategorySelect = document.getElementById("product-category");

const historyForm = document.getElementById("history-form");
const historyBody = document.getElementById("history-table");
const historyTotalEl = document.getElementById("history-total");
const exportBtnCSV = document.getElementById("export-csv");
const exportBtnPDF = document.getElementById("export-pdf");
const exportBtnXSLX = document.getElementById("export-xslx");

// Modali
const modalCategory = document.getElementById("modal-category");
const modalProduct = document.getElementById("modal-product");

// ---------------- Utils ----------------
const EUR = v => `€${Number(v).toFixed(2)}`;
function todayKeyInRome(d = new Date()) {
  const tzOffsetMin = d.getTimezoneOffset();
  const local = new Date(d.getTime() - tzOffsetMin * 60 * 1000);
  return local.toISOString().slice(0, 10); // YYYY-MM-DD
}
function byOrder(a, b) { return (a.order ?? 0) - (b.order ?? 0); }
function findProduct(id) { return products.find(p => p.id === id); }

// ---------------- Config (nome bar + contatore ordini) ----------------
async function loadBarName() {
  const ref = doc(db, "config", "bar");
  const snap = await getDoc(ref);
  if (snap.exists()) {
    barName = snap.data().name || "San Luigi";
  } else {
    await setDoc(ref, { name: "San Luigi" });
    barName = "San Luigi";
  }
  document.querySelector("header h1").textContent = barName;
}

async function getNextOrderNumber() {
  const ref = doc(db, "config", "counters");
  return await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) {
      tx.set(ref, { orderSeq: 1 });
      return 1;
    } else {
      const curr = snap.data().orderSeq || 0;
      tx.update(ref, { orderSeq: curr + 1 });
      return curr + 1;
    }
  });
}

// ---------------- Realtime Categories & Products ----------------
function listenCategories() {
  const qref = query(collection(db, "categories"));
  onSnapshot(qref, snap => {
    categories = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort(byOrder);
    renderSettingsCategories();
    renderProductSelects();
    renderHome();
  });
}

function listenProducts() {
  const qref = query(collection(db, "products"));
  onSnapshot(qref, snap => {
    products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderSettingsProducts();
    renderHome();
  });
}

function renderProductSelects() {
  productCategorySelect.innerHTML = "";
  const selEdit = document.getElementById("edit-prod-category");
  selEdit.innerHTML = "";
  categories.forEach(c => {
    productCategorySelect.insertAdjacentHTML("beforeend", `<option value="${c.id}">${c.name}</option>`);
    selEdit.insertAdjacentHTML("beforeend", `<option value="${c.id}">${c.name}</option>`);
  });
}

// ---------------- HOME: rendering prodotti + carrello ----------------
function renderHome() {
  productsButtons.innerHTML = "";
  categories.forEach(cat => {
    products
      .filter(p => p.category === cat.id && p.active)
      .forEach(prod => {
        const btn = document.createElement("button");
        btn.className = "product-btn";
        btn.style.background = cat.color;
        const stockStr = (prod.stock === null || prod.stock === undefined) ? "" : ` [${prod.stock}]`;
        btn.textContent = `${prod.name}\n${EUR(prod.price)}${stockStr}`;

        if (prod.stock === 0) {
          btn.disabled = true;
          btn.style.opacity = "0.5";
          btn.style.cursor = "not-allowed";
        } else {
          btn.disabled = false;
          btn.style.opacity = "1";
          btn.style.cursor = "pointer";
        }

        btn.onclick = () => addToCart(prod.id);
        productsButtons.appendChild(btn);
      });
  });
}

// Concurrency-safe add/remove with transaction
async function addToCart(productId) {
  const prod = findProduct(productId);
  if (!prod) return;
  try {
    const ref = doc(db, "products", productId);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error("Prodotto non trovato");
      const data = snap.data();
      if (data.stock !== null && data.stock !== undefined) {
        if (data.stock <= 0) throw new Error("Prodotto esaurito");
        tx.update(ref, { stock: data.stock - 1 });
        prod.stock = data.stock - 1;
      }
    });

    const existing = cart.find(i => i.productId === productId);
    if (existing) existing.qty++;
    else cart.push({ productId, name: prod.name, price: prod.price, qty: 1 });

    renderCart();
    renderHome();
  } catch (err) {
    alert(err.message);
  }
}

async function removeOneFromCart(productId) {
  const item = cart.find(i => i.productId === productId);
  if (!item) return;

  try {
    const prod = findProduct(productId);
    const ref = doc(db, "products", productId);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error("Prodotto non trovato");
      const data = snap.data();
      if (data.stock !== null && data.stock !== undefined) {
        tx.update(ref, { stock: data.stock + 1 });
        prod.stock = data.stock + 1;
      }
    });

    item.qty--;
    if (item.qty <= 0) cart = cart.filter(i => i.productId !== productId);

    renderCart();
    renderHome();
  } catch (err) {
    alert(err.message);
  }
}

function renderCart() {
  cartList.innerHTML = "";
  let total = 0;
  cart.forEach(i => {
    const li = document.createElement("li");
    li.style.display = "flex";
    li.style.justifyContent = "space-between";
    li.style.alignItems = "center";
    li.style.gap = "8px";
    li.style.padding = "6px 0";
    const left = document.createElement("span");
    left.textContent = `${i.name} × ${i.qty}`;
    const right = document.createElement("span");
    right.textContent = EUR(i.price * i.qty);
    const del = document.createElement("img");
    del.src = "https://github.com/giovannigrimoldi93-glitch/bar-sl-files/blob/b47ccbd638e8f3c1d32a02bcbe9bcaf17b8f150a/IMG_1206.png?raw=1";
    del.alt = "rimuovi";
    del.style.height = "18px";
    del.style.cursor = "pointer";
    del.onclick = () => removeOneFromCart(i.productId);
    const wrapRight = document.createElement("div");
    wrapRight.style.display = "flex";
    wrapRight.style.alignItems = "center";
    wrapRight.style.gap = "8px";
    wrapRight.append(right, del);
    li.append(left, wrapRight);
    cartList.appendChild(li);
    total += i.price * i.qty;
  });
  cartTotalEl.innerHTML = `<strong style="color:#004aad; font-size:18px;">Totale: €${total.toFixed(2)}</strong>`;
}

// ---------------- STAMPA E INVIA ORDINE ----------------
printBtn.addEventListener("click", async () => {
  if (cart.length === 0) {
    alert("Carrello vuoto!");
    return;
  }

  try {
    const orderNumber = await getNextOrderNumber();
    const now = new Date();
    const dateStr = now.toLocaleDateString("it-IT");
    const timeStr = now.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
    const dayKey = todayKeyInRome(now);

    // Salva ordine su Firestore
    await addDoc(collection(db, "orders"), {
      items: cart,
      dayKey,
      total: cart.reduce((sum, i) => sum + i.price * i.qty, 0),
      createdAt: serverTimestamp(),
      orderNumber
    });

    // Genera contenuto scontrino
    const receiptWin = window.open("", "Stampa", "width=400,height=600");
    receiptWin.document.write(`
      <html>
        <head>
          <style>
            body { font-family: monospace; font-size:16px; text-align:center; }
            h2 { margin: 4px 0; }
            .line { margin: 8px 0; border-top: 1px dashed #000; }
            .item { display:flex; justify-content:space-between; font-size:18px; font-weight:bold; }
            .totale { margin-top:8px; font-size:20px; font-weight:bold; }
            .small { font-size:12px; margin-top:4px; }
          </style>
        </head>
        <body>
          <h2>${barName}</h2>
          <img src="https://raw.githubusercontent.com/giovannigrimoldi93-glitch/bar-sl-files/refs/heads/main/Logo-parrocchia-2.svg" width="80"/>
          <div>${dateStr} ${timeStr}</div>
          <div>Ordine #${orderNumber}</div>
          <div class="line"></div>
          ${cart.map(i => `
            <div class="item">
              <span>${i.name} x${i.qty}</span>
              <span>${EUR(i.price * i.qty)}</span>
            </div>
          `).join("")}
          <div class="line"></div>
          <div class="totale">TOTALE: ${EUR(cart.reduce((s,i)=>s+i.price*i.qty,0))}</div>
          <div class="line"></div>
          <div style="margin-top:8px;">Grazie!</div>
          <div class="small">NON FISCALE</div>
        </body>
      </html>
    `);
    receiptWin.document.close();
    receiptWin.print();

    // Svuota carrello
    cart = [];
    renderCart();
    renderHome();

  } catch (err) {
    console.error("Errore stampa ordine:", err);
    alert("Errore durante la stampa dell'ordine.");
  }
});

function openReceiptWindow({ orderNumber, now, items, total }) {
  const logo = "https://raw.githubusercontent.com/giovannigrimoldi93-glitch/bar-sl-files/refs/heads/main/Logo-parrocchia-2.svg";
  const styles = `
    <style>
      @media print {
        @page { size: 80mm auto; margin: 4mm; }
      }
      body { font-family: "Courier New", monospace; width: 80mm; margin: 0 auto; }
      .center { text-align: center; }
      .big { font-size: 16px; font-weight: 700; }
      .line { display: flex; justify-content: space-between; margin: 4px 0; }
      hr { border: 0; border-top: 1px dashed #000; margin: 6px 0; }
      .total { font-size: 20px; font-weight: 800; }
      .upper { text-transform: uppercase; }
    </style>
  `;
  let html = `
    <div class="center">
      <img src="${logo}" alt="logo" style="height:60px;">
      <div class="big upper">${barName}</div>
      <div>Ordine n. ${orderNumber}</div>
      <div>${now.toLocaleDateString()} ${now.toLocaleTimeString()}</div>
    </div>
    <hr>
  `;
  items.forEach(i => {
    html += `<div class="line big upper"><span>${i.name} × ${i.qty}</span><span>${EUR(i.price * i.qty)}</span></div>`;
  });
  html += `
    <hr>
    <div class="line total"><span>TOTALE</span><span>${EUR(total)}</span></div>
    <div class="center" style="margin-top:6px;">Grazie!</div>
    <div class="center" style="margin-top:2px; font-size:12px; font-weight:normal;">Non fiscale </div>
  `;

  const w = window.open("", "PRINT", "width=400,height=600");
  w.document.write(`<html><head><title>Scontrino</title>${styles}</head><body>${html}</body></html>`);
  w.document.close();
  w.focus();
  w.print();
  w.close();
}

//---SVUOTA CARRELLO
document.getElementById("clear-cart").addEventListener("click", () => {
  if (cart.length === 0) return;

  if (confirm("Vuoi davvero svuotare il carrello?")) {
    // Reintegra lo stock se necessario
    cart.forEach(item => {
      const prod = findProduct(item.productId);
      if (prod && prod.stock !== null && prod.stock !== undefined) {
        prod.stock += item.qty; // reintegra locale
        const ref = doc(db, "products", prod.id);
        updateDoc(ref, { stock: prod.stock }); // aggiorna Firestore
      }
    });

    cart = [];
    renderCart();
    renderHome();
  }
});

// ---------------- IMPOSTAZIONI: Categorie ----------------
document.getElementById("category-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("category-name").value.trim();
  const color = document.getElementById("category-color").value;
  const order = parseInt(document.getElementById("category-order").value || "0", 10);

  if (!name) return alert("Inserisci un nome categoria");
  await addDoc(collection(db, "categories"), { name, color, order });
  e.target.reset();
});

function renderSettingsCategories() {
  categoriesList.innerHTML = "";
  categories.forEach(cat => {
    categoriesList.insertAdjacentHTML("beforeend", `
      <tr>
        <td>${cat.name}</td>
        <td><span style="font-weight:700; color:${cat.color}">${cat.color}</span></td>
        <td>${cat.order ?? 0}</td>
        <td>
          <button class="edit-cat" data-id="${cat.id}">✏️</button>
          <button class="delete-cat" data-id="${cat.id}">🗑️</button>
        </td>
      </tr>
    `);
  });
}

document.addEventListener("click", async (e) => {
  // Categorie: elimina
  if (e.target.classList.contains("delete-cat")) {
    const id = e.target.dataset.id;
    if (!confirm("Eliminare la categoria? (I prodotti resteranno con riferimento alla categoria eliminata)")) return;
    await deleteDoc(doc(db, "categories", id));
  }
  // Categorie: modifica
  if (e.target.classList.contains("edit-cat")) {
    const id = e.target.dataset.id;
    openCategoryModal(id);
  }
});

// Modale Categoria
async function openCategoryModal(id) {
  const ref = doc(db, "categories", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const c = snap.data();
  const form = document.getElementById("form-edit-category");
  form.dataset.id = id;
  document.getElementById("edit-cat-name").value = c.name || "";
  document.getElementById("edit-cat-color").value = c.color || "#004aad";
  document.getElementById("edit-cat-order").value = c.order ?? 0;
  modalCategory.style.display = "flex";
}

document.getElementById("form-edit-category").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = e.target.dataset.id;
  const payload = {
    name: document.getElementById("edit-cat-name").value.trim(),
    color: document.getElementById("edit-cat-color").value,
    order: parseInt(document.getElementById("edit-cat-order").value || "0", 10)
  };
  if (!payload.name) return alert("Nome categoria obbligatorio");
  await updateDoc(doc(db, "categories", id), payload);
  modalCategory.style.display = "none";
});

// ---------------- IMPOSTAZIONI: Prodotti ----------------
document.getElementById("product-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("product-name").value.trim();
  const price = parseFloat(document.getElementById("product-price").value);
  const stockVal = document.getElementById("product-stock").value;
  const stock = stockVal === "" ? null : parseInt(stockVal, 10);
  const category = document.getElementById("product-category").value;
  const active = document.getElementById("product-active").checked;

  if (!name || isNaN(price)) return alert("Nome e prezzo sono obbligatori");
  await addDoc(collection(db, "products"), { name, price, stock, category, active });
  e.target.reset();
});

function renderSettingsProducts() {
  productsList.innerHTML = "";

  // ordina prodotti per categoria (poi per nome)
  const sortedProducts = products.slice().sort((a, b) => {
    const catA = categories.find(c => c.id === a.category)?.order ?? 0;
    const catB = categories.find(c => c.id === b.category)?.order ?? 0;
    if (catA !== catB) return catA - catB;           // prima categoria
    return a.name.localeCompare(b.name, "it");     // poi nome prodotto
  });

  sortedProducts.forEach(prod => {
    const catName = categories.find(c => c.id === prod.category)?.name || "–";
    productsList.insertAdjacentHTML("beforeend", `
      <tr>
        <td>${prod.name}</td>
        <td>€${prod.price.toFixed(2)}</td>
        <td>${prod.stock ?? "∞"}</td>
        <td>${prod.active ? "✅" : "❌"}</td>
        <td>${catName}</td>
        <td>
          <button class="edit-prod" data-id="${prod.id}">✏️</button>
          <button class="delete-prod" data-id="${prod.id}">🗑️</button>
        </td>
      </tr>
    `);
  });
}

document.addEventListener("click", async (e) => {
  // Prodotti: elimina
  if (e.target.classList.contains("delete-prod")) {
    const id = e.target.dataset.id;
    if (!confirm("Eliminare il prodotto?")) return;
    await deleteDoc(doc(db, "products", id));
  }
  // Prodotti: modifica
  if (e.target.classList.contains("edit-prod")) {
    const id = e.target.dataset.id;
    openProductModal(id);
  }
});

// Modale Prodotto
async function openProductModal(id) {
  const ref = doc(db, "products", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const p = snap.data();
  const form = document.getElementById("form-edit-product");
  form.dataset.id = id;

  document.getElementById("edit-prod-name").value = p.name ?? "";
  document.getElementById("edit-prod-price").value = p.price ?? 0;
  document.getElementById("edit-prod-stock").value = (p.stock === null || p.stock === undefined) ? "" : p.stock;
  document.getElementById("edit-prod-category").value = p.category ?? (categories[0]?.id || "");
  document.getElementById("edit-prod-active").checked = !!p.active;

  modalProduct.style.display = "flex";
}

document.getElementById("form-edit-product").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = e.target.dataset.id;
  const name = document.getElementById("edit-prod-name").value.trim();
  const price = parseFloat(document.getElementById("edit-prod-price").value);
  const stockVal = document.getElementById("edit-prod-stock").value;
  const stock = stockVal === "" ? null : parseInt(stockVal, 10);
  const category = document.getElementById("edit-prod-category").value;
  const active = document.getElementById("edit-prod-active").checked;

  if (!name || isNaN(price)) return alert("Nome e prezzo sono obbligatori");
  await updateDoc(doc(db, "products", id), { name, price, stock, category, active });
  modalProduct.style.display = "none";
});

// Chiudi modali cliccando fuori
document.querySelectorAll(".modal").forEach(m => {
  m.addEventListener("click", e => {
    if (e.target.classList.contains("modal")) m.style.display = "none";
  });
});

// ---------------- STORICO ----------------

// Helpers date
function todayStr() { return todayKeyInRome(new Date()); }
function offsetDay(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return todayKeyInRome(d);
}
function firstDayOfMonth() {
  const d = new Date();
  d.setDate(1);
  return todayKeyInRome(d);
}

// Preset rapidi
document.getElementById("history-presets").addEventListener("click", (e) => {
  const btn = e.target.closest(".preset-btn");
  if (!btn) return;
  const from = document.getElementById("history-date-from");
  const to = document.getElementById("history-date-to");
  const preset = btn.dataset.preset;
  const today = todayStr();
  if (preset === "today")     { from.value = today;              to.value = today; }
  if (preset === "yesterday") { from.value = offsetDay(-1);      to.value = offsetDay(-1); }
  if (preset === "week")      { from.value = offsetDay(-6);      to.value = today; }
  if (preset === "month")     { from.value = firstDayOfMonth();  to.value = today; }
  if (preset === "all")       { from.value = "2000-01-01";       to.value = today; }
  // avvia ricerca automaticamente
  loadHistory(from.value, to.value);
});

// Submit manuale
historyForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const from = document.getElementById("history-date-from").value;
  const to   = document.getElementById("history-date-to").value;
  if (!from || !to) return;
  if (from > to) return alert("La data 'Dal' deve essere precedente o uguale a 'Al'");
  loadHistory(from, to);
});

// Funzione principale storico
async function loadHistory(from, to) {
  const qref = query(
    collection(db, "orders"),
    where("dayKey", ">=", from),
    where("dayKey", "<=", to)
  );
  const snap = await getDocs(qref);

  // Aggrega dati: name -> { qty, revenue, price }
  const totals = new Map();
  let totalRevenue = 0;
  let totalOrders = snap.size;

  snap.forEach(d => {
    const data = d.data();
    (data.items || []).forEach(it => {
      const prev = totals.get(it.name) || { qty: 0, revenue: 0, price: it.price || 0 };
      const qty = it.qty || 1;
      const rev = (it.price || 0) * qty;
      totals.set(it.name, { qty: prev.qty + qty, revenue: prev.revenue + rev, price: it.price || 0 });
      totalRevenue += rev;
    });
  });

  // Prodotto più venduto
  let topProduct = "—";
  let topQty = 0;
  totals.forEach((v, name) => { if (v.qty > topQty) { topQty = v.qty; topProduct = name; } });

  // Riepilogo
  const summary = document.getElementById("history-summary");
  summary.style.display = "flex";
  document.getElementById("summary-total").textContent = EUR(totalRevenue);
  document.getElementById("summary-orders").textContent = totalOrders;
  document.getElementById("summary-top").textContent = topProduct + (topQty > 0 ? ` (${topQty})` : "");

  // Tabella
  historyBody.innerHTML = "";
  [...totals.entries()]
    .sort((a, b) => b[1].qty - a[1].qty) // ordina per qty decrescente
    .forEach(([name, v]) => {
      historyBody.insertAdjacentHTML("beforeend",
        `<tr>
          <td>${name}</td>
          <td>${v.qty}</td>
          <td>${EUR(v.revenue)}</td>
        </tr>`
      );
    });

  historyTotalEl.innerHTML = `<strong style="font-size:18px; color:#004aad;">Totale periodo: ${EUR(totalRevenue)}</strong>`;
}

// CSV export
exportBtnCSV.addEventListener("click", () => {
  const rows = [["Prodotto", "Quantità", "Ricavo"]];
  document.querySelectorAll("#history-table tr").forEach(tr => {
    const tds = tr.querySelectorAll("td");
    if (tds.length === 3) rows.push([tds[0].innerText, tds[1].innerText, tds[2].innerText]);
  });
  const tot = document.getElementById("summary-total").textContent || "€0.00";
  rows.push(["TOTALE", "", tot]);
  const csv = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const from = document.getElementById("history-date-from").value || "nd";
  const to   = document.getElementById("history-date-to").value   || "nd";
  a.download = `storico_${from}_${to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

// PDF export
exportBtnPDF.addEventListener("click", () => {
  const { jsPDF } = window.jspdf;
  const docPdf = new jsPDF();
  const from = document.getElementById("history-date-from").value || "—";
  const to   = document.getElementById("history-date-to").value   || "—";
  docPdf.setFontSize(16);
  docPdf.text(`Storico Ordini: ${from} → ${to}`, 14, 20);

  const rows = [];
  document.querySelectorAll("#history-table tr").forEach(tr => {
    const tds = tr.querySelectorAll("td");
    if (tds.length === 3) rows.push([tds[0].innerText, tds[1].innerText, tds[2].innerText]);
  });
  const tot = document.getElementById("summary-total").textContent || "€0.00";
  rows.push(["TOTALE", "", tot]);

  docPdf.autoTable({
    startY: 30,
    head: [["Prodotto", "Quantità", "Ricavo"]],
    body: rows,
    theme: "grid",
    headStyles: { fillColor: [0, 74, 173], textColor: 255 },
    styles: { fontSize: 12 }
  });
  docPdf.save(`storico_${from}_${to}.pdf`);
});

// XLSX export
exportBtnXSLX.addEventListener("click", () => {
  const from = document.getElementById("history-date-from").value || "nd";
  const to   = document.getElementById("history-date-to").value   || "nd";
  const rows = [["Prodotto", "Quantità", "Ricavo"]];
  document.querySelectorAll("#history-table tr").forEach(tr => {
    const [c1, c2, c3] = tr.querySelectorAll("td");
    if (c1 && c2 && c3) rows.push([c1.innerText.trim(), c2.innerText.trim(), c3.innerText.trim()]);
  });
  const tot = document.getElementById("summary-total").textContent || "€0.00";
  rows.push(["TOTALE", "", tot]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Storico");
  XLSX.writeFile(wb, `storico_${from}_${to}.xlsx`);
});

// ---------------- INIT ----------------
(async function init() {
  await loadBarName();
  listenCategories();
  listenProducts();
  renderCart();
  showPage("home");
})();
