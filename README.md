# API tulip
https://info.tulip.garden/
```
## getting list farms for raydium
https://api4.solfarm.io/raydium/farms

## getting list farms for orca
https://api4.solfarm.io/orca/farms

## getting list vaults for orca
https://api4.solfarm.io/orca/vaults

## getting list vaults for raydium
https://api4.solfarm.io/raydium/vaults

## getting list leverage
https://api4.solfarm.io/leveraged
```

## Install and run
```
npm install
npm start
```

## Calculate Position Value
```Position Value = user_leverage_LP_tokens * LP_price + user_coin_deposits * coin_price + user_pc_deposits * pc_price```

## structurs of data

### solfarm lending layouts
`https://gist.github.com/therealssj/fdf9daacbb46e9558c3680f7c30d8072`

## repositories with information
```
https://github.com/cpor3/solfarm_vaults
https://github.com/cryptol0g1c/solfarm-leveragedpools
https://github.com/sol-farm/tulip-js-api
```


### Example result

```
Wallet: DtANtrjHY3DeT2t4qZWMmwcTtDQneq3QRHWeBRepyvw3
{
  namePool: 'SOL-USDC-RAY',
  r0Bal: '530166',
  r1Bal: '26182132',
  poolTVL: '52690432',
  virtValue: '131',
  borrowValue: 84.79902431163546,
  borrowAmount: 1.6719050534628441,
  borrowedAsset: 'Wrapped SOL',
  value: 46.200975688364544,
  debtRatios: 0.6473207962720263
}
```
