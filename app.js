import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, doc, setDoc, getDoc,
  deleteDoc, updateDoc, query, where, orderBy, runTransaction, increment, serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// ===================
// --- Firebase ------
const firebaseConfig = {
  apiKey: "AIzaSyDNtqjDfxsV8TccejiE5Clffd1GvajryiU",
  authDomain: "bar-san-luigi.firebaseapp.com",
  projectId: "bar-san-luigi",
  storageBucket: "bar-san-luigi.appspot.com",
  messagingSenderId: "26384635672",
  appId: "1:26384635672:web:672d98a954aa7e5dcaf06d"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ===================
// --- Stato ---------
let categories = [];
let products = [];
let cart = [];

// ===================
// --- Utils ---------
const byCatOrder = (a,b) => {
  const ca = categories.find(c=>c.id===a.categoryId);
  const cb = categories.find(c=>c.id===b.categoryId);
  return (ca?.order||0) - (cb?.order||0) || a.name.localeCompare(b.name);
};
const euros = v => (Number(v)||0).toFixed(2);

// ===================
// --- Caricamenti ---
async function loadCategories() {
  const snapshot = await getDocs(collection(db,"categories"));
  categories = snapshot.docs.map(d => ({id:d.id, ...d.data()}));
  renderSettingsCategories();
  renderProductSelect();
}

async function loadProducts() {
  const snapshot = await getDocs(collection(db,"products"));
  products = snapshot.docs.map(d => ({id:d.id, ...d.data()}));
  renderSettingsProducts();
}

// ===================
// --- Render Home ---
function renderProductsHome() {
  const container = document.getElementById("productsContainer");
  container.innerHTML = "";
  products.sort(byCatOrder).forEach(p=>{
    if(!p.enabled) return;
    const btn = document.createElement("button");
    btn.textContent = `${p.name} €${euros(p.price)}`;
    btn.className = "prod-btn";
    btn.style.backgroundColor = categories.find(c=>c.id===p.categoryId)?.color||"#333";
    btn.onclick = () => addToCart(p);
    container.appendChild(btn);
  });
}

function addToCart(product) {
  const item = cart.find(i=>i.id===product.id);
  if(item) item.qty++;
  else cart.push({...product, qty:1});
  renderCart();
}

function renderCart() {
  const tbody = document.getElementById("cartBody");
  tbody.innerHTML = "";
  let total = 0;
  cart.forEach(item=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${item.name}</td>
                    <td>${item.qty}</td>
                    <td>€${euros(item.price*item.qty)}</td>
                    <td><button class="rmv" onclick="removeFromCart('${item.id}')">x</button></td>`;
    tbody.appendChild(tr);
    total += item.price*item.qty;
  });
  document.getElementById("totalPrice").textContent = euros(total);
}

window.removeFromCart = function(id) {
  cart = cart.filter(i=>i.id!==id);
  renderCart();
}

// ===================
// --- Invia Ordine --
document.getElementById("printAndSend").onclick = async ()=>{
  if(cart.length===0) return alert("Carrello vuoto!");
  const order = {
    timestamp: serverTimestamp(),
    items: cart.map(i=>({id:i.id,name:i.name,qty:i.qty,price:i.price})),
    total: cart.reduce((a,b)=>a+b.price*b.qty,0)
  };
  await addDoc(collection(db,"orders"), order);
  cart = [];
  renderCart();
  alert("Ordine inviato!");
}

// ===================
// --- Navigazione ---
document.querySelectorAll("nav button").forEach(btn=>{
  btn.onclick = ()=>{
    document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
    document.querySelectorAll("nav button").forEach(b=>b.classList.remove("active"));
    document.getElementById(btn.dataset.page).classList.add("active");
    btn.classList.add("active");
  }
});

// ===================
// --- Impostazioni ---
// Categorie
document.getElementById("addCategoryBtn").onclick = async ()=>{
  const name = document.getElementById("catName").value.trim();
  const color = document.getElementById("catColor").value;
  if(!name) return;
  const docRef = await addDoc(collection(db,"categories"), {name,color,order:categories.length});
  categories.push({id:docRef.id,name,color,order:categories.length});
  renderSettingsCategories();
  renderProductSelect();
  document.getElementById("catName").value="";
}

function renderSettingsCategories(){
  const ul = document.getElementById("categoriesList");
  ul.innerHTML = "";
  categories.forEach(c=>{
    const li = document.createElement("li");
    li.textContent = `${c.name} (${c.color})`;
    const del = document.createElement("button");
    del.textContent="x";
    del.onclick = async ()=>{
      await deleteDoc(doc(db,"categories",c.id));
      categories = categories.filter(x=>x.id!==c.id);
      renderSettingsCategories();
      renderProductSelect();
    }
    li.appendChild(del);
    ul.appendChild(li);
  });
}

// Prodotti
document.getElementById("addProductBtn").onclick = async ()=>{
  const name = document.getElementById("prodName").value.trim();
  const price = parseFloat(document.getElementById("prodPrice").value);
  const categoryId = document.getElementById("prodCat").value;
  const enabled = document.getElementById("prodEnabled").checked;
  if(!name || !categoryId) return;
  const docRef = await addDoc(collection(db,"products"), {name,price,categoryId,enabled});
  products.push({id:docRef.id,name,price,categoryId,enabled});
  renderSettingsProducts();
  renderProductsHome();
  document.getElementById("prodName").value="";
  document.getElementById("prodPrice").value="";
}

function renderProductSelect(){
  const sel = document.getElementById("prodCat");
  sel.innerHTML = "";
  categories.forEach(c=>{
    const opt = document.createElement("option");
    opt.value=c.id;
    opt.textContent=c.name;
    sel.appendChild(opt);
  });
}

function renderSettingsProducts(){
  const ul = document.getElementById("productsList");
  ul.innerHTML = "";
  products.forEach(p=>{
    const li = document.createElement("li");
    li.textContent = `${p.name} €${euros(p.price)} [${categories.find(c=>c.id===p.categoryId)?.name}] ${p.enabled?"✔":""}`;
    const del = document.createElement("button");
    del.textContent="x";
    del.onclick = async ()=>{
      await deleteDoc(doc(db,"products",p.id));
      products = products.filter(x=>x.id!==p.id);
      renderSettingsProducts();
      renderProductsHome();
    }
    li.appendChild(del);
    ul.appendChild(li);
  });
}

// ===================
// --- Storico -------
document.getElementById("loadHistory").onclick = async ()=>{
  const date = document.getElementById("historyDate").value;
  if(!date) return;
  const snapshot = await getDocs(collection(db,"orders"));
  const orders = snapshot.docs.map(d=>d.data()).filter(o=>{
    const d = o.timestamp?.toDate?.() || new Date();
    return d.toISOString().slice(0,10)===date;
  });
  const tbody = document.querySelector("#historyTable tbody");
  tbody.innerHTML = "";
  let total = 0;
  orders.forEach(o=>{
    o.items.forEach(i=>{
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${i.name}</td><td>${i.qty}</td>`;
      tbody.appendChild(tr);
      total += i.qty*i.price;
    });
  });
  document.getElementById("historyTotal").textContent = euros(total);
}

// ===================
// --- Inizializzazione --
(async()=>{
  await Promise.all([loadCategories(), loadProducts()]);
  renderProductsHome();
})();