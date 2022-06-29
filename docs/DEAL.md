## Bid

Add bid to DB:

    1. generate hash of bid
    2. add bid model = {ask, bidLine, spaceId} to DB

Worker for delete not booked

    1. get dates, spaceId, expire time from db
    2. check expire time
    3. remove temp model

## Deal

1. Get ask, bidLine, spaceId from DB
2. Once more check availability check
3. If all checks passed: save stub to db and increment space.available.{date}-num_booked
4. If not: revert transaction in smart-contract
