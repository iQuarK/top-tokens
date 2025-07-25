const oneDayAgo = new Date();
oneDayAgo.setDate(oneDayAgo.getDate() - 1);
const timeAgo = oneDayAgo.toISOString();

// Queries for Bitquery API
export const QUERIES = {
  // TOP_TOKENS: JSON.stringify({ query: "{ topTokens { symbol volumeUSD } }" }),
  TOP_MOVERS: {
    type: "start",
    id: "api-top-movers",
    payload: {
      operationName: "api-top-movers",
      query: `subscription api-top-movers($network: evm_network, $time_ago: DateTime!) {
        EVM(network: $network) {
          DEXTradeByTokens(
            orderBy: {descendingByField: "price_volatility"}
            where: {
              Block: {Time: {since: $time_ago}},
              Trade: {PriceInUSD: {gt: 0}}
            }
            limit: {count: 20}
          ) {
            Trade {
              Currency {
                Symbol
                Name
                SmartContract
              }
              current_price: PriceInUSD(maximum: Block_Number)
              max_price: PriceInUSD(maximum: Trade_PriceInUSD)
              min_price: PriceInUSD(minimum: Trade_PriceInUSD)
            }
            price_volatility: standard_deviation(of: Trade_PriceInUSD)
            avg_price: average(of: Trade_PriceInUSD)
            volume_usd: sum(of: Trade_AmountInUSD)
            trade_count: count
          }
        }
      }`,
      variables: {
        time_ago: timeAgo,
      },
    },
  },
  HIGHEST_VOLUME: {
    type: "start",
    id: "api-highest-volume",
    payload: {
      operationName: "api-highest-volume",
      query: `subscription api-highest-volume() {
        EVM(network: eth, trigger_on: head) {
          DEXTradeByTokens(
            orderBy: {descendingByField: "volume_usd"}
            limit: {count: 20}
            where: {
              Block: {Time: {since: ${timeAgo}}},
              Trade: {PriceInUSD: {gt: 0}}
            }
          ) {
            Trade {
              Currency {
                Symbol
                Name
                SmartContract
              }
              current_price: PriceInUSD(maximum: Block_Number)
            }
            volume_usd: sum(of: Trade_AmountInUSD)
            avg_price: average(of: Trade_PriceInUSD)
          }                   
        }
      }`,
      variables: {
        time_ago: timeAgo,
      },
    },
  },
};
