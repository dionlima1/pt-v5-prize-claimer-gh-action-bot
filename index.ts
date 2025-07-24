import nodeFetch from 'node-fetch';
import { BaseProvider } from '@ethersproject/providers';
import { downloadContractsBlob, ContractsBlob } from '@generationsoftware/pt-v5-utils-js';
import {
  getProvider,
  loadPrizeClaimerEnvVars,
  instantiateRelayerAccount,
  runPrizeClaimer,
  PrizeClaimerEnvVars,
  PrizeClaimerConfig,
  RelayerAccount,
} from '@generationsoftware/pt-v5-autotasks-library';

async function getPoolTokenPriceUSD(): Promise<number | null> {
  try {
    const response = await nodeFetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=pooltogether&vs_currencies=usd'
    );
    const data = await response.json();
    return data?.pooltogether?.usd || null;
  } catch (e) {
    console.error('Erro ao buscar preço POOL no CoinGecko:', e);
    return null;
  }
}

const main = async () => {
  const envVars: PrizeClaimerEnvVars = loadPrizeClaimerEnvVars();
  const provider: BaseProvider = getProvider(envVars);

  const relayerAccount: RelayerAccount = await instantiateRelayerAccount(
    provider,
    envVars.CUSTOM_RELAYER_PRIVATE_KEY
  );

  const tokenPriceUSD = await getPoolTokenPriceUSD();
  if (!tokenPriceUSD) {
    console.error("Erro ao buscar o preço do token POOL. Abortando.");
    return;
  }

  const config: PrizeClaimerConfig = {
    ...relayerAccount,
    provider,
    chainId: envVars.CHAIN_ID,
    rewardRecipient: envVars.REWARD_RECIPIENT,
    minProfitThresholdUsd: Number(envVars.MIN_PROFIT_THRESHOLD_USD),
    covalentApiKey: "", // desativado
    contractJsonUrl: envVars.CONTRACT_JSON_URL,
    subgraphUrl: envVars.SUBGRAPH_URL,
  };

  const contracts: ContractsBlob = await downloadContractsBlob(config.contractJsonUrl, nodeFetch);
  await runPrizeClaimer(contracts, config);
};

main();
