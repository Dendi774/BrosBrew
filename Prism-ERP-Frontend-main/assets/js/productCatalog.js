const API_URL = "http://localhost:5500/api/v1/products";

const modal = document.getElementById("productModal");
const modalTitle = document.getElementById("productModalTitle");
const openAddBtn = document.getElementById("openAddProductBtn");
const closeModalBtn = document.getElementById("closeProductModalBtn");
const saveBtn = document.getElementById("saveProductBtn");

// form fields
const productIdField = document.getElementById("product-id");
const nameField = document.getElementById("product-name");
const categoryField = document.getElementById("product-category");
const priceField = document.getElementById("product-price");
const costField = document.getElementById("product-cost");
const descriptionField = document.getElementById("product-description");
const imageUrlField = document.getElementById("product-image-url");
const statusField = document.getElementById("product-status");

window.addEventListener("DOMContentLoaded", loadProductCatalogs);

// Open modal in "Add" mode
openAddBtn.addEventListener("click", () => {
  resetForm();
  modalTitle.textContent = "Add Product";
  modal.classList.add("show");
});

// Close modal
closeModalBtn.addEventListener("click", () => {
  modal.classList.remove("show");
});

// Save (create or update depending on whether product-id is set)
saveBtn.addEventListener("click", saveProduct);

async function loadProductCatalogs() {
  try {
    const response = await fetch(API_URL);
    const data = await response.json();

    const tbody = document.querySelector(".table-card tbody");
    tbody.innerHTML = "";

    // Update the product count in the page header
    const countEl = document.querySelector(".page-header p");
    if (countEl) countEl.textContent = `${data.length} Product${data.length !== 1 ? "s" : ""}`;

    data.forEach(product => {
      const statusClass = product.status === "ACTIVE" ? "success" : "inactive";
      tbody.innerHTML += `
        <tr>
          <td>${product.sku ?? "—"}</td>
          <td>${product.product_name}</td>
          <td>${product.category}</td>
          <td>${formatCurrency(product.cost)}</td>
          <td>${formatCurrency(product.price)}</td>
          <td><span class="status ${statusClass}">${product.status}</span></td>
          <td>
            <i class="fas fa-pen action-icon" onclick="openEditProduct(${product.product_id})"></i>
            <i class="fas fa-trash action-icon" onclick="deleteProduct(${product.product_id})"></i>
          </td>
        </tr>
      `;
    });

    // keep a local copy so edit can populate the form without another fetch
    window.__products = data;

    // Category filter
    document.querySelector(".category-filter").addEventListener("change", function () {
      const selected = this.value;
      const rows = tbody.querySelectorAll("tr");
      rows.forEach(row => {
        const category = row.children[2]?.textContent ?? "";
        row.style.display = (selected === "All Categories" || category === selected) ? "" : "none";
      });
    });

    // Search
    const searchInput = document.querySelector(".search-box input");
    if (searchInput) {
      searchInput.addEventListener("input", function () {
        const q = this.value.toLowerCase();
        tbody.querySelectorAll("tr").forEach(row => {
          row.style.display = row.textContent.toLowerCase().includes(q) ? "" : "none";
        });
      });
    }

  } catch (err) {
    console.error("Failed to load products:", err);
  }
}

// Formats a number as Philippine peso currency, e.g. 1234.5 -> "₱1,234.50"
function formatCurrency(value) {
  const num = parseFloat(value) || 0;
  return `₱${num.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Populate the modal with an existing product's data and switch to "Edit" mode
function openEditProduct(productId) {
  const product = (window.__products || []).find(p => p.product_id === productId);
  if (!product) return;

  productIdField.value = product.product_id;
  nameField.value = product.product_name;
  categoryField.value = product.category;
  priceField.value = product.price;
  costField.value = product.cost;
  descriptionField.value = product.description ?? "";
  imageUrlField.value = product.image_url ?? "";
  statusField.value = product.status;

  modalTitle.textContent = "Edit Product";
  modal.classList.add("show");
}

// Clears the form back to defaults (used before opening "Add" mode)
function resetForm() {
  productIdField.value = "";
  nameField.value = "";
  categoryField.value = "Coffee";
  priceField.value = "";
  costField.value = "";
  descriptionField.value = "";
  imageUrlField.value = "";
  statusField.value = "ACTIVE";
}

// Creates a new product, or updates an existing one if product-id is set
async function saveProduct() {
  const payload = {
    product_name: nameField.value.trim(),
    category: categoryField.value,
    price: parseFloat(priceField.value) || 0,
    cost: parseFloat(costField.value) || 0,
    description: descriptionField.value.trim() || null,
    image_url: imageUrlField.value.trim() || null,
    status: statusField.value,
  };

  if (!payload.product_name) {
    alert("Product name is required.");
    return;
  }

  const id = productIdField.value;
  const isEdit = Boolean(id);

  try {
    const response = await fetch(isEdit ? `${API_URL}/${id}` : API_URL, {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || "Request failed");
    }

    modal.classList.remove("show");
    await loadProductCatalogs();
  } catch (err) {
    console.error("Failed to save product:", err);
    alert("Failed to save product. Please check the form and try again.");
  }
}

// Deletes a product after user confirmation
async function deleteProduct(productId) {
  if (!confirm("Delete this product? This cannot be undone.")) return;

  try {
    const response = await fetch(`${API_URL}/${productId}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Request failed");
    await loadProductCatalogs();
  } catch (err) {
    console.error("Failed to delete product:", err);
    alert("Failed to delete product.");
  }
}
