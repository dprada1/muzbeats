# Pricing Management

## Current Pricing

**Standard Price:** $5.00 per beat (currently set)  
**Industry Standard:** $20.00 per beat (recommended)

## Price Update Script

### Usage

Update all beats to a new price:

```bash
cd server
npm run update-prices <price>
```

**Examples:**
```bash
# Update all beats to $20.00
npm run update-prices 20.00

# Update all beats to $19.99
npm run update-prices 19.99

# Update all beats to $25.00
npm run update-prices 25.00
```

### What It Does

1. **Shows current statistics:**
   - Minimum price
   - Maximum price
   - Average price
   - Total number of beats

2. **Updates all beats:**
   - Sets all beats to the specified price
   - Updates `updated_at` timestamp
   - Returns count of updated beats

3. **Verifies the update:**
   - Confirms all prices match the new value
   - Reports any discrepancies

### Safety Features

- Validates price is a positive number
- Warns if price is very high (>$1000)
- Shows current stats before updating
- Verifies update after completion

### Direct Usage

You can also run the script directly:

```bash
cd server
npx tsx src/db/update-prices.ts 20.00
```

## Future: Price Optimization

### Potential Approaches

**1. Dynamic Pricing Based on Demand**
- Track views/clicks per beat
- Higher demand = higher price
- Lower demand = lower price (clearance)

**2. Tiered Pricing**
- Standard beats: $20
- Premium beats: $30-40
- Featured beats: $50+

**3. Bundle Pricing**
- Single beat: $20
- 3 beats: $50 (save $10)
- 5 beats: $75 (save $25)
- 10 beats: $140 (save $60)

**4. Time-Based Pricing**
- New releases: Higher price
- Older beats: Discounted
- Seasonal sales

**5. A/B Testing Framework**
- Test different prices
- Track conversion rates
- Optimize for revenue

### Analytics Needed

To implement price optimization, we'd need to track:

- **Views:** How many times each beat is viewed
- **Plays:** How many times each beat is played
- **Adds to Cart:** How many times added to cart
- **Purchases:** Actual sales per beat
- **Conversion Rate:** Purchases / Views
- **Revenue:** Total revenue per beat

### Database Schema (Future)

```sql
CREATE TABLE beat_analytics (
  beat_id UUID REFERENCES beats(id),
  date DATE,
  views INTEGER DEFAULT 0,
  plays INTEGER DEFAULT 0,
  cart_adds INTEGER DEFAULT 0,
  purchases INTEGER DEFAULT 0,
  revenue DECIMAL(10, 2) DEFAULT 0,
  PRIMARY KEY (beat_id, date)
);

CREATE TABLE price_history (
  beat_id UUID REFERENCES beats(id),
  price DECIMAL(10, 2),
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  changed_by VARCHAR(255) -- 'system' or 'admin'
);
```

### Price Optimization Equation (Thought Experiment)

**Simple Model:**
```
Optimal Price = Base Cost + (Demand Factor × Popularity Score) + (Quality Factor × Production Value)
```

**Revenue Optimization:**
```
Revenue = Price × Conversion Rate × Views
Optimal Price = argmax(Price × Conversion_Rate(Price) × Views)
```

**Factors to Consider:**
- Production cost (time, equipment, samples)
- Market demand (genre popularity)
- Competition (similar beats' prices)
- Quality indicators (plays, favorites, reviews)
- Seasonality (holiday sales, trends)

### Implementation Considerations

1. **Start Simple:**
   - Set a standard price for all beats
   - Track basic metrics (views, purchases)
   - Analyze data over time

2. **Gradual Introduction:**
   - A/B test different prices
   - Test on subset of beats first
   - Monitor impact on sales

3. **Automation:**
   - Price adjustment algorithms
   - Automated A/B testing
   - Machine learning models (future)

---

**Last Updated**: November 2025

