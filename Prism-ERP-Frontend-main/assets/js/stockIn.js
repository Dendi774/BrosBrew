



const API_URL_STOCKIN = "http://localhost:5500/api/v1/stockIn";
const API_URL_INGREDIENTS = "http://localhost:5500/api/v1/ingredients";

const recordStockInBtn = document.getElementById("recordStockInBtn");
recordStockInBtn.addEventListener("click", openStockModal);


window.addEventListener("DOMContentLoaded", loadStockIns);


function openStockModal(){

    document.getElementById(
    "stockModal"
    ).style.display="block";

    loadIngredients();
}


async function loadIngredients(){

const response =
await fetch(API_URL_INGREDIENTS);


const ingredients =
await response.json();



const select =
document.getElementById(
"ingredientSelect"
);


select.innerHTML =
`
<option value="">
Select Ingredient
</option>
`;



ingredients.forEach(i=>{


select.innerHTML +=

`
<option 
value="${i.ingredient_name}"

data-unit="${i.unit}"

data-cost="${i.cost_per_unit}"

data-reorder="${i.reorder_level}"

>

${i.ingredient_name}

</option>

`;


});


}

async function loadStockIns(){

    const response = await fetch(API_URL_STOCKIN);
    const stockIns = await response.json();
    
    const tableBody = document.querySelector('.table-card tbody');
    tableBody.innerHTML = '';
    
    Array.from(stockIns).forEach(stockIn => {
        const totalCost = Number(stockIn.quantity) * Number(stockIn.cost);
        tableBody.innerHTML += `
            <td>${stockIn.reference_no}</td>
            <td>${stockIn.stock_in_date}</td>
            <td>${stockIn.supplier}</td>
            <td>${stockIn.ingredient}</td>
            <td>${stockIn.quantity}</td>
            <td>${totalCost.toFixed(2)}</td>
        `
    });
}



document
.getElementById("ingredientSelect")
.addEventListener(
"change",
function(){


const selected =
this.options[this.selectedIndex];


document.getElementById("unit").value =
selected.dataset.unit;


document.getElementById("cost").value =
selected.dataset.cost;


document.getElementById("reorder").value =
selected.dataset.reorder;


calculateTotal();


});



document
.getElementById("quantity")
.addEventListener(
"input",
calculateTotal
);



function calculateTotal(){

const qty =
Number(
document.getElementById("quantity").value
);


const cost =
Number(
document.getElementById("cost").value
);



document.getElementById("totalCost").value =
qty * cost;

}


async function saveStockIn(){


const data = {


ingredient:
document.getElementById(
"ingredientSelect"
).value,


quantity:
document.getElementById(
"quantity"
).value,


cost:
document.getElementById(
"cost"
).value,


supplier:
document.getElementById(
"supplier"
).value,

reorder_level: document.getElementById("reorder").value,
unit: document.getElementById("unit").value

};



await fetch(
"http://localhost:5500/api/v1/stockIn",
{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify(data)

}

);


alert("Stock Added");


}

