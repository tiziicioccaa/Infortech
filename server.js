
// 'express' es para crear el servidor web
// 'cors' es para permitir que tu página de GitHub se conecte a este servidor
// 'node-fetch' es para llamar a la API de VirusTotal
const express = require('express');
const cors = require('cors');
// Usamos la v2 de node-fetch que funciona con 'require'
const fetch = require('node-fetch');


const app = express();
// Usar cors para permitir peticiones desde cualquier origen (ej. tu github.io)
app.use(cors());

// Lee la variable de entorno que configuraste en Render
const apiKey = process.env.VIRUSTOTAL_API_KEY;

// Si la API key no está, el servidor no puede funcionar.
if (!apiKey) {
    console.error('¡ERROR CRÍTICO! La variable VIRUSTOTAL_API_KEY no está configurada.');
    // para todo si no esta la API KEY
    process.exit(1); 
}

// --- 4. Definir el Endpoint de Análisis ---
// Creamos una ruta en nuestro servidor: /analizar
// el frontend llamará a: https://mi-backend.onrender.com/analizar?url=LA_URL_A_ANALIZAR
app.get('/analizar', async (req, res) => {
    
    // Obtenemos la URL que el usuario quiere analizar desde los parámetros
    const urlToAnalyze = req.query.url;

    // Si no nos pasaron una 'url', devolvemos un error
    if (!urlToAnalyze) {
        return res.status(400).json({ error: 'Falta el parámetro "url" en la petición.' });
    }


    console.log(`Recibida petición para analizar: ${urlToAnalyze}`);

    try {        // La API de VirusTotal (v3) para obtener reportes de URLs no usa la URL
        // directamente, sino un ID que es la URL codificada en Base64,
        // sin los caracteres '=' del final.
        const urlId = Buffer.from(urlToAnalyze)
                            .toString('base64')
                            .replace(/=/g, ''); 

        // llama a la API de VirusTotal
        const vtApiUrl = `https://www.virustotal.com/api/v3/urls/${urlId}`;
        
        const options = {
            method: 'GET',
            headers: {
                'x-apikey': apiKey  // aPI TOKEN
            }
        };

        const response = await fetch(vtApiUrl, options);
        const data = await response.json();

        //  Interpretacion la respuesta
        
        // Si VirusTotal devuelve un error (404 No Encontrado)
        if (!response.ok) {
            if (response.status === 404) {
                // la APi no reconoce o conoce a la URL
                console.log(`URL no encontrada en VT: ${urlToAnalyze}`);
                return res.json({ 
                    status: 'NoEncontrado', 
                    message: 'Esta URL nunca ha sido analizada por VirusTotal.' 
                });
            } else {
                // otro error en la API
                console.error('Error de la API de VirusTotal:', data);
                return res.status(response.status).json({ error: 'Error al consultar la API de VirusTotal.' });
            }
        }

        // Consigue informe,devuelve las caracteristicas
        const stats = data.data.attributes.last_analysis_stats;
        const maliciousCount = stats.malicious;
        const suspiciousCount = stats.suspicious;
        const harmlessCount = stats.harmless;

        console.log(`Reporte encontrado: M:${maliciousCount}, S:${suspiciousCount}, H:${harmlessCount}`);

    //Envia la respuesta al server
        res.json({
            status: 'Encontrado',
            stats: stats,

            isMalicious: (maliciousCount > 0 || suspiciousCount > 0)
        });

    } catch (error) {
        // Errores general del serviddor (que se caiga el server.)
        console.error('Error interno en el servidor:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

//  inicia el servidor
// render brinda un puerto process.env.PORT '
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor de análisis escuchando en el puerto ${PORT}`);
});


