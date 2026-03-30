UPDATE tontine_lots
SET gain_reel = mise_brute_lot - COALESCE(total_relances, 0)
WHERE gain_reel IS NOT NULL;
