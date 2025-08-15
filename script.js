// --- Schermate ---
const screens = {
  home: document.getElementById('home-screen'),
  settings: document.getElementById('settings-screen'),
  history: document.getElementById('history-screen')
};
const navButtons = {
  home: document.getElementById('btn-home'),
  settings: document.getElementById('btn-settings'),
  history: document.getElementById('btn-history')
};

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
  Object.values(navButtons).forEach(b => b.classList.remove('active'));
  navButtons[name].classList.add('active');
}

navButtons.home.onclick = () => showScreen('home');
navButtons.settings.onclick = () => showScreen('settings');
navButtons.history.onclick = () => showScreen('history');

// --- Dati ---
let categories = [];
let products = [];
let orders = [];

// --- Gestione categorie ---
const categoryForm = document.getElementById('category-form');
const categoryNameInput = document.getElementById('category-name');
const categoryColorInput = document.getElementById('category-color');
const categoryList = document.getElementById('category-list');
const productCategorySelect = document.getElementById('product-category');

categoryForm.addEventListener('submit', e => {
  e.preventDefault();
  const name = categoryNameInput.value.trim();
  const color = categoryColorInput.value;
  if(!categories.find(c => c.name === name)){
    categories.push({name, color});
    updateCategoryList();
    updateProductCategorySelect();
    categoryForm.reset();
  }
});

function updateCategoryList(){
  categoryList.innerHTML = '';
  categories.forEach((c,i)=>{
    const li = document.createElement('li');
    li.textContent = c.name;
    li.style.color = c.color;
    categoryList.appendChild(li);
  });
}

function updateProductCategorySelect(){
  productCategorySelect.innerHTML = '';
  categories.forEach(c=>{
    const opt = document.createElement('option');
    opt.value = c.name;
    opt.textContent = c.name;
    productCategorySelect.appendChild(opt);
  });
}

// --- Gestione prodotti ---
const productForm = document.getElementById('product-form');
const productNameInput = document.getElementById('product-name');
const productPriceInput = document.getElementById('product-price');
const productList = document.getElementById('product-list');
const productButtonsDiv = document.getElementById('product-buttons');

productForm.addEventListener('submit', e=>{
  e.preventDefault();
  const name = productNameInput.value.trim();
  const category = productCategorySelect.value;
  const price = parseFloat(productPriceInput.value);
  products.push({name, category, price});
  updateProductList();
  updateProductButtons();
  productForm.reset();
});

function updateProductList(){
  productList.innerHTML = '';
  products.forEach((p,i)=>{
    const li = document.createElement('li');
    li.textContent = `${p.name} (${p.category}) - €${p.price.toFixed(2)}`;
    productList.appendChild(li);
  });
}

function updateProductButtons(){
  productButtonsDiv.innerHTML = '';
  products.forEach((p,i)=>{
    const btn = document.createElement('button');
    btn.textContent = `${p.name} - €${p.price.toFixed(2)}`;
    btn.onclick = ()=>{ addOrder(p); };
    productButtonsDiv.appendChild(btn);
  });
}

// --- Gestione ordini ---
const historyList = document.getElementById('history-list');

function addOrder(product){
  const order = { ...product, date: new Date() };
  orders.push(order);
  updateHistory();
}

function updateHistory(){
  historyList.innerHTML = '';
  orders.forEach(o=>{
    const li = document.createElement('li');
    li.textContent = `[${o.date.toLocaleTimeString()}] ${o.name} - €${o.price.toFixed(2)}`;
    historyList.appendChild(li);
  });
}
