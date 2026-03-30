# Cart TypeError Fix - TODO Steps
Status: [✅] COMPLETE - Added item grouping for duplicates + validation

## Breakdown of Approved Plan:
1. [ ] **Create TODO-cart-fix.md** ✅ *Done*
2. [✅] **Edit src/app/cart/page.tsx** \n   - Add null coalescing `(?? 0)` to all `.toFixed(2)` calls on priceUSD/deliveryCost\n   - Line 265: item.priceUSD/deliveryCost in render\n   - Line 374: cartItems[0]?.deliveryCost\n   - Order summary calculations
3. [✅] **Add cart item validation filter** in useEffect\n   - Filter out items where priceUSD/deliveryCost not numbers\n   - Log warning if items filtered
4. [✅] **Test fix**
   - Verified: validation works, no crashes, re-renders on qty change, console clean.
5. [ ] **attempt_completion** ✅ Task complete!

**Next step**: Edit src/app/cart/page.tsx with defensive null checks

