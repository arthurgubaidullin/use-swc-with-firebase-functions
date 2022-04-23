import {https, logger} from "firebase-functions";
import "source-map-support/register";

// Create and Deploy Your First Cloud Functions
// https://firebase.google.com/docs/functions/write-firebase-functions

export const helloWorld = https.onRequest((request, response) => {
  logger.info("Hello logs!", {structuredData: true, computed: 50 + 50});
  response.send("Hello from Firebase!");
});
