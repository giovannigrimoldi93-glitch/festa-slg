// ---------------- FIREBASE ----------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { 
  getFirestore, collection, addDoc, getDocs, setDoc, doc, getDoc, updateDoc, deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

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
const home = document.getElementById("home");
const settings = document.getElementById("settings");
const history = document.getElementById("history");

document.getElementById("nav-home").onclick = () => showSection("home");
document.getElementById("nav-settings").onclick = () => showSection("settings");
document.getElementById("nav-history").onclick = () => showSection("history");

function showSection(section) {
  home.style.display = "none";
  settings.style.display = "none";
  history.style.display = "none";
  document.querySelectorAll("nav button").forEach(b => b.classList.remove("active"));
  if (section === "home") { home.style.display = "block"; document.getElementById("nav-home").classList.add("active"); }
  if (section === "settings") { settings.style.display = "block"; document.getElementById("nav-settings").classList.add("active"); }
  if (section === "history") { history.style.display = "block"; document.getElementById("nav-history").classList.add("active"); }
}

// ---------------- CARRELLO ----------------
let cart = [];
const cartItems = document.getElementById("cart-items");
const cartTotal = document.getElementById("cart-total");

function updateCart() {
  cartItems.innerHTML = "";
  let total = 0;
  cart.forEach((item, index) => {
    total += item.price;
    const div = document.createElement("div");
    div.className = "cart-item";
    div.innerHTML = `${item.name} - €${item.price.toFixed(2)} <img src="https://github.com/giovannigrimoldi93-glitch/bar-sl-files/blob/b47ccbd638e8f3c1d32a02bcbe9bcaf17b8f150a/IMG_1206.png" alt="rimuovi">`;
    div.querySelector("img").onclick = () => {
      cart.splice(index, 1);
      updateCart();
    };
    cartItems.appendChild(div);
  });
  cartTotal.textContent = `Totale: €${total.toFixed(2)}`;
}

document.getElementById("print-btn").onclick = async () => {
  if (cart.length === 0) return;

  // stampa scontrino
  const now = new Date();
  let scontrino = `
    <div style="text-align:center;">
      <img src="https://raw.githubusercontent.com/giovannigrimoldi93-glitch/bar-sl-files/refs/heads/main/Logo-parrocchia-2.svg" width="80">
      <h2>${document.getElementById("bar-name").textContent}</h2>
      <p>${now.toLocaleString()}</p>
      <hr>
  `;
  let total = 0;
  cart.forEach(item => {
    scontrino += `<div style="font-size:18px;font-weight:bold;">${item.name} €${item.price.toFixed(2)}</div>`;
    total += item.price;
  });
  scontrino += `<hr><div style="font-size:20px;font-weight:bold;">Totale: €${total.toFixed(2)}</div></div>`;

  const printWindow = window.open("", "PRINT", "height=600,width=400");
  printWindow.document.write(scontrino);
  printWindow.print();
  printWindow.close();

  // salva ordine
  await addDoc(collection(db, "orders"), {
    timestamp: now,
    items: cart,
    total: total
  });

  // aggiorna stock
  for (let item of cart) {
    if (item.stockId) {
      const prodRef = doc(db, "products", item.stockId);
      const snap = await getDoc(prodRef);
      if (snap.exists() && snap.data().stock !== null) {
        await updateDoc(prodRef, { stock: snap.data().stock - 1 });
      }
    }
  }

  cart = [];
  updateCart();
  loadCategoriesAndProducts();
};

// ---------------- IMPOSTAZIONI ----------------
const settingsContent = document.getElementById("settings-content");
document.getElementById("settings-login").onclick = () => {
  if (document.getElementById("settings-password").value === "admin") {
    settingsContent.style.display = "block";
    loadCategoriesAndProducts();
    loadBarName();
  } else {
    alert("Password errata!");
  }
};

// --- Nome Bar ---
document.getElementById("bar-form").onsubmit = async (e) => {
  e.preventDefault();
  const name = document.getElementById("bar-name-input").value;
  await setDoc(doc(db, "config", "bar"), { name });
  document.getElementById("bar-name").textContent = name;
};
async function loadBarName() {
  const snap = await getDoc(doc(db, "config", "bar"));
  if (snap.exists()) {
    document.getElementById("bar-name").textContent = snap.data().name;
  }
}

// --- Categorie ---
const categoryForm = document.getElementById("category-form");
const categoriesList = document.getElementById("categories-list");
categoryForm.onsubmit = async (e) => {
  e.preventDefault();
  await addDoc(collection(db, "categories"), {
    name: document.getElementById("category-name").value,
    color: document.getElementById("category-color").value,
    order: parseInt(document.getElementById("category-order").value) || 0
  });
  categoryForm.reset();
  loadCategoriesAndProducts();
};

async function loadCategoriesAndProducts() {
  // categorie
  const catSnap = await getDocs(collection(db, "categories"));
  let categories = [];
  catSnap.forEach(c => categories.push({ id: c.id, ...c.data() }));
  categories.sort((a, b) => a.order - b.order);

  // mostra categorie in impostazioni
  categoriesList.innerHTML = "";
  const productCategorySelect = document.getElementById("product-category");
  productCategorySelect.innerHTML = "";
  categories.forEach(cat => {
    const div = document.createElement("div");
    div.innerHTML = `<b style="color:${cat.color}">${cat.name}</b> 
      <button data-id="${cat.id}" class="edit-cat">Modifica</button>
      <button data-id="${cat.id}" class="delete-cat">Elimina</button>`;
    categoriesList.appendChild(div);

    const opt = document.createElement("option");
    opt.value = cat.id;
    opt.textContent = cat.name;
    productCategorySelect.appendChild(opt);
  });

  // azioni categorie
  document.querySelectorAll(".delete-cat").forEach(btn => {
    btn.onclick = async () => {
      await deleteDoc(doc(db, "categories", btn.dataset.id));
      loadCategoriesAndProducts();
    };
  });
  document.querySelectorAll(".edit-cat").forEach(btn => {
    btn.onclick = async () => {
      const cat = categories.find(c => c.id === btn.dataset.id);
      const newName = prompt("Nuovo nome categoria:", cat.name);
      const newColor = prompt("Nuovo colore (hex):", cat.color);
      const newOrder = prompt("Nuovo ordine:", cat.order);
      if (newName) {
        await updateDoc(doc(db, "categories", cat.id), {
          name: newName,
          color: newColor || cat.color,
          order: parseInt(newOrder) || cat.order
        });
        loadCategoriesAndProducts();
      }
    };
  });

  // prodotti
  const prodSnap = await getDocs(collection(db, "products"));
  let products = [];
  prodSnap.forEach(p => products.push({ id: p.id, ...p.data() }));

  // mostra prodotti in impostazioni
  const productsList = document.getElementById("products-list");
  productsList.innerHTML = "";
  products.forEach(prod => {
    const div = document.createElement("div");
    div.innerHTML = `${prod.name} (€${prod.price.toFixed(2)}) [${prod.active ? "Attivo" : "Inattivo"}] 
      Stock: ${prod.stock !== null ? prod.stock : "∞"}
      <button data-id="${prod.id}" class="edit-prod">Modifica</button>
      <button data-id="${prod.id}" class="delete-prod">Elimina</button>`;
    productsList.appendChild(div);
  });

  // azioni prodotti
  document.querySelectorAll(".delete-prod").forEach(btn => {
    btn.onclick = async () => {
      await deleteDoc(doc(db, "products", btn.dataset.id));
      loadCategoriesAndProducts();
    };
  });
  document.querySelectorAll(".edit-prod").forEach(btn => {
    btn.onclick = async () => {
      const prod = products.find(p => p.id === btn.dataset.id);
      const newName = prompt("Nuovo nome:", prod.name);
      const newPrice = prompt("Nuovo prezzo:", prod.price);
      const newStock = prompt("Nuova quantità (vuoto = ∞):", prod.stock ?? "");
      const newActive = confirm("Prodotto attivo? (OK = sì / Annulla = no)");
      if (newName) {
        await updateDoc(doc(db, "products", prod.id), {
          name: newName,
          price: parseFloat(newPrice) || prod.price,
          stock: newStock === "" ? null : parseInt(newStock),
          active: newActive
        });
        loadCategoriesAndProducts();
      }
    };
  });

  // mostra prodotti in HOME
  const categoriesContainer = document.getElementById("categories");
  categoriesContainer.innerHTML = "";
  categories.forEach(cat => {
    const div = document.createElement("div");
    div.className = "category";
    div.innerHTML = `<h2>${cat.name}</h2><div class="products-grid"></div>`;
    const grid = div.querySelector(".products-grid");

    products.filter(p => p.category === cat.id && p.active).forEach(prod => {
      const btn = document.createElement("button");
      btn.className = "product-btn";
      btn.style.background = cat.color;
      btn.textContent = `${prod.name} (€${prod.price.toFixed(2)}) ${prod.stock !== null ? `[${prod.stock}]` : ""}`;
      btn.onclick = () => {
        if (prod.stock === null || prod.stock > 0) {
          cart.push({ name: prod.name, price: prod.price, stockId: prod.id });
          updateCart();
        } else {
          alert("Prodotto esaurito!");
        }
      };
      grid.appendChild(btn);
    });

    categoriesContainer.appendChild(div);
  });
}

// --- Aggiunta prodotto ---
const productForm = document.getElementById("product-form");
productForm.onsubmit = async (e) => {
  e.preventDefault();
  const stock = document.getElementById("product-stock").value;
  await addDoc(collection(db, "products"), {
    name: document.getElementById("product-name").value,
    price: parseFloat(document.getElementById("product-price").value),
    stock: stock ? parseInt(stock) : null,
    category: document.getElementById("product-category").value,
    active: document.getElementById("product-active").checked
  });
  productForm.reset();
  loadCategoriesAndProducts();
};

// ---------------- STORICO ----------------
document.getElementById("history-form").onsubmit = async (e) => {
  e.preventDefault();
  const selectedDate = document.getElementById("history-date").value;
  if (!selectedDate) return;

  const q = await getDocs(collection(db, "orders"));
  const tbody = document.getElementById("history-body");
  tbody.innerHTML = "";
  let totals = {};
  let dailyTotal = 0;

  q.forEach(docSnap => {
    const data = docSnap.data();
    const orderDate = new Date(data.timestamp.seconds * 1000).toISOString().split("T")[0];
    if (orderDate === selectedDate) {
      data.items.forEach(it => {
        if (!totals[it.name]) totals[it.name] = 0;
        totals[it.name] += 1;
        dailyTotal += it.price;
      });
    }
  });

  Object.keys(totals).forEach(prod => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${prod}</td><td>${totals[prod]}</td>`;
    tbody.appendChild(tr);
  });
  document.getElementById("history-total").textContent = dailyTotal.toFixed(2);
};

// --- CSV export ---
document.getElementById("export-csv").onclick = () => {
  const rows = [["Prodotto", "Quantità"]];
  document.querySelectorAll("#history-body tr").forEach(tr => {
    const cols = tr.querySelectorAll("td");
    rows.push([cols[0].innerText, cols[1].innerText]);
  });
  rows.push(["Totale €", document.getElementById("history-total").textContent]);

  let csv = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "storico.csv";
  a.click();
};