document.addEventListener('DOMContentLoaded', () => {

    /* ======================================================
       1. LÓGICA DE PESTAÑAS (URL vs ARCHIVO)
       ====================================================== */
    const btnTabUrl = document.getElementById('btnTabUrl');
    const btnTabFile = document.getElementById('btnTabFile');
    const tabUrlContent = document.getElementById('tabUrlContent');
    const tabFileContent = document.getElementById('tabFileContent');

    if (btnTabUrl && btnTabFile) {
        btnTabUrl.addEventListener('click', () => {
            btnTabUrl.classList.add('active'); 
            btnTabFile.classList.remove('active');
            tabUrlContent.classList.remove('hidden'); 
            tabFileContent.classList.add('hidden');
        });

        btnTabFile.addEventListener('click', () => {
            btnTabFile.classList.add('active'); 
            btnTabUrl.classList.remove('active');
            tabFileContent.classList.remove('hidden'); 
            tabUrlContent.classList.add('hidden');
        });
    }


    /* ======================================================
       2. LÓGICA DEL ANALIZADOR INFORTECH (VirusTotal)
       ====================================================== */
    const urlInput = document.getElementById('urlInput');
    const fileInput = document.getElementById('fileInput');
    const analyzeButton = document.getElementById('analyzeButton');
    const analyzeFileButton = document.getElementById('analyzeFileButton');
    const analyzerStatus = document.getElementById('analyzerStatus');
    const resultsContainer = document.getElementById('resultsContainer');

    // --- A. ANALIZAR URL ---
    if (analyzeButton) {
        analyzeButton.addEventListener('click', async () => {
            let url = urlInput.value.trim();
            if (!url) return alert("Por favor, ingresa una URL.");
            if (!url.startsWith('http')) { url = 'https://' + url; urlInput.value = url; }

            analyzerStatus.textContent = 'Analizando URL... (Espera 30s si el servidor está dormido)';
            analyzerStatus.className = 'text-lg mt-4 h-6 text-yellow-400';
            analyzeButton.disabled = true;
            analyzeButton.classList.add('loading');
            resultsContainer.innerHTML = '<p class="text-center text-gray-400">Procesando...</p>';

            // Timeout aumentado a 30s para el "cold start" de Render
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); 

            try {
                // Ejecutar ambas peticiones en paralelo (Backend + Proxy HTML)
                const [vtResult, htmlResult] = await Promise.allSettled([
                    fetch(`https://infortech.onrender.com/analizar?url=${encodeURIComponent(url)}`, { signal: controller.signal })
                        .then(res => { clearTimeout(timeoutId); return res.json(); }),
                    fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`)
                        .then(res => res.text())
                ]);

                renderResult(vtResult, htmlResult);
            } catch (error) {
                analyzerStatus.textContent = 'Error crítico de conexión (Timeout).';
                analyzerStatus.className = 'text-lg mt-4 h-6 text-red-400';
            } finally {
                analyzeButton.disabled = false; 
                analyzeButton.classList.remove('loading');
            }
        });
    }

    // --- B. ANALIZAR ARCHIVO ---
    if (analyzeFileButton) {
        analyzeFileButton.addEventListener('click', async () => {
            if (!fileInput.files[0]) return alert("Selecciona un archivo primero.");

            const formData = new FormData();
            formData.append('file', fileInput.files[0]);

            analyzerStatus.textContent = 'Subiendo y Analizando Archivo... (Esto toma tiempo)';
            analyzerStatus.className = 'text-lg mt-4 h-6 text-yellow-400';
            analyzeFileButton.disabled = true;
            analyzeFileButton.classList.add('loading');
            resultsContainer.innerHTML = '<p class="text-center text-gray-400">Subiendo a VirusTotal...</p>';

            try {
                const response = await fetch('https://infortech.onrender.com/analizar-archivo', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                // Simulamos formato Promise.allSettled para reusar renderResult
                if (data.stats) {
                    renderResult({ status: 'fulfilled', value: data }, null);
                } else {
                    throw new Error(data.error || "Error desconocido del servidor");
                }

            } catch (error) {
                console.error(error);
                analyzerStatus.textContent = 'Error al analizar archivo.';
                analyzerStatus.className = 'text-lg mt-4 h-6 text-red-400';
                resultsContainer.innerHTML = `<p class="text-red-400">Detalle: ${error.message}</p>`;
            } finally {
                analyzeFileButton.disabled = false; 
                analyzeFileButton.classList.remove('loading');
            }
        });
    }

    // --- FUNCIÓN PARA MOSTRAR RESULTADOS (CON DESGLOSE) ---
    function renderResult(vt, html) {
        analyzerStatus.textContent = 'Completado';
        analyzerStatus.className = 'text-lg mt-4 h-6 text-green-400';
        let htmlContent = '';

        // 1. Procesar Resultado VirusTotal
        if (vt && vt.status === 'fulfilled') {
            const data = vt.value;
            if (data.stats) {
                const isSafe = data.stats.malicious === 0 && data.stats.suspicious === 0;
                
                // --- DESGLOSE DE AMENAZAS ---
                let detectionsHtml = '';
                if (data.results) {
                    const threats = Object.values(data.results).filter(r => r.category === 'malicious' || r.category === 'suspicious');
                    
                    if (threats.length > 0) {
                        detectionsHtml = `
                        <div class="mt-4 pt-2 border-t border-gray-600">
                            <h4 class="font-bold text-white mb-2">Detalles de Amenazas:</h4>
                            <ul class="text-sm max-h-40 overflow-y-auto bg-gray-900 p-2 rounded">
                                ${threats.map(t => `
                                    <li class="mb-1">
                                        <span class="text-red-400 font-bold">${t.engine_name}:</span> 
                                        <span class="text-gray-300">${t.result}</span>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>`;
                    } else {
                         detectionsHtml = `<div class="mt-4 pt-2 border-t border-gray-600"><p class="text-green-400 text-sm">Ningún motor detectó amenazas específicas.</p></div>`;
                    }
                }

                htmlContent += `
                <div class="bg-gray-800 p-4 rounded-lg border ${isSafe ? 'border-green-500' : 'border-red-500'} mb-4">
                    <h3 class="text-xl font-bold mb-4 text-white">🛡️ Reporte de Seguridad</h3>
                    <div class="grid grid-cols-3 gap-2 text-center mb-2">
                        <div><p class="text-red-400 font-bold">Malignos</p><p class="text-2xl">${data.stats.malicious}</p></div>
                        <div><p class="text-yellow-400 font-bold">Sospechosos</p><p class="text-2xl">${data.stats.suspicious}</p></div>
                        <div><p class="text-green-400 font-bold">Seguros</p><p class="text-2xl">${data.stats.harmless}</p></div>
                    </div>
                    ${detectionsHtml}
                </div>`;
            } else {
                htmlContent += `<p class="text-red-400">Error VT: ${data.error || 'Sin datos'}</p>`;
            }
        } else if (vt) {
            htmlContent += `<p class="text-red-400">Error conectando al Backend.</p>`;
        }

        // 2. Procesar Resultado HTML (Solo si existe)
        if (html && html.status === 'fulfilled') {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html.value, 'text/html');
            const title = doc.querySelector('title')?.textContent || 'Sin título';
            const h1 = doc.querySelector('h1')?.textContent || 'Sin H1';
            htmlContent += `
                <div class="bg-gray-800 p-4 rounded-lg border border-blue-500">
                    <h3 class="text-xl font-bold mb-2 text-white">📄 Análisis de Contenido</h3>
                    <p class="text-gray-300"><strong>Título:</strong> ${title}</p>
                    <p class="text-gray-300"><strong>Encabezado H1:</strong> ${h1}</p>
                </div>`;
        }

        resultsContainer.innerHTML = htmlContent || '<p class="text-gray-400 text-center">No hay resultados.</p>';
    }

});