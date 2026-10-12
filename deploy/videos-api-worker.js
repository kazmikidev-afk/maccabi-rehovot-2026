var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../node_modules/jose/dist/webapi/lib/buffer_utils.js
var encoder = new TextEncoder();
var decoder = new TextDecoder();
var strictDecoder = new TextDecoder("utf-8", { fatal: true });
var MAX_INT32 = 2 ** 32;
function concat(...buffers) {
  const size = buffers.reduce((acc, { length }) => acc + length, 0), buf = new Uint8Array(size);
  let i = 0;
  for (const buffer of buffers)
    buf.set(buffer, i), i += buffer.length;
  return buf;
}
__name(concat, "concat");
var NON_ASCII = /[^\x00-\x7f]/;
function encode(string) {
  if (typeof string == "string" && string.length >= 128) {
    if (NON_ASCII.test(string))
      throw new TypeError("non-ASCII string encountered in encode()");
    return encoder.encode(string);
  }
  const bytes = new Uint8Array(string.length);
  for (let i = 0; i < string.length; i++) {
    const code = string.charCodeAt(i);
    if (code > 127)
      throw new TypeError("non-ASCII string encountered in encode()");
    bytes[i] = code;
  }
  return bytes;
}
__name(encode, "encode");
function decodeBase64(encoded, url = false) {
  if (Uint8Array.fromBase64)
    return Uint8Array.fromBase64(encoded, { alphabet: url ? "base64url" : "base64" });
  if (url) {
    if (encoded.includes("+") || encoded.includes("/"))
      throw new TypeError("Invalid base64url");
    encoded = encoded.replace(/-/g, "+").replace(/_/g, "/");
  }
  const binary = atob(encoded), bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++)
    bytes[i] = binary.charCodeAt(i);
  return bytes;
}
__name(decodeBase64, "decodeBase64");

// ../node_modules/jose/dist/webapi/util/errors.js
var JOSEError = class extends Error {
  static {
    __name(this, "JOSEError");
  }
  static code = "ERR_JOSE_GENERIC";
  code = "ERR_JOSE_GENERIC";
  constructor(message2, options) {
    super(message2, options), this.name = this.constructor.name, Error.captureStackTrace?.(this, this.constructor);
  }
};
var JWTClaimValidationFailed = class extends JOSEError {
  static {
    __name(this, "JWTClaimValidationFailed");
  }
  static code = "ERR_JWT_CLAIM_VALIDATION_FAILED";
  code = "ERR_JWT_CLAIM_VALIDATION_FAILED";
  claim;
  reason;
  payload;
  constructor(message2, payload, claim = "unspecified", reason = "unspecified") {
    super(message2, { cause: { claim, reason, payload } }), this.claim = claim, this.reason = reason, this.payload = payload;
  }
};
var JWTExpired = class extends JOSEError {
  static {
    __name(this, "JWTExpired");
  }
  static code = "ERR_JWT_EXPIRED";
  code = "ERR_JWT_EXPIRED";
  claim;
  reason;
  payload;
  constructor(message2, payload, claim = "unspecified", reason = "unspecified") {
    super(message2, { cause: { claim, reason, payload } }), this.claim = claim, this.reason = reason, this.payload = payload;
  }
};
var JOSEAlgNotAllowed = class extends JOSEError {
  static {
    __name(this, "JOSEAlgNotAllowed");
  }
  static code = "ERR_JOSE_ALG_NOT_ALLOWED";
  code = "ERR_JOSE_ALG_NOT_ALLOWED";
};
var JOSENotSupported = class extends JOSEError {
  static {
    __name(this, "JOSENotSupported");
  }
  static code = "ERR_JOSE_NOT_SUPPORTED";
  code = "ERR_JOSE_NOT_SUPPORTED";
};
var JWSInvalid = class extends JOSEError {
  static {
    __name(this, "JWSInvalid");
  }
  static code = "ERR_JWS_INVALID";
  code = "ERR_JWS_INVALID";
};
var JWTInvalid = class extends JOSEError {
  static {
    __name(this, "JWTInvalid");
  }
  static code = "ERR_JWT_INVALID";
  code = "ERR_JWT_INVALID";
};
var JWKSInvalid = class extends JOSEError {
  static {
    __name(this, "JWKSInvalid");
  }
  static code = "ERR_JWKS_INVALID";
  code = "ERR_JWKS_INVALID";
};
var JWKSNoMatchingKey = class extends JOSEError {
  static {
    __name(this, "JWKSNoMatchingKey");
  }
  static code = "ERR_JWKS_NO_MATCHING_KEY";
  code = "ERR_JWKS_NO_MATCHING_KEY";
  constructor(message2 = "no applicable key found in the JSON Web Key Set", options) {
    super(message2, options);
  }
};
var JWKSMultipleMatchingKeys = class extends JOSEError {
  static {
    __name(this, "JWKSMultipleMatchingKeys");
  }
  [Symbol.asyncIterator] = async function* () {
  };
  static code = "ERR_JWKS_MULTIPLE_MATCHING_KEYS";
  code = "ERR_JWKS_MULTIPLE_MATCHING_KEYS";
  constructor(message2 = "multiple matching keys found in the JSON Web Key Set", options) {
    super(message2, options);
  }
};
var JWKSTimeout = class extends JOSEError {
  static {
    __name(this, "JWKSTimeout");
  }
  static code = "ERR_JWKS_TIMEOUT";
  code = "ERR_JWKS_TIMEOUT";
  constructor(message2 = "request timed out", options) {
    super(message2, options);
  }
};
var JWSSignatureVerificationFailed = class extends JOSEError {
  static {
    __name(this, "JWSSignatureVerificationFailed");
  }
  static code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";
  code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";
  constructor(message2 = "signature verification failed", options) {
    super(message2, options);
  }
};

// ../node_modules/jose/dist/webapi/util/base64url.js
var invalid = "The input to be decoded is not correctly encoded.";
function decode(input) {
  try {
    return decodeBase64(typeof input == "string" ? input : decoder.decode(input), true);
  } catch (cause) {
    throw new TypeError(invalid, { cause });
  }
}
__name(decode, "decode");

// ../node_modules/jose/dist/webapi/lib/validate.js
function isObject(input) {
  if (typeof input != "object" || input === null || Object.prototype.toString.call(input) !== "[object Object]")
    return false;
  const prototype = Object.getPrototypeOf(input);
  return prototype === null || Object.getPrototypeOf(prototype) === null;
}
__name(isObject, "isObject");
function isJwkSet(input) {
  return isObject(input) && Array.isArray(input.keys) && Array.from(input.keys).every(isObject);
}
__name(isJwkSet, "isJwkSet");
function isDisjoint(...headers) {
  const parameters = /* @__PURE__ */ new Set();
  for (const header of headers)
    if (header)
      for (const parameter of Object.keys(header)) {
        if (parameters.has(parameter))
          return false;
        parameters.add(parameter);
      }
  return true;
}
__name(isDisjoint, "isDisjoint");
function decodeBase64url(value, label, ErrorClass) {
  try {
    return decode(value);
  } catch {
    throw new ErrorClass(`Failed to base64url decode the ${label}`);
  }
}
__name(decodeBase64url, "decodeBase64url");
function encodeBase64url(value, label, ErrorClass) {
  try {
    return encode(value);
  } catch {
    throw new ErrorClass(`The ${label} is not a valid base64url string`);
  }
}
__name(encodeBase64url, "encodeBase64url");
function parseJoseHeader(b64, ErrorClass, message2) {
  let parsed;
  try {
    parsed = JSON.parse(strictDecoder.decode(decode(b64)));
  } catch {
    throw new ErrorClass(message2);
  }
  if (!isObject(parsed))
    throw new ErrorClass(message2);
  return parsed;
}
__name(parseJoseHeader, "parseJoseHeader");
var JWS_RECOGNIZED = { __proto__: null, b64: true };
function validateAlgorithms(option, algorithms) {
  if (algorithms !== void 0 && (!Array.isArray(algorithms) || algorithms.some((s) => typeof s != "string")))
    throw new TypeError(`"${option}" option must be an array of strings`);
  return algorithms === void 0 ? void 0 : new Set(algorithms);
}
__name(validateAlgorithms, "validateAlgorithms");
function validateCrit(Err, recognizedDefault, recognizedOption, protectedHeader, joseHeader) {
  if (joseHeader.crit !== void 0 && protectedHeader?.crit === void 0)
    throw new Err('"crit" (Critical) Header Parameter MUST be integrity protected');
  if (!protectedHeader || protectedHeader.crit === void 0)
    return [];
  if (!Array.isArray(protectedHeader.crit) || protectedHeader.crit.length === 0 || protectedHeader.crit.some((input) => typeof input != "string" || input.length === 0))
    throw new Err('"crit" (Critical) Header Parameter MUST be an array of non-empty strings when present');
  const recognized = recognizedOption === void 0 ? recognizedDefault : { __proto__: null, ...recognizedOption, ...recognizedDefault };
  for (const parameter of protectedHeader.crit) {
    if (!(parameter in recognized))
      throw new JOSENotSupported(`Extension Header Parameter "${parameter}" is not recognized`);
    if (!Object.hasOwn(joseHeader, parameter) || joseHeader[parameter] === void 0)
      throw new Err(`Extension Header Parameter "${parameter}" is missing`);
    if (recognized[parameter] && (!Object.hasOwn(protectedHeader, parameter) || protectedHeader[parameter] === void 0))
      throw new Err(`Extension Header Parameter "${parameter}" MUST be integrity protected`);
  }
  return protectedHeader.crit;
}
__name(validateCrit, "validateCrit");
function validateB64(protectedHeader, extensions) {
  if (extensions.includes("b64")) {
    const b64 = protectedHeader.b64;
    if (typeof b64 != "boolean")
      throw new JWSInvalid('The "b64" (base64url-encode payload) Header Parameter must be a boolean');
    return b64;
  }
  return true;
}
__name(validateB64, "validateB64");

// ../node_modules/jose/dist/webapi/lib/key.js
var tag = /* @__PURE__ */ __name((key) => key[Symbol.toStringTag], "tag");
var jwkMatchesOp = /* @__PURE__ */ __name((entry, key, usage) => {
  const { alg } = entry;
  if (key.use !== void 0) {
    const expected = usage === "sign" || usage === "verify" ? "sig" : "enc";
    if (key.use !== expected)
      throw new TypeError(`Invalid key for this operation, its "use" must be "${expected}" when present`);
  }
  if (key.alg !== void 0 && key.alg !== alg)
    throw new TypeError(`Invalid key for this operation, its "alg" must be "${alg}" when present`);
  if (Array.isArray(key.key_ops)) {
    const expectedKeyOp = usage === "encrypt" || usage === "decrypt" ? entry.ops?.[usage === "encrypt" ? 0 : 1] : usage;
    if (expectedKeyOp && !key.key_ops.includes(expectedKeyOp))
      throw new TypeError(`Invalid key for this operation, its "key_ops" must include "${expectedKeyOp}" when present`);
  }
}, "jwkMatchesOp");
async function prepareKey(entry, key, usage) {
  const { alg, secret } = entry, privateKey = usage === "decrypt" || usage === "sign";
  if (secret && key instanceof Uint8Array)
    return key;
  let normalized, keyObject;
  if (isObject(key)) {
    if (normalized = normalizeJwk(key), typeof normalized.kty != "string")
      throw invalidKeyType(alg, key, secret);
    if (!(secret ? normalized.kty === "oct" && typeof normalized.k == "string" : normalized.kty !== "oct" && (privateKey ? normalized.kty === "AKP" && typeof normalized.priv == "string" || typeof normalized.d == "string" : normalized.d === void 0 && normalized.priv === void 0)))
      throw new TypeError(secret ? 'JSON Web Key for symmetric algorithms must have JWK "kty" (Key Type) equal to "oct" and the JWK "k" (Key Value) present' : `JSON Web Key for this operation must be a ${privateKey ? "private" : "public"} JWK`);
    if (jwkMatchesOp(entry, normalized, usage), normalized.kty === "oct")
      return decode(normalized.k);
    if (!Object.isFrozen(key)) {
      const { key_ops } = key;
      Array.isArray(key_ops) && Object.freeze(key_ops), Object.freeze(key);
    }
  } else {
    if (!isKeyLike(key))
      throw invalidKeyType(alg, key, secret);
    const expectedType = secret ? "secret" : privateKey ? "private" : "public";
    if (key.type !== expectedType && (secret || ["secret", "public", "private"].includes(key.type)))
      throw new TypeError(`${tag(key)} instances must be of type "${expectedType}" for the ${alg} algorithm`);
    if (isCryptoKey(key))
      return key;
    if (keyObject = key, keyObject.type === "secret")
      return keyObject.export();
  }
  cache ||= /* @__PURE__ */ new WeakMap();
  const cacheKey = key;
  let cached = cache.get(cacheKey);
  if (cached?.[alg])
    return cached[alg];
  if (cached || cache.set(cacheKey, cached = {}), keyObject && typeof keyObject.toCryptoKey == "function") {
    const isPublic = keyObject.type === "public", crv = nist[keyObject.asymmetricKeyDetails?.namedCurve], params = entry.resolve?.({ crv, asymmetricKeyType: keyObject.asymmetricKeyType }) ?? entry.subtle;
    return cached[alg] = keyObject.toCryptoKey(params, isPublic, entry.usages[isPublic ? 0 : 1]);
  }
  return normalized ??= keyObject.export({ format: "jwk" }), normalized.alg = alg, cached[alg] = await jwkToKey(entry, normalized);
}
__name(prepareKey, "prepareKey");
var cache;
var nist = {
  __proto__: null,
  prime256v1: "P-256",
  secp384r1: "P-384",
  secp521r1: "P-521"
};
var isCryptoKey = /* @__PURE__ */ __name((key) => {
  if (key?.[Symbol.toStringTag] === "CryptoKey")
    return true;
  try {
    return key instanceof CryptoKey;
  } catch {
    return false;
  }
}, "isCryptoKey");
var isKeyObject = /* @__PURE__ */ __name((key) => key?.[Symbol.toStringTag] === "KeyObject", "isKeyObject");
var isKeyLike = /* @__PURE__ */ __name((key) => isCryptoKey(key) || isKeyObject(key), "isKeyLike");
function message(msg, actual, ...types) {
  if (types.length > 2) {
    const last = types.pop();
    msg += `one of type ${types.join(", ")}, or ${last}.`;
  } else types.length === 2 ? msg += `one of type ${types[0]} or ${types[1]}.` : msg += `of type ${types[0]}.`;
  return actual == null ? msg += ` Received ${actual}` : typeof actual == "function" && actual.name ? msg += ` Received function ${actual.name}` : typeof actual == "object" && actual != null && actual.constructor?.name && (msg += ` Received an instance of ${actual.constructor.name}`), msg;
}
__name(message, "message");
function invalidKeyType(alg, actual, secret) {
  const types = ["CryptoKey", "KeyObject", "JSON Web Key"];
  return secret && types.push("Uint8Array"), new TypeError(message(`Key for the ${alg} algorithm must be `, actual, ...types));
}
__name(invalidKeyType, "invalidKeyType");
var unusable = /* @__PURE__ */ __name((name, prop = "algorithm.name") => new TypeError(`CryptoKey does not support this operation, its ${prop} must be ${name}`), "unusable");
function checkUsage(key, usage) {
  if (usage && !key.usages.includes(usage))
    throw new TypeError(`CryptoKey does not support this operation, its usages must include ${usage}.`);
}
__name(checkUsage, "checkUsage");
function checkModulusLength(alg, key) {
  const { modulusLength } = key.algorithm;
  if (typeof modulusLength != "number" || modulusLength < 2048)
    throw new TypeError(`${alg} requires key modulusLength to be 2048 bits or larger`);
}
__name(checkModulusLength, "checkModulusLength");
function checkCryptoKey(key, expected, usage) {
  const algorithm = key.algorithm;
  if (algorithm.name !== expected.name)
    throw unusable(expected.name);
  if (expected.hash && algorithm.hash?.name !== expected.hash)
    throw unusable(expected.hash, "algorithm.hash");
  if (expected.namedCurve && algorithm.namedCurve !== expected.namedCurve)
    throw unusable(expected.namedCurve, "algorithm.namedCurve");
  if (expected.length !== void 0 && algorithm.length !== expected.length)
    throw unusable(expected.length, "algorithm.length");
  checkUsage(key, usage);
}
__name(checkCryptoKey, "checkCryptoKey");
function snapshotJwk(jwk) {
  return { __proto__: null, ...jwk };
}
__name(snapshotJwk, "snapshotJwk");
function normalizeJwk(jwk) {
  const normalized = snapshotJwk(jwk);
  if (normalized.ext !== void 0 && typeof normalized.ext != "boolean")
    throw new TypeError('"ext" (Extractable) Parameter must be a boolean');
  if (normalized.key_ops !== void 0) {
    const value = normalized.key_ops, keyOps = Array.isArray(value) ? [...value] : void 0;
    if (!keyOps || keyOps.some((operation) => typeof operation != "string") || new Set(keyOps).size !== keyOps.length)
      throw new TypeError('"key_ops" (Key Operations) Parameter must be an array of unique strings');
    normalized.key_ops = keyOps;
  }
  return normalized;
}
__name(normalizeJwk, "normalizeJwk");
async function jwkToKey(entry, jwk, extractable) {
  if (!entry.kty.includes(jwk.kty))
    throw new JOSENotSupported('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
  const algorithm = entry.resolve?.({ kty: jwk.kty, crv: jwk.crv }) ?? entry.subtle, isPrivate = !!(jwk.d || jwk.priv), keyData = { ...jwk, ext: extractable ?? jwk.ext };
  return keyData.kty !== "AKP" && delete keyData.alg, delete keyData.use, crypto.subtle.importKey("jwk", keyData, algorithm, keyData.ext ?? !isPrivate, jwk.key_ops ?? entry.usages[isPrivate ? 1 : 0]);
}
__name(jwkToKey, "jwkToKey");
async function rawKey(key, expected, usage, extractable = false) {
  return key instanceof Uint8Array && (key = await crypto.subtle.importKey("raw", key, expected, extractable, [usage])), checkCryptoKey(key, expected, usage), key;
}
__name(rawKey, "rawKey");

// ../node_modules/jose/dist/webapi/lib/key_descriptor.js
function table(entries) {
  const out = { __proto__: null };
  for (const alg in entries)
    out[alg] = { ...entries[alg], alg };
  return out;
}
__name(table, "table");

// ../node_modules/jose/dist/webapi/lib/jws_algorithms.js
var sig = [["verify"], ["sign"]];
function hmac(bits) {
  const subtle = { name: "HMAC", hash: `SHA-${bits}` };
  return { kty: ["oct"], secret: true, subtle, signing: subtle, usages: sig };
}
__name(hmac, "hmac");
function rsa(bits, saltLength) {
  const subtle = { name: saltLength ? "RSA-PSS" : "RSASSA-PKCS1-v1_5", hash: `SHA-${bits}` };
  return {
    kty: ["RSA"],
    subtle,
    signing: saltLength ? { ...subtle, saltLength } : subtle,
    usages: sig,
    minRsaBits: 2048
  };
}
__name(rsa, "rsa");
function ecdsa(crv, bits) {
  return {
    kty: ["EC"],
    crv,
    subtle: { name: "ECDSA", namedCurve: crv },
    signing: { name: "ECDSA", hash: `SHA-${bits}` },
    usages: sig
  };
}
__name(ecdsa, "ecdsa");
function eddsa() {
  const subtle = { name: "Ed25519" };
  return {
    kty: ["OKP"],
    crv: "Ed25519",
    subtle,
    signing: subtle,
    usages: sig
  };
}
__name(eddsa, "eddsa");
function mldsa(bits) {
  const subtle = { name: `ML-DSA-${bits}` };
  return {
    kty: ["AKP"],
    subtle,
    signing: subtle,
    usages: sig
  };
}
__name(mldsa, "mldsa");
var JWS = table({
  HS256: hmac(256),
  HS384: hmac(384),
  HS512: hmac(512),
  RS256: rsa(256),
  RS384: rsa(384),
  RS512: rsa(512),
  PS256: rsa(256, 32),
  PS384: rsa(384, 48),
  PS512: rsa(512, 64),
  ES256: ecdsa("P-256", 256),
  ES384: ecdsa("P-384", 384),
  ES512: ecdsa("P-521", 512),
  EdDSA: eddsa(),
  Ed25519: eddsa(),
  "ML-DSA-44": mldsa(44),
  "ML-DSA-65": mldsa(65),
  "ML-DSA-87": mldsa(87)
});
function jwsAlgorithm(alg) {
  const entry = typeof alg == "string" ? JWS[alg] : void 0;
  if (!entry)
    throw new JOSENotSupported(`alg ${alg} is not supported either by JOSE or your javascript runtime`);
  return entry;
}
__name(jwsAlgorithm, "jwsAlgorithm");

// ../node_modules/jose/dist/webapi/lib/jws_verify.js
function prepareVerify(options) {
  return [options && validateAlgorithms("algorithms", options.algorithms), options?.crit];
}
__name(prepareVerify, "prepareVerify");
function parseProtectedHeader(encodedProtected) {
  return encodedProtected === void 0 ? {} : parseJoseHeader(encodedProtected, JWSInvalid, "JWS Protected Header is invalid");
}
__name(parseProtectedHeader, "parseProtectedHeader");
function encodeCompactUnencodedPayload(payload) {
  try {
    return encode(payload);
  } catch {
    throw new JWSInvalid("JWS Compact Serialization payload must use only ASCII characters");
  }
}
__name(encodeCompactUnencodedPayload, "encodeCompactUnencodedPayload");
async function verifySignature(jws, shared, key, encodeUnencodedPayload, parsedProtected) {
  const { protected: encodedProtected, header, payload: inputPayload } = jws, parsedProt = parsedProtected ?? parseProtectedHeader(encodedProtected);
  if (!isDisjoint(parsedProt, header))
    throw new JWSInvalid("JWS Protected and JWS Unprotected Header Parameter names must be disjoint");
  const joseHeader = { ...parsedProt, ...header }, b64 = validateB64(parsedProt, validateCrit(JWSInvalid, JWS_RECOGNIZED, shared[1], parsedProt, joseHeader)), { alg } = joseHeader;
  if (typeof alg != "string" || !alg)
    throw new JWSInvalid('JWS "alg" (Algorithm) Header Parameter missing or invalid');
  if (shared[0] && !shared[0].has(alg))
    throw new JOSEAlgNotAllowed('"alg" (Algorithm) Header Parameter value not allowed');
  if (b64) {
    if (typeof inputPayload != "string")
      throw new JWSInvalid("JWS Payload must be a string");
  } else if (typeof inputPayload != "string" && !(inputPayload instanceof Uint8Array))
    throw new JWSInvalid("JWS Payload must be a string or an Uint8Array instance");
  const signingPayload = b64 || typeof inputPayload != "string" ? inputPayload : encodeUnencodedPayload(inputPayload);
  let resolvedKey = false;
  typeof key == "function" && (key = await key(parsedProt, jws), resolvedKey = true);
  const entry = jwsAlgorithm(alg), data = concat(encodedProtected !== void 0 ? encode(encodedProtected) : new Uint8Array(), encode("."), typeof signingPayload == "string" ? shared[2] ??= encodeBase64url(signingPayload, "payload", JWSInvalid) : signingPayload), signature = decodeBase64url(jws.signature, "signature", JWSInvalid), k = await prepareKey(entry, key, "verify"), cryptoKey = await rawKey(k, entry.subtle, "verify");
  entry.minRsaBits && checkModulusLength(entry.alg, cryptoKey);
  let verified = false;
  try {
    verified = await crypto.subtle.verify(entry.signing, cryptoKey, signature, data);
  } catch {
  }
  if (!verified)
    throw new JWSSignatureVerificationFailed();
  const result = { payload: typeof signingPayload == "string" ? decodeBase64url(signingPayload, "payload", JWSInvalid) : signingPayload };
  return encodedProtected !== void 0 && (result.protectedHeader = parsedProt), header !== void 0 && (result.unprotectedHeader = header), resolvedKey ? [{ ...result, key: k }, b64] : [result, b64];
}
__name(verifySignature, "verifySignature");
async function verifyCompact(jws, shared, key) {
  if (jws instanceof Uint8Array && (jws = decoder.decode(jws)), typeof jws != "string")
    throw new JWSInvalid("Compact JWS must be a string or Uint8Array");
  const { 0: protectedHeader, 1: payload, 2: signature, length } = jws.split(".");
  if (length !== 3)
    throw new JWSInvalid("Invalid Compact JWS");
  return verifySignature({ payload, protected: protectedHeader, signature }, shared, key, encodeCompactUnencodedPayload);
}
__name(verifyCompact, "verifyCompact");

// ../node_modules/jose/dist/webapi/lib/jwt_claims_set.js
var epoch = /* @__PURE__ */ __name((date) => Math.floor(date.getTime() / 1e3), "epoch");
var multipliers = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
  w: 604800,
  y: 31557600
};
var REGEX = /^(\+|\-)? ?(\d+|\d+\.\d+) ?(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)(?: (ago|from now))?$/i;
var checkFailed = "check_failed";
function invalidDuration() {
  throw new TypeError("Invalid time period format");
}
__name(invalidDuration, "invalidDuration");
function secs(str) {
  typeof str != "string" && invalidDuration();
  const matched = REGEX.exec(str);
  (!matched || matched[4] && matched[1]) && invalidDuration();
  const value = parseFloat(matched[2]), numericDate2 = Math.round(value * multipliers[matched[3][0].toLowerCase()]);
  return Number.isFinite(numericDate2) || invalidDuration(), matched[1] === "-" || matched[4] === "ago" ? -numericDate2 : numericDate2;
}
__name(secs, "secs");
function validateInput(label, input) {
  if (!Number.isFinite(input))
    throw new TypeError(`Invalid ${label} input`);
  return input;
}
__name(validateInput, "validateInput");
var normalizeTyp = /* @__PURE__ */ __name((value) => {
  const normalized = value.toLowerCase();
  return value.includes("/") ? normalized : `application/${normalized}`;
}, "normalizeTyp");
var checkAudiencePresence = /* @__PURE__ */ __name((audPayload, audOption) => typeof audPayload == "string" ? audOption.includes(audPayload) : Array.isArray(audPayload) ? audOption.some((aud) => audPayload.includes(aud)) : false, "checkAudiencePresence");
function validateNumericDate(payload, claim, required = false) {
  const value = payload[claim];
  if (!(value === void 0 && !required)) {
    if (typeof value != "number")
      throw new JWTClaimValidationFailed(`"${claim}" claim must be a number`, payload, claim, "invalid");
    return value;
  }
}
__name(validateNumericDate, "validateNumericDate");
function unexpectedClaim(payload, claim) {
  throw new JWTClaimValidationFailed(`unexpected "${claim}" claim value`, payload, claim, checkFailed);
}
__name(unexpectedClaim, "unexpectedClaim");
function validateClaimsSet(protectedHeader, encodedPayload, options = {}) {
  let payload;
  try {
    payload = JSON.parse(strictDecoder.decode(encodedPayload));
  } catch {
  }
  if (!isObject(payload))
    throw new JWTInvalid("JWT Claims Set must be a top-level JSON object");
  const { typ } = options;
  if (typ !== void 0 && (typeof protectedHeader.typ != "string" || normalizeTyp(protectedHeader.typ) !== normalizeTyp(typ)))
    throw new JWTClaimValidationFailed('unexpected "typ" JWT header value', payload, "typ", checkFailed);
  const { requiredClaims = [], issuer, subject, audience, maxTokenAge } = options, presenceCheck = [...requiredClaims];
  maxTokenAge !== void 0 && presenceCheck.push("iat"), audience !== void 0 && presenceCheck.push("aud"), subject !== void 0 && presenceCheck.push("sub"), issuer !== void 0 && presenceCheck.push("iss");
  for (const claim of new Set(presenceCheck.reverse()))
    if (!Object.hasOwn(payload, claim))
      throw new JWTClaimValidationFailed(`missing required "${claim}" claim`, payload, claim, "missing");
  issuer !== void 0 && !(Array.isArray(issuer) ? issuer : [issuer]).includes(payload.iss) && unexpectedClaim(payload, "iss"), subject !== void 0 && payload.sub !== subject && unexpectedClaim(payload, "sub"), audience !== void 0 && !checkAudiencePresence(payload.aud, typeof audience == "string" ? [audience] : audience) && unexpectedClaim(payload, "aud");
  const { clockTolerance } = options;
  let tolerance = 0;
  if (typeof clockTolerance == "string")
    tolerance = secs(clockTolerance);
  else if (clockTolerance !== void 0) {
    if (typeof clockTolerance != "number")
      throw new TypeError("Invalid clockTolerance option type");
    tolerance = clockTolerance;
  }
  validateInput("clockTolerance option", tolerance);
  const { currentDate } = options, now = validateInput("currentDate option", epoch(currentDate === void 0 ? /* @__PURE__ */ new Date() : currentDate)), iat = validateNumericDate(payload, "iat", maxTokenAge !== void 0), nbf = validateNumericDate(payload, "nbf");
  if (nbf !== void 0 && nbf > now + tolerance)
    throw new JWTClaimValidationFailed('"nbf" claim timestamp check failed', payload, "nbf", checkFailed);
  const exp = validateNumericDate(payload, "exp");
  if (exp !== void 0 && exp <= now - tolerance)
    throw new JWTExpired('"exp" claim timestamp check failed', payload, "exp", checkFailed);
  if (maxTokenAge !== void 0) {
    const age = now - iat, max = validateInput("maxTokenAge option", typeof maxTokenAge == "number" ? maxTokenAge : secs(maxTokenAge));
    if (age - tolerance > max)
      throw new JWTExpired('"iat" claim timestamp check failed (too far in the past)', payload, "iat", checkFailed);
    if (age < -tolerance)
      throw new JWTClaimValidationFailed('"iat" claim timestamp check failed (it should be in the past)', payload, "iat", checkFailed);
  }
  return payload;
}
__name(validateClaimsSet, "validateClaimsSet");

// ../node_modules/jose/dist/webapi/jwt/verify.js
async function jwtVerify(jwt, key, options) {
  const [verified, b64] = await verifyCompact(jwt, prepareVerify(options), key);
  if (!b64)
    throw new JWTInvalid("JWTs MUST NOT use unencoded payload");
  const payload = validateClaimsSet(verified.protectedHeader, verified.payload, options);
  return { ...verified, payload };
}
__name(jwtVerify, "jwtVerify");

// ../node_modules/jose/dist/webapi/jwks/local.js
function isUsableJWK(jwk, entry, alg, kid) {
  const { kty, key_ops: keyOps, ext, kid: jwkKid, alg: jwkAlg, use, crv } = jwk;
  return (ext === void 0 || typeof ext == "boolean") && (keyOps === void 0 || Array.isArray(keyOps) && keyOps.every((operation, index) => typeof operation == "string" && keyOps.indexOf(operation) === index) && keyOps.includes("verify")) && entry.kty.includes(kty) && (kid === void 0 || typeof kid == "string" && kid === jwkKid) && (jwkAlg === void 0 ? kty !== "AKP" : alg === jwkAlg) && (use === void 0 || use === "sig") && (!entry.crv || crv === entry.crv);
}
__name(isUsableJWK, "isUsableJWK");
async function importWithAlgCache(cache2, jwk, entry) {
  const cached = cache2.get(jwk) || cache2.set(jwk, {}).get(jwk), { alg } = entry;
  if (cached[alg] === void 0) {
    const pending = jwkToKey(entry, jwk, true).then((key) => {
      if (key.type !== "public")
        throw new JWKSInvalid("JSON Web Key Set members must be public keys");
      return cached[alg] = key, key;
    }).catch((error) => {
      throw cached[alg] === pending && delete cached[alg], error;
    });
    cached[alg] = pending;
  }
  return cached[alg];
}
__name(importWithAlgCache, "importWithAlgCache");
function createLocalJWKSet(jwks) {
  let snapshot;
  try {
    snapshot = structuredClone(jwks);
  } catch {
  }
  if (!isJwkSet(snapshot))
    throw new JWKSInvalid("JSON Web Key Set malformed");
  const metadata = snapshot.keys.map((jwk) => {
    const normalized = snapshotJwk(jwk);
    return Array.isArray(normalized.key_ops) && (normalized.key_ops = [...normalized.key_ops]), normalized;
  }), cached = /* @__PURE__ */ new WeakMap();
  return Object.defineProperty(async (protectedHeader, token) => {
    const { alg, kid } = { ...protectedHeader, ...token?.header }, entry = typeof alg == "string" ? JWS[alg] : void 0;
    if (!entry || entry.secret)
      throw new JOSENotSupported('Unsupported "alg" value for a JSON Web Key Set');
    const candidates = snapshot.keys.filter((_, index) => isUsableJWK(metadata[index], entry, alg, kid)), { 0: jwk, length } = candidates;
    if (!length)
      throw new JWKSNoMatchingKey();
    if (length !== 1) {
      const error = new JWKSMultipleMatchingKeys();
      throw error[Symbol.asyncIterator] = async function* () {
        for (const jwk2 of candidates)
          try {
            yield await importWithAlgCache(cached, jwk2, entry);
          } catch {
          }
      }, error;
    }
    return importWithAlgCache(cached, jwk, entry);
  }, "jwks", {
    value: /* @__PURE__ */ __name(() => structuredClone(snapshot), "value")
  });
}
__name(createLocalJWKSet, "createLocalJWKSet");

// ../node_modules/jose/dist/webapi/jwks/remote.js
function isCloudflareWorkers() {
  return typeof WebSocketPair < "u" || typeof navigator < "u" && true || typeof EdgeRuntime < "u" && EdgeRuntime === "vercel";
}
__name(isCloudflareWorkers, "isCloudflareWorkers");
var USER_AGENT;
(typeof navigator > "u" || !"Cloudflare-Workers"?.startsWith?.("Mozilla/5.0 ")) && (USER_AGENT = "jose/v6.2.12");
var customFetch = /* @__PURE__ */ Symbol();
async function fetchJwks(url, headers, signal, fetchImpl = fetch) {
  const response = await fetchImpl(url, {
    method: "GET",
    signal,
    redirect: "manual",
    headers
  }).catch((err) => {
    throw err.name === "TimeoutError" ? new JWKSTimeout() : err;
  });
  if (response.status !== 200)
    throw new JOSEError("Expected 200 OK from the JSON Web Key Set HTTP response");
  try {
    return await response.json();
  } catch {
    throw new JOSEError("Failed to parse the JSON Web Key Set HTTP response as JSON");
  }
}
__name(fetchJwks, "fetchJwks");
var jwksCache = /* @__PURE__ */ Symbol();
function isFreshFor(timestamp, duration) {
  return Number.isFinite(timestamp) && Date.now() < timestamp + duration;
}
__name(isFreshFor, "isFreshFor");
function validateDuration(value, fallback, option) {
  if (Number.isNaN(value))
    throw new TypeError(`"${option}" option must not be NaN`);
  return typeof value == "number" ? value : fallback;
}
__name(validateDuration, "validateDuration");
function createRemoteJWKSet(url, options) {
  if (!(url instanceof URL))
    throw new TypeError("url must be an instance of URL");
  const href = new URL(url.href).href, opts = options ?? {}, timeoutOption = opts.timeoutDuration;
  if (typeof timeoutOption == "number" && (!Number.isInteger(timeoutOption) || timeoutOption < 0))
    throw new TypeError('"timeoutDuration" option must be a non-negative integer');
  const timeoutDuration = typeof timeoutOption == "number" ? timeoutOption : 5e3, cooldownDuration = validateDuration(opts.cooldownDuration, 3e4, "cooldownDuration"), cacheMaxAge = validateDuration(opts.cacheMaxAge, 6e5, "cacheMaxAge"), headers = new Headers(opts.headers);
  USER_AGENT && !headers.has("User-Agent") && headers.set("User-Agent", USER_AGENT), headers.has("accept") || headers.set("accept", "application/json, application/jwk-set+json");
  const fetchImpl = opts[customFetch], cache2 = opts[jwksCache];
  let jwksTimestamp, pendingFetch, reloadSequence = 0, appliedSequence = 0, local;
  if (cache2 && typeof cache2 == "object") {
    const { uat, jwks } = cache2;
    isFreshFor(uat, cacheMaxAge) && isJwkSet(jwks) && (jwksTimestamp = uat, local = createLocalJWKSet(jwks));
  }
  const reload = /* @__PURE__ */ __name(async () => {
    if (pendingFetch && isCloudflareWorkers() && (pendingFetch = void 0), !pendingFetch) {
      const sequence = ++reloadSequence, current = pendingFetch = fetchJwks(href, headers, AbortSignal.timeout(timeoutDuration), fetchImpl).then((json2) => {
        const next = createLocalJWKSet(json2);
        if (sequence <= appliedSequence)
          return;
        local = next;
        const updatedAt = Date.now();
        cache2 && (cache2.uat = updatedAt, cache2.jwks = json2), jwksTimestamp = updatedAt, appliedSequence = sequence;
      }).finally(() => {
        pendingFetch === current && (pendingFetch = void 0);
      });
    }
    await pendingFetch;
  }, "reload");
  return Object.defineProperties(async (protectedHeader, token) => {
    (!local || !isFreshFor(jwksTimestamp, cacheMaxAge)) && await reload();
    try {
      return await local(protectedHeader, token);
    } catch (err) {
      if (err instanceof JWKSNoMatchingKey && !isFreshFor(jwksTimestamp, cooldownDuration))
        return await reload(), local(protectedHeader, token);
      throw err;
    }
  }, {
    coolingDown: {
      get: /* @__PURE__ */ __name(() => isFreshFor(jwksTimestamp, cooldownDuration), "get"),
      enumerable: true
    },
    fresh: {
      get: /* @__PURE__ */ __name(() => isFreshFor(jwksTimestamp, cacheMaxAge), "get"),
      enumerable: true
    },
    reload: {
      value: reload,
      enumerable: true
    },
    reloading: {
      get: /* @__PURE__ */ __name(() => !!pendingFetch, "get"),
      enumerable: true
    },
    jwks: {
      value: /* @__PURE__ */ __name(() => local?.jwks(), "value"),
      enumerable: true
    }
  });
}
__name(createRemoteJWKSet, "createRemoteJWKSet");

// worker.mjs
var JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
var TAGS = ["\u05E9\u05E2\u05E8", "\u05D4\u05E6\u05DC\u05D4", "\u05D1\u05D9\u05E9\u05D5\u05DC", "\u05DE\u05D4\u05DC\u05DA \u05E7\u05D1\u05D5\u05E6\u05EA\u05D9", "\u05E8\u05D2\u05E2 \u05DE\u05D4\u05DE\u05E9\u05D7\u05E7"];
var MAX_BYTES = 1e8;
var iso = /* @__PURE__ */ __name(() => (/* @__PURE__ */ new Date()).toISOString(), "iso");
var uid = /* @__PURE__ */ __name(() => crypto.randomUUID(), "uid");
var HttpError = class extends Error {
  static {
    __name(this, "HttpError");
  }
  constructor(code, status = 400) {
    super(code);
    this.status = status;
  }
};
var fail = /* @__PURE__ */ __name((code, status) => {
  throw new HttpError(code, status);
}, "fail");
var json = /* @__PURE__ */ __name((x, status = 200) => new Response(JSON.stringify(x), { status, headers: { "Content-Type": "application/json;charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } }), "json");
async function body(req) {
  if (Number(req.headers.get("Content-Length") || 0) > 16e3) fail("invalid_request");
  const text = await req.text();
  if (text.length > 16e3) fail("invalid_request");
  try {
    return JSON.parse(text);
  } catch {
    fail("invalid_request");
  }
}
__name(body, "body");
function configured(env) {
  return env.DB && env.B2_KEY_ID && env.B2_APPLICATION_KEY && env.B2_BUCKET_ID && env.B2_BUCKET_NAME && env.GOOGLE_CLIENT_ID && !env.GOOGLE_CLIENT_ID.startsWith("REPLACE");
}
__name(configured, "configured");
async function identity(req, env) {
  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) fail("login_required", 401);
  let payload;
  try {
    ({ payload } = await jwtVerify(auth.slice(7), JWKS, { audience: env.GOOGLE_CLIENT_ID, issuer: ["https://accounts.google.com", "accounts.google.com"], algorithms: ["RS256"] }));
  } catch {
    fail("login_expired", 401);
  }
  if (!payload.email_verified || !payload.email || !payload.sub) fail("login_required", 401);
  return { email: payload.email.toLowerCase(), sub: payload.sub };
}
__name(identity, "identity");
async function authenticate(req, env, requireConsent = true) {
  const payload = await identity(req, env);
  const m = await env.DB.prepare("SELECT * FROM members WHERE email=? AND enabled=1").bind(payload.email).first();
  if (!m) fail("family_not_approved", 403);
  if (m.sub && m.sub !== payload.sub) fail("account_changed", 403);
  if (!m.sub) {
    const claim = await env.DB.prepare("UPDATE members SET sub=? WHERE email=? AND sub IS NULL").bind(payload.sub, m.email).run();
    if (!claim.meta.changes) {
      const current = await env.DB.prepare("SELECT sub FROM members WHERE email=?").bind(m.email).first();
      if (current?.sub !== payload.sub) fail("account_changed", 403);
    }
  }
  if (requireConsent && m.consent_version !== env.CONSENT_VERSION) fail("consent_required", 403);
  return { ...m, sub: payload.sub };
}
__name(authenticate, "authenticate");
function admin(m) {
  if (m.role !== "admin") fail("admin_required", 403);
}
__name(admin, "admin");
async function audit(env, m, action, target) {
  await env.DB.prepare("INSERT INTO audit VALUES(?,?,?,?,?)").bind(uid(), m.sub, action, target || null, iso()).run();
}
__name(audit, "audit");
var b2Session = null;
async function b2Auth(env) {
  if (b2Session && b2Session.key === env.B2_KEY_ID && b2Session.expires > Date.now()) return b2Session.data;
  const r = await fetch("https://api.backblazeb2.com/b2api/v4/b2_authorize_account", { headers: { Authorization: "Basic " + btoa(env.B2_KEY_ID + ":" + env.B2_APPLICATION_KEY) } });
  if (!r.ok) fail("storage_unavailable", 503);
  const a = await r.json();
  const d = a.apiInfo?.storageApi || a;
  if (!d.apiUrl || !d.downloadUrl) fail("storage_unavailable", 503);
  const allowed = d.allowed || a.allowed;
  if (!allowed || !(allowed.buckets?.length === 1 && allowed.buckets[0].id === env.B2_BUCKET_ID) || allowed.namePrefix !== "highlights/" || !["listBuckets", "listFiles", "readFiles", "shareFiles", "writeFiles", "deleteFiles"].every((c) => allowed.capabilities?.includes(c))) fail("storage_key_not_scoped", 503);
  const check = await fetch(d.apiUrl + "/b2api/v4/b2_list_buckets", { method: "POST", headers: { Authorization: a.authorizationToken, "Content-Type": "application/json" }, body: JSON.stringify({ accountId: a.accountId, bucketId: env.B2_BUCKET_ID }) });
  if (!check.ok) fail("storage_unavailable", 503);
  const found = (await check.json()).buckets?.find((b) => b.bucketId === env.B2_BUCKET_ID);
  if (!found || found.bucketType !== "allPrivate" || found.bucketName !== env.B2_BUCKET_NAME) fail("storage_not_private", 503);
  b2Session = { key: env.B2_KEY_ID, expires: Date.now() + 20 * 60 * 1e3, data: { ...d, authorizationToken: a.authorizationToken } };
  return b2Session.data;
}
__name(b2Auth, "b2Auth");
async function b2(env, method, data) {
  const a = await b2Auth(env);
  const r = await fetch(a.apiUrl + "/b2api/v4/" + method, { method: "POST", headers: { Authorization: a.authorizationToken, "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!r.ok) {
    const error = await r.json().catch(() => ({}));
    if (["cap_exceeded", "transaction_cap_exceeded"].includes(error.code)) fail("provider_quota_reached", 503);
    if (r.status === 401) b2Session = null;
    fail("storage_unavailable", 503);
  }
  return r.json();
}
__name(b2, "b2");
async function games(env) {
  const r = await fetch(env.GAMES_URL, { cf: { cacheTtl: 60 } });
  if (!r.ok) fail("games_unavailable", 503);
  const text = await r.text();
  const data = text.match(/\/\*DATA_START\*\/\s*const DATA\s*=\s*([\s\S]*?);\s*\/\*DATA_END\*\//);
  if (!data) fail("games_unavailable", 503);
  let d;
  try {
    d = JSON.parse(data[1]);
  } catch {
    fail("games_unavailable", 503);
  }
  return d.games.map((g) => ({ id: g.uid || `legacy-${g.id}`, date: g.date, opponent: g.opponent, type: g.type }));
}
__name(games, "games");
function validateUpload(d) {
  if (!d || typeof d.title !== "string" || !d.title.trim() || d.title.length > 80) fail("invalid_title");
  const photo = d.kind === "photo";
  if (d.kind && !["photo", "video"].includes(d.kind)) fail("invalid_file");
  if (!Number.isSafeInteger(d.bytes) || d.bytes < 100 || d.bytes > (photo ? 5e6 : MAX_BYTES)) fail("file_too_large");
  if (d.contentType !== (photo ? "image/jpeg" : "video/mp4")) fail(photo ? "photo_required" : "mp4_required");
  if (!photo && (!Number.isFinite(d.duration) || d.duration <= 0 || d.duration > 90)) fail("clip_too_long");
  if (!Array.isArray(d.tags) || !d.tags.length || d.tags.length > 5 || d.tags.some((t) => !TAGS.includes(t))) fail("invalid_tags");
  if (d.minute != null && (!Number.isInteger(d.minute) || d.minute < 0 || d.minute > 120)) fail("invalid_minute");
  if (d.permissionConfirmed !== true) fail("permission_required");
  return { ...d, kind: d.kind || "video", duration: photo ? 0 : d.duration, title: d.title.trim(), tags: [...new Set(d.tags)] };
}
__name(validateUpload, "validateUpload");
async function reserve(req, env, m) {
  const d = validateUpload(await body(req));
  const g = (await games(env)).find((g2) => g2.id === d.gameId);
  if (!g) fail("game_not_found");
  const today = iso().slice(0, 10);
  const count = await env.DB.prepare("SELECT count(*) n FROM videos WHERE uploader_sub=? AND created_at>=?").bind(m.sub, today).first();
  if (count.n >= 20) fail("upload_limit", 429);
  const id = uid(), key = "highlights/" + id + (d.kind === "photo" ? "/photo.jpg" : "/clip.mp4"), now = iso(), expires = new Date(Date.now() + 30 * 60 * 1e3).toISOString();
  try {
    await env.DB.prepare(`INSERT INTO videos (id,game_id,game_date,opponent,game_type,title,tags,minute,object_key,bytes,duration,uploader_sub,status,created_at,consent_version,expires_at,kind,content_type) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id, g.id, g.date, g.opponent, g.type, d.title, JSON.stringify(d.tags), d.minute ?? null, key, d.bytes, d.duration, m.sub, "uploading", now, env.CONSENT_VERSION, expires, d.kind, d.contentType).run();
  } catch (e) {
    if (String(e).includes("storage_full")) fail("storage_full", 409);
    throw e;
  }
  return json({ id, expiresAt: expires });
}
__name(reserve, "reserve");
async function videoRow(env, id) {
  const v = await env.DB.prepare("SELECT * FROM videos WHERE id=?").bind(id).first();
  if (!v) fail("video_not_found", 404);
  return v;
}
__name(videoRow, "videoRow");
function canPreview(m, v) {
  return m.role === "admin" || v.status === "approved" || v.uploader_sub === m.sub && v.status === "pending";
}
__name(canPreview, "canPreview");
async function upload(req, env, m, id) {
  const v = await videoRow(env, id);
  if (v.uploader_sub !== m.sub) fail("forbidden", 403);
  if (v.status !== "uploading" || v.expires_at < iso()) fail("upload_expired", 409);
  if (Number(req.headers.get("Content-Length")) !== v.bytes || req.headers.get("Content-Type") !== (v.content_type || "video/mp4")) fail("invalid_file");
  const reader = req.body?.getReader();
  if (!reader) fail("invalid_file");
  const first = await reader.read();
  if (first.done || first.value.length < 12 || (v.kind === "photo" ? !(first.value[0] === 255 && first.value[1] === 216 && first.value[2] === 255) : String.fromCharCode(...first.value.slice(4, 8)) !== "ftyp")) {
    await reader.cancel();
    fail("mp4_required");
  }
  const lock = await env.DB.prepare("UPDATE videos SET status='receiving' WHERE id=? AND status='uploading'").bind(id).run();
  if (!lock.meta.changes) {
    await reader.cancel();
    fail("upload_in_progress", 409);
  }
  try {
    const u = await b2(env, "b2_get_upload_url", { bucketId: env.B2_BUCKET_ID });
    let total = first.value.length;
    const stream = new ReadableStream({ start(controller) {
      controller.enqueue(first.value);
    }, async pull(controller) {
      try {
        const n = await reader.read();
        if (n.done) {
          if (total !== v.bytes) throw new Error("length");
          controller.close();
          return;
        }
        total += n.value.length;
        if (total > v.bytes) throw new Error("length");
        controller.enqueue(n.value);
      } catch (e) {
        controller.error(e);
        await reader.cancel().catch(() => {
        });
      }
    }, cancel() {
      return reader.cancel();
    } });
    const fixed = new FixedLengthStream(v.bytes);
    const piping = stream.pipeTo(fixed.writable);
    const response = await fetch(u.uploadUrl, { method: "POST", headers: { Authorization: u.authorizationToken, "X-Bz-File-Name": encodeURIComponent(v.object_key), "X-Bz-Content-Sha1": "do_not_verify", "Content-Type": v.content_type || "video/mp4", "Content-Length": String(v.bytes) }, body: fixed.readable });
    await piping;
    if (!response.ok) {
      const e = await response.json().catch(() => ({}));
      if (e.code === "cap_exceeded") fail("provider_quota_reached", 503);
      fail("upload_failed", 503);
    }
    const f = await response.json();
    if (f.contentLength !== v.bytes || f.fileName !== v.object_key) fail("upload_failed", 503);
    await env.DB.prepare("UPDATE videos SET status='pending',file_id=? WHERE id=? AND status='receiving'").bind(f.fileId, id).run();
    await audit(env, m, "upload", id);
    return json({ status: "pending" });
  } catch (e) {
    console.error("Upload needs reconciliation", id, e.message);
    fail(e instanceof HttpError ? e.message : "upload_uncertain", 503);
  }
}
__name(upload, "upload");
async function removeObjects(env, v) {
  const listing = await b2(env, "b2_list_file_versions", { bucketId: env.B2_BUCKET_ID, prefix: v.object_key, maxFileCount: 100 });
  if (listing.nextFileId) fail("cleanup_required", 503);
  for (const f of listing.files || []) {
    if (f.fileName === v.object_key) await b2(env, "b2_delete_file_version", { fileName: f.fileName, fileId: f.fileId });
  }
}
__name(removeObjects, "removeObjects");
async function remove(env, m, v, status, reason) {
  if (["removed", "rejected"].includes(v.status)) return;
  if (v.status === "receiving" && v.expires_at > iso()) fail("upload_in_progress", 409);
  await env.DB.prepare("UPDATE videos SET status='deleting' WHERE id=?").bind(v.id).run();
  await removeObjects(env, v);
  await env.DB.prepare("UPDATE videos SET status=?,reason=? WHERE id=?").bind(status, reason, v.id).run();
  await audit(env, m, status, v.id);
}
__name(remove, "remove");
function transferPeriod(now = /* @__PURE__ */ new Date()) {
  return now.toISOString().slice(0, 10);
}
__name(transferPeriod, "transferPeriod");
function playbackCharge(bytes) {
  return bytes * 3;
}
__name(playbackCharge, "playbackCharge");
async function playback(env, m, v) {
  if (!canPreview(m, v) || !["pending", "approved"].includes(v.status)) fail("forbidden", 403);
  const limit = Number(env.DAILY_TRANSFER_BUDGET_BYTES || 0);
  const charge = playbackCharge(v.bytes);
  if (!Number.isSafeInteger(limit) || limit <= 0) fail("viewing_paused", 429);
  const day = transferPeriod(), ticket = uid();
  await env.DB.prepare("INSERT OR IGNORE INTO transfer_budget VALUES(?,0)").bind(day).run();
  const result = await env.DB.prepare("UPDATE transfer_budget SET reserved_bytes=reserved_bytes+? WHERE day=? AND reserved_bytes+?<=?").bind(charge, day, charge, limit).run();
  if (!result.meta.changes) fail("viewing_paused", 429);
  try {
    const a = await b2Auth(env);
    const token = await b2(env, "b2_get_download_authorization", { bucketId: env.B2_BUCKET_ID, fileNamePrefix: v.object_key, validDurationInSeconds: 180 });
    await env.DB.prepare("INSERT INTO playback_tickets VALUES(?,?,?,?,?,?)").bind(ticket, day, v.id, m.sub, charge, iso()).run();
    const path = v.object_key.split("/").map(encodeURIComponent).join("/");
    return json({ url: a.downloadUrl + "/file/" + encodeURIComponent(env.B2_BUCKET_NAME) + "/" + path + "?Authorization=" + encodeURIComponent(token.authorizationToken), expiresAt: Date.now() + 18e4 });
  } catch (e) {
    await env.DB.prepare("UPDATE transfer_budget SET reserved_bytes=MAX(0,reserved_bytes-?) WHERE day=?").bind(charge, day).run();
    throw e;
  }
}
__name(playback, "playback");
function publicVideo(v) {
  return { id: v.id, kind: v.kind || "video", contentType: v.content_type || "video/mp4", gameId: v.game_id, date: v.game_date, opponent: v.opponent, type: v.game_type, title: v.title, tags: JSON.parse(v.tags), minute: v.minute, duration: v.duration, bytes: v.bytes, status: v.status, createdAt: v.created_at };
}
__name(publicVideo, "publicVideo");
async function optionalMember(req, env) {
  if (!(req.headers.get("Authorization") || "").startsWith("Bearer ")) return null;
  try {
    return await authenticate(req, env, true);
  } catch (e) {
    if (e instanceof HttpError) return null;
    throw e;
  }
}
__name(optionalMember, "optionalMember");
async function route(req, env) {
  const url = new URL(req.url), path = url.pathname.replace(/\/$/, "") || "/";
  if (path === "/health" && req.method === "GET") return json({ ready: !!configured(env) });
  if (!configured(env)) fail("not_configured", 503);
  if (path === "/access-request") {
    const person = await identity(req, env);
    const member = await env.DB.prepare("SELECT enabled,sub FROM members WHERE email=?").bind(person.email).first();
    if (member?.enabled && (!member.sub || member.sub === person.sub)) return json({ status: "approved" });
    const previous = await env.DB.prepare("SELECT status,updated_at FROM access_requests WHERE email=?").bind(person.email).first();
    if (req.method === "GET") return json({ status: previous?.status || "none" });
    if (req.method !== "POST") fail("not_found", 404);
    if (previous?.status === "pending") return json({ status: "pending" });
    if (previous && Date.now() - Date.parse(previous.updated_at) < 864e5) fail("request_cooldown", 429);
    await env.DB.prepare("INSERT INTO access_requests(email,sub,status,created_at,updated_at) VALUES(?,?,'pending',?,?) ON CONFLICT(email) DO UPDATE SET sub=excluded.sub,status='pending',updated_at=excluded.updated_at").bind(person.email, person.sub, iso(), iso()).run();
    return json({ status: "pending" });
  }
  const PLAY = path.match(/^\/videos\/([a-f0-9-]{36})\/play$/);
  if (req.method === "GET" && (path === "/games" || path === "/videos") || PLAY && req.method === "POST") {
    const pm = await optionalMember(req, env);
    if (!pm) {
      if (path === "/games") return json({ games: await games(env) });
      if (path === "/videos") {
        const rows = await env.DB.prepare("SELECT * FROM videos WHERE status='approved' ORDER BY game_date DESC,created_at DESC LIMIT 500").all();
        return json({ videos: rows.results.map(publicVideo) });
      }
      const v = await videoRow(env, PLAY[1]);
      if (v.status !== "approved") fail("forbidden", 403);
      return playback(env, { sub: "anonymous", role: "viewer" }, v);
    }
  }
  const m = await authenticate(req, env, path !== "/me" && path !== "/consent");
  if (path === "/admin/requests") {
    admin(m);
    if (req.method === "GET") return json({ requests: (await env.DB.prepare("SELECT email,status,created_at,updated_at FROM access_requests WHERE status='pending' ORDER BY updated_at LIMIT 100").all()).results });
    if (req.method === "POST") {
      const d = await body(req);
      if (!["approve", "reject"].includes(d.action)) fail("invalid_action");
      const q = await env.DB.prepare("SELECT * FROM access_requests WHERE email=? AND status='pending'").bind(String(d.email || "").toLowerCase()).first();
      if (!q) fail("request_not_found", 404);
      if (q.email === m.email) fail("cannot_revoke_self");
      const existing = await env.DB.prepare("SELECT role,sub FROM members WHERE email=?").bind(q.email).first();
      if (existing && (existing.role === "admin" || existing.sub && existing.sub !== q.sub)) fail("account_changed", 403);
      const statements = [];
      if (d.action === "approve") statements.push(env.DB.prepare("INSERT INTO members(email,role,sub) VALUES(?,'parent',?) ON CONFLICT(email) DO UPDATE SET enabled=1,sub=excluded.sub").bind(q.email, q.sub));
      statements.push(env.DB.prepare("UPDATE access_requests SET status=?,updated_at=? WHERE email=?").bind(d.action === "approve" ? "approved" : "rejected", iso(), q.email));
      await env.DB.batch(statements);
      await audit(env, m, "access_" + d.action, q.email);
      return json({ ok: true });
    }
    fail("not_found", 404);
  }
  if (path === "/me" && req.method === "GET") return json({ email: m.email, role: m.role, consentVersion: env.CONSENT_VERSION, consented: m.consent_version === env.CONSENT_VERSION });
  if (path === "/consent" && req.method === "POST") {
    const d = await body(req);
    if (d.version !== env.CONSENT_VERSION || d.accepted !== true) fail("consent_required", 403);
    await env.DB.prepare("UPDATE members SET consent_version=?,consent_at=? WHERE email=?").bind(d.version, iso(), m.email).run();
    await audit(env, m, "consent", d.version);
    return json({ ok: true });
  }
  if (path === "/games" && req.method === "GET") return json({ games: await games(env) });
  if (path === "/videos" && req.method === "GET") {
    const rows = await env.DB.prepare(m.role === "admin" ? "SELECT * FROM videos WHERE status IN ('approved','pending','uploading','receiving','deleting') ORDER BY game_date DESC,created_at DESC LIMIT 500" : "SELECT * FROM videos WHERE status='approved' OR (uploader_sub=? AND status IN ('pending','uploading','receiving')) ORDER BY game_date DESC,created_at DESC LIMIT 500").bind(...m.role === "admin" ? [] : [m.sub]).all();
    const usage = await env.DB.prepare("SELECT used_bytes FROM storage_budget WHERE singleton=1").first();
    return json({ videos: rows.results.map(publicVideo), storageBytes: usage.used_bytes, storageLimit: 8e9, warning: usage.used_bytes >= 6e9 });
  }
  if (path === "/uploads" && req.method === "POST") return reserve(req, env, m);
  const item = path.match(/^\/videos\/([a-f0-9-]{36})(?:\/(upload|play|moderate|report))?$/);
  if (item) {
    const [, id, action] = item;
    if (action === "upload" && req.method === "PUT") return upload(req, env, m, id);
    const v = await videoRow(env, id);
    if (action === "play" && req.method === "POST") return playback(env, m, v);
    if (action === "moderate" && req.method === "POST") {
      admin(m);
      const d = await body(req);
      if (d.action === "approve") {
        if (v.status !== "pending") fail("invalid_status", 409);
        if (d.reviewedClip !== true) fail("review_required");
        const title = String(d.title || v.title).trim();
        const tags = d.tags || JSON.parse(v.tags);
        if (!title || title.length > 80 || !tags.length || tags.some((t) => !TAGS.includes(t))) fail("invalid_title");
        await env.DB.prepare("UPDATE videos SET status='approved',title=?,tags=?,approved_at=?,approved_by=? WHERE id=? AND status='pending'").bind(title, JSON.stringify(tags), iso(), m.sub, id).run();
        await audit(env, m, "approve", id);
        return json({ ok: true });
      }
      if (d.action === "reject") {
        await remove(env, m, v, "rejected", String(d.reason || "").slice(0, 500));
        return json({ ok: true });
      }
      fail("invalid_action");
    }
    if (!action && req.method === "DELETE") {
      if (m.role !== "admin" && m.sub !== v.uploader_sub) fail("forbidden", 403);
      await remove(env, m, v, "removed", "");
      return json({ ok: true });
    }
    if (action === "report" && req.method === "POST") {
      if (!canPreview(m, v)) fail("forbidden", 403);
      const d = await body(req);
      const reason = String(d.reason || "").trim();
      if (!reason || reason.length > 500) fail("invalid_reason");
      await env.DB.prepare("INSERT INTO reports VALUES(?,?,?,?,?,NULL)").bind(uid(), id, m.sub, reason, iso()).run();
      return json({ ok: true });
    }
  }
  if (path === "/admin/members") {
    admin(m);
    if (req.method === "GET") return json({ members: (await env.DB.prepare("SELECT email,role,enabled,consent_version FROM members ORDER BY email").all()).results });
    if (req.method === "POST") {
      const d = await body(req), email = String(d.email || "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) fail("invalid_email");
      if (email === m.email) fail("cannot_revoke_self");
      if (d.enabled === false) await env.DB.prepare("UPDATE members SET enabled=0 WHERE email=? AND role='parent'").bind(email).run();
      else await env.DB.prepare("INSERT INTO members (email,role) VALUES(?,'parent') ON CONFLICT(email) DO UPDATE SET enabled=1").bind(email).run();
      await audit(env, m, "membership", email);
      return json({ ok: true });
    }
  }
  if (path === "/admin/reports" && req.method === "GET") {
    admin(m);
    return json({ reports: (await env.DB.prepare("SELECT id,video_id,reason,created_at FROM reports WHERE resolved_at IS NULL ORDER BY created_at DESC LIMIT 100").all()).results });
  }
  fail("not_found", 404);
}
__name(route, "route");
var worker_default = {
  async fetch(req, env) {
    const origin = req.headers.get("Origin");
    const allowed = origin === env.FRONTEND_ORIGIN;
    if (origin && !allowed) return json({ error: "origin_not_allowed" }, 403);
    if (req.method === "OPTIONS") return new Response(null, { status: allowed ? 204 : 403, headers: allowed ? { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS", "Access-Control-Allow-Headers": "Authorization,Content-Type", "Access-Control-Max-Age": "600" } : {} });
    let r;
    try {
      r = await route(req, env);
    } catch (e) {
      console.error("Request error", e.message);
      r = json({ error: e instanceof HttpError ? e.message : "service_unavailable" }, e.status || 503);
    }
    if (allowed) {
      r.headers.set("Access-Control-Allow-Origin", origin);
      r.headers.set("Vary", "Origin");
    }
    return r;
  },
  async scheduled(event, env, ctx) {
    if (!configured(env)) return;
    const rows = await env.DB.prepare("SELECT * FROM videos WHERE status IN ('uploading','receiving','deleting') AND expires_at<? LIMIT 20").bind(iso()).all();
    for (const v of rows.results) {
      try {
        await remove(env, { sub: "maintenance" }, v, "removed", "expired_upload");
      } catch (e) {
        console.error("Cleanup retry required", v.id, e.message);
      }
    }
  }
};
export {
  MAX_BYTES,
  TAGS,
  worker_default as default,
  playbackCharge,
  transferPeriod,
  validateUpload
};
//# sourceMappingURL=worker.js.map
