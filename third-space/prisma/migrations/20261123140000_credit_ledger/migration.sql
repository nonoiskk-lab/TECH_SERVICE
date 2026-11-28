-- Auditable credit ledger (V4 CRD-01). Balance = SUM(minutes); no editable balance field is trusted.
CREATE TABLE "CreditEntry" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "bookingId" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    "actor" TEXT NOT NULL,
    "key" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreditEntry_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CreditEntry_minutes_nonzero" CHECK ("minutes" <> 0),
    CONSTRAINT "CreditEntry_kind_check" CHECK ("kind" IN ('purchase','consume','restore','adjust','expire')),
    CONSTRAINT "CreditEntry_sign_check" CHECK (
      ("kind" IN ('purchase','restore') AND "minutes" > 0) OR
      ("kind" IN ('consume','expire') AND "minutes" < 0) OR
      "kind" = 'adjust')
);
CREATE UNIQUE INDEX "CreditEntry_key_key" ON "CreditEntry"("key");
CREATE INDEX "CreditEntry_membershipId_createdAt_idx" ON "CreditEntry"("membershipId", "createdAt");
ALTER TABLE "CreditEntry" ADD CONSTRAINT "CreditEntry_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "CreatorMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- The balance can never go negative, even with concurrent writers or direct SQL.
-- The advisory lock serialises postings per membership so each trigger sees the committed sum.
CREATE FUNCTION credit_entry_balance_guard() RETURNS trigger AS $$
DECLARE
  bal bigint;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('credit:' || NEW."membershipId"));
  SELECT COALESCE(SUM("minutes"), 0) INTO bal FROM "CreditEntry" WHERE "membershipId" = NEW."membershipId";
  IF bal + NEW."minutes" < 0 THEN
    RAISE EXCEPTION 'insufficient_credits: balance % minutes, posting % minutes', bal, NEW."minutes" USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER credit_entry_balance_guard BEFORE INSERT ON "CreditEntry"
  FOR EACH ROW EXECUTE FUNCTION credit_entry_balance_guard();

-- Append-only: ledger rows are never changed or removed.
CREATE FUNCTION credit_entry_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'credit ledger is append-only' USING ERRCODE = '23514';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER credit_entry_immutable BEFORE UPDATE OR DELETE ON "CreditEntry"
  FOR EACH ROW EXECUTE FUNCTION credit_entry_immutable();

-- Backfill from the old balance fields (purchase, each recorded use, and any unexplained difference).
INSERT INTO "CreditEntry" ("id","membershipId","kind","minutes","bookingId","note","actor","key","createdAt")
SELECT gen_random_uuid()::text, m."id", 'purchase', m."hoursTotal" * 60, m."bookingId", 'Plan purchased (backfill)', 'system', 'purchase:' || m."bookingId", m."createdAt"
FROM "CreatorMembership" m WHERE m."hoursTotal" > 0;

INSERT INTO "CreditEntry" ("id","membershipId","kind","minutes","bookingId","note","actor","createdAt")
SELECT gen_random_uuid()::text, u."membershipId", 'consume', -u."minutes", u."bookingId", u."note", u."recordedBy", u."createdAt"
FROM "MembershipUsage" u WHERE u."minutes" > 0;

INSERT INTO "CreditEntry" ("id","membershipId","kind","minutes","note","actor")
SELECT gen_random_uuid()::text, m."id", 'adjust', -(m."minutesUsed" - COALESCE(u.used, 0)), 'Backfill: usage not itemised in the old log', 'system'
FROM "CreatorMembership" m
LEFT JOIN (SELECT "membershipId", SUM("minutes") AS used FROM "MembershipUsage" GROUP BY "membershipId") u ON u."membershipId" = m."id"
WHERE m."minutesUsed" - COALESCE(u.used, 0) > 0;

ALTER TABLE "CreditEntry" ENABLE ROW LEVEL SECURITY;
