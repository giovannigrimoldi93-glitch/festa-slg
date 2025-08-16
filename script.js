// ---------------- Firebase ----------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, doc,
  runTransaction, serverTimestamp, query, where, orderBy, increment
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
const exportBtn = document.getElementById("export-csv");

// Modali
const modalCategory = document.getElementById("modal-category");
const modalProduct = document.getElementById("modal-product");

// ---------------- Utils ----------------
const EUR = v => `€${Number(v).toFixed(2)}`;
function todayKeyInRome(d = new Date()) {
  // converte in fuso Italia (Europe/Rome). Approccio: usa offset locale del browser
  const tzOffsetMin = d.getTimezoneOffset(); // minuti rispetto a UTC
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
  document.querySelector("header h1").textContent = `Bar ${barName}`;
}

async function getNextOrderNumber() {
  const ref = doc(db, "config", "counters");
  const next = await runTransaction(db, async (tx) => {
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
  return next;
}

// ---------------- Load Categorie & Prodotti ----------------
async function loadCategories() {
  const snap = await getDocs(collection(db, "categories"));
  categories = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort(byOrder);
  renderSettingsCategories();
  renderProductSelects();
  renderHome();
}

async function loadProducts() {
  const snap = await getDocs(collection(db, "products"));
  products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderSettingsProducts();
  renderHome();
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
        btn.onclick = () => addToCart(prod.id);
        productsButtons.appendChild(btn);
      });
  });
}

function addToCart(productId) {
  const prod = findProduct(productId);
  if (!prod) return;
  if (prod.stock !== null && prod.stock !== undefined && prod.stock <= 0) {
    alert("Prodotto esaurito!");
    return;
  }
  const existing = cart.find(i => i.productId === productId);
  if (existing) existing.qty += 1;
  else cart.push({ productId, name: prod.name, price: prod.price, qty: 1 });
  renderCart();
}

function removeOneFromCart(productId) {
  const item = cart.find(i => i.productId === productId);
  if (!item) return;
  item.qty -= 1;
  if (item.qty <= 0) cart = cart.filter(i => i.productId !== productId);
  renderCart();
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
  cartTotalEl.textContent = `Totale: ${EUR(total)}`;
}

printBtn.addEventListener("click", async () => {
  if (cart.length === 0) return;

  // Calcolo totale
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  // Ottieni numero progressivo
  const orderNumber = await getNextOrderNumber();

  // Prepara data/ora e dayKey locale
  const now = new Date();
  const dayKey = todayKeyInRome(now);

  // Salva ordine in Firestore
  const orderPayload = {
    createdAt: serverTimestamp(),
    localDateTime: now.toISOString(),
    dayKey,                    // per query giornaliera
    number: orderNumber,       // progressivo
    items: cart.map(i => ({ productId: i.productId, name: i.name, price: i.price, qty: i.qty })),
    total
  };
  await addDoc(collection(db, "orders"), orderPayload);

  // Decrementa stock per ciascun prodotto se non infinito
  for (const i of cart) {
    const prod = findProduct(i.productId);
    if (!prod) continue;
    if (prod.stock === null || prod.stock === undefined) continue;
    const ref = doc(db, "products", prod.id);
    await updateDoc(ref, { stock: Math.max(0, (prod.stock || 0) - i.qty) });
  }

  // Refresh prodotti (per aggiornare stock visibile) e azzera carrello
  await loadProducts();
  cart = [];
  renderCart();

  // Stampa scontrino ottimizzato 80mm
  openReceiptWindow({ orderNumber, now, items: orderPayload.items, total, dayKey });
});

function openReceiptWindow({ orderNumber, now, items, total }) {
  const logo = "https://raw.githubusercontent.com/giovannigrimoldi93-glitch/bar-sl-files/refs/heads/main/Logo-parrocchia-2.svg";
  const styles = `
    <style>
      @media print {
        @page { size: 80mm auto; margin: 4mm; }
      }
      body { font-family: "Arial", sans-serif; width: 80mm; margin: 0 auto; }
      .center { text-align: center; }
      .big { font-size: 18px; font-weight: 700; }
      .line { display: flex; justify-content: space-between; margin: 4px 0; }
      hr { border: 0; border-top: 1px dashed #000; margin: 6px 0; }
      .total { font-size: 20px; font-weight: 800; }
      .upper { text-transform: uppercase; }
    </style>
  `;
  let html = `
    <div class="center">
      <img src="${logo}" alt="logo" style="height:60px;">
      <div class="big upper">Bar ${barName}</div>
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
  `;

  const w = window.open("", "PRINT", "width=400,height=600");
  w.document.write(`<html><head><title>Scontrino</title>${styles}</head><body>${html}</body></html>`);
  w.document.close();
  w.focus();
  w.print();
  w.close();
}

// ---------------- IMPOSTAZIONI: Categorie ----------------
document.getElementById("category-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("category-name").value.trim();
  const color = document.getElementById("category-color").value;
  const order = parseInt(document.getElementById("category-order").value || "0", 10);

  if (!name) return alert("Inserisci un nome categoria");
  await addDoc(collection(db, "categories"), { name, color, order });
  e.target.reset();
  await loadCategories();
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
    await loadCategories();
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
  await loadCategories();
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
  await loadProducts();
});

function renderSettingsProducts() {
  productsList.innerHTML = "";
  products.forEach(prod => {
    const catName = categories.find(c => c.id === prod.category)?.name || "–";
    productsList.insertAdjacentHTML("beforeend", `
      <tr>
        <td>${prod.name}</td>
        <td>${EUR(prod.price)}</td>
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
    await loadProducts();
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
  await loadProducts();
});

// Chiudi modali cliccando fuori
document.querySelectorAll(".modal").forEach(m => {
  m.addEventListener("click", e => {
    if (e.target.classList.contains("modal")) m.style.display = "none";
  });
});

// ---------------- STORICO ----------------
historyForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const dateStr = document.getElementById("history-date").value; // YYYY-MM-DD
  if (!dateStr) return;

  // query per dayKey
  const qref = query(collection(db, "orders"), where("dayKey", "==", dateStr));
  const snap = await getDocs(qref);

  // mappa prodotto -> qty totale e somma ricavi
  const totals = new Map(); // name -> qty
  let totalRevenue = 0;

  snap.forEach(d => {
    const data = d.data();
    (data.items || []).forEach(it => {
      totals.set(it.name, (totals.get(it.name) || 0) + (it.qty || 1));
      totalRevenue += (it.price || 0) * (it.qty || 1);
    });
  });

  // render tabella
  historyBody.innerHTML = "";
  [...totals.entries()].sort((a, b) => a[0].localeCompare(b[0], "it")).forEach(([name, qty]) => {
    historyBody.insertAdjacentHTML("beforeend", `<tr><td>${name}</td><td>${qty}</td></tr>`);
  });
  historyTotalEl.innerHTML = `<strong>Totale: ${EUR(totalRevenue)}</strong>`;
});

// CSV export
exportBtn.addEventListener("click", () => {
  const rows = [["Prodotto", "Quantità"]];
  document.querySelectorAll("#history-table tr").forEach(tr => {
    const tds = tr.querySelectorAll("td");
    if (tds.length === 2) rows.push([tds[0].innerText, tds[1].innerText]);
  });
  const tot = (historyTotalEl.textContent || "").replace("Totale: ", "");
  rows.push(["Totale €", tot.replace("€", "").trim()]);
  const csv = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "storico.csv";
  a.click();
  URL.revokeObjectURL(url);
});

// ---------------- INIT ----------------
(async function init() {
  await loadBarName();
  await loadCategories();
  await loadProducts();
  renderCart();
})();