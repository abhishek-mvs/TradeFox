We need to build this

Minimal Project: Portfolio & PnL
Tracker
Why this exercise?
In trading platforms, keeping track of what users own and calculating their profit & loss (PnL) is
one of the most important parts of the system. This task is a simplified version of that problem.
We don’t expect a production-ready system, but we do want to see how you approach the
design, handle financial logic, and keep things clean and correct.

What to build
We’d like you to build a small backend service with the following features:
1. Add a trade
○ An endpoint to record a trade.
○ Each trade should have: id, symbol (e.g. BTC, ETH), side (buy/sell), price,
quantity, timestamp.

2. Get portfolio
○ An endpoint that returns current holdings for each symbol.
○ Show total quantity and the average entry price and other details related to
position.
3. Get PnL
○ An endpoint that returns both:
■ Realized PnL – profit/loss from trades that have been closed.
■ Unrealized PnL – profit/loss from current holdings, based on the latest
price.

○ For “latest price”, you don’t need to fetch from a live API. A hardcoded map like {
BTC: 40000, ETH: 2000 } is fine.

Example
1. Add trade → Buy 1 BTC @ 40,000
2. Add trade → Buy 1 BTC @ 42,000
○ Portfolio: 2 BTC, avg entry = 41,000
3. Add trade → Sell 1 BTC @ 43,000
○ Realized PnL = +2,000
○ Portfolio: 1 BTC, avg entry = 41,000
4. Unrealized PnL (if BTC = 44,000) = +3,000

Constraints (to keep it small)
● Assume a single user only.
● You can keep everything in memory (DB optional, not required).
● No authentication needed.
● For PnL calculation you can choose FIFO or average cost – just mention which one you
went with.
● Keep it simple and focus on correctness of the flows.

What we expect from you
● A small backend service that supports the APIs above using NodeJS or Python.

● Link to a public Github repo with instructions to run it locally (Docker or just a simple
README).
● A short note on your approach and any assumptions you made.
● Bonus: Unit tests for the portfolio and PnL logic.

How we’ll look at it
● Correctness – Do the portfolio and PnL numbers make sense across trades?
● Code quality – Is the code clear, modular, and easy to follow?
● API design – Are the endpoints intuitive?
● Tests(If Added) – Do they cover the important cases?
● Docs – Is it easy to run and understand your solution?


We need to build this. 



I have created the proper, flow like controllers, services, pkg/db, utils. 
So we need to have this flow controllers calls services, service calls clinet and pkg

We need to build the above system, 
for this I am planning to have proper system 

Tables we need

Users
 - id 
 - name
 - createdAt
 - updatedAt

Trades
 - id
 - userId
 - base_asset_id
 - quote_asset_id
 - price
 - baseQuantity
 - quoteQuantity
 - side (buy/sell)
 - status (EXECUTED/CANCELLED)
 - createdAt
 - updatedAt

Portfolio
 - id
 - userId
 - asset_id
 - quantity
 - avg_buying_price
 - createdAt
 - updatedAt

Assets
- id
- name
- symbol


Use Pyth's Hermes Client to get the price for assets.
For now, we'll only have 3 asset: BTC/USDC, ETH/USDC, SOL/USDC
Add these assets to the db.


No requirement of order books
No requirement of auth flow. I'll pass user_id in the body for each request.
Write script to add three test assets mentioned above, and three test users in the db.


API flow
use request and response serialiser with validations.

create_order/ -> This will be assumed as executed order, no need of order book and matching engine 
get_orders/ user orders
get_portfolio
get_pnl



Use typescript, psql, and npm for manager as tech stack. Write api doc as well

Also follow the current project structure properly