



const API_URL_INGREDIENTS = "http://localhost:5500/api/v1/ingredients";
const API_URL_PRODUCTS = "http://localhost:5500/api/v1/products";
let stockChart;

window.addEventListener("DOMContentLoaded", async ()=>{
    await updateCards();
    await updateInventoryOverviewTable();
    await updateStockChart();
});


async function updateCards(){

    let response = await fetch(API_URL_PRODUCTS);
    const products = await response.json();

    response = await fetch(API_URL_INGREDIENTS);
    const ingredients = await response.json();
    console.log(products);

    let numOfLowStocks = 0;
    let numOfOutOfStocks = 0;
    
    Array.from(ingredients).forEach(ingredient => {
        if (Number(ingredient.quantity_in_stock) <= Number(ingredient.reorder_level)) numOfLowStocks++;
        if (Number(ingredient.quantity_in_stock) == 0) numOfOutOfStocks++;
    });

    const cards = document.querySelectorAll('.cards .card');

    cards[0].querySelector("h2").textContent = products.length;
    cards[1].querySelector("h2").textContent = ingredients.length;
    cards[2].querySelector("h2").textContent = numOfLowStocks;
    cards[3].querySelector("h2").textContent = numOfOutOfStocks;
}


async function updateInventoryOverviewTable(){

    const response = await fetch(API_URL_INGREDIENTS);
    const ingredients = await response.json();
    
    const tableBody = document.querySelector('.table-card tbody');
    tableBody.innerHTML = '';
    

    Array.from(ingredients).forEach(ingredient => {
        let ingredientStatus, style;
        switch (true){
            case (Number(ingredient.quantity_in_stock) > Number(ingredient.reorder_level)): ingredientStatus = "Normal"; style="success"; break;
            case (Number(ingredient.quantity_in_stock) < Number(ingredient.reorder_level)): ingredientStatus = "Critical"; style="danger"; break;
            case (Number(ingredient.quantity_in_stock) == Number(ingredient.reorder_level)): ingredientStatus = "Low"; style="pending"; break;
        }
        tableBody.innerHTML += `
            <td>${ingredient.ingredient_id}</td>
            <td>${ingredient.ingredient_name}</td>
            <td>Main WH</td>
            <td>${ingredient.quantity_in_stock}</td>
            <td><span class="status ${style}">${ingredientStatus}</span></td>
        `
    })
    
}


async function updateStockChart(){

    const response = await fetch(API_URL_INGREDIENTS);
    const ingredients = await response.json();

    const labels = ingredients.map(
        ingredient => ingredient.ingredient_name
    );


    const stockData = ingredients.map(
        ingredient => Number(ingredient.quantity_in_stock)
    );


    const ctx = document.getElementById("stockChart");

    stockChart = new Chart(ctx, {
        type:"bar",
        data:{
            labels: labels,
            datasets:[{
                label:"Available Stock",
                data:stockData

            }]

        },

        options:{
            responsive:true,
            maintainAspectRatio:false
        }
    });
}