// ======= DATI =======
let categories = [];
let products = [];
let orders = [];

// ======= SELETTORI =======
const categoryForm = document.getElementById('category-form');
const categoryNameInput = document.getElementById('category-name');
const categoryColorInput = document.getElementById('category-color');
const categoryList = document.getElementById('category-list');

const productForm = document.getElementById('product-form');
const productNameInput = document.getElementById('product-name');
const productCategorySelect = document.getElementById('product-category');
const productPriceInput = document.getElementById('product-price');
const productList = document.getElementById('product-list');

const orderForm = document.getElementById('order-form');
const orderProductSelect = document.getElementById('order-product');
const orderQuantityInput = document.getElementById('order-quantity');
const orderList = document.getElementById('order-list');

let editingCategoryIndex = null;

// ======= FUNZIONI =======
function renderCategories() {
  categoryList.innerHTML = '';
  productCategorySelect.innerHTML = '<option value="">Seleziona categoria</option>';
  
  categories.forEach((cat, index) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${cat.name} <span class="color" style="background:${cat.color}"></span></span>
                    <span class="actions">
                      <button class="edit">Modifica</button>
                      <button class="delete">Elimina</button>
                    </span>`;
    categoryList.appendChild(li);

    productCategorySelect.innerHTML += `<option value="${index}">${cat.name}</option>`;

    li.querySelector('.delete').onclick = () => {
      categories.splice(index, 1);
      renderCategories();
      renderProducts();
    };

    li.querySelector('.edit').onclick = () => {
      editingCategoryIndex = index;
      categoryNameInput.value = cat.name;
      categoryColorInput.value = cat.color;
    };
  });
}

function renderProducts() {
  productList.innerHTML = '';
  orderProductSelect.innerHTML = '<option value="">Seleziona prodotto</option>';

  products.forEach((prod, index) => {
    const li = document.createElement('li');
    const category = categories[prod.category]?.name || 'N/D';
    li.textContent = `${prod.name} (${category}) - €${prod.price.toFixed(2)}`;
    productList.appendChild(li);

    orderProductSelect.innerHTML += `<option value="${index}">${prod.name}</option>`;
  });
}

function renderOrders() {
  orderList.innerHTML = '';

  orders.forEach((order) => {
    const li = document.createElement('li');
    const product = products[order.product];
    li.textContent = `${order.quantity} x ${product.name} - Totale: €${(product.price*order.quantity).toFixed(2)} (${new Date(order.timestamp).toLocaleString()})`;
    orderList.appendChild(li);
  });
}

// ======= EVENTI =======
categoryForm.onsubmit = (e) => {
  e.preventDefault();
  const name = categoryNameInput.value.trim();
  const color = categoryColorInput.value;

  if(editingCategoryIndex !== null) {
    categories[editingCategoryIndex] = {name, color};
    editingCategoryIndex = null;
  } else {
    categories.push({name, color});
  }

  categoryNameInput.value = '';
  renderCategories();
};

productForm.onsubmit = (e) => {
  e.preventDefault();
  const name = productNameInput.value.trim();
  const category = productCategorySelect.value;
  const price = parseFloat(productPriceInput.value);

  if(category === '') return alert('Seleziona una categoria!');
  products.push({name, category, price});
  productNameInput.value = '';
  productPriceInput.value = '';
  renderProducts();
};

orderForm.onsubmit = (e) => {
  e.preventDefault();
  const productIndex = orderProductSelect.value;
  const quantity = parseInt(orderQuantityInput.value);

  if(productIndex === '') return alert('Seleziona un prodotto!');
  orders.push({product: productIndex, quantity, timestamp: Date.now()});
  orderQuantityInput.value = '';
  renderOrders();
};

// ======= INIT =======
renderCategories();
renderProducts();
renderOrders();
