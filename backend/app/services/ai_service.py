import httpx
from typing import Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.models import Product, Category
from app.core.config import settings

GEMINI_ACTIVE = bool(settings.GEMINI_API_KEY)

async def generate_ai_description(title: str, category_name: str, condition: str) -> str:
    """
    Generates a professional marketplace description using Gemini API, 
    falling back to a rich template-based generator if no API key is provided.
    """
    # Auto-infer category based on title keywords
    title_lower = title.lower()
    inferred_category = None
    if any(k in title_lower for k in ["car", "toyota", "honda", "ford", "bmw", "vehicle", "truck", "suv", "motorcycle", "camry", "mark x", "markv", "mark v"]):
        inferred_category = "Vehicles"
    elif any(k in title_lower for k in ["phone", "iphone", "macbook", "laptop", "ipad", "computer", "tv", "camera", "headphone", "earbuds", "samsung", "electronics", "console", "playstation", "xbox"]):
        inferred_category = "Electronics"
    elif any(k in title_lower for k in ["jacket", "shirt", "jeans", "shoes", "dress", "clothing", "coat", "hoodie", "sweater", "t-shirt", "suede", "clothes"]):
        inferred_category = "Fashion"
    elif any(k in title_lower for k in ["chair", "table", "desk", "furniture", "couch", "sofa", "bed", "garden", "plant"]):
        inferred_category = "Home & Garden"

    category_to_use = inferred_category if inferred_category else category_name

    if GEMINI_ACTIVE:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
            prompt = (
                f"Write a compelling, detailed product description for a second-hand marketplace listing.\n"
                f"Product Title: {title}\n"
                f"Category: {category_to_use}\n"
                f"Condition: {condition}\n"
                f"Keep it realistic, engaging, and professional. Highlight typical benefits. Bullet points are fine. "
                f"Do not include pricing in the description. Length: 100-150 words."
            )
            payload = {
                "contents": [{
                    "parts": [{"text": prompt}]
                }]
            }
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, timeout=10.0)
                if response.status_code == 200:
                    data = response.json()
                    text = data['candidates'][0]['content']['parts'][0]['text']
                    return text.strip()
        except Exception as e:
            print(f"Gemini API generation failed: {e}. Falling back to template description.")
            pass

    # Template-based Fallback
    title_lower = title.lower()

    if any(k in title_lower for k in ["cricket", "bat", "ball", "sports", "kit", "football", "racket", "gym", "workout"]):
        return (
            f"Up for sale is this {title} in {condition} condition. Perfect for sports enthusiasts and active play! "
            f"It is durable, well-maintained, and ready for immediate use. "
            f"Shows standard signs of play but contains no structural cracks or severe damage. "
            f"A solid choice for training sessions, practice matches, or casual play at a great discount. Please refer to the images for details!"
        )
    elif any(k in title_lower for k in ["book", "novel", "textbook", "magazine", "study", "notes"]):
        return (
            f"Selling my copy of {title} in {condition} condition. Pages are fully clean, legible, and intact with no missing sheets. "
            f"Binding is strong with minimal wear to the cover corners. Excellent addition for students, collectors, or anyone interested in the topic."
        )
    elif any(k in title_lower for k in ["laptop", "macbook", "computer", "pc", "desktop"]):
        return (
            f"Up for grabs is this {title} in {condition} condition. Offers reliable daily performance and smooth navigation. "
            f"The screen is bright with no scratches, and the keyboard and trackpad are fully responsive. "
            f"Ideal budget-friendly option for students, remote office workers, or developers. Includes standard charger."
        )
    elif any(k in title_lower for k in ["phone", "iphone", "samsung", "mobile", "tablet", "ipad", "android"]):
        return (
            f"Selling this {title} in {condition} condition. Device is network-unlocked, fully clean, and has a highly responsive touch screen interface. "
            f"The battery health is strong and holds a reliable charge. Great option if you need a replacement or secondary phone without paying retail prices."
        )
    elif any(k in title_lower for k in ["car", "toyota", "honda", "camry", "suzuki", "auto", "vehicle"]):
        return (
            f"Up for sale is this {title} in {condition} condition. Runs great, shifts smoothly, and has been serviced regularly. "
            f"Very clean interior and exterior. Clean title documents in hand. Offers are welcome but please no lowballs. "
            f"Send a message to schedule a viewing or schedule a test drive."
        )
    elif any(k in title_lower for k in ["chair", "table", "sofa", "couch", "furniture", "desk"]):
        return (
            f"Selling this {title} in {condition} condition. Extremely sturdy, comfortable, and matches nicely with modern living space setups. "
            f"No structural wobbles or frame damage. Perfect for upgrading your home or office layout."
        )

    # Category-based Fallback
    desc_templates = {
        "Electronics": [
            f"Selling my {title} in {condition} condition. It works perfectly and has been taken care of carefully. "
            "Clean screens, no internal issues, and original functionality intact. Perfect if you need a reliable device without paying retail price! "
            "Feel free to message me for any specific questions or to arrange a pickup.",
            
            f"Here is a great deal on this {title}! Evaluated as {condition} condition. "
            "Perfect for daily use. Battery and ports are all in working order. I am selling it because I recently upgraded. "
            "Comes from a pet-free and smoke-free home."
        ],
        "Vehicles": [
            f"Selling my {title} in {condition} condition. Runs great, shifts smoothly, and has been serviced regularly. "
            "Very clean interior and exterior. Clean title in hand. Offers are welcome but please no lowballs. "
            "Send a message to schedule a test drive."
        ],
        "Fashion": [
            f"Gently used {title} in {condition} condition. Fits true to size, super comfortable and stylish. "
            "No major stains or tears. Selling to clear out my closet. Great value!"
        ]
    }

    # Pick template by category name or fallback
    templates = desc_templates.get(category_to_use, [
        f"Selling my {title} in {condition} condition. Well-maintained, clean, and in great shape. "
        "Excellent price-to-value ratio. Please check the photos for actual condition details. "
        "Message me if you are interested!"
    ])
    
    # Simple hash based on title length to pick a stable template option
    idx = len(title) % len(templates)
    return templates[idx]


def suggest_ai_price(db: Session, title: str, category_id: int, condition: str) -> Dict[str, Any]:
    """
    Suggests an optimal listing price and range based on existing category database averages, 
    adjusting for condition.
    """
    # 1. Fetch category
    category = db.query(Category).filter(Category.id == category_id).first()
    category_name = category.name if category else "General"

    # 2. Get average price of similar products in this category
    avg_price_query = db.query(func.avg(Product.price)).filter(
        Product.category_id == category_id,
        Product.is_sold == False
    ).scalar()

    # Default category seed prices if database is empty
    default_averages = {
        1: 450.00,  # Electronics
        2: 8000.00, # Vehicles
        3: 1500.00, # Property (rental monthly/sale partial placeholder)
        4: 35.00,   # Fashion
        5: 80.00,   # Home & Garden
        6: 50.00    # Hobbies
    }

    base_avg = float(avg_price_query) if avg_price_query else default_averages.get(category_id, 100.00)

    # 3. Factor in condition
    # New: 1.1x of average, Like New: 0.9x, Good: 0.7x, Fair: 0.4x
    condition_multipliers = {
        "New": 1.10,
        "Like New": 0.90,
        "Good": 0.70,
        "Fair": 0.45
    }
    multiplier = condition_multipliers.get(condition, 0.75)
    suggested_price = round(base_avg * multiplier, 2)
    
    # Set range
    min_price = round(suggested_price * 0.85, 2)
    max_price = round(suggested_price * 1.15, 2)

    return {
        "suggested_price": suggested_price,
        "min_price": min_price,
        "max_price": max_price,
        "rationale": (
            f"Based on historical sales and active listings in the '{category_name}' category, "
            f"similar items average ${base_avg:.2f}. "
            f"Since your item is in '{condition}' condition, we recommend listing between "
            f"${min_price:.2f} and ${max_price:.2f} to sell quickly."
        )
    }

async def verify_ai_image(base64_image: str, title: str, category_name: str) -> Dict[str, Any]:
    """
    Verifies listing photos using Gemini Vision API. Detects stock photos, 
    mismatches, and estimates product condition. Falls back to a simulated validator 
    if no API key is provided.
    """
    import json
    mime_type = "image/jpeg"
    base64_data = base64_image
    
    if "," in base64_image:
        header, base64_data = base64_image.split(",", 1)
        if "data:" in header:
            parts = header.split(";")
            for p in parts:
                if p.startswith("data:"):
                    mime_type = p.replace("data:", "")

    if GEMINI_ACTIVE:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
            prompt = (
                f"You are an AI assistant for a second-hand marketplace. Analyze this product photo for a listing titled '{title}' in category '{category_name}'.\n"
                f"Evaluate if this image matches the title/category, if it looks like a generic stock/corporate photo (flag it if so), and estimate the item condition.\n"
                f"You MUST return a JSON object with this exact structure:\n"
                f"{{\n"
                f"  \"status\": \"VERIFIED\" or \"FLAGGED\",\n"
                f"  \"is_stock_photo\": true or false,\n"
                f"  \"confidence\": 0.95,\n"
                f"  \"feedback\": \"Your detailed assessment in English.\",\n"
                f"  \"suggested_condition\": \"New\" or \"Like New\" or \"Good\" or \"Fair\"\n"
                f"}}"
            )
            payload = {
                "contents": [{
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": mime_type,
                                "data": base64_data
                            }
                        }
                    ]
                }],
                "generationConfig": {
                    "responseMimeType": "application/json"
                }
            }
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, timeout=15.0)
                if response.status_code == 200:
                    data = response.json()
                    raw_text = data['candidates'][0]['content']['parts'][0]['text']
                    return json.loads(raw_text.strip())
        except Exception as e:
            print(f"Gemini Vision API verification failed: {e}. Falling back to simulation.")
            pass

    # Heuristic-based mock fallback for simulation
    title_lower = title.lower()
    status = "VERIFIED"
    is_stock = False
    feedback = f"Image matches category '{category_name}' and listing title '{title}'."
    suggested_condition = "Like New"
    confidence = 0.92

    # Simple mock checks for testing/demo
    if any(k in title_lower for k in ["scam", "spam", "fake", "stolen", "stock"]):
        status = "FLAGGED"
        feedback = "Image flagged: listing keywords indicate suspicious or unauthentic listing."
        confidence = 0.99
    elif len(base64_data) < 5000:
        status = "FLAGGED"
        feedback = "Image flagged: File size is too small, likely a placeholder or low-res icon."
        is_stock = True
        confidence = 0.85
    else:
        # Determine condition from title/heuristics
        if "new" in title_lower:
            suggested_condition = "New"
        elif "fair" in title_lower or "scratched" in title_lower:
            suggested_condition = "Fair"
        elif "good" in title_lower:
            suggested_condition = "Good"

    return {
        "status": status,
        "is_stock_photo": is_stock,
        "confidence": confidence,
        "feedback": feedback,
        "suggested_condition": suggested_condition
    }

async def translate_text(text: str, target_lang: str) -> str:
    """
    Translates text between English, Roman Urdu, and Nastaliq Urdu using Gemini API,
    falling back to a smart colloquial dictionary translator if the key is not active.
    """
    if not text.strip():
        return ""

    if GEMINI_ACTIVE:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
            prompt = (
                f"You are a translation assistant for a second-hand marketplace.\n"
                f"Translate the following text into the target language.\n"
                f"Keep the translation natural, matching local colloquial phrasing, slang, and marketplace negotiation tone.\n"
                f"Do not write any introductory or concluding text, only return the exact translation.\n"
                f"Target Language: {target_lang} (where 'ur_roman' is Urdu in Latin/Roman script, 'ur_nastaliq' is Urdu in Arabic/Persian script, and 'en' is English)\n"
                f"Text to translate: {text}"
            )
            payload = {
                "contents": [{
                    "parts": [{"text": prompt}]
                }]
            }
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, timeout=10.0)
                if response.status_code == 200:
                    data = response.json()
                    translated = data['candidates'][0]['content']['parts'][0]['text']
                    return translated.strip()
        except Exception as e:
            print(f"Gemini translation failed: {e}. Falling back to lexicon.")
            pass

    # Heuristic Translation Fallback
    text_lower = text.lower().strip()
    
    # English to Roman Urdu / Nastaliq
    en_to_roman = {
        "hello": "Salam",
        "hi": "Salam",
        "how much?": "Kitne ka?",
        "is this still available?": "Kya yeh abhi tak available hai?",
        "is it available?": "Kya yeh available hai?",
        "what is the final price?": "Bhai final price kya hai?",
        "what is the last price?": "Aakhri price batao?",
        "discount please": "Thora discount dedo",
        "please lower the price": "Bhai thora kam karo",
        "where can we meet?": "Kahan milna hai?",
        "let's meet at a safe location": "Kisi safe jagah pe milte hain",
        "okay, works for me": "Theek hai, mujhe manzoor hai",
        "no, sorry": "Nahi, mazrat",
        "congratulations": "Mubarak ho",
    }
    
    en_to_nastaliq = {
        "hello": "السلام علیکم",
        "hi": "سلام",
        "how much?": "کتنے کا ہے؟",
        "is this still available?": "کیا یہ ابھی تک دستیاب ہے؟",
        "is it available?": "کیا یہ دستیاب ہے؟",
        "what is the final price?": "بھائی فائنل قیمت کیا ہے؟",
        "what is the last price?": "آخری قیمت بتائیں؟",
        "discount please": "تھوڑا ڈسکاؤنٹ دیں بھائی",
        "please lower the price": "بھائی تھوڑا کم کریں",
        "where can we meet?": "کہاں ملنا ہے؟",
        "let's meet at a safe location": "کسی محفوظ جگہ پر ملتے ہیں",
        "okay, works for me": "ٹھیک ہے، مجھے منظور ہے",
        "no, sorry": "جی نہیں، معذرت",
        "congratulations": "مبارک ہو",
    }

    # Roman Urdu to English
    roman_to_en = {
        "salam": "Hello / Greetings",
        "bhai": "Brother",
        "final": "final price",
        "rate": "price offer",
        "kam": "lower / discount",
        "kitne": "how much",
        "available": "available",
        "milna": "meetup",
        "kahan": "where",
    }

    if target_lang == "ur_roman":
        for k, v in en_to_roman.items():
            if k in text_lower:
                return v
        return f"[Roman Urdu] {text} (Translation)"
    
    elif target_lang == "ur_nastaliq":
        for k, v in en_to_nastaliq.items():
            if k in text_lower:
                return v
        return f" [اردو] {text} (ترجمہ)"
    
    else:  # Target: English
        # Check Roman Urdu keywords
        matched_terms = []
        if "salam" in text_lower:
            matched_terms.append("Hello")
        if "bhai" in text_lower:
            matched_terms.append("brother")
        if "final" in text_lower or "aakhri" in text_lower:
            matched_terms.append("what is the final price?")
        if "kam" in text_lower or "discount" in text_lower:
            matched_terms.append("can you give a discount?")
        if "kitne" in text_lower:
            matched_terms.append("how much is it?")
        if "available" in text_lower:
            matched_terms.append("is it still available?")
        
        if matched_terms:
            return ", ".join(matched_terms)
        return f"[English] {text} (Translation)"

async def generate_negotiation_reply(db: Session, chat_id: int, user_id: int) -> str:
    """
    Formulates a reply suggestion using Gemini based on the recent conversation flow, 
    falling back to standard local negotiating rules.
    """
    from app.models.models import Chat, Message, User
    
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        return "Salam! Is this item still available?"
        
    product = chat.product
    product_title = product.title if product else "item"
    product_price = float(product.price) if product else 0.0

    # Get recent messages (up to 5)
    recent_msgs = db.query(Message).filter(Message.chat_id == chat_id).order_by(Message.id.desc()).limit(5).all()
    recent_msgs.reverse()
    
    history_str = ""
    last_msg_text = ""
    for m in recent_msgs:
        sender = db.query(User).filter(User.id == m.sender_id).first()
        sender_name = sender.name if sender else f"User {m.sender_id}"
        history_str += f"{sender_name}: {m.content}\n"
        if m.sender_id != user_id:
            last_msg_text = m.content

    if GEMINI_ACTIVE:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
            prompt = (
                f"You are a helpful negotiation assistant. Suggest a single direct, short response (max 20 words) "
                f"for the user to send next in a second-hand marketplace chat.\n"
                f"Product: {product_title} (Listed Price: Rs. {product_price:.2f})\n"
                f"Recent messages in the chat:\n{history_str}\n"
                f"Suggest only the message text itself. Do not put quotes around it."
            )
            payload = {
                "contents": [{
                    "parts": [{"text": prompt}]
                }]
            }
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=payload, timeout=10.0)
                if response.status_code == 200:
                    data = response.json()
                    reply = data['candidates'][0]['content']['parts'][0]['text']
                    return reply.strip().replace('"', '')
        except Exception as e:
            print(f"Gemini reply suggestion failed: {e}. Using rules fallback.")
            pass

    # Rules-based negotiation reply builder
    last_msg_lower = last_msg_text.lower()
    
    # If no messages yet
    if not recent_msgs:
        return f"Salam! Is the {product_title} still available for Rs. {product_price:,.0f}?"
        
    # If other user asked if it is available
    if "available" in last_msg_lower or "hai" in last_msg_lower:
        return "Walaikum Assalam! Yes, it is available. Are you interested?"
        
    # If other user asked for final price
    if "final" in last_msg_lower or "last" in last_msg_lower or "aakhri" in last_msg_lower:
        counter_price = product_price * 0.95
        return f"The price is slightly negotiable. I can do Rs. {counter_price:,.0f} as a final offer."
        
    # If other user asked to meet
    if "meet" in last_msg_lower or "milna" in last_msg_lower or "spot" in last_msg_lower:
        return "Sure, we can meet up at a safe location, like a nearby bank or police station lobby."

    # If other user sent a number (offer)
    import re
    digits = re.findall(r'\d+', last_msg_lower.replace(',', ''))
    if digits:
        offered_val = float(digits[0])
        if offered_val < product_price:
            counter = round((product_price + offered_val) / 2)
            return f"Rs. {offered_val:,.0f} is a bit low. Can we split the difference at Rs. {counter:,.0f}?"
        else:
            return "That price works for me. Let's proceed with checkout!"

    return "Salam! I'm interested. Let's coordinate details."

def generate_dealslip(db: Session, chat_id: int) -> Dict[str, Any]:
    """
    Gathers structured transaction metadata for a final transaction summary dealslip card.
    """
    from app.models.models import Chat, Message
    import json
    
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        raise Exception("Chat room not found")
        
    product = chat.product
    if not product:
        raise Exception("Product not found")

    # Find the last accepted offer amount
    last_offer_msg = db.query(Message).filter(
        Message.chat_id == chat_id,
        Message.message_type == "offer"
    ).order_by(Message.id.desc()).first()

    final_price = float(product.price)
    if last_offer_msg:
        try:
            offer_data = json.loads(last_offer_msg.content)
            if offer_data.get("status") == "accepted":
                final_price = float(offer_data.get("amount", product.price))
        except:
            pass

    buyer = chat.buyer
    seller = chat.seller

    return {
        "product_title": product.title,
        "listing_price": float(product.price),
        "final_price": final_price,
        "buyer_name": buyer.name if buyer else "Buyer",
        "seller_name": seller.name if seller else "Seller",
        "location": product.location,
        "handoff_method": "Courier Delivery" if product.location != buyer.address else "Self Meetup"
    }


async def semantic_search_products(query: str, products_list: list) -> list:
    """
    Leverages Gemini to rank products based on semantic similarity.
    products_list is a list of dicts: [{'id': 1, 'title': '...', 'description': '...', 'price': 100.0}]
    Returns list of matching product IDs sorted by relevance.
    """
    if not query.strip() or not products_list:
        return []

    # Fallback keyword match if Gemini is not active
    def fallback_match():
        matches = []
        words = [w.lower() for w in query.split()]
        for p in products_list:
            score = 0
            t_low = p['title'].lower()
            d_low = p['description'].lower()
            for w in words:
                if w in t_low:
                    score += 5
                if w in d_low:
                    score += 1
            if score > 0:
                matches.append((p['id'], score))
        matches.sort(key=lambda x: x[1], reverse=True)
        return [m[0] for m in matches]

    if not GEMINI_ACTIVE:
        return fallback_match()

    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
        
        # Keep product descriptions short to prevent context limit issues
        simplified_products = []
        for p in products_list:
            simplified_products.append({
                "id": p['id'],
                "title": p['title'],
                "description": p['description'][:150],
                "price": float(p['price'])
            })
            
        prompt = (
            f"You are a semantic search engine for a second-hand marketplace.\n"
            f"User Search Query: \"{query}\"\n\n"
            f"Available Products JSON:\n{simplified_products}\n\n"
            f"Analyze which products best match the query (consider synonyms, intent, price range, and relevance). "
            f"Return a JSON array of matching product IDs in order of relevance, for example: [3, 15, 2]. "
            f"If none match, return an empty array []. Do not explain anything, return ONLY the raw JSON array."
        )
        
        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "responseMimeType": "application/json"
            }
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=15.0)
            if response.status_code == 200:
                import json
                data = response.json()
                text = data['candidates'][0]['content']['parts'][0]['text']
                matched_ids = json.loads(text.strip())
                if isinstance(matched_ids, list):
                    return [int(x) for x in matched_ids]
    except Exception as e:
        print(f"Gemini semantic search failed: {e}")
        
    return fallback_match()


async def visual_search_products(image_base64: str, products_list: list) -> list:
    """
    Leverages Gemini to identify similar products based on a base64 encoded image.
    Returns list of matching product IDs sorted by visual similarity.
    """
    if not image_base64 or not products_list:
        return []

    # Fallback if Gemini is not active: return first 3 products
    def fallback_match():
        return [p['id'] for p in products_list[:3]]

    if not GEMINI_ACTIVE:
        return fallback_match()

    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
        
        simplified_products = []
        for p in products_list:
            simplified_products.append({
                "id": p['id'],
                "title": p['title'],
                "description": p['description'][:100]
            })

        prompt = (
            f"Analyze the attached image. Determine what product it represents. "
            f"Compare this product to the following marketplace listings:\n{simplified_products}\n\n"
            f"Identify which listings are visually similar or describe the same item. "
            f"Return a JSON array of matching product IDs in order of relevance, e.g. [2, 7]. "
            f"Return ONLY the JSON list. Do not explain."
        )

        payload = {
            "contents": [{
                "parts": [
                    {"text": prompt},
                    {
                        "inlineData": {
                            "mimeType": "image/jpeg",
                            "data": image_base64
                        }
                    }
                ]
            }],
            "generationConfig": {
                "responseMimeType": "application/json"
            }
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=20.0)
            if response.status_code == 200:
                import json
                data = response.json()
                text = data['candidates'][0]['content']['parts'][0]['text']
                matched_ids = json.loads(text.strip())
                if isinstance(matched_ids, list):
                    return [int(x) for x in matched_ids]
    except Exception as e:
        print(f"Gemini visual search failed: {e}")

    return fallback_match()

