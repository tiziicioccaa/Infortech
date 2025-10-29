// --- 1. Importar las librerías ---
// 'express' es para crear el servidor web
// 'cors' es para permitir que tu página de GitHub se conecte a este servidor
// 'node-fetch' es para llamar a la API de VirusTotal
const express = require('express');
const cors = require('cors');
// Usamos la v2 de node-fetch que funciona con 'require'
const fetch = require('node-fetch');

// --- 2. Configuración inicial ---
const app = express();
// Usar cors para permitir peticiones desde cualquier origen (ej. tu github.io)
app.use(cors());

// --- 3. Obtener la API Key ---
// Lee la variable de entorno que configuraste en Render
const apiKey = process.env.VIRUSTOTAL_API_KEY;

// Si la API key no está, el servidor no puede funcionar.
if (!apiKey) {
    console.error('¡ERROR CRÍTICO! La variable VIRUSTOTAL_API_KEY no está configurada.');
    // Detiene el proceso si falta la key
    process.exit(1); 
}

// --- 4. Definir el Endpoint de Análisis ---
// Creamos una ruta en nuestro servidor: /analizar
// Tu frontend llamará a: https://mi-backend.onrender.com/analizar?url=LA_URL_A_ANALIZAR
app.get('/analizar', async (req, res) => {
    
    // Obtenemos la URL que el usuario quiere analizar desde los parámetros
    const urlToAnalyze = req.query.url;

    // Si no nos pasaron una 'url', devolvemos un error
    if (!urlToAnalyze) {
        return res.status(400).json({ error: 'Falta el parámetro "url" en la petición.' });
    }

    // Imprime en la consola de Render (para debugging)
    console.log(`Recibida petición para analizar: ${urlToAnalyze}`);

    try {
        // --- Paso A: Preparar la URL para VirusTotal ---
        // La API de VirusTotal (v3) para obtener reportes de URLs no usa la URL
        // directamente, sino un ID que es la URL codificada en Base64,
        // sin los caracteres '=' del final.
        const urlId = Buffer.from(urlToAnalyze)
                            .toString('base64')
                            .replace(/=/g, ''); // Quitar el padding '='

        // --- Paso B: Llamar a la API de VirusTotal ---
        const vtApiUrl = `https://www.virustotal.com/api/v3/urls/${urlId}`;
        
        const options = {
            method: 'GET',
            headers: {
                'x-apikey': apiKey  // ¡Usamos la key secreta aquí!
            }
        };

        const response = await fetch(vtApiUrl, options);
        const data = await response.json();

        // --- Paso C: Interpretar la respuesta ---
        
        // Si VirusTotal devuelve un error (ej. 404 No Encontrado)
        if (!response.ok) {
            if (response.status === 404) {
                // Esto es normal, significa que VT nunca ha visto esta URL
                console.log(`URL no encontrada en VT: ${urlToAnalyze}`);
                return res.json({ 
                    status: 'NoEncontrado', 
                    message: 'Esta URL nunca ha sido analizada por VirusTotal.' 
                });
            } else {
                // Otro tipo de error de la API
                console.error('Error de la API de VirusTotal:', data);
                return res.status(response.status).json({ error: 'Error al consultar la API de VirusTotal.' });
            }
        }

        // ¡Éxito! Tenemos un reporte. Extraemos las estadísticas.
        const stats = data.data.attributes.last_analysis_stats;
        const maliciousCount = stats.malicious;
        const suspiciousCount = stats.suspicious;
        const harmlessCount = stats.harmless;

        console.log(`Reporte encontrado: M:${maliciousCount}, S:${suspiciousCount}, H:${harmlessCount}`);

        // --- Paso D: Enviar la respuesta final al frontend ---
        res.json({
            status: 'Encontrado',
            stats: stats,
            // Devolvemos un booleano simple para tu frontend
            isMalicious: (maliciousCount > 0 || suspiciousCount > 0)
        });

    } catch (error) {
        // Error general del servidor (ej. se cayó la red)
        console.error('Error interno en el servidor:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// --- 5. Iniciar el Servidor ---
// Render nos da un puerto a través de la variable 'process.env.PORT'
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor de análisis escuchando en el puerto ${PORT}`);
});


