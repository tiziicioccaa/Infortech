const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());

const apiKey = process.env.VIRUSTOTAL_API_KEY;

if (!apiKey) {
    console.error('¡ERROR CRÍTICO! La variable VIRUSTOTAL_API_KEY no está configurada.');
    process.exit(1); 
}

app.get('/analizar', async (req, res) => {
    const urlToAnalyze = req.query.url;

    if (!urlToAnalyze) {
        return res.status(400).json({ error: 'Falta el parámetro "url" en la petición.' });
    }

    console.log(`Recibida petición para analizar: ${urlToAnalyze}`);

    try {
        const urlId = Buffer.from(urlToAnalyze)
                            .toString('base64')
                            .replace(/=/g, '');

        const vtApiUrl = `https://www.virustotal.com/api/v3/urls/${urlId}`;
        
        const options = {
            method: 'GET',
            headers: {
                'x-apikey': apiKey
            }
        };

        const response = await fetch(vtApiUrl, options);
        const data = await response.json();

        if (!response.ok) {
            if (response.status === 404) {
                console.log(`URL no encontrada en VT: ${urlToAnalyze}`);
                return res.json({ 
                    status: 'NoEncontrado', 
                    message: 'Esta URL nunca ha sido analizada por VirusTotal.' 
                });
            } else {
                console.error('Error de la API de VirusTotal:', data);
                return res.status(response.status).json({ error: 'Error al consultar la API de VirusTotal.' });
            }
        }

        const stats = data.data.attributes.last_analysis_stats;
        const maliciousCount = stats.malicious;
        const suspiciousCount = stats.suspicious;
        const harmlessCount = stats.harmless;

        console.log(`Reporte encontrado: M:${maliciousCount}, S:${suspiciousCount}, H:${harmlessCount}`);

        res.json({
            status: 'Encontrado',
            stats: stats,
            isMalicious: (maliciousCount > 0 || suspiciousCount > 0)
        });

    } catch (error) {
        console.error('Error interno en el servidor:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor de análisis escuchando en el puerto ${PORT}`);
});
