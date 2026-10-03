-- Raw legacy values are one-way hashed and cannot be converted from
-- legacy environment-encoded prefixes into canonical pk_/sk_ values.
-- Revoke them so operators can issue fresh canonical keys after deploy.
DELETE FROM api_keys;
