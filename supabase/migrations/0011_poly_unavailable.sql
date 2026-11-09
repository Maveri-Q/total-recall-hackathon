-- A reading can now be saved with the bookie odds alone when Polymarket (through Tatum) couldn't be reached.
-- It's marked 'unavailable': no Polymarket numbers, never guessed, and left out of scoring (usable = false).
alter table public.readings drop constraint if exists readings_poly_status_check;
alter table public.readings
  add constraint readings_poly_status_check check (poly_status in ('ok', 'thin_market', 'not_found', 'unavailable'));
