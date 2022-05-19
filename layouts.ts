// import { struct, blob, u8, seq, } from 'buffer-layout';
// import {  } from './borsh';
import { publicKey, u128, u64, i64, i8, u32, bool } from '@project-serum/borsh';
import { blob, struct, u8, u16, seq } from 'buffer-layout';


export const OBLIGATION_LAYOUT = struct([
  publicKey('obligationAccount'),
  u64('coinAmount'),
  u64('pcAmount'),
  u64('depositedLPTokens'),
  u8('positionState'),
]);

export const MAX_ACCOUNTS = 3;

export const USER_LFARM_LAYOUT = struct([
  blob(8),
  publicKey('authority'),
  publicKey('leveragedFarm'),
  u8('userFarmNumber'),
  u8('numberOfObligations'),
  u8('numberOfUserFarms'),
  u8('nonce'),
  seq(OBLIGATION_LAYOUT, MAX_ACCOUNTS, 'obligations'),
]);

export const LENDING_OBLIGATION_LIQUIDITY = struct(
  [
    publicKey('borrowReserve'),
    u128('cumulativeBorrowRateWads'),
    u128('borrowedAmountWads'),
    u128('marketValue'), // decimal
  ],
);

export const LENDING_OBLIGATION_LAYOUT = struct([
  u8('version'),
  struct([u64('slot'), u8('stale')], 'lastUpdateSlot'),
  publicKey('lendingMarket'),
  publicKey('owner'),
  u128('borrowedValue'), // decimal
  u64('vaultShares'), // decimal
  u64('lpTokens'), // decimal
  u64('coinDeposits'), // decimal
  u64('pcDeposits'), // decimal
  u128('depositsMarketValue'), // decimal
  u8('lpDecimals'),
  u8('coinDecimals'),
  u8('pcDecimals'),
  u8('depositsLen'),
  u8('borrowsLen'),
  seq(LENDING_OBLIGATION_LIQUIDITY, 2, 'obligationLiquidities'),
]);

export const MINT_LAYOUT = struct([
  u32('mintAuthorityOption'),
  publicKey('mintAuthority'),
  u64('supply'),
  u8('decimals'),
  bool('initialized'),
  u32('freezeAuthorityOption'),
  publicKey('freezeAuthority')
]);

export const VAULT_LAYOUT = struct([
  blob(8),
  publicKey('authority'),
  publicKey('token_program'),
  publicKey('pda_token_account'),
  publicKey('pda'),
  u8('nonce'),
  u8('info_nonce'),
  u8('reward_a_nonce'),
  u8('reward_b_nonce'),
  u8('swap_to_nonce'),
  u64('total_vault_balance'),
  publicKey('info_account'),
  publicKey('lp_token_account'),
  publicKey('lp_token_mint'),
  publicKey('reward_a_account'),
  publicKey('reward_b_account'),
  publicKey('swap_to_account'),
  u64('total_vlp_shares'),
])
export const ORCA_VAULT_LAYOUT = struct([
  blob(8),
  publicKey("authority"),
  publicKey("pda"),
  u8("pda_nonce"),
  u8("account_nonce"),
  publicKey("compound_authority"),
  publicKey("userFarmAddr"),
  u8("user_farm_nonce"),
  u64("total_vault_valance"),
  u64("total_vlp_shares"),
]);



export const LENDING_RESERVE_LAYOUT = struct(
  [
    u8('version'),
    struct(
      [
        u64('slot'),
        bool('stale')
      ],
      'lastUpdateSlot'
    ),

    publicKey('lendingMarket'),
    publicKey('borrowAuthorizer'),

    struct(
      [
        publicKey('mintPubKey'),
        u8('mintDecimals'),
        publicKey('supplyPubKey'),
        publicKey('feeReceiver'),
        publicKey('oraclePubKey'),
        u64('availableAmount'),
        u128('borrowedAmount'),
        u128('cumulativeBorrowRate'),
        u128('marketPrice'),
        u128('platformAmountWads'),

        u8('platformFees')
      ],
      'liquidity'
    ),
  ],
);