-- Some events only collect 소속(affiliation) + LDAP(english_id) with no
-- personal name at all, so players.name can no longer be required.
alter table public.players alter column name drop not null;
