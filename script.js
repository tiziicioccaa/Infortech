document.addEventListener('DOMContentLoaded', () => {

    /* ======================================================
       1. LÓGICA DE PESTAÑAS (7 MÓDULOS)
       ====================================================== */
    const tabs = {
        url: { btn: document.getElementById('btnTabUrl'), content: document.getElementById('tabUrlContent') },
        file: { btn: document.getElementById('btnTabFile'), content: document.getElementById('tabFileContent') },
        email: { btn: document.getElementById('btnTabEmail'), content: document.getElementById('tabEmailContent') },
        gen: { btn: document.getElementById('btnTabGen'), content: document.getElementById('tabGenContent') },
        val: { btn: document.getElementById('btnTabVal'), content: document.getElementById('tabValContent') },
        history: { btn: document.getElementById('btnTabHistory'), content: document.getElementById('tabHistoryContent') },
        glossary: { btn: document.getElementById('btnTabGlossary'), content: document.getElementById('tabGlossaryContent') }
    };

    function switchTab(activeKey) {
        Object.keys(tabs).forEach(key => {
            if (tabs[key].btn && tabs[key].content) {
                if (key === activeKey) {
                    tabs[key].btn.classList.add('active');
                    tabs[key].content.classList.remove('hidden');
                } else {
                    tabs[key].btn.classList.remove('active');
                    tabs[key].content.classList.add('hidden');
                }
            }
        });
        // Si entra a historial, renderizarlo dinámicamente
        if (activeKey === 'history') renderHistory();
    }

    Object.keys(tabs).forEach(key => {
        if (tabs[key].btn) {
            tabs[key].btn.addEventListener('click', () => switchTab(key));
        }
    });

    /* ======================================================
       2. HISTORIAL LOCAL (LocalStorage)
       ====================================================== */
    function saveToHistory(tipo, detalle, estado) {
        let history = JSON.parse(localStorage.getItem('infortech_history')) || [];
        history.unshift({
            tipo,
            detalle,
            estado,
            fecha: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        });
        if (history.length > 20) history.pop(); // Máximo 20 elementos
        localStorage.setItem('infortech_history', JSON.stringify(history));
    }

    function renderHistory() {
        const container = document.getElementById('historyListContainer');
        const history = JSON.parse(localStorage.getItem('infortech_history')) || [];
        
        if (history.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center">No hay análisis registrados todavía.</p>';
            return;
        }

        container.innerHTML = history.map(item => `
            <div class="bg-gray-800 p-2 rounded flex justify-between items-center border-l-4 ${item.estado === 'safe' ? 'border-green-500' : 'border-red-500'}">
                <div>
                    <span class="font-bold text-white uppercase text-xs bg-gray-700 px-1.5 py-0.5 rounded">${item.tipo}</span>
                    <p class="text-gray-300 text-sm mt-1 truncate max-w-[250px] md:max-w-md">${item.detalle}</p>
                </div>
                <span class="text-xs text-gray-400 whitespace-nowrap">${item.fecha}</span>
            </div>
        `).join('');
    }

    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => {
            localStorage.removeItem('infortech_history');
            renderHistory();
        });
    }

    /* ======================================================
       3. ANALIZADOR DE URL (VirusTotal + Proxy)
       ====================================================== */
    const urlInput = document.getElementById('urlInput');
    const analyzeButton = document.getElementById('analyzeButton');
    const analyzerStatus = document.getElementById('analyzerStatus');
    const resultsContainer = document.getElementById('resultsContainer');

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

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); 

            try {
                const [vtResult, htmlResult] = await Promise.allSettled([
                    fetch(`https://infortech.onrender.com/analizar?url=${encodeURIComponent(url)}`, { signal: controller.signal })
                        .then(res => { clearTimeout(timeoutId); return res.json(); }),
                    fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`)
                        .then(res => res.text())
                ]);

                renderResult(vtResult, htmlResult);
                
                // Guardar en historial si fue exitoso
                if (vtResult.status === 'fulfilled' && vtResult.value.stats) {
                    const isSafe = vtResult.value.stats.malicious === 0;
                    saveToHistory('URL', url, isSafe ? 'safe' : 'danger');
                }
            } catch (error) {
                analyzerStatus.textContent = 'Error crítico de conexión (Timeout).';
                analyzerStatus.className = 'text-lg mt-4 h-6 text-red-400';
            } finally {
                analyzeButton.disabled = false; 
                analyzeButton.classList.remove('loading');
            }
        });
    }

    /* ======================================================
       4. ANALIZADOR DE ARCHIVO
       ====================================================== */
    const fileInput = document.getElementById('fileInput');
    const analyzeFileButton = document.getElementById('analyzeFileButton');

    if (analyzeFileButton) {
        analyzeFileButton.addEventListener('click', async () => {
            if (!fileInput.files[0]) return alert("Selecciona un archivo primero.");
            const file = fileInput.files[0];

            const formData = new FormData();
            formData.append('file', file);

            analyzerStatus.textContent = 'Subiendo y Analizando Archivo...';
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
                
                if (data.stats) {
                    renderResult({ status: 'fulfilled', value: data }, null);
                    const isSafe = data.stats.malicious === 0;
                    saveToHistory('Archivo', file.name, isSafe ? 'safe' : 'danger');
                } else {
                    throw new Error(data.error || "Error desconocido del servidor");
                }

            } catch (error) {
                analyzerStatus.textContent = 'Error al analizar archivo.';
                analyzerStatus.className = 'text-lg mt-4 h-6 text-red-400';
                resultsContainer.innerHTML = `<p class="text-red-400">Detalle: ${error.message}</p>`;
            } finally {
                analyzeFileButton.disabled = false; 
                analyzeFileButton.classList.remove('loading');
            }
        });
    }

    // Renderizador visual de resultados URL/Archivo
    function renderResult(vt, html) {
        analyzerStatus.textContent = 'Completado';
        analyzerStatus.className = 'text-lg mt-4 h-6 text-green-400';
        let htmlContent = '';

        if (vt && vt.status === 'fulfilled') {
            const data = vt.value;
            if (data.stats) {
                const isSafe = data.stats.malicious === 0 && data.stats.suspicious === 0;
                let detectionsHtml = '';
                if (data.results) {
                    const threats = Object.values(data.results).filter(r => r.category === 'malicious' || r.category === 'suspicious');
                    if (threats.length > 0) {
                        detectionsHtml = `
                        <div class="mt-4 pt-2 border-t border-gray-600">
                            <h4 class="font-bold text-white mb-2">Detalles de Amenazas:</h4>
                            <ul class="text-sm max-h-40 overflow-y-auto bg-gray-900 p-2 rounded">
                                ${threats.map(t => `<li class="mb-1"><span class="text-red-400 font-bold">${t.engine_name}:</span> <span class="text-gray-300">${t.result}</span></li>`).join('')}
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
        }

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

    /* ======================================================
       5. DETECCIÓN DE FILTRACIONES (EMAIL)
       ====================================================== */
    const breachBtn = document.getElementById("breach-btn");
    const breachEmailInput = document.getElementById("breach-email");
    const breachResult = document.getElementById("breach-result");

    if (breachBtn) {
        breachBtn.addEventListener("click", () => {
            const email = breachEmailInput.value.trim();
            if (!email || !email.includes("@")) return alert("Ingresa un correo válido.");

            breachResult.classList.remove("hidden");
            breachResult.className = "mt-4 p-3 rounded-lg text-sm bg-gray-700 text-white";
            breachResult.textContent = "Verificando bases de datos...";

            setTimeout(() => {
                const isLeaked = email.toLowerCase().includes("test");
                if (isLeaked) {
                    breachResult.className = "mt-4 p-3 rounded-lg text-sm bg-red-900/50 border border-red-500 text-red-300";
                    breachResult.innerHTML = `⚠️ <strong>¡Alerta!</strong> El correo <strong>${email}</strong> aparece en filtraciones públicas.`;
                    saveToHistory('Filtración', email, 'danger');
                } else {
                    breachResult.className = "mt-4 p-3 rounded-lg text-sm bg-green-900/50 border border-green-500 text-green-300";
                    breachResult.innerHTML = `✅ <strong>¡Seguro!</strong> No se hallaron registros para <strong>${email}</strong>.`;
                    saveToHistory('Filtración', email, 'safe');
                }
            }, 800);
        });
    }

    /* ======================================================
       6. NUEVA FUNCIONALIDAD: GENERADOR DE CONTRASEÑAS
       ====================================================== */
    const genPasswordOutput = document.getElementById('genPasswordOutput');
    const genLength = document.getElementById('genLength');
    const lengthVal = document.getElementById('lengthVal');
    const genSymbols = document.getElementById('genSymbols');
    const genNumbers = document.getElementById('genNumbers');
    const generatePassBtn = document.getElementById('generatePassBtn');
    const copyGenPass = document.getElementById('copyGenPass');

    if (genLength) {
        genLength.addEventListener('input', (e) => lengthVal.textContent = e.target.value);
    }

    function generatePassword() {
        const length = parseInt(genLength.value);
        let chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        if (genNumbers.checked) chars += "0123456789";
        if (genSymbols.checked) chars += "!@#$%^&*()_+-=[]{}|;:,.<>?";

        let password = "";
        for (let i = 0; i < length; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        genPasswordOutput.value = password;
    }

    if (generatePassBtn) {
        generatePassBtn.addEventListener('click', generatePassword);
        generatePassword(); // Generar una por defecto al cargar
    }

    if (copyGenPass) {
        copyGenPass.addEventListener('click', () => {
            if (!genPasswordOutput.value) return;
            navigator.clipboard.writeText(genPasswordOutput.value);
            copyGenPass.textContent = "¡Copiado!";
            setTimeout(() => copyGenPass.textContent = "Copiar", 1500);
        });
    }

    /* ======================================================
       7. NUEVA FUNCIONALIDAD: VALIDADOR DE CONTRASEÑAS
       ====================================================== */
    const valPasswordInput = document.getElementById('valPasswordInput');
    const valStrengthBar = document.getElementById('valStrengthBar');
    const valStrengthText = document.getElementById('valStrengthText');

    if (valPasswordInput) {
        valPasswordInput.addEventListener('input', () => {
            const pass = valPasswordInput.value;
            if (!pass) {
                valStrengthBar.style.width = '0%';
                valStrengthBar.className = 'h-full transition-all duration-300 bg-red-500';
                valStrengthText.textContent = "Ingresa una clave para evaluar su seguridad.";
                return;
            }

            let score = 0;
            if (pass.length >= 8) score++;
            if (pass.length >= 12) score++;
            if (/[0-9]/.test(pass)) score++;
            if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
            if (/[^A-Za-z0-9]/.test(pass)) score++;

            if (score <= 2) {
                valStrengthBar.style.width = '33%';
                valStrengthBar.className = 'h-full transition-all duration-300 bg-red-500';
                valStrengthText.textContent = "⚠️ Contraseña Débil (Fácil de adivinar o romper por fuerza bruta).";
            } else if (score <= 4) {
                valStrengthBar.style.width = '66%';
                valStrengthBar.className = 'h-full transition-all duration-300 bg-yellow-500';
                valStrengthText.textContent = "⚡ Contraseña Moderada (Se recomienda agregar símbolos o más longitud).";
            } else {
                valStrengthBar.style.width = '100%';
                valStrengthBar.className = 'h-full transition-all duration-300 bg-green-500';
                valStrengthText.textContent = "🔒 Contraseña Fuerte y Segura.";
            }
        });
    }

    function switchTab(activeKey) {
        Object.keys(tabs).forEach(key => {
            if (tabs[key].btn && tabs[key].content) {
                if (key === activeKey) {
                    tabs[key].btn.classList.add('active');
                    tabs[key].content.classList.remove('hidden');
                } else {
                    tabs[key].btn.classList.remove('active');
                    tabs[key].content.classList.add('hidden');
                }
            }
        });

        // Ocultar el cuadro de resultados global si no estás en URL o Archivo
        const resultsWrapper = document.getElementById('globalScanResultsWrapper');
        if (resultsWrapper) {
            if (activeKey === 'url' || activeKey === 'file') {
                resultsWrapper.classList.remove('hidden');
            } else {
                resultsWrapper.classList.add('hidden');
            }
        }

        // Si entra a historial, renderizarlo dinámicamente
        if (activeKey === 'history') renderHistory();
    }

});