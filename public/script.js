// --- public/script.js ---
document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = ''; // Rutas relativas para API en el mismo dominio
    const productGrid = document.getElementById('product-grid');
    const categoryNav = document.getElementById('category-nav');
    const currentCategoryTitle = document.getElementById('current-category-title');
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessageDiv = document.getElementById('error-message');

    const consultationModal = document.getElementById('consultation-modal');
    const consultationProductNameModal = document.getElementById('consultation-product-name-modal');
    const copyPasteMessageText = document.getElementById('copy-paste-message-text');
    const signalContactLink = document.getElementById('signal-contact-link');
    const simplexContactLink = document.getElementById('simplex-contact-link');

    const productDetailsModal = document.getElementById('product-details-modal');
    const modalProductImage = document.getElementById('modal-product-image');
    const modalProductTitle = document.getElementById('modal-product-title');
    const modalProductRating = document.getElementById('modal-product-rating');
    const modalProductPriceUSD = document.getElementById('modal-product-price-val-usd');
    const modalProductPriceBTC = document.getElementById('modal-product-price-val-btc');
    const modalProductSpecsList = document.getElementById('modal-product-specs-list');
    const modalProductDescription = document.getElementById('modal-product-description');
    const modalEbayLink = document.getElementById('modal-ebay-link');
    const modalConsultButton = document.getElementById('modal-consult-button');

    let ebayTokenInMemory = null;
    let currentProductsData = [];
    let tokenFetchRetryCount = 0;
    const MAX_TOKEN_FETCH_RETRIES = 1; // Permitir 1 reintento después del fallo inicial

    const PRODUCT_CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 horas
    const TOKEN_CACHE_KEY = 'ebay_api_token_data_v4'; // Incrementar versión si cambia la lógica
    const TOKEN_CACHE_DURATION_MS = 115 * 60 * 1000; // 115 minutos

    // Mover a configuración o backend si es posible, pero por ahora aquí para simplicidad
    const CONTACT_LINKS = {
        signal: "https://signal.me/#eu/CF1rj5AIaTA5K3wXO-BE2MTR4NTSwNRxNG0y0eb58RW7cYpZSJdLdoWQiR9wgqEY",
        simplex: "https://simplex.chat/invitation#/?v=2-7&smp=smp%3A%2F%2F0YuTwO05YJWS8rkjn9eLJDjQhFKvIYd8d4xG8X1blIU%3D%40smp8.simplex.im%2FvRrCr5pFnLpkU6W88_4MXi2-ONqihXPg%23%2F%3Fv%3D1-4%26dh%3DMCowBQYDK2VuAyEAOI2_lERj4RuKhypEyNWdfJnxaWtlFUeFUktxR2hlY24%253D%26q%3Dm%26k%3Ds%26srv%3Dbeccx4yfxxbvyhqypaavemqurytl6hozr47wfc7uuecacjqdvwpw2xid.onion&e2e=v%3D2-3%26x3dh%3DMEIwBQYDK2VvAzkAD5TfPW3hXr9pSw9omGm6GY-NnhA4UiflAY-zBWZ3EOCsnvrz24PIAatHMZ8BeRaDVUgZAOE0Ni4%3D%2CMEIwBQYDK2VvAzkAlbmQJKqF8oYipNeRq3CA6igbMUVwVP3V27qk2f65ImQe_b2Rc7vbE5cBs80PQD8bac1Il3GNXeg%3D"
    };

    const categories = [
        { name: 'Destacados', query: 'popular electronics luxury' },
        { name: 'Relojes', query: 'luxury watches men women rolex omega' },
        { name: 'Celulares', query: 'smartphones unlocked iphone samsung pixel' },
        { name: 'Walkie Talkies', query: 'professional walkie talkie motorola baofeng' },
        { name: 'Joyas', query: 'fine jewelry gold diamond GIA' },
        { name: 'Perfumes', query: 'designer perfume creed tom ford chanel' },
        { name: 'Anteojos', query: 'designer sunglasses ray-ban oakley gucci' },
        { name: 'Equipo Médico', query: 'professional stethoscope littmann blood pressure monitor omron' },
        { name: 'Scanner Automotriz', query: 'automotive diagnostic scanner autel launch' },
        { name: 'Fuentes de Poder', query: 'pc power supply 80+ gold corsair seasonic' },
        { name: 'Escapes Inox', query: 'stainless steel exhaust system borla magnaflow' },
        { name: 'Luces Tácticas', query: 'tactical flashlight high lumen surefire streamlight' },
        { name: 'Bolígrafos Tácticos', query: 'tactical pen self defense glass breaker' },
        { name: 'Tarjetas Gráficas', query: 'graphics card gaming nvidia geforce rtx amd radeon' },
        { name: 'Zapatos (Diseñador)', query: 'designer shoes men women nike adidas gucci' },
        { name: 'Ropa de Invierno', query: 'winter coat north face patagonia canada goose' },
        { name: 'Ropa Táctica', query: 'tactical pants 5.11 crye precision' },
        { name: 'Ropa Deportiva', query: 'sports shoes running basketball nike adidas' },
        { name: 'Mochilas Tácticas', query: 'tactical backpack molle 5.11 goruck' },
        { name: 'Telescopios', query: 'telescope astronomical celestron meade' },
        { name: 'Microscopios', query: 'microscope biological digital amscope' },
        { name: 'Generadores Eólicos', query: 'wind turbine generator residential small' },
        { name: 'Paneles Solares', query: 'solar panel kit residential renogy goal zero' },
    ];

    // --- FUNCIONES HELPER ---
    function showLoading(isLoading) {
        if (loadingIndicator) loadingIndicator.style.display = isLoading ? 'block' : 'none';
    }

    function showError(message) {
        if (errorMessageDiv) {
            if (message) {
                errorMessageDiv.textContent = message;
                errorMessageDiv.style.display = 'block';
            } else {
                errorMessageDiv.style.display = 'none';
                errorMessageDiv.textContent = '';
            }
        }
    }

    function getFromCache(key) {
        const cachedItem = localStorage.getItem(key);
        if (!cachedItem) return null;
        try {
            const parsedItem = JSON.parse(cachedItem);
            if (Date.now() > parsedItem.expiry) {
                localStorage.removeItem(key); console.log(`[Cache] Expirada: ${key}`); return null;
            }
            console.log(`[Cache] Desde localStorage: ${key}`); return parsedItem.value;
        } catch (e) {
            console.error(`[Cache] Error parseando ${key}:`, e); localStorage.removeItem(key); return null;
        }
    }

    function saveToCache(key, value, durationMs) {
        const itemToCache = { value: value, expiry: Date.now() + durationMs };
        try {
            localStorage.setItem(key, JSON.stringify(itemToCache));
            console.log(`[Cache] Guardado: ${key} (duración: ${Math.round(durationMs / 60000)} mins)`);
        } catch (e) { console.error(`[Cache] Error guardando ${key}:`, e); }
    }

    // --- LÓGICA DE TOKEN Y PRODUCTOS ---
    async function fetchEbayToken(forceRefresh = false) {
        if (!forceRefresh && ebayTokenInMemory) {
            console.log("[Token] Usando token desde memoria de sesión.");
            tokenFetchRetryCount = 0; // Resetear contador si el token en memoria es válido
            return ebayTokenInMemory;
        }

        let cachedTokenData = null;
        if (!forceRefresh) {
            cachedTokenData = getFromCache(TOKEN_CACHE_KEY);
        }
        
        if (cachedTokenData && cachedTokenData.access_token) {
            ebayTokenInMemory = cachedTokenData.access_token;
            console.log("[Token] Usando token desde caché localStorage.");
            tokenFetchRetryCount = 0; // Resetear contador si el token de caché es válido
            return ebayTokenInMemory;
        }

        console.log("[Token] Solicitando NUEVO token desde API.");
        try {
            const response = await fetch(`${API_BASE_URL}/api/get-ebay-token`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({error: "Error desconocido al obtener token del backend"})); // Intenta parsear error JSON
                throw new Error(errorData.error || `Error HTTP al obtener token: ${response.status}`);
            }
            const tokenData = await response.json(); 
            if (!tokenData.access_token) {
                throw new Error("Respuesta de token API no contiene access_token.");
            }
            
            ebayTokenInMemory = tokenData.access_token;
            tokenFetchRetryCount = 0; // Resetear contador en éxito

            // expires_in viene en segundos desde la API de eBay
            const tokenValidDurationMs = tokenData.expires_in 
                ? (tokenData.expires_in * 1000 * 0.95) // Cachear por 95% de su vida útil
                : TOKEN_CACHE_DURATION_MS; // Fallback
            
            saveToCache(TOKEN_CACHE_KEY, tokenData, tokenValidDurationMs); // Guardar el objeto tokenData completo
            console.log("[Token] Nuevo token obtenido y cacheado.");
            return ebayTokenInMemory;
        } catch (error) {
            console.error('[Frontend] Error crítico al obtener/procesar token de eBay:', error);
            showError(`Error crítico al obtener token de eBay: ${error.message}. Intente recargar la página.`);
            ebayTokenInMemory = null;
            return null;
        }
    }

    async function fetchProducts(query, categoryName, limit = 50, offset = 0) {
        showLoading(true); showError(null);
        currentCategoryTitle.textContent = categoryName || 'Resultados de Búsqueda';
        const CACHE_KEY_PRODUCTS = `ebay_products_${encodeURIComponent(query)}_limit${limit}_offset${offset}`;
        
        // const cachedProducts = getFromCache(CACHE_KEY_PRODUCTS); // Descomentar si se quiere caché de productos
        // if (cachedProducts) {
        //    currentProductsData = cachedProducts; displayProducts(currentProductsData, categoryName, false);
        //    showLoading(false); return;
        // }

        let token = await fetchEbayToken(); 
        
        if (!token && tokenFetchRetryCount < MAX_TOKEN_FETCH_RETRIES) {
            console.warn("[Frontend] Primer intento de token falló, reintentando una vez...");
            tokenFetchRetryCount++;
            token = await fetchEbayToken(true); // Forzar refresco
        }

        if (!token) {
            console.error("[Frontend] No se pudo obtener un token válido para buscar productos después de reintentos.");
            // El error ya se debería haber mostrado en fetchEbayToken
            showLoading(false);
            displayProducts([], categoryName, false);
            return;
        }

        const searchUrl = `${API_BASE_URL}/api/search-ebay?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`;
        try {
            const response = await fetch(searchUrl, { headers: { 'X-Ebay-App-Token': token } });
            
            if (response.status === 401 && tokenFetchRetryCount < MAX_TOKEN_FETCH_RETRIES) { 
                console.warn("[Frontend] Error 401 con token actual. Refrescando token y reintentando búsqueda...");
                tokenFetchRetryCount++;
                const newToken = await fetchEbayToken(true); // Forzar refresco
                if (newToken) {
                    const retryResponse = await fetch(searchUrl, { headers: { 'X-Ebay-App-Token': newToken } });
                    if (!retryResponse.ok) {
                        let eMsg = `Error servidor (${retryResponse.status}) tras reintento de búsqueda.`;
                        try{ const eD=await retryResponse.json(); eMsg=eD.error||eD.message||(eD.details?.errors?.[0]?.message)||eMsg; }catch(e){}
                        throw new Error(eMsg);
                    }
                    const data = await retryResponse.json();
                    processProductData(data, categoryName, CACHE_KEY_PRODUCTS);
                } else {
                    throw new Error("No se pudo obtener un token nuevo tras fallo de autorización en búsqueda.");
                }
            } else if (!response.ok) {
                let eMsg = `Error del servidor al buscar (${response.status})`;
                try{ const eD=await response.json(); eMsg=eD.error||eD.message||(eD.details?.errors?.[0]?.message)||eMsg; }catch(e){}
                throw new Error(eMsg);
            } else { 
                const data = await response.json();
                processProductData(data, categoryName, CACHE_KEY_PRODUCTS);
            }
        } catch (error) {
            console.error(`[Frontend] Error en fetchProducts para "${categoryName}":`, error);
            showError(`Error al cargar "${categoryName}": ${error.message}. Verifique la conexión o intente más tarde.`);
            currentProductsData = []; displayProducts(currentProductsData, categoryName, false);
        } finally { 
            showLoading(false); 
        }
    }

   function processProductData(data, categoryName, cacheKey) {
        const itemsArray = Array.isArray(data?.itemSummaries) ? data.itemSummaries
                         : Array.isArray(data?.items) ? data.items
                         : Array.isArray(data) ? data
                         : [];
        
        // Validación de datos más estricta
        currentProductsData = itemsArray.filter(item =>
            item && // Asegurar que el item no sea null o undefined
            item.itemId &&
            item.title &&
            item.price?.value && parseFloat(item.price.value) > 0 &&
            (item.image?.imageUrl || item.thumbnailImages?.[0]?.imageUrl || item.additionalImages?.[0]?.imageUrl) // Al menos una fuente de imagen
        );

        if (currentProductsData.length > 0) {
            saveToCache(cacheKey, currentProductsData, PRODUCT_CACHE_DURATION_MS);
        }
        displayProducts(currentProductsData, categoryName, true); // Aleatorizar en nueva carga
   }

    function shuffleArray(array) { // Implementación completa de Fisher-Yates
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array; // Devolver el array modificado
    }

    function displayProducts(itemsToDisplay, categoryNameForMsg, randomizeOrder = false) {
        if (!productGrid) {
            console.error("Elemento productGrid no encontrado en el DOM.");
            return;
        }
        productGrid.innerHTML = ''; 
        if (!Array.isArray(itemsToDisplay)) {
            console.error("itemsToDisplay no es un array:", itemsToDisplay);
            itemsToDisplay = [];
        }

        let finalItems = [...itemsToDisplay];
        if (randomizeOrder && finalItems.length > 0) {
            finalItems = shuffleArray(finalItems);
        }

        if (finalItems.length === 0) {
            productGrid.innerHTML = `<p style="text-align:center; grid-column: 1 / -1; font-size: 1.1em; padding: 20px;">No se encontraron productos para "${categoryNameForMsg}". Pruebe otra categoría o revise más tarde.</p>`;
            return;
        }

        finalItems.forEach((item, loopIndex) => {
            const card = document.createElement('div'); card.className = 'product-card';
            
            const originalItem = currentProductsData.find(oi => oi.itemId === item.itemId);
            const originalIndex = originalItem ? currentProductsData.indexOf(originalItem) : -1;
            card.dataset.index = (originalIndex !== -1) ? originalIndex : loopIndex;

            let bestImageUrl = 'https://via.placeholder.com/300x250.png?text=No+Image';
            let sourceImageUrl = null; 
            if(item.image?.imageUrl) sourceImageUrl=item.image.imageUrl;
            else if(item.thumbnailImages?.[0]?.imageUrl) sourceImageUrl=item.thumbnailImages[0].imageUrl;
            else if(item.additionalImages?.[0]?.imageUrl) sourceImageUrl=item.additionalImages[0].imageUrl;
            
            if(sourceImageUrl){
                bestImageUrl = sourceImageUrl;
                if(bestImageUrl.includes('s-l')) bestImageUrl = bestImageUrl.replace(/s-l\d+/ig,'s-l1600');
            }

            const title = item.title || 'Producto Sin Título';
            const price = item.price?.value ? parseFloat(item.price.value) : 0;
            const currency = item.price?.currency || 'USD';
            const itemId = item.itemId || `temp_id_${Date.now()}_${loopIndex}`;
            
            const rating = (Math.random() * 1.5) + 3.5; 
            let starsHTML='';
            for(let i=1;i<=5;i++){
                if (i <= rating) starsHTML+= `<i class="fas fa-star"></i>`;
                else if (i - 0.5 <= rating) starsHTML+= `<i class="fas fa-star-half-alt"></i>`;
                else starsHTML+= `<i class="far fa-star"></i>`;
            }
            
            card.innerHTML = `
                <div class="product-card-image-wrapper"><img src="${bestImageUrl}" alt="${title.substring(0,50)}..." loading="lazy" onerror="this.onerror=null;this.src='${sourceImageUrl || 'https://via.placeholder.com/300x250.png?text=Error+Img'}';"></div>
                <div class="product-info"><h3>${title}</h3><div class="star-rating">${starsHTML}</div><p class="product-price">${price.toFixed(2)} <span class="currency">${currency}</span></p><p class="product-price-btc">${price.toFixed(2)} <span class="currency">BTCPY1</span></p><button class="consult-button" data-item-id="${itemId}" data-item-title="${title.replace(/"/g, '"')}">Consultar</button></div>
            `;
            productGrid.appendChild(card);
            
            card.addEventListener('click',(e)=>{
                if(e.target.classList.contains('consult-button')){
                    e.stopPropagation(); 
                    openConsultationModal(e.target.dataset.itemTitle, e.target.dataset.itemId);
                } else {
                    const pIdx = parseInt(e.currentTarget.dataset.index, 10);
                    if (!isNaN(pIdx) && pIdx >= 0 && pIdx < currentProductsData.length) {
                        const pData = currentProductsData[pIdx];
                        if(pData) openProductDetailsModal(pData);
                    } else {
                        console.error("Índice de producto inválido o fuera de rango:", pIdx);
                    }
                }
            });
        });
    }
    
    function populateCategories(){
        if (!categoryNav) {
            console.error("Elemento categoryNav no encontrado en el DOM.");
            return;
        }
        categories.forEach((cat,idx)=>{
            const btn=document.createElement('button');
            btn.textContent=cat.name;
            btn.addEventListener('click',(e)=>{
                document.querySelectorAll('#category-nav button').forEach(b=>b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                fetchProducts(cat.query,cat.name);
            });
            categoryNav.appendChild(btn);
            if(idx===0){ 
                btn.classList.add('active');
                fetchProducts(cat.query,cat.name);
            }
        });
    }

    function openConsultationModal(productTitle,productItemId){
        if (!consultationProductNameModal || !copyPasteMessageText || !signalContactLink || !simplexContactLink || !consultationModal) {
            console.error("Elementos del DOM para modal de consulta no encontrados.");
            return;
        }
        consultationProductNameModal.textContent=productTitle;
        const msg=`Hola, estoy interesado/a en el producto: "${productTitle}" (ID eBay: ${productItemId}). Me gustaría saber más sobre cómo adquirirlo con BTCPY1.`;
        copyPasteMessageText.value=msg;
        signalContactLink.href=`${CONTACT_LINKS.signal}?message=${encodeURIComponent(msg)}`;
        simplexContactLink.href=CONTACT_LINKS.simplex; 
        consultationModal.classList.add('active');
        document.body.style.overflow='hidden';
    }

    function openProductDetailsModal(productData){
        if (!productData || !modalProductImage || !modalProductTitle || !modalProductRating || !modalProductPriceUSD || !modalProductPriceBTC || !modalProductSpecsList || !modalProductDescription || !modalEbayLink || !modalConsultButton || !productDetailsModal ) {
            console.error("Elementos del DOM para modal de detalles no encontrados o productData es nulo.");
            return;
        }

        let bestModalImgUrl='https://via.placeholder.com/400x400.png?text=No+Image';
        let srcModalImgUrl=null;
        if(productData.image?.imageUrl)srcModalImgUrl=productData.image.imageUrl;
        else if(productData.thumbnailImages?.[0]?.imageUrl)srcModalImgUrl=productData.thumbnailImages[0].imageUrl;
        else if(productData.additionalImages?.[0]?.imageUrl)srcModalImgUrl=productData.additionalImages[0].imageUrl;
        
        if(srcModalImgUrl){
            bestModalImgUrl=srcModalImgUrl;
            if(bestModalImgUrl.includes('s-l'))bestModalImgUrl=bestModalImgUrl.replace(/s-l\d+/ig,'s-l1600');
        }
        
        modalProductImage.src=bestModalImgUrl;
        modalProductImage.onerror=function(){this.onerror=null;this.src=srcModalImgUrl||'https://via.placeholder.com/400x400.png?text=Error+Img';};
        modalProductTitle.textContent=productData.title||'Producto Sin Título';
        
        const rating = (Math.random() * 1.5) + 3.5;
        let starsHTML=''; 
        for(let i=1;i<=5;i++){
            if(i<=rating)starsHTML+= `<i class="fas fa-star"></i>`;
            else if(i-0.5<=rating)starsHTML+= `<i class="fas fa-star-half-alt"></i>`;
            else starsHTML+= `<i class="far fa-star"></i>`;
        }
        modalProductRating.innerHTML=starsHTML;

        const price=productData.price?.value?parseFloat(productData.price.value):0;
        modalProductPriceUSD.textContent=`${price.toFixed(2)} ${productData.price?.currency||'USD'}`;
        modalProductPriceBTC.textContent=`${price.toFixed(2)} BTCPY1`;
        
        modalProductSpecsList.innerHTML='';
        const specs=productData.localizedAspects||[];
        let specsCount=0;
        if(specs.length>0){
            specs.forEach(spec=>{
                if(specsCount < 8 && spec.name && spec.value){ 
                    const li=document.createElement('li');
                    li.innerHTML=`<strong>${spec.name}:</strong> ${spec.value}`;
                    modalProductSpecsList.appendChild(li);
                    specsCount++;
                }
            });
        }
        if(productData.condition && !specs.some(s=>s.name?.toLowerCase()==='condition')){
            const li=document.createElement('li');
            li.innerHTML=`<strong>Condición:</strong> ${productData.condition}`;
            modalProductSpecsList.appendChild(li);specsCount++;
        }
        if(specsCount===0)modalProductSpecsList.innerHTML='<li>No hay especificaciones detalladas disponibles.</li>';
        
        modalProductDescription.textContent=productData.shortDescription || productData.description || 'Descripción adicional no disponible. Por favor, use el botón "Consultar" para más detalles o visite el enlace original de eBay.';
        modalEbayLink.href=productData.itemWebUrl||'#';
        modalEbayLink.style.display = productData.itemWebUrl ? 'block' : 'none';

        modalConsultButton.onclick=()=>{
            closeModal(productDetailsModal);
            openConsultationModal(productData.title, productData.itemId || `temp_id_${Date.now()}`);
        };
        productDetailsModal.classList.add('active');
        document.body.style.overflow='hidden';
    }

    function closeModal(modalEl){
        if(modalEl){
            modalEl.classList.remove('active');
            if(!document.querySelector('.modal.active')) {
                document.body.style.overflow='auto';
            }
        }
    }

    // --- INICIALIZACIÓN ---
    // Asignar listeners a botones de cerrar modales estáticos
    document.querySelectorAll('.close-modal-button').forEach(btn=>btn.addEventListener('click',(e)=>closeModal(e.target.closest('.modal'))));
    // Cerrar modal al hacer clic fuera del contenido del modal
    window.addEventListener('click',(e)=>{if(e.target.classList.contains('modal'))closeModal(e.target);});
    // Cerrar modales activos al presionar Escape
    window.addEventListener('keydown',(e)=>{if(e.key==='Escape')document.querySelectorAll('.modal.active').forEach(m => closeModal(m));});

    // Iniciar la carga de categorías y productos
    try {
        if (categoryNav && productGrid && currentCategoryTitle && loadingIndicator && errorMessageDiv && consultationModal && productDetailsModal) {
             populateCategories();
        } else {
            console.error("Faltan uno o más elementos principales del DOM. La aplicación no puede inicializar completamente.");
            showError("Error: Faltan elementos esenciales de la página. Intente recargar.");
        }
    } catch(err) {
        console.error("Error al iniciar populateCategories:", err);
        showError("Error al inicializar la página: " + err.message);
    }
});
