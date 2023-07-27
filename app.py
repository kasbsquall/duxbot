from flask import Flask, request, jsonify, render_template
from woocommerce import API
import openai
from fuzzywuzzy import process
from bs4 import BeautifulSoup
import spacy
import requests

app = Flask(__name__)

# Inicializa WooCommerce API
wcapi = API(
    url="https://tiendaundetalle.com",
    consumer_key="ck_510a30212b8362e7bd7a119b53d66e59f6dd1ac1",
    consumer_secret="cs_cde38e7b9b78535858b234fffe691743c747af89",
    wp_api=True,
    version="wc/v3"
)

# Inicializa OpenAI API
openai.api_key = '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'

# Carga el modelo de spacy para el idioma español
nlp = spacy.load("es_core_news_sm")

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/getname', methods=['GET'])
def getname():
    return jsonify({
        'gpt_answer': '¡Hola! Por favor, dime tu nombre.',
    })

@app.route('/ask', methods=['POST'])
def ask():
    # Obtén la pregunta del usuario del cuerpo de la solicitud HTTP
    user_question = request.json['question']

    # Lemmatiza la pregunta del usuario para obtener su forma base
    lemmatized_question = lemmatize_text(user_question)

    # Intenta hacer una solicitud a WooCommerce API, con un mecanismo de reintentos
    for attempt in range(6):  # Puedes ajustar el número de intentos
        try:
            # Busca todos los productos en WooCommerce
            all_products = wcapi.get("products").json()
            break
        except requests.exceptions.ReadTimeout:
            if attempt < 5:  # Si no es el último intento, continua al siguiente
                continue
            else:  # Si es el último intento, devuelve un mensaje de error
                return jsonify({
                    'gpt_answer': 'Lo siento, el servicio está temporalmente inaccesible. Por favor, intenta de nuevo más tarde.',
                    'products': []
                })

    # Combina el nombre, las descripciones y las etiquetas del producto en una sola cadena de texto
    combined_texts = []
    for product in all_products:
        combined_text = product['name'] + " " + BeautifulSoup(product['description'], "html.parser").get_text() + " " + BeautifulSoup(product['short_description'], "html.parser").get_text() + " " + " ".join(tag['name'] for tag in product['tags'])
        combined_texts.append(combined_text)

    # Usa fuzzywuzzy para encontrar las mejores coincidencias entre la pregunta del usuario y las cadenas de texto combinadas
    matches = process.extract(lemmatized_question, combined_texts, limit=5)

    # Filtra la lista de productos para encontrar los productos que mejor coinciden
    matching_products = []
    for match, similarity_score in matches:
        if similarity_score >= 50:  # Ajusta este valor según tu necesidad
            matching_products.extend([product for product in all_products if product['name'] + " " + BeautifulSoup(product['description'], "html.parser").get_text() + " " + BeautifulSoup(product['short_description'], "html.parser").get_text() + " " + " ".join(tag['name'] for tag in product['tags']) == match])

    # Si no se encontraron productos que coincidan con la búsqueda, devolver un mensaje de no coincidencia
    if not matching_products:
        return jsonify({
            'gpt_answer': 'Lo siento, no pude encontrar un producto que coincida con tu búsqueda.',
            'products': []
        })

    # Prepara la lista de productos encontrados con nombre y enlace de la imagen en miniatura
    products_list = []
    for product in matching_products[:5]:  # Limitar a un máximo de 4 productos
        thumbnail_url = None
        if product.get('images') and len(product['images']) > 0:
            thumbnail_url = product['images'][0]['src']

        products_list.append({
            'name': product['name'],
            'thumbnail_url': thumbnail_url,
            'permalink': product['permalink'],
            'price': product['price']
        })

    # Construye la respuesta de texto con los productos encontrados, incluyendo las imágenes en miniatura
    products_text = "\n".join([f"{product['name']} <img src='{product['thumbnail_url']}' width='50px'>" for product in products_list if product['thumbnail_url']])

    return jsonify({
        'products': products_list
    })


def lemmatize_text(text):
    # Analiza el texto con spacy
    doc = nlp(text)
    # Lematiza cada token en el texto y lo concatena nuevamente en una sola cadena
    lemmatized_text = " ".join(token.lemma_ for token in doc)
    return lemmatized_text

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
    #app.run(debug=True)
