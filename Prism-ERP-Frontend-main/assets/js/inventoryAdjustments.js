

const API_URL_ADJUSTMENTS = "http://localhost:5500/api/v1/adjustments";
const API_URL_INGREDIENTS_FOR_ADJ = "http://localhost:5500/api/v1/ingredients";

const adjustmentModal = document.getElementById("adjustmentModal");
const newAdjustmentBtn = document.getElementById("newAdjustmentBtn");
const closeAdjustmentModalBtn = document.getElementById("closeAdjustmentModalBtn");
const saveAdjustmentBtn = document.getElementById("saveAdjustmentBtn");
const adjIngredientSelect = document.getElementById("adjIngredientSelect");
const adjType = document.getElementById("adjType");
const adjQuantity = document.getElementById("adjQuantity");
const adjReason = document.getElementById("adjReason");

window.addEventListener("DOMContentLoaded", loadAdjustments);

newAdjustmentBtn.addEventListener("click", async () => {
    await loadIngredientsIntoSelect();
    adjustmentModal.classList.add("show");
});

closeAdjustmentModalBtn.addEventListener("click", () => {
    resetAdjustmentModal();
    adjustmentModal.classList.remove("show");
});

saveAdjustmentBtn.addEventListener("click", saveAdjustment);

// Loads the ingredient list into the dropdown so the user can pick
// which one they're adjusting
async function loadIngredientsIntoSelect() {
    const response = await fetch(API_URL_INGREDIENTS_FOR_ADJ);
    const ingredients = await response.json();

    adjIngredientSelect.innerHTML = `<option value="">Select Ingredient</option>`;

    ingredients.forEach((ingredient) => {
        adjIngredientSelect.innerHTML += `
            <option value="${ingredient.ingredient_id}">
                ${ingredient.ingredient_name} (${Number(ingredient.quantity_in_stock)} ${ingredient.unit} in stock)
            </option>
        `;
    });
}

// Fetches every Waste/Adjustment entry (manual ones from this page, plus
// the ones automatically created when a sales return is approved) and
// renders the table
async function loadAdjustments() {
    const response = await fetch(API_URL_ADJUSTMENTS);
    const adjustments = await response.json();

    const tableBody = document.querySelector(".table-card tbody");
    tableBody.innerHTML = "";

    adjustments.forEach((adj) => {
        const isIncrease = adj.type === "Increase";
        const qtySign = isIncrease ? "+" : "";
        const qtyColor = isIncrease ? "#22c55e" : "#ef4444";

        tableBody.innerHTML += `
            <tr>
                <td>${adj.adjustment_number}</td>
                <td>${formatAdjustmentDate(adj.date)}</td>
                <td>${adj.ingredient_name}</td>
                <td>${adj.type}</td>
                <td style="color:${qtyColor};font-weight:600;">
                    ${qtySign}${Number(adj.quantity_change)} ${adj.unit}
                </td>
                <td>${adj.reason || "-"}</td>
                <td>${adj.source}</td>
                <td><span class="status success">${adj.status}</span></td>
            </tr>
        `;
    });
}

// Builds and sends the POST body for a new manual adjustment
async function saveAdjustment() {
    const ingredient_id = adjIngredientSelect.value;
    const adjustment_type = adjType.value;
    const quantity = adjQuantity.value;
    const reason = adjReason.value;

    if (!ingredient_id) {
        alert("Please select an ingredient.");
        return;
    }
    if (!quantity || Number(quantity) <= 0) {
        alert("Please enter a quantity greater than 0.");
        return;
    }

    try {
        const response = await fetch(API_URL_ADJUSTMENTS, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ingredient_id: Number(ingredient_id),
                adjustment_type,
                quantity: Number(quantity),
                reason
            })
        });

        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(errorBody.message || "Request failed");
        }

        await loadAdjustments();
        resetAdjustmentModal();
        adjustmentModal.classList.remove("show");
    } catch (error) {
        console.error("Error saving adjustment:", error);
        alert(error.message || "Failed to save adjustment.");
    }
}

function resetAdjustmentModal() {
    adjIngredientSelect.value = "";
    adjType.value = "Decrease";
    adjQuantity.value = "";
    adjReason.value = "";
}

function formatAdjustmentDate(dateString) {
    return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}
