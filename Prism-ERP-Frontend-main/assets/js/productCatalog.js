

const API_URL = "http://localhost:5500/api/v1/productCatalog";

window.addEventListener("DOMContentLoaded", loadProductCatalogs);

// function for loading the product catalogs from the API
async function loadProductCatalogs(){
    const response = await fetch(API_URL);
    const data = await response.json();

    // ingredients table
    // product_ingredients table
    
    const tbody = document.querySelector(".table-card tbody");
    
    tbody.innerHTML = "";

    Array.from(data).forEach(product => {
        tbody.innerHTML +=`
            <tr>
                <td>${product.sku}</td>
                <td>${product.product_name}</td>
                <td>${product.category}</td>
                <td>${product.unit}</td>
                <td>${product.cost}</td>
                <td>${product.price}</td>
                <td>${product.on_hand}</td>
                <td>${product.status}</td>
            </tr>
        `
    })

    console.log(data);
}