import { jsonContentType, contentTypeHeaderKey, apiKeyHeaderKey } from "../constants/octoprint-service.constants";
import { ValidationException } from "../../../exceptions/runtime.exceptions";

/**
 *
 * @param {LoginDto} login
 * @returns {{apiKey, printerURL}}
 */
export function validateLogin(login) {
  if (!login.apiKey || !login.printerURL) {
    throw new ValidationException("printer apiKey or printerURL undefined");
  }

  return {
    apiKey: login.apiKey,
    printerURL: login.printerURL,
  };
}

export function constructHeaders(apiKey, contentType = jsonContentType) {
  return {
    [contentTypeHeaderKey]: contentType, // Can be overwritten without problem
    [apiKeyHeaderKey]: apiKey,
  };
}

/**
 * Process an Axios response (default)
 * @param response
 * @param options
 * @returns {{data, status}|*}
 */
export function processResponse(response, options = { unwrap: true }) {
  if (options.unwrap) {
    return response?.data;
  }
  if (options.simple) {
    return { status: response.status, data: response.data };
  }
  return response;
}

/**
 * Process a Got based request
 * @param response
 * @param options
 * @returns {{data, status}|*}
 */
export async function processGotResponse(response, options = { unwrap: true }) {
  if (options.unwrap) {
    return JSON.parse(response.body);
  }
  if (options.simple) {
    const data = JSON.parse(response.body);
    return { status: response.statusCode, data };
  }
  return response;
}