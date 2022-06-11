// @ts-check

import "source-map-support/register";
import {https, logger, Response} from "firebase-functions";
import {initializeApp} from "firebase-admin";
import {FieldValue, getFirestore} from "firebase-admin/firestore";

/**
 * @typedef {{
 *   amount: number;
 *   currency: "USD" | "RUB";
 * }} Money
 */

/**
 * @typedef {{
 *   name: string;
 *   price: Money;
 * }} NewProduct
 */

initializeApp();

export const addProduct = https.onRequest(addProductHandler);

/**
 * @param {https.Request} request
 * @param {Response} response
 * @returns {Promise<void>}
 */
async function addProductHandler(request, response) {
  const newProduct = /** @type {NewProduct} */ (request.body);
  logger.info("Adding product.", {product: newProduct});
  const productId = await _addProduct(newProduct);
  logger.info("1 + 2 =", add(1, 2));
  response.json({productId}).end();
}

/**
 * @param {NewProduct} newProduct
 * @returns {Promise<string>}
 */
async function _addProduct(newProduct) {
  const ref = await getFirestore()
    .collection("products")
    .add(
      addCreatedAtField({
        ...newProduct,
      })
    );
  return ref.id;
}

/**
 * @template {{
 *   [k: string]: unknown;
 * }} T
 * @param {T} something
 * @returns {T & {
 *   createdAt: FieldValue;
 * }}
 */
function addCreatedAtField(something) {
  return {
    ...something,
    createdAt: FieldValue.serverTimestamp(),
  };
}

/**
 * @deprecated
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
function add(a, b) {
  return a + b;
}
