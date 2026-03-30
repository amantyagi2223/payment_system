# Discount % Visibility Fix

## Issue
Discount badges coded but not showing (no API data with basePriceUSD > priceUSD)

## Steps Completed
- ✅ Code implemented in products/page.tsx & [productId]/page.tsx
- ✅ Frontend calculation from mrp/basePriceUSD vs priceUSD
- ✅ Badges/strikethrough UI ready

## Followup Steps
1. **Seed discount data**: Backend needs products with `mrp > price` (salePrice mapping)
2. Run backend seed: `cd ../stealth_blockchain_paument_system && npm run prisma:seed`
3. Verify API: curl http://127.0.0.1:3000/products | jq '.[] | {name, mrp, price}'
4. Test UI: npm run dev → /products

**Quick test**: Add `basePriceUSD: product.priceUSD * 1.2` temporarily in toProductListItem()

