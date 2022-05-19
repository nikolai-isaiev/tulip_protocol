import { Connection, PublicKey } from "@solana/web3.js";
import axios from "axios";
import BigNumber from "bignumber.js";
import { BN } from "bn.js";
import { LENDING_OBLIGATION_LAYOUT, LENDING_RESERVE_LAYOUT, USER_LFARM_LAYOUT, VAULT_LAYOUT } from "./layouts";
import { farmsOrca, farmsRay, listLev, vaultOrca, vaultRay } from "./listLev";
import { findUserLFarmAddress, getAssets, getPrices, objDataToString, toChunkedArray } from "./utils";
import { inspect } from 'util';

const SOL_RPC = 'https://solana--mainnet--rpc.datahub.figment.io/apikey/b57463cc87a5e3b59348534997a599a8/';
//?
const publicKey = new PublicKey('6ZRCB7AAqGre6c72PRz3MHLC73VMYvJ8bi9KHf1HFpNk');


const programIdLev = new PublicKey('Bt2WPMmbwHPk36i4CRucNDyLcmoGdC7xEdrVuxgJaNE6');
const connection = new Connection('https://sonar.genesysgo.net/');

const address = new PublicKey('DtANtrjHY3DeT2t4qZWMmwcTtDQneq3QRHWeBRepyvw3');

type IPoolInfo = {
  type: number;
  leverageInfo: typeof listLev[0];
  farmInfo: typeof farmsOrca[0] | typeof farmsRay[0];
  vaultInfo: typeof vaultOrca[0] | typeof vaultRay[0];
};

type IUserFarmsInfo = {
  address: string;
  farmInfo: IPoolInfo;
  farmParsed?: any;
  mintLpAddress?: string;
};

type IUserObligation = {
  obligationAddress: string;
  obligationParsed?: any;
  farmInfo: IPoolInfo;
  userLpTokens?: any;
  mintLpAddress?: string;
};

function generateListInfoPools(): IPoolInfo[] {
  return listLev.map((l) => {
    const foundFarmOrca = farmsOrca.find((f) => f.farms.lpMintAddress === l.raydium_lp_mint_address);
    const foundFarmRay = farmsRay.find((f) => f.farms.lpMintAddress === l.raydium_lp_mint_address);
    const foundVaultRay = vaultRay.find((v) => v.vaults.account === l.vault_account)
    const foundVaultOrca = vaultOrca.find((v) => v.vaults.swap_pool_token_mint === l.raydium_lp_mint_address)

    return {
      type: foundFarmOrca ? 0 : 1,
      leverageInfo: l,
      farmInfo: foundFarmOrca || foundFarmRay,
      vaultInfo: foundVaultOrca || foundVaultRay,
    }
  });
}

async function generateListUserFarms(listInfo: IPoolInfo[]): Promise<IUserFarmsInfo[]> {
  const userFarms: IUserFarmsInfo[] = [];
  for (let i = 0; i < listInfo.length; i++) {
    const farmInfo = listInfo[i];
    const [userFarmAddress] = await findUserLFarmAddress(
      address,
      programIdLev,
      new BN(0),
      new BN(farmInfo.leverageInfo.farm_key),
    );

    userFarms.push({ farmInfo, address: userFarmAddress.toBase58() });
  }
  return userFarms;
}

function getUserFarmDataRpcRequest(userFarms: IUserFarmsInfo[]) {
  return toChunkedArray(userFarms.map((f) => ({
    jsonrpc: '2.0',
    id: `${f.address}`,
    method: 'getAccountInfo',
    params: [f.address, { encoding: 'jsonParsed' }]
    // f.address
  })), 100);
}

function getTokensInfoRpcRequests(userObligations: IUserObligation[]) {
  return toChunkedArray(userObligations.flatMap((uo) => {
    const { farmInfo, vaultInfo, leverageInfo } = uo.farmInfo;
    uo.mintLpAddress = 'poolLpTokenAccount' in farmInfo.farms ? farmInfo.farms.poolLpTokenAccount : 'global_base_token_vault' in vaultInfo.vaults ? vaultInfo.vaults.global_base_token_vault : '';

    const oblgLiq = uo.obligationParsed.obligationLiquidities.map((l) => ({
      jsonrpc: '2.0',
      id: `${l.borrowReserve.toBase58()}_borrowReserve`,
      method: 'getAccountInfo',
      params: [l.borrowReserve.toBase58(), { encoding: 'jsonParsed' }]
    }))

    return [
      ...oblgLiq,
      {
        jsonrpc: '2.0',
        id: `${leverageInfo.raydium_lp_mint_address}`,
        method: 'getAccountInfo',
        params: [leverageInfo.raydium_lp_mint_address, { encoding: 'jsonParsed' }]
      },
      {
        jsonrpc: '2.0',
        id: `${uo.mintLpAddress}`,
        method: 'getTokenAccountBalance',
        params: [uo.mintLpAddress]
      },
      {
        jsonrpc: '2.0',
        id: `${leverageInfo.vault_account}_vault_account_info`,
        method: 'getAccountInfo',
        params: [leverageInfo.vault_account, { encoding: 'jsonParsed' }]
      },
      {
        jsonrpc: '2.0',
        id: `${leverageInfo.raydium_coin_token_account}`,
        method: 'getTokenAccountBalance',
        params: [leverageInfo.raydium_coin_token_account]
      },
      {
        jsonrpc: '2.0',
        id: `${leverageInfo.raydium_pc_token_account}`,
        method: 'getTokenAccountBalance',
        params: [leverageInfo.raydium_pc_token_account]
      }
    ]
  }), 100);
}

async function parsingTokensInfoRpcRequests(userObligations: IUserObligation[]) {
  const requstsRpc = getTokensInfoRpcRequests(userObligations);
  const resultsRpc = [];
  for (const chunk of requstsRpc) {
    const rpcResponse = await axios.post(SOL_RPC, chunk);
    resultsRpc.push(...rpcResponse.data);
  }

  // console.log(inspect(resultsRpc, false, null))

  return new Map<string, { id: string, data: any }>(
    resultsRpc.map((r) => {
      let data;
      if (r.id.includes('vault_account_info')) {
        // console.log(r.result.value.data);
        // console.log(VAULT_LAYOUT.decode(Buffer.from(r.result.value.data[0], 'base64')));
        data = VAULT_LAYOUT.decode(Buffer.from(r.result.value.data[0], 'base64'));
        data = objDataToString(data);
      }
      else if (r.id.includes('_borrowReserve')) {
        console.log(r.id, r.result);
        try {
          data = LENDING_RESERVE_LAYOUT.decode(Buffer.from(r.result.value.data[0], 'base64'));
        } catch(e) {

        }
      }
      else {
        data = r.result.value?.data?.parsed?.info || r.result.value;
      }
      return [r.id, {
        id: r.id,
        data
      }];
    })
  );
}

function getObligationDataRpcRequests(userObligations: IUserObligation[]) {
  return userObligations.map((o) => ({
    jsonrpc: '2.0',
    id: `${o.obligationAddress}`,
    method: 'getAccountInfo',
    params: [o.obligationAddress, { encoding: 'jsonParsed' }]
  }));
}

async function getUserFarmsInfo(userFarms: IUserFarmsInfo[]): Promise<IUserFarmsInfo[]> {
  let rpcRequest = getUserFarmDataRpcRequest(userFarms);
 
  const rpcResults = [];
  for (const chunk of rpcRequest) {
    const rpcResponse = await axios.post(SOL_RPC, chunk);
    rpcResults.push(...rpcResponse.data);
  }

  const listFarmInfo = new Map(
    rpcResults.filter((r) => r.result.value).map((r) => [r.id, USER_LFARM_LAYOUT.decode(Buffer.from(r.result.value.data[0], r.result.value.data[1]))]),
  );

  return userFarms.map((uf) => {
    uf.farmParsed = listFarmInfo.get(`${uf.address}`);
    return uf;
  }).filter((uf) => (!!uf.farmParsed));
}

function genListUserObligations(userFarms: IUserFarmsInfo[]): IUserObligation[] {
  // let userObligations: IUserObligation[] = userFarms
  // .filter((f) => {
  //   const { farmParsed } = f;
  //   let need = false;
  //   for (const value of farmParsed.obligations) {
  //     if (value.positionState ) {

  //     }
  //   }
  //   // if (f.farmParsed.obligations)
  // })
  return userFarms.flatMap(({ farmInfo, farmParsed }) => {
    return farmParsed.obligations
    .filter(({ positionState }) => positionState !== 0)
    .map(({ obligationAccount }) => ({
      obligationAddress: obligationAccount.toString(),
      farmInfo: farmInfo
    }));
    // return {
    //   obligationAddress: '',
    //   farmInfo: farmInfo
    // };
  });
  // for (let i = 0; i < filteredUserFarmList.length; i += 1) {
  //   const userFarm = filteredUserFarmList[i];
  //   const userFarmData = userFarm.farmParsed;
  //   for (let j = 0; j < userFarmData.obligations.length; j += 1) {
  //     const userObligation = userFarmData.obligations[j];
  //     if (userObligation.positionState === 0) continue;
  //     // console.log(userObligation.obligationAccount.toString());
  //     userObligations.push({
  //       obligationAddress: userObligation.obligationAccount.toString(),
  //       obligationParsed: null,
  //       farmInfo: userFarm.farmInfo,
  //     });
  //   }
  // }
}

async function parsingUserObligationData(userObligations: IUserObligation[]) {

  const requestsRpc = getObligationDataRpcRequests(userObligations);
  const rpcResults = await (await axios.post(SOL_RPC, requestsRpc)).data;

  const list = new Map(
    rpcResults.map((r) => [r.id, LENDING_OBLIGATION_LAYOUT.decode(Buffer.from(r.result.value.data[0], r.result.value.data[1]))]),
  );

  return userObligations.map((uf) => {
    uf.obligationParsed = list.get(uf.obligationAddress);
    return uf;
  }).filter((uf) => (!!uf.obligationParsed));
}



export async function leverage() {
  try {
  const listInfo: IPoolInfo[] = generateListInfoPools();

  let userFarms: IUserFarmsInfo[] = await generateListUserFarms(listInfo);

  userFarms = await getUserFarmsInfo(userFarms); 

  // console.log(userFarms);

  let userObligations = genListUserObligations(userFarms);

  userObligations = await parsingUserObligationData(userObligations);


  const listInfoTokenAndVault = await parsingTokensInfoRpcRequests(userObligations);
  // console.log(listInfoTokenAndVault);

  // const rpcRequests = userObligations.flatMap((o) => {
  //   return o.obligationParsed.obligationLiquidities.map((l) => ({
  //     jsonrpc: '2.0',
  //     id: l.borrowReserve.toBase58(),
  //     method: 'getAccountInfo',
  //     params: [l.borrowReserve.toBase58(), { encoding: 'jsonParsed' }]
  //   }))
  // });

  // const rpcResults = [];
  // for (const chunk of rpcRequests) {
  //   const rpcResponse = await axios.post(SOL_RPC, chunk);
  //   rpcResults.push(...rpcResponse.data);
  // }



  //calculate data
  userObligations
  .filter(({ obligationParsed }) => obligationParsed.vaultShares.toString() !== '0' )
  .map(async (o) => {
    const { obligationAddress, obligationParsed, farmInfo: { leverageInfo } } = o;
    const { total_vault_balance, total_vlp_shares } = listInfoTokenAndVault.get(`${leverageInfo.vault_account}_vault_account_info`).data;  

    const borrowReserve0 = listInfoTokenAndVault.get(`${obligationParsed.obligationLiquidities[0].borrowReserve.toBase58()}_borrowReserve`).data;
    const borrowReserve1 = listInfoTokenAndVault.get(`${obligationParsed.obligationLiquidities[1].borrowReserve.toBase58()}_borrowReserve`).data;

    // console.log(borrowReserve0.liquidity, borrowReserve1);

    const { prices } = (await getPrices([borrowReserve0.liquidity.mintPubKey.toBase58(), leverageInfo.base_token_mint, leverageInfo.quote_token_mint])).data;


    const user_leverage_LP_shares = obligationParsed.vaultShares.toString();
    const userLpTokens = 
        new BN(user_leverage_LP_shares)
        .mul(new BN(total_vault_balance))
        .div(new BN(total_vlp_shares));


    const { amount: amountCoin, decimals: decimalsCoin } = listInfoTokenAndVault.get(`${leverageInfo.raydium_coin_token_account}`).data;
    const { amount: amountPC, decimals: decimalsPC } = listInfoTokenAndVault.get(`${leverageInfo.raydium_pc_token_account}`).data;
    const { supply: supplyLP, decimals: decimalsLP } = listInfoTokenAndVault.get(`${leverageInfo.raydium_lp_mint_address}`).data;

    const r0Bal =
      new BN(amountCoin)
        .div(new BN(10 ** decimalsCoin));

    const r1Bal =
      new BN(amountPC)
          .div(new BN(10 ** decimalsPC));

    const poolTVL = r0Bal
      .mul(new BN(prices[leverageInfo.base_token_mint] || 0))
      .add(r1Bal.mul(new BN(prices[leverageInfo.quote_token_mint] || 0)));

    

    const unitLpValue = poolTVL.div(new BN(supplyLP).div(new BN(10 ** decimalsLP)));

    const virtValue = userLpTokens.mul(unitLpValue).div(new BN(10 ** decimalsLP));

    let borrow1BN = new BigNumber(obligationParsed.obligationLiquidities[0].borrowedAmountWads / 10 ** 18);  
    
    const oldBorrowRate = new BigNumber(obligationParsed.obligationLiquidities[0].cumulativeBorrowRateWads.toString());
    const newBorrowRate = new BigNumber(borrowReserve0.liquidity.cumulativeBorrowRate);
    
    const borrowAmounts = borrow1BN.times(newBorrowRate).div(oldBorrowRate).div(10 ** obligationParsed.coinDecimals)
    const borrowValue = borrowAmounts.multipliedBy(new BigNumber(prices[borrowReserve0.liquidity.mintPubKey.toBase58()] || 0));

    const borrowAmount = borrow1BN.times(newBorrowRate).div(oldBorrowRate).div(10 ** obligationParsed.coinDecimals).toNumber();
        
    const borrowValueBN = borrowAmount * prices[borrowReserve0.liquidity.mintPubKey.toBase58()];
    const debtRatios = (borrowValueBN / virtValue);


    const { name, decimals, address} = (await getAssets(borrowReserve0.liquidity.mintPubKey.toBase58())).data;
    const borrowedAsset = name;

    const value = new BigNumber(virtValue.toString()).minus(borrowValue);

    console.log({
      r0Bal: r0Bal.toString(),
      r1Bal: r1Bal.toString(),
      poolTVL: poolTVL.toString(),
      virtValue: virtValue.toString(),
      borrowValue: borrowValue.toNumber(),
      borrowAmount: borrowAmounts.toNumber(),
      borrowedAsset,
      value: value.toNumber(),
      debtRatios
    });
  });
  }
  catch (e) {
    console.log(e);
  }
}