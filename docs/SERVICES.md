# Service Interactions

## Overview

1. `SearchService` determines if a _facility_ has a _space_ available that meets the `Ask` from the consumer, while **respecting the rules**.
2. `QuoteSearch` takes a _facility_, a _space_, and the `Ask` from the consumer and calculates the cost, in accordance with the **rate modifiers**.
3. `AuctioneerService` listens on `waku` for `Ask`s from consumers, and co-ordinates the subsequent search and quote, and reply.

## Order of priority

Rules and modifiers **MUST** be applied with strict order of priority, from most specific (ie. daily, space specific override), through to least specific. For the sake of clarity, take the `length_of_stay` rule:

Bob has setup a guesthouse. He has two different types of a spaces, a 'Mountain View' room, and a 'Cow paddock View' room. Bob sets a `length_of_stay` requirement for his entire guesthouse such that if a guest wants to book on a Friday, they must book for 2 nights. Bob also sets a _specific_ `length_of_stay` on the 'Cow paddock view' for 1 night.

In the above configuration, any guest who wants to book in on a Friday, **MUST**:

1. Book at least 1 night if they are staying in the 'Cow paddock view' room.
2. Book at least 2 nights if they are staying in the 'Mountain view' room.

To paraphrase: **space specific rules and modifiers take precedence over facility-wide rules and modifiers**, ie:

- Facility Modifier < Space Modifier
- Facility Rule < Space Rule

## Services

### SearchService

Implementation interface:

```typescript
/**
 * @param facilityId as registered on chain.
 * @param ask query from consumer
 * @return string[] of `spaceId`s that match the consumer's ask
 */
async search(facilityId: string, ask: Ask): string[]
```

1.  For each space in `facility`:

    First apply the `rule`s as early as possible so we can reject the space in minimum processing time.

    a. Apply `notice_required` rule, in order of priority:

        i.     facilityId.spaceId.notice_required; else
        ii.    facilityId.notice_required.default
        iii.   continue

    b. Apply `length_of_stay` rule, in order of priority:

        i.     facilityId.spaceId.length_of_stay; else
        ii.    facilityId.length_of_stay.default
        iii.   continue

    c. Check if the `Ask` can be _physically_ accommodated by the `space` (filter each space for guest count):

        * Require adult guests <= `space.maxNumberOfAdultOccupants`
        * Require child guests <= `space.maxNumberOfChildOccupants` + remaining seats from adults

    d. Is there at least one `space` available that meets the `Ask`?

    For each day of booking:

    i. num_booked = `facilityId.spaceId.stubs.{YYYY-MM-DD}-num_booked`
    ii. num_capacity = `space.availability.{YYYY-MM-DD}` else;
    num_capacity = `space.availability.default`
    iii. if (num_capacity - num_booked < Ask.numSpacesReq) return false

### QuoteService

Implementation interface:

```typescript
async quote(facilityId: string, spaceId: string, ask: Ask): BigNumber
```

1.  For each day in booking:

    a. Get the 'base' rate, in order of priority:

         i.     facilityId.spaceId.rates.YYYY-MM-DD; else
         ii.    facilityId.spaceId.rates.default

    b. Apply `day_of_week` modifier, in order of priority:

         i.     facilityId.spaceId.modifiers.day_of_week; else
         ii.    facilityId.modifiers.day_of_weke; else
         iii.   none

    c. Apply `occupancy` modifier, in order of priority:

         i.     facilityId.spaceId.modifiers.occupancy; else
         ii.    facilityId.modifiers.occupancy; else
         iii.   none

         When applying the modifier, it's anticipated that APs will want to charge
         more per additional occupant as this use case exists within industry
         already. Generally this would be a 'fixed' additional fee per occupant
         over the base rate of 1 occupant. Using a 'ratio' additional fee however
         would allow an AP to have a policy such that they could say: "I want a
         15% fee on the room rate for each additional occupant.".

    After steps a-c are applied, this results in the `adjustedDailyRate`. This is then added to the `totalCost`.

2.  Apply `length_of_stay` modifier, in order of priority:

        i.     facilityId.spaceId.modifiers.length_of_stay; else
        ii.    facilityId.modifiers.occupancy; else
        iii.   none

After steps 1 & 2 are applied, this determines the _final cost_ **before** the addition of any **protocol fees**.

**Warning**: Modifiers possibly contain division and subtraction, therefore the order in which they are executed is critical.

### AuctioneerService

Implementation interface

```typescript
new AuctioneerService(where: string[])
```

#### Instantiation

1. Listen to `waku` and `contentTopic`s from `where` when listening for a an `Ask`.
2. Setup timer that every 1 minute:

   a. Checks for any `deal()` events on the `Stays` contract filtering by `facilityId` and adds these stubs.
   b. Times out any temporary, undealt `stub`s

#### Ask (from consumer)

When receiving an `Ask`:

1. Get list of all matching spaces from `SearchService`
2. Map all matching spaces onto `QuoteService` to get cost.
3. Map costs into `ERC20Native` cost at prevailing exchange rate.
4. Construct `Bid` to send to `consumer`.
5. Record `Bid` in temporary database field to allow for monitoring of `blockchain` to confirm a consumer's purchase.

#### Deal (from consumer)

When receiving a `Deal` event:

1. Add the `Stub` to the `stubs` repository.
2. Increment `num_booked` in the `stubs` repository as appropriate.
3. (Optional) send confirmation e-mail to `ethMail.cc`
