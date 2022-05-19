import { PublicKey } from "@solana/web3.js";
import axios from "axios";

export const findUserLFarmAddress = (
  authority,
  programId,
  index, 
  farm,
) => {
  const seed = [
    authority.toBuffer(),
    index.toArrayLike(Buffer, 'le', 8),
    farm.toArrayLike(Buffer, 'le', 8),
  ];
  return PublicKey.findProgramAddress(seed, programId);
}

export function toChunkedArray<T>(array: T[], chunkSize: number): T[][] {
  const result = [];
  for (let i = 0, j = array.length; i < j; i += chunkSize) {
    result.push(array.slice(i, i + chunkSize));
  }
  return result;
}

export async function getAssets(address: string) {
  // console.log(`https://acc.dfyield.xyz/v1/assets?chains=12&addresses=${address}`);
  return await axios.post(`https://acc.dfyield.xyz/v1/assets`, {
    "address": address,
    "chain": 12,
    "force": false
  });
  // return await axios.get(`https://acc.dfyield.xyz/v1/assets?chains=12&addresses=${address}`);
}

export async function getPrices(addresses: string[]) {
  return await axios.post('https://prc.dfyield.xyz/v1/prices', {
    "chain": "12",
    "currency": "1",
    "addresses": addresses.join(','),
    "timestamps": ""
  })
}

export async function sleep(timeToSleep = 100) {
  // eslint-disable-next-line no-promise-executor-return
  await new Promise((resolve) => setTimeout(resolve, timeToSleep));
}

export function objDataToString(obj) {
  for (const val in obj) {
    obj[val] = obj[val].toString();
  }
  return obj;
}