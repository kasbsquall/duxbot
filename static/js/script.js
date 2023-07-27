var inputField = document.getElementById('userInput');
var chatbox = document.getElementById('chatbox');

var userName = null;
var askedUserName = false;
var askedBudget = false;
var matchedProducts = null;
var budgetSet = false;
var askedSatisfaction = false;

var thankYouMessage = '¡Muchas gracias!, espero haberle sido de mucha ayuda, disfrute su compra. Le dejare este botón por si desea volver a consultar en cualquier momento.';


window.onload = function() {
    addMessage('assistant', '¡Hola! ¿Cuál es tu nombre?');
    askedUserName = true;
}

inputField.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
    }
});

function addMessage(sender, message) {
    var div = document.createElement('div');
    div.className = 'container ' + sender;

    var content = document.createElement('div');
    content.className = 'message-content';

    var img;
    if (sender === 'assistant') {
        img = document.createElement('img');
        img.src = "/static/user.png";
        img.width = 50;
        img.className = 'user-image';
        content.appendChild(img);
    }

    var p = document.createElement('p');
    p.innerHTML = message;
    content.appendChild(p);

    div.appendChild(content);
    chatbox.appendChild(div);

    // Desplaza automáticamente el chatbox hasta el último mensaje
    // Después de un breve retraso para permitir el renderizado del contenido
    setTimeout(function() {
        chatbox.scrollTop = chatbox.scrollHeight;
    }, 100);

    if (sender === 'assistant') {
        var audio = new Audio('/static/sonidorespuesta.wav'); // reemplace con la ruta de su archivo de sonido
        audio.play();
        var links = div.getElementsByTagName('a');
        for (var i = 0; i < links.length; i++) {
            links[i].addEventListener('click', handleLinkClick);
        }

        var typingMessage = chatbox.querySelector('.container.assistant.typing');
        if (typingMessage) {
            typingMessage.remove();
        }
    }
}

function openChat() {
    var chatbox = document.getElementById('chatbox');
    var cabecera = document.getElementById('cabecera');
    var inputContainer = document.querySelector('.input-container');
    var openChatButton = document.getElementById('openChatContainer');
    var minimizeChatButton = document.getElementById('minimizeChatButton');

    chatbox.classList.remove('minimized');
    cabecera.classList.remove('minimized');
    inputContainer.classList.remove('minimized');
    openChatButton.style.display = 'none';
    minimizeChatButton.style.display = 'block'; // Muestra el botón de minimizar
}

function minimizeChat() {
    var chatbox = document.getElementById('chatbox');
    var cabecera = document.getElementById('cabecera');
    var inputContainer = document.querySelector('.input-container');
    var openChatButton = document.getElementById('openChatContainer');
    var minimizeChatButton = document.getElementById('minimizeChatButton');

    chatbox.classList.add('minimized');
    cabecera.classList.add('minimized');
    inputContainer.classList.add('minimized');
    openChatButton.style.display = 'flex';
    minimizeChatButton.style.display = 'none'; // Oculta el botón de minimizar
}


function handleLinkClick(event) {
    event.preventDefault();
    window.open(event.target.href, '_blank');
    addMessage('assistant', '¿Estás satisfecho con los resultados o deseas volver a encontrar otro producto?');
    askedSatisfaction = true;
}

function simulateTyping() {
    var div = document.createElement('div');
    div.className = 'container assistant typing';
    div.textContent = 'Escribiendo';
    chatbox.appendChild(div);

    var dots = '';
    var typingInterval = setInterval(function() {
        dots += '.';
        div.textContent = 'Escribiendo' + dots;
        if (dots.length === 4) {
            dots = '';
        }
    }, 500);

    return typingInterval;
}

function addRestartButton() {
    var restartButton = document.createElement('button');
    restartButton.textContent = 'Volver a consultar por otro producto';
    restartButton.className = 'restart-button'; // Añadir la clase al botón
    restartButton.addEventListener('click', function() {
        askedProduct = false;
        askedBudget = false;
        budgetSet = false;
        askedSatisfaction = false;
        keyword = '';
        addMessage('assistant', `¡Hola ${userName}! Te voy a ayudar a encontrar el producto más idóneo. ¿Qué producto estás buscando?`);
        restartButton.remove();
    });
    chatbox.appendChild(restartButton);
}


function sendMessage() {
    var message = inputField.value;
    inputField.value = '';

    addMessage('user', message);

    var lastAssistantMessageContainer = chatbox.querySelector('.container.assistant:last-child');
    if (lastAssistantMessage === thankYouMessage) {
        askedProduct = false;
        askedBudget = false;
        budgetSet = false;
        askedSatisfaction = false;
        addMessage('assistant', `¡Hola ${userName}! Te voy a ayudar a encontrar el producto más idóneo. ¿Qué producto estás buscando?`);
        return;
    }

    if (askedSatisfaction) {
        if (message.toLowerCase().includes('si')) {
            addMessage('assistant', thankYouMessage);
            addRestartButton();
        } else {
            addMessage('assistant', 'Hola ' + userName + ', te voy a ayudar a encontrar el producto más idóneo. ¿Qué producto estás buscando?');
            askedBudget = false;
            budgetSet = false;
        }
        askedSatisfaction = false;
        return;
    }

    if (askedBudget && !budgetSet) {
        handleBudgetResponse(message);
        return;
    }

    if (askedUserName) {
        userName = message;
        askedUserName = false;
        addMessage('assistant', `Hola ${userName}, te voy a ayudar a encontrar el producto más idóneo. ¿Qué producto estás buscando?`);
        return;
    }

    if (askedBudget) {
        handleBudgetResponse(message);
        return;
    }

    

    var lastAssistantMessageContainer = chatbox.querySelector('.container.assistant:last-child');
    if (lastAssistantMessageContainer) {
        var lastAssistantMessage = lastAssistantMessageContainer.textContent;
        if (lastAssistantMessage === '¿Estás satisfecho con el resultado?') {
            if (message.toLowerCase() === 'si') {
                addMessage('assistant', thankYouMessage);
            } else {
                addMessage('assistant', 'Vamos a buscar otros productos que puedan interesarte. ¿Qué otro producto estás buscando?');
            }
            return;
        }
    }

    var typingInterval = simulateTyping();

    fetch('/ask', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            question: message
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        clearInterval(typingInterval);

        matchedProducts = data.products;
        if (matchedProducts && matchedProducts.length > 0 && !budgetSet) {
            askedBudget = true;
            addMessage('assistant', `Tienes algun presupuesto aproximado para esta compra? coloca NO si no buscas de un precio estimado.`);
        } else {
            addMessage('assistant', `Hola ${userName}, no he podido encontrar productos que coincidan con tu búsqueda. Intenta con otro producto.`);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        clearInterval(typingInterval);
        addMessage('assistant', 'Ha ocurrido un error al procesar la solicitud. Por favor, intenta nuevamente.');
    });
}

function handleBudgetResponse(budget) {
    budget = budget.trim().toLowerCase();
    var productsToShow;

    if (budget === "no") {
        productsToShow = matchedProducts;
    } else {
        var budgetMatch = budget.match(/(\d+(\.\d+)?)/);
        if (budgetMatch) {
            budget = parseFloat(budgetMatch[0]);
        } else {
            addMessage('assistant', `Lo siento, no he entendido el presupuesto que has indicado. Por favor, indica un número o responde NO si no tienes un presupuesto estimado.`);
            return;
        }

        productsToShow = matchedProducts.filter(product => parseFloat(product.price) <= budget);
    }

    if (productsToShow.length === 0) {
        addMessage('assistant', `Lo siento ${userName}, no he podido encontrar productos que coincidan con tu presupuesto.`);
        return;
    }

    budgetSet = true;

    var productHTML = '<div class="product-list">';
    for (var product of productsToShow) {
        productHTML += '<div class="product-item">';
        if (product.thumbnail_url) {
            productHTML += `<img class="product-image" src="${product.thumbnail_url}" alt="${product.name}" width="50px">`;
        }
        productHTML += `<p><a href="${product.permalink}" target="_blank">${product.name}</a></p>`;
        productHTML += '</div>';
    }
    productHTML += '</div>';      

    addMessage('assistant', `Encontramos los siguientes productos que podrían interesarte:${productHTML}`);
    addMessage('assistant', '¿Estás satisfecho con los resultados o deseas volver a encontrar otro producto?');
    askedSatisfaction = true;
}

