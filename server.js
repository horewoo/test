const express = require('express');
const admin = require('firebase-admin');
const Twit = require('twit');

const app = express();
const port = 3000;

// Inicializa Firebase Admin SDK con tus credenciales
const serviceAccount = require('../firebase/serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://furrtown-06660.firebaseio.com',
});

const twitterConfig = {
  consumer_key: 'RbzO3PLo0c95v0Oer3zdQgmAD',
  consumer_secret: 'u2nSPJ4kQdbzQLNWuF2FkSY9rqgD8ofKzgaiJ7Zg0xHafq2ZMm',
};

const twitter = new Twit(twitterConfig);

// Ruta para iniciar sesión con Twitter
app.get('/auth/twitter', async (req, res) => {
  try {
    // Realiza la autenticación con Twitter
    const requestToken = await twitter.post('oauth/request_token', { oauth_callback: 'http://localhost:3000/auth/twitter/callback' });

    // Almacena el token de solicitud en Firebase para que esté disponible para el cliente
    await admin.database().ref('/twitter_request_token').set(requestToken.data.oauth_token);

    // Redirige al usuario a la URL de autenticación de Twitter
    res.redirect(`https://api.twitter.com/oauth/authenticate?oauth_token=${requestToken.data.oauth_token}`);
  } catch (error) {
    console.error('Error en la autenticación de Twitter:', error);
    res.status(500).send('Error en la autenticación de Twitter');
  }
});

// Ruta de retorno después de la autenticación con Twitter
app.get('/auth/twitter/callback', async (req, res) => {
  try {
    const { oauth_token, oauth_verifier } = req.query;

    // Intercambia el token de solicitud por un token de acceso
    const accessToken = await twitter.post('oauth/access_token', { oauth_token, oauth_verifier });

    // Obtiene el token de solicitud almacenado previamente
    const storedRequestToken = await admin.database().ref('/twitter_request_token').once('value');
    const storedToken = storedRequestToken.val();

    // Elimina el token de solicitud almacenado
    await admin.database().ref('/twitter_request_token').remove();

    // Crea un usuario personalizado en Firebase Authentication
    const customToken = await admin.auth().createCustomToken(storedToken);

    // Redirige al cliente con el token personalizado
    res.redirect(`http://localhost:3000?token=${customToken}`);
  } catch (error) {
    console.error('Error en la autenticación de Twitter:', error);
    res.status(500).send('Error en la autenticación de Twitter');
  }
});

// Inicia el servidor
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});