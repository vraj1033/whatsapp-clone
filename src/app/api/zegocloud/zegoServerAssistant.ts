import { createCipheriv } from "crypto";

enum ErrorCode {
	success = 0, // "success"
	appIDInvalid = 1, // "appID invalid"
	userIDInvalid = 3, // "userID invalid"
	secretInvalid = 5, // "secret must be a 32 byte string"
	effectiveTimeInSecondsInvalid = 6, // "effectiveTimeInSeconds invalid"
}

const enum KPrivilegeKey {
	PrivilegeKeyLogin = 1,
	PrivilegeKeyPublish = 2,
}

const enum KPrivilegeVal {
	PrivilegeEnable = 1,
	PrivilegeDisable = 0,
}

interface ErrorInfo {
	errorCode: ErrorCode; // Error code from ErrorCode
	errorMessage: string; // Detailed description of the error code
}

function RndNum(a: number, b: number) {
	// Generate a random number within the range of a to b
	return Math.ceil((a + (b - a)) * Math.random());
}

// Generate a random number within the range of int32
function makeNonce() {
	return RndNum(-2147483648, 2147483647);
}

function makeRandomIv(): string {
	// Generate a random 16-character string
	const str = "0123456789abcdefghijklmnopqrstuvwxyz";
	const result = [];
	for (let i = 0; i < 16; i++) {
		const r = Math.floor(Math.random() * str.length);
		result.push(str.charAt(r));
	}
	return result.join("");
}

// Determine the algorithm based on the length of the key, only supports 16 24 32 bits
function getAlgorithm(keyBase64: string): string {
	const key = Buffer.from(keyBase64);
	switch (key.length) {
		case 16:
			return "aes-128-cbc";
		case 24:
			return "aes-192-cbc";
		case 32:
			return "aes-256-cbc";
	}

	throw new Error("Invalid key length: " + key.length);
}

// AES encryption, using mode: CBC/PKCS5Padding
function aesEncrypt(plainText: string, key: string, iv: string): Uint8Array {
	const cipher = createCipheriv(getAlgorithm(key), key, iv);
	cipher.setAutoPadding(true);
	const encrypted = cipher.update(plainText, 'utf8', 'base64');
	const final = cipher.final('base64');
	const buffer = Buffer.from(encrypted + final, 'base64');
	return new Uint8Array(buffer);
}

export function generateToken04(
	appId: number,
	userId: string,
	secret: string,
	effectiveTimeInSeconds: number,
	payload?: string
): string {
	if (!appId || typeof appId !== "number") {
		throw {
			errorCode: ErrorCode.appIDInvalid,
			errorMessage: "appID invalid",
		};
	}

	if (!userId || typeof userId !== "string") {
		throw {
			errorCode: ErrorCode.userIDInvalid,
			errorMessage: "userId invalid",
		};
	}

	if (!secret || typeof secret !== "string" || secret.length !== 32) {
		throw {
			errorCode: ErrorCode.secretInvalid,
			errorMessage: "secret must be a 32 byte string",
		};
	}

	if (!effectiveTimeInSeconds || typeof effectiveTimeInSeconds !== "number") {
		throw {
			errorCode: ErrorCode.effectiveTimeInSecondsInvalid,
			errorMessage: "effectiveTimeInSeconds invalid",
		};
	}

	const createTime = Math.floor(new Date().getTime() / 1000);
	const tokenInfo = {
		app_id: appId,
		user_id: userId,
		nonce: makeNonce(),
		ctime: createTime,
		expire: createTime + effectiveTimeInSeconds,
		payload: payload || "",
	};

	// Convert token information to json
	const plaintText = JSON.stringify(tokenInfo);
	console.log("plain text: ", plaintText);

	// A randomly generated 16-byte string used as the AES encryption vector, which is Base64 encoded with the ciphertext to generate the final token
	const iv: string = makeRandomIv();
	console.log("iv", iv);

	// Encrypt
	const encryptBuf = aesEncrypt(plaintText, secret, iv);

	// Token binary splicing: expiration time + Base64(iv length + iv + encrypted information length + encrypted information)
	const expire = BigInt(tokenInfo.expire);
	const ivLength = iv.length;
	const encryptedLength = encryptBuf.byteLength;

	// Create Uint8Arrays
	const expireBuffer = new Uint8Array(8);
	const ivLengthBuffer = new Uint8Array(2);
	const encryptedLengthBuffer = new Uint8Array(2);

	// Write values using DataView
	const expireView = new DataView(expireBuffer.buffer);
	const ivLengthView = new DataView(ivLengthBuffer.buffer);
	const encryptedLengthView = new DataView(encryptedLengthBuffer.buffer);

	expireView.setBigInt64(0, expire, false);
	ivLengthView.setUint16(0, ivLength, false);
	encryptedLengthView.setUint16(0, encryptedLength, false);

	// Convert everything to Uint8Array and concatenate
	const ivArray = new TextEncoder().encode(iv);
	const encryptBufArray = new Uint8Array(encryptBuf);
	
	const finalArray = new Uint8Array(8 + 2 + ivLength + 2 + encryptedLength);
	finalArray.set(expireBuffer, 0);
	finalArray.set(ivLengthBuffer, 8);
	finalArray.set(ivArray, 10);
	finalArray.set(encryptedLengthBuffer, 10 + ivLength);
	finalArray.set(encryptBufArray, 12 + ivLength);

	return "04" + Buffer.from(finalArray).toString("base64");
}
