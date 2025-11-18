const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const multer = require('multer');
const FormData = require('form-data');

const app = express();
app.use(cors());

// Configuración de Multer para recibir archivos en memoria
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } }); // 25MB límite

const apiKey = process.env.VIRUSTOTAL_API_KEY;

if (!apiKey) {
    console.error('¡ERROR CRÍTICO! La variable VIRUSTOTAL_API_KEY no está configurada.');
    process.exit(1);
}

// --- ENDPOINT 1: ANALIZAR URL ---
app.get('/analizar', async (req, res) => {
    const urlToAnalyze = req.query.url;
    if (!urlToAnalyze) return res.status(400).json({ error: 'Falta la URL' });

    console.log(`Analizando URL: ${urlToAnalyze}`);

    try {
        const urlId = Buffer.from(urlToAnalyze).toString('base64').replace(/=/g, '');
        const vtApiUrl = `https://www.virustotal.com/api/v3/urls/${urlId}`;

        const response = await fetch(vtApiUrl, {
            method: 'GET',
            headers: { 'x-apikey': apiKey }
        });

        if (!response.ok) {
            if (response.status === 404) return res.json({ status: 'NoEncontrado', message: 'URL no analizada previamente.' });
            return res.status(response.status).json({ error: 'Error en API VirusTotal' });
        }

        const data = await response.json();
        const attributes = data.data.attributes;

        // Enviamos stats Y results (el desglose)
        res.json({
            status: 'Encontrado',
            stats: attributes.last_analysis_stats,
            results: attributes.last_analysis_results, // <--- ¡ESTO ES LO NUEVO!
            meta: { 
                title: attributes.title,
                url: attributes.url 
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// --- ENDPOINT 2: ANALIZAR ARCHIVO ---
app.post('/analizar-archivo', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo' });

    console.log(`Recibiendo archivo: ${req.file.originalname}`);

    try {
        const formData = new FormData();
        formData.append('file', req.file.buffer, req.file.originalname);

        // 1. Subir archivo a VT
        const uploadResp = await fetch('https://www.virustotal.com/api/v3/files', {
            method: 'POST',
            headers: { 'x-apikey': apiKey, ...formData.getHeaders() },
            body: formData
        });

        if (!uploadResp.ok) return res.status(uploadResp.status).json({ error: 'Error al subir a VT' });
        
        const uploadData = await uploadResp.json();
        const analysisId = uploadData.data.id;

        // 2. Esperar el reporte (Polling simple) - Esperamos 5 segundos antes de preguntar
        // Nota: En producción real esto debería ser más robusto
        await new Promise(resolve => setTimeout(resolve, 5000));

        // 3. Consultar el análisis
        const analysisResp = await fetch(`https://www.virustotal.com/api/v3/analyses/${analysisId}`, {
             headers: { 'x-apikey': apiKey }
        });
        
        const analysisData = await analysisResp.json();
        const attributes = analysisData.data.attributes;

        res.json({
            status: 'Encontrado',
            stats: attributes.stats,
            results: attributes.results, // <--- ¡ESTO ES LO NUEVO!
            meta: {
                file_info: analysisData.meta.file_info || { sha256: 'Desconocido' }
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error procesando archivo' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor escuchando en puerto ${PORT}`));
