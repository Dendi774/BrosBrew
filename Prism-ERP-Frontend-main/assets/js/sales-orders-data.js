window.addEventListener("DOMContentLoaded", () => {
    loadOrderTable();
});

const API_URL =
"http://localhost:5500/api/v1/orders";


const modal =
document.getElementById("orderModal");


document
.getElementById("createOrderBtn")
.onclick = () => {

    modal.classList.add("show");

};



document
.getElementById("closeModalBtn")
.onclick = () => {

    modal.classList.remove("show");

};



// add another product input

document
.getElementById("addItemBtn")
.onclick = () => {


    const container =
    document.getElementById("itemsContainer");


    container.innerHTML += `

    <div class="item-row">

        <input 
        type="number"
        class="productId"
        placeholder="Product ID">


        <input
        type="number"
        class="quantity"
        placeholder="Quantity">

    </div>

    `;


};



document
.getElementById("submitOrderBtn")
.onclick = async ()=>{


    const payment =
    document.getElementById("paymentMethod").value;



    const products =
    document.querySelectorAll(".item-row");


    let items=[];


    products.forEach(row=>{


        const product_id =
        row.querySelector(".productId").value;


        const quantity =
        row.querySelector(".quantity").value;



        if(product_id && quantity){

            items.push({

                product_id:Number(product_id),

                quantity:Number(quantity)

            });

        }


    });

    const orderData={

        mode_of_payment:payment,

        items:items

    };



    const response =
    await fetch(API_URL,{

        method:"POST",

        headers:{

            "Content-Type":"application/json"

        },

        body:
        JSON.stringify(orderData)

    });



    const result =
    await response.json();



    console.log(result);



    await loadOrderTable();

    modal.style.display="none";
};


async function loadOrderTable(){

    const tableBody = document.querySelector(".table-card tbody");
    tableBody.innerHTML = "";

    const response = await fetch(API_URL, {
        'method': 'GET'
    });

    const data = await response.json();
    console.log(data);

    Array.from(data).forEach(order => {

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${order.order_id}</td>
            <td>${order.invoice_id}</td>
            <td>${formatDate(order.order_date)}</td>
            <td>₱${order.total_amount}</td>
            <td><span class="status ${order.status.toLowerCase()}">${order.status}</span></td>
        `;
        tableBody.appendChild(row);
    })
}


async function changeOrderStatus(orderId, newStatus) {
    const response = await fetch(`${API_URL}/${orderId}`, {
        'method': 'PATCH',
        'headers': {
            'Content-Type': 'application/json'
        },
        'body': JSON.stringify({ status: newStatus })
    });
    await loadOrderTable();
    return response.json();
}


// helper function to format date
function formatDate(dateString) {

    const formattedDate = new Date(dateString).toLocaleDateString(
        "en-US",
        {
            year: "numeric",
            month: "long",
            day: "numeric"
        }
    );

    return formattedDate;
}