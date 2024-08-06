#!/usr/bin/env -S tsx

import { ethers } from "ethers";
import { readFileSync } from "fs";

// TODO make this work outside of the whatsabi repo
import { withCache } from "@shazow/whatsabi";
// TODO make this work outside of the whatsabi repo
import { bytecodeToString } from "@shazow/whatsabi";
// TODO make this work outside of the whatsabi repo
import type { bytecodeToStringConfig } from "@shazow/whatsabi";

const { INFURA_API_KEY, OPCODES_JSON } = process.env;
const provider = INFURA_API_KEY
	? new ethers.InfuraProvider("homestead", INFURA_API_KEY)
	: ethers.getDefaultProvider("homestead");

async function main() {
	const address = process.env["ADDRESS"] || process.argv[2];
	const jumpdest = process.env["JUMPDEST"] || process.argv[3];

	let code: string;
	if (!address) {
		console.error("Invalid address: " + address);
		process.exit(1);
	} else if (address === "-") {
		// Read contract code from stdin
		code = readFileSync(0, "utf8").trim();
	} else {
		console.debug("Loading code for address:", address);
		code = await withCache(`${address}_abi`, async () => {
			return await provider.getCode(address);
		});
	}

	const config: bytecodeToStringConfig = {};

	if (OPCODES_JSON) {
		const opcodes = JSON.parse(readFileSync(OPCODES_JSON, "utf8"));

		config.opcodeLookup = Object.fromEntries(
			Object.entries(opcodes).map(([k, v]) => [parseInt(k, 16), v as string]),
		);
	}
	if (jumpdest) {
		const pos = jumpdest.startsWith("0x")
			? parseInt(jumpdest, 16)
			: parseInt(jumpdest);
		config.startPos = config.highlightPos = pos;
		config.stopPos = pos + 40;
	}

	const iter = bytecodeToString(code, config);
	while (true) {
		const { value, done } = iter.next();
		if (done) break;
		console.log(value);
	}
}

main()
	.then()
	.catch((err) => {
		console.error("Failed:", err);
		process.exit(2);
	});
